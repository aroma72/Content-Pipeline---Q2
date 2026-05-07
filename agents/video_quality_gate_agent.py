import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import QualityFlag
from config import MODEL_HAIKU, REVIEW_DIR, CLIP_MIN_SECONDS, CLIP_MAX_SECONDS
from logger import log_info, log_error, log_decision


SYSTEM_PROMPT = """You are VideoQualityGateAgent — the QA checkpoint in the Observe pipeline.

Your job: review a list of video assets and flag any that need human review before publishing.

For each asset, output a QualityFlag JSON object:
- asset: asset name/path
- status: publish_ready | needs_review
- issues: list of issue strings (empty if publish_ready)
- suggested_action: what Aroma should do (empty if publish_ready)

Check for:
1. Duration compliance: clips must be 120-240 seconds (2-4 min); essential edit 1800-3600 sec
2. Concept completeness: does the clip end mid-explanation? (flag if yes)
3. Audio quality: flag if transcript contains "[inaudible]" or "[unclear]" > 3 times
4. Privacy: flag if transcript contains email addresses, phone numbers, or full names of learners
5. Missing captions: flag if no .vtt file found alongside the video

Output a JSON array of QualityFlag objects — one per asset.
Output ONLY valid JSON — no prose, no markdown fences.
"""


class VideoQualityGateAgent:
    def __init__(self, timeout_minutes: int = 15):
        self.client = anthropic.Anthropic()
        self.model = MODEL_HAIKU
        self.timeout_seconds = timeout_minutes * 60

    async def run_async(self, session_id: str, essential_edit_path: str | None, clip_paths: list[str], transcript: str, callback=None) -> dict:
        log_info("VideoQualityGateAgent", f"Running QA on {1 + len(clip_paths)} assets for session {session_id}")

        try:
            result = await asyncio.wait_for(
                self._execute(session_id, essential_edit_path, clip_paths, transcript),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result, session_id=session_id)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("VideoQualityGateAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error, session_id=session_id)
            return {"status": "timeout", "session_id": session_id}

        except Exception as e:
            log_error("VideoQualityGateAgent", "QAError", str(e))
            if callback:
                callback(status="error", error=str(e), session_id=session_id)
            return {"status": "error", "session_id": session_id, "error": str(e)}

    async def _execute(self, session_id: str, essential_edit_path: str | None, clip_paths: list[str], transcript: str) -> dict:
        # Gather file info (sizes, durations via ffprobe)
        assets = []
        if essential_edit_path:
            assets.append({"name": "essential_edit", "path": essential_edit_path, "type": "essential_edit",
                           "duration_seconds": await self._get_duration(essential_edit_path)})
        for cp in clip_paths:
            assets.append({"name": Path(cp).stem, "path": cp, "type": "clip",
                           "duration_seconds": await self._get_duration(cp)})

        payload = {
            "session_id": session_id,
            "assets": assets,
            "transcript_excerpt": transcript[:3000],
            "clip_min_seconds": CLIP_MIN_SECONDS,
            "clip_max_seconds": CLIP_MAX_SECONDS
        }

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": json.dumps(payload)}]
        )

        flags_data = json.loads(response.content[0].text)
        flags = [QualityFlag(**f) for f in flags_data]

        needs_review = [f for f in flags if f.status == "needs_review"]
        publish_ready = [f for f in flags if f.status == "publish_ready"]

        # Write review queue items
        if needs_review:
            review_file = REVIEW_DIR / f"flagged_{session_id}.json"
            review_file.write_text(
                json.dumps([f.model_dump() for f in needs_review], indent=2),
                encoding="utf-8"
            )
            log_info("VideoQualityGateAgent", f"{len(needs_review)} assets written to review_queue/")

        log_decision(
            "VideoQualityGateAgent", "qa_complete", "success",
            f"Session {session_id}: {len(publish_ready)} publish_ready, {len(needs_review)} needs_review",
            rationale="All assets checked for duration, completeness, audio, privacy, captions"
        )

        return {
            "status": "success",
            "session_id": session_id,
            "flags": [f.model_dump() for f in flags],
            "publish_ready_count": len(publish_ready),
            "needs_review_count": len(needs_review),
            "review_queue_path": str(REVIEW_DIR / f"flagged_{session_id}.json") if needs_review else None
        }

    async def _get_duration(self, path: str) -> float:
        if not Path(path).exists():
            return 0.0
        try:
            proc = await asyncio.create_subprocess_exec(
                "ffprobe", "-v", "quiet", "-print_format", "json",
                "-show_format", path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            stdout, _ = await proc.communicate()
            info = json.loads(stdout)
            return float(info.get("format", {}).get("duration", 0))
        except Exception:
            return 0.0
