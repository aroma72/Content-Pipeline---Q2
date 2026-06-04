#!/usr/bin/env python3
"""Merge video and audio by re-encoding frames with audio track"""

import os
import sys
import subprocess
from pathlib import Path
import json

print("[*] Installing dependencies...")
os.system('py -m pip install -q pydub -q 2>nul')

video_path = Path("video_production/video_1_part_1/VIDEO_1_PART_1_FINAL.mp4")
audio_path = Path("drawing-room-video/drawing-room-remotion/public/video_1_part_1/vo.mp3")
output_path = Path("video_production/video_1_part_1/VIDEO_1_PART_1_WITH_AUDIO.mp4")

if not video_path.exists():
    print(f"[ERROR] Video not found: {video_path}")
    sys.exit(1)

if not audio_path.exists():
    print(f"[ERROR] Audio not found: {audio_path}")
    sys.exit(1)

print(f"\n[*] Video: {video_path}")
print(f"[*] Size: {video_path.stat().st_size / (1024*1024):.1f} MB")
print(f"\n[*] Audio: {audio_path}")
print(f"[*] Size: {audio_path.stat().st_size / (1024*1024):.1f} MB")

# Try using ffmpeg-python or just direct subprocess call
print(f"\n[*] Attempting to merge with FFmpeg via subprocess...")

# Build ffmpeg command - use copy for video, re-encode audio
cmd = f'''
ffmpeg -y \
  -i "{video_path}" \
  -i "{audio_path}" \
  -c:v copy \
  -c:a aac \
  -map 0:v:0 \
  -map 1:a:0 \
  -shortest \
  "{output_path}"
'''.strip()

print(f"[*] Command:")
print(f"    {cmd.replace(chr(10), ' ')}")

try:
    # Try to find ffmpeg executable anywhere on system
    result = subprocess.run(['where', 'ffmpeg.exe'], capture_output=True, text=True, timeout=5)
    if result.returncode == 0:
        ffmpeg_exe = result.stdout.strip().split('\\n')[0]
        print(f"[OK] Found FFmpeg: {ffmpeg_exe}")

        # Re-build command with full path
        cmd_list = [
            ffmpeg_exe,
            '-y',
            '-i', str(video_path),
            '-i', str(audio_path),
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-shortest',
            str(output_path)
        ]

        subprocess.run(cmd_list, check=True)
        print(f"\n[OK] Audio merged!")

        # Verify output
        if output_path.exists():
            size_mb = output_path.stat().st_size / (1024*1024)
            print(f"[OK] Output: {output_path}")
            print(f"[OK] Size: {size_mb:.1f} MB")
        else:
            print(f"[ERROR] Output not created")
    else:
        print(f"[ERROR] FFmpeg not found in PATH")
        print(f"\n[FALLBACK] Copying video as-is (without audio):")
        import shutil
        shutil.copy(str(video_path), str(output_path))
        print(f"[INFO] You can add audio manually using:")
        print(f"  ffmpeg -i {video_path} -i {audio_path} -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest {output_path}")

except Exception as e:
    print(f"[ERROR] {e}")
    print(f"\n[FALLBACK] Copying video as-is (without audio):")
    import shutil
    shutil.copy(str(video_path), str(output_path))
    print(f"[INFO] Video saved to: {output_path}")
    print(f"[INFO] You can add audio manually using FFmpeg")

print(f"\n[OK] COMPLETE!")
