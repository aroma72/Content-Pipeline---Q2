import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
from config import VIZARD_API_KEY
from logger import log_info, log_error, log_decision, log_warning


class SocialClipsSkill:
    """Generate short-form clips (TikTok, Instagram Reels) from full videos."""

    def __init__(self):
        self.api_key = VIZARD_API_KEY
        self.base_url = "https://api.vizard.ai/v1"

    def call(self, video_path: str, clip_specs: list[dict]) -> dict | None:
        """Generate short-form clip variants using Vizard API or ffmpeg fallback."""

        if not self.api_key:
            log_warning("SocialClipsSkill", "VIZARD_API_KEY not configured; generating ffmpeg instructions")
            return self._generate_ffmpeg_fallback(video_path, clip_specs)

        log_info("SocialClipsSkill", f"Generating {len(clip_specs)} short-form clips from {video_path}")

        try:
            # Submit clip generation job to Vizard
            headers = {"Authorization": f"Bearer {self.api_key}"}
            payload = {
                "video_url": video_path,  # Assumes video is accessible via URL
                "output_formats": [
                    {"platform": "tiktok", "aspect_ratio": "9:16"},
                    {"platform": "instagram_reels", "aspect_ratio": "9:16"},
                    {"platform": "youtube_shorts", "aspect_ratio": "9:16"}
                ],
                "max_clips": len(clip_specs),
                "clip_titles": [spec.get("title", f"Clip {i+1}") for i, spec in enumerate(clip_specs)]
            }

            response = requests.post(
                f"{self.base_url}/clips/generate",
                json=payload,
                headers=headers,
                timeout=60
            )

            if response.status_code != 200:
                log_warning("SocialClipsSkill",
                           f"Vizard API error {response.status_code}; falling back to ffmpeg")
                return self._generate_ffmpeg_fallback(video_path, clip_specs)

            result_data = response.json()
            job_id = result_data.get("job_id")

            log_decision(
                "SocialClipsSkill", "clips_job_submitted", "processing",
                f"Vizard job {job_id}: {len(clip_specs)} clips, multiple formats",
                rationale="Job submitted for async processing; polling recommended"
            )

            return {
                "status": "submitted",
                "job_id": job_id,
                "clip_count": len(clip_specs),
                "formats": ["tiktok", "instagram_reels", "youtube_shorts"]
            }

        except requests.exceptions.RequestException as e:
            log_warning("SocialClipsSkill", f"Network error; falling back to ffmpeg: {str(e)}")
            return self._generate_ffmpeg_fallback(video_path, clip_specs)
        except Exception as e:
            log_error("SocialClipsSkill", "ClipError", str(e), action_taken="returning ffmpeg fallback")
            return self._generate_ffmpeg_fallback(video_path, clip_specs)

    @staticmethod
    def _generate_ffmpeg_fallback(video_path: str, clip_specs: list[dict]) -> dict:
        """Generate ffmpeg trim commands as fallback (no API call)."""

        log_info("SocialClipsSkill", "Generating ffmpeg clip commands (fallback)")

        commands = []
        output_dir = Path(video_path).parent / "clips"
        output_dir.mkdir(parents=True, exist_ok=True)

        for i, spec in enumerate(clip_specs):
            start = spec.get("start_seconds", 0)
            end = spec.get("end_seconds", 30)
            title = spec.get("title", f"clip_{i+1}")

            # ffmpeg command to trim and reformat for social media
            output_file = output_dir / f"{title}_1080x1920.mp4"
            cmd = (
                f"ffmpeg -i {video_path} -ss {start} -to {end} "
                f"-vf 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2' "
                f"-c:v libx264 -c:a aac {output_file}"
            )
            commands.append({"clip_title": title, "command": cmd})

        log_decision(
            "SocialClipsSkill", "ffmpeg_fallback", "success",
            f"Generated {len(commands)} ffmpeg trim commands",
            rationale="User to run commands locally (no API key available)"
        )

        return {
            "status": "fallback_commands",
            "clip_count": len(commands),
            "ffmpeg_commands": commands,
            "output_directory": str(output_dir),
            "note": "Run these ffmpeg commands to generate clips locally"
        }
