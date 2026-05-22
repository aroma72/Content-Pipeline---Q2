#!/usr/bin/env python3
"""
Generate Session 2 voiceover segments using ElevenLabs API.
"""

import os
import sys
from pathlib import Path

# Try importing elevenlabs, fall back to requests if needed
try:
    from elevenlabs.client import ElevenLabs
    from elevenlabs import Voice, VoiceSettings
    HAS_ELEVENLABS = True
except ImportError:
    HAS_ELEVENLABS = False
    import requests
    import json

def generate_voiceover_segment(text, segment_id, output_path):
    """Generate voiceover for a segment."""

    api_key = os.environ.get('ELEVENLABS_API_KEY')
    if not api_key:
        print(f"❌ ELEVENLABS_API_KEY not set")
        return False

    print(f"🎙️  Generating voiceover for Segment {segment_id}...")

    if HAS_ELEVENLABS:
        # Use elevenlabs client
        client = ElevenLabs(api_key=api_key)

        try:
            response = client.text_to_speech.convert(
                text=text,
                voice_id="ErXwobaYp333m50WqvsW",  # Clara voice (professional, warm)
                model_id="eleven_monolingual_v1",
                voice_settings=VoiceSettings(
                    stability=0.47,
                    similarity_boost=0.75,
                    style=0.0,
                    use_speaker_boost=True,
                ),
            )

            # Write audio to file
            with open(output_path, 'wb') as f:
                for chunk in response:
                    f.write(chunk)

            print(f"✓ Segment {segment_id} voiceover saved to {output_path}")
            return True

        except Exception as e:
            print(f"❌ Error generating Segment {segment_id}: {e}")
            return False
    else:
        # Fallback: use direct API request
        url = "https://api.elevenlabs.io/v1/text-to-speech/ErXwobaYp333m50WqvsW"
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json",
        }
        body = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.47,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
            }
        }

        try:
            response = requests.post(url, json=body, headers=headers)
            response.raise_for_status()

            with open(output_path, 'wb') as f:
                f.write(response.content)

            print(f"✓ Segment {segment_id} voiceover saved to {output_path}")
            return True

        except Exception as e:
            print(f"❌ Error generating Segment {segment_id}: {e}")
            return False

def main():
    """Generate both Session 2 voiceover segments."""

    # Segment 1 script (90 seconds)
    segment1_text = """Welcome to Agentic AI Mastery. In the next 14 weeks, something fundamental is going to shift in how you think about artificial intelligence.

Most people use AI. They ask ChatGPT questions. They use tools that others built. That's the consumer mindset — and it has a hard ceiling.

But there's another path. There's a producer mindset.

Producers don't just use AI. They build with it. They design agents, systems, and workflows that amplify their capabilities. They turn AI into their unfair advantage.

The difference between these two approaches? It determines everything — your career trajectory, the problems you can solve, the impact you can have.

This course exists for one reason: to move you from consumer to producer. Not in theory. In practice. By week 14, you won't just understand AI. You'll be building with it."""

    # Segment 2 script (90 seconds)
    segment2_text = """So what happens in these 14 weeks?

You'll master five foundations. How to design agents that work autonomously. How to architect memory systems that scale. How to integrate AI into real-world workflows. How to build multi-agent systems that collaborate. And how to evaluate when and where AI actually adds value.

But here's what makes this rare: You'll do this through real projects. Not tutorials. Real problems, real constraints, real iterations.

By the end, you'll have gone through the complete journey — from understanding why agentic AI matters, to building your first autonomous system, to deploying production-grade solutions.

This isn't about becoming an AI researcher. It's about becoming someone who builds confidently with AI. Someone who understands not just the technology, but the strategy, the systems thinking, the human elements.

The producer mindset doesn't come from watching. It comes from doing. Over the next 14 weeks, you're going to do a lot.

Let's begin."""

    output_dir = Path("voiceover_session2")
    output_dir.mkdir(exist_ok=True)

    segment1_output = output_dir / "session2_segment1.wav"
    segment2_output = output_dir / "session2_segment2.wav"

    # Generate both segments
    result1 = generate_voiceover_segment(segment1_text, 1, str(segment1_output))
    result2 = generate_voiceover_segment(segment2_text, 2, str(segment2_output))

    if result1 and result2:
        print("\n✅ Session 2 voiceovers generated successfully!")
        print(f"   Segment 1: {segment1_output}")
        print(f"   Segment 2: {segment2_output}")
        return 0
    else:
        print("\n❌ Failed to generate one or more voiceovers")
        return 1

if __name__ == "__main__":
    sys.exit(main())
