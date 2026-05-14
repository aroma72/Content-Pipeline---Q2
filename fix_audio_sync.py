#!/usr/bin/env python3
"""
Fix audio sync for autonomous systems videos.
Extract VO audio from source videos and mux with silent Remotion videos.
"""

import subprocess
import sys
from pathlib import Path

FFMPEG_PATH = "c:\\ffmpeg\\ffmpeg.exe"

# Source VO videos (with original audio)
SOURCE_VO_VIDEOS = {
    1: "updated/autonomous_systems_part_1_with_vo_synced.mp4",
    2: "updated/autonomous_systems_part_2_FINAL.mp4",
    3: "updated/autonomous_systems_part_3_FINAL.mp4",
    4: "updated/autonomous_systems_part_4_FINAL.mp4",
}

# Silent video sources
SILENT_VIDEOS = {
    1: "drawing-room-video/output/autonomous_systems_v2/part_1_silent.mp4",
    2: "drawing-room-video/output/autonomous_systems_v2/part_2_silent.mp4",
    3: "drawing-room-video/output/autonomous_systems_v2/part_3_silent.mp4",
    4: "drawing-room-video/output/autonomous_systems_v2/part_4_silent.mp4",
}

OUTPUT_DIR = Path("output/autonomous_systems_v2")
VO_DIR = OUTPUT_DIR / "voiceovers_extracted"

def run_cmd(cmd, description=""):
    """Run ffmpeg command."""
    print(f"\n{'='*70}")
    print(f"[*] {description}")
    print(f"[*] Command: {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, check=True, capture_output=False, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Failed: {e}")
        return False

def extract_audio(part_num):
    """Extract audio from source VO video."""
    source = SOURCE_VO_VIDEOS[part_num]
    output = VO_DIR / f"part_{part_num}_vo.aac"

    if not Path(source).exists():
        print(f"[ERROR] Source not found: {source}")
        return None

    cmd = [
        FFMPEG_PATH,
        "-i", source,
        "-vn",  # No video
        "-acodec", "aac",
        "-q:a", "5",
        "-y",
        str(output)
    ]

    if run_cmd(cmd, f"Extracting VO audio from Part {part_num} ({source})"):
        size_mb = output.stat().st_size / (1024*1024)
        print(f"[OK] Audio extracted: {output} ({size_mb:.1f} MB)")
        return output
    return None

def mux_video_audio(part_num):
    """Mux silent video with extracted audio."""
    silent_video = SILENT_VIDEOS[part_num]
    audio_file = VO_DIR / f"part_{part_num}_vo.aac"
    output_file = OUTPUT_DIR / f"autonomous_systems_part_{part_num}_final.mp4"

    if not Path(silent_video).exists():
        print(f"[ERROR] Silent video not found: {silent_video}")
        return False
    if not audio_file.exists():
        print(f"[ERROR] Audio not found: {audio_file}")
        return False

    cmd = [
        FFMPEG_PATH,
        "-i", silent_video,
        "-i", str(audio_file),
        "-c:v", "copy",  # Copy video codec (no re-encode)
        "-c:a", "aac",   # AAC audio codec
        "-shortest",     # Trim to shortest stream
        "-y",
        str(output_file)
    ]

    if run_cmd(cmd, f"Muxing video + audio for Part {part_num}"):
        size_mb = output_file.stat().st_size / (1024*1024)
        print(f"[OK] Muxed video: {output_file} ({size_mb:.1f} MB)")
        return True
    return False

def main():
    print("="*70)
    print("FIX AUDIO SYNC FOR AUTONOMOUS SYSTEMS VIDEOS")
    print("="*70)

    # Create directories
    VO_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    results = {}

    for part_num in [1, 2, 3, 4]:
        print(f"\n{'='*70}")
        print(f"PART {part_num}")
        print(f"{'='*70}")

        # Extract audio
        audio = extract_audio(part_num)
        if not audio:
            results[part_num] = "FAILED - audio extraction"
            continue

        # Mux video + audio
        if mux_video_audio(part_num):
            results[part_num] = "SUCCESS"
        else:
            results[part_num] = "FAILED - muxing"

    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    for part_num, status in results.items():
        icon = "[OK]" if status == "SUCCESS" else "[FAIL]"
        print(f"Part {part_num}: {icon} {status}")

    return 0 if all(s == "SUCCESS" for s in results.values()) else 1

if __name__ == "__main__":
    sys.exit(main())
