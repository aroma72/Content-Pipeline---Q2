import asyncio
import json
import sys
import requests
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas import VideoProductionConfig, AssembledVideo
from skills.video_assembly_skill import VideoAssemblySkill
from config import VIDEO_PRODUCTION_DIR, JSON2VIDEO_API_KEY
from logger import log_info, log_error, log_decision, log_warning


class VideoAssemblyAgent:
    """Async agent: assemble voiceovers + animations into final videos using JSON2Video."""

    def __init__(self, timeout_minutes: int = 60):
        self.timeout_seconds = timeout_minutes * 60
        self.assembly_skill = VideoAssemblySkill()
        self.json2video_base_url = "https://api.json2video.com/v1"
        self.api_key = JSON2VIDEO_API_KEY

    async def run_async(self, production_id: str, config: VideoProductionConfig,
                       assembly_specs: list[dict], callback=None) -> dict:
        """
        Assemble each video from voiceovers, animations, and music.
        Each spec dict: {video_number, voiceovers, animations, music_path}
        """
        log_info("VideoAssemblyAgent", f"Starting assembly for {len(assembly_specs)} videos")

        try:
            result = await asyncio.wait_for(
                self._execute(production_id, config, assembly_specs),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("VideoAssemblyAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error)
            return {"status": "timeout", "production_id": production_id}

        except Exception as e:
            log_error("VideoAssemblyAgent", "ExecutionError", str(e))
            if callback:
                callback(status="error", error=str(e))
            return {"status": "error", "production_id": production_id, "error": str(e)}

    async def _execute(self, production_id: str, config: VideoProductionConfig,
                       assembly_specs: list[dict]) -> dict:
        """Assemble all videos via JSON2Video API."""

        assembled = []
        failed_videos = []

        for spec in assembly_specs:
            video_number = spec.get("video_number")
            voiceovers = spec.get("voiceovers", [])
            animations = spec.get("animations", [])
            music_path = spec.get("music_path")

            if not voiceovers or not animations:
                log_warning("VideoAssemblyAgent", f"Video {video_number} missing voiceovers or animations")
                failed_videos.append(video_number)
                continue

            try:
                # Step 1: Build composition JSON
                composition_result = self.assembly_skill.call(video_number, voiceovers, animations, music_path)
                if not composition_result:
                    failed_videos.append(video_number)
                    continue

                composition = composition_result.get("composition")
                estimated_duration = composition_result.get("estimated_duration_seconds")

                # Step 2: Submit to JSON2Video API
                if not self.api_key:
                    log_warning("VideoAssemblyAgent", "JSON2VIDEO_API_KEY not configured; skipping render")
                    failed_videos.append(video_number)
                    continue

                headers = {"Authorization": f"Bearer {self.api_key}"}
                payload = {"composition": composition}

                try:
                    submit_response = requests.post(
                        f"{self.json2video_base_url}/render",
                        json=payload,
                        headers=headers,
                        timeout=30
                    )

                    if submit_response.status_code not in [200, 201]:
                        log_error("VideoAssemblyAgent", "SubmitError",
                                 f"JSON2Video returned {submit_response.status_code}")
                        failed_videos.append(video_number)
                        continue

                    render_data = submit_response.json()
                    render_id = render_data.get("id") or render_data.get("render_id")
                    log_info("VideoAssemblyAgent", f"Render {render_id} submitted for video {video_number}")

                    # Step 3: Poll for completion
                    video_result = await self._poll_json2video(render_id, video_number, production_id)

                    if video_result:
                        assembled.append(video_result.model_dump())
                    else:
                        failed_videos.append(video_number)

                except requests.exceptions.RequestException as e:
                    log_error("VideoAssemblyAgent", "NetworkError", str(e))
                    failed_videos.append(video_number)

            except Exception as e:
                log_error("VideoAssemblyAgent", "AssemblyError", str(e), action_taken="video skipped")
                failed_videos.append(video_number)

            # Rate limit
            await asyncio.sleep(2)

        # Save state
        state_dir = VIDEO_PRODUCTION_DIR / production_id
        state_dir.mkdir(parents=True, exist_ok=True)
        assembly_state = {
            "production_id": production_id,
            "total_videos": len(assembly_specs),
            "completed": len(assembled),
            "failed": len(failed_videos),
            "assembled": assembled,
            "failed_videos": failed_videos
        }
        (state_dir / "assembly_state.json").write_text(
            json.dumps(assembly_state, indent=2),
            encoding="utf-8"
        )

        log_decision(
            "VideoAssemblyAgent", "assembly_complete", "success",
            f"{len(assembled)}/{len(assembly_specs)} videos assembled, {len(failed_videos)} failed",
            rationale="Assembled videos ready for post-production"
        )

        return {
            "status": "success",
            "production_id": production_id,
            "assembled": assembled,
            "total_videos": len(assembly_specs),
            "completed_videos": len(assembled),
            "failed_videos": failed_videos
        }

    async def _poll_json2video(self, render_id: str, video_number: int,
                               production_id: str) -> AssembledVideo | None:
        """Poll JSON2Video API until render is complete."""

        headers = {"Authorization": f"Bearer {self.api_key}"}
        max_polls = 120  # 10 minutes with 5s delays
        poll_count = 0

        while poll_count < max_polls:
            try:
                status_response = requests.get(
                    f"{self.json2video_base_url}/render/{render_id}",
                    headers=headers,
                    timeout=30
                )

                if status_response.status_code != 200:
                    await asyncio.sleep(5)
                    poll_count += 1
                    continue

                render_data = status_response.json()
                status = render_data.get("status")

                if status == "completed":
                    video_url = render_data.get("video_url")
                    if not video_url:
                        log_error("VideoAssemblyAgent", "NoOutput", f"Render {render_id} has no video URL")
                        return None

                    # Download video
                    output_dir = VIDEO_PRODUCTION_DIR / production_id / "assembled"
                    output_dir.mkdir(parents=True, exist_ok=True)
                    output_path = output_dir / f"video_{video_number}.mp4"

                    video_response = requests.get(video_url, timeout=120)
                    if video_response.status_code == 200:
                        output_path.write_bytes(video_response.content)

                        log_info("VideoAssemblyAgent", f"Assembly complete: video {video_number}")
                        return AssembledVideo(
                            video_number=video_number,
                            title=f"Systems Evaluations - Video {video_number}",
                            video_path=str(output_path),
                            duration_seconds=render_data.get("duration_seconds", 300),
                            scene_count=render_data.get("scene_count", 0),
                            has_captions=False,
                            has_music=False,
                            quality_score=0.85
                        )

                elif status == "failed":
                    log_error("VideoAssemblyAgent", "RenderFailed", f"Render {render_id} failed")
                    return None

                elif status in ["queued", "processing"]:
                    await asyncio.sleep(5)
                    poll_count += 1

            except requests.exceptions.RequestException as e:
                log_warning("VideoAssemblyAgent", f"Poll error: {str(e)}; retrying...")
                await asyncio.sleep(5)
                poll_count += 1

        log_error("VideoAssemblyAgent", "PollTimeout", f"Render {render_id} did not complete")
        return None
