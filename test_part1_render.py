#!/usr/bin/env python3
"""
Quick test render of Autonomous Systems Part 1 with new animations.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skills.remotion_video_skill import RemotionVideoSkill
from config import VIDEO_PRODUCTION_DIR
from logger import log_info, log_error, log_decision


async def test_render():
    """Render Part 1 with new animation enhancements."""

    # Initialize skill
    remotion_dir = Path(__file__).parent / "drawing-room-remotion"
    skill = RemotionVideoSkill(str(remotion_dir))

    if not skill.is_available:
        log_error("test_part1_render", "Remotion Not Available",
                 "Remotion project not found or not configured")
        print("ERROR: Remotion project not found")
        return False

    # Output directory
    output_dir = VIDEO_PRODUCTION_DIR / "autonomous_systems_animated"
    output_dir.mkdir(parents=True, exist_ok=True)

    log_info("test_part1_render", "Starting render: Part 1 with animations")
    print("=" * 80)
    print("RENDERING: Autonomous Systems Part 1 (Animated)")
    print("=" * 80)

    try:
        output_path = output_dir / "autonomous_systems_part_1_animated.mp4"

        # Render with async
        result = await skill.call_async(
            composition_id="AutonomousSystemsPart1",
            props={},
            output_path=str(output_path),
            framerate=30,
            width=1920,
            height=1080
        )

        if result:
            size_mb = output_path.stat().st_size / (1024 * 1024)
            duration_s = result.get('duration_seconds', 'unknown')

            log_decision(
                "test_part1_render",
                "render_success",
                "success",
                f"Part 1: {duration_s}s, {size_mb:.1f} MB with animations",
                rationale="Animated render complete with new spring physics and staggered timings"
            )

            print(f"\n✅ RENDER SUCCESS")
            print(f"File: {output_path}")
            print(f"Size: {size_mb:.1f} MB")
            print(f"Duration: {duration_s}s")
            print("\nAnimation Features:")
            print("- Bouncy system boxes (bounceScale)")
            print("- Staggered grid card animations (8-frame delays)")
            print("- Animated radial lines in concept map")
            print("- Smooth transitions between all elements")
            print("- Spring physics for organic motion")
            print("=" * 80)
            return True
        else:
            log_error("test_part1_render", "RenderFailed", "Render returned None")
            print("❌ RENDER FAILED: Returned None")
            return False

    except Exception as e:
        log_error("test_part1_render", "RenderError", str(e))
        print(f"❌ RENDER ERROR: {str(e)}")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_render())
    sys.exit(0 if success else 1)
