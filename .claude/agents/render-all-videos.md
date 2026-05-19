---
type: reference
last_verified: 2026-05-19
owner: aroma
---

# Agent: render-all-videos

Orchestrate the complete video production pipeline: silent render → VO extraction → mux → publish.

---

## Purpose

Automate the full workflow for rendering autonomous session videos from Remotion TSX compositions to final muxed deliverables.

---

## Prerequisites

- Remotion composition files in `drawing-room-remotion/src/*.tsx`
- `Root.tsx` with correct `durationInFrames` (validated against VO duration)
- Voiceovers extracted or available as `.aac` files in `video_production/voiceovers/`
- ffmpeg and ffprobe installed
- Git repository initialized with submodule

---

## Workflow

### Stage 1: Validate Frame Counts

Before rendering, confirm that `durationInFrames` matches voiceover duration:

```bash
# Get VO duration (seconds)
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 video_production/voiceovers/part_1_vo.aac

# Should equal: (duration_seconds * 30fps)
# Check in Root.tsx:
grep "durationInFrames" drawing-room-remotion/src/Root.tsx
```

**Validation formula:** `frames = VO_seconds × 30fps` (max +30 buffer)

If mismatch found: **STOP**. Recalculate before rendering.

### Stage 2: Silent Render (Remotion)

Render each composition as silent MP4:

```bash
cd drawing-room-video/drawing-room-remotion

npx remotion render AutonomousSystemsPart1 \
  --output="../../video_production/autonomous_part1_silent.mp4"

npx remotion render AutonomousSystemsPart2 \
  --output="../../video_production/autonomous_part2_silent.mp4"

npx remotion render AutonomousSystemsPart3 \
  --output="../../video_production/autonomous_part3_silent.mp4"
```

**Output:** `video_production/autonomous_part*_silent.mp4` (temporary files)

**Verify:** Check file sizes (expected: 7-10 MB each)

### Stage 3: Extract Voiceover

If VO doesn't already exist in `video_production/voiceovers/`, extract from final video or copy from source:

```bash
# Option A: Extract from existing final video
ffmpeg -i updated/autonomous_part1_final.mp4 \
  -vn -acodec aac -y video_production/voiceovers/part_1_vo.aac

# Option B: Copy from external source
cp /path/to/part_1_vo.aac video_production/voiceovers/
```

**Flags:**
- `-vn` — No video (audio only)
- `-acodec aac` — Output AAC codec
- `-y` — Overwrite without prompt

**Output:** `video_production/voiceovers/part_*_vo.aac`

**Verify:** VO exists and has correct duration (should match frames ÷ 30)

### Stage 4: Mux Audio + Video

Combine silent MP4 with extracted AAC:

```bash
ffmpeg -i video_production/autonomous_part1_silent.mp4 \
  -i video_production/voiceovers/part_1_vo.aac \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y \
  updated/autonomous_part1_final.mp4

ffmpeg -i video_production/autonomous_part2_silent.mp4 \
  -i video_production/voiceovers/part_2_vo.aac \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y \
  updated/autonomous_part2_final.mp4

ffmpeg -i video_production/autonomous_part3_silent.mp4 \
  -i video_production/voiceovers/part_3_vo.aac \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y \
  updated/autonomous_part3_final.mp4
```

**Flags:**
- `-c:v copy` — Copy video codec (no re-encoding)
- `-c:a aac` — Output audio as AAC
- `-map 0:v:0` — Video stream from input 0
- `-map 1:a:0` — Audio stream from input 1
- `-y` — Overwrite without prompt

**Output:** `updated/autonomous_part*_final.mp4`

**Verify:**
```bash
ls -lh updated/autonomous_part*_final.mp4
ffprobe -v error -show_entries format=duration updated/autonomous_part1_final.mp4
```

### Stage 5: Publish (Copy to Delivery Folder)

Copy final videos to publication endpoint:

```bash
cp updated/autonomous_part*.mp4 /path/to/taleemabad-lms/content/
```

Or commit to git for distribution:

```bash
git add updated/
git commit -m "Publish: Autonomous Session Part 1, 2, 3 (final muxed videos)"
```

### Stage 6: Git Commit (Submodule First)

**Important:** Always commit submodule BEFORE main repo.

```bash
# Step 1: Commit submodule changes
cd drawing-room-video/drawing-room-remotion
git add src/Root.tsx src/AutonomousSessionPart*.tsx
git commit -m "Update: Autonomous Session Parts 1-3 (fixed frame counts, SVG safety)"
cd ../..

# Step 2: Commit main repo submodule pointer
git add drawing-room-video/
git commit -m "Update: Submodule pointer for Autonomous Session Parts 1-3"

# Step 3: Commit final videos and work completion
git add updated/autonomous_part*.mp4 .beads/status.jsonl
git commit -m "Complete: Autonomous Session Part 1, 2, 3 production (render, extract, mux, publish)"
```

---

## Validation Checklist

- [ ] Frame counts validated (frames = VO_seconds × 30fps)
- [ ] Silent renders succeeded (files > 5MB each)
- [ ] VO extraction or copying completed (`.aac` files exist)
- [ ] Mux completed without errors (ffmpeg no errors)
- [ ] Final videos play correctly (spot check 2-3 sections)
- [ ] No blank slides extending beyond audio
- [ ] Final videos in `updated/` folder (not video_production/)
- [ ] Submodule committed FIRST, then main repo pointer
- [ ] `.beads/status.jsonl` updated with completion

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| Frame count > VO frames | Composition too long | Recalculate durationInFrames using formula |
| Render hangs | Out of memory | Close other apps; render one video at a time |
| ffmpeg mux fails | Wrong codec or stream | Verify inputs with ffprobe; check flags |
| Audio sync off | Duration mismatch | Verify VO duration = composition frames ÷ 30 |
| Git commit wrong order | Committed main repo first | Undo: `git reset HEAD~1`; recommit submodule first |

---

## Related Documentation

- **VIDEO_PRODUCTION_RULES.md** — Frame count formula, SVG safety
- **VOICEOVER_POLICY.md** — VO extraction and mux workflows
- **audio-extraction.md** — Detailed ffmpeg commands
- **video-production.md** — Rendering runbook

---

*Last verified: 2026-05-19*
