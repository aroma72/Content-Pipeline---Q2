---
type: standards
last_verified: 2026-05-19
owner: aroma
---

# Video Production Rules

Standards for rendering, timing, and visual correctness in Remotion compositions.

## Frame Count Formula (CRITICAL)

**Frame count = VO_duration_seconds × 30fps (max +30 frame buffer)**

- **30fps:** Fixed frame rate for all compositions
- **VO_duration:** Actual voiceover duration in seconds (measure with ffprobe or audio editor)
- **Buffer:** Max +30 frames (1 second) to account for encoding/rendering variance
- **Validation:** Always verify `durationInFrames` in Root.tsx matches this formula before rendering

### Example Calculations

| VO Duration | Frames (exact) | Frames (with +30 buffer) | Status |
|---|---|---|---|
| 156.2 seconds | 4686 | 4716 | ✅ Use 4686 |
| 154.3 seconds | 4629 | 4659 | ✅ Use 4629 |
| 208.5 seconds | 6255 | 6285 | ✅ Use 6255 |

**Never:**
- Allocate 2-3x the VO duration (causes multi-minute blank slides)
- Round up to nearest thousand frames (wastes rendering time)
- Use different fps rates (always 30fps)

---

## SVG Diagram Safety Rules

### Radial Diagrams (7-node layout)

**ViewBox minimum: 850px height**

**Why:** 7-node radial with labels requires:
- Circle center: y=350
- Circle radius: 250px
- Label offset below circle: +55px
- Label baseline: y=405 (350+55)
- Minimum viewBox height: 405 + 45 (label text height) = 450px
- **Safe minimum: 850px** (provides 400px+ clearance)

**Example (correct):**
```jsx
<svg viewBox="0 0 1000 850" preserveAspectRatio="xMidYMid meet">
  <circle cx={500} cy={350} r={250} fill="#color" />
  <text x={500} y={405} fontSize="14">Label</text>
</svg>
```

**Labels below circles need 60px vertical clearance**
- Text should not overlap with circle edge (radius 45-60px)
- Position labels at center_y + 55px minimum
- Font size caps at 14px for 7-node layouts

### Validation Checklist

- [ ] ViewBox height ≥ 850px for 7-node radials
- [ ] Label y-position ≥ circle_center_y + 55px
- [ ] Text fontSize ≤ 14px
- [ ] Text wrapping enabled (no `white-space: nowrap`)
- [ ] Container padding ≥ 20px on all sides

---

## Text Overflow Prevention

### Typography Standards

| Type | Font Size | Weight | Line Height | Max Width |
|---|---|---|---|---|
| Title | 56px | 700 | 1.2 | 90% |
| Heading | 40px | 600 | 1.2 | 90% |
| Body | 24px | 400 | 1.35 | 85% |
| Caption | 18px | 500 | 1.25 | 80% |

### Container Rules

- **Padding:** Minimum 32px horizontal, 24px vertical (for body text)
- **Box sizing:** Use flexbox or grid, never absolute positioning for text content
- **Text wrapping:** Always enable `word-wrap: "break-word"` or `white-space: "normal"`
- **Overflow:** Never use `overflow: hidden` on text containers; expand container instead

### Positioning Guidelines

**✅ Correct:**
```jsx
<div style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "32px"}}>
  <h2 style={{fontSize: 40, wordWrap: "break-word"}}>Title</h2>
</div>
```

**❌ Wrong:**
```jsx
<div style={{position: "absolute", bottom: 0, padding: "32px"}}>
  <h2>Title</h2>  {/* Overflows when padded */}
</div>
```

---

## Pre-Render Validation

Before running `npx remotion render`, verify:

1. **Frame count matches VO duration**
   ```bash
   # Check actual VO duration
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.aac
   
   # Verify Root.tsx durationInFrames = (duration * 30)
   grep "durationInFrames" drawing-room-remotion/src/Root.tsx
   ```

2. **All Sequence frame allocations sum correctly**
   ```bash
   # Sum all <Sequence durationInFrames> values
   # Should equal total durationInFrames ± 30 frames
   ```

3. **SVG diagrams have safe viewBox**
   ```bash
   grep -n "viewBox" drawing-room-remotion/src/*.tsx | grep -v "850\|900\|1000"
   # No results = safe; results with <850 height = needs fix
   ```

4. **Text elements have word-wrap enabled**
   ```bash
   grep -n "white-space.*nowrap" drawing-room-remotion/src/*.tsx
   # No results = safe; any results = needs fixing
   ```

---

## Known Issues & Fixes

| Issue | Cause | Fix | Prevention |
|---|---|---|---|
| Text cutoff at edges | SVG viewBox too small | Expand to 850px+ | Validate before render |
| Blank slides for minutes | Sequence frames 2-3x VO | Recalculate: frames = VO_s × 30 | Use frame count formula |
| Text overflow container | Absolute positioning + padding | Refactor to flexbox | Use flex/grid layouts |
| Audio/video desync | Regenerate VO instead of extract | Extract VO, edit visuals to match | Never regenerate VO |

---

## Render Command

```bash
cd drawing-room-video/drawing-room-remotion

# Render single composition
npx remotion render AutonomousSystemsPart1 --output="../../../video_production/autonomous_part1_silent.mp4"

# Check output
ls -lh ../../../video_production/
```

**Output location:** `video_production/` (temporary)
**Final location:** `updated/` (after mux with VO)

---

*Last verified: 2026-05-19*
