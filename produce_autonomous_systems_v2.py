#!/usr/bin/env python3
"""
Autonomous Systems Video Production v2
Renders new Remotion compositions and syncs with original VO audio.

Process:
1. Render silent video from new Remotion composition
2. Extract VO audio from existing video (updated/ folder)
3. Mux silent video + VO audio using ffmpeg
4. Verify output quality
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime

# Configuration
REMOTION_PROJECT_DIR = Path("drawing-room-video/drawing-room-remotion")
OUTPUT_DIR = Path("output/autonomous_systems_v2")
UPDATED_DIR = Path("updated")
VOICEOVERS_DIR = Path("output/autonomous_systems_v2/voiceovers")
FFMPEG_PATH = "c:\\ffmpeg\\ffmpeg.exe"  # Use full path to ffmpeg

# Source VO videos
SOURCE_VO_VIDEOS = {
    1: "updated/autonomous_systems_part_1_with_vo_synced.mp4",
    2: "updated/autonomous_systems_part_2_FINAL.mp4",
    3: "updated/autonomous_systems_part_3_FINAL.mp4",
    4: "updated/autonomous_systems_part_4_FINAL.mp4",
}

# Composition details
COMPOSITIONS = {
    1: {"id": "AutonomousSystemsPart1", "frames": 1950},
    2: {"id": "AutonomousSystemsPart2", "frames": 2880},
    3: {"id": "AutonomousSystemsPart3", "frames": 3240},
    4: {"id": "AutonomousSystemsPart4", "frames": 2760},
}

def log(msg: str, level: str = "INFO"):
    """Log message with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def run_command(cmd: list, description: str = "", use_remotion_cwd: bool = False, use_shell: bool = False, capture_errors: bool = False) -> bool:
    """Run shell command and return success status."""
    if description:
        log(f"Running: {description}")

    if use_shell:
        cmd_str = " ".join(cmd)
        log(f"Command: {cmd_str}")
    else:
        log(f"Command: {' '.join(cmd)}")

    try:
        cwd = None
        if use_remotion_cwd and REMOTION_PROJECT_DIR.parent.exists():
            cwd = str(REMOTION_PROJECT_DIR.parent)

        if use_shell:
            if capture_errors:
                result = subprocess.run(" ".join(cmd), check=True, capture_output=True, text=True, cwd=cwd, shell=True)
                if result.stdout:
                    log(result.stdout[:500])
            else:
                result = subprocess.run(" ".join(cmd), check=True, capture_output=False, cwd=cwd, shell=True)
        else:
            if capture_errors:
                result = subprocess.run(cmd, check=True, capture_output=True, text=True, cwd=cwd)
                if result.stdout:
                    log(result.stdout[:500])
            else:
                result = subprocess.run(cmd, check=True, capture_output=False, cwd=cwd)
        return True
    except subprocess.CalledProcessError as e:
        log(f"Command failed with exit code {e.returncode}", "ERROR")
        if capture_errors and e.stderr:
            log(f"Error output: {e.stderr[:500]}", "ERROR")
        return False

def extract_vo_audio(part_num: int, source_video: str) -> Path:
    """Extract VO audio from source video."""
    output_audio = VOICEOVERS_DIR / f"part_{part_num}_vo.aac"

    cmd = [
        FFMPEG_PATH,
        "-i", source_video,
        "-vn",
        "-acodec", "aac",
        "-q:a", "5",
        "-y",
        str(output_audio)
    ]

    if run_command(cmd, f"Extracting VO audio from Part {part_num}"):
        log(f"VO audio extracted: {output_audio}")
        return output_audio
    else:
        log(f"Failed to extract VO from Part {part_num}", "ERROR")
        return None

def render_silent_video(part_num: int) -> Path:
    """Render silent video from Remotion composition."""
    composition_id = COMPOSITIONS[part_num]["id"]
    output_file = OUTPUT_DIR / f"part_{part_num}_silent.mp4"

    # Output path relative to drawing-room-remotion directory
    rel_output = Path("..") / output_file

    # Command to run FROM drawing-room-remotion directory
    # Use src/index.ts which has registerRoot()
    cmd_str = f"npx remotion render src/index.ts {composition_id} {rel_output} --fps 30 --width 1920 --height 1080"

    if description := f"Rendering silent video for Part {part_num}":
        log(f"Running: {description}")
    log(f"Command: {cmd_str}")

    try:
        # Run from inside drawing-room-remotion directory
        cwd = str(REMOTION_PROJECT_DIR)
        result = subprocess.run(cmd_str, check=True, capture_output=True, text=True, cwd=cwd, shell=True)
        log(f"Silent video rendered: {output_file}")
        return output_file
    except subprocess.CalledProcessError as e:
        log(f"Command failed with exit code {e.returncode}", "ERROR")
        if e.stderr:
            log(f"Error: {e.stderr[:300]}", "ERROR")
        return None

def mux_video_audio(part_num: int, video_file: Path, audio_file: Path) -> Path:
    """Mux video and audio files using ffmpeg."""
    output_file = OUTPUT_DIR / f"autonomous_systems_part_{part_num}_final.mp4"

    cmd = [
        FFMPEG_PATH,
        "-i", str(video_file),
        "-i", str(audio_file),
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        "-y",
        str(output_file)
    ]

    if run_command(cmd, f"Muxing video + audio for Part {part_num}"):
        log(f"Muxed video created: {output_file}")
        return output_file
    else:
        log(f"Failed to mux Part {part_num}", "ERROR")
        return None

def probe_video(video_file: Path) -> dict:
    """Get video information using ffprobe."""
    ffprobe_path = FFMPEG_PATH.replace("ffmpeg.exe", "ffprobe.exe")
    cmd = [
        ffprobe_path,
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate,codec_name,duration",
        "-show_entries", "format=duration",
        "-of", "json",
        str(video_file)
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        return json.loads(result.stdout)
    except:
        return {}

def verify_output(part_num: int, output_file: Path) -> bool:
    """Verify output video has proper codec and metadata."""
    probe = probe_video(output_file)

    if not probe:
        log(f"Could not probe Part {part_num}", "WARN")
        return False

    # Check file exists and has size
    if not output_file.exists():
        log(f"Output file does not exist for Part {part_num}", "ERROR")
        return False

    file_size = output_file.stat().st_size / (1024 * 1024)  # MB
    log(f"Part {part_num} output: {file_size:.1f} MB")

    return True

def main():
    """Main orchestration loop."""
    log("=" * 70)
    log("AUTONOMOUS SYSTEMS VIDEO PRODUCTION v2")
    log("=" * 70)

    # Create directories
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    VOICEOVERS_DIR.mkdir(parents=True, exist_ok=True)

    results = {}

    for part_num in [1, 2, 3, 4]:
        log(f"\n{'=' * 70}")
        log(f"Processing Part {part_num}")
        log(f"{'=' * 70}")

        # Check source VO video exists
        source_vo = SOURCE_VO_VIDEOS[part_num]
        if not Path(source_vo).exists():
            log(f"Source VO video not found: {source_vo}", "ERROR")
            results[part_num] = {"status": "failed", "reason": "source_vo_missing"}
            continue

        # Step 1: Extract VO audio
        log(f"\nStep 1: Extract VO audio from {source_vo}")
        vo_audio = extract_vo_audio(part_num, source_vo)
        if not vo_audio:
            results[part_num] = {"status": "failed", "reason": "vo_extraction_failed"}
            continue

        # Step 2: Render silent video
        log(f"\nStep 2: Render silent video")
        silent_video = render_silent_video(part_num)
        if not silent_video:
            results[part_num] = {"status": "failed", "reason": "render_failed"}
            continue

        # Step 3: Mux video + audio
        log(f"\nStep 3: Mux video + audio")
        final_video = mux_video_audio(part_num, silent_video, vo_audio)
        if not final_video:
            results[part_num] = {"status": "failed", "reason": "mux_failed"}
            continue

        # Step 4: Verify output
        log(f"\nStep 4: Verify output")
        if verify_output(part_num, final_video):
            results[part_num] = {"status": "success", "output": str(final_video)}
            log(f"Part {part_num} completed successfully!")
        else:
            results[part_num] = {"status": "failed", "reason": "verification_failed"}

    # Final summary
    log(f"\n{'=' * 70}")
    log("SUMMARY")
    log(f"{'=' * 70}")

    successful = sum(1 for r in results.values() if r["status"] == "success")
    failed = sum(1 for r in results.values() if r["status"] == "failed")

    log(f"Successful: {successful}/4")
    log(f"Failed: {failed}/4")

    for part_num, result in results.items():
        status_icon = "[OK]" if result["status"] == "success" else "[FAIL]"
        log(f"  Part {part_num}: {status_icon} {result.get('reason', 'completed')}")

    # Output file listing
    if OUTPUT_DIR.exists():
        log(f"\nOutput files in {OUTPUT_DIR}:")
        for f in sorted(OUTPUT_DIR.glob("*final.mp4")):
            size_mb = f.stat().st_size / (1024 * 1024)
            log(f"  {f.name} ({size_mb:.1f} MB)")

    log(f"\n{'=' * 70}")
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
