import asyncio
import json
import subprocess
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from config import MODEL_OPUS, DRAFTS_DIR, PROMPTS_DIR
from logger import log_info, log_error, log_decision
from agents.error_types import AgentError, ErrorType


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are EssentialEditAgent — the third step of the Observe pipeline.

Given must_keep and optional segments, create an edit timeline for the essential session video.

Use the generate_edit_timeline tool to provide structured output with:
- edit segments (all must_keep segments included)
- chapter markers at conceptual boundaries
- estimated duration
- editorial notes about tricky edits

Rules:
- Include ALL must_keep segments
- Include optional only if they add essential context
- Target duration: 30-60 minutes for a 2-hour session
- Use fade transitions between major chapters; cut within continuous explanations"""


EDIT_TIMELINE_TOOL = {
    "name": "generate_edit_timeline",
    "description": "Generate edit timeline for essential edit video",
    "input_schema": {
        "type": "object",
        "properties": {
            "edit_timeline": {
                "type": "array",
                "description": "List of segments to include",
                "items": {
                    "type": "object",
                    "properties": {
                        "start_time": {"type": "string", "pattern": "^\\d{1,2}:\\d{2}:\\d{2}(\\.\\d+)?$"},
                        "end_time": {"type": "string", "pattern": "^\\d{1,2}:\\d{2}:\\d{2}(\\.\\d+)?$"},
                        "chapter_title": {"type": "string"},
                        "transition": {"type": "string", "enum": ["fade", "cut"]}
                    },
                    "required": ["start_time", "end_time", "chapter_title", "transition"]
                }
            },
            "chapter_markers": {
                "type": "array",
                "description": "Chapter markers at conceptual boundaries",
                "items": {
                    "type": "object",
                    "properties": {
                        "time": {"type": "string"},
                        "title": {"type": "string"}
                    }
                }
            },
            "estimated_duration_minutes": {
                "type": "integer",
                "minimum": 15,
                "maximum": 120,
                "description": "Estimated duration of final edit in minutes"
            },
            "editorial_notes": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Notes about tricky edits or decisions"
            }
        },
        "required": ["edit_timeline", "chapter_markers", "estimated_duration_minutes", "editorial_notes"]
    }
}


class EssentialEditAgent:
    def __init__(self, timeout_minutes: int = 120):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS
        self.timeout_seconds = timeout_minutes * 60

    async def run_async(self, session_id: str, must_keep: list[dict], optional: list[dict], recording_path: str, callback=None) -> dict:
        log_info("EssentialEditAgent", f"Building essential edit for session {session_id}")

        try:
            result = await asyncio.wait_for(
                self._execute(session_id, must_keep, optional, recording_path),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result, session_id=session_id)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("EssentialEditAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error, session_id=session_id)
            return {"status": "timeout", "session_id": session_id}

        except Exception as e:
            log_error("EssentialEditAgent", "EditError", str(e))
            if callback:
                callback(status="error", error=str(e), session_id=session_id)
            return {"status": "error", "session_id": session_id, "error": str(e)}

    async def _execute(self, session_id: str, must_keep: list[dict], optional: list[dict], recording_path: str) -> dict:
        # Step 1: Claude decides the edit timeline using tool
        system_prompt = _load_prompt("essential_edit")
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_prompt,
            tools=[EDIT_TIMELINE_TOOL],
            tool_choice="auto",
            messages=[{
                "role": "user",
                "content": f"""Edit planning for session {session_id}:

Must-keep segments:
{json.dumps(must_keep, indent=2)}

Optional segments:
{json.dumps(optional, indent=2)}

Use the generate_edit_timeline tool to create the edit plan."""
            }]
        )

        # Extract tool use result
        plan = None
        for block in response.content:
            if block.type == "tool_use":
                plan = block.input
                break

        if not plan:
            log_error("EssentialEditAgent", "NoToolUse",
                     "Claude did not use the timeline tool",
                     action_taken="skipping essential edit")
            return {"status": "error", "session_id": session_id, "error": "No edit timeline generated"}

        session_dir = DRAFTS_DIR / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        timeline_path = session_dir / "edit_timeline.json"
        timeline_path.write_text(json.dumps(plan, indent=2), encoding="utf-8")

        # Step 2: Execute with ffmpeg
        output_path = session_dir / "essential_edit_draft.mp4"
        await self._cut_and_join(recording_path, plan["edit_timeline"], str(output_path))

        log_decision(
            "EssentialEditAgent", "essential_edit_complete", "success",
            f"Session {session_id}: ~{plan.get('estimated_duration_minutes', '?')} min edit, "
            f"{len(plan.get('chapter_markers', []))} chapters",
            rationale="All must_keep segments included; edit timeline validated"
        )

        return {
            "status": "success",
            "session_id": session_id,
            "essential_edit_path": str(output_path),
            "timeline_path": str(timeline_path),
            "chapter_markers": plan.get("chapter_markers", []),
            "estimated_duration_minutes": plan.get("estimated_duration_minutes")
        }

    async def _cut_and_join(self, source: str, timeline: list[dict], output: str):
        """Use ffmpeg concat demuxer to assemble segments."""
        session_dir = Path(output).parent
        filter_parts = []

        for i, seg in enumerate(timeline):
            start = self._to_seconds(seg["start_time"])
            end   = self._to_seconds(seg["end_time"])
            filter_parts.append(
                f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}];"
                f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{i}];"
            )

        n = len(filter_parts)
        concat_v = "".join(f"[v{i}]" for i in range(n))
        concat_a = "".join(f"[a{i}]" for i in range(n))
        filter_complex = "".join(filter_parts) + f"{concat_v}{concat_a}concat=n={n}:v=1:a=1[vout][aout]"

        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-i", source,
            "-filter_complex", filter_complex,
            "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-c:a", "aac", "-y", output,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        await proc.communicate()

    @staticmethod
    def _to_seconds(ts: str) -> float:
        parts = ts.split(":")
        h, m, s = int(parts[0]), int(parts[1]), float(parts[2])
        return h * 3600 + m * 60 + s
