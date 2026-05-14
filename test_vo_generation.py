#!/usr/bin/env python3
"""Test voiceover generation to debug failures."""

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

from skills.voiceover_generation_skill import VoiceoverGenerationSkill

async def test():
    skill = VoiceoverGenerationSkill()
    VO_DIR = Path(__file__).parent / "voiceovers" / "agentic_ai_mastery"
    VO_DIR.mkdir(parents=True, exist_ok=True)

    print(f"API Key available: {skill.is_available}")
    print(f"API URL: {skill.api_url}")

    # Test with just one scene
    test_scenes = [
        {
            'scene_id': 'test_scene_1',
            'text': 'This is a test voiceover for the Agentic AI Mastery cohort.',
            'duration_seconds': 5.0,
            'output_path': str(VO_DIR / 'test_scene_1.mp3'),
        }
    ]

    print(f"\nTesting VoiceoverGenerationSkill.generate_and_sync_voiceover()...")
    print(f"Scene: {test_scenes[0]}\n")

    try:
        results = await skill.generate_and_sync_voiceover(test_scenes, auto_trim=True)
        print(f"Results:")
        for r in results:
            print(f"  {r}")
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
