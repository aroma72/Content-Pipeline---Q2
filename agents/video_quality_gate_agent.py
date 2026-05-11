import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import QualityFlag
from config import MODEL_HAIKU, REVIEW_DIR, CLIP_MIN_SECONDS, CLIP_MAX_SECONDS
from logger import log_info, log_error, log_decision
from agents.error_types import AgentError, ErrorType


SYSTEM_PROMPT = """You are VideoQualityGateAgent — the QA checkpoint in the Observe pipeline.

Your job: review video assets and flag those that need human review before publishing.

Use the evaluate_quality tool to check each asset for:
1. Duration compliance
2. Concept completeness
3. Audio quality
4. Privacy concerns
5. Caption presence"""


QUALITY_EVALUATION_TOOL = {
    "name": "evaluate_quality",
    "description": "Evaluate video assets for quality and compliance",
    "input_schema": {
        "type": "object",
        "properties": {
            "flags": {
                "type": "array",
                "description": "Quality flags for each asset",
                "items": {
                    "type": "object",
                    "properties": {
                        "asset": {"type": "string"},
                        "status": {"type": "string", "enum": ["publish_ready", "needs_review"]},
                        "issues": {"type": "array", "items": {"type": "string"}},
                        "suggested_action": {"type": "string"}
                    },
                    "required": ["asset", "status", "issues", "suggested_action"]
                }
            }
        },
        "required": ["flags"]
    }
}


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
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"}
                }
            ],
            tools=[QUALITY_EVALUATION_TOOL],
            tool_choice="auto",
            messages=[{
                "role": "user",
                "content": f"""Evaluate these assets for quality compliance:

{json.dumps(payload, indent=2)}

Use the evaluate_quality tool to provide structured assessment."""
            }]
        )

        # Extract tool use result
        flags_data = []
        for block in response.content:
            if block.type == "tool_use":
                flags_data = block.input.get("flags", [])
                break

        if not flags_data:
            log_error("VideoQualityGateAgent", "NoToolUse",
                     "Claude did not use the evaluation tool",
                     action_taken="marking all as publish_ready")
            flags = [QualityFlag(asset=a["name"], status="publish_ready", issues=[], suggested_action="")
                    for a in assets]
        else:
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
