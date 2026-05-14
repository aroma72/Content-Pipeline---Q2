#!/usr/bin/env python3
"""
Generate voiceovers for Autonomous Systems Session 3-part video series.
Uses ElevenLabs API for professional TTS.
"""

import os
import requests
from pathlib import Path
from datetime import datetime

# Configuration
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_URL = "https://api.elevenlabs.io/v1"
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Professional male voice (Adam)
OUTPUT_DIR = Path("voiceovers/autonomous_session")

# Video content
VIDEOS = {
    1: {
        "title": "Part 1: Consumer vs Producer Mindset",
        "duration": "3m 45s",
        "scenes": {
            "1_opening": {
                "text": """You're using AI in two fundamentally different ways.
You might be a consumer — telling it what to do, step by step.
Or you might be a producer — setting goals and letting it figure out the path.
This distinction changes everything about what you can build and what's possible.""",
                "duration": 15
            },
            "2_consumer": {
                "text": """The Consumer Mindset works like this:
You tell the system exactly what to do. Every command. Every step.
The system waits for instructions. It listens. It executes only what you tell it.
It has no independent thought. It cannot deviate. It's entirely dependent on external control.

Think of it as micromanagement at scale:
- You make all the decisions
- You provide all the direction
- The system just follows orders
- Human dependency is high
- It scales only as much as you can instruct""",
                "duration": 35
            },
            "3_problem": {
                "text": """This works for simple tasks. But as complexity grows, the consumer mindset breaks:
- You become the bottleneck
- Every decision requires your input
- You can't scale faster than you can give commands
- The system never learns from mistakes
- You're constantly telling it what to fix""",
                "duration": 20
            },
            "4_producer": {
                "text": """The Producer Mindset is different. It says:
Here is the goal. Figure it out.

With a producer mindset:
- The system determines its own execution
- It needs minimal human input
- It makes decisions within parameters you set
- It takes ownership of the outcome
- It learns and improves over time

Instead of: 'Fix this error, here's what's wrong'
You say: 'The system is down. Fix it.'

And it does.

This is autonomy. The system manages itself.
You set direction. It handles execution.""",
                "duration": 60
            },
            "5_why_matters": {
                "text": """When you shift to producer thinking, remarkable things happen:
- Human dependency drops
- System capability increases
- Problems get solved without your intervention
- The system learns from failures
- Scaling happens automatically

The more a system does on its own, the more it accomplishes.
The more valuable it becomes.

This is not about replacing humans. It's about freeing humans from repetitive decisions so they can focus on what matters: strategy, relationships, and judgment calls that only humans should make.""",
                "duration": 50
            },
            "6_shift": {
                "text": """The gap between consumer and producer users is widening.
Consumers use better and better tools, but stay reactive.
Producers build systems that compound and scale.

When you're building with AI — whether agents, workflows, or assistants — ask yourself:
Am I telling it what to do, or am I building something that knows what to do?

That distinction determines everything.
Next: How do we actually measure if autonomy is working?""",
                "duration": 45
            }
        }
    },
    2: {
        "title": "Part 2: Autonomy & Evaluation",
        "duration": "3m 50s",
        "scenes": {
            "1_what_is": {
                "text": """Autonomy is the core of everything we've been discussing.
At its heart, autonomy means: reduced human dependency.
But it's more nuanced than that.

True autonomy has seven dimensions that work together.""",
                "duration": 20
            },
            "2_seven_pillars": {
                "text": """One: Self-Direction — The system charts its own course based on goals, not instructions.

Two: Ownership — It takes responsibility for outcomes. If something goes wrong, it figures out why.

Three: Agency — It initiates action. It doesn't wait for permission to start.

Four: Initiative — It moves without prompting. It sees problems and acts.

Five: Independence — It needs minimal human input. It makes decisions within boundaries.

Six: Capability — It can actually do the work. You've given it the right skills and tools.

Seven: Learning — Each mistake becomes data. Next time, it performs better.

Together, these define true autonomy.
It's not one thing. It's a system working on all fronts.""",
                "duration": 70
            },
            "3_why_measure": {
                "text": """You've built an autonomous system. Now what?
How do you know it's working?
How do you know it's safe?
How do you know it's actually better than manual work?

This is where evaluation comes in.

Evaluation answers: Is this system doing the right thing?
Not just: Is it doing something?

These are completely different questions.""",
                "duration": 40
            },
            "4_testing_vs": {
                "text": """Testing asks: Does this system work?
- Does the login work?
- Does the button click?
- Does it return the right data?

Evaluation asks: Is this system right?
- Is it safe to deploy?
- Will it cause harm?
- Is it making the right decisions?

Testing is about functionality. Evaluation is about judgment.

A system can pass every test and still be wrong.
Think of it: A model that writes perfectly grammatical text but recommends something harmful.
It passed the test. It failed the evaluation.""",
                "duration": 50
            },
            "5_three_levels": {
                "text": """Level One: Automated Testing
Using tools like Chrome MCP to verify functionality in real conditions.
Open the browser, test the behavior, verify the output.

Level Two: Safety Hooks
Pre-execution checks that stop dangerous actions before they happen.
Rules like: Never delete the database without permission.

Level Three: LLM as Judge
Another AI system evaluates the first system's work.
Did it make the right decision?
Is this output appropriate?
How confident should we be?""",
                "duration": 40
            },
            "6_gap": {
                "text": """The gap between testing and evaluation is where most failures happen.
Close that gap, and you build systems you can trust.""",
                "duration": 10
            }
        }
    },
    3: {
        "title": "Part 3: Building & Testing Autonomous Systems",
        "duration": "3m 55s",
        "scenes": {
            "1_challenge": {
                "text": """Building autonomous systems is exciting, but it has a problem.
The system will fail. Repeatedly.
It will try to do something. It will break. You'll have to step in and fix it.

The question is: How do we close the gap between failures and fixes?
How do we accelerate learning?

The answer: We automate testing and evaluation.""",
                "duration": 18
            },
            "2_three_tools": {
                "text": """Tool One: Chrome MCP
This lets your AI agents test your application in the browser.
Just like you would — clicking buttons, filling forms, verifying results.
But the agent does it automatically.

Your agent can now verify: Does it look right? Does it work right?

Tool Two: BDD Test Cases
BDD stands for Behavior-Driven Development.
Instead of technical test code, you write human-readable scenarios:

Given the user is logged in
When they click the invite button
Then an email is sent
And the user appears in the list

The agent reads these and verifies them.

Tool Three: Skills
A skill is a reusable instruction set.
Instead of telling your agent the same thing each time, you create a skill.
You build the logic once. The agent uses it forever.

This is the foundation of producer thinking.""",
                "duration": 52
            },
            "3_workflow": {
                "text": """Here's how they work together:

Step One: Create a Plan
You define what you want to build.
- What are the features?
- What should each feature do?
- What are the success criteria?

Step Two: Generate BDD Test Cases
From the plan, you generate test cases in Behavior-Driven format.
These become your truth. If it passes these, it's done.

Step Three: Implement
Your agent builds the feature.
It writes the code, creates the database schema, sets up the endpoints.

Step Four: Test in Browser
Using Chrome MCP, your agent opens the browser.
It runs through every test case manually, just like a human QA would.
It takes screenshots. It checks for errors.

Step Five: Safe Execution with Hooks
Before the agent does anything risky, hooks verify:
- Is this safe?
- Do I have permission?
- Will this break something?

If anything fails, it stops and asks for help.

Step Six: Evaluate with LLM as Judge
An evaluation agent reviews the work:
- Does it match the plan?
- Is the code quality good?
- Are there edge cases missed?

This is continuous improvement.""",
                "duration": 70
            },
            "4_why_works": {
                "text": """Without this system:
- You test manually every time
- Bugs slip to production
- The same mistakes happen repeatedly
- You're the bottleneck

With this system:
- Testing is automated
- Bugs are caught in the development phase
- Patterns are learned and prevented
- You focus on strategy, not repetition

The agent becomes better with each cycle.
It learns from mistakes.
It stops making the same errors.""",
                "duration": 40
            },
            "5_real_example": {
                "text": """Let's say you're building a payment feature.

Without autonomy:
Write code — Test manually — Fix bugs — Test again — Deploy — Something breaks in production

With producer mindset:
Write spec — Generate tests — Agent implements — Agent tests in browser — Hooks prevent risky actions — LLM judges quality — Auto-deploy when criteria met

The human time? Same or less.
The quality? Much higher.
The learning? Continuous.

This is what scales.""",
                "duration": 45
            },
            "6_next_step": {
                "text": """The question isn't whether to automate testing and evaluation.
It's: What will you automate first?

Start small. One feature. One set of BDD test cases.
Watch what happens.

Then scale it.""",
                "duration": 10
            }
        }
    }
}

def generate_voiceover(text, scene_name, video_num):
    """Generate voiceover using ElevenLabs API."""
    if not ELEVENLABS_API_KEY:
        print("ERROR: ELEVENLABS_API_KEY not set")
        return False

    url = f"{ELEVENLABS_URL}/text-to-speech/{VOICE_ID}"

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    try:
        print(f"  [*] Generating: Part {video_num} - {scene_name}")
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()

        output_file = OUTPUT_DIR / f"part_{video_num}_{scene_name}.mp3"
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, "wb") as f:
            f.write(response.content)

        size_mb = output_file.stat().st_size / (1024 * 1024)
        print(f"      [OK] Saved: {output_file.name} ({size_mb:.2f} MB)")
        return True

    except requests.exceptions.RequestException as e:
        print(f"      [ERROR] {e}")
        return False

def main():
    print("=" * 70)
    print("AUTONOMOUS SYSTEMS SESSION - VOICEOVER GENERATION")
    print("=" * 70)

    total_videos = len(VIDEOS)
    success_count = 0

    for video_num, video_data in VIDEOS.items():
        print(f"\n[VIDEO {video_num}] {video_data['title']} ({video_data['duration']})")
        print("-" * 70)

        video_success = 0
        for scene_name, scene_data in video_data["scenes"].items():
            if generate_voiceover(scene_data["text"], scene_name, video_num):
                video_success += 1

        success_count += min(1, video_success)  # Count video as success if at least one scene works
        print(f"[OK] {video_success}/{len(video_data['scenes'])} scenes generated")

    # Summary
    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print(f"{'=' * 70}")
    print(f"Videos processed: {total_videos}")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"\nVoiceovers ready for:")
    print(f"  1. Part 1: Consumer vs Producer (3m 45s, 225 frames @ 30fps)")
    print(f"  2. Part 2: Autonomy & Evaluation (3m 50s, 230 frames @ 30fps)")
    print(f"  3. Part 3: Building & Testing (3m 55s, 235 frames @ 30fps)")
    print(f"\nNext steps:")
    print(f"  1. Create Remotion compositions for each part")
    print(f"  2. Sync VO with scene timings")
    print(f"  3. Render final videos with audio")
    print(f"{'=' * 70}")

if __name__ == "__main__":
    main()
