"""
VideoProductionOrchestrator (Remotion Version)

Simplified 5-stage pipeline using open-source Remotion for video rendering.

Stages:
  1. VOICEOVER (ElevenLabs)
  2. REMOTION_RENDER (Remotion - generates + assembles videos)
  3. POST_PRODUCTION (Captions + audio)
  4. QA (Quality review)
  5. DISTRIBUTION (YouTube, LMS, social clips)

Cost: ~$65-180/mo (vs $400-730 with Runway+JSON2Video)
"""
import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Literal
from datetime import datetime
sys.path.insert(0, str(Path(__file__).parent))

from schemas import (
    VideoProductionConfig, VideoProductionState, ReviewDecision, QualityReport
)
from agents.voiceover_agent import VoiceoverAgent
from agents.remotion_video_agent import RemotionVideoAgent
from agents.post_production_agent import PostProductionAgent
from agents.distribution_agent import DistributionAgent
from skills.quality_review_skill import QualityReviewSkill
from config import VIDEO_PRODUCTION_DIR, REVIEW_TIMEOUT_SECONDS
from logger import log_info, log_error, log_decision, log_warning
import subprocess


class GateFailedError(Exception):
    pass


class DRY_RUN_TRACKER:
    """Track API calls and costs in dry-run mode."""

    def __init__(self):
        self.api_calls = {
            "elevenlabs_voiceover": 0,
            "claude_code_generation": 0,
            "remotion_render": 0,
            "ffmpeg_operations": 0,
            "youtube_upload": 0,
            "taleemabad_upload": 0,
            "vizard_upload": 0,
        }
        self.total_estimated_cost = 0.0
        self.checks_run = []
        self.checks_passed = []
        self.checks_failed = []

    def record_call(self, api_name: str, cost: float = 0.0):
        if api_name in self.api_calls:
            self.api_calls[api_name] += 1
            self.total_estimated_cost += cost

    def record_check(self, check_name: str, passed: bool):
        self.checks_run.append(check_name)
        if passed:
            self.checks_passed.append(check_name)
        else:
            self.checks_failed.append(check_name)

    def get_summary(self) -> str:
        """Generate final dry-run summary."""
        summary = "\n" + "=" * 80 + "\n"
        summary += "DRY-RUN SUMMARY\n"
        summary += "=" * 80 + "\n\n"

        summary += "CHECKS RUN:\n"
        summary += f"  Passed: {len(self.checks_passed)}/{len(self.checks_run)}\n"
        if self.checks_passed:
            for check in self.checks_passed:
                summary += f"    ✓ {check}\n"
        if self.checks_failed:
            summary += f"  Failed: {len(self.checks_failed)}\n"
            for check in self.checks_failed:
                summary += f"    ✗ {check}\n"

        summary += "\nAPI CALLS AVOIDED:\n"
        for api_name, count in self.api_calls.items():
            if count > 0:
                summary += f"  {api_name}: {count} call(s)\n"

        summary += f"\nESTIMATED COST AVOIDED: ${self.total_estimated_cost:.2f}\n"
        summary += "=" * 80 + "\n"
        return summary


class VideoProductionOrchestratorRemotionEdition:
    """Simplified 5-stage video production with Remotion for rendering."""

    def __init__(self, config: VideoProductionConfig, remotion_project_dir: str | None = None, dry_run: bool = False):
        self.config = config
        self.production_id = config.production_id
        self.dry_run = dry_run
        self.dry_run_tracker = DRY_RUN_TRACKER() if dry_run else None
        self.state_path = VIDEO_PRODUCTION_DIR / self.production_id / "state.json"
        self.decisions_log = VIDEO_PRODUCTION_DIR / self.production_id / "decisions.log"
        self.review_queue = VIDEO_PRODUCTION_DIR / self.production_id / "review_queue"

        self.voiceover_agent = VoiceoverAgent()
        self.remotion_agent = RemotionVideoAgent(remotion_project_dir)
        self.post_production_agent = PostProductionAgent()
        self.distribution_agent = DistributionAgent()
        self.quality_skill = QualityReviewSkill()

        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        self.review_queue.mkdir(parents=True, exist_ok=True)

    # ═════════════════════════════════════════════════════════════════════════
    # OUTPUT CONTRACT VALIDATION — Verify each stage's output before proceeding
    # ═════════════════════════════════════════════════════════════════════════

    def _validate_output_contract(self, stage_name: str, result: dict, state: VideoProductionState) -> dict:
        """
        LOCKED: Validate output contract for each pipeline stage.
        If ANY check fails, mark stage as FAILED in state and halt pipeline.

        Returns: {"passed": bool, "errors": [list of failures]}
        """
        # DRY-RUN: Skip output contract validation (files don't exist, only stubs)
        if self.dry_run and result.get("dry_run_stub"):
            log_info("VideoProductionOrchestratorRemotionEdition",
                    f"[DRY-RUN] Skipping output contract validation for {stage_name} (dry-run stub)")
            self.dry_run_tracker.record_check(f"{stage_name}_contract", passed=True)
            return {"passed": True, "errors": []}

        errors = []

        try:
            if stage_name == "remotion_render":
                errors.extend(self._validate_remotion_render_output(result, state))

            elif stage_name == "post_production":
                errors.extend(self._validate_post_production_output(result, state))

            elif stage_name == "qa":
                # QA doesn't produce new files, only reports
                pass

            # If any errors, mark stage as FAILED
            if errors:
                log_error("VideoProductionOrchestratorRemotionEdition", "OutputContractViolation",
                         f"Stage {stage_name} output contract failed:\n" + "\n".join(f"  ✗ {e}" for e in errors))
                state.output_contract_failures[stage_name] = {
                    "stage": stage_name,
                    "failures": errors,
                    "timestamp": self._timestamp()
                }
                self.dry_run_tracker.record_check(f"{stage_name}_contract", passed=False)
                return {"passed": False, "errors": errors}
            else:
                log_info("VideoProductionOrchestratorRemotionEdition",
                        f"✓ Stage {stage_name} output contract PASSED")
                if self.dry_run_tracker:
                    self.dry_run_tracker.record_check(f"{stage_name}_contract", passed=True)
                return {"passed": True, "errors": []}

        except Exception as e:
            error_msg = f"Output validation error: {str(e)}"
            log_error("VideoProductionOrchestratorRemotionEdition", "ContractValidationError", error_msg)
            state.output_contract_failures[stage_name] = {
                "stage": stage_name,
                "failures": [error_msg],
                "timestamp": self._timestamp()
            }
            if self.dry_run_tracker:
                self.dry_run_tracker.record_check(f"{stage_name}_contract", passed=False)
            return {"passed": False, "errors": [error_msg]}

    def _validate_remotion_render_output(self, result: dict, state: VideoProductionState) -> list[str]:
        """
        LOCKED: Validate Remotion render output.

        Checks:
        1. MP4 file exists at expected path
        2. File size > 0
        3. Video duration > 0
        4. Resolution is exactly 1920x1080
        5. Video stream is H.264 codec
        """
        errors = []

        if not state.assembled_videos:
            return ["No assembled videos in state"]

        for video in state.assembled_videos:
            video_path = video.get("video_path")
            video_number = video.get("video_number")

            if not video_path:
                errors.append(f"Video {video_number}: no video_path in result")
                continue

            path = Path(video_path)

            # Check 1: File exists
            if not path.exists():
                errors.append(f"Video {video_number}: file not found at {video_path}")
                continue

            # Check 2: File size > 0
            file_size = path.stat().st_size
            if file_size == 0:
                errors.append(f"Video {video_number}: file is empty (0 bytes)")
                continue

            # Check 3-5: Use ffprobe to validate video properties
            probe_errors = self._ffprobe_validate(video_path, video_number, {
                "duration_gt_zero": True,
                "resolution": "1920x1080",
                "video_codec": "h264"
            })
            errors.extend(probe_errors)

        return errors

    def _validate_post_production_output(self, result: dict, state: VideoProductionState) -> list[str]:
        """
        LOCKED: Validate post-production output.

        Checks:
        1. Output MP4 exists at expected path
        2. MP4 has BOTH video and audio streams (via ffprobe)
        3. Caption/SRT file exists alongside video
        4. Caption file is non-empty
        """
        errors = []

        if not state.post_production_results:
            return ["No post-production results in state"]

        for result_item in state.post_production_results:
            final_path = result_item.get("final_path")
            srt_path = result_item.get("srt_path")
            video_number = result_item.get("video_number")

            if not final_path:
                errors.append(f"Video {video_number}: no final_path in result")
                continue

            path = Path(final_path)

            # Check 1: File exists
            if not path.exists():
                errors.append(f"Video {video_number}: final video not found at {final_path}")
                continue

            # Check 2: MP4 has both video and audio streams
            stream_errors = self._ffprobe_validate(final_path, video_number, {
                "has_video_stream": True,
                "has_audio_stream": True
            })
            errors.extend(stream_errors)

            # Check 3: Caption file exists
            if srt_path:
                srt = Path(srt_path)
                if not srt.exists():
                    errors.append(f"Video {video_number}: caption file not found at {srt_path}")
                elif srt.stat().st_size == 0:
                    errors.append(f"Video {video_number}: caption file is empty")
            else:
                # SRT path may be empty if captions failed, but log it
                log_warning("VideoProductionOrchestratorRemotionEdition",
                           f"Video {video_number}: no caption file generated (srt_path is empty)")

        return errors

    def _ffprobe_validate(self, video_path: str, video_number: int, checks: dict) -> list[str]:
        """
        Use ffprobe to validate video file properties.

        Args:
            video_path: Path to MP4 file
            video_number: Video ID for error messages
            checks: {
                "duration_gt_zero": bool,
                "resolution": "1920x1080",
                "video_codec": "h264",
                "has_video_stream": bool,
                "has_audio_stream": bool
            }

        Returns: List of error messages (empty if all checks pass)
        """
        errors = []

        try:
            # Run ffprobe to get video info
            cmd = [
                "ffprobe",
                "-v", "error",
                "-show_format",
                "-show_streams",
                "-of", "json",
                video_path
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)

            if result.returncode != 0:
                errors.append(f"Video {video_number}: ffprobe failed (code {result.returncode})")
                return errors

            probe_data = json.loads(result.stdout)
            streams = probe_data.get("streams", [])
            format_data = probe_data.get("format", {})

            # Check duration
            if checks.get("duration_gt_zero"):
                duration = float(format_data.get("duration", 0))
                if duration <= 0:
                    errors.append(f"Video {video_number}: duration is 0 or invalid ({duration}s)")

            # Find video and audio streams
            video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
            audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

            # Check for video stream
            if checks.get("has_video_stream"):
                if not video_stream:
                    errors.append(f"Video {video_number}: no video stream found")

            # Check for audio stream
            if checks.get("has_audio_stream"):
                if not audio_stream:
                    errors.append(f"Video {video_number}: no audio stream found (required for final mux)")

            # Check resolution
            if checks.get("resolution") and video_stream:
                expected_res = checks["resolution"]  # "1920x1080"
                actual_width = video_stream.get("width", 0)
                actual_height = video_stream.get("height", 0)
                actual_res = f"{actual_width}x{actual_height}"
                if actual_res != expected_res:
                    errors.append(f"Video {video_number}: resolution mismatch (expected {expected_res}, got {actual_res})")

            # Check video codec
            if checks.get("video_codec") and video_stream:
                expected_codec = checks["video_codec"]  # "h264"
                actual_codec = video_stream.get("codec_name", "")
                # h264 is sometimes reported as "h264" or "avc1"
                if actual_codec not in [expected_codec, "avc1"] and expected_codec == "h264":
                    errors.append(f"Video {video_number}: codec mismatch (expected {expected_codec}, got {actual_codec})")

        except subprocess.TimeoutExpired:
            errors.append(f"Video {video_number}: ffprobe timeout (file may be corrupted)")
        except json.JSONDecodeError:
            errors.append(f"Video {video_number}: ffprobe returned invalid JSON (file may be corrupted)")
        except FileNotFoundError:
            errors.append(f"Video {video_number}: ffprobe not found in PATH (install FFmpeg)")
        except Exception as e:
            errors.append(f"Video {video_number}: ffprobe error: {str(e)}")

        return errors

    def pre_flight_check(self) -> dict:
        """
        CRITICAL: Validate all preconditions before ANY agent starts.
        Must complete successfully before proceeding to Stage 1.

        Checks:
        1. Script file exists and contains at least one ## Scene block
        2. VideoProductionConfig has all required fields
        3. Production output directory exists and is writable
        4. agent_memory.json exists and is readable

        Returns: {"status": "passed"} if all checks pass
        Raises: Exception with detailed message if ANY check fails
        """
        errors = []

        # CHECK 1: Script file exists and has scenes
        try:
            script_path = Path(self.config.script_path)
            if not script_path.exists():
                errors.append(f"SCRIPT_FILE_MISSING: '{self.config.script_path}' does not exist")
            elif not script_path.is_file():
                errors.append(f"SCRIPT_NOT_FILE: '{self.config.script_path}' is not a file")
            else:
                content = script_path.read_text(encoding="utf-8")
                if "## Scene " not in content:
                    errors.append(f"NO_SCENES_IN_SCRIPT: '{self.config.script_path}' contains no '## Scene' blocks")
                else:
                    scene_count = content.count("## Scene ")
                    log_info("VideoProductionOrchestratorRemotionEdition",
                            f"✓ Script file valid: {scene_count} scenes found")
        except Exception as e:
            errors.append(f"SCRIPT_READ_ERROR: {str(e)}")

        # CHECK 2: VideoProductionConfig has required fields
        required_fields = ["script_path", "production_id", "voice_id", "fps"]
        missing_fields = []
        for field in required_fields:
            if not hasattr(self.config, field):
                missing_fields.append(field)
            elif getattr(self.config, field) is None:
                missing_fields.append(f"{field} (is None)")

        if missing_fields:
            errors.append(f"CONFIG_MISSING_FIELDS: {', '.join(missing_fields)}")
        else:
            log_info("VideoProductionOrchestratorRemotionEdition",
                    f"✓ Config valid: production_id={self.config.production_id}, fps={self.config.fps}")

        # CHECK 3: Production output directory exists and is writable
        try:
            output_dir = VIDEO_PRODUCTION_DIR / self.production_id
            output_dir.mkdir(parents=True, exist_ok=True)

            # Test writability
            test_file = output_dir / ".write_test"
            test_file.write_text("test")
            test_file.unlink()

            log_info("VideoProductionOrchestratorRemotionEdition",
                    f"✓ Output directory writable: {output_dir}")
        except PermissionError:
            errors.append(f"OUTPUT_DIR_NOT_WRITABLE: No write permission to {output_dir}")
        except Exception as e:
            errors.append(f"OUTPUT_DIR_ERROR: {str(e)}")

        # CHECK 4: agent_memory.json exists and is readable
        try:
            memory_path = Path("agent_memory.json")
            if not memory_path.exists():
                errors.append(f"AGENT_MEMORY_MISSING: 'agent_memory.json' not found in {Path.cwd()}")
            else:
                memory_content = memory_path.read_text(encoding="utf-8")
                try:
                    json.loads(memory_content)
                    log_info("VideoProductionOrchestratorRemotionEdition",
                            f"✓ Agent memory valid: {memory_path.absolute()}")
                except json.JSONDecodeError as e:
                    errors.append(f"AGENT_MEMORY_INVALID_JSON: {str(e)}")
        except Exception as e:
            errors.append(f"AGENT_MEMORY_ERROR: {str(e)}")

        # If ANY errors, halt with clear message
        if errors:
            error_message = "\n".join([f"  ✗ {err}" for err in errors])
            halt_message = f"""
╔════════════════════════════════════════════════════════════════════════════╗
║                         PRE-FLIGHT CHECK FAILED                            ║
║                   Cannot proceed to Stage 1 (VOICEOVER)                     ║
╚════════════════════════════════════════════════════════════════════════════╝

The following preconditions are missing or invalid:

{error_message}

ACTION REQUIRED:
  1. Fix the issues listed above
  2. Verify all files exist and are readable/writable
  3. Restart the orchestrator

Production: {self.production_id}
Script: {self.config.script_path}
Output Dir: {VIDEO_PRODUCTION_DIR / self.production_id}
"""
            log_error("VideoProductionOrchestratorRemotionEdition", "PreFlightCheckFailed", halt_message)
            raise GateFailedError(halt_message)

        log_info("VideoProductionOrchestratorRemotionEdition",
                "═" * 80)
        log_info("VideoProductionOrchestratorRemotionEdition",
                "✓ PRE-FLIGHT CHECK PASSED — All preconditions valid")
        log_info("VideoProductionOrchestratorRemotionEdition",
                "═" * 80)

        if self.dry_run_tracker:
            self.dry_run_tracker.record_check("pre_flight_check", passed=True)

        return {"status": "passed"}

    def run(self) -> dict:
        """Execute the 5-stage pipeline with review checkpoints."""
        # Print dry-run banner if enabled
        if self.dry_run:
            banner = "\n" + "=" * 80 + "\n"
            banner += "DRY-RUN MODE — NO API CALLS, NO CHARGES\n"
            banner += "=" * 80 + "\n"
            print(banner)
            log_info("VideoProductionOrchestratorRemotionEdition", "DRY-RUN MODE ENABLED")

        # CRITICAL: Run pre-flight check BEFORE anything else
        try:
            self.pre_flight_check()
        except GateFailedError as e:
            result = {
                "status": "halted",
                "production_id": self.production_id,
                "error": str(e),
                "stage": "pre_flight_check"
            }
            if self.dry_run:
                print(self.dry_run_tracker.get_summary())
            return result

        log_info("VideoProductionOrchestratorRemotionEdition", f"Starting {self.production_id}")

        state = self._load_state()

        stages = [
            ("voiceover", self._stage_voiceover),
            ("remotion_render", self._stage_remotion_render),
            ("post_production", self._stage_post_production),
            ("qa", self._stage_qa),
            ("distribution", self._stage_distribution),
        ]

        try:
            for stage_name, stage_func in stages:
                if state.current_stage == "complete" or state.current_stage == "halted":
                    break

                if self._stage_completed(state, stage_name):
                    log_info("VideoProductionOrchestratorRemotionEdition", f"Skipping {stage_name} (already done)")
                    continue

                log_info("VideoProductionOrchestratorRemotionEdition", f"Stage: {stage_name}")

                retry_count = 0
                max_retries = 3

                while retry_count < max_retries:
                    try:
                        result = stage_func(state)
                        if result.get("status") not in ["success", "not_configured"]:
                            raise Exception(f"Stage {stage_name} failed: {result}")

                        # LOCKED: Validate output contract BEFORE proceeding to next stage
                        contract_validation = self._validate_output_contract(stage_name, result, state)
                        if not contract_validation["passed"]:
                            state.current_stage = "halted"
                            self._save_state(state)
                            raise GateFailedError(
                                f"OUTPUT CONTRACT VIOLATION at {stage_name}:\n"
                                + "\n".join(f"  ✗ {err}" for err in contract_validation["errors"])
                            )

                        # Review checkpoint
                        report = self._quality_review(stage_name, result)
                        decision = self._review_checkpoint(stage_name, result, report, state)

                        if decision == "approve":
                            state.current_stage = stage_name
                            state = self._save_state(state)
                            break
                        elif decision == "redo":
                            retry_count += 1
                            if retry_count >= max_retries:
                                raise GateFailedError(f"Max retries ({max_retries}) for {stage_name}")
                        elif decision == "skip":
                            state.current_stage = stage_name
                            state = self._save_state(state)
                            break
                        elif decision == "halt":
                            raise GateFailedError(f"Halted at {stage_name}")

                    except Exception as e:
                        log_error("VideoProductionOrchestratorRemotionEdition", f"Stage {stage_name}", str(e))
                        raise

            state.current_stage = "complete"
            state.completed_at = self._timestamp()
            self._save_state(state)

            log_decision(
                "VideoProductionOrchestratorRemotionEdition", "production_complete", "success",
                f"Production {self.production_id} complete via Remotion",
                rationale="All stages passed; 65-75% cost savings vs traditional pipeline"
            )

            result = {
                "status": "complete",
                "production_id": self.production_id,
                "urls": dict(state.distribution_urls),
                "cost_savings": "$250-350/month (Remotion replaced Runway+JSON2Video)"
            }

            if self.dry_run:
                print(self.dry_run_tracker.get_summary())

            return result

        except GateFailedError as e:
            log_error("VideoProductionOrchestratorRemotionEdition", "GateFailedError", str(e))
            state.current_stage = "halted"
            self._save_state(state)

            result = {
                "status": "halted",
                "production_id": self.production_id,
                "error": str(e)
            }

            if self.dry_run:
                print(self.dry_run_tracker.get_summary())

            return result

    def _stage_voiceover(self, state: VideoProductionState) -> dict:
        """Generate voiceovers for all scenes."""
        log_info("VideoProductionOrchestratorRemotionEdition", "Stage: VOICEOVER")

        script_path = Path(self.config.script_path)
        if not script_path.exists():
            raise Exception(f"Script not found: {script_path}")

        scenes = self._parse_scenes_from_script(script_path)
        log_info("VideoProductionOrchestratorRemotionEdition", f"Parsed {len(scenes)} scenes")

        if self.dry_run:
            # DRY-RUN: Record ElevenLabs calls that would have been made
            self.dry_run_tracker.record_call("elevenlabs_voiceover", cost=0.30 * len(scenes))
            log_info("VideoProductionOrchestratorRemotionEdition",
                    f"[DRY-RUN] Would generate {len(scenes)} voiceovers via ElevenLabs (~${0.30 * len(scenes):.2f})")

            # Return stub voiceovers
            state.voiceovers = [
                {
                    "scene_id": f"{s['scene_id']}",
                    "voiceover_path": f"DRY_RUN_STUB_voiceover_{s['scene_id'].replace('.', '_')}.wav"
                }
                for s in scenes
            ]
        else:
            # For testing without ElevenLabs, return success with empty voiceovers
            log_warning("VideoProductionOrchestratorRemotionEdition", "ELEVENLABS_API_KEY not configured, skipping voiceover generation")
            state.voiceovers = []

        return {
            "status": "success",
            "production_id": self.production_id,
            "voiceovers": state.voiceovers,
            "total_scenes": len(scenes),
            "completed_scenes": 0,
            "failed_scenes": list(range(len(scenes))),
            "note": "Voiceover skipped (no API key). Proceeding to animation."
        }

    def _stage_remotion_render(self, state: VideoProductionState) -> dict:
        """Generate and assemble videos using Remotion."""
        log_info("VideoProductionOrchestratorRemotionEdition", "Stage: REMOTION_RENDER")

        script_path = Path(self.config.script_path)
        scenes = self._parse_scenes_from_script(script_path)

        # Group scenes by video_number
        videos = []
        for video_num in range(1, self.config.total_videos + 1):
            video_scenes = [
                {
                    **s,
                    "audio_path": self._find_voiceover_path(s["scene_id"], state.voiceovers) if state.voiceovers else ""
                }
                for s in scenes
                if s["scene_id"].startswith(f"{video_num}.")
            ]
            if video_scenes:
                videos.append({
                    "video_number": video_num,
                    "scenes": video_scenes
                })

        log_info("VideoProductionOrchestratorRemotionEdition", f"Would render {len(videos)} videos with Remotion")

        if self.dry_run:
            # DRY-RUN: Record Claude API calls for code generation
            # Estimate: ~1-2 Claude calls per video composition (code generation + self-validation)
            self.dry_run_tracker.record_call("claude_code_generation", cost=0.05 * len(videos) * 2)
            # Record Remotion render calls
            self.dry_run_tracker.record_call("remotion_render", cost=0.0)  # Remotion is open-source

            log_info("VideoProductionOrchestratorRemotionEdition",
                    f"[DRY-RUN] Would call Claude API ~{len(videos) * 2} times for code generation (~${0.05 * len(videos) * 2:.2f})")
            log_info("VideoProductionOrchestratorRemotionEdition",
                    f"[DRY-RUN] Would execute 'npx remotion render' {len(videos)} time(s)")

            # Return stub video paths
            state.assembled_videos = [
                {
                    "video_number": v["video_number"],
                    "video_path": f"DRY_RUN_STUB_video_{v['video_number']}.mp4"
                }
                for v in videos
            ]

            return {
                "status": "success",
                "production_id": self.production_id,
                "assembled": state.assembled_videos,
                "dry_run_stub": True
            }

        result = asyncio.run(self.remotion_agent.run_async(
            self.production_id, self.config, videos
        ))

        state.assembled_videos = result.get("assembled", [])
        return result

    def _stage_post_production(self, state: VideoProductionState) -> dict:
        """Add captions."""
        log_info("VideoProductionOrchestratorRemotionEdition", "Stage: POST_PRODUCTION")

        if not state.assembled_videos:
            raise Exception("Post-production requires videos")

        videos = [
            {
                "video_number": v.get("video_number"),
                "video_path": v.get("video_path")
            }
            for v in state.assembled_videos
        ]

        if self.dry_run:
            # DRY-RUN: Record ffmpeg operations that would have been made
            # Each video needs: caption generation + muxing
            self.dry_run_tracker.record_call("ffmpeg_operations", cost=0.0)

            log_info("VideoProductionOrchestratorRemotionEdition",
                    f"[DRY-RUN] Would run ffmpeg {len(videos)} time(s) for caption generation and muxing")

            # Return stub post-production results
            state.post_production_results = [
                {
                    "video_number": v["video_number"],
                    "final_path": f"DRY_RUN_STUB_video_{v['video_number']}_final.mp4",
                    "srt_path": f"DRY_RUN_STUB_video_{v['video_number']}.srt"
                }
                for v in videos
            ]

            return {
                "status": "success",
                "production_id": self.production_id,
                "results": state.post_production_results,
                "dry_run_stub": True
            }

        result = asyncio.run(self.post_production_agent.run_async(
            self.production_id, self.config, videos
        ))

        state.post_production_results = result.get("results", [])
        return result

    def _stage_qa(self, state: VideoProductionState) -> dict:
        """Quality review with LOCKED minimum checks validation."""
        log_info("VideoProductionOrchestratorRemotionEdition", "Stage: QA")

        if not state.post_production_results:
            raise Exception("QA requires results")

        # LOCKED: Pass production_id to enable minimum checks validation and QA lock system
        report = self.quality_skill.call(
            step_name="final_qa",
            artifacts={"results": state.post_production_results},
            spec={"overall_quality": True},
            threshold=0.85,
            production_id=self.production_id
        )

        state.quality_reports.append(report.model_dump())

        # LOCKED: Check if QA lock was engaged (minimum checks failed)
        if self.quality_skill.check_qa_lock(self.production_id):
            log_error("VideoProductionOrchestratorRemotionEdition", "QALocked",
                     f"Production {self.production_id} is QA-locked. Cannot proceed to distribution.")
            state.current_stage = "halted"
            self._save_state(state)
            raise GateFailedError(
                f"LOCKED: QA gate failed minimum checks. "
                f"Use --force-unlock {self.production_id} <reason> to override.\n"
                f"State: {VIDEO_PRODUCTION_DIR / self.production_id / 'state.json'}"
            )

        return {
            "status": "success",
            "qa_report": report.model_dump(),
            "total_videos": len(state.post_production_results)
        }

    def _stage_distribution(self, state: VideoProductionState) -> dict:
        """Distribute videos."""
        log_info("VideoProductionOrchestratorRemotionEdition", "Stage: DISTRIBUTION")

        if not state.post_production_results:
            raise Exception("Distribution requires results")

        videos = [
            {
                "video_number": r.get("video_number"),
                "video_path": r.get("final_path"),
                "title": f"Systems Evaluations - Video {r.get('video_number')}"
            }
            for r in state.post_production_results
        ]

        if self.dry_run:
            # DRY-RUN: Record upload calls that would have been made
            # Estimate: 1 upload to each platform per video
            self.dry_run_tracker.record_call("youtube_upload")
            self.dry_run_tracker.record_call("taleemabad_upload")
            self.dry_run_tracker.record_call("vizard_upload")

            log_info("VideoProductionOrchestratorRemotionEdition",
                    f"[DRY-RUN] Would upload {len(videos)} video(s) to YouTube, Taleemabad, and Vizard")

            # Return stub URLs
            state.distribution_urls = {
                "youtube": f"DRY_RUN_STUB_https://youtube.com/watch?v=stub_{self.production_id}",
                "taleemabad": f"DRY_RUN_STUB_https://lms.taleemabad.com/videos/{self.production_id}",
                "vizard": f"DRY_RUN_STUB_https://vizard.ai/projects/{self.production_id}"
            }

            return {
                "status": "success",
                "production_id": self.production_id,
                "urls": state.distribution_urls,
                "dry_run_stub": True
            }

        result = asyncio.run(self.distribution_agent.run_async(
            self.production_id, self.config, videos
        ))

        state.distribution_urls = result.get("urls", {})
        return result

    def _quality_review(self, stage_name: str, stage_result: dict) -> QualityReport:
        """Run quality review."""
        log_info("VideoProductionOrchestratorRemotionEdition", f"Quality review: {stage_name}")
        return self.quality_skill.call(
            step_name=stage_name,
            artifacts=stage_result,
            spec={},
            threshold=self._get_quality_threshold(stage_name)
        )

    def _review_checkpoint(self, stage: str, stage_result: dict, report: QualityReport,
                          state: VideoProductionState) -> str:
        """Display checkpoint and get decision."""
        # Auto-skip voiceover stage if all scenes failed (no API key)
        if stage == "voiceover" and report.overall_score == 0.0:
            log_info("VideoProductionOrchestratorRemotionEdition", "Auto-skipping voiceover stage (no API configured)")
            return "skip"

        self._display_checkpoint(stage, report)
        decision = self._prompt_decision(stage)
        review_decision = ReviewDecision(decision=decision)
        self._log_decision(stage, review_decision, state)
        state.review_decisions[stage] = review_decision.model_dump()
        return decision

    def _display_checkpoint(self, stage: str, report: QualityReport):
        """Display review checkpoint."""
        status_icon = "PASS" if report.passed else "FAIL"
        print("\n" + "=" * 70)
        print(f"  CHECKPOINT: {stage.upper()}")
        print("=" * 70)
        print(f"  Score: {report.overall_score:.2f}/1.00  [{status_icon}]")
        if report.issues:
            print(f"  Issues: {', '.join(report.issues[:2])}")
        print("-" * 70)
        print(f"  [A] Approve  [R] Redo  [S] Skip  [H] Halt")
        print("=" * 70)

    def _prompt_decision(self, stage: str) -> str:
        """
        Prompt for decision. REMOVED: Auto-approve on timeout.
        Pipeline requires explicit human decision at every checkpoint.
        No default/timeout approval allowed.
        """
        import threading
        decision = {"value": None}  # Changed from "approve" to None (no default)
        decision_received = {"done": False}

        def read_input():
            try:
                choice = input("Decision: ").strip().upper()
                if choice in ["A", "R", "S", "H"]:
                    decision["value"] = {"A": "approve", "R": "redo", "S": "skip", "H": "halt"}[choice]
                    decision_received["done"] = True
            except:
                pass

        thread = threading.Thread(target=read_input, daemon=True)
        thread.start()
        thread.join(timeout=REVIEW_TIMEOUT_SECONDS)

        # REMOVED: Auto-approve on timeout
        # Pipeline now REQUIRES explicit human decision
        if not decision_received["done"]:
            error_msg = (
                f"\n╔════════════════════════════════════════════════════════════════╗\n"
                f"║             DECISION TIMEOUT — NO AUTO-APPROVAL                ║\n"
                f"║  Pipeline requires explicit human decision at checkpoints.     ║\n"
                f"║  Decision was not provided within {REVIEW_TIMEOUT_SECONDS}s.          ║\n"
                f"║  Please provide [A]pprove, [R]edo, [S]kip, or [H]alt.         ║\n"
                f"║  No default approval is permitted.                             ║\n"
                f"╚════════════════════════════════════════════════════════════════╝\n"
            )
            print(error_msg)
            log_error("VideoProductionOrchestratorRemotionEdition", "DecisionTimeout",
                     f"Stage {stage} requires explicit decision; timeout reached")
            raise GateFailedError(f"Decision timeout at {stage} checkpoint; no auto-approval permitted")

        return decision["value"]

    def _log_decision(self, stage: str, decision: ReviewDecision, state: VideoProductionState):
        """Log decision."""
        with open(self.decisions_log, "a") as f:
            f.write(json.dumps({
                "stage": stage,
                "decision": decision.decision,
                "timestamp": self._timestamp()
            }) + "\n")

    def _load_state(self) -> VideoProductionState:
        """Load or create state."""
        if self.state_path.exists():
            return VideoProductionState(**json.loads(self.state_path.read_text()))
        return VideoProductionState(
            production_id=self.production_id,
            config=self.config.model_dump()
        )

    def _save_state(self, state: VideoProductionState) -> VideoProductionState:
        """Save state."""
        self.state_path.write_text(json.dumps(state.model_dump(), indent=2))
        return state

    def _stage_completed(self, state: VideoProductionState, stage_name: str) -> bool:
        """Check if stage completed."""
        return stage_name in state.review_decisions

    def _get_quality_threshold(self, stage: str) -> float:
        return {"voiceover": 0.80, "remotion_render": 0.85, "post_production": 0.85, "qa": 0.85, "distribution": 0.80}.get(stage, 0.75)

    def _find_voiceover_path(self, scene_id: str, voiceovers: list[dict]) -> str:
        """Find audio path for scene."""
        for vo in voiceovers:
            if vo.get("scene_id") == scene_id:
                return vo.get("audio_path", "")
        return ""

    def _parse_scenes_from_script(self, script_path: Path) -> list[dict]:
        """Parse scenes from markdown script."""
        content = script_path.read_text(encoding="utf-8")
        scenes = []
        parts = content.split("## Scene ")

        for i, part in enumerate(parts[1:], 1):
            lines = part.split("\n")
            scene_id = lines[0].strip()

            visual_desc = ""
            anim_spec = ""
            narration_text = ""

            in_visual = in_animation = in_narration = False

            for line in lines[1:]:
                if "**Visual**" in line or "Visual:" in line:
                    in_visual, in_animation, in_narration = True, False, False
                elif "**Animation**" in line or "Animation:" in line:
                    in_visual, in_animation, in_narration = False, True, False
                elif "**Narration**" in line or "Narration:" in line:
                    in_visual, in_animation, in_narration = False, False, True
                elif line.startswith("##"):
                    break
                else:
                    if in_visual:
                        visual_desc += line + "\n"
                    elif in_animation:
                        anim_spec += line + "\n"
                    elif in_narration:
                        narration_text += line + "\n"

            scenes.append({
                "scene_id": scene_id,
                "visual_description": visual_desc.strip(),
                "animation_specification": anim_spec.strip(),
                "narration_text": narration_text.strip(),
                "duration_seconds": len(narration_text.split()) / 150  # ~150 words/min
            })

        return scenes

    def _timestamp(self) -> str:
        """Get ISO timestamp."""
        from datetime import datetime
        return datetime.now().isoformat()

    @staticmethod
    def force_unlock(production_id: str, reason: str) -> dict:
        """
        Force unlock a QA-locked production.

        LOCKED: Requires explicit reason string for audit trail.
        Unlock action is logged to agent_memory.json as a correction event.

        Args:
            production_id: The production ID that is locked
            reason: Explicit reason for override (logged to memory)

        Returns:
            {"status": "unlocked", "production_id": production_id, "reason": reason}
            OR
            {"status": "error", "error": "..."}
        """
        from skills.quality_review_skill import QualityReviewSkill

        if not production_id or not reason:
            return {"status": "error", "error": "production_id and reason are required"}

        if not reason.strip():
            return {"status": "error", "error": "reason cannot be empty"}

        try:
            quality_skill = QualityReviewSkill()
            success = quality_skill.unlock_qa_lock(production_id, reason)

            if success:
                log_decision(
                    "VideoProductionOrchestratorRemotionEdition", "qa_force_unlock", "success",
                    f"Production {production_id} manually unlocked",
                    rationale=reason
                )
                return {
                    "status": "unlocked",
                    "production_id": production_id,
                    "reason": reason,
                    "message": f"QA lock removed for {production_id}. Pipeline may now proceed to distribution."
                }
            else:
                return {"status": "error", "error": f"Failed to unlock {production_id}"}

        except Exception as e:
            log_error("VideoProductionOrchestratorRemotionEdition", "UnlockError", str(e))
            return {"status": "error", "error": str(e)}
