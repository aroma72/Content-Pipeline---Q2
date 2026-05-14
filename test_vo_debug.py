#!/usr/bin/env python3
"""Debug voiceover generation failures."""

import sys
import os
import asyncio
from pathlib import Path

# Load .env first
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()

sys.path.insert(0, str(Path(__file__).parent))

# Test requests directly
print("Testing requests library...")
import requests
print(f"requests version: {requests.__version__}")

# Test API directly
print("\nTesting ElevenLabs API directly...")
api_key = os.getenv("ELEVENLABS_API_KEY")
print(f"API Key set: {bool(api_key)}")
print(f"API Key starts with: {api_key[:20] if api_key else 'None'}")

voice_id = "21m00Tcm4TlvDq8ikWAM"
url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
headers = {"xi-api-key": api_key, "Content-Type": "application/json"}
data = {
    "text": "This is a test voiceover for the Agentic AI Mastery cohort.",
    "model_id": "eleven_turbo_v2_5",
    "voice_settings": {
        "stability": 0.5,
        "similarity_boost": 0.75,
    }
}

try:
    print(f"Making request to: {url}")
    response = requests.post(url, json=data, headers=headers, timeout=60)
    print(f"Status code: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    print(f"Response text (first 500 chars): {response.text[:500]}")

    if response.status_code == 200:
        print(f"Success! Got {len(response.content)} bytes of audio")
    else:
        print(f"API Error: {response.status_code}")
except Exception as e:
    print(f"Exception: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
