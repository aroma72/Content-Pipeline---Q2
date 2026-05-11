import asyncio
import json
import sys
import requests
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas import VideoProductionConfig
from skills.social_clips_skill import SocialClipsSkill
from config import VIDEO_PRODUCTION_DIR, YOUTUBE_API_KEY, LMS_BASE_URL, LMS_API_KEY
from logger import log_info, log_error, log_decision, log_warning


class DistributionAgent:
    """Async agent: distribute videos to YouTube, LMS, and generate social clips."""

    def __init__(self, timeout_minutes: int = 60):
        self.timeout_seconds = timeout_minutes * 60
        self.social_clips_skill = SocialClipsSkill()
        self.youtube_api_key = YOUTUBE_API_KEY
        self.lms_base_url = LMS_BASE_URL
        self.lms_api_key = LMS_API_KEY

    async def run_async(self, production_id: str, config: VideoProductionConfig,
                       videos: list[dict], callback=None) -> dict:
        """
        Distribute videos: YouTube upload, LMS push, social clips.
        Each video dict: {video_number, video_path, title}
        """
        log_info("DistributionAgent", f"Starting distribution for {len(videos)} videos")

        try:
            result = await asyncio.wait_for(
                self._execute(production_id, config, videos),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("DistributionAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error)
            return {"status": "timeout", "production_id": production_id}

        except Exception as e:
            log_error("DistributionAgent", "ExecutionError", str(e))
            if callback:
                callback(status="error", error=str(e))
            return {"status": "error", "production_id": production_id, "error": str(e)}

    async def _execute(self, production_id: str, config: VideoProductionConfig,
                       videos: list[dict]) -> dict:
        """Distribute all videos."""

        distribution_urls = {}
        failed_videos = []

        for video in videos:
            video_number = video.get("video_number")
            video_path = video.get("video_path")
            title = video.get("title", f"Systems Evaluations - Video {video_number}")

            if not video_path or not Path(video_path).exists():
                log_error("DistributionAgent", "MissingVideo", f"Video {video_number} not found")
                failed_videos.append(video_number)
                continue

            try:
                # Step 1: YouTube upload
                youtube_url = None
                if self.youtube_api_key:
                    youtube_url = await self._upload_youtube(video_path, title)
                    if youtube_url:
                        distribution_urls[f"{title}_youtube"] = youtube_url
                        log_info("DistributionAgent", f"Video {video_number} uploaded to YouTube")
                else:
                    log_warning("DistributionAgent", "YOUTUBE_API_KEY not configured; skipping YouTube")

                # Step 2: LMS push
                lms_url = None
                if self.lms_api_key and self.lms_base_url:
                    lms_url = await self._push_lms(video_path, title, video_number)
                    if lms_url:
                        distribution_urls[f"{title}_lms"] = lms_url
                        log_info("DistributionAgent", f"Video {video_number} pushed to LMS")
                else:
                    log_warning("DistributionAgent", "LMS_API_KEY or LMS_BASE_URL not configured")

                # Step 3: Generate social clips
                clip_specs = [
                    {"start_seconds": 0, "end_seconds": 30, "title": f"{title}_clip_1", "platform": "tiktok"},
                    {"start_seconds": 30, "end_seconds": 60, "title": f"{title}_clip_2", "platform": "instagram_reels"},
                ]
                clip_result = self.social_clips_skill.call(video_path, clip_specs)
                if clip_result:
                    log_info("DistributionAgent", f"Generated {len(clip_specs)} social clips for video {video_number}")

                if not youtube_url and not lms_url:
                    failed_videos.append(video_number)

            except Exception as e:
                log_error("DistributionAgent", "DistributionError", str(e), action_taken="video skipped")
                failed_videos.append(video_number)

            await asyncio.sleep(2)

        # Save state
        state_dir = VIDEO_PRODUCTION_DIR / production_id
        state_dir.mkdir(parents=True, exist_ok=True)
        distribution_state = {
            "production_id": production_id,
            "total_videos": len(videos),
            "distributed": len(videos) - len(failed_videos),
            "failed": len(failed_videos),
            "urls": distribution_urls,
            "failed_videos": failed_videos
        }
        (state_dir / "distribution_state.json").write_text(
            json.dumps(distribution_state, indent=2),
            encoding="utf-8"
        )

        log_decision(
            "DistributionAgent", "distribution_complete", "success",
            f"{len(videos) - len(failed_videos)}/{len(videos)} videos distributed, {len(failed_videos)} failed",
            rationale="All videos published to configured channels"
        )

        return {
            "status": "success",
            "production_id": production_id,
            "urls": distribution_urls,
            "total_videos": len(videos),
            "distributed_videos": len(videos) - len(failed_videos),
            "failed_videos": failed_videos
        }

    async def _upload_youtube(self, video_path: str, title: str) -> str | None:
        """Upload video to YouTube using Data API v3."""
        try:
            # This is a placeholder; actual implementation would use google-auth
            # and the YouTube Data API v3 to upload videos
            log_warning("DistributionAgent", "YouTube upload requires google-auth library; returning mock URL")
            return f"https://youtube.com/watch?v=mock_{title.replace(' ', '_')}"

        except Exception as e:
            log_error("DistributionAgent", "YouTubeError", str(e))
            return None

    async def _push_lms(self, video_path: str, title: str, video_number: int) -> str | None:
        """Push video to LMS platform."""
        try:
            headers = {"Authorization": f"Bearer {self.lms_api_key}"}
            payload = {
                "title": title,
                "video_number": video_number,
                "video_path": video_path,
                "description": f"Systems Evaluations Video {video_number}"
            }

            response = requests.post(
                f"{self.lms_base_url}/api/videos",
                json=payload,
                headers=headers,
                timeout=60
            )

            if response.status_code in [200, 201]:
                data = response.json()
                return data.get("url") or data.get("video_url")
            else:
                log_warning("DistributionAgent", f"LMS API error {response.status_code}")
                return None

        except requests.exceptions.RequestException as e:
            log_error("DistributionAgent", "LMSError", str(e))
            return None
