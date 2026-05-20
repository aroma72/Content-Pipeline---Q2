import asyncio
import json
import subprocess
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import anthropic
from config import MODEL_OPUS, DRAFTS_DIR, OPENAI_API_KEY, PROMPTS_DIR
from logger import log_info, log_error, log_decision


def _load_prompt(name: str) -> str:
    prompt_file = PROMPTS_DIR / f"{name}.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt not found: {prompt_file}")
    return prompt_file.read_text(encoding="utf-8")


_SYSTEM_PROMPT_TEXT = """You are RecordingIngestAgent — the first step of the Observe pipeline.

Given a raw transcript text and speaker segments, your job is to:
1. Clean and structure the transcript (fix obvious transcription errors, normalise speaker labels)
2. Return a JSON object with:
   - transcript_text: clean full transcript as a string
   - speaker_segments: list of {speaker, start_time, end_time, text} dicts
   - duration_minutes: total recording duration (float)
   - audio_quality: good | acceptable | poor (based on transcript clarity)
   - quality_notes: string explaining any quality issues

Output ONLY valid JSON — no prose, no markdown fences.
"""


class RecordingIngestAgent:
    def __init__(self, timeout_minutes: int = 90):
        self.client = anthropic.Anthropic()
        self.model = MODEL_OPUS
        self.timeout_seconds = timeout_minutes * 60

    async def run_async(self, session_id: str, recording_path: str, callback=None) -> dict:
        log_info("RecordingIngestAgent", f"Starting ingest for session {session_id}")
        session_dir = DRAFTS_DIR / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        try:
            result = await asyncio.wait_for(
                self._execute(session_id, recording_path, session_dir),
                timeout=self.timeout_seconds
            )
            if callback:
                callback(status="success", result=result, session_id=session_id)
            return result

        except asyncio.TimeoutError:
            error = f"Timeout after {self.timeout_seconds}s"
            log_error("RecordingIngestAgent", "Timeout", error,
                      action_taken="session flagged for manual review")
            if callback:
                callback(status="timeout", error=error, session_id=session_id)
            return {"status": "timeout", "session_id": session_id}

        except Exception as e:
            log_error("RecordingIngestAgent", "IngestError", str(e),
                      action_taken="session flagged for manual review")
            if callback:
                callback(status="error", error=str(e), session_id=session_id)
            return {"status": "error", "session_id": session_id, "error": str(e)}

    async def _execute(self, session_id: str, recording_path: str, session_dir: Path) -> dict:
        # Step 1: extract audio and transcribe with Whisper
        log_info("RecordingIngestAgent", "Extracting audio with ffmpeg")
        audio_path = session_dir / "audio.wav"
        await self._extract_audio(recording_path, str(audio_path))

        log_info("RecordingIngestAgent", "Transcribing with Whisper")
        raw_transcript = await self._whisper_transcribe(str(audio_path))

        # Step 2: structure and clean with Claude
        log_info("RecordingIngestAgent", "Cleaning and structuring transcript with Claude")
        system_prompt = _load_prompt("recording_ingest")
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
            messages=[{"role": "user", "content": json.dumps({
                "session_id": session_id,
                "raw_transcript": raw_transcript
            })}]
        )

        data = json.loads(response.content[0].text)

        # Step 3: persist transcript
        transcript_path = session_dir / "transcript.vtt"
        transcript_path.write_text(data.get("transcript_text", ""), encoding="utf-8")

        segments_path = session_dir / "speaker_segments.json"
        segments_path.write_text(json.dumps(data.get("speaker_segments", []), indent=2), encoding="utf-8")

        data["session_id"] = session_id
        data["transcript_path"] = str(transcript_path)
        data["segments_path"] = str(segments_path)
        data["status"] = "success"

        log_decision(
            "RecordingIngestAgent", "ingest_complete", "success",
            f"Session {session_id}: {data.get('duration_minutes', '?')} min, "
            f"audio quality={data.get('audio_quality', '?')}",
            rationale="Transcript extracted, cleaned, and persisted"
        )
        return data

    async def _extract_audio(self, video_path: str, audio_path: str):
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-i", video_path, "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1", "-y", audio_path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL
        )
        await proc.communicate()

    async def _whisper_transcribe(self, audio_path: str) -> str:
        # Try OpenAI Whisper API first; fall back to a mock for offline dev
        if OPENAI_API_KEY:
            import openai
            openai.api_key = OPENAI_API_KEY
            with open(audio_path, "rb") as f:
                result = openai.audio.transcriptions.create(model="whisper-1", file=f)
            return result.text
        else:
            # Offline / dev: return placeholder
            log_error("RecordingIngestAgent", "NoWhisperKey",
                      "OPENAI_API_KEY not set; using placeholder transcript",
                      action_taken="placeholder used; set OPENAI_API_KEY for production")
            return "[Placeholder transcript — set OPENAI_API_KEY to enable Whisper transcription]"
