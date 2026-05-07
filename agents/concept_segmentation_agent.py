import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import Segment
from config import MODEL_OPUS, DRAFTS_DIR
from logger import log_info, log_error, log_decision


SYSTEM_PROMPT = """You are ConceptSegmentationAgent — the second step of the Observe pipeline.

Given a session transcript with speaker segments, identify and label every segment.

Output a JSON array of Segment objects. Each must include:
- start_time: HH:MM:SS string
- end_time: HH:MM:SS string
- label: must_keep | optional | remove
- concept: short concept name this segment covers (e.g. "gradient_descent")
- speaker: speaker label (e.g. "Instructor", "Learner")
- rationale: one sentence explaining why this label was assigned

Label logic:
- must_keep: core concept explanation, key misconception correction, worked example walkthrough
- optional: useful elaboration, Q&A that adds context but is not essential
- remove: admin announcements, dead time, off-topic discussion, repetition of already-labelled content

Ensure must_keep segments collectively cover all key concepts.
Output ONLY valid JSON — no prose, no markdown fences.
"""


class ConceptSegmentationAgent:
    def __init__(self, timeout_minutes: int = 30):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS
        self.timeout_seconds = timeout_minutes * 60

    async def run_async(self, session_id: str, transcript: str, speaker_segments: list[dict], callback=None) -> dict:
        log_info("ConceptSegmentationAgent", f"Segmenting session {session_id}")

        try:
            result = await asyncio.wait_for(
                self._execute(session_id, transcript, speaker_segments),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result, session_id=session_id)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("ConceptSegmentationAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error, session_id=session_id)
            return {"status": "timeout", "session_id": session_id}

        except Exception as e:
            log_error("ConceptSegmentationAgent", "SegmentationError", str(e))
            if callback:
                callback(status="error", error=str(e), session_id=session_id)
            return {"status": "error", "session_id": session_id, "error": str(e)}

    async def _execute(self, session_id: str, transcript: str, speaker_segments: list[dict]) -> dict:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=8096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": json.dumps({
                "session_id": session_id,
                "transcript": transcript[:8000],
                "speaker_segments": speaker_segments[:100]
            })}]
        )

        data = json.loads(response.content[0].text)
        segments = [Segment(**item) for item in data]

        must_keep = [s for s in segments if s.label == "must_keep"]
        optional  = [s for s in segments if s.label == "optional"]
        remove    = [s for s in segments if s.label == "remove"]

        # Persist
        session_dir = DRAFTS_DIR / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        segments_path = session_dir / "segments.json"
        segments_path.write_text(
            json.dumps([s.model_dump() for s in segments], indent=2),
            encoding="utf-8"
        )

        log_decision(
            "ConceptSegmentationAgent", "segmentation_complete", "success",
            f"Session {session_id}: {len(must_keep)} must_keep, {len(optional)} optional, {len(remove)} remove",
            rationale="All segments labelled; must_keep covers core concepts"
        )

        return {
            "status": "success",
            "session_id": session_id,
            "segments_path": str(segments_path),
            "must_keep": [s.model_dump() for s in must_keep],
            "optional": [s.model_dump() for s in optional],
            "remove": [s.model_dump() for s in remove],
            "concepts": list({s.concept for s in must_keep})
        }
