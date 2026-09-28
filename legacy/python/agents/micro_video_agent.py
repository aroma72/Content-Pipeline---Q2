import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from config import MODEL_OPUS, DRAFTS_DIR, CLIP_MIN_SECONDS, CLIP_MAX_SECONDS, PROMPTS_DIR
from logger import log_info, log_error, log_decision


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are MicroVideoAgent — the fourth step of the Observe pipeline.

Given a list of must_keep segments, plan a set of 2-4 minute concept clips.

Output a JSON array of clip plans. Each must include:
- clip_id: short slug (e.g. "clip_01_gradient_descent")
- concept: concept name
- title: short learner-facing title (max 8 words)
- description: 1-sentence clip description for the platform
- segments: list of segment objects to include (from must_keep input)
- estimated_duration_seconds: integer (120-240)
- subtitle_language: "en"

Rules:
- One concept per clip; do not mix unrelated concepts in one clip
- Clips must be self-contained (learner can watch in any order)
- If a concept has multiple must_keep segments, merge them into one clip
- Duration must be 120-240 seconds; if segments exceed 240s, keep only the clearest explanation
- Output ONLY valid JSON — no prose, no markdown fences
"""


class MicroVideoAgent:
    def __init__(self, timeout_minutes: int = 90):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS
        self.timeout_seconds = timeout_minutes * 60

    async def run_async(self, session_id: str, must_keep: list[dict], recording_path: str, callback=None) -> dict:
        log_info("MicroVideoAgent", f"Planning {len(must_keep)} must_keep segments → concept clips for session {session_id}")

        try:
            result = await asyncio.wait_for(
                self._execute(session_id, must_keep, recording_path),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result, session_id=session_id)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("MicroVideoAgent", "Timeout", error)
            if callback:
                callback(status="timeout", error=error, session_id=session_id)
            return {"status": "timeout", "session_id": session_id}

        except Exception as e:
            log_error("MicroVideoAgent", "ClipError", str(e))
            if callback:
                callback(status="error", error=str(e), session_id=session_id)
            return {"status": "error", "session_id": session_id, "error": str(e)}

    async def _execute(self, session_id: str, must_keep: list[dict], recording_path: str) -> dict:
        # Step 1: Claude plans the clips
        system_prompt = _load_prompt("micro_video")
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": json.dumps({
                "session_id": session_id,
                "must_keep_segments": must_keep,
                "clip_min_seconds": CLIP_MIN_SECONDS,
                "clip_max_seconds": CLIP_MAX_SECONDS
            })}]
        )

        clip_plans = json.loads(response.content[0].text)
        clips_dir = DRAFTS_DIR / session_id / "clips"
        clips_dir.mkdir(parents=True, exist_ok=True)

        # Step 2: Cut each clip in parallel with ffmpeg
        cut_tasks = [
            self._cut_clip(recording_path, plan, clips_dir)
            for plan in clip_plans
        ]
        clip_paths = await asyncio.gather(*cut_tasks)

        # Persist clip metadata
        meta_path = DRAFTS_DIR / session_id / "clips_metadata.json"
        meta = [
            {**plan, "output_path": str(path)}
            for plan, path in zip(clip_plans, clip_paths)
        ]
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

        valid_clips = [str(p) for p in clip_paths if p is not None]

        log_decision(
            "MicroVideoAgent", "clips_complete", "success",
            f"Session {session_id}: {len(valid_clips)}/{len(clip_plans)} clips produced",
            rationale="Clips cut in parallel; each covers one concept"
        )

        return {
            "status": "success",
            "session_id": session_id,
            "clips": valid_clips,
            "clip_plans": meta
        }

    async def _cut_clip(self, source: str, plan: dict, clips_dir: Path) -> Path | None:
        clip_id   = plan["clip_id"]
        output    = clips_dir / f"{clip_id}.mp4"
        segments  = plan.get("segments", [])

        if not segments:
            log_error("MicroVideoAgent", "EmptyClip", f"{clip_id} has no segments", resolved=False)
            return None

        start = self._to_seconds(segments[0]["start_time"])
        end   = self._to_seconds(segments[-1]["end_time"])
        duration = end - start

        # Clamp to max duration
        if duration > CLIP_MAX_SECONDS:
            end = start + CLIP_MAX_SECONDS

        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-ss", str(start), "-i", source,
            "-t", str(end - start),
            "-c:v", "libx264", "-c:a", "aac",
            "-vf", f"drawtext=text='{plan.get('title', '')}':fontsize=24:fontcolor=white:x=20:y=20",
            "-y", str(output),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        await proc.communicate()
        return output if output.exists() else None

    @staticmethod
    def _to_seconds(ts: str) -> float:
        parts = ts.split(":")
        h, m, s = int(parts[0]), int(parts[1]), float(parts[2])
        return h * 3600 + m * 60 + s
