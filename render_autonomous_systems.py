#!/usr/bin/env python3
"""
Render Autonomous Systems 4-part video series using improved RemotionVideoSkill.
Uses async subprocess for non-blocking rendering.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skills.remotion_video_skill import RemotionVideoSkill
from config import VIDEO_PRODUCTION_DIR
from logger import log_info, log_error, log_decision


async def render_videos():
    """Render all 4 Autonomous Systems videos."""

    # Initialize skill with correct Remotion project path
    remotion_dir = Path(__file__).parent / "drawing-room-remotion"
    skill = RemotionVideoSkill(str(remotion_dir))

    if not skill.is_available:
        log_error("render_autonomous_systems", "Remotion Not Available",
                 "Remotion project not found or not configured")
        return

    # Output directory
    output_dir = VIDEO_PRODUCTION_DIR / "autonomous_systems"
    output_dir.mkdir(parents=True, exist_ok=True)

    videos = [
        {
            "composition_id": "AutonomousSystemsPart1",
            "name": "Part 1 - Consumer vs Producer Mindset",
            "duration_seconds": 90,
            "output_name": "autonomous_systems_part_1_improved.mp4"
        },
        {
            "composition_id": "AutonomousSystemsPart2",
            "name": "Part 2 - Testing vs Evaluation",
            "duration_seconds": 90,
            "output_name": "autonomous_systems_part_2_improved.mp4"
        },
        {
            "composition_id": "AutonomousSystemsPart3",
            "name": "Part 3 - Methods of Evaluation",
            "duration_seconds": 105,
            "output_name": "autonomous_systems_part_3_improved.mp4"
        },
        {
            "composition_id": "AutonomousSystemsPart4",
            "name": "Part 4 - Building Autonomous Systems",
            "duration_seconds": 90,
            "output_name": "autonomous_systems_part_4_improved.mp4"
        }
    ]

    results = []

    for i, video in enumerate(videos, 1):
        log_info("render_autonomous_systems",
                f"Starting render: {video['name']} ({i}/4)")

        try:
            output_path = output_dir / video["output_name"]

            # Use async rendering
            result = await skill.call_async(
                composition_id=video["composition_id"],
                props={},
                output_path=str(output_path),
                framerate=30,
                width=1920,
                height=1080
            )

            if result:
                log_decision(
                    "render_autonomous_systems",
                    "video_rendered",
                    "success",
                    f"{video['name']}: {result.get('duration_seconds', 'unknown')}s, "
                    f"{(output_path.stat().st_size / (1024*1024)):.1f} MB",
                    rationale="Video rendered with improved async subprocess"
                )
                results.append({
                    "video": video["name"],
                    "status": "success",
                    "output_path": str(output_path),
                    "size_mb": output_path.stat().st_size / (1024*1024),
                    "duration_seconds": result.get('duration_seconds')
                })
            else:
                log_error("render_autonomous_systems", "RenderFailed",
                         f"Failed to render {video['name']}")
                results.append({
                    "video": video["name"],
                    "status": "failed",
                    "error": "Render returned None"
                })

        except Exception as e:
            log_error("render_autonomous_systems", "RenderError",
                     f"{video['name']}: {str(e)}")
            results.append({
                "video": video["name"],
                "status": "error",
                "error": str(e)
            })

    # Summary
    successful = sum(1 for r in results if r["status"] == "success")
    log_decision(
        "render_autonomous_systems",
        "rendering_complete",
        "success",
        f"Rendered {successful}/{len(videos)} videos successfully",
        rationale="All Autonomous Systems videos ready with improved async rendering"
    )

    print("\n" + "="*80)
    print("AUTONOMOUS SYSTEMS RENDERING COMPLETE")
    print("="*80)

    for r in results:
        status = "✅ SUCCESS" if r["status"] == "success" else "❌ " + r["status"].upper()
        print(f"\n{status}: {r['video']}")
        if r["status"] == "success":
            print(f"  Path: {r['output_path']}")
            print(f"  Size: {r['size_mb']:.1f} MB")
            print(f"  Duration: {r['duration_seconds']:.1f}s")
        else:
            print(f"  Error: {r.get('error', 'Unknown')}")

    print("\n" + "="*80)


if __name__ == "__main__":
    asyncio.run(render_videos())
