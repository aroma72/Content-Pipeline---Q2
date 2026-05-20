import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from schemas import Segment
from config import MODEL_OPUS, DRAFTS_DIR, PROMPTS_DIR
from logger import log_info, log_error, log_decision
from agents.error_types import AgentError, ErrorType


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are ConceptSegmentationAgent — the second step of the Observe pipeline.

Given a session transcript with speaker segments, identify and label every segment using the segment_transcript tool.

Labeling rules:
- must_keep: core concept explanation, key misconception correction, worked example walkthrough
- optional: useful elaboration, Q&A that adds context but is not essential
- remove: admin announcements, dead time, off-topic discussion, repetition

Ensure must_keep segments collectively cover all key concepts."""


SEGMENTATION_TOOL = {
    "name": "segment_transcript",
    "description": "Segment and label transcript segments",
    "input_schema": {
        "type": "object",
        "properties": {
            "segments": {
                "type": "array",
                "description": "List of labeled segments",
                "items": {
                    "type": "object",
                    "properties": {
                        "start_time": {
                            "type": "string",
                            "pattern": "^\\d{1,2}:\\d{2}:\\d{2}$",
                            "description": "Start time HH:MM:SS"
                        },
                        "end_time": {
                            "type": "string",
                            "pattern": "^\\d{1,2}:\\d{2}:\\d{2}$",
                            "description": "End time HH:MM:SS"
                        },
                        "label": {
                            "type": "string",
                            "enum": ["must_keep", "optional", "remove"],
                            "description": "Segment importance label"
                        },
                        "concept": {
                            "type": "string",
                            "description": "Key concept covered in segment"
                        },
                        "speaker": {
                            "type": "string",
                            "description": "Speaker label"
                        },
                        "rationale": {
                            "type": "string",
                            "description": "One sentence explaining the label"
                        }
                    },
                    "required": ["start_time", "end_time", "label", "concept", "speaker", "rationale"]
                }
            }
        },
        "required": ["segments"]
    }
}


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
        system_prompt = _load_prompt("concept_segmentation")
        response = self.client.messages.create(
            model=self.model,
            max_tokens=8096,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"}
                }
            ],
            tools=[SEGMENTATION_TOOL],
            tool_choice="auto",
            messages=[{
                "role": "user",
                "content": f"""Segment and label this transcript:

Transcript:
{transcript[:8000]}

Speaker segments:
{json.dumps(speaker_segments[:100], indent=2)}

Use the segment_transcript tool to provide structured segmentation."""
            }]
        )

        # Extract tool use result
        segments_data = []
        for block in response.content:
            if block.type == "tool_use":
                segments_data = block.input.get("segments", [])
                break

        if not segments_data:
            log_error("ConceptSegmentationAgent", "NoToolUse",
                     "Claude did not use the segmentation tool",
                     action_taken="returning empty segments")
            segments = []
        else:
            segments = [Segment(**item) for item in segments_data]

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
