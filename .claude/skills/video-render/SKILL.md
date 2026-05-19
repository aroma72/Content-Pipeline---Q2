---
type: reference
last_verified: 2026-05-19
owner: aroma
---

# Skill: video-render

Render Remotion TSX compositions to silent MP4 video files.

---

## Purpose

Convert React TSX composition (drawing-room-remotion) into MP4 video.  
Output: Silent video (no audio) ready for VO mux.

---

## Prerequisites

- Node.js 16+ installed
- Remotion CLI available (`npx remotion --version` works)
- Project root is parent of `drawing-room-video/` submodule
- Composition files exist in `drawing-room-video/drawing-room-remotion/src/`
- All dependencies installed: `npm install` in remotion submodule

---

## Command Syntax

```bash
cd drawing-room-video/drawing-room-remotion

npx remotion render <COMPOSITION_ID> [OPTIONS]
```

**Parameters:**
- `<COMPOSITION_ID>` — ID from Root.tsx (e.g., `AutonomousSystemsPart1`)
- `--output <PATH>` — Where to save MP4 (relative to cwd)
- `--fps 30` — Frame rate (must be 30)
- `--height 1080` — Video height (must be 1080)
- `--width 1920` — Video width (must be 1920)

---

## Examples

### Single Composition Render

**Render Part 1:**
```bash
cd drawing-room-video/drawing-room-remotion

npx remotion render AutonomousSystemsPart1 \
  --output="../../video_production/autonomous_part1_silent.mp4"
```

**Render Part 2:**
```bash
npx remotion render AutonomousSystemsPart2 \
  --output="../../video_production/autonomous_part2_silent.mp4"
```

**Render Part 3:**
```bash
npx remotion render AutonomousSystemsPart3 \
  --output="../../video_production/autonomous_part3_silent.mp4"
```

### Batch Render (All Parts)

```bash
cd drawing-room-video/drawing-room-remotion

for part in 1 2 3; do
  npx remotion render AutonomousSystemsPart$part \
    --output="../../video_production/autonomous_part${part}_silent.mp4"
  echo "✓ Part $part rendered"
done

cd ../..
echo "✅ All renders complete"
```

### With Explicit Dimensions

```bash
npx remotion render AutonomousSystemsPart1 \
  --output="../../video_production/autonomous_part1_silent.mp4" \
  --width=1920 \
  --height=1080 \
  --fps=30
```

---

## Output Specification

**Format:** H.264 MP4  
**Resolution:** 1920×1080 (HD)  
**Frame Rate:** 30fps  
**Codec:** H.264 (default)  
**Audio:** None (silent)

**File Size Expectations:**
- 4686 frames (Part 1) ≈ 7-8 MB
- 4629 frames (Part 2) ≈ 7-8 MB
- 6255 frames (Part 3) ≈ 9-10 MB

**Location:** `video_production/autonomous_part*_silent.mp4`

---

## Validation

After rendering, verify:

```bash
# Check file exists and has reasonable size
ls -lh video_production/autonomous_part*.mp4

# Get actual duration (should match VO + 0-1 second)
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 \
  video_production/autonomous_part1_silent.mp4

# Spot check: Play first 10 seconds
ffplay -t 10 video_production/autonomous_part1_silent.mp4
```

---

## Troubleshooting

### "EISDIR: Illegal operation on a directory"

**Cause:** Using `remotion render` directly on Windows (needs full path to .cmd)

**Fix (PowerShell):**
```powershell
# Use full path with shell=True
$path = "$PWD\node_modules\.bin\remotion.cmd"
& $path render AutonomousSystemsPart1 --output="..."
```

**Fix (Bash/WSL):**
```bash
npx remotion render AutonomousSystemsPart1 --output="..."
# Should work directly
```

### "Out of memory" error

**Cause:** Rendering large compositions requires ~1-2GB RAM

**Fix:**
```bash
# Close other applications
# Or render one at a time instead of batch

# Set Node memory limit
NODE_OPTIONS=--max-old-space-size=4096 npx remotion render ...
```

### "durationInFrames mismatch"

**Cause:** `Root.tsx` durationInFrames doesn't match voiceover duration

**Fix:**
```bash
# Get VO duration
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 part_1_vo.aac

# Calculate frames = duration * 30
# Update Root.tsx durationInFrames

# Retry render
npx remotion render AutonomousSystemsPart1 ...
```

### Render completes but video is corrupted

**Cause:** Incomplete write (disk full, process killed, timeout)

**Fix:**
```bash
# Delete partial output
rm video_production/autonomous_part*_silent.mp4

# Retry render with verbose output
npx remotion render AutonomousSystemsPart1 --output="..." --log=verbose
```

---

## Options Reference

| Flag | Purpose | Example |
|---|---|---|
| `--output` | Save location | `--output="path/to/file.mp4"` |
| `--fps` | Frame rate | `--fps=30` |
| `--width` | Video width | `--width=1920` |
| `--height` | Video height | `--height=1080` |
| `--log` | Debug output | `--log=verbose` |
| `--codec` | Video codec | `--codec=h264` (default) |
| `--crf` | Quality (lower = better) | `--crf=18` (default) |
| `--pixelFormat` | Pixel format | `--pixelFormat=yuv420p` |

---

## Related Documentation

- **VIDEO_PRODUCTION_RULES.md** — Frame count validation
- **render-all-videos agent** — Full pipeline (includes this skill)
- **audio-mux skill** — Mux audio to silent video

---

*Last verified: 2026-05-19*
