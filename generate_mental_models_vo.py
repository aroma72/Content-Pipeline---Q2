#!/usr/bin/env python3
"""Generate voiceover for Session 2: 5 Mental Models video."""

import os
import sys
from pathlib import Path

try:
    from elevenlabs.client import ElevenLabs
    from elevenlabs import VoiceSettings
    HAS_SDK = True
except ImportError:
    HAS_SDK = False
    import requests

VOICE_ID = "EXAVITQu4vr4xnSDxMaL"   # Sarah v2 — ElevenLabs default professional voice
MODEL_ID = "eleven_multilingual_v2"

SCRIPT = """This course is built around five mental models. Not five topics. Five ways of thinking — each one changing how you approach building with AI. Master these five, and everything else follows.

The first model is the mindset shift. Before you write a prompt or build a system, your thinking has to change. Most people see AI as a tool that answers questions. Producers see it as a collaborator they design. This is where the course begins — with how you see AI, not just how you use it.

The second model is agent fundamentals. An agent is not a chatbot. It is a system that perceives its environment, makes decisions, and takes action — without waiting for your next instruction. You will learn how to design agents that are reliable, purposeful, and scoped correctly from the start.

The third model is memory engineering. A system without memory starts over every single time. You will learn how to give your agents a past — how to store, retrieve, and reason over information across sessions, documents, and entire knowledge bases.

The fourth model is real-world tools. An agent with no access to the world can only think. You will learn how to connect agents to APIs, databases, calendars, and communication platforms — so they can act, not just advise.

The fifth model is multi-agent systems. The most powerful workflows are not run by one agent. They are run by teams of agents — each specialised, each accountable, each handing off to the next. You will learn to design and orchestrate those teams.

Five mental models. Twenty weeks. One goal: to move you from someone who uses AI to someone who builds with it — confidently, deliberately, and at scale. This is where that journey begins."""

def main():
    api_key = os.environ.get('ELEVENLABS_API_KEY')
    if not api_key:
        print("❌ ELEVENLABS_API_KEY not set"); sys.exit(1)

    output = Path("drawing-room-video/drawing-room-remotion/public/voiceover_mental_models.wav")
    output.parent.mkdir(parents=True, exist_ok=True)

    print("🎙️  Generating Mental Models voiceover...")

    if HAS_SDK:
        client = ElevenLabs(api_key=api_key)
        response = client.text_to_speech.convert(
            text=SCRIPT,
            voice_id=VOICE_ID,
            model_id=MODEL_ID,
            voice_settings=VoiceSettings(
                stability=0.47,
                similarity_boost=0.75,
                style=0.0,
                use_speaker_boost=True,
            ),
        )
        with open(output, 'wb') as f:
            for chunk in response:
                f.write(chunk)
    else:
        import requests as req
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
        resp = req.post(url, json={
            "text": SCRIPT,
            "model_id": MODEL_ID,
            "voice_settings": {"stability": 0.47, "similarity_boost": 0.75,
                               "style": 0.0, "use_speaker_boost": True},
        }, headers={"xi-api-key": api_key, "Content-Type": "application/json"})
        resp.raise_for_status()
        with open(output, 'wb') as f:
            f.write(resp.content)

    print(f"✓ Saved to {output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
