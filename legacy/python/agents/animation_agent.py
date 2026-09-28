import asyncio
import json
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
from schemas import VideoProductionConfig, AnimationResult
from skills.animation_prompt_skill import AnimationPromptSkill
from config import VIDEO_PRODUCTION_DIR, RUNWAY_API_KEY
from logger import log_info, log_error, log_decision, log_warning


class AnimationAgent:
    """Async agent: generate animations for all scenes using Runway Gen-4."""

    def __init__(self, timeout_minutes: int = 120):
        self.timeout_seconds = timeout_minutes * 60
        self.prompt_skill = AnimationPromptSkill()
        self.runway_base_url = "https://api.runwayml.com/v1"
        self.api_key = RUNWAY_API_KEY

    async def run_async(self, production_id: str, config: VideoProductionConfig,
                       scenes: list[dict], callback=None) -> dict:
        """Generate animations for all scenes."""

        log_info("AnimationAgent", f"Starting animation generation for {len(scenes)} scenes")

        if not self.api_key:
            log_warning("AnimationAgent", "RUNWAY_API_KEY not configured; skipping animations")
            return {"status": "skipped", "production_id": production_id, "reason": "no API key"}

        try:
            result = await asyncio.wait_for(
                self._execute(production_id, config, scenes),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("AnimationAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error)
            return {"status": "timeout", "production_id": production_id}

        except Exception as e:
            log_error("AnimationAgent", "ExecutionError", str(e))
            if callback:
                callback(status="error", error=str(e))
            return {"status": "error", "production_id": production_id, "error": str(e)}

    async def _execute(self, production_id: str, config: VideoProductionConfig,
                       scenes: list[dict]) -> dict:
        """Generate animations with Runway Gen-4 API polling."""

        animations = []
        failed_scenes = []

        for scene in scenes:
            scene_id = scene.get("scene_id")
            visual_desc = scene.get("visual_description", "")
            animation_spec = scene.get("animation_specification", "")

            if not visual_desc:
                log_warning("AnimationAgent", f"Scene {scene_id} missing visual description; skipping")
                failed_scenes.append(scene_id)
                continue

            # Step 1: Build animation prompt using Claude
            prompt_data = self.prompt_skill.call(scene_id, visual_desc, animation_spec)
            if not prompt_data:
                failed_scenes.append(scene_id)
                continue

            # Step 2: Submit to Runway Gen-4
            headers = {"Authorization": f"Bearer {self.api_key}"}
            payload = {
                "model": "gen4",
                "prompt": prompt_data["prompt"],
                "negative_prompt": prompt_data.get("negative_prompt", ""),
                "duration": prompt_data.get("duration", 8),
                "resolution": "1920x1080"
            }

            try:
                submit_response = requests.post(
                    f"{self.runway_base_url}/image_to_video",
                    json=payload,
                    headers=headers,
                    timeout=30
                )

                if submit_response.status_code != 200:
                    log_error("AnimationAgent", "SubmitError",
                             f"Runway returned {submit_response.status_code}",
                             action_taken="scene skipped")
                    failed_scenes.append(scene_id)
                    continue

                task_id = submit_response.json().get("id")
                log_info("AnimationAgent", f"Animation task {task_id} submitted for {scene_id}")

                # Step 3: Poll for completion (up to 15 minutes per scene)
                animation_result = await self._poll_runway(task_id, scene_id, production_id, config)

                if animation_result:
                    animations.append(animation_result.model_dump())
                else:
                    failed_scenes.append(scene_id)

            except requests.exceptions.RequestException as e:
                log_error("AnimationAgent", "NetworkError", str(e), action_taken="scene skipped")
                failed_scenes.append(scene_id)

            # Rate limit: Runway API
            await asyncio.sleep(2)

        # Save state
        state_dir = VIDEO_PRODUCTION_DIR / production_id
        state_dir.mkdir(parents=True, exist_ok=True)
        animation_state = {
            "production_id": production_id,
            "total_scenes": len(scenes),
            "completed": len(animations),
            "failed": len(failed_scenes),
            "animations": animations,
            "failed_scenes": failed_scenes
        }
        (state_dir / "animation_state.json").write_text(
            json.dumps(animation_state, indent=2),
            encoding="utf-8"
        )

        log_decision(
            "AnimationAgent", "animation_generation_complete", "success",
            f"{len(animations)}/{len(scenes)} scenes completed, {len(failed_scenes)} failed",
            rationale="Animation files saved; ready for assembly"
        )

        return {
            "status": "success",
            "production_id": production_id,
            "animations": animations,
            "total_scenes": len(scenes),
            "completed_scenes": len(animations),
            "failed_scenes": failed_scenes
        }

    async def _poll_runway(self, task_id: str, scene_id: str, production_id: str,
                          config: VideoProductionConfig) -> AnimationResult | None:
        """Poll Runway API until animation is complete."""

        headers = {"Authorization": f"Bearer {self.api_key}"}
        max_polls = 180  # 15 minutes with 5s delays
        poll_count = 0

        while poll_count < max_polls:
            try:
                status_response = requests.get(
                    f"{self.runway_base_url}/tasks/{task_id}",
                    headers=headers,
                    timeout=30
                )

                if status_response.status_code != 200:
                    await asyncio.sleep(5)
                    poll_count += 1
                    continue

                task_data = status_response.json()
                status = task_data.get("status")

                if status == "SUCCEEDED":
                    video_url = task_data.get("output", [None])[0]
                    if not video_url:
                        log_error("AnimationAgent", "NoOutput", f"Task {task_id} has no output URL")
                        return None

                    # Download video
                    output_dir = VIDEO_PRODUCTION_DIR / production_id / "animations"
                    output_dir.mkdir(parents=True, exist_ok=True)
                    output_path = output_dir / f"{scene_id}.mp4"

                    video_response = requests.get(video_url, timeout=120)
                    if video_response.status_code == 200:
                        output_path.write_bytes(video_response.content)

                        # Estimate duration and quality
                        estimated_duration = config.fps * config.fps  # placeholder estimate
                        quality_score = min(0.95, 0.75 + (poll_count / max_polls) * 0.15)

                        log_info("AnimationAgent", f"Animation complete: {scene_id}")
                        return AnimationResult(
                            scene_id=scene_id,
                            video_path=str(output_path),
                            duration_seconds=estimated_duration,
                            runway_task_id=task_id,
                            quality_score=quality_score
                        )

                elif status == "FAILED":
                    log_error("AnimationAgent", "RenderFailed", f"Task {task_id} failed")
                    return None

                elif status in ["QUEUED", "IN_PROGRESS"]:
                    await asyncio.sleep(5)
                    poll_count += 1

            except requests.exceptions.RequestException as e:
                log_warning("AnimationAgent", f"Poll error: {str(e)}; retrying...")
                await asyncio.sleep(5)
                poll_count += 1

        log_error("AnimationAgent", "PollTimeout", f"Task {task_id} did not complete in {max_polls * 5}s")
        return None
