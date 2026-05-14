"""
session_editor_skill.py
Professional session video editor: download -> silence detect -> transcribe
-> Claude analysis -> edit -> output MP4 + report.

Discovers chapter titles and sections from transcript content, never assumes.
"""

import json
import re
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List

import anthropic
import gdown
import openai

from config import MODEL_OPUS, OPENAI_API_KEY, DRAFTS_DIR
from skills.vo_sync_skill import FFMPEG, FFPROBE

SILENCE_THRESHOLD_DB = -35
SILENCE_MIN_DURATION = 1.5
SILENCE_BREATHING_ROOM = 0.3
MIN_SEGMENT_DURATION = 10.0
AUDIO_SAMPLE_RATE = 16000
WHISPER_CHUNK_MINUTES = 10  # ~15MB per chunk at 16kHz mono PCM (< 25MB Whisper limit)
FFMPEG_TIMEOUT = 3600  # 1 hour for long videos


class SessionVideoEditorSkill:
    """Professional session video editor."""

    def __init__(self, output_dir: Optional[str] = None):
        self.ffmpeg = FFMPEG
        self.ffprobe = FFPROBE
        self.output_dir = Path(output_dir) if output_dir else DRAFTS_DIR / "session_edits"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._claude = anthropic.Anthropic()
        self._openai = openai.OpenAI(api_key=OPENAI_API_KEY)

    # ── Main Entry Point ────────────────────────────────────────────────────

    def run(
        self,
        source: str,
        session_name: str,
        course_topic: str = "",
    ) -> dict:
        """
        Full pipeline. Returns dict with:
          status, output_video, edit_report, workdir, stats
        """
        try:
            session_dir = self.output_dir / session_name
            raw_dir = session_dir / "raw"
            work_dir = session_dir / "work"
            output_dir = session_dir / "output"

            for d in [raw_dir, work_dir, output_dir]:
                d.mkdir(parents=True, exist_ok=True)

            print(f"\n[session-editor] Starting pipeline for: {session_name}")
            print(f"[session-editor] Source: {source}")

            # Stage 1: Download
            print(f"[session-editor] Stage 1: Download...")
            if self._is_gdrive_url(source):
                video_path = self._download_gdrive(source, raw_dir)
            else:
                video_path = Path(source)
                if not video_path.exists():
                    return {"status": "error", "error": f"Video file not found: {source}"}
                video_path = video_path.resolve()

            print(f"[session-editor]   Video: {video_path} ({video_path.stat().st_size / 1e9:.2f} GB)")

            # Probe duration
            original_duration = self._probe_duration(str(video_path))
            print(f"[session-editor]   Duration: {original_duration:.1f}s ({original_duration/60:.1f}m)")

            # Stage 2: Silence detection
            print(f"[session-editor] Stage 2: Detect silences...")
            silence_cuts = self._detect_silences(str(video_path))
            print(f"[session-editor]   Found {len(silence_cuts)} silence segments")

            # Stage 3: Audio extraction
            print(f"[session-editor] Stage 3: Extract audio...")
            wav_path = work_dir / "audio_16k.wav"
            self._extract_audio_wav(str(video_path), str(wav_path))
            print(f"[session-editor]   Audio: {wav_path.stat().st_size / 1e9:.2f} GB")

            # Stage 4: Transcribe (chunked)
            print(f"[session-editor] Stage 4: Transcribe with Whisper...")
            whisper_segments = self._transcribe_whisper(str(wav_path), work_dir)
            print(f"[session-editor]   Segments: {len(whisper_segments)}")

            # Save transcript
            with open(work_dir / "whisper_transcript.json", "w") as f:
                json.dump(whisper_segments, f, indent=2)

            # Stage 5a: Detect filler words
            print(f"[session-editor] Stage 5a: Detect filler words...")
            filler_cuts = self._detect_filler_words(whisper_segments)
            print(f"[session-editor]   Filler words: {len(filler_cuts)}")

            # Stage 5b: Claude AI analysis
            print(f"[session-editor] Stage 5b: Claude analysis...")
            ai_cuts = self._analyse_with_claude(whisper_segments, original_duration, course_topic)
            print(f"[session-editor]   AI cuts: {len(ai_cuts)}")

            # Merge filler and AI cuts
            all_ai_cuts = filler_cuts + ai_cuts

            with open(work_dir / "ai_cuts.json", "w") as f:
                json.dump(all_ai_cuts, f, indent=2)

            # Stage 6: Build keep segments
            print(f"[session-editor] Stage 6: Build keep segments...")
            keep_segments = self._build_keep_segments(original_duration, silence_cuts, all_ai_cuts)
            print(f"[session-editor]   Keep segments: {len(keep_segments)}")

            with open(work_dir / "keep_segments.json", "w") as f:
                json.dump(keep_segments, f, indent=2)

            # Stage 7: Apply edits
            print(f"[session-editor] Stage 7: Apply edits with ffmpeg...")
            output_video_raw = output_dir / f"{session_name}_edited_raw.mp4"
            self._apply_edits(str(video_path), keep_segments, str(output_video_raw), session_name)
            print(f"[session-editor]   Output (raw): {output_video_raw.stat().st_size / 1e9:.2f} GB")

            # Stage 7.5: Normalize audio
            print(f"[session-editor] Stage 7.5: Normalize audio...")
            output_video = output_dir / f"{session_name}_edited.mp4"
            self._normalize_audio(str(output_video_raw), str(output_video))
            output_video_raw.unlink(missing_ok=True)  # Clean up raw file
            print(f"[session-editor]   Output (normalized): {output_video.stat().st_size / 1e9:.2f} GB")

            # Stage 8: Validate output
            print(f"[session-editor] Stage 8: Validate output...")
            validation = self._validate_output(output_video)
            if not validation['valid']:
                raise RuntimeError(f"Output validation failed: {validation['error']}")
            print(f"[session-editor]   Valid: H.264 video + AAC audio, {validation['file_size_mb']:.0f}MB")

            # Stage 9: Generate report
            print(f"[session-editor] Stage 9: Generate report...")
            edited_duration = self._probe_duration(str(output_video))
            report = self._generate_report(
                session_name, original_duration, keep_segments, silence_cuts, all_ai_cuts,
                str(output_video), edited_duration
            )

            report_path = output_dir / f"{session_name}_report.json"
            with open(report_path, "w") as f:
                json.dump(report, f, indent=2)

            print(f"[session-editor] Done!")
            print(f"[session-editor]   Original: {original_duration:.0f}s ({original_duration/60:.1f}m)")
            print(f"[session-editor]   Edited:   {edited_duration:.0f}s ({edited_duration/60:.1f}m)")
            print(f"[session-editor]   Reduction: {report['reduction_percent']:.1f}%")

            return {
                "status": "success",
                "output_video": str(output_video),
                "edit_report": str(report_path),
                "workdir": str(session_dir),
                "stats": {
                    "original_duration_seconds": original_duration,
                    "edited_duration_seconds": edited_duration,
                    "reduction_percent": report["reduction_percent"],
                    "silence_cuts_count": report["silence_cuts_count"],
                    "silence_time_removed_seconds": report["silence_time_removed_seconds"],
                    "ai_cuts_count": len(all_ai_cuts),
                    "ai_time_removed_seconds": sum(c["end"] - c["start"] for c in all_ai_cuts),
                    "filler_cuts_count": len(filler_cuts),
                    "keep_segments_count": report["keep_segments_count"],
                }
            }

        except Exception as e:
            print(f"[session-editor] ERROR: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "error": str(e)}

    # ── Stage 1: Download ───────────────────────────────────────────────────

    def _is_gdrive_url(self, source: str) -> bool:
        """Returns True if source looks like a Google Drive share URL."""
        return "drive.google.com" in source.lower()

    def _download_gdrive(self, url: str, dest_dir: Path) -> Path:
        """
        Use gdown to download from Google Drive public link.
        Returns the local path.
        """
        dest_dir.mkdir(parents=True, exist_ok=True)

        # Extract file ID and construct direct download URL
        if "/file/d/" in url:
            file_id = url.split("/file/d/")[1].split("/")[0]
        elif "id=" in url:
            file_id = url.split("id=")[1].split("&")[0]
        else:
            raise ValueError("Could not extract file ID from URL")

        direct_url = f"https://drive.google.com/uc?id={file_id}"

        # Check if file already downloaded
        existing_files = list(dest_dir.glob("*.webm")) + list(dest_dir.glob("*.mp4"))
        if existing_files:
            print(f"[session-editor]   Using cached file: {existing_files[0].name}")
            return existing_files[0]

        print(f"[session-editor]   Downloading from Google Drive...")
        try:
            output_path = gdown.download(direct_url, quiet=False, output=None)

            if not output_path or not Path(output_path).exists():
                raise RuntimeError("gdown download failed — file not found")

            # Move to dest_dir
            src = Path(output_path)
            dst = dest_dir / src.name

            # Handle if destination already exists
            if dst.exists():
                dst.unlink()

            if src.resolve() != dst.resolve():
                src.rename(dst)
            return dst
        except Exception as e:
            raise RuntimeError(f"Failed to download from Google Drive: {e}")

    # ── Stage 2: Silence Detection ──────────────────────────────────────────

    def _detect_silences(self, video_path: str) -> List[dict]:
        """
        Runs ffmpeg silencedetect filter. Returns list of {start, end, duration}.
        """
        cmd = [
            str(self.ffmpeg),
            "-i", video_path,
            "-af", f"silencedetect=noise={SILENCE_THRESHOLD_DB}dB:d={SILENCE_MIN_DURATION}",
            "-f", "null",
            "-"
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=FFMPEG_TIMEOUT
        )

        silences = self._parse_silence_output(result.stderr)
        return silences

    @staticmethod
    def _parse_silence_output(stderr: str) -> List[dict]:
        """Parse ffmpeg silencedetect stderr."""
        silences = []
        lines = stderr.split("\n")

        i = 0
        while i < len(lines):
            line = lines[i]

            # Look for 'silence_end:' line which contains both end and duration
            if "silence_end:" in line:
                match = re.search(r"silence_end:\s+([\d.]+)\s+\|\s+silence_duration:\s+([\d.]+)", line)
                if match:
                    end = float(match.group(1))
                    duration = float(match.group(2))
                    start = end - duration
                    silences.append({"start": start, "end": end, "duration": duration})

            i += 1

        return silences

    # ── Stage 3: Audio Extraction ───────────────────────────────────────────

    def _extract_audio_wav(self, video_path: str, wav_path: str):
        """Extract audio to 16kHz mono WAV."""
        cmd = [
            str(self.ffmpeg),
            "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", str(AUDIO_SAMPLE_RATE),
            "-ac", "1",
            "-y",
            wav_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=FFMPEG_TIMEOUT
        )

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg audio extraction failed: {result.stderr[-500:]}")

    # ── Stage 4: Transcription ──────────────────────────────────────────────

    def _transcribe_whisper(self, wav_path: str, work_dir: Path) -> List[dict]:
        """
        Transcribe WAV file using OpenAI Whisper.
        Chunks if > 25MB (~5 minutes at 16kHz mono PCM).
        Returns list of {start, end, text} segments.
        """
        wav_file_size = Path(wav_path).stat().st_size

        # Check if chunking is needed
        if wav_file_size > 25e6:  # 25 MB
            print(f"[session-editor]   File {wav_file_size/1e6:.0f} MB — chunking for Whisper...")
            return self._transcribe_chunked(wav_path, work_dir)
        else:
            print(f"[session-editor]   Transcribing single file...")
            return self._transcribe_single(wav_path)

    def _transcribe_single(self, wav_path: str) -> List[dict]:
        """Transcribe a single WAV file."""
        with open(wav_path, "rb") as f:
            transcript = self._openai.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json"
            )

        # Extract segments
        segments = []
        if hasattr(transcript, 'segments'):
            for seg in transcript.segments:
                segments.append({
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text
                })

        return segments

    def _transcribe_chunked(self, wav_path: str, work_dir: Path) -> List[dict]:
        """
        Split WAV into 10-minute chunks, transcribe each, merge with offsets.
        """
        chunk_seconds = WHISPER_CHUNK_MINUTES * 60

        # Get total duration
        try:
            probe_result = subprocess.run(
                [
                    str(self.ffprobe),
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    wav_path
                ],
                capture_output=True,
                text=True,
                timeout=30
            )
            total_duration = float(probe_result.stdout.strip())
        except:
            total_duration = Path(wav_path).stat().st_size / (AUDIO_SAMPLE_RATE * 2)  # rough estimate

        # Create chunks
        num_chunks = int((total_duration / chunk_seconds) + 1)
        print(f"[session-editor]   File size {Path(wav_path).stat().st_size / 1e6:.0f}MB -> {num_chunks} chunks of {WHISPER_CHUNK_MINUTES}m each (~15MB each)")

        all_segments = []

        for i in range(num_chunks):
            start_time = i * chunk_seconds
            end_time = min((i + 1) * chunk_seconds, total_duration)

            chunk_path = work_dir / f"chunk_{i:03d}.wav"

            # Extract chunk
            cmd = [
                str(self.ffmpeg),
                "-i", wav_path,
                "-ss", str(start_time),
                "-to", str(end_time),
                "-acodec", "pcm_s16le",
                "-y",
                str(chunk_path)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=FFMPEG_TIMEOUT)
            if result.returncode != 0:
                print(f"[session-editor]   Warning: chunk {i} extraction failed")
                continue

            chunk_size_mb = chunk_path.stat().st_size / 1e6
            print(f"[session-editor]   Chunk {i+1}/{num_chunks} ({chunk_size_mb:.0f}MB) -> Whisper...")

            # Transcribe chunk
            try:
                segments = self._transcribe_single(str(chunk_path))
            except Exception as e:
                print(f"[session-editor]   Error transcribing chunk {i}: {e}")
                raise

            # Adjust timestamps
            for seg in segments:
                seg["start"] += start_time
                seg["end"] += start_time

            all_segments.extend(segments)
            chunk_path.unlink()  # Clean up chunk

        return all_segments

    # ── Stage 5: Claude AI Analysis ─────────────────────────────────────────

    def _detect_filler_words(self, whisper_segments: List[dict]) -> List[dict]:
        """Detect common filler words that should be cut."""
        filler_words = {
            'um': 0.5, 'uh': 0.5, 'ah': 0.3,
            'like': 0.4, 'you know': 0.6, 'i mean': 0.5,
            'so': 0.3, 'actually': 0.3, 'basically': 0.3,
            'literally': 0.3, 'obviously': 0.3, 'honestly': 0.2,
            'right': 0.2, 'okay so': 0.4
        }

        filler_cuts = []
        for seg in whisper_segments:
            text_lower = seg['text'].lower().strip()

            for filler, confidence in filler_words.items():
                if text_lower == filler or text_lower.startswith(filler + ' ') or text_lower.endswith(' ' + filler):
                    # Only mark as cut if segment is short (under 2 seconds)
                    duration = seg['end'] - seg['start']
                    if duration < 2.0 and confidence > 0.3:
                        filler_cuts.append({
                            'start': seg['start'],
                            'end': seg['end'],
                            'reason': 'filler_word',
                            'summary': f"Filler: '{filler}'",
                            'confidence': confidence
                        })
                    break

        return filler_cuts

    def _analyse_with_claude(
        self,
        whisper_segments: List[dict],
        video_duration: float,
        course_topic: str,
    ) -> List[dict]:
        """
        Analyze transcript with Claude. Returns list of {start, end, reason} to cut.
        """
        # Build transcript string with timestamps
        transcript_lines = []
        for seg in whisper_segments:
            timestamp = f"[{seg['start']:.1f}s]"
            transcript_lines.append(f"{timestamp} {seg['text']}")

        transcript_text = "\n".join(transcript_lines)

        # Use Claude to identify cuts
        response = self._claude.messages.create(
            model=MODEL_OPUS,
            max_tokens=4000,
            system="""You are a professional video editor specializing in educational content.
Your job is to identify sections that should be CUT from a recorded session.

Cut the following types of content:
1. Silence or long pauses (already detected separately)
2. Off-topic chat or personal anecdotes unrelated to the course
3. Technical setup/troubleshooting (mic checks, "can you see me?", connection issues)
4. Repeated explanations of the same concept (keep only the clearest version)
5. Long tangents not relevant to course learning objectives
6. Housekeeping announcements (scheduling, admin, homework reminders)

Do NOT cut:
- Core teaching moments, even if brief
- Q&A that clarifies a key concept
- Transitions between topics
- Content under 30 seconds (too jarring)

For each cut you identify, use the identify_cuts tool.
If no cuts are needed, return an empty list.
Be conservative — when uncertain, keep the content.""",
            tools=[{
                "name": "identify_cuts",
                "description": "Specify sections to cut from the session",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "cuts": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "start": {"type": "number", "description": "Cut start time in seconds"},
                                    "end": {"type": "number", "description": "Cut end time in seconds"},
                                    "reason": {
                                        "type": "string",
                                        "enum": ["off_topic", "technical_setup", "repeated_content", "tangent", "housekeeping"]
                                    },
                                    "summary": {"type": "string", "description": "Brief description of what's being cut"}
                                },
                                "required": ["start", "end", "reason"]
                            }
                        },
                        "chapters": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "time": {"type": "number", "description": "Chapter start time in seconds"},
                                    "title": {"type": "string", "description": "Chapter title from the actual content"}
                                }
                            }
                        }
                    }
                }
            }],
            messages=[{
                "role": "user",
                "content": f"""Course topic: {course_topic}
Video duration: {video_duration:.0f} seconds ({video_duration/60:.1f} minutes)

Transcript with timestamps:
{transcript_text}

Analyze this session and identify sections to cut. Use the identify_cuts tool."""
            }]
        )

        # Extract cuts from tool use
        cuts = []
        chapters = []

        for content in response.content:
            if content.type == "tool_use" and content.name == "identify_cuts":
                cuts = content.input.get("cuts", [])
                chapters = content.input.get("chapters", [])
                break

        # Validate cuts (ensure they're within video bounds)
        valid_cuts = []
        for cut in cuts:
            if cut.get("end", 0) > cut.get("start", 0) and cut.get("start", 0) < video_duration:
                cut["end"] = min(cut["end"], video_duration)
                valid_cuts.append(cut)

        return valid_cuts

    # ── Stage 6: Build Keep Segments ────────────────────────────────────────

    def _build_keep_segments(
        self,
        video_duration: float,
        silence_cuts: List[dict],
        ai_cuts: List[dict],
    ) -> List[dict]:
        """
        Merge silence and AI cuts -> invert to keep segments.
        Apply breathing room for silences.
        Enforce minimum segment duration.
        """
        # Merge all cuts
        all_cuts = []

        # Add silence cuts with breathing room
        for cut in silence_cuts:
            all_cuts.append({
                "start": max(0, cut["start"] - SILENCE_BREATHING_ROOM),
                "end": min(video_duration, cut["end"] + SILENCE_BREATHING_ROOM),
                "type": "silence"
            })

        # Add AI cuts
        for cut in ai_cuts:
            all_cuts.append({
                "start": cut["start"],
                "end": cut["end"],
                "type": "ai",
                "reason": cut.get("reason")
            })

        # Sort and merge overlapping cuts
        all_cuts.sort(key=lambda x: x["start"])
        merged_cuts = []
        for cut in all_cuts:
            if merged_cuts and cut["start"] <= merged_cuts[-1]["end"]:
                # Merge with previous
                merged_cuts[-1]["end"] = max(merged_cuts[-1]["end"], cut["end"])
            else:
                merged_cuts.append(cut)

        # Invert to keep segments
        keep_segments = []
        last_end = 0.0

        for cut in merged_cuts:
            if cut["start"] > last_end:
                keep_segments.append({
                    "start": last_end,
                    "end": cut["start"]
                })
            last_end = cut["end"]

        # Final segment if there's time left
        if last_end < video_duration:
            keep_segments.append({
                "start": last_end,
                "end": video_duration
            })

        # Enforce minimum segment duration
        final_segments = []
        i = 0
        while i < len(keep_segments):
            seg = keep_segments[i]
            duration = seg["end"] - seg["start"]

            if duration < MIN_SEGMENT_DURATION:
                # Merge with next segment
                if i + 1 < len(keep_segments):
                    seg["end"] = keep_segments[i + 1]["end"]
                    i += 2
                else:
                    i += 1
            else:
                final_segments.append(seg)
                i += 1

        return final_segments

    # ── Stage 7: Apply Edits ────────────────────────────────────────────────

    def _apply_edits(
        self,
        source_video: str,
        keep_segments: List[dict],
        output_path: str,
        session_name: str,
    ) -> str:
        """Apply edits via ffmpeg filter_complex."""

        # Build filter_complex
        filter_complex = self._build_filter_complex(keep_segments)

        # Write filter to temp file (avoid CLI length limit on Windows)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(filter_complex)
            filter_file = f.name

        try:
            cmd = [
                str(self.ffmpeg),
                "-i", source_video,
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", "[aout]",
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "18",
                "-c:a", "aac",
                "-b:a", "192k",
                "-y",
                output_path
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=FFMPEG_TIMEOUT
            )

            if result.returncode != 0:
                raise RuntimeError(f"ffmpeg edit failed: {result.stderr[-500:]}")

            return output_path

        finally:
            Path(filter_file).unlink(missing_ok=True)

    def _build_filter_complex(self, keep_segments: List[dict]) -> str:
        """Build ffmpeg filter_complex string for segment trimming and concat."""
        if not keep_segments:
            raise ValueError("No segments to keep")

        parts = []
        concat_parts = []

        for i, seg in enumerate(keep_segments):
            start = seg["start"]
            end = seg["end"]

            # Video trim
            parts.append(f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS[v{i}]")

            # Audio trim (with slight extension for J-cut effect)
            audio_end = min(end + 0.2, end)  # Small J-cut overlap
            parts.append(f"[0:a]atrim=start={start}:end={audio_end},asetpts=PTS-STARTPTS[a{i}]")

            concat_parts.append(f"[v{i}][a{i}]")

        # Concat line
        concat_line = "".join(concat_parts) + f"concat=n={len(keep_segments)}:v=1:a=1[vout][aout]"
        parts.append(concat_line)

        return ";".join(parts)

    # ── Stage 7.5: Audio Normalization ─────────────────────────────────────

    def _normalize_audio(self, video_path: str, output_path: str) -> str:
        """Normalize audio to professional streaming standard (-16 LUFS EBU R128)."""
        print(f"[session-editor]   Normalizing audio (EBU R128 standard)...")

        cmd = [
            str(self.ffmpeg),
            "-i", video_path,
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-c:v", "copy",  # Don't re-encode video
            "-c:a", "aac",
            "-b:a", "192k",
            "-y",
            output_path
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=FFMPEG_TIMEOUT
        )

        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg audio normalization failed: {result.stderr[-500:]}")

        return output_path

    # ── Stage 8: Output Validation ──────────────────────────────────────────

    def _validate_output(self, output_video: Path) -> dict:
        """Validate final video before releasing to user."""
        print(f"[session-editor]   Validating output...")

        # Check file integrity with ffprobe
        probe_cmd = [
            str(self.ffprobe),
            "-v", "error",
            "-show_format",
            "-show_streams",
            "-of", "json",
            str(output_video)
        ]

        result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            raise RuntimeError(f"ffprobe validation failed: {result.stderr}")

        try:
            data = json.loads(result.stdout)
        except:
            raise RuntimeError("ffprobe output invalid JSON")

        # Validate codecs
        for stream in data.get('streams', []):
            codec_type = stream.get('codec_type')
            codec_name = stream.get('codec_name', '')

            if codec_type == 'video':
                if codec_name not in ['h264', 'libx264']:
                    return {'valid': False, 'error': f'Video codec {codec_name} not H.264'}

            elif codec_type == 'audio':
                if codec_name not in ['aac', 'libfdk_aac']:
                    return {'valid': False, 'error': f'Audio codec {codec_name} not AAC'}

        # Generate thumbnail
        thumb_path = output_video.with_stem(output_video.stem + "_thumb").with_suffix('.jpg')
        thumb_cmd = [
            str(self.ffmpeg),
            "-i", str(output_video),
            "-ss", "00:00:02",
            "-vf", "scale=320:180",
            "-y",
            str(thumb_path)
        ]

        subprocess.run(thumb_cmd, capture_output=True, text=True, timeout=60)

        return {
            'valid': True,
            'file_size_mb': output_video.stat().st_size / 1e6,
            'codec_video': data['streams'][0].get('codec_name') if data['streams'] else 'unknown',
            'duration': data.get('format', {}).get('duration', 0),
            'thumbnail': str(thumb_path) if thumb_path.exists() else None
        }

    # ── Stage 9: Probe Duration ─────────────────────────────────────────────

    def _probe_duration(self, video_path: str) -> float:
        """Get video duration in seconds."""
        result = subprocess.run(
            [
                str(self.ffprobe),
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                video_path
            ],
            capture_output=True,
            text=True,
            timeout=60
        )

        try:
            return float(result.stdout.strip())
        except:
            raise RuntimeError(f"Could not probe duration of {video_path}")

    # ── Stage 9: Generate Report ────────────────────────────────────────────

    def _generate_report(
        self,
        session_name: str,
        original_duration: float,
        keep_segments: List[dict],
        silence_cuts: List[dict],
        ai_cuts: List[dict],
        output_path: str,
        edited_duration: float,
    ) -> dict:
        """Generate edit report JSON."""

        silence_time_removed = sum(c["duration"] for c in silence_cuts)
        ai_time_removed = sum(c["end"] - c["start"] for c in ai_cuts)
        reduction_percent = ((original_duration - edited_duration) / original_duration * 100) if original_duration > 0 else 0

        return {
            "session_name": session_name,
            "generated_at": datetime.now().isoformat(),
            "original_duration_seconds": original_duration,
            "edited_duration_seconds": edited_duration,
            "reduction_percent": reduction_percent,
            "silence_cuts_count": len(silence_cuts),
            "silence_time_removed_seconds": silence_time_removed,
            "ai_cuts_count": len(ai_cuts),
            "ai_time_removed_seconds": ai_time_removed,
            "keep_segments_count": len(keep_segments),
            "cuts_breakdown": [
                {
                    "type": "silence",
                    "count": len(silence_cuts),
                    "total_time": silence_time_removed
                },
                {
                    "type": "ai_identified",
                    "count": len(ai_cuts),
                    "total_time": ai_time_removed
                }
            ],
            "output_video": output_path,
        }
