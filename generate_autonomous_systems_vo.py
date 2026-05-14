#!/usr/bin/env python3
import os
import requests
import time
from pathlib import Path

# Load environment variables
env_file = Path("C:/Users/Aroma Tahir/Downloads/Content Queen/.env")
api_key = None

with open(env_file, 'r') as f:
    for line in f:
        if line.startswith('ELEVENLABS_API_KEY='):
            api_key = line.split('=')[1].strip()
            break

if not api_key:
    print("ERROR: ELEVENLABS_API_KEY not found in .env")
    exit(1)

print("API Key Found")
print()

voice_id = "21m00Tcm4TlvDq8ikWAM"
api_url = "https://api.elevenlabs.io/v1/text-to-speech"
vo_output_dir = Path("C:/Users/Aroma Tahir/Downloads/Content Queen/voiceovers/autonomous_systems")
vo_output_dir.mkdir(parents=True, exist_ok=True)

print("=" * 42)
print("AUTONOMOUS SYSTEMS VOICEOVER GENERATION")
print("Parts 2, 3, 4")
print("=" * 42)
print()

# Part 2 scenes
part2_scenes = [
    {'id': 'part2_scene1', 'text': "You've built an autonomous system. You ran your tests. Every one passed. You feel confident. You deploy. Then something unexpected happens in production. Your system makes a decision that breaks. It misses an edge case. It's slower than expected. How did this happen? Your tests all passed. The answer is simple: You were testing, but you weren't evaluating."},
    {'id': 'part2_scene2', 'text': "Testing asks: Does the code work? Does it run? If I give it input X, do I get output Y? Testing is essential. You definitely need it. But it's narrow. It only checks the mechanism itself. Testing verifies that your code is technically correct. It catches bugs. It ensures the system functions."},
    {'id': 'part2_scene3', 'text': "Evaluation asks a different question entirely: Is this system right? Does it actually solve the problem? Does the output help users? Does it meet real-world needs? Evaluation is broader. It checks whether the system achieves its actual purpose, not just whether the code works."},
    {'id': 'part2_scene4', 'text': "Here's the key: Your code can pass every test and still fail in the real world. A system can work perfectly, technically sound, and still be wrong. Testing ensures it runs. Evaluation ensures it should run. Both are necessary. One without the other leaves you blind. This distinction is everything."},
]

# Part 3 scenes
part3_scenes = [
    {'id': 'part3_scene1', 'text': "Now that you understand evaluation, you need to know how to do it. There are four proven methods. Each measures something different. Each works best in different situations. The systems that stay reliable are the ones using all four together."},
    {'id': 'part3_scene2', 'text': "Method One: Code Review. A human or another system examines your code and asks: Does this logic make sense? Are there bugs? Edge cases? Code review is powerful for finding logical errors, security problems, and inefficiencies. It catches issues before they run."},
    {'id': 'part3_scene3', 'text': "Method Two: End-to-End Testing. You take real data, run it through the entire system, and check if the output is correct. This tests the whole workflow, not just pieces. When real data flows through, does your system produce the right result? End-to-End testing answers that."},
    {'id': 'part3_scene4', 'text': "Method Three: Safety Hooks. You add guardrails during execution. If something looks dangerous, the system stops and alerts instead of proceeding. Safety hooks prevent disasters. They don't fix problems, they prevent the catastrophic ones."},
    {'id': 'part3_scene5', 'text': "Method Four: LLM as Judge. You use an AI to evaluate your AI's outputs. Is the response helpful? Accurate? Professional? When human judgment is hard to code, LLM evaluation works surprisingly well. The four methods together give you complete coverage. Code review for logic. Testing for correctness. Safety hooks for risk. LLM-as-judge for quality. Use all four."},
]

# Part 4 scenes
part4_scenes = [
    {'id': 'part4_scene1', 'text': "You now understand what evaluation is. You know four methods to do it. But how do you actually build an autonomous system that stays good? It requires three foundational pillars working together. Without any one of them, the system fails."},
    {'id': 'part4_scene2', 'text': "Pillar One: Skills. These are your system's capabilities. What can it do? What actions can it take? Skills are composable, they build on each other. A system is only as autonomous as its skills allow it to be. Skills give it the power to act."},
    {'id': 'part4_scene3', 'text': "Pillar Two: Evaluation Hooks. These are the system's conscience. Real-time checks that ask: Is this safe? Before the system acts, hooks evaluate. They guard against harm. They ensure the system respects boundaries. Without hooks, skills become dangerous."},
    {'id': 'part4_scene4', 'text': "Pillar Three: Self-Improvement. The system learns from what happens. It reflects on outcomes. It feeds data back into decision-making. The system gets better over time because it measures, learns, and adapts. Without this loop, progress stops."},
    {'id': 'part4_scene5', 'text': "Three pillars. Skills, hooks, learning. When they work together, you have a truly autonomous system. One that acts independently, stays safe, and continuously improves. That's what autonomy looks like."},
]

all_scenes = part2_scenes + part3_scenes + part4_scenes

print(f"Generating {len(all_scenes)} voiceovers...")
print()

successful = 0
for i, scene in enumerate(all_scenes, 1):
    scene_id = scene['id']
    text = scene['text']
    out_file = vo_output_dir / f"{scene_id}.mp3"

    print(f"[{i}/{len(all_scenes)}] {scene_id}... ", end='', flush=True)

    try:
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json"
        }

        data = {
            "text": text,
            "model_id": "eleven_monologue_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.3,
                "use_speaker_boost": True
            }
        }

        response = requests.post(
            f"{api_url}/{voice_id}",
            json=data,
            headers=headers,
            timeout=60
        )

        if response.status_code == 200:
            with open(out_file, 'wb') as f:
                f.write(response.content)
            print("DONE")
            successful += 1
        else:
            print(f"FAILED: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"FAILED: {str(e)}")

    time.sleep(0.3)

print()
print("=" * 42)
print("VOICEOVER GENERATION COMPLETE")
print("=" * 42)
print(f"Generated: {successful} / {len(all_scenes)}")
print(f"Saved to: {vo_output_dir}")
print()

if successful > 0:
    print("Generated voiceovers:")
    for mp3_file in sorted(vo_output_dir.glob("*.mp3")):
        print(f"  [OK] {mp3_file.name}")
