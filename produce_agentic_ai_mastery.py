#!/usr/bin/env python3
"""
produce_agentic_ai_mastery.py
Master orchestrator for Agentic AI Mastery video production.
End-to-end pipeline: Render → Generate VO → Professional Sync
"""

import sys
import os
import subprocess
import shutil
import tempfile
import asyncio
from pathlib import Path

# Load environment variables from .env
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
from skills.vo_sync_skill import ProfessionalVOSync

BASE = Path(__file__).parent
REMOTION_DIR = BASE / "drawing-room-video" / "drawing-room-remotion"
OUTPUT_DIR = BASE / "output"
UPDATED_DIR = BASE / "updated"
VO_DIR = BASE / "voiceovers" / "agentic_ai_mastery"

# Video configurations: (composition_id, part_num, title)
VIDEOS = [
    ("AgenticAIMasteryVideo1", 10, "Agentic AI Mastery - Video 1: Cohort Introduction"),
    ("AgenticAIMasteryVideo2", 11, "Agentic AI Mastery - Video 2: What is an AI Agent?"),
    ("AgenticAIMasteryVideo3", 12, "Agentic AI Mastery - Video 3: Claude Code Setup"),
]

# Voice generation configs (scene_id, text, duration_seconds)
VIDEO_1_SCENES = [
    ("agentic_ai_mastery_video_1_scene_1", "Welcome to Agentic AI Mastery. This is the first cohort — a group of practitioners from education technology, coaching, HR, and operations. What brought everyone together is a single question: how do we stop being passive users of AI and start building with it?", 13.0),
    ("agentic_ai_mastery_video_1_scene_2", "On day one, participants shared the tasks consuming their most time. Harim's team spent two to three weeks mapping school curriculum progressions — a task an agent completed in hours. Haroon tracked vendor invoices manually. Usman ran lengthy research cycles before every development task. These are exactly the problems agentic AI is built to solve.", 15.0),
    ("agentic_ai_mastery_video_1_scene_3", "The program is built on one core distinction: consumer versus producer. A consumer uses AI for individual tasks — a prompt here, a summary there. A producer builds systems. Systems that work while you sleep, that improve over time, that compound in value. This cohort is about making that transition deliberately.", 13.0),
    ("agentic_ai_mastery_video_1_scene_4", "Why does this matter especially for an education technology company? Because your mission is scale. You cannot hire your way to personalized learning for every student. You cannot free teachers from administrative burden one task at a time. Agentic AI lets you build systems that do this continuously, at scale, without adding headcount.", 15.0),
    ("agentic_ai_mastery_video_1_scene_5", "The curriculum spans five domains. First, mental model shifts — how you think about AI changes what you build. Second, agent fundamentals and prompting. Third, memory engineering and knowledge graphs. Fourth, real-world tool integration and production deployment. Fifth, autonomous multi-agent systems with guardrails. Each week builds directly on the last.", 14.0),
    ("agentic_ai_mastery_video_1_scene_6", "And a note on what stays human. Participants were clear: coaching debrief sessions, one-on-one team conversations, and relationship-building belong to people. Agentic AI is not about replacing human judgment in those spaces. It is about clearing the administrative and cognitive load so that your human attention goes exactly where it matters most.", 14.0),
    ("agentic_ai_mastery_video_1_scene_7", "The question is no longer whether AI will change your work. It already has. The question now is whether you will be a consumer of that change or a producer of it. Over the next weeks, this cohort will build real agents, deploy real systems, and develop a capability that compounds. That journey starts here.", 21.0),
]

VIDEO_2_SCENES = [
    ("agentic_ai_mastery_video_2_scene_1", "An AI agent is not a chatbot. A chatbot waits for your prompt and responds. An agent perceives its environment, makes decisions based on memory and goals, uses tools to take action, and evaluates the results. The loop is continuous. The human is not required at every step.", 13.0),
    ("agentic_ai_mastery_video_2_scene_2", "Fahad's agent, Rumi, is a live example. Rumi runs on WhatsApp and Microsoft Teams. It attends meetings, sends morning briefings, manages founder tracking, and handles email threads. During Ramadan, while Fahad was at Iftar, Rumi autonomously replied to a colleague's technical email. Not because it was told to — because it perceived the context and acted. That is a production agent.", 16.0),
    ("agentic_ai_mastery_video_2_scene_3", "Think of agent autonomy as a dial from one to five. At level one, the agent drafts and you approve everything. At level three, it executes routine tasks independently. At level five, it operates without any human checkpoint. Most production agents run between two and four. Rumi started at level one. It earned level four over months of observed performance. You build trust incrementally.", 14.0),
    ("agentic_ai_mastery_video_2_scene_4", "What can agents actually do? In research: scan the internet, synthesize findings, flag relevant developments. In drafting: write emails, applications, reports, presentations. In execution: send messages, fill forms, schedule meetings, run code. In tracking: monitor invoices, flag overdue items, update records. Chain these together and you have a workflow that runs autonomously.", 13.0),
    ("agentic_ai_mastery_video_2_scene_5", "But the boundary matters. Agents can research and execute. They cannot build trust. They can draft feedback. They cannot hold space for a difficult conversation. Participants in this cohort drew that line clearly: coaching debrief sessions and one-on-one meetings stay human. The agent clears the path so the human can show up fully.", 15.0),
    ("agentic_ai_mastery_video_2_scene_6", "Agentic AI gets more powerful when agents work together. An orchestrator agent assigns tasks to specialist agents — a research agent finds information, a drafting agent writes it up, a review agent checks for errors — and the output arrives as a finished deliverable. Sabina demonstrated this with a complete fundraising pipeline: agents searched for grants, drafted applications, reviewed them, and sent emails. No human in the loop until the relationship-building stage.", 15.0),
    ("agentic_ai_mastery_video_2_scene_7", "The gap between AI consumers and AI producers is widening every quarter. Consumers use better and better tools. Producers build systems that leverage those tools in ways consumers cannot replicate. The five curriculum domains — mental models, prompting, memory, tools, and multi-agent systems — are the path from one to the other. You are already on it.", 24.0),
]

VIDEO_3_SCENES = [
    ("agentic_ai_mastery_video_3_scene_1", "This video sets up your development environment. Two tools: Cursor, an AI-powered code editor, and Claude Code, Anthropic's AI agent for software development. Together, they form the environment where you will build every agent in this program. No prior coding experience is required.", 13.0),
    ("agentic_ai_mastery_video_3_scene_2", "Cursor is built on top of VS Code, which means any VS Code plugin works inside it. It has three core modes. Chat mode lets you ask questions about your code. Autocomplete suggests lines as you type. Agent mode is where the real work happens: you give it a goal, it plans steps, writes code, creates files, runs commands, and iterates until the task is done.", 15.0),
    ("agentic_ai_mastery_video_3_scene_3", "Step one: visit cursor dot com, download the installer for your operating system, and run it like any standard application. Step two: inside Cursor, open Settings, navigate to Models, and add Claude. To connect Claude, you need an Anthropic API key. Go to console dot anthropic dot com, create a free account, and generate a key from the API Keys section. Paste it into Cursor.", 16.0),
    ("agentic_ai_mastery_video_3_scene_4", "Step three: in the Cursor chat panel, find the mode dropdown and switch to Agent. Step four: give it your first task. Type something like: create a Python script that reads a CSV file and summarizes its contents. You will watch Claude reason through the steps, write the script, create the file, and offer to run it. That sequence — goal to executed output — is agentic behavior in your editor.", 16.0),
    ("agentic_ai_mastery_video_3_scene_5", "Optionally, you can also install Claude Code as a standalone command-line tool. Run: npm install dash dash global at anthropic-ai slash claude-code. This gives you a terminal-based agent that can navigate your entire file system, run multi-step tasks, and work directly in your project directory. For this cohort, both Cursor and the CLI are valid environments.", 15.0),
    ("agentic_ai_mastery_video_3_scene_6", "By now you should have Cursor installed, Claude connected via API key, and Agent mode activated. Run one small task today — ask it to create a folder structure, summarize a document, or draft an email template. Get comfortable with the loop: you give a goal, the agent executes, you review and refine. That loop is the foundation of everything you will build in this cohort. See you in the next session.", 20.0),
]

ALL_SCENE_CONFIGS = [
    ("Video 1", VIDEO_1_SCENES),
    ("Video 2", VIDEO_2_SCENES),
    ("Video 3", VIDEO_3_SCENES),
]


def render_remotion(composition_id: str, output_file: Path) -> bool:
    """Render a Remotion composition."""
    entry_point = "src/index.ts"
    cmd = f'npx remotion render {entry_point} {composition_id} "{output_file}" --fps 30 --width 1920 --height 1080 --allow-downgrade'

    print(f"    Rendering: {composition_id}...")
    result = subprocess.run(cmd, cwd=str(REMOTION_DIR), capture_output=True, text=True, timeout=600, shell=True)

    if result.returncode != 0:
        print(f"    [FAIL] {result.stderr[-300:]}")
        return False

    print(f"    [OK] -> {output_file.name}")
    return True


async def generate_voiceovers_for_videos() -> bool:
    """Generate voiceovers for all videos (batch async call)."""
    skill = VoiceoverGenerationSkill()
    VO_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n  Preparing scenes for ElevenLabs generation...")
    all_scenes = []

    for video_name, scenes in ALL_SCENE_CONFIGS:
        for scene_id, text, duration in scenes:
            all_scenes.append({
                'scene_id': scene_id,
                'text': text,
                'duration_seconds': duration,
                'output_path': str(VO_DIR / f"{scene_id}.mp3"),
            })

    print(f"  Total scenes to generate: {len(all_scenes)}")
    print(f"  Calling VoiceoverGenerationSkill.generate_and_sync_voiceover()...")

    try:
        results = await skill.generate_and_sync_voiceover(all_scenes, auto_trim=True)

        successful = sum(1 for r in results if r['status'] in ['success', 'trimmed'])
        failed = sum(1 for r in results if r['status'] == 'failed')

        print(f"  Voiceover Generation: {successful}/{len(results)} successful")
        if failed > 0:
            print(f"  [WARN] {failed} scenes failed")
            return False

        return True
    except Exception as e:
        print(f"  [FAIL] {str(e)[:100]}")
        return False


def sync_video(part_num: int, input_video: Path, output_path: Path) -> bool:
    """Apply professional VO sync to a rendered video."""
    skill = ProfessionalVOSync()
    workdir = tempfile.mkdtemp(prefix=f"vo_sync_agentic_{part_num}_")

    try:
        print(f"  Syncing Video {part_num - 9}...")
        result = skill.sync_video_professional(
            part_num=part_num,
            input_video=str(input_video),
            output_path=str(output_path),
            audio_base=str(VO_DIR),
            workdir=workdir,
        )
        print(f"    [OK] -> {output_path.name}")
        return True
    except Exception as e:
        print(f"    [FAIL] {str(e)[:100]}")
        return False
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


async def main():
    """Master orchestration of the entire production pipeline."""
    print("\n" + "="*70)
    print("AGENTIC AI MASTERY - PRODUCTION PIPELINE")
    print("="*70)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    UPDATED_DIR.mkdir(parents=True, exist_ok=True)

    all_success = True

    # STAGE 1: Render all Remotion compositions
    print("\n[STAGE 1] Rendering Remotion Compositions")
    print("-" * 70)
    rendered_videos = {}

    for comp_id, part_num, title in VIDEOS:
        video_num = part_num - 9
        print(f"\nVideo {video_num}: {title}")

        output_file = OUTPUT_DIR / f"agentic_ai_mastery_video{video_num}.mp4"
        rendered_videos[part_num] = output_file

        if not render_remotion(comp_id, output_file):
            all_success = False

    # STAGE 2: Generate all voiceovers (async batch)
    print("\n[STAGE 2] Generating Voiceovers via ElevenLabs")
    print("-" * 70)

    if not await generate_voiceovers_for_videos():
        all_success = False

    # STAGE 3: Apply professional VO sync
    print("\n[STAGE 3] Professional VO Sync (Frame-Accurate)")
    print("-" * 70)

    for comp_id, part_num, title in VIDEOS:
        video_num = part_num - 9
        print(f"\nVideo {video_num}")

        input_video = rendered_videos[part_num]
        output_path = UPDATED_DIR / f"agentic_ai_mastery_video{video_num}_FINAL.mp4"

        if input_video.exists():
            if not sync_video(part_num, input_video, output_path):
                all_success = False
        else:
            print(f"  [SKIP] Input video not found: {input_video}")
            all_success = False

    # FINAL SUMMARY
    print("\n" + "="*70)
    if all_success:
        print("SUCCESS: All 3 videos produced with professional VO sync!")
        print(f"Output: {UPDATED_DIR}")
        print("Videos:")
        print("  * agentic_ai_mastery_video1_FINAL.mp4 (105s)")
        print("  * agentic_ai_mastery_video2_FINAL.mp4 (110s)")
        print("  * agentic_ai_mastery_video3_FINAL.mp4 (95s)")
        return 0
    else:
        print("FAILED: Some stages did not complete successfully.")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
