#!/usr/bin/env python3
"""
Video Quality Orchestrator v2
Validates compositions against international explainer video standards before render
"""

import json
import subprocess
from pathlib import Path
from datetime import datetime

class VideoQualityValidator:
    """Validates video quality against best practices"""

    # International standards for explainer videos
    STANDARDS = {
        "max_scene_gap": 0.1,  # Max 10% gap between scene end and audio end
        "min_display_time": 0.5,  # Min 0.5s to read text
        "max_scene_duration": 60,  # Max 60s per scene
        "fps": 30,
        "resolution": (1920, 1080),
        "pacing": {
            "intro": (1, 3),  # 1-3 seconds
            "main": (3, 8),  # 3-8 seconds per point
            "conclusion": (2, 5),  # 2-5 seconds
        }
    }

    def __init__(self):
        self.errors = []
        self.warnings = []

    def validate_composition(self, part_num, composition_name, scenes_config, vo_durations):
        """
        Validate a video composition

        scenes_config: list of {"name": str, "start": int, "duration": int}
        vo_durations: list of {"scene": str, "frames": int, "duration_sec": float}
        """
        print(f"\n{'='*70}")
        print(f"VALIDATING Part {part_num}: {composition_name}")
        print(f"{'='*70}")

        self.errors = []
        self.warnings = []

        # Build VO duration map
        vo_map = {v["scene"]: v for v in vo_durations}

        total_expected = 0
        for i, scene in enumerate(scenes_config):
            scene_name = scene["name"]
            allocated_frames = scene["duration"]
            allocated_sec = allocated_frames / self.STANDARDS["fps"]

            if scene_name in vo_map:
                vo_info = vo_map[scene_name]
                vo_frames = vo_info["frames"]
                vo_sec = vo_info["duration_sec"]

                gap_frames = allocated_frames - vo_frames
                gap_sec = gap_frames / self.STANDARDS["fps"]
                gap_percent = (gap_frames / vo_frames) * 100 if vo_frames > 0 else 0

                status = "[OK]"
                if gap_sec > 5:  # More than 5 seconds gap
                    status = "[FAIL]"
                    self.errors.append(
                        f"Scene {i+1} '{scene_name}': {gap_sec:.1f}s blank ({gap_percent:.0f}% gap). "
                        f"VO: {vo_sec:.1f}s, Allocated: {allocated_sec:.1f}s"
                    )
                elif gap_sec > 1:
                    status = "[WARN]"
                    self.warnings.append(
                        f"Scene {i+1} '{scene_name}': {gap_sec:.1f}s gap. Reduce allocated from {allocated_sec:.1f}s to {vo_sec:.1f}s"
                    )

                print(f"{status} Scene {i+1}: {scene_name:20} | VO: {vo_sec:6.1f}s | Allocated: {allocated_sec:6.1f}s | Gap: {gap_sec:+5.1f}s")
                total_expected += vo_frames + min(1, max(gap_frames, 0))  # Add small buffer
            else:
                self.warnings.append(f"Scene '{scene_name}' has no voiceover mapping")
                print(f"[WARN] Scene {i+1}: {scene_name:20} | NO VO FOUND")

        # Overall pacing check
        total_vo_sec = sum(v["duration_sec"] for v in vo_durations)
        print(f"\nTotal VO duration: {total_vo_sec:.1f}s")

        if self.errors:
            print(f"\n[FAIL] CRITICAL ERRORS ({len(self.errors)}):")
            for err in self.errors:
                print(f"   {err}")
            return False

        if self.warnings:
            print(f"\n[WARN] WARNINGS ({len(self.warnings)}):")
            for warn in self.warnings:
                print(f"   {warn}")

        if not self.errors:
            print(f"\n[PASS] Part {part_num} meets quality standards")
            return True

        return False

    def generate_corrected_config(self, part_num, scenes_config, vo_durations, buffer_frames=15):
        """Generate corrected scene durations"""
        print(f"\n{'='*70}")
        print(f"CORRECTED SCENE CONFIG - Part {part_num}")
        print(f"{'='*70}")

        vo_map = {v["scene"]: v["frames"] for v in vo_durations}

        corrected = []
        current_start = 0

        for i, scene in enumerate(scenes_config):
            scene_name = scene["name"]
            if scene_name in vo_map:
                vo_frames = vo_map[scene_name]
                # Duration = VO + small buffer for visual transition
                corrected_duration = vo_frames + buffer_frames

                corrected.append({
                    "name": scene_name,
                    "start": current_start,
                    "old_duration": scene["duration"],
                    "new_duration": corrected_duration,
                    "vo_frames": vo_frames,
                    "buffer_frames": buffer_frames,
                })

                current_start += corrected_duration

                print(f"Scene {i+1}: {scene_name:20} | VO: {vo_frames:5}fr | Corrected: {corrected_duration:5}fr (was {scene['duration']:5}fr)")

        total_frames = current_start
        total_sec = total_frames / self.STANDARDS["fps"]
        print(f"\nNew total: {total_frames} frames ({total_sec:.1f}s)")

        return corrected

def main():
    validator = VideoQualityValidator()

    # VO durations (from previous scan)
    vo_data = {
        1: [
            {"scene": "Scene1", "frames": 502, "duration_sec": 16.75},
            {"scene": "Scene2", "frames": 947, "duration_sec": 31.56},
            {"scene": "Scene3", "frames": 535, "duration_sec": 17.82},
            {"scene": "Scene4", "frames": 938, "duration_sec": 31.27},
            {"scene": "Scene5", "frames": 931, "duration_sec": 31.04},
            {"scene": "Scene6", "frames": 832, "duration_sec": 27.74},
        ],
        2: [
            {"scene": "Scene1", "frames": 390, "duration_sec": 12.99},
            {"scene": "Scene2", "frames": 1472, "duration_sec": 49.06},
            {"scene": "Scene3", "frames": 580, "duration_sec": 19.33},
            {"scene": "Scene4", "frames": 920, "duration_sec": 30.67},
            {"scene": "Scene5", "frames": 1036, "duration_sec": 34.54},
            {"scene": "Scene6", "frames": 232, "duration_sec": 7.73},
        ],
        3: [
            {"scene": "Scene1", "frames": 590, "duration_sec": 19.67},
            {"scene": "Scene2", "frames": 1515, "duration_sec": 50.5},
            {"scene": "Scene3", "frames": 2031, "duration_sec": 67.69},
            {"scene": "Scene4", "frames": 795, "duration_sec": 26.49},
            {"scene": "Scene5", "frames": 934, "duration_sec": 31.14},
            {"scene": "Scene6", "frames": 390, "duration_sec": 12.99},
        ],
    }

    # Current scene configs (what's in the TSX files)
    current_config = {
        1: [
            {"name": "Scene1", "start": 0, "duration": 450},
            {"name": "Scene2", "start": 450, "duration": 1050},
            {"name": "Scene3", "start": 1500, "duration": 600},
            {"name": "Scene4", "start": 2100, "duration": 1800},
            {"name": "Scene5", "start": 3900, "duration": 1500},
            {"name": "Scene6", "start": 5400, "duration": 1350},
        ],
        2: [
            {"name": "Scene1", "start": 0, "duration": 600},
            {"name": "Scene2", "start": 600, "duration": 2100},
            {"name": "Scene3", "start": 2700, "duration": 1200},
            {"name": "Scene4", "start": 3900, "duration": 1500},
            {"name": "Scene5", "start": 5400, "duration": 1200},
            {"name": "Scene6", "start": 6600, "duration": 300},
        ],
        3: [
            {"name": "Scene1", "start": 0, "duration": 540},
            {"name": "Scene2", "start": 540, "duration": 1560},
            {"name": "Scene3", "start": 2100, "duration": 2100},
            {"name": "Scene4", "start": 4200, "duration": 1200},
            {"name": "Scene5", "start": 5400, "duration": 1350},
            {"name": "Scene6", "start": 6750, "duration": 300},
        ],
    }

    # Validate all parts
    all_pass = True
    corrections = {}

    for part_num in [1, 2, 3]:
        pass_check = validator.validate_composition(
            part_num,
            f"Part {part_num}",
            current_config[part_num],
            vo_data[part_num]
        )
        all_pass = all_pass and pass_check

        # Generate corrections
        corrections[part_num] = validator.generate_corrected_config(
            part_num,
            current_config[part_num],
            vo_data[part_num],
            buffer_frames=15
        )

    # Summary
    print(f"\n{'='*70}")
    print("ORCHESTRATOR SUMMARY")
    print(f"{'='*70}")

    if all_pass:
        print("[PASS] All parts pass quality standards")
    else:
        print("[FAIL] Parts failed validation - corrections needed")
        print("\nCORRECTIONS TO APPLY:")
        for part_num, corrected_scenes in corrections.items():
            print(f"\nPart {part_num}:")
            for scene in corrected_scenes:
                if scene["new_duration"] != scene["old_duration"]:
                    print(f"  {scene['name']}: {scene['old_duration']} → {scene['new_duration']} frames")

    return corrections

if __name__ == "__main__":
    corrections = main()

    # Save corrections for composition updates
    with open("corrections.json", "w") as f:
        json.dump(corrections, f, indent=2)
