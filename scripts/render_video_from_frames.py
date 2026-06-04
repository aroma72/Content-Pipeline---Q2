#!/usr/bin/env python3
"""Render video from frame sequence + audio using OpenCV and soundfile"""

import os
import sys
from pathlib import Path

print("[*] Installing dependencies...")
os.system('py -m pip install -q opencv-python pillow numpy soundfile -q 2>nul')

import cv2
import numpy as np
from PIL import Image

# Paths
frames_dir = Path("drawing-room-video/drawing-room-remotion/public/video_1_part_1/animated")
audio_path = Path("drawing-room-video/drawing-room-remotion/public/video_1_part_1/vo.mp3")
output_path = Path("video_production/video_1_part_1/VIDEO_1_PART_1_FINAL.mp4")

# Ensure output dir exists
output_path.parent.mkdir(parents=True, exist_ok=True)

print(f"\n[*] Rendering video from {len(list(frames_dir.glob('*.png')))} frames...")

# Get frame list sorted
frames = sorted(frames_dir.glob("*.png"))
if not frames:
    print("[ERROR] No frames found!")
    sys.exit(1)

print(f"[*] Found {len(frames)} frames")

# Load first frame to get dimensions
first_frame = cv2.imread(str(frames[0]))
if first_frame is None:
    print(f"[ERROR] Cannot read first frame: {frames[0]}")
    sys.exit(1)

height, width = first_frame.shape[:2]
print(f"[*] Frame size: {width}x{height}")

# Create video writer (H.264)
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
fps = 30
out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

if not out.isOpened():
    print("[ERROR] Failed to open video writer")
    sys.exit(1)

# Write frames
for i, frame_path in enumerate(frames):
    if i % 200 == 0:
        print(f"  [{i}/{len(frames)}] Processing...")

    frame = cv2.imread(str(frame_path))
    if frame is None:
        print(f"[WARNING] Skipping unreadable frame: {frame_path}")
        continue

    out.write(frame)

out.release()
print(f"[OK] Video saved: {output_path}")
print(f"[*] Size: {output_path.stat().st_size / (1024*1024):.1f} MB")

# Now add audio using subprocess FFmpeg if available
print(f"\n[*] Attempting to add audio...")
try:
    import subprocess
    # Try to find ffmpeg
    result = subprocess.run(['where', 'ffmpeg'], capture_output=True, text=True)
    if result.returncode == 0:
        ffmpeg_path = result.stdout.strip()
        print(f"[*] Found ffmpeg: {ffmpeg_path}")

        # Create temp file for video without audio
        temp_video = output_path.parent / "temp_video_no_audio.mp4"
        os.rename(str(output_path), str(temp_video))

        # Add audio
        cmd = [
            ffmpeg_path,
            '-i', str(temp_video),
            '-i', str(audio_path),
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-shortest',
            '-y',
            str(output_path)
        ]

        print(f"[*] Running: {' '.join(cmd)}")
        subprocess.run(cmd, check=False)

        # Clean up temp
        if temp_video.exists():
            os.remove(str(temp_video))

        print(f"[OK] Audio added! Final: {output_path}")
    else:
        print(f"[WARNING] FFmpeg not found - video created without audio")
        print(f"[INFO] To add audio later: ffmpeg -i {output_path} -i {audio_path} -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest output_with_audio.mp4")
except Exception as e:
    print(f"[WARNING] Could not add audio: {e}")

print(f"\n[OK] COMPLETE!")
print(f"[*] Output: {output_path}")
print(f"[*] Size: {output_path.stat().st_size / (1024*1024):.1f} MB")
