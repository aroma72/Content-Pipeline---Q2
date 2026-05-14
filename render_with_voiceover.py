#!/usr/bin/env python3
"""
Render video with voiceover - Part 1 Autonomous Systems
Generates natural narration and integrates with video using ffmpeg.
"""

import asyncio
import subprocess
import json
from pathlib import Path
import sys
import os

sys.path.insert(0, str(Path(__file__).parent))

from skills.voiceover_generation_skill import VoiceoverGenerationSkill, VOICES
from config import VIDEO_PRODUCTION_DIR
from logger import log_info, log_error, log_decision


# Scene data with voiceover script and timing
SCENES_WITH_VOICEOVER = [
    {
        "id": "scene_1_title",
        "duration": 13,
        "start_frame": 0,
        "voiceover": "Welcome to Autonomous Systems. This four-part series explores what it really means for a system to be autonomous. In Part One, we'll examine two fundamentally different mindsets: the Consumer and the Producer. Understanding this distinction is the key to everything that follows.",
    },
    {
        "id": "scene_2_consumer_definition",
        "duration": 13,
        "start_frame": 385,
        "voiceover": "The Consumer Mindset says: Tell me what to do. It's characterized by three core traits: Step by Step—needing detailed instructions for every action. Dependency—constantly requiring guidance and validation. And Human Driven—all decisions come from outside, not from within. This is the default mode for many systems today. They wait. They listen. They execute only what they're told.",
    },
    {
        "id": "scene_3_consumer_visual",
        "duration": 13,
        "start_frame": 770,
        "voiceover": "Here's what that looks like. A human provides all direction. Every command flows one way—from person to system. The system has no independent thought, no ability to deviate from the script. It is entirely dependent on external control. This isn't bad—it's just dependent.",
    },
    {
        "id": "scene_4_producer_definition",
        "duration": 13,
        "start_frame": 1155,
        "voiceover": "The Producer Mindset is different. It says: Here's the goal. Figure it out. It has three defining qualities: Self-Directed—the system determines its own execution path. Independence—minimal human input needed once launched. Autonomous—it makes its own decisions within defined parameters. This is the future of intelligent systems.",
    },
    {
        "id": "scene_5_producer_visual",
        "duration": 13,
        "start_frame": 1540,
        "voiceover": "A system with producer mindset manages itself. Arrows point outward—the system is independent, generating its own action. Yes, there's still a human involved, but that human is no longer micromanaging. The system owns the outcome. This is autonomy.",
    },
    {
        "id": "scene_6_autonomy_concept",
        "duration": 13,
        "start_frame": 1925,
        "voiceover": "But what exactly is autonomy? It's not a single thing. It's seven interconnected concepts radiating from one center: Self-Direction, Ownership, Agency, Initiative, Independence, Capability, and Reduced Dependency. Each builds on the others. Each is necessary. Together, they define what it means for a system to truly be autonomous—not just following orders, but making decisions, taking responsibility, and driving toward goals independently.",
    },
    {
        "id": "scene_7_conclusion",
        "duration": 12,
        "start_frame": 2400,
        "voiceover": "The key insight: Reduced human dependency directly equals increased system capability. The more a system can do on its own, the more it can accomplish. The more it can accomplish, the more valuable it becomes. This is Part One. Next, we'll explore how we know if an autonomous system is actually working. How do we evaluate it? What does right really mean?",
    },
]


async def generate_scene_voiceovers(output_dir: Path) -> dict:
    """Generate voiceover for each scene."""
    skill = VoiceoverGenerationSkill()

    if not skill.is_available:
        log_error("render_with_voiceover", "APIKeyMissing",
                 "ELEVEN_LABS_API_KEY not set")
        print("❌ ElevenLabs API key not found")
        print("Set ELEVEN_LABS_API_KEY environment variable")
        return {}

    print("\n" + "="*70)
    print("GENERATING VOICEOVERS FOR PART 1")
    print("="*70)

    audio_files = {}

    for i, scene in enumerate(SCENES_WITH_VOICEOVER, 1):
        scene_id = scene['id']
        voiceover_text = scene['voiceover']
        output_path = output_dir / f"{scene_id}.mp3"

        print(f"\n📢 Scene {i}/7: {scene_id}")
        print(f"   Duration: {scene['duration']}s")
        print(f"   Text: {len(voiceover_text)} characters")

        try:
            result = await skill.generate_voiceover(
                text=voiceover_text,
                output_path=str(output_path),
                voice_id=VOICES["male_professional"],  # Professional male voice
                stability=0.5,
                similarity_boost=0.75
            )

            if result:
                audio_files[scene_id] = str(output_path)
                print(f"   ✅ Generated: {result['size_mb']:.2f} MB")
            else:
                print(f"   ❌ Failed to generate")

        except Exception as e:
            log_error("render_with_voiceover", "VoiceoverError",
                     f"{scene_id}: {str(e)}")
            print(f"   ❌ Error: {str(e)}")

    return audio_files


def create_audio_concat_file(audio_files: dict, concat_file_path: Path) -> bool:
    """Create ffmpeg concat file for audio segments."""
    try:
        lines = []
        for scene in SCENES_WITH_VOICEOVER:
            scene_id = scene['id']
            if scene_id in audio_files:
                lines.append(f"file '{audio_files[scene_id]}'")

        if not lines:
            return False

        with open(concat_file_path, 'w') as f:
            f.write('\n'.join(lines))

        log_info("render_with_voiceover",
                f"Created concat file: {len(lines)} segments")
        return True

    except Exception as e:
        log_error("render_with_voiceover", "ConcatError", str(e))
        return False


def concatenate_audio(concat_file: Path, output_audio: Path) -> bool:
    """Concatenate audio segments into single file."""
    print(f"\n🔗 Concatenating {len(open(concat_file).readlines())} audio segments...")

    try:
        cmd = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-c', 'aac',
            '-b:a', '128k',
            str(output_audio),
            '-y'
        ]

        result = subprocess.run(cmd, capture_output=True, timeout=300)

        if result.returncode == 0:
            size_mb = output_audio.stat().st_size / (1024 * 1024)
            print(f"✅ Concatenated: {size_mb:.1f} MB")
            log_decision(
                "render_with_voiceover", "audio_concatenated", "success",
                f"Full voiceover: {size_mb:.1f} MB",
                rationale="Ready for video mixing"
            )
            return True
        else:
            log_error("render_with_voiceover", "ConcatFailed",
                     f"ffmpeg error: {result.stderr.decode()}")
            print(f"❌ Concatenation failed")
            return False

    except subprocess.TimeoutExpired:
        log_error("render_with_voiceover", "ConcatTimeout",
                 "Audio concatenation timed out")
        print("❌ Timeout")
        return False
    except Exception as e:
        log_error("render_with_voiceover", "ConcatError", str(e))
        print(f"❌ Error: {str(e)}")
        return False


def mix_audio_with_video(video_path: Path, audio_path: Path, output_path: Path) -> bool:
    """Mix audio with video using ffmpeg."""
    print(f"\n🎬 Mixing audio with video...")

    try:
        cmd = [
            'ffmpeg',
            '-i', str(video_path),
            '-i', str(audio_path),
            '-c:v', 'copy',  # Copy video codec
            '-c:a', 'aac',   # Audio codec
            '-b:a', '128k',  # Audio bitrate
            '-map', '0:v:0', # Video from first input
            '-map', '1:a:0', # Audio from second input
            '-shortest',     # Use shorter stream length
            str(output_path),
            '-y'
        ]

        result = subprocess.run(cmd, capture_output=True, timeout=600)

        if result.returncode == 0:
            size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"✅ Mixed: {size_mb:.1f} MB")
            log_decision(
                "render_with_voiceover", "video_with_voiceover", "success",
                f"Video with voiceover: {size_mb:.1f} MB",
                rationale="Ready for delivery"
            )
            return True
        else:
            log_error("render_with_voiceover", "MixFailed",
                     f"ffmpeg error: {result.stderr.decode()}")
            print(f"❌ Mixing failed")
            return False

    except subprocess.TimeoutExpired:
        log_error("render_with_voiceover", "MixTimeout",
                 "Audio/video mixing timed out")
        print("❌ Timeout")
        return False
    except Exception as e:
        log_error("render_with_voiceover", "MixError", str(e))
        print(f"❌ Error: {str(e)}")
        return False


async def main():
    """Main orchestrator: Generate voiceover and mix with video."""

    print("\n" + "╔" + "="*68 + "╗")
    print("║  PART 1 WITH VOICEOVER - COMPLETE PIPELINE                   ║")
    print("╚" + "="*68 + "╝")

    # Paths
    video_path = VIDEO_PRODUCTION_DIR / "autonomous_systems" / "autonomous_systems_part_1.mp4"
    voiceover_dir = VIDEO_PRODUCTION_DIR / "voiceovers" / "part_1"
    voiceover_dir.mkdir(parents=True, exist_ok=True)

    if not video_path.exists():
        print(f"❌ Video not found: {video_path}")
        return False

    print(f"📹 Video: {video_path.name}")
    print(f"📁 Output: voiceovers/part_1/")

    # Step 1: Generate voiceovers
    audio_files = await generate_scene_voiceovers(voiceover_dir)

    if not audio_files:
        print("❌ Failed to generate voiceovers")
        return False

    print(f"\n✅ Generated {len(audio_files)}/7 voiceovers")

    # Step 2: Concatenate audio
    concat_file = voiceover_dir / "concat.txt"
    full_audio = voiceover_dir / "full_voiceover.aac"

    if not create_audio_concat_file(audio_files, concat_file):
        print("❌ Failed to create concat file")
        return False

    if not concatenate_audio(concat_file, full_audio):
        print("❌ Failed to concatenate audio")
        return False

    # Step 3: Mix with video
    output_video = VIDEO_PRODUCTION_DIR / "autonomous_systems" / "autonomous_systems_part_1_with_voiceover.mp4"

    if not mix_audio_with_video(video_path, full_audio, output_video):
        print("❌ Failed to mix audio with video")
        return False

    # Summary
    print("\n" + "="*70)
    print("✅ VOICEOVER INTEGRATION COMPLETE")
    print("="*70)
    print(f"\n📊 Final Output:")
    print(f"   File: autonomous_systems_part_1_with_voiceover.mp4")
    print(f"   Size: {output_video.stat().st_size / (1024*1024):.1f} MB")
    print(f"   Duration: 90 seconds")
    print(f"   Audio: Professional male narration")
    print(f"   Quality: 1920×1080 @ 30fps + 128kbps AAC audio")
    print(f"\n✨ Ready for delivery\n")

    return True


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
