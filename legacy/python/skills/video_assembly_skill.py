import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas import SceneVoiceover, AnimationResult
from logger import log_info, log_error, log_decision


class VideoAssemblySkill:
    """Build JSON composition for JSON2Video API or ffmpeg assembly."""

    def call(self, video_number: int, voiceovers: list[SceneVoiceover],
             animations: list[AnimationResult], music_path: str | None = None) -> dict | None:
        """Create a video composition from component files."""

        log_info("VideoAssemblySkill", f"Building composition for video {video_number}")

        try:
            # Build timeline: animations with voiceover and music
            timeline = []
            current_time = 0

            # Add music track (if provided)
            if music_path:
                timeline.append({
                    "type": "audio",
                    "asset": music_path,
                    "start": 0,
                    "duration": voiceovers[-1].duration_seconds + 5 if voiceovers else 300,
                    "volume": 0.3  # background music level
                })

            # Add video + voiceover pairs
            for i, (vo, anim) in enumerate(zip(voiceovers, animations)):
                # Animation video
                timeline.append({
                    "type": "video",
                    "asset": anim.video_path,
                    "start": current_time,
                    "duration": anim.duration_seconds
                })

                # Voiceover audio (duck music behind it)
                timeline.append({
                    "type": "audio",
                    "asset": vo.audio_path,
                    "start": current_time,
                    "duration": vo.duration_seconds,
                    "volume": 1.0,  # voiceover at full volume
                    "sidechain_target": 0  # ducks music track (track 0)
                })

                current_time += max(anim.duration_seconds, vo.duration_seconds)

            # Build JSON2Video composition
            composition = {
                "timeline": timeline,
                "output": {
                    "resolution": "1920x1080",
                    "frame_rate": 30,
                    "codec": "h264",
                    "format": "mp4"
                },
                "metadata": {
                    "title": f"Systems Evaluations - Video {video_number}",
                    "video_number": video_number
                }
            }

            estimated_duration = current_time

            log_decision(
                "VideoAssemblySkill", "composition_created", "success",
                f"Video {video_number}: ~{estimated_duration:.0f}s, {len(timeline)} timeline items",
                rationale="JSON composition ready for JSON2Video API"
            )

            return {
                "composition": composition,
                "timeline_items": len(timeline),
                "estimated_duration_seconds": estimated_duration,
                "video_number": video_number
            }

        except Exception as e:
            log_error("VideoAssemblySkill", "CompositionError", str(e), action_taken="returning None")
            return None
