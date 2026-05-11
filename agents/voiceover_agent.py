import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas import VideoProductionConfig, SceneVoiceover
from skills.voiceover_skill import VoiceoverSkill
from config import VIDEO_PRODUCTION_DIR
from logger import log_info, log_error, log_decision


class VoiceoverAgent:
    """Async agent: generate voiceovers for all scenes in a video production."""

    def __init__(self, timeout_minutes: int = 30):
        self.timeout_seconds = timeout_minutes * 60
        self.skill = VoiceoverSkill()

    async def run_async(self, production_id: str, config: VideoProductionConfig,
                       scenes: list[dict], callback=None) -> dict:
        """
        Generate voiceover for all scenes.
        Each scene dict: {scene_id, narration_text}
        """
        log_info("VoiceoverAgent", f"Starting voiceover generation for {len(scenes)} scenes")

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
            log_error("VoiceoverAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error)
            return {"status": "timeout", "production_id": production_id}

        except Exception as e:
            log_error("VoiceoverAgent", "ExecutionError", str(e))
            if callback:
                callback(status="error", error=str(e))
            return {"status": "error", "production_id": production_id, "error": str(e)}

    async def _execute(self, production_id: str, config: VideoProductionConfig,
                       scenes: list[dict]) -> dict:
        """Generate voiceovers in sequence (not parallelized due to ElevenLabs rate limits)."""

        voiceovers = []
        failed_scenes = []

        for scene in scenes:
            scene_id = scene.get("scene_id")
            narration_text = scene.get("narration_text", "")

            if not narration_text:
                log_error("VoiceoverAgent", "MissingNarration", f"Scene {scene_id} has no narration")
                failed_scenes.append(scene_id)
                continue

            # Call skill (synchronous)
            vo_result = self.skill.call(scene_id, narration_text, config)

            if vo_result:
                voiceovers.append(vo_result.model_dump())
            else:
                failed_scenes.append(scene_id)

            # Small delay to avoid rate limiting
            await asyncio.sleep(1)

        # Save state
        state_dir = VIDEO_PRODUCTION_DIR / production_id
        state_dir.mkdir(parents=True, exist_ok=True)
        voiceover_state = {
            "production_id": production_id,
            "total_scenes": len(scenes),
            "completed": len(voiceovers),
            "failed": len(failed_scenes),
            "voiceovers": voiceovers,
            "failed_scenes": failed_scenes
        }
        (state_dir / "voiceover_state.json").write_text(
            json.dumps(voiceover_state, indent=2),
            encoding="utf-8"
        )

        log_decision(
            "VoiceoverAgent", "voiceover_generation_complete", "success",
            f"{len(voiceovers)}/{len(scenes)} scenes completed, {len(failed_scenes)} failed",
            rationale="Voiceover files saved; ready for animation"
        )

        return {
            "status": "success",
            "production_id": production_id,
            "voiceovers": voiceovers,
            "total_scenes": len(scenes),
            "completed_scenes": len(voiceovers),
            "failed_scenes": failed_scenes
        }
