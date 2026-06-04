#!/usr/bin/env python3
"""Add audio to rendered video using moviepy"""

import os
import sys
from pathlib import Path

print("[*] Installing dependencies...")
os.system('py -m pip install -q moviepy -q 2>nul')

from moviepy.editor import VideoFileClip, AudioFileClip, CompositeAudioClip

video_path = Path("video_production/video_1_part_1/VIDEO_1_PART_1_FINAL.mp4")
audio_path = Path("drawing-room-video/drawing-room-remotion/public/video_1_part_1/vo.mp3")
output_path = Path("video_production/video_1_part_1/VIDEO_1_PART_1_WITH_AUDIO.mp4")

print(f"\n[*] Loading video: {video_path}")
video = VideoFileClip(str(video_path))

print(f"[*] Loading audio: {audio_path}")
audio = AudioFileClip(str(audio_path))

print(f"[*] Video duration: {video.duration:.2f}s")
print(f"[*] Audio duration: {audio.duration:.2f}s")

# Set audio to video (will use shortest duration)
final_video = video.set_audio(audio)

print(f"\n[*] Writing video with audio...")
final_video.write_videofile(
    str(output_path),
    fps=30,
    codec='libx264',
    audio_codec='aac',
    audio_fps=44100,
    verbose=False,
    logger=None
)

print(f"\n[OK] Complete!")
print(f"[OK] Output: {output_path}")
print(f"[*] Size: {output_path.stat().st_size / (1024*1024):.1f} MB")

# Clean up
video.close()
audio.close()
print(f"[OK] Final video ready for delivery!")
