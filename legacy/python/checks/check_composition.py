#!/usr/bin/env python
import sys
from pathlib import Path
# This check lives two levels below the Python layer; put legacy/python on the
# path so `config`, `schemas` and `skills.*` resolve however it is invoked.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from skills.remotion_video_skill import RemotionVideoSkill
from config import REMOTION_PROJECT_DIR

skill = RemotionVideoSkill(REMOTION_PROJECT_DIR)

result = skill.generate_composition(
    scene_id='1.1',
    visual_description='Hook animation - AI agent working on task',
    narration_duration=30,
    prompt='Professional educational video. Simple geometric animations. 1920x1080 @ 30fps'
)

if result:
    print(f"OK: Generated {len(result['composition_code'])} chars")
    print(f"ID: {result['composition_id']}")
    print("\nFirst 500 chars of code:")
    print(result['composition_code'][:500])
else:
    print("FAIL: Composition generation failed")
