"""Generate voiceovers for Autonomous Systems Parts 2, 3, 4"""

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skills.voiceover_generation_skill import VoiceoverGenerationSkill

PART2_SCENES = [
    {
        'scene_id': 'part2_scene1',
        'text': 'We just finished Part One. You learned about two mindsets: Consumer and Producer. Now comes the critical question. How do you know if a system is actually autonomous? That is what Part Two is about. Testing versus evaluation. Does it work, or is it right?',
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'part2_scene2',
        'text': 'Let me tell you a story. A company built an autonomous system. All their tests passed. Performance was excellent. They deployed it. Two weeks later, users report problems. The system makes decisions that seem right on paper but cause real harm. How did this happen? The tests passed. Here is the thing. Testing checks if your code works. But evaluation checks if your system actually solves the problem it is supposed to solve. That is the difference.',
        'duration_seconds': 16.0
    },
    {
        'scene_id': 'part2_scene3',
        'text': 'Testing asks: Does the code run? Does it break? If I give it input X, do I get output Y? Testing is important. You definitely need it. But it is narrow. It is focused on the code. Evaluation asks a different question. Does the system achieve its goals? Does the output actually help users? Is it high quality?',
        'duration_seconds': 16.0
    },
    {
        'scene_id': 'part2_scene4',
        'text': 'Think of it this way. Testing is like checking: Does the machine work? Does it turn on? Does it stop when I turn it off? Evaluation is like asking: Does the product that comes out of the machine actually work for customers? Can they use it? Do they like it? Both matter. But they are measuring different things.',
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'part2_scene5',
        'text': 'Here is the key insight. A test can pass, but evaluation can fail. And that means you have a problem. You need both. Testing ensures the system is technically sound. Evaluation ensures it is actually useful.',
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'part2_scene6',
        'text': 'When you build an autonomous system, you are responsible for what it does. If your system gives wrong information, harms users, or produces garbage, that is on you. Evaluation is how you catch these problems before they reach users. Evaluation is how you know: Is my system ready to ship? What should I improve? Am I making progress?',
        'duration_seconds': 16.0
    },
    {
        'scene_id': 'part2_scene7',
        'text': 'Without evaluation, you are flying blind. With evaluation, you have data. You can say: Last week, success rate was ninety percent. Today it is eighty eight percent. Something broke. Let me investigate. Without evaluation, you do not know until users complain. With evaluation, you catch problems early. That is the power of evaluation.',
        'duration_seconds': 15.0
    }
]

PART3_SCENES = [
    {
        'scene_id': 'part3_scene1',
        'text': 'Part Two taught you the difference between testing and evaluation. Now you need to know how to evaluate. There are four methods. Each one measures something different. Each one is useful in different situations. Your job is to pick the right methods for your system.',
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'part3_scene2',
        'text': 'Method one is code review. A human or another system looks at the code and asks: Does the logic make sense? Are there bugs? Are there edge cases that break it? Code review is powerful for finding logical errors, security issues, and performance problems.',
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'part3_scene3',
        'text': 'When should you use code review? Any system with explicit decision logic. If your system has rules, conditionals, or orchestration, code review catches problems before runtime. The limitation is that code review cannot catch behavioral problems. A system might have perfect code but still give users wrong answers or be too slow.',
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'part3_scene4',
        'text': 'Method two is end to end testing. You take real inputs, run them through the system, and check if the output is correct. This tests the whole system, not just the code. It answers the question: When real data flows through, does the system produce the right result?',
        'duration_seconds': 14.0
    },
    {
        'scene_id': 'part3_scene5',
        'text': 'When should you use end to end testing? Multi stage systems, integrations, anything where the final output matters more than the logic. The limitation is that end to end testing is sample based. You cannot test every input combination. If an edge case exists that you did not test, it slips through.',
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'part3_scene6',
        'text': 'Method three is safety hooks. You add checks during execution. If something looks wrong, stop and alert instead of proceeding. Think of it as circuit breakers for your system. You prevent disasters by halting before they happen.',
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'part3_scene7',
        'text': 'When should you use safety hooks? High risk systems where failure has real consequences. Anything touching money, health, security, or user data should have safety hooks. Safety hooks do not prevent problems. They prevent disasters. They catch the ones that matter most.',
        'duration_seconds': 14.0
    },
    {
        'scene_id': 'part3_scene8',
        'text': 'Method four is LLM as judge. You use another language model to evaluate your system output. Does this response sound helpful? Professional? Accurate? LLM as judge evaluates subjective qualities that are hard to measure with code.',
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'part3_scene9',
        'text': 'When should you use LLM as judge? Anything involving natural language generation, tone, helpfulness, alignment. The limitation is that you are using an LLM to judge an LLM. It works surprisingly well, but it is not perfect. You need careful prompt design.',
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'part3_scene10',
        'text': 'Here is the key: You do not use one method. You use all of them, but for different purposes. Code review for logic. End to end testing for correctness. Safety hooks for risk. LLM as judge for quality. Together, they give you confidence that your system is actually working.',
        'duration_seconds': 15.0
    }
]

PART4_SCENES = [
    {
        'scene_id': 'part4_scene1',
        'text': 'You now understand what evaluation is. You know four methods to do it. But how do you actually build it? How do you make evaluation part of your system forever? That is what Part Four teaches you.',
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'part4_scene2',
        'text': 'First, understand your system. Not the code. The purpose. What is your system supposed to do? Be specific. Write it down. This is your north star. Everything else flows from this. Metrics come from this. Evaluation methods come from this.',
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'part4_scene3',
        'text': 'Second, define three to five metrics that measure success. Not just any metrics. Metrics that matter for your system purpose. Do not measure what is easy to measure. Measure what matters. Set baselines. You will refine as you measure.',
        'duration_seconds': 14.0
    },
    {
        'scene_id': 'part4_scene4',
        'text': 'Third, pick evaluation methods for your system. Different systems need different methods. Look at your system. Ask: What could go wrong? Which method catches that? You probably pick two to three methods, not all four.',
        'duration_seconds': 13.0
    },
    {
        'scene_id': 'part4_scene5',
        'text': 'Fourth, build infrastructure to collect and track metrics. You need logs from your system, storage for historical data, and visualization so anyone can see the trend. Start simple. Log success or failure for every run. Store it. Plot weekly trends.',
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'part4_scene6',
        'text': 'Fifth, run the MEASURE loop regularly. Every week: Pull your metrics. How are we doing? Look at failures. What went wrong? Understand why. Compile a summary. Plan one fix. Deploy. Measure again. Repeat. The loop is continuous.',
        'duration_seconds': 15.0
    },
    {
        'scene_id': 'part4_scene7',
        'text': 'You do not build the entire system at once. Week one to two: Define metrics and establish baselines. Week three to four: Implement your first evaluation method. Week five to six: Run your first MEASURE cycle. Week seven and beyond: Add more methods, expand monitoring. In two months, you have a working evaluation system.',
        'duration_seconds': 16.0
    }
]

async def main():
    skill = VoiceoverGenerationSkill()

    if not skill.is_available:
        print("ERROR: ElevenLabs API key not set")
        return False

    output_dir = Path(__file__).parent / 'voiceovers' / 'autonomous_systems'
    output_dir.mkdir(parents=True, exist_ok=True)

    all_scenes = PART2_SCENES + PART3_SCENES + PART4_SCENES

    for scene in all_scenes:
        scene['output_path'] = str(output_dir / f"{scene['scene_id']}.mp3")

    print(f"Generating {len(all_scenes)} voiceovers for Autonomous Systems Parts 2, 3, 4...")
    results = await skill.generate_and_sync_voiceover(all_scenes, auto_trim=True)

    successful = sum(1 for r in results if r['status'] in ['success', 'trimmed'])
    trimmed = sum(1 for r in results if r['status'] == 'trimmed')
    short = sum(1 for r in results if r['status'] == 'short')
    failed = sum(1 for r in results if r['status'] == 'failed')

    print(f"\n{'='*70}")
    print(f"Voiceover Generation Complete: {successful}/{len(results)} scenes ready")
    print(f"{'='*70}")
    print(f"✅ Ready: {successful-trimmed} | 📌 Trimmed: {trimmed} | ⚠️ Too short: {short} | ❌ Failed: {failed}\n")

    for result in results:
        status_icon = {"success": "✅", "trimmed": "📌", "short": "⚠️", "failed": "❌"}.get(result['status'], "?")
        print(f"{status_icon} {result['scene_id']:30} {result.get('message', 'Processing...')}")

    print(f"\n{'='*70}")
    if trimmed > 0:
        print(f"💰 Credit-saving: {trimmed} scenes trimmed instead of regenerated")
    print(f"Voiceovers saved to: {output_dir}")

    return successful == len(results)

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
