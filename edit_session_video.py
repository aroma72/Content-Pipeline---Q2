#!/usr/bin/env python3
"""
edit_session_video.py
CLI entry point for SessionVideoEditorSkill.

Download a session recording → transcribe → identify what to cut (Claude) → output clean video.

Usage:
  python edit_session_video.py <gdrive_url_or_local_path> <session_name> [--topic "course topic"]

Examples:
  python edit_session_video.py "https://drive.google.com/file/d/1AbC.../view?usp=sharing" \\
         "session_01_intro" --topic "Agentic AI Mastery cohort introduction"

  python edit_session_video.py recordings/raw_session.mp4 \\
         "session_01_intro" --topic "Agentic AI Mastery cohort introduction"
"""

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from skills.session_editor_skill import SessionVideoEditorSkill


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download and professionally edit a session recording"
    )
    parser.add_argument("source", help="Google Drive URL or local video path")
    parser.add_argument("session_name", help="Session slug for output filenames")
    parser.add_argument("--topic", default="", help="Course topic for AI analysis context")
    parser.add_argument("--output-dir", default=None, help="Override output directory")
    return parser.parse_args()


def main():
    args = parse_args()

    print("\n" + "="*70)
    print("SESSION VIDEO EDITOR")
    print("="*70)
    print(f"Source:   {args.source}")
    print(f"Session:  {args.session_name}")
    print(f"Topic:    {args.topic or '(not specified)'}")

    skill = SessionVideoEditorSkill(output_dir=args.output_dir)

    t0 = time.time()
    result = skill.run(
        source=args.source,
        session_name=args.session_name,
        course_topic=args.topic,
    )
    elapsed = time.time() - t0

    print("\n" + "="*70)

    if result["status"] == "success":
        stats = result["stats"]
        print(f"SUCCESS — completed in {elapsed:.0f}s\n")
        print(f"Output Video: {result['output_video']}")
        print(f"Edit Report:  {result['edit_report']}")
        print(f"\nStatistics:")
        print(f"  Original Duration: {stats['original_duration_seconds']/60:.1f} minutes")
        print(f"  Edited Duration:   {stats['edited_duration_seconds']/60:.1f} minutes")
        print(f"  Reduction:         {stats['reduction_percent']:.1f}%")
        print(f"  Silence cuts:      {stats['silence_cuts_count']} ({stats['silence_time_removed_seconds']:.0f}s)")
        print(f"  AI cuts:           {stats['ai_cuts_count']} ({stats['ai_time_removed_seconds']:.0f}s)")
        print(f"  Final segments:    {stats['keep_segments_count']}")
        print()
        sys.exit(0)
    else:
        print(f"FAILED: {result.get('error', 'unknown error')}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
