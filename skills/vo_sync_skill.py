"""
vo_sync_skill.py
Professional frame-accurate voiceover sync using ffmpeg setpts time-remapping.
Audio is the spine: each VO scene locks to its video scene via time-stretch/compress.
"""

import subprocess
import json
from pathlib import Path


FFMPEG = r"C:\ffmpeg\ffmpeg-8.1.1-essentials_build\bin\ffmpeg.exe"
FFPROBE = r"C:\ffmpeg\ffmpeg-8.1.1-essentials_build\bin\ffprobe.exe"
FFMPEG_TIMEOUT = 600

SCENE_MAPS = {
    1: {
        "scenes": [
            {"scene": 1, "video_start": 0.0, "video_end": 385/30, "audio_file": "s1.mp3"},
            {"scene": 2, "video_start": 385/30, "video_end": 770/30, "audio_file": "s2.mp3"},
            {"scene": 3, "video_start": 770/30, "video_end": 1155/30, "audio_file": "s3.mp3"},
            {"scene": 4, "video_start": 1155/30, "video_end": 1540/30, "audio_file": "s4.mp3"},
            {"scene": 5, "video_start": 1540/30, "video_end": 1925/30, "audio_file": "s5.mp3"},
        ]
    },
    2: {
        "scenes": [
            {"scene": 1, "video_start": 0.0, "video_end": 385/30, "audio_file": "part2_scene1.mp3"},
            {"scene": 2, "video_start": 385/30, "video_end": 770/30, "audio_file": "part2_scene2.mp3"},
            {"scene": 3, "video_start": 770/30, "video_end": 1155/30, "audio_file": "part2_scene3.mp3"},
            {"scene": 4, "video_start": 1155/30, "video_end": 1540/30, "audio_file": "part2_scene4.mp3"},
        ]
    },
    3: {
        "scenes": [
            {"scene": 1, "video_start": 0.0, "video_end": 11.67, "audio_file": "part3_scene1.mp3"},
            {"scene": 2, "video_start": 11.67, "video_end": 26.67, "audio_file": "part3_scene2.mp3"},
            {"scene": 3, "video_start": 26.67, "video_end": 39.27, "audio_file": "part3_scene3.mp3"},
            {"scene": 4, "video_start": 39.27, "video_end": 51.87, "audio_file": "part3_scene4.mp3"},
            {"scene": 5, "video_start": 51.87, "video_end": 64.47, "audio_file": "part3_scene5.mp3"},
        ]
    },
    4: {
        "scenes": [
            {"scene": 1, "video_start": 0.0, "video_end": 385/30, "audio_file": "part4_scene1.mp3"},
            {"scene": 2, "video_start": 385/30, "video_end": 860/30, "audio_file": "part4_scene2.mp3"},
            {"scene": 3, "video_start": 860/30, "video_end": 1220/30, "audio_file": "part4_scene3.mp3"},
            {"scene": 4, "video_start": 1220/30, "video_end": 1580/30, "audio_file": "part4_scene4.mp3"},
            {"scene": 5, "video_start": 1580/30, "video_end": 1940/30, "audio_file": "part4_scene5.mp3"},
        ]
    },
    10: {
        "scenes": [
            {"scene": 1, "video_start": 0.0, "video_end": 390/30, "audio_file": "agentic_ai_mastery_video_1_scene_1.mp3"},
            {"scene": 2, "video_start": 390/30, "video_end": 840/30, "audio_file": "agentic_ai_mastery_video_1_scene_2.mp3"},
            {"scene": 3, "video_start": 840/30, "video_end": 1230/30, "audio_file": "agentic_ai_mastery_video_1_scene_3.mp3"},
            {"scene": 4, "video_start": 1230/30, "video_end": 1680/30, "audio_file": "agentic_ai_mastery_video_1_scene_4.mp3"},
            {"scene": 5, "video_start": 1680/30, "video_end": 2100/30, "audio_file": "agentic_ai_mastery_video_1_scene_5.mp3"},
            {"scene": 6, "video_start": 2100/30, "video_end": 2520/30, "audio_file": "agentic_ai_mastery_video_1_scene_6.mp3"},
            {"scene": 7, "video_start": 2520/30, "video_end": 3150/30, "audio_file": "agentic_ai_mastery_video_1_scene_7.mp3"},
        ]
    },
    11: {
        "scenes": [
            {"scene": 1, "video_start": 0.0, "video_end": 390/30, "audio_file": "agentic_ai_mastery_video_2_scene_1.mp3"},
            {"scene": 2, "video_start": 390/30, "video_end": 870/30, "audio_file": "agentic_ai_mastery_video_2_scene_2.mp3"},
            {"scene": 3, "video_start": 870/30, "video_end": 1290/30, "audio_file": "agentic_ai_mastery_video_2_scene_3.mp3"},
            {"scene": 4, "video_start": 1290/30, "video_end": 1680/30, "audio_file": "agentic_ai_mastery_video_2_scene_4.mp3"},
            {"scene": 5, "video_start": 1680/30, "video_end": 2130/30, "audio_file": "agentic_ai_mastery_video_2_scene_5.mp3"},
            {"scene": 6, "video_start": 2130/30, "video_end": 2580/30, "audio_file": "agentic_ai_mastery_video_2_scene_6.mp3"},
            {"scene": 7, "video_start": 2580/30, "video_end": 3300/30, "audio_file": "agentic_ai_mastery_video_2_scene_7.mp3"},
        ]
    },
    12: {
        "scenes": [
            {"scene": 1, "video_start": 0.0, "video_end": 390/30, "audio_file": "agentic_ai_mastery_video_3_scene_1.mp3"},
            {"scene": 2, "video_start": 390/30, "video_end": 840/30, "audio_file": "agentic_ai_mastery_video_3_scene_2.mp3"},
            {"scene": 3, "video_start": 840/30, "video_end": 1320/30, "audio_file": "agentic_ai_mastery_video_3_scene_3.mp3"},
            {"scene": 4, "video_start": 1320/30, "video_end": 1800/30, "audio_file": "agentic_ai_mastery_video_3_scene_4.mp3"},
            {"scene": 5, "video_start": 1800/30, "video_end": 2250/30, "audio_file": "agentic_ai_mastery_video_3_scene_5.mp3"},
            {"scene": 6, "video_start": 2250/30, "video_end": 2850/30, "audio_file": "agentic_ai_mastery_video_3_scene_6.mp3"},
        ]
    },
}


class ProfessionalVOSync:
    def __init__(self):
        self.ffmpeg = FFMPEG
        self.ffprobe = FFPROBE

    def _run_ffmpeg(self, cmd: list, timeout: int = None) -> subprocess.CompletedProcess:
        """Execute ffmpeg command, raise on failure."""
        if timeout is None:
            timeout = FFMPEG_TIMEOUT
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if result.returncode != 0:
            raise RuntimeError(
                f"ffmpeg failed (exit {result.returncode}): "
                f"{' '.join(cmd[:6])}...\nSTDERR: {result.stderr[-500:]}"
            )
        return result

    def probe_audio_duration(self, mp3_path: str) -> float:
        """Get actual duration of audio file."""
        cmd = [
            self.ffprobe, "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            mp3_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            raise RuntimeError(f"ffprobe failed on {mp3_path}: {result.stderr.strip()}")
        return float(result.stdout.strip())

    def build_professional_plan(self, part_num: int, audio_base_dir: str) -> list:
        """Build sync plan with actual audio durations."""
        plan = []
        audio_base = Path(audio_base_dir)

        for entry in SCENE_MAPS[part_num]["scenes"]:
            audio_path = audio_base / entry["audio_file"]

            if not audio_path.exists():
                raise FileNotFoundError(f"Audio file not found: {audio_path}")

            audio_duration = self.probe_audio_duration(str(audio_path))
            video_duration = entry["video_end"] - entry["video_start"]
            remap_ratio = audio_duration / video_duration

            if remap_ratio > 4.0 or remap_ratio < 0.1:
                print(f"  WARNING: Scene {entry['scene']} has extreme remap ratio {remap_ratio:.2f}x")

            plan.append({
                "scene": entry["scene"],
                "video_start": entry["video_start"],
                "video_end": entry["video_end"],
                "video_duration": video_duration,
                "audio_file": str(audio_path),
                "audio_duration": audio_duration,
                "remap_ratio": remap_ratio,
            })

        return plan

    def extract_and_remap_scene(
        self,
        input_video: str,
        start: float,
        end: float,
        target_duration: float,
        output_path: str
    ):
        """Extract video segment and time-remap to target duration."""
        video_duration = end - start
        filter_str = (
            f"trim=start={start}:end={end},"
            f"setpts=({target_duration}/{video_duration})*PTS,"
            f"scale=flags=lanczos"
        )
        cmd = [
            self.ffmpeg,
            "-i", input_video,
            "-vf", filter_str,
            "-an",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-y", output_path
        ]
        self._run_ffmpeg(cmd, timeout=300)

    def concat_audio_files(self, mp3_list: list, output_aac: str):
        """Concatenate audio files using filter_complex."""
        if not mp3_list:
            raise ValueError("No audio files to concatenate")

        inputs = []
        for p in mp3_list:
            inputs += ["-i", p]

        n = len(mp3_list)
        filter_parts = "".join(f"[{i}:a]" for i in range(n))
        filter_str = f"{filter_parts}concat=n={n}:v=0:a=1[aout]"

        cmd = [
            self.ffmpeg,
            *inputs,
            "-filter_complex", filter_str,
            "-map", "[aout]",
            "-c:a", "aac", "-b:a", "192k",
            "-y", output_aac
        ]
        self._run_ffmpeg(cmd, timeout=300)

    def build_concat_list(self, segment_paths: list, list_path: str):
        """Write ffmpeg concat demuxer file."""
        lines = []
        for p in segment_paths:
            abs_fwd = str(Path(p).resolve()).replace("\\", "/")
            lines.append(f"file '{abs_fwd}'")
        Path(list_path).write_text("\n".join(lines), encoding="utf-8")

    def concat_video_segments(self, list_path: str, output_path: str):
        """Concatenate video segments."""
        cmd = [
            self.ffmpeg,
            "-f", "concat", "-safe", "0",
            "-i", list_path,
            "-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-an",
            "-y", output_path
        ]
        self._run_ffmpeg(cmd, timeout=600)

    def mux_video_with_audio(self, video_path: str, audio_path: str, output_path: str):
        """Mux synced video with audio."""
        cmd = [
            self.ffmpeg,
            "-i", video_path,
            "-i", audio_path,
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            "-y", output_path
        ]
        self._run_ffmpeg(cmd)

    def sync_video_professional(
        self,
        part_num: int,
        input_video: str,
        output_path: str,
        audio_base: str,
        workdir: str
    ) -> dict:
        """Full professional sync pipeline for one part."""
        workdir = Path(workdir)
        seg_dir = workdir / f"part{part_num}_segments"
        seg_dir.mkdir(parents=True, exist_ok=True)

        plan = self.build_professional_plan(part_num, audio_base)
        print(f"  Part {part_num}: {len(plan)} VO scenes planned")

        remapped_segs = []
        audio_files = []

        for item in plan:
            seg_path = str(seg_dir / f"scene_{item['scene']:02d}_remapped.mp4")
            print(f"    Scene {item['scene']}: {item['video_duration']:.2f}s video "
                  f"-> {item['audio_duration']:.2f}s audio (ratio {item['remap_ratio']:.4f})")

            self.extract_and_remap_scene(
                input_video,
                item["video_start"],
                item["video_end"],
                item["audio_duration"],
                seg_path
            )
            remapped_segs.append(seg_path)
            audio_files.append(item["audio_file"])

        concat_list = str(seg_dir / "concat.txt")
        self.build_concat_list(remapped_segs, concat_list)

        rebuilt_video = str(seg_dir / "rebuilt_video.mp4")
        self.concat_video_segments(concat_list, rebuilt_video)

        combined_audio = str(seg_dir / "combined_audio.aac")
        self.concat_audio_files(audio_files, combined_audio)

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        self.mux_video_with_audio(rebuilt_video, combined_audio, output_path)

        return {
            "status": "success",
            "part": part_num,
            "output": output_path,
            "scenes_synced": len(plan),
            "total_audio_duration": sum(i["audio_duration"] for i in plan),
        }
