#!/usr/bin/env python3
"""
Render videos with quality orchestrator validation.
Videos must pass quality checks before going to production.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skills.remotion_video_skill import RemotionVideoSkill
from agents.video_quality_orchestrator import validate_before_release
from config import VIDEO_PRODUCTION_DIR
from logger import log_info, log_error, log_decision


async def render_with_quality_check(composition_id: str, output_name: str):
    """
    Render a video and validate it before release.

    Args:
        composition_id: Remotion composition name (e.g., 'AutonomousSystemsPart1')
        output_name: Output filename
    """
    remotion_dir = Path(__file__).parent / "drawing-room-remotion"
    skill = RemotionVideoSkill(str(remotion_dir))

    if not skill.is_available:
        log_error("render_with_quality_check", "RemotionNotAvailable",
                 "Remotion project not configured")
        return False

    output_dir = VIDEO_PRODUCTION_DIR / "autonomous_systems"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / output_name

    print("\n" + "="*70)
    print(f"RENDERING: {composition_id}")
    print("="*70)

    # STEP 1: Render video
    log_info("render_with_quality_check", f"Rendering {composition_id}")

    try:
        result = await skill.call_async(
            composition_id=composition_id,
            props={},
            output_path=str(output_path),
            framerate=30,
            width=1920,
            height=1080
        )

        if not result:
            log_error("render_with_quality_check", "RenderFailed",
                     f"{composition_id}: Render returned None")
            print("❌ RENDER FAILED")
            return False

        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"✅ Render complete: {size_mb:.1f} MB")

    except Exception as e:
        log_error("render_with_quality_check", "RenderError",
                 f"{composition_id}: {str(e)}")
        print(f"❌ RENDER ERROR: {str(e)}")
        return False

    # STEP 2: Validate video quality
    print(f"\n" + "="*70)
    print("QUALITY VALIDATION")
    print("="*70)

    validation_passed = await validate_before_release(str(output_path))

    # STEP 3: Make release decision
    print(f"\n" + "="*70)
    print("RELEASE DECISION")
    print("="*70)

    if validation_passed:
        log_decision(
            "render_with_quality_check", "video_approved", "success",
            f"{composition_id}: APPROVED FOR PRODUCTION",
            rationale="Passed all quality validation checks"
        )
        print(f"✅ {composition_id}: APPROVED FOR PRODUCTION")
        print(f"   Location: {output_path}")
        return True
    else:
        log_decision(
            "render_with_quality_check", "video_blocked", "warning",
            f"{composition_id}: BLOCKED FROM PRODUCTION - Quality issues",
            rationale="Failed quality validation checks - manual review required"
        )
        print(f"⚠️ {composition_id}: BLOCKED FROM PRODUCTION")
        print(f"   Issue: Quality validation failed")
        print(f"   Action: Manual review required before release")
        print(f"   File: {output_path}")
        return False


async def main():
    """Render all 4 Autonomous Systems videos with quality checks."""

    videos = [
        ("AutonomousSystemsPart1", "autonomous_systems_part_1_checked.mp4"),
        ("AutonomousSystemsPart2", "autonomous_systems_part_2_checked.mp4"),
        ("AutonomousSystemsPart3", "autonomous_systems_part_3_checked.mp4"),
        ("AutonomousSystemsPart4", "autonomous_systems_part_4_checked.mp4"),
    ]

    approved = []
    blocked = []

    for composition_id, output_name in videos:
        success = await render_with_quality_check(composition_id, output_name)

        if success:
            approved.append(composition_id)
        else:
            blocked.append(composition_id)

    # Summary
    print("\n" + "="*70)
    print("RENDER SUMMARY")
    print("="*70)
    print(f"✅ Approved for production: {len(approved)}/{len(videos)}")
    for video in approved:
        print(f"   • {video}")

    if blocked:
        print(f"\n⚠️ Blocked from production: {len(blocked)}/{len(videos)}")
        for video in blocked:
            print(f"   • {video}")

    print("="*70)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Render single composition
        composition_id = sys.argv[1]
        output_name = sys.argv[2] if len(sys.argv) > 2 else f"{composition_id}.mp4"
        asyncio.run(render_with_quality_check(composition_id, output_name))
    else:
        # Render all
        asyncio.run(main())
