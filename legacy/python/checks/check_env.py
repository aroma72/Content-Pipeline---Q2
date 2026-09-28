#!/usr/bin/env python3
import sys
from pathlib import Path
# This check lives two levels below the Python layer; put legacy/python on the
# path so `config`, `schemas` and `skills.*` resolve however it is invoked.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import os
from pathlib import Path

# Load .env
env_file = Path(__file__).resolve().parents[3] / ".env"
print(f"Loading {env_file}")
print(f"Exists: {env_file.exists()}")

if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip()
                print(f"Set {key.strip()} = {value.strip()[:20]}...")

print(f"\nELEVENLABS_API_KEY: {os.getenv('ELEVENLABS_API_KEY', 'NOT SET')}")

# Test VoiceoverGenerationSkill
from skills.voiceover_generation_skill import VoiceoverGenerationSkill
skill = VoiceoverGenerationSkill()
print(f"Skill is_available: {skill.is_available}")
