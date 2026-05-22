#!/usr/bin/env python3
"""Generate voiceover for Video 3: Development Environment Setup."""

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

VOICE_ID = "EXAVITQu4vr4xnSDxMaL"   # Sarah v2
MODEL_ID = "eleven_multilingual_v2"

SCRIPT = """Before you build anything, you need the right environment. Three tools. All free to start. All connected. This is your setup.

First — Cursor. Cursor is an AI-native code editor. It looks like VS Code because it's built on it — but unlike VS Code, every part of Cursor is designed for working with AI. You download it from cursor.com. The install takes under two minutes. Once it's open, you have an editor that understands your codebase, answers questions about your code, and writes entire files on your instructions.

Second — Claude Code in Cursor. Claude Code is Anthropic's coding agent. It runs inside Cursor as an extension. Go to the Extensions panel, search for Claude Code, install it. Then open the settings and paste your Anthropic API key. Once that's connected, you have a persistent agent that can read your files, run terminal commands, fix bugs, and build features — without you leaving your editor.

Third — GitHub. GitHub is where your code lives. Go to github.com, create a free account. Then create a new repository — give it a name, set it to private, and copy the URL. Back in Cursor, open the terminal and run three commands: git init, git remote add origin, then your repo URL. From this point forward, every piece of work you do is version-controlled, recoverable, and shareable.

Three tools. One environment. Cursor gives you the editor. Claude Code gives you the agent. GitHub gives you the safety net. This is the foundation every project in this course is built on. Set it up once — use it for everything."""

def main():
    api_key = os.environ.get('ELEVENLABS_API_KEY')
    if not api_key:
        print("ELEVENLABS_API_KEY not set"); sys.exit(1)

    output = Path("drawing-room-video/drawing-room-remotion/public/voiceover_devenv.wav")
    output.parent.mkdir(parents=True, exist_ok=True)

    print("Generating Dev Environment voiceover...")

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

    print(f"Saved to {output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
