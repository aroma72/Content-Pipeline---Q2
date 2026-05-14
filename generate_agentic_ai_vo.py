#!/usr/bin/env python3
"""
generate_agentic_ai_vo.py
Generate voiceovers for 3 Agentic AI Mastery videos using ElevenLabs.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skills.voiceover_generation_skill import VoiceoverGenerationSkill

# Video 1 scenes
VIDEO_1_SCENES = [
    {
        'scene_id': 'agentic_ai_mastery_video_1_scene_1',
        'text': "Welcome to Agentic AI Mastery. This is the first cohort — a group of practitioners from education technology, coaching, HR, and operations. What brought everyone together is a single question: how do we stop being passive users of AI and start building with it?",
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_1_scene_2',
        'text': "On day one, participants shared the tasks consuming their most time. Harim's team spent two to three weeks mapping school curriculum progressions — a task an agent completed in hours. Haroon tracked vendor invoices manually. Usman ran lengthy research cycles before every development task. These are exactly the problems agentic AI is built to solve.",
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_1_scene_3',
        'text': "The program is built on one core distinction: consumer versus producer. A consumer uses AI for individual tasks — a prompt here, a summary there. A producer builds systems. Systems that work while you sleep, that improve over time, that compound in value. This cohort is about making that transition deliberately.",
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_1_scene_4',
        'text': "Why does this matter especially for an education technology company? Because your mission is scale. You cannot hire your way to personalized learning for every student. You cannot free teachers from administrative burden one task at a time. Agentic AI lets you build systems that do this continuously, at scale, without adding headcount.",
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_1_scene_5',
        'text': "The curriculum spans five domains. First, mental model shifts — how you think about AI changes what you build. Second, agent fundamentals and prompting. Third, memory engineering and knowledge graphs. Fourth, real-world tool integration and production deployment. Fifth, autonomous multi-agent systems with guardrails. Each week builds directly on the last.",
        'duration_seconds': 14.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_1_scene_6',
        'text': "And a note on what stays human. Participants were clear: coaching debrief sessions, one-on-one team conversations, and relationship-building belong to people. Agentic AI is not about replacing human judgment in those spaces. It is about clearing the administrative and cognitive load so that your human attention goes exactly where it matters most.",
        'duration_seconds': 14.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_1_scene_7',
        'text': "The question is no longer whether AI will change your work. It already has. The question now is whether you will be a consumer of that change or a producer of it. Over the next weeks, this cohort will build real agents, deploy real systems, and develop a capability that compounds. That journey starts here.",
        'duration_seconds': 21.0
    },
]

# Video 2 scenes
VIDEO_2_SCENES = [
    {
        'scene_id': 'agentic_ai_mastery_video_2_scene_1',
        'text': "An AI agent is not a chatbot. A chatbot waits for your prompt and responds. An agent perceives its environment, makes decisions based on memory and goals, uses tools to take action, and evaluates the results. The loop is continuous. The human is not required at every step.",
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_2_scene_2',
        'text': "Fahad's agent, Rumi, is a live example. Rumi runs on WhatsApp and Microsoft Teams. It attends meetings, sends morning briefings, manages founder tracking, and handles email threads. During Ramadan, while Fahad was at Iftar, Rumi autonomously replied to a colleague's technical email. Not because it was told to — because it perceived the context and acted. That is a production agent.",
        'duration_seconds': 16.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_2_scene_3',
        'text': "Think of agent autonomy as a dial from one to five. At level one, the agent drafts and you approve everything. At level three, it executes routine tasks independently. At level five, it operates without any human checkpoint. Most production agents run between two and four. Rumi started at level one. It earned level four over months of observed performance. You build trust incrementally.",
        'duration_seconds': 14.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_2_scene_4',
        'text': "What can agents actually do? In research: scan the internet, synthesize findings, flag relevant developments. In drafting: write emails, applications, reports, presentations. In execution: send messages, fill forms, schedule meetings, run code. In tracking: monitor invoices, flag overdue items, update records. Chain these together and you have a workflow that runs autonomously.",
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_2_scene_5',
        'text': "But the boundary matters. Agents can research and execute. They cannot build trust. They can draft feedback. They cannot hold space for a difficult conversation. Participants in this cohort drew that line clearly: coaching debrief sessions and one-on-one meetings stay human. The agent clears the path so the human can show up fully.",
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_2_scene_6',
        'text': "Agentic AI gets more powerful when agents work together. An orchestrator agent assigns tasks to specialist agents — a research agent finds information, a drafting agent writes it up, a review agent checks for errors — and the output arrives as a finished deliverable. Sabina demonstrated this with a complete fundraising pipeline: agents searched for grants, drafted applications, reviewed them, and sent emails. No human in the loop until the relationship-building stage.",
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_2_scene_7',
        'text': "The gap between AI consumers and AI producers is widening every quarter. Consumers use better and better tools. Producers build systems that leverage those tools in ways consumers cannot replicate. The five curriculum domains — mental models, prompting, memory, tools, and multi-agent systems — are the path from one to the other. You are already on it.",
        'duration_seconds': 24.0
    },
]

# Video 3 scenes
VIDEO_3_SCENES = [
    {
        'scene_id': 'agentic_ai_mastery_video_3_scene_1',
        'text': "This video sets up your development environment. Two tools: Cursor, an AI-powered code editor, and Claude Code, Anthropic's AI agent for software development. Together, they form the environment where you will build every agent in this program. No prior coding experience is required.",
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_3_scene_2',
        'text': "Cursor is built on top of VS Code, which means any VS Code plugin works inside it. It has three core modes. Chat mode lets you ask questions about your code. Autocomplete suggests lines as you type. Agent mode is where the real work happens: you give it a goal, it plans steps, writes code, creates files, runs commands, and iterates until the task is done.",
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_3_scene_3',
        'text': "Step one: visit cursor dot com, download the installer for your operating system, and run it like any standard application. Step two: inside Cursor, open Settings, navigate to Models, and add Claude. To connect Claude, you need an Anthropic API key. Go to console dot anthropic dot com, create a free account, and generate a key from the API Keys section. Paste it into Cursor.",
        'duration_seconds': 16.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_3_scene_4',
        'text': "Step three: in the Cursor chat panel, find the mode dropdown and switch to Agent. Step four: give it your first task. Type something like: create a Python script that reads a CSV file and summarizes its contents. You will watch Claude reason through the steps, write the script, create the file, and offer to run it. That sequence — goal to executed output — is agentic behavior in your editor.",
        'duration_seconds': 16.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_3_scene_5',
        'text': "Optionally, you can also install Claude Code as a standalone command-line tool. Run: npm install dash dash global at anthropic-ai slash claude-code. This gives you a terminal-based agent that can navigate your entire file system, run multi-step tasks, and work directly in your project directory. For this cohort, both Cursor and the CLI are valid environments.",
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'agentic_ai_mastery_video_3_scene_6',
        'text': "By now you should have Cursor installed, Claude connected via API key, and Agent mode activated. Run one small task today — ask it to create a folder structure, summarize a document, or draft an email template. Get comfortable with the loop: you give a goal, the agent executes, you review and refine. That loop is the foundation of everything you will build in this cohort. See you in the next session.",
        'duration_seconds': 20.0
    },
]

def generate_voiceovers():
    """Generate all voiceovers for the 3 Agentic AI Mastery videos."""
    skill = VoiceoverGenerationSkill()

    voiceover_base = Path(__file__).parent / 'voiceovers' / 'agentic_ai_mastery'
    voiceover_base.mkdir(parents=True, exist_ok=True)

    all_scenes = [
        ('Video 1', VIDEO_1_SCENES),
        ('Video 2', VIDEO_2_SCENES),
        ('Video 3', VIDEO_3_SCENES),
    ]

    for video_name, scenes in all_scenes:
        print(f"\n{'='*60}")
        print(f"Generating voiceovers for {video_name}")
        print(f"{'='*60}")

        for scene in scenes:
            output_path = voiceover_base / f"{scene['scene_id']}.mp3"

            print(f"\n{scene['scene_id']}")
            print(f"  Duration: {scene['duration_seconds']:.1f}s")
            print(f"  Text: {scene['text'][:60]}...")

            try:
                skill.generate_and_sync_voiceover(
                    scene_id=scene['scene_id'],
                    narration_text=scene['text'],
                    target_duration=scene['duration_seconds'],
                    output_path=str(output_path)
                )
                print(f"  [OK] -> {output_path.name}")
            except Exception as e:
                print(f"  [FAIL] {e}")
                return 1

    print(f"\n{'='*60}")
    print("All voiceovers generated successfully!")
    print(f"Output directory: {voiceover_base}")
    return 0


if __name__ == "__main__":
    sys.exit(generate_voiceovers())
