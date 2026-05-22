"""
vo_analysis_skill.py
Extracts phase-break timestamps from a voiceover file using ffprobe + silencedetect.
Returns timing JSON consumed by remotion_video_agent to set phase boundaries dynamically.

Rule: VO is the spine. Visual phases must adapt to speech — never the reverse.
"""

import re
import subprocess
from pathlib import Path
from typing import Optional


# ffmpeg-static bundled with the project
_FFMPEG_STATIC = Path(__file__).parent.parent / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"


def _ffprobe_bin() -> str:
    probe = str(_FFMPEG_STATIC).replace("ffmpeg.exe", "ffprobe.exe")
    return probe if Path(probe).exists() else "ffprobe"


def _ffmpeg_bin() -> str:
    return str(_FFMPEG_STATIC) if _FFMPEG_STATIC.exists() else "ffmpeg"


def measure_duration(audio_path: str) -> float:
    """Return exact duration in seconds from ffprobe."""
    result = subprocess.run(
        [_ffprobe_bin(), "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode == 0 and result.stdout.strip():
        return float(result.stdout.strip())
    raise RuntimeError(f"ffprobe failed on {audio_path}: {result.stderr}")


def detect_silence_ends(audio_path: str, noise_db: float = -28.0, min_duration: float = 0.3) -> list[float]:
    """
    Run silencedetect and return a list of silence_end timestamps (seconds).
    These are the moments speech resumes after a pause — ideal phase transition points.
    """
    result = subprocess.run(
        [_ffmpeg_bin(), "-i", audio_path,
         "-af", f"silencedetect=noise={noise_db}dB:duration={min_duration}",
         "-f", "null", "-"],
        capture_output=True, text=True, timeout=120
    )
    output = result.stderr  # ffmpeg writes filter output to stderr
    ends = [float(m) for m in re.findall(r"silence_end: ([\d.]+)", output)]
    return sorted(ends)


def _proportional_splits(total_frames: int, num_phases: int) -> list[int]:
    """Fallback: evenly spaced phase breaks when silence detection finds too few pauses."""
    step = total_frames // num_phases
    return [step * i for i in range(1, num_phases)]


def analyze_vo_timing(
    audio_path: str,
    num_phases: int = 5,
    fps: int = 30,
) -> dict:
    """
    Analyse a VO file and return timing JSON for the Remotion agent.

    Returns:
        total_duration_seconds: float
        total_frames: int
        phase_breaks_seconds: list[float]   — silence_end timestamps between phases
        phase_breaks_frames: list[int]      — timestamps × fps
        method: "silencedetect" | "proportional"
    """
    total_duration = measure_duration(audio_path)
    total_frames = round(total_duration * fps)

    silence_ends = detect_silence_ends(audio_path)
    needed = num_phases - 1  # N phases need N-1 break points

    if len(silence_ends) >= needed:
        # Pick the `needed` largest-gap silences as phase boundaries.
        # Heuristic: pauses between topics are longer than pauses between sentences.
        # Sort by position and pick every (len/needed)-th one to spread them evenly.
        if len(silence_ends) > needed:
            step = len(silence_ends) / needed
            breaks_seconds = [silence_ends[round(i * step)] for i in range(needed)]
        else:
            breaks_seconds = silence_ends[:needed]
        method = "silencedetect"
    else:
        # Fallback: proportional split
        break_frames = _proportional_splits(total_frames, num_phases)
        breaks_seconds = [f / fps for f in break_frames]
        method = "proportional"

    breaks_frames = [round(s * fps) for s in breaks_seconds]

    return {
        "total_duration_seconds": total_duration,
        "total_frames": total_frames,
        "phase_breaks_seconds": breaks_seconds,
        "phase_breaks_frames": breaks_frames,
        "method": method,
    }


if __name__ == "__main__":
    import sys, json
    if len(sys.argv) < 2:
        print("Usage: python vo_analysis_skill.py <audio_path> [num_phases]")
        sys.exit(1)
    path = sys.argv[1]
    phases = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    print(json.dumps(analyze_vo_timing(path, num_phases=phases), indent=2))
