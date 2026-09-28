import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Literal
sys.path.insert(0, str(Path(__file__).parent))

from schemas import (
    VideoProductionConfig, VideoProductionState, ReviewDecision, QualityReport
)
from agents.voiceover_agent import VoiceoverAgent
from agents.animation_agent import AnimationAgent
from agents.post_production_agent import PostProductionAgent
from agents.video_assembly_agent import VideoAssemblyAgent
from agents.distribution_agent import DistributionAgent
from skills.quality_review_skill import QualityReviewSkill
from config import VIDEO_PRODUCTION_DIR, REVIEW_TIMEOUT_SECONDS
from logger import log_info, log_error, log_decision, log_warning


class GateFailedError(Exception):
    pass


class VideoProductionOrchestrator:
    """7-stage video production pipeline with human review checkpoints."""

    def __init__(self, config: VideoProductionConfig):
        self.config = config
        self.production_id = config.production_id
        self.state_path = VIDEO_PRODUCTION_DIR / self.production_id / "state.json"
        self.decisions_log = VIDEO_PRODUCTION_DIR / self.production_id / "decisions.log"
        self.review_queue = VIDEO_PRODUCTION_DIR / self.production_id / "review_queue"

        self.voiceover_agent = VoiceoverAgent()
        self.animation_agent = AnimationAgent()
        self.post_production_agent = PostProductionAgent()
        self.video_assembly_agent = VideoAssemblyAgent()
        self.distribution_agent = DistributionAgent()
        self.quality_skill = QualityReviewSkill()

        # Ensure directories exist
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        self.review_queue.mkdir(parents=True, exist_ok=True)

    def run(self) -> dict:
        """Execute the 7-stage pipeline with review checkpoints."""

        log_info("VideoProductionOrchestrator", f"Starting production {self.production_id}")

        # Load existing state if available (resume)
        state = self._load_state()

        stages = [
            ("voiceover", self._stage_voiceover),
            ("animation", self._stage_animation),
            ("assembly", self._stage_assembly),
            ("post_production", self._stage_post_production),
            ("qa", self._stage_qa),
            ("distribution", self._stage_distribution),
        ]

        try:
            for stage_name, stage_func in stages:
                if state.current_stage == "complete" or state.current_stage == "halted":
                    break

                # Skip stages that are already completed
                if self._stage_completed(state, stage_name):
                    log_info("VideoProductionOrchestrator", f"Skipping {stage_name} (already completed)")
                    continue

                log_info("VideoProductionOrchestrator", f"Entering stage: {stage_name}")

                decision = "approve"
                retry_count = 0
                max_retries = 3

                while retry_count < max_retries:
                    try:
                        # Execute stage
                        result = stage_func(state)
                        if result.get("status") != "success":
                            raise Exception(f"Stage {stage_name} failed: {result}")

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
                                raise GateFailedError(f"Max retries ({max_retries}) exceeded for {stage_name}")
                        elif decision == "redirect":
                            # Re-run with modified instructions (user provides via _review_checkpoint)
                            retry_count += 1
                        elif decision == "skip":
                            state.current_stage = stage_name
                            state = self._save_state(state)
                            break
                        elif decision == "halt":
                            raise GateFailedError(f"Production halted at {stage_name} by user")

                    except Exception as e:
                        log_error("VideoProductionOrchestrator", f"Stage {stage_name} error", str(e))
                        raise

            state.current_stage = "complete"
            state.completed_at = self._timestamp()
            self._save_state(state)

            log_decision(
                "VideoProductionOrchestrator", "production_complete", "success",
                f"Production {self.production_id} completed successfully",
                rationale="All stages passed quality gates"
            )

            return {
                "status": "complete",
                "production_id": self.production_id,
                "urls": dict(state.distribution_urls)
            }

        except GateFailedError as e:
            log_error("VideoProductionOrchestrator", "GateFailedError", str(e))
            state.current_stage = "halted"
            self._save_state(state)
            return {
                "status": "halted",
                "production_id": self.production_id,
                "error": str(e)
            }

    def _stage_voiceover(self, state: VideoProductionState) -> dict:
        """Generate voiceovers for all scenes."""
        log_info("VideoProductionOrchestrator", "Stage VOICEOVER: generating voiceovers")

        # Parse scenes from script
        script_path = Path(self.config.script_path)
        if not script_path.exists():
            raise Exception(f"Script file not found: {script_path}")

        scenes = self._parse_scenes_from_script(script_path)
        log_info("VideoProductionOrchestrator", f"Parsed {len(scenes)} scenes from script")

        # Run voiceover agent
        result = asyncio.run(self.voiceover_agent.run_async(
            self.production_id, self.config, scenes
        ))

        state.voiceovers = result.get("voiceovers", [])
        return result

    def _stage_animation(self, state: VideoProductionState) -> dict:
        """Generate animations for all scenes."""
        log_info("VideoProductionOrchestrator", "Stage ANIMATION: generating animations")

        if not state.voiceovers:
            raise Exception("No voiceovers available; animation stage requires completed voiceovers")

        script_path = Path(self.config.script_path)
        scenes = self._parse_scenes_from_script(script_path)

        # Run animation agent
        result = asyncio.run(self.animation_agent.run_async(
            self.production_id, self.config, scenes
        ))

        state.animations = result.get("animations", [])
        return result

    def _stage_assembly(self, state: VideoProductionState) -> dict:
        """Assemble videos from voiceovers + animations."""
        log_info("VideoProductionOrchestrator", "Stage ASSEMBLY: assembling videos")

        if not state.voiceovers or not state.animations:
            raise Exception("Assembly requires completed voiceovers and animations")

        # Pair voiceovers with animations by video_number
        assembly_specs = []
        num_videos = self.config.total_videos

        for video_num in range(1, num_videos + 1):
            vo_list = [v for v in state.voiceovers if v.get("scene_id", "").startswith(f"{video_num}.")]
            anim_list = [a for a in state.animations if a.get("scene_id", "").startswith(f"{video_num}.")]

            if vo_list and anim_list:
                assembly_specs.append({
                    "video_number": video_num,
                    "voiceovers": vo_list,
                    "animations": anim_list,
                    "music_path": None  # Music path would come from music selection skill
                })

        result = asyncio.run(self.video_assembly_agent.run_async(
            self.production_id, self.config, assembly_specs
        ))

        state.assembled_videos = result.get("assembled", [])
        return result

    def _stage_post_production(self, state: VideoProductionState) -> dict:
        """Add captions and audio mixing."""
        log_info("VideoProductionOrchestrator", "Stage POST_PRODUCTION: adding captions and mixing")

        if not state.assembled_videos:
            raise Exception("Post-production requires assembled videos")

        # Prepare videos for post-production
        videos = [
            {
                "video_number": v.get("video_number"),
                "video_path": v.get("video_path")
            }
            for v in state.assembled_videos
        ]

        result = asyncio.run(self.post_production_agent.run_async(
            self.production_id, self.config, videos
        ))

        state.post_production_results = result.get("results", [])
        return result

    def _stage_qa(self, state: VideoProductionState) -> dict:
        """Quality assurance: review all output."""
        log_info("VideoProductionOrchestrator", "Stage QA: quality assurance review")

        if not state.post_production_results:
            raise Exception("QA requires post-production results")

        qa_report = self.quality_skill.call(
            step_name="final_qa",
            artifacts={
                "post_production_results": state.post_production_results,
                "total_videos": len(state.post_production_results),
                "config": self.config.model_dump()
            },
            spec={
                "expected_resolution": "1920x1080",
                "expected_fps": self.config.fps,
                "captions_required": True,
                "audio_quality_critical": True
            },
            threshold=0.85
        )

        state.quality_reports.append(qa_report.model_dump())

        return {
            "status": "success",
            "qa_report": qa_report.model_dump(),
            "total_videos": len(state.post_production_results)
        }

    def _stage_distribution(self, state: VideoProductionState) -> dict:
        """Distribute to YouTube, LMS, and generate clips."""
        log_info("VideoProductionOrchestrator", "Stage DISTRIBUTION: publishing videos")

        if not state.post_production_results:
            raise Exception("Distribution requires post-production results")

        videos = [
            {
                "video_number": r.get("video_number"),
                "video_path": r.get("final_path"),
                "title": f"Systems Evaluations - Video {r.get('video_number')}"
            }
            for r in state.post_production_results
        ]

        result = asyncio.run(self.distribution_agent.run_async(
            self.production_id, self.config, videos
        ))

        state.distribution_urls = result.get("urls", {})
        return result

    def _quality_review(self, stage_name: str, stage_result: dict) -> QualityReport:
        """Run quality review for the stage output."""
        log_info("VideoProductionOrchestrator", f"Running quality review for {stage_name}")

        threshold = self._get_quality_threshold(stage_name)

        report = self.quality_skill.call(
            step_name=stage_name,
            artifacts=stage_result,
            spec=self._get_quality_spec(stage_name),
            threshold=threshold
        )

        return report

    def _review_checkpoint(self, stage: str, stage_result: dict, report: QualityReport,
                          state: VideoProductionState) -> str:
        """
        Display quality report and prompt for review decision.
        Returns: "approve", "redo", "redirect", "skip", or "halt"
        """
        # Save report to review queue
        review_file = self.review_queue / f"{stage}_report.json"
        review_file.write_text(json.dumps(report.model_dump(), indent=2))

        # Format and display review checkpoint
        self._display_checkpoint(stage, report)

        # Prompt for decision with timeout
        decision = self._prompt_decision(stage)

        # Log decision
        review_decision = ReviewDecision(
            decision=decision,
            instructions=None
        )
        self._log_decision(stage, review_decision, state)

        state.review_decisions[stage] = review_decision.model_dump()
        return decision

    def _display_checkpoint(self, stage: str, report: QualityReport):
        """Display formatted review checkpoint to console."""
        status_icon = "✓" if report.passed else "✗"
        status_text = "PASS" if report.passed else "NEEDS WORK"

        print("\n" + "=" * 70)
        print(f"  REVIEW CHECKPOINT: {stage.upper()}")
        print("=" * 70)
        print(f"  Quality Score: {report.overall_score:.2f} / 1.00   {status_icon} {status_text}")

        if report.issues:
            print(f"  Issues found ({len(report.issues)}):")
            for issue in report.issues[:3]:  # Show first 3
                print(f"    - {issue}")

        if report.recommendations:
            print(f"  Recommendations:")
            for rec in report.recommendations[:2]:  # Show first 2
                print(f"    • {rec}")

        print(f"  Summary: {report.summary}")
        print("-" * 70)
        print(f"  [A] Approve   → proceed to next stage")
        print(f"  [R] Redo      → re-run this stage")
        print(f"  [D] Redirect  → re-run with instructions")
        print(f"  [S] Skip      → skip to next stage")
        print(f"  [H] Halt      → stop production")
        print(f"  (Auto-approves in {REVIEW_TIMEOUT_SECONDS} seconds)")
        print("=" * 70)

    def _prompt_decision(self, stage: str) -> str:
        """Prompt for review decision with timeout."""
        import threading

        decision = {"value": "approve"}  # default
        timeout_remaining = REVIEW_TIMEOUT_SECONDS

        def read_input():
            try:
                choice = input("Decision: ").strip().upper()
                if choice == "A":
                    decision["value"] = "approve"
                elif choice == "R":
                    decision["value"] = "redo"
                elif choice == "D":
                    instructions = input("Enter redirect instructions: ").strip()
                    decision["value"] = "redirect"
                    decision["instructions"] = instructions
                elif choice == "S":
                    decision["value"] = "skip"
                elif choice == "H":
                    decision["value"] = "halt"
            except:
                pass

        input_thread = threading.Thread(target=read_input, daemon=True)
        input_thread.start()
        input_thread.join(timeout=timeout_remaining)

        if input_thread.is_alive():
            print(f"\nTimeout reached. Auto-approving {stage}...")

        return decision["value"]

    def _log_decision(self, stage: str, decision: ReviewDecision, state: VideoProductionState):
        """Log review decision to decisions.log."""
        entry = {
            "stage": stage,
            "decision": decision.decision,
            "timestamp": self._timestamp(),
            "instructions": decision.instructions
        }

        with open(self.decisions_log, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def _load_state(self) -> VideoProductionState:
        """Load existing production state or create new."""
        if self.state_path.exists():
            data = json.loads(self.state_path.read_text())
            log_info("VideoProductionOrchestrator", f"Resumed production from {data.get('current_stage')}")
            return VideoProductionState(**data)

        return VideoProductionState(
            production_id=self.production_id,
            config=self.config.model_dump()
        )

    def _save_state(self, state: VideoProductionState) -> VideoProductionState:
        """Save production state to disk."""
        self.state_path.write_text(
            json.dumps(state.model_dump(), indent=2),
            encoding="utf-8"
        )
        return state

    def _stage_completed(self, state: VideoProductionState, stage_name: str) -> bool:
        """Check if a stage has already been completed."""
        return stage_name in state.review_decisions

    def _get_quality_threshold(self, stage: str) -> float:
        """Get quality threshold for a stage."""
        thresholds = {
            "voiceover": 0.80,
            "animation": 0.75,
            "assembly": 0.80,
            "post_production": 0.85,
            "qa": 0.85,
            "distribution": 0.80,
        }
        return thresholds.get(stage, 0.75)

    def _get_quality_spec(self, stage: str) -> dict:
        """Get quality spec for a stage."""
        specs = {
            "voiceover": {
                "clarity": True,
                "pacing": True,
                "tone_consistency": True
            },
            "animation": {
                "smoothness": True,
                "color_accuracy": True,
                "timing_alignment": True
            },
            "assembly": {
                "sync": True,
                "audio_levels": True,
                "resolution": "1920x1080"
            },
            "post_production": {
                "captions_accuracy": True,
                "audio_mix": True,
                "visual_quality": True
            },
            "qa": {
                "overall_quality": True,
                "spec_compliance": True
            },
            "distribution": {
                "upload_success": True,
                "metadata_complete": True
            }
        }
        return specs.get(stage, {})

    def _parse_scenes_from_script(self, script_path: Path) -> list[dict]:
        """Parse scenes from markdown script file."""
        content = script_path.read_text(encoding="utf-8")

        # Simple parser: split by ## Scene headings
        scenes = []
        parts = content.split("## Scene ")

        for i, part in enumerate(parts[1:], 1):
            lines = part.split("\n")
            scene_id = lines[0].strip()

            # Extract visual description and animation spec
            visual_desc = ""
            anim_spec = ""
            narration_text = ""

            in_visual = False
            in_animation = False
            in_narration = False

            for line in lines[1:]:
                if "**Visual**" in line or "Visual:" in line:
                    in_visual = True
                    in_animation = False
                    in_narration = False
                elif "**Animation**" in line or "Animation:" in line:
                    in_visual = False
                    in_animation = True
                    in_narration = False
                elif "**Narration**" in line or "Narration:" in line:
                    in_visual = False
                    in_animation = False
                    in_narration = True
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
                "narration_text": narration_text.strip()
            })

        return scenes

    def _timestamp(self) -> str:
        """Get current ISO timestamp."""
        from datetime import datetime
        return datetime.now().isoformat()
