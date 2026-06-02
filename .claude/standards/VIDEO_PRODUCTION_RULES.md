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

## Text Layout & Typography (CRITICAL — fixes indentation/overflow issues)

### Safe Zone Rule (Coursera/Udemy Standard)

**All text content must live inside the safe zone:**
- **Horizontal padding:** minimum `120px` each side (not 32px — that is for SVG only)
- **Vertical padding:** minimum `80px` top and bottom
- **Effective text area:** 1680px wide × 920px tall (inside 1920×1080 canvas)
- **Never** use `padding: "32px"` on a full-screen text container — that places text 32px from the raw edge, which reads as jammed against the border at video scale

```tsx
// ✅ Correct — safe zone padding
<AbsoluteFill style={{ padding: '80px 120px' }}>
  {/* all text content here */}
</AbsoluteFill>

// ❌ Wrong — text too close to edge
<AbsoluteFill style={{ padding: '32px' }}>
```

### Typography Scale (1920×1080 @ 30fps — Coursera/Udemy Grade)

| Element | Font Size | Weight | Line Height | Max Width | Notes |
|---|---|---|---|---|---|
| Hero title / hook | 62–72px | 700 | 1.15 | 1400px | One strong statement per screen |
| Section heading | 48–56px | 700 | 1.2 | 1400px | Topic or phase label |
| Eyebrow label | 16px | 700 | 1.0 | — | UPPERCASE, letter-spacing 4px |
| Bullet / key point | 28–32px | 700 | 1.45 | 1400px | Never below 28px at 1080p |
| Body / supporting | 24–26px | 400 | 1.6 | 1200px | Readable at arm's length |
| Card title | 26px | 700 | 1.3 | — | Inside card containers |
| Card body | 20–22px | 400 | 1.5 | — | Inside card containers |
| Closing CTA | 28–32px | 700 | 1.3 | 960px | Centred, large enough to scan |

**Why these sizes:** Coursera and Udemy target 1080p playback at ~60–80cm viewing distance. At that distance, anything below 24px body text or 28px bullets appears small. The previous 24px bullets were borderline; 28px is the safe floor.

### Max Width Constraints (prevents edge-to-edge text)

Text must never stretch across the full 1680px text area. Apply `maxWidth` to all paragraph-style content:

```tsx
// ✅ Bullets and body — constrained width for readability
<div style={{ maxWidth: 1400, width: '100%' }}>
  {bullets.map(b => <BulletRow key={b} text={b} />)}
</div>

// ✅ Body copy — tighter constraint for comfort
<p style={{ maxWidth: 1200, fontSize: 26, lineHeight: 1.6 }}>
  Supporting explanation text
</p>

// ❌ Wrong — fills full width, hard to read
<p style={{ width: '100%', fontSize: 26 }}>
```

### Container Rules

- **Layout:** Always `display: flex, flexDirection: column` — never absolute positioning for text blocks
- **Text wrapping:** Always `wordWrap: "break-word"`, `whiteSpace: "normal"` — never `nowrap`
- **Overflow:** Never `overflow: hidden` on text containers — expand container instead
- **Alignment:** Left-align multi-line body text; centre only single-line titles and CTAs

### Positioning Reference

**✅ Correct — full slide text layout:**
```tsx
<AbsoluteFill style={{
  backgroundColor: BG,
  padding: '80px 120px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}}>
  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 4,
    textTransform: 'uppercase', color: BRAND, marginBottom: 16 }}>
    Eyebrow label
  </div>
  <div style={{ fontSize: 56, fontWeight: 700, color: HEADING,
    lineHeight: 1.2, maxWidth: 1400, marginBottom: 32 }}>
    Hero title text
  </div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1400 }}>
    {/* bullet rows */}
  </div>
</AbsoluteFill>
```

**❌ Wrong:**
```tsx
<div style={{ position: 'absolute', left: 32, right: 32, padding: 32 }}>
  <h2>Title</h2>
</div>
```

---

## Animation Correctness Rules (CRITICAL)

### The #1 Animation Bug: useVideoConfig() instead of useCurrentFrame()

**NEVER** compute animation progress from `useVideoConfig()` alone. `durationInFrames` and `fps` from `useVideoConfig()` are static constants — they do not change per frame. Using them to compute `progress` produces a frozen image.

**❌ Wrong (produces static/frozen output):**
```tsx
const { fps, durationInFrames } = useVideoConfig();
const progress = Math.min(durationInFrames / (8 * fps), 1); // Always 1.0!
```

**✅ Correct (animates over time):**
```tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const progress = Math.min(frame / (8 * fps), 1); // 0→1 over 8 seconds
```

### Minimum Animation Requirements Per Segment

- Every Sequence segment must have at least 2 distinct motion events
- No element may be static (same value) for more than 60 consecutive frames (2 seconds)
- Use `spring()` for entrance animations, `interpolate()` for continuous motion
- CSS `transition` properties have NO effect in Remotion — Remotion renders each frame independently

### Pre-Render Animation Check

```bash
# Verify no segment uses the broken useVideoConfig pattern
grep -rn "durationInFrames / (" drawing-room-remotion/src/
# Any results = animation bug — replace with useCurrentFrame() pattern
```

---

## Design System Standards

### Approved Background Palette — School of Life Theme

| Token | Hex | Description |
|---|---|---|
| Background (all segments) | `#F5F1E8` | Warm cream — inviting, timeless |
| Closing phase tint | `#EDE8DC` | Slightly deeper cream for resolution |
| Heading text | `#6B5344` | Dark brown — warm, authoritative |
| Body text | `#9B7A6B` | Medium brown — readable, warm |
| Primary accent | `#C67C5F` | Terracotta |
| Secondary accent | `#8B9F7E` | Sage green |
| Tertiary accent | `#A8C9D1` | Soft blue |
| Warm highlight | `#E8A87C` | Warm orange |

**NEVER use:** `#FFFFFF`, `#FAFAFA`, near-white, dark navy, or cold blue backgrounds.
Reference: `drawing-room-remotion/src/segments/SchoolOfLifeTheme.ts`

### Typography Scale (Coursera/Udemy Grade — 1920×1080)

| Element | Size | Weight | Font | Notes |
|---|---|---|---|---|
| Hero title | 62–72px | 700 | Georgia, serif | Max 1400px wide |
| Section heading | 48–56px | 700 | Georgia, serif | Max 1400px wide |
| Section eyebrow | 16px | 700 | Georgia, serif | UPPERCASE, letter-spacing 4px |
| Bullet / key point | 28–32px | 700 | Georgia, serif | Never below 28px |
| Body copy | 24–26px | 400 | Georgia, serif | Max 1200px wide, lineHeight 1.6 |
| Card title | 26px | 700 | Georgia, serif | Inside cards |
| Card body | 20–22px | 400 | Georgia, serif | Inside cards |
| Closing CTA | 28–32px | 700 | Georgia, serif | Centred |

**Safe zone:** All text inside `padding: '80px 120px'` — never `padding: '32px'` on full-screen containers.

### Color Semantics

- **Red** (#DC2626, #EF4444, #F87171) = **error/danger state only** — never for comparisons
- **Amber** (#D97706, bg #FFFBEB) = starting state, current state, "consumer" role
- **Green** (#16A34A, bg #F0FDF4) = goal state, achieved state, "producer" role
- **Brand blue** (#4A7BA7) = labels, accents, CTA backgrounds

### Phase Transition Pattern (Opacity-Only Mounting)

All content phases must be mounted from frame 0. Opacity controls visibility.

```tsx
// ✅ Correct — phases replace each other cleanly
const phaseOp = interpolate(frame,
  [startF, startF + 20, endF, endF + 20],
  [0, 1, 1, 0],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Apply to container:
<div style={{ position: 'absolute', inset: 0, opacity: phaseOp }}>
  {/* phase content */}
</div>
```

```tsx
// ❌ Wrong — stacks all phases on screen simultaneously
{frame > P2_IN && <div>Phase 2 content</div>}
```

### Bullet/Pointer Standards

Replace small dots or emoji with a coloured left-border bar. **Minimum font size: 28px.**

```tsx
<div style={{ display: 'flex', alignItems: 'stretch', gap: 0, maxWidth: 1400 }}>
  <div style={{ width: 5, alignSelf: 'stretch', backgroundColor: BRAND,
    borderRadius: 3, marginRight: 24, flexShrink: 0 }} />
  <div style={{ fontSize: 28, fontWeight: 700, color: HEADING, lineHeight: 1.45 }}>
    Bullet text here — min 28px, never 24px
  </div>
</div>
```

### Float Animation Minimum

```tsx
// amplitude MUST be >= 14px — anything below 10px is invisible at video scale
const floatY = (frame: number, period = 150, amplitude = 14) =>
  Math.sin((frame / period) * Math.PI * 2) * amplitude;
```

### Pre-Render Design Check

```bash
# Verify font is Georgia (not system UI)
grep -rn "apple-system\|Segoe UI\|Roboto\|Arial" drawing-room-remotion/src/
# Any results = fix required

# Verify no conditional phase rendering (stacking bug)
grep -rn "frame > P[0-9]\|showPhase\|frame >= " drawing-room-remotion/src/
# Results using show/hide logic = rewrite to opacity pattern
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

5. **Safe zone padding in use (not raw 32px)**
   ```bash
   grep -n "padding.*32px\|padding: .32." drawing-room-remotion/src/*.tsx
   # Any results on full-screen containers = replace with '80px 120px'
   ```

6. **Bullet font size is 28px minimum**
   ```bash
   grep -n "fontSize.*2[0-7]\b" drawing-room-remotion/src/*.tsx
   # Results in bullet rows = bump to 28px minimum
   ```

7. **No scale() on text containers**
   ```bash
   grep -n "scale(" drawing-room-remotion/src/*.tsx
   # Results inside text/paragraph divs = remove; scale() only on decorative elements
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

*Last verified: 2026-05-25*
