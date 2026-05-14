#!/usr/bin/env python3
"""
Autonomous Systems Session - Complete Production Orchestrator
Renders 3 videos with VO sync using Remotion
"""

import subprocess
import json
from pathlib import Path
from datetime import datetime
import os

FFMPEG_PATH = "c:\\ffmpeg\\ffmpeg.exe"
REMOTION_PROJECT = Path("drawing-room-video/drawing-room-remotion")
OUTPUT_DIR = Path("output/autonomous_session")
VO_DIR = Path("voiceovers/autonomous_session")

VIDEOS = {
    1: {"id": "AutonomousSessionPart1", "frames": 6750, "duration": "3m 45s", "name": "Consumer vs Producer"},
    2: {"id": "AutonomousSessionPart2", "frames": 6900, "duration": "3m 50s", "name": "Autonomy & Evaluation"},
    3: {"id": "AutonomousSessionPart3", "frames": 7050, "duration": "3m 55s", "name": "Building & Testing"},
}

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

def run_cmd(cmd, desc="", use_shell=False, cwd_override=None):
    """Run command safely"""
    log(f"Running: {desc}")
    try:
        working_dir = cwd_override
        if not working_dir and "remotion" in desc.lower():
            working_dir = str(REMOTION_PROJECT)

        result = subprocess.run(
            cmd if not use_shell else " ".join(cmd),
            check=True,
            capture_output=True,
            text=True,
            shell=use_shell,
            cwd=working_dir
        )
        return True
    except subprocess.CalledProcessError as e:
        # Show full error message
        error_msg = e.stderr if e.stderr else e.stdout
        log(f"FAILED: {error_msg}", "ERROR")
        return False

def combine_scene_audio(part_num):
    """Combine individual scene MP3s into single audio track"""
    log(f"Combining audio for Part {part_num}...")

    scene_files = sorted(VO_DIR.glob(f"part_{part_num}_*.mp3"))
    if not scene_files:
        log(f"No audio files found for Part {part_num}", "ERROR")
        return None

    # Create concat list (without BOM for ffmpeg)
    concat_file = VO_DIR / f"part_{part_num}_concat.txt"
    from io import TextIOWrapper
    import codecs
    with open(concat_file, "wb") as f_bytes:
        with TextIOWrapper(f_bytes, encoding="utf-8", newline="\n") as f:
            for scene in scene_files:
                f.write(f"file '{scene.absolute()}'\n")

    output_file = OUTPUT_DIR / f"part_{part_num}_vo.aac"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        FFMPEG_PATH,
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c:a", "aac",
        "-y",
        str(output_file)
    ]

    if run_cmd(cmd, f"Combining {len(scene_files)} scenes for Part {part_num}"):
        size = output_file.stat().st_size / (1024*1024)
        log(f"Combined audio: {output_file.name} ({size:.1f} MB)")
        return output_file
    return None

def render_silent_video(part_num, composition_id, frames):
    """Render Remotion composition to silent video"""
    log(f"Rendering Part {part_num}: {composition_id}...")

    output = OUTPUT_DIR / f"part_{part_num}_silent.mp4"
    output.parent.mkdir(parents=True, exist_ok=True)

    # Use absolute output path and remotion.cmd from node_modules
    output_abs = output.resolve()
    remotion_cmd = (REMOTION_PROJECT / "node_modules" / ".bin" / "remotion.cmd").resolve()

    # Convert to string with forward slashes for shell command
    remotion_cmd_str = str(remotion_cmd).replace("\\", "/")
    output_str = str(output_abs).replace("\\", "/")

    # Use shell=True for .cmd files on Windows so command interpreter handles them properly
    cmd_str = f'"{remotion_cmd_str}" render src/index.ts {composition_id} "{output_str}" --fps 30 --width 1920 --height 1080'

    try:
        log(f"Running: Rendering Part {part_num}")
        result = subprocess.run(
            cmd_str,
            check=True,
            capture_output=True,
            text=True,
            shell=True,
            cwd=str(REMOTION_PROJECT)
        )
        if output_abs.exists():
            size = output_abs.stat().st_size / (1024*1024)
            log(f"Silent video rendered: {output_abs.name} ({size:.1f} MB)")
            return output_abs
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr if e.stderr else e.stdout
        log(f"FAILED: {error_msg}", "ERROR")

    return None

def mux_video_audio(part_num, video_path, audio_path):
    """Mux video + audio"""
    output = OUTPUT_DIR / f"autonomous_session_part_{part_num}_final.mp4"

    cmd = [
        FFMPEG_PATH,
        "-i", str(video_path),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        "-y",
        str(output)
    ]

    if run_cmd(cmd, f"Muxing Part {part_num}"):
        size = output.stat().st_size / (1024*1024)
        log(f"Final video: {output.name} ({size:.1f} MB)")
        return output
    return None

def main():
    log("=" * 70)
    log("AUTONOMOUS SYSTEMS SESSION - PRODUCTION ORCHESTRATOR")
    log("=" * 70)

    results = {}

    for part_num, video_info in VIDEOS.items():
        log(f"\n[PART {part_num}] {video_info['name']} ({video_info['duration']})")
        log("=" * 70)

        # Step 1: Combine audio
        audio_file = combine_scene_audio(part_num)
        if not audio_file:
            results[part_num] = "FAILED - audio combine"
            continue

        # Step 2: Render silent video
        video_file = render_silent_video(part_num, video_info["id"], video_info["frames"])
        if not video_file:
            results[part_num] = "FAILED - render"
            continue

        # Step 3: Mux video + audio
        final = mux_video_audio(part_num, video_file, audio_file)
        if final:
            results[part_num] = "SUCCESS"
        else:
            results[part_num] = "FAILED - mux"

    # Summary
    log(f"\n{'=' * 70}")
    log("SUMMARY")
    log(f"{'=' * 70}")

    for part_num, status in results.items():
        icon = "[OK]" if status == "SUCCESS" else "[FAIL]"
        log(f"Part {part_num}: {icon} {status}")

    log(f"\nFinal videos in: {OUTPUT_DIR}")
    if OUTPUT_DIR.exists():
        for mp4 in sorted(OUTPUT_DIR.glob("*_final.mp4")):
            size = mp4.stat().st_size / (1024*1024)
            log(f"  {mp4.name} ({size:.1f} MB)")

    log(f"{'=' * 70}")

if __name__ == "__main__":
    main()
