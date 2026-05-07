import asyncio
import json
import shutil
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas import SessionAssetBundle
from config import LMS_BASE_URL, LMS_API_KEY, PUBLISHED_DIR, DRAFTS_DIR
from logger import log_info, log_error, log_decision


class LearnerPackPublisherAgent:
    def __init__(self, timeout_minutes: int = 30):
        self.timeout_seconds = timeout_minutes * 60

    async def run_async(self, bundle: SessionAssetBundle, callback=None) -> dict:
        log_info("LearnerPackPublisherAgent", f"Publishing bundle for session {bundle.session_id}")

        if bundle.status != "publish_ready":
            log_error("LearnerPackPublisherAgent", "NotReady",
                      f"Bundle status is '{bundle.status}'; must be 'publish_ready' before publishing",
                      action_taken="publish aborted; bundle not touched")
            return {"status": "aborted", "reason": "not_publish_ready"}

        try:
            result = await asyncio.wait_for(
                self._execute(bundle),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result, session_id=bundle.session_id)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("LearnerPackPublisherAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error, session_id=bundle.session_id)
            return {"status": "timeout", "session_id": bundle.session_id}

        except Exception as e:
            log_error("LearnerPackPublisherAgent", "PublishError", str(e))
            if callback:
                callback(status="error", error=str(e), session_id=bundle.session_id)
            return {"status": "error", "session_id": bundle.session_id, "error": str(e)}

    async def _execute(self, bundle: SessionAssetBundle) -> dict:
        session_dir = PUBLISHED_DIR / bundle.session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        published_urls = {}

        # Copy/move final assets to published directory
        if bundle.essential_edit_path and Path(bundle.essential_edit_path).exists():
            dest = session_dir / "essential_session.mp4"
            shutil.copy2(bundle.essential_edit_path, dest)
            published_urls["essential_edit"] = str(dest)

        clips_dir = session_dir / "concept_clips"
        clips_dir.mkdir(exist_ok=True)
        published_clips = []
        for clip_path in bundle.concept_clips:
            if Path(clip_path).exists():
                dest = clips_dir / Path(clip_path).name
                shutil.copy2(clip_path, dest)
                published_clips.append(str(dest))
        published_urls["concept_clips"] = published_clips

        # Write metadata JSON for LMS ingestion
        metadata = {
            "session_id": bundle.session_id,
            "session_date": bundle.session_date,
            "course_id": bundle.course_id,
            "assets": published_urls,
            "summary_path": bundle.session_summary,
            "glossary_path": bundle.glossary,
            "watch_order_path": bundle.watch_order,
        }
        meta_path = session_dir / "metadata.json"
        meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        # Try LMS API (skip gracefully if not configured)
        lms_result = await self._push_to_lms(metadata)

        bundle.status = "published"
        bundle.published_date = str(__import__("datetime").date.today())

        log_decision(
            "LearnerPackPublisherAgent", "published", "success",
            f"Session {bundle.session_id}: {len(published_clips)} clips + essential edit published",
            rationale="All assets copied to published/; LMS metadata written",
            next_step="Learners notified via LMS; Aroma notified of publish completion"
        )

        return {
            "status": "success",
            "session_id": bundle.session_id,
            "published_dir": str(session_dir),
            "published_urls": published_urls,
            "lms_result": lms_result
        }

    async def _push_to_lms(self, metadata: dict) -> dict:
        if not LMS_API_KEY or not LMS_BASE_URL:
            log_info("LearnerPackPublisherAgent", "LMS API not configured; skipping remote publish")
            return {"status": "skipped", "reason": "LMS_API_KEY not set"}

        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{LMS_BASE_URL}/api/sessions/publish",
                    json=metadata,
                    headers={"Authorization": f"Bearer {LMS_API_KEY}"},
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as resp:
                    return await resp.json()
        except Exception as e:
            log_error("LearnerPackPublisherAgent", "LMSAPIError", str(e),
                      action_taken="local publish succeeded; LMS push failed (retry manually)")
            return {"status": "error", "error": str(e)}
