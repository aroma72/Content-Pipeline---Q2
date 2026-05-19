---
type: reference
last_verified: 2026-05-19
owner: aroma
---

# Agent: quality-checker

Validate frame counts and design rules before rendering. Prevent blank slides, text cutoff, and timing errors.

---

## Purpose

Pre-render quality gate. Catches mistakes before expensive Remotion renders or delivers broken videos.

---

## When to Run

**Automatically:** Before any video render operation  
**Manually:** `python3 video_quality_orchestrator.py` in project root

---

## Checks Performed

### Check 1: Frame Count Validation

Verify that each composition's `durationInFrames` matches the voiceover duration.

**Formula:** `frames = VO_duration_seconds × 30fps (max +30 buffer)`

**Example:**
```
Part 1 VO duration: 156.2 seconds
Expected frames: 156.2 × 30 = 4686 frames
Actual frames in Root.tsx: 4685 frames
✅ PASS (within +30 buffer)
```

**Implementation:**
```python
# Pseudo code
vo_duration = get_vo_duration("video_production/voiceovers/part_1_vo.aac")
expected_frames = int(vo_duration * 30)
actual_frames = get_composition_frames("Root.tsx", "AutonomousSystemsPart1")

if abs(actual_frames - expected_frames) > 30:
    return FAIL("Frames mismatch: expected {expected}, got {actual}")
```

**Files checked:**
- `drawing-room-remotion/src/Root.tsx` (durationInFrames)
- All composition files (AutonomousSystemsPart*.tsx)
- `video_production/voiceovers/*.aac` (actual VO duration)

### Check 2: SVG Diagram Safety

Verify SVG viewBox heights are safe for radial diagrams.

**Rule:** Minimum viewBox height 850px for 7-node radials

**Implementation:**
```bash
grep -n "viewBox" drawing-room-remotion/src/*.tsx | while read line; do
  if [[ $line == *"viewBox"* ]]; then
    height=$(echo $line | grep -oP 'viewBox="[^"]*"' | grep -oP '\d+$')
    if [ "$height" -lt 850 ]; then
      echo "❌ FAIL: viewBox height $height < 850px in $line"
    fi
  fi
done
```

**Files checked:**
- All `*.tsx` files with SVG elements
- Focus on Scene 2 type layouts (radial diagrams)

### Check 3: Text Overflow Prevention

Verify text containers use safe positioning (flexbox/grid, not absolute).

**Rule:** No `position: absolute` for text elements; use flexbox

**Implementation:**
```bash
grep -n 'position.*absolute' drawing-room-remotion/src/*.tsx | \
  grep -A 5 -B 5 '<\(h\|p\|div.*text\)' | \
  echo "❌ WARNING: Absolute positioning detected on text element"
```

**Files checked:**
- All component files with text content
- Focus on Scene 5, 6 type layouts

### Check 4: Sequence Frame Allocation

Verify all Sequence `durationInFrames` sum to total composition duration.

**Rule:** Sum of all Sequence durations ≤ total durationInFrames (max +30 buffer)

**Implementation:**
```python
# Pseudo code
def validate_sequence_frames(tsx_file):
    total_duration = get_composition_duration(tsx_file)
    sequence_sum = sum(get_all_sequence_durations(tsx_file))
    
    if sequence_sum > total_duration + 30:
        return FAIL(f"Sequences overallocated: {sequence_sum} > {total_duration}")
    return PASS()
```

**Example:**
```
AutonomousSessionPart1:
  Scene 1: 397 frames
  Scene 2: 1457 frames
  Scene 3: 583 frames
  Scene 4: 916 frames
  Scene 5: 1030 frames
  Scene 6: 246 frames
  Total: 4629 frames
  Target: 4685 frames
  ✅ PASS (within 30 frame buffer)
```

### Check 5: Typography Standards

Verify text styling matches safety rules.

**Rules:**
- Title: ≤56px, weight 700, line-height 1.2
- Heading: ≤40px, weight 600, line-height 1.2
- Body: ≤24px, weight 400, line-height 1.35
- Caption: ≤18px, weight 500, line-height 1.25

**Implementation:**
```bash
grep -n "fontSize:" drawing-room-remotion/src/*.tsx | while read line; do
  size=$(echo $line | grep -oP 'fontSize:\s*\K\d+')
  if [ "$size" -gt 56 ]; then
    echo "❌ WARNING: Font size $size exceeds title max (56px)"
  fi
done
```

---

## Output Format

**If ALL checks pass:**
```
✅ QUALITY CHECK PASSED
  ✓ Frame counts validated (4685, 4629, 6255 frames)
  ✓ SVG diagrams safe (viewBox ≥ 850px)
  ✓ Text positioning secure (no absolute positioning on text)
  ✓ Sequence frames allocated correctly
  ✓ Typography standards met

Safe to render.
```

**If ANY check fails:**
```
❌ QUALITY CHECK FAILED

Frame Count Mismatch (AutonomousSystemsPart1):
  Expected: 4686 frames (156.2s VO × 30fps)
  Actual: 4800 frames
  Difference: +114 frames (+3.8 seconds of blank slides)
  FIX: Update Root.tsx durationInFrames to 4686

SVG Diagram Issues:
  ❌ AutonomousSessionPart2.tsx Scene 2: viewBox height 700px < 850px
  FIX: Change viewBox="0 0 1000 700" to viewBox="0 0 1000 850"

DO NOT RENDER until all issues resolved.
```

---

## Integration with Render Pipeline

The `render-all-videos` agent calls this first:

```bash
# Step 0: Quality Check
python3 video_quality_orchestrator.py
if [ $? -ne 0 ]; then
  echo "Quality checks failed. Fix issues before rendering."
  exit 1
fi

# Step 1: Silent Render (only if quality check passed)
cd drawing-room-video/drawing-room-remotion
npx remotion render AutonomousSystemsPart1 ...
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| "Frame count mismatch" | VO duration changed | Recalculate: duration × 30 = new frames |
| "ViewBox too small" | Copy-paste from old composition | Expand to 850px minimum |
| "Sequence sum mismatch" | Scene durations don't add up | Check each Scene's durationInFrames |
| "Text overflow detected" | Absolute positioning with padding | Refactor to flexbox layout |

---

## Related Documentation

- **VIDEO_PRODUCTION_RULES.md** — Frame count formula, SVG safety, typography
- **render-all-videos agent** — Calls this quality checker before rendering
- **video_quality_orchestrator.py** — Implementation details

---

*Last verified: 2026-05-19*
