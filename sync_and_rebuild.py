#!/usr/bin/env python3
"""
sync_and_rebuild.py
Frame-accurate VO sync for all 4 Autonomous Systems parts.
Audio is the spine: each VO scene locks to its video scene via setpts remap.
"""

import sys
import shutil
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skills.vo_sync_skill import ProfessionalVOSync


BASE = Path(__file__).parent

PARTS = [
    {
        "part_num": 1,
        "input_video": BASE / "updated" / "autonomous_systems_part_1_with_vo.mp4",
        "audio_base": BASE / "video_production" / "voiceovers" / "part_1",
        "output": BASE / "updated" / "autonomous_systems_part_1_FINAL.mp4",
    },
    {
        "part_num": 2,
        "input_video": BASE / "updated" / "autonomous_systems_part_2_with_vo.mp4",
        "audio_base": BASE / "voiceovers" / "autonomous_systems",
        "output": BASE / "updated" / "autonomous_systems_part_2_FINAL.mp4",
    },
    {
        "part_num": 3,
        "input_video": BASE / "updated" / "autonomous_systems_part_3_with_vo.mp4",
        "audio_base": BASE / "voiceovers" / "autonomous_systems",
        "output": BASE / "updated" / "autonomous_systems_part_3_FINAL.mp4",
    },
    {
        "part_num": 4,
        "input_video": BASE / "updated" / "autonomous_systems_part_4_with_vo.mp4",
        "audio_base": BASE / "voiceovers" / "autonomous_systems",
        "output": BASE / "updated" / "autonomous_systems_part_4_FINAL.mp4",
    },
]


def main():
    skill = ProfessionalVOSync()
    results = []
    failures = []

    for part in PARTS:
        pn = part["part_num"]
        print(f"\n{'='*60}")
        print(f"Part {pn}: {part['input_video'].name}")

        if not part["input_video"].exists():
            msg = f"Input video not found: {part['input_video']}"
            print(f"  [SKIP] {msg}")
            failures.append((pn, msg))
            continue

        workdir = tempfile.mkdtemp(prefix=f"vo_sync_part{pn}_")
        try:
            result = skill.sync_video_professional(
                part_num=pn,
                input_video=str(part["input_video"]),
                output_path=str(part["output"]),
                audio_base=str(part["audio_base"]),
                workdir=workdir,
            )
            print(f"  [OK] -> {part['output'].name}")
            print(f"    Scenes synced: {result['scenes_synced']}, "
                  f"Total audio: {result['total_audio_duration']:.1f}s")
            results.append(result)
        except Exception as e:
            print(f"  [FAIL] Part {pn}: {e}")
            failures.append((pn, str(e)))
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    print(f"\n{'='*60}")
    print(f"SUMMARY: {len(results)}/4 parts completed")

    if failures:
        print("Failures:")
        for pn, err in failures:
            print(f"  Part {pn}: {err[:120]}")
        return 1

    print("All parts synced successfully.")
    print("Output: updated/autonomous_systems_part_X_FINAL.mp4")
    return 0


if __name__ == "__main__":
    sys.exit(main())
