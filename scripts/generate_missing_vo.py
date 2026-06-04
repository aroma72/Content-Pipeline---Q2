#!/usr/bin/env python3
"""
Generate missing voiceover segments for Consumer vs Producer Mindset video.
Uses ElevenLabs API v2 with turbo model for natural pauses.
"""

import os
import sys
from pathlib import Path
import requests
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not ELEVENLABS_API_KEY:
    print("ERROR: ELEVENLABS_API_KEY not found in .env")
    sys.exit(1)

VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
BASE_URL = "https://api.elevenlabs.io/v1"

# Missing VO text with pause markers
MISSING_VO_TEXT = """Now they talk to each other. You connect them. Suddenly you have infrastructure generating value continuously. Consumers never get there. This might sound ambitious, but stay with me — building systems is a learnable skill, not magic. You're here to learn to think like a producer. That's what this course is about. Next: How do producers actually think? What's their mental model?"""

def generate_vo(text: str, output_path: str) -> bool:
    """Generate voiceover using ElevenLabs API v2."""

    print(f"Generating VO: {len(text)} characters")
    print(f"Output: {output_path}")

    url = f"{BASE_URL}/text-to-speech/{VOICE_ID}"

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",  # Faster, natural model
        "voice_settings": {
            "stability": 0.35,           # Natural pauses
            "similarity_boost": 0.65,    # Balance between naturalness and voice match
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=120)

        if response.status_code == 200:
            with open(output_path, "wb") as f:
                f.write(response.content)

            file_size = Path(output_path).stat().st_size
            print(f"✓ Generated: {output_path}")
            print(f"  File size: {file_size:,} bytes")

            # Estimate duration from file size (MP3 typically ~64-128 kbps)
            # Rough estimate: size_bytes / (128000/8) = duration_seconds
            estimated_duration = file_size / (128000 / 8)
            print(f"  Estimated duration: {estimated_duration:.1f} seconds")

            return True
        else:
            print(f"ERROR: Status {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False

    except Exception as e:
        print(f"ERROR: {e}")
        return False


if __name__ == "__main__":
    output_dir = Path(__file__).parent.parent / "video_production" / "session_2_video_1_mindset"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / "vo_missing_parts.mp3"

    if output_file.exists():
        print(f"Note: {output_file} already exists. Will overwrite.")

    if generate_vo(MISSING_VO_TEXT, str(output_file)):
        print("\n✓ Missing VO generated successfully")
        sys.exit(0)
    else:
        print("\n✗ Failed to generate missing VO")
        sys.exit(1)
