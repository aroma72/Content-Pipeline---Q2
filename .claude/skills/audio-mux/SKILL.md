---
type: reference
last_verified: 2026-05-19
owner: aroma
---

# Skill: audio-mux

Extract voiceover audio from video and mux audio with silent video. Two-stage workflow: extract → mux.

---

## Purpose

**Stage 1 (Extract):** Extract AAC audio from existing MP4 video  
**Stage 2 (Mux):** Combine silent MP4 + AAC audio into final deliverable

---

## Prerequisites

- ffmpeg installed and in PATH (`ffmpeg -version` works)
- ffprobe installed (comes with ffmpeg)
- Input files (silent MP4 or final MP4 with audio)
- Output directory exists (`video_production/voiceovers/`, `updated/`)

---

## Stage 1: Extract Voiceover

### Command

```bash
ffmpeg -i <INPUT_MP4> -vn -acodec aac -y <OUTPUT_AAC>
```

**Parameters:**
- `<INPUT_MP4>` — Source video with audio (MP4)
- `<OUTPUT_AAC>` — Destination audio file (AAC)
- `-vn` — No video (extract audio only)
- `-acodec aac` — Output codec (AAC, preserves quality)
- `-y` — Overwrite without prompt

### Examples

**Extract from final video (has audio):**
```bash
ffmpeg -i updated/autonomous_part1_final.mp4 \
  -vn -acodec aac -y video_production/voiceovers/part_1_vo.aac
```

**Extract from external source:**
```bash
ffmpeg -i /path/to/session_recording.mp3 \
  -acodec aac -y video_production/voiceovers/part_1_vo.aac
```

**Batch extract all parts:**
```bash
ffmpeg -i video_production/autonomous_part1.mp4 -vn -acodec aac -y video_production/voiceovers/part_1_vo.aac
ffmpeg -i video_production/autonomous_part2.mp4 -vn -acodec aac -y video_production/voiceovers/part_2_vo.aac
ffmpeg -i video_production/autonomous_part3.mp4 -vn -acodec aac -y video_production/voiceovers/part_3_vo.aac
```

### Validation

```bash
# Verify AAC file exists and has audio
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 \
  video_production/voiceovers/part_1_vo.aac

# Expected: Duration in seconds (e.g., 156.2)
```

**Record duration** for frame count validation:
```
Part 1 VO: 156.2 seconds → frames = 156.2 × 30 = 4686 frames
```

---

## Stage 2: Mux Audio with Video

### Command

```bash
ffmpeg -i <SILENT_MP4> -i <AUDIO_AAC> \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y <OUTPUT_MP4>
```

**Parameters:**
- `<SILENT_MP4>` — Video without audio
- `<AUDIO_AAC>` — Audio track (extracted or copied)
- `-c:v copy` — Copy video codec (no re-encoding, fast)
- `-c:a aac` — Output audio as AAC
- `-map 0:v:0` — Use video stream 0 from input 0 (silent MP4)
- `-map 1:a:0` — Use audio stream 0 from input 1 (AAC)
- `-y` — Overwrite without prompt

### Examples

**Single mux (Part 1):**
```bash
ffmpeg -i video_production/autonomous_part1_silent.mp4 \
  -i video_production/voiceovers/part_1_vo.aac \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y \
  updated/autonomous_part1_final.mp4
```

**Batch mux all parts:**
```bash
for part in 1 2 3; do
  ffmpeg -i video_production/autonomous_part${part}_silent.mp4 \
    -i video_production/voiceovers/part_${part}_vo.aac \
    -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y \
    updated/autonomous_part${part}_final.mp4
  echo "✓ Part $part muxed"
done
```

### Validation

```bash
# Verify final video has both audio and video
ffprobe -v error -show_entries stream=codec_type,codec_name,duration \
  updated/autonomous_part1_final.mp4

# Expected output:
# codec_type=video, codec_name=h264
# codec_type=audio, codec_name=aac
# duration=156.2

# Spot check: Play 10 seconds
ffplay -t 10 updated/autonomous_part1_final.mp4
```

---

## Combined Extract → Mux Pipeline

```bash
#!/bin/bash
# Orchestrate full extract + mux workflow

set -e  # Exit on any error

echo "🎬 Audio Pipeline: Extract → Mux"

# Input/output paths
SILENT_VIDEO="video_production/autonomous_part1_silent.mp4"
OUTPUT_VO="video_production/voiceovers/part_1_vo.aac"
FINAL_VIDEO="updated/autonomous_part1_final.mp4"

# Stage 1: Extract VO from external source
echo "📊 Stage 1: Extracting voiceover..."
ffmpeg -i /path/to/session_recording.mp4 \
  -vn -acodec aac -y "$OUTPUT_VO"

# Validate extraction
VO_DURATION=$(ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_VO")
echo "  VO Duration: $VO_DURATION seconds"

# Stage 2: Mux with silent video
echo "🎬 Stage 2: Muxing audio + video..."
ffmpeg -i "$SILENT_VIDEO" -i "$OUTPUT_VO" \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y \
  "$FINAL_VIDEO"

echo "✅ Pipeline complete: $FINAL_VIDEO"
```

---

## Troubleshooting

### "Unknown encoder 'aac'"

**Cause:** ffmpeg compiled without AAC support

**Fix:**
```bash
# Check if AAC available
ffmpeg -codecs | grep aac

# If not found, install ffmpeg with libfdk-aac
# macOS: brew install ffmpeg --with-fdk-aac
# Ubuntu: sudo apt-get install ffmpeg libfdk-aac-dev
# Windows: Use ffmpeg-full from https://ffmpeg.org/download.html
```

### "Stream specifier 'v:0' does not match any streams"

**Cause:** Input file has no video or wrong stream format

**Fix:**
```bash
# Check streams in input files
ffprobe -show_streams video.mp4
ffprobe -show_streams audio.aac

# Use correct stream indices (may not be 0:v:0 and 1:a:0)
ffmpeg -i video.mp4 -i audio.aac \
  -c:v copy -c:a aac -map 0:v -map 1:a -y output.mp4
```

### "File already exists. Exiting due to Output file #0 does not contain any stream"

**Cause:** File exists and ffmpeg won't overwrite without `-y` flag

**Fix:**
```bash
# Use -y flag to force overwrite
ffmpeg -i input1.mp4 -i input2.aac \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y output.mp4
```

### Audio sync off (sound doesn't match video)

**Cause:** Video duration ≠ audio duration; frame count mismatch

**Fix:**
```bash
# Check durations match
ffprobe -v error -show_entries format=duration audio.aac
ffprobe -v error -show_entries format=duration video.mp4

# Should be within 0.1 seconds
# If not: recalculate durationInFrames in Root.tsx
# Formula: frames = audio_duration_seconds × 30fps
```

### ffmpeg command hangs or is very slow

**Cause:** Large file, disk I/O bottleneck, or H.265 re-encoding

**Fix:**
```bash
# Verify you're using -c:v copy (no re-encode)
# Use verbose output to debug
ffmpeg -i video.mp4 -i audio.aac \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y \
  -loglevel verbose output.mp4

# If disk is slow, close other processes or use faster drive
```

---

## Output Specification

**Format:** MP4 (H.264 + AAC)  
**Video Codec:** H.264 (copied from input, no re-encoding)  
**Audio Codec:** AAC  
**Resolution:** 1920×1080  
**Frame Rate:** 30fps  
**File Size:** Similar to silent input (audio adds ~1-2 MB)

**Location:** `updated/autonomous_part*_final.mp4`

---

## Performance Notes

**Extraction:** 1-2 minutes (depends on file size)  
**Mux:** 30 seconds - 2 minutes (fast because video not re-encoded)  
**Total:** 2-4 minutes for all three parts

**CPU:** Low (video copy means minimal processing)  
**Disk:** ~20 MB temporary space for audio files

---

## Related Documentation

- **VOICEOVER_POLICY.md** — VO workflow and when to extract vs regenerate
- **video-render skill** — Renders silent MP4 that audio muxes with
- **render-all-videos agent** — Full pipeline using this skill

---

*Last verified: 2026-05-19*
