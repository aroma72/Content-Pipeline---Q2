#!/usr/bin/env python3
"""
Generate the 6-second "How to go viral on Instagram" reel voiceover.
ElevenLabs v2 (eleven_turbo_v2), Rachel voice. Energetic-but-clear reel pacing.
"""

import os
import sys
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not API_KEY:
    print("ERROR: ELEVENLABS_API_KEY not found in .env")
    sys.exit(1)

VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel
BASE_URL = "https://api.elevenlabs.io/v1"

VO_TEXT = "Want to go viral? Win the first second. Hook them before they scroll — that's the game."

OUT = Path(__file__).parent.parent / "video_production" / "how_to_go_viral_instagram" / "vo.mp3"
OUT.parent.mkdir(parents=True, exist_ok=True)


def main():
    url = f"{BASE_URL}/text-to-speech/{VOICE_ID}"
    headers = {"xi-api-key": API_KEY, "Content-Type": "application/json"}
    payload = {
        "text": VO_TEXT,
        "model_id": "eleven_turbo_v2",
        "voice_settings": {
            "stability": 0.45,        # natural variation, energetic
            "similarity_boost": 0.75, # clear articulation
            "style": 0.35,            # a little punch for a reel
            "use_speaker_boost": True,
        },
    }
    print(f"Generating VO ({len(VO_TEXT.split())} words): {VO_TEXT}")
    r = requests.post(url, json=payload, headers=headers, timeout=60)
    if r.status_code != 200:
        print(f"ERROR {r.status_code}: {r.text}")
        sys.exit(1)
    OUT.write_bytes(r.content)
    print(f"OK -> {OUT} ({len(r.content)} bytes)")


if __name__ == "__main__":
    main()
