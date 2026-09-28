import json
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import requests
from config import ASSEMBLYAI_API_KEY
from logger import log_info, log_error, log_decision, log_warning


class CaptionSkill:
    def __init__(self):
        self.api_key = ASSEMBLYAI_API_KEY
        self.base_url = "https://api.assemblyai.com/v2"
        self.max_retries = 5

    def call(self, audio_path: str) -> dict | None:
        """Generate captions (SRT) from audio using AssemblyAI API."""

        if not self.api_key:
            log_warning("CaptionSkill", f"ASSEMBLYAI_API_KEY not configured; skipping caption generation")
            return None

        log_info("CaptionSkill", f"Generating captions from {audio_path}")

        try:
            # Submit transcription job
            headers = {"Authorization": self.api_key}

            # Upload audio file or use URL
            if audio_path.startswith("http"):
                audio_url = audio_path
            else:
                # For local files, we'd need to upload first; for now assume URL or skip
                log_warning("CaptionSkill", "Local file uploads not yet implemented; use remote URLs")
                return None

            submit_response = requests.post(
                f"{self.base_url}/transcript",
                json={"audio_url": audio_url},
                headers=headers,
                timeout=30
            )

            if submit_response.status_code != 200:
                log_error("CaptionSkill", "SubmitError",
                         f"AssemblyAI returned {submit_response.status_code}: {submit_response.text}",
                         action_taken="skipping captions")
                return None

            transcript_id = submit_response.json()["id"]
            log_info("CaptionSkill", f"Transcription job submitted: {transcript_id}")

            # Poll for completion
            for attempt in range(self.max_retries * 12):  # ~60 second poll max
                status_response = requests.get(
                    f"{self.base_url}/transcript/{transcript_id}",
                    headers=headers,
                    timeout=30
                )

                if status_response.status_code != 200:
                    log_error("CaptionSkill", "StatusError",
                             f"Failed to check status: {status_response.status_code}",
                             action_taken="continuing retry")
                    time.sleep(5)
                    continue

                status_data = status_response.json()
                status = status_data.get("status")

                if status == "completed":
                    # Generate SRT from transcript
                    text = status_data.get("text", "")
                    words = status_data.get("words", [])

                    srt_content = self._generate_srt(words)

                    # Save SRT file
                    output_dir = Path(audio_path).parent
                    srt_path = output_dir / f"{Path(audio_path).stem}.srt"
                    srt_path.write_text(srt_content, encoding="utf-8")

                    confidence = status_data.get("confidence", 0.85)

                    log_decision(
                        "CaptionSkill", "captions_generated", "success",
                        f"Audio path: {audio_path}, confidence={confidence:.2f}, words={len(words)}",
                        rationale="SRT file generated and saved"
                    )

                    return {
                        "srt_path": str(srt_path),
                        "word_count": len(words),
                        "confidence": confidence,
                        "transcript": text
                    }

                elif status == "error":
                    error_msg = status_data.get("error", "Unknown error")
                    log_error("CaptionSkill", "TranscriptionError", error_msg, action_taken="skipping captions")
                    return None

                elif status == "processing":
                    log_info("CaptionSkill", f"Still processing... (attempt {attempt + 1}/{self.max_retries * 12})")
                    time.sleep(5)

            log_error("CaptionSkill", "Timeout", "Transcription did not complete in time", action_taken="skipping captions")
            return None

        except requests.exceptions.RequestException as e:
            log_error("CaptionSkill", "NetworkError", str(e), action_taken="skipping captions")
            return None
        except Exception as e:
            log_error("CaptionSkill", "GenerationError", str(e), action_taken="skipping captions")
            return None

    @staticmethod
    def _generate_srt(words: list[dict]) -> str:
        """Convert AssemblyAI words with timestamps to SRT format."""
        if not words:
            return ""

        srt_lines = []
        subtitle_index = 1
        current_group = []
        last_end = 0

        for word_data in words:
            word_text = word_data.get("text", "")
            start = word_data.get("start", 0)  # milliseconds
            end = word_data.get("end", 0)

            # Group words into ~5 second chunks for readability
            if (end - last_end) > 5000 or len(current_group) > 10:
                if current_group:
                    srt_lines.append(f"{subtitle_index}\n")
                    srt_lines.append(f"{CaptionSkill._ms_to_srt(current_group[0]['start'])} --> {CaptionSkill._ms_to_srt(current_group[-1]['end'])}\n")
                    srt_lines.append(f"{' '.join([w['text'] for w in current_group])}\n\n")
                    subtitle_index += 1
                    current_group = []

            current_group.append({"text": word_text, "start": start, "end": end})
            last_end = end

        # Final group
        if current_group:
            srt_lines.append(f"{subtitle_index}\n")
            srt_lines.append(f"{CaptionSkill._ms_to_srt(current_group[0]['start'])} --> {CaptionSkill._ms_to_srt(current_group[-1]['end'])}\n")
            srt_lines.append(f"{' '.join([w['text'] for w in current_group])}\n\n")

        return "".join(srt_lines)

    @staticmethod
    def _ms_to_srt(ms: int) -> str:
        """Convert milliseconds to SRT timestamp format (HH:MM:SS,mmm)."""
        total_seconds = ms // 1000
        milliseconds = ms % 1000
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"
