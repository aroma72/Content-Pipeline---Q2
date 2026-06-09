#!/usr/bin/env python3
"""
Generate voiceover for "Consumer to Producer Mindset in AI" video.
Uses ElevenLabs v2 (Rachel voice, moderate-energetic style).
"""

import os
import sys
from pathlib import Path
import requests
from dotenv import load_dotenv

# Load environment
load_dotenv(Path(__file__).parent.parent / ".env")

API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not API_KEY:
    print("ERROR: ELEVENLABS_API_KEY not found in .env")
    sys.exit(1)

VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel
BASE_URL = "https://api.elevenlabs.io/v1"

# Full script with pauses converted to text (ElevenLabs doesn't respect [PAUSE] markers)
VO_TEXT = """You're using AI every day. But are you using it, or building with it?

If you've been using ChatGPT to write emails, generate code, summarize articles, and now I'm asking you to think about building systems, you might feel like we just changed the rules on you.

That's completely normal. Everyone starts as a consumer. And if you're feeling a little confused about what "producer" even means—that's exactly the right place to be.

This video is about one shift in how you think that changes everything.

Let's name the consumer mindset first. It's probably how you started with AI.

You see a tool, you ask it a question, you get an answer. Linear. Direct.

ChatGPT, write my email. Done. You take the output and move on.

Claude, explain this concept. You read the explanation and continue.

This isn't bad—it's just limited. The consumer mindset is bounded by what the tool offers. You're reactive: What can this tool do for me? You ask a question, you get a response, the interaction ends.

And here's the thing: billions of people use AI this way every day, and they get real value from it.

But if you're here, in this course, you're probably wondering: What else is possible?

The producer mindset is different. It's not what can this tool do for me?

It's: What could I build with this?

A producer thinks in systems. They ask: What problem am I solving? What data do I have? What feedback loop could help me improve continuously? How can I compose multiple tools, not just use one in isolation?

Now, this might sound abstract. Systems? Feedback loops? That can feel technical and distant.

But here's the truth: you already think like a producer. You think like a producer when you solve a problem with your friends—you gather input, you try different approaches, you see what works, you iterate. You think like a producer when you improve a process you care about—maybe it's cooking, or organizing your time, or helping someone learn. You already do this.

We're just extending that same thinking to AI systems.

A producer uses AI as leverage—a way to amplify their thinking, to automate the routine parts, to learn and improve continuously. They build something that gets better over time, not just a one-off interaction.

Here's what this looks like in practice, across different industries.

Manufacturing: Consumer mindset: Use AI to give me advice on optimization. You ask ChatGPT how to optimize your production line, it gives you ideas, you read them, maybe you implement one.

Producer mindset: Build a system that continuously monitors sensor data from your machines, predicts equipment failures three days before they happen, and automatically adjusts production parameters in real time to maximize output while minimizing defects.

The shift: Instead of asking what should I do, ask what can I measure, what patterns can I learn, and how do I close the feedback loop?

Healthcare: Consumer: A clinician asks an AI system for diagnostic info. The AI returns general ideas. Helpful, but static.

Producer: Build a diagnostic assistant that integrates a patient's entire medical history, lab results, imaging data, and learned patterns from thousands of previous cases. The system gets smarter as it sees more patients and their outcomes. It becomes a true clinical decision partner.

The shift: Instead of using AI as a lookup tool, use it as a decision multiplier—something that makes your experts better and more confident.

Sports and Fitness: Consumer: AI, analyze my tennis game. ChatGPT gives you general tips about technique. Useful, but generic.

Producer: Build a system that analyzes every shot from video, tracks your movement patterns and fatigue levels, predicts when you're likely to get injured, and recommends personalized training adjustments based on what actually improves YOUR game, not generic advice.

Think about the difference: A coach gives you feedback once a week. A producer system gives you feedback every single session, learns what works for you, and gets smarter all the time.

The shift: Move from get me feedback to build me a system that learns and adapts to me.

Finance: Consumer: Analyze my investment portfolio. ChatGPT gives you some basic thoughts. You read them. You might act on one.

Producer: Build a system that models 100 plus market scenarios, backtests different strategies against your historical data, manages risk dynamically based on your tolerance, and recommends allocation changes that continuously optimize your returns. It works 24/7 while you sleep.

The shift: Instead of asking AI to think for you, build a system that augments your thinking and works continuously.

Notice the pattern across all of these? Consumer uses AI as a lookup tool. Producer builds AI as a system that learns and improves. The difference isn't the technology—it's the thinking.

So how do you actually make this shift? Here are five things to start doing today.

One: Change your question.

Don't ask What can ChatGPT do for me? Ask What problem am I solving? How could I build a system that solves this better?

Two: Identify the feedback loop.

Every producer system has one. Input, process, output, feedback, learning, improvement. If you can't see the loop, you're still thinking like a consumer.

Three: Compose, don't just consume.

Don't rely on one tool. Connect multiple models, datasets, and tools together. Let them work as a system.

Four: Measure everything.

If you can't measure it, you can't improve it. Set success criteria. Track outcomes. Use data to iterate.

Five: Think in systems.

Ask: What's the input? What's the process? What's the output? What's the feedback? How does it learn? When you ask these five questions, you're thinking like a producer.

This shift from consumer to producer mindset is exactly what the rest of this course teaches.

In the coming weeks, you'll learn how to build these systems. You'll learn system design, how to compose tools and models, how to set up feedback loops, how to measure and iterate, and how to deploy solutions that scale.

You're not just learning to use AI. You're learning to think like a producer. You're learning to build.

And that's where the real power is.

Let's go."""

OUT_DIR = Path(__file__).parent.parent / "video_production" / "consumer-to-producer-mindset"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / "consumer_producer_vo.mp3"

def main():
    url = f"{BASE_URL}/text-to-speech/{VOICE_ID}"
    headers = {"xi-api-key": API_KEY, "Content-Type": "application/json"}

    payload = {
        "text": VO_TEXT,
        "model_id": "eleven_turbo_v2",
        "voice_settings": {
            "stability": 0.45,        # Natural variation, clear delivery
            "similarity_boost": 0.75, # Strong voice consistency
            "style": 0.35,            # Moderate energy, conversational
            "use_speaker_boost": True,
        },
    }

    word_count = len(VO_TEXT.split())
    print(f"Generating voiceover ({word_count} words): Consumer to Producer Mindset")
    print(f"Voice: Rachel v2 (eleven_turbo_v2)")
    print(f"Settings: stability=0.45, similarity_boost=0.75, style=0.35")

    r = requests.post(url, json=payload, headers=headers, timeout=60)

    if r.status_code != 200:
        print(f"ERROR {r.status_code}: {r.text}")
        sys.exit(1)

    OUT_FILE.write_bytes(r.content)
    file_size_mb = len(r.content) / (1024 * 1024)
    print(f"✓ Voiceover generated successfully")
    print(f"  Location: {OUT_FILE}")
    print(f"  Size: {file_size_mb:.2f} MB")
    print(f"  Expected duration: ~300 seconds (5:00)")
    print(f"\nNext steps:")
    print(f"  1. Verify audio duration matches expected 5:00")
    print(f"  2. Listen for pacing and mentor tone")
    print(f"  3. If OK, proceed to Step 4 (Visual Design)")
    print(f"  4. Render Remotion components with audio sync")

if __name__ == "__main__":
    main()
