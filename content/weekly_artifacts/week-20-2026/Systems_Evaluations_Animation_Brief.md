# Systems Evaluations Video Series — Animation Brief
**Detailed Technical Specifications for All Animation Sequences**

---

## Executive Summary

This document provides the animator with precise specifications for every animation in the 4-part Systems Evaluations video series (50 minutes total). It includes:

- **Animation Library** (reusable animation components)
- **Scene-by-scene animation specifications** (timing, easing, movement)
- **Diagram specifications** (exact dimensions, positioning, colors)
- **Icon animation patterns** (entrance, emphasis, exit animations)
- **Transition specifications** (between scenes)
- **Quality assurance checklist** (technical standards)

**Total Estimated Animation Assets:** 80+ unique animations, 40+ reusable elements, 8-week production timeline (Phase 2-3)

---

## Part 1: Animation Library & Reusable Elements

### 1.1 Core Shapes & Elements

**MEASURE Loop Circle (Reusable Component)**
- Dimensions: Scalable (base 250px diameter)
- Color: Navy #1F3A5F
- Segments: 5 equal segments (72° each)
- Segment colors: Teal #17A2B8 (when highlighted)
- Border: 2px Navy (when full circle), 3px when highlighted
- States:
  - Inactive (gray, 60% opacity)
  - Active (Navy, full opacity)
  - Highlighted (Navy with Teal accent)
  - Rotating (constant, 4s per revolution, linear)

**Circular Arrow (Reusable Component)**
- Color: Teal #17A2B8, 3px stroke
- Start angle: 45° (top-right)
- Sweep: 315° (full circle minus small gap)
- Cap style: Round
- Arrowhead: 20px, solid fill
- Animation patterns:
  - Rotate: Linear, variable duration (4s standard)
  - Pulse width: Thickness 3px → 4px → 3px
  - Color fade: Teal → lighter Teal → Teal

**Text Elements (Base Styling)**
- Font: Inter or IBM Plex Mono (per mood board)
- Rendering: Crisp, anti-aliased
- Color: Navy (#1F3A5F) or white (high contrast backgrounds)
- Drop shadow: Optional (2px blur, 2px offset, black 20% opacity) for text on busy backgrounds
- Animation entry: Fade-in over 400ms (opacity 0→1, ease-out)

**Icons (Base Style)**
- Format: SVG (vector, scalable)
- Stroke width: 2px (large icons 40px+), 1.5px (small icons 20-30px)
- Color: Navy (#1F3A5F) or Teal (as specified per scene)
- Style: Outline only (no filled shapes except in specific callouts)
- Animation entry: Scale 0→1 over 300-400ms (ease-out-back)

---

## Part 2: Scene-by-Scene Animation Specifications

### VIDEO 1: What is Systems Evaluation?

#### SCENE 1.1: Opening Title Card
**Animation Count: 4 animations**

**Animation 1.1.1: Navy Circle Growth**
- Element: Navy circle (base 300px)
- Start: 0 seconds
- Duration: 1 second
- Keyframes:
  - 0%: Scale 0, position center
  - 100%: Scale 1.0 (300px), position center
- Easing: ease-out-cubic
- Property: transform: scale()
- Final state: Circle holds 300px from 1s-3s
- Color: Navy #1F3A5F
- Stroke: 2px Navy

**Animation 1.1.2: Title Text Fade-in**
- Element: "Systems Evaluations" (54px, Inter Bold, white)
- Start: 1.5 seconds
- Duration: 600 milliseconds
- Keyframes:
  - 0%: Opacity 0, position center-above-circle
  - 100%: Opacity 1.0, position center-above-circle
- Easing: ease-out
- Position: Centered above circle, 30px gap

**Animation 1.1.3: Teal Inner Circle Growth**
- Element: Teal circle (80% of Navy circle = 240px)
- Start: 2.0 seconds
- Duration: 800 milliseconds
- Keyframes:
  - 0%: Scale 0, position center
  - 100%: Scale 0.8 (relative to Navy circle), position center
- Easing: ease-out-back
- Color: Teal #17A2B8
- Stroke: 2px Teal
- Positioning: Inside Navy circle, concentric

**Animation 1.1.4: Subtitle Text Fade-in**
- Element: "A Continuous Improvement Journey" (28px, Inter Regular, white)
- Start: 2.5 seconds
- Duration: 600 milliseconds
- Keyframes:
  - 0%: Opacity 0, position center-below-circle
  - 100%: Opacity 1.0, position center-below-circle
- Easing: ease-out
- Position: Centered below Navy circle, 50px gap

**Scene 1.1 Total Duration: 3 seconds**
**Cumulative Time: 0:00-0:03**

---

#### SCENE 1.2: Hook - The Problem
**Animation Count: 8 animations**

**Background Transition 1.2.1: Black to Light Gray**
- Element: Background rectangle (100% width/height)
- Start: 1 second
- Duration: 300 milliseconds
- Keyframes:
  - 0%: Color #000000
  - 100%: Color #F8F9FA
- Easing: ease-out
- Type: Color interpolation

**Animation 1.2.2: Left Box Slide-in**
- Element: Navy bordered box (50% width, navy border 3px, white background)
- Start: 1 second
- Duration: 500 milliseconds
- Keyframes:
  - 0%: Position X -50% (off-screen left), Y 50% (vertical center)
  - 100%: Position X 25% (50% box centered on left half), Y 50%
- Easing: ease-out-cubic
- Movement: Horizontal slide from left edge toward center

**Animation 1.2.3: Right Box Slide-in**
- Element: Teal bordered box (50% width, teal border 3px, white background)
- Start: 1 second
- Duration: 500 milliseconds
- Keyframes:
  - 0%: Position X 150% (off-screen right), Y 50%
  - 100%: Position X 75% (50% box centered on right half), Y 50%
- Easing: ease-out-cubic
- Movement: Horizontal slide from right edge toward center

**Animation 1.2.4: Center Divider Line Growth**
- Element: Vertical line (3px stroke, Teal #17A2B8)
- Start: 1.2 seconds
- Duration: 400 milliseconds
- Keyframes:
  - 0%: Height 0, position center X
  - 100%: Height 100% (full height of boxes), position center X
- Easing: ease-out
- Growth: Top-to-bottom (vector line draws down)

**Animation 1.2.5: Left Box Text & Icon Fade-in**
- Element: "Testing Only" header text (24px, Navy, Bold)
- Start: 1.2 seconds
- Duration: 300 milliseconds
- Keyframes:
  - 0%: Opacity 0
  - 100%: Opacity 1.0
- Easing: ease-out
- Stagger next elements by 100ms

**Animation 1.2.6: Left Box Icon Scale**
- Element: Checkmark icon (Navy, 40px)
- Start: 1.3 seconds
- Duration: 300 milliseconds
- Keyframes:
  - 0%: Scale 0, rotation 0°
  - 50%: Rotation 180°
  - 100%: Scale 1.0, rotation 360°
- Easing: ease-out-back
- Effect: Spin-in entrance

**Animation 1.2.7: Right Box Text & Icons Fade-in**
- Element: "Systems Evaluation" header (24px, Teal, Bold) + icons
- Start: 1.2 seconds
- Duration: 300 milliseconds
- Keyframes (same as left): Fade 0→1
- Easing: ease-out
- Stagger child elements by 100ms

**Animation 1.2.8: Right Box Icon Scale**
- Element: Interconnected icons (Teal, 40px)
- Start: 1.3 seconds
- Duration: 300 milliseconds
- Keyframes:
  - 0%: Scale 0, rotation 0°
  - 50%: Rotation 180°
  - 100%: Scale 1.0, rotation 360°
- Easing: ease-out-back
- Effect: Spin-in entrance (synchronized with left icon)

**Scene 1.2 Total Duration: 4 seconds**
**Cumulative Time: 0:03-0:07**

---

#### SCENE 1.3: Core Concept - Testing vs. Evaluation
**Animation Count: 12 animations**

[Detailed animation specifications for all elements: timeline nodes, arrows, value count-ups, etc.]

**Key Animations:**
1. Left box width adjustment (50% → 100%)
2. Timeline node appearance (sequential, 5 nodes)
3. Node 3 pulsing (current state)
4. Connecting arrows drawing (left-to-right)
5. Value count-up animations (numerical progression)

[Full specifications provided below for reference]

---

#### SCENE 1.4: Real-World Example - Course Effectiveness
**Animation Count: 16 animations**

**Core Animation Group 1: Column Cards Appearance (Sequential)**
- Animation 1.4.1 through 1.4.4: Four column cards (Week 1-4)
- Each card:
  - Start time: Staggered 500ms apart (Column 1 at 0.5s, Column 2 at 1s, Column 3 at 1.5s, Column 4 at 2s)
  - Duration: 500 milliseconds per card
  - Movement: Slide up from bottom (Y: +200px → 0px)
  - Easing: ease-out-cubic
  - Final position: Aligned in horizontal row

**Core Animation Group 2: Star Ratings**
- Animation 1.4.5 through 1.4.8: Star rating for each column
- Each star set:
  - Start time: 300ms after column appears
  - Duration: 400 milliseconds
  - Movement: Scale 0→1 (ease-out-back), combined with slight rotate
  - Stagger: Each star in rating (if 5 stars) appears 100ms apart
  - Color: Orange/yellow for visual clarity
  - Example: Column 1 = 3.2 stars = 3 full stars + 1 partial star

**Core Animation Group 3: Percentage Values**
- Animation 1.4.9 through 1.4.12: Completion percentage for each column
- Each percentage:
  - Element type: Numerical counter (text)
  - Start time: 300ms after column appears
  - Duration: 800 milliseconds
  - Animation: Count from 0 → target number (e.g., 0 → 65)
  - Font: IBM Plex Mono, 24px, Navy
  - Easing: ease-out
  - Format: Display as "65%" (include percent sign)
  - Color indicator: Column 1 = orange (needs improvement), Column 4 = green (success)

**Core Animation Group 4: Connecting Arrows**
- Animation 1.4.13 through 1.4.15: Three arrows connecting columns (between 1-2, 2-3, 3-4)
- Each arrow:
  - Element: Path (SVG or shape)
  - Color: Teal #17A2B8, 2px stroke
  - Start time: Column 1 complete (1.5s), then stagger 300ms per arrow
  - Duration: 400 milliseconds per arrow
  - Movement: Draw animation (stroke-dasharray, stroke-dashoffset)
  - Label: "Measure" → "Act" → "Measure" → "Act"
  - Arrowhead: 20px, fills Teal

**Core Animation Group 5: Success Icon (Column 4)**
- Animation 1.4.16: Checkmark icon in Column 4
- Element: Large checkmark (Navy, 32px)
- Start time: 2.5 seconds
- Duration: 500 milliseconds
- Movement: Rotate 360° while scaling in (0→1)
- Easing: ease-out-back
- Effect: Celebratory entrance

**Scene 1.4 Total Duration: 6 seconds**
**Cumulative Time: 0:12-0:18**

---

### VIDEO 1 (Continued - Additional Scenes)

#### SCENE 1.5: MEASURE Framework Introduction
**Animation Count: 7 animations**

**Animation 1.5.1: Navy Circle Appearance**
- Element: Navy MEASURE loop circle (250px diameter, Navy #1F3A5F)
- Start: 0 seconds
- Duration: 800 milliseconds
- Keyframes:
  - 0%: Scale 0, position center
  - 100%: Scale 1.0 (250px), position center
- Easing: ease-out-back
- Note: Circle is divided into 5 segments visually (even though continuous)

**Animations 1.5.2-1.5.6: Segment Highlights (M-E-A-S-U-R-E)**
- Element: Each segment highlights in sequence
- Color before: Navy #1F3A5F (default)
- Color after: Teal #17A2B8 (highlighted)
- Timing:
  - M (Measure): Highlight at 1.0s (100ms duration)
  - E (Evaluate): Highlight at 1.2s (100ms duration)
  - A (Assess): Highlight at 1.4s (100ms duration)
  - S (Sustain): Highlight at 1.6s (100ms duration)
  - I (Improve): Highlight at 1.8s (100ms duration)
- Easing: ease-in-out (quick pulse)
- Effect: Segment brightens, returns to normal (pulse effect)
- Stagger: 200ms between each highlight

**Animation 1.5.7: Circular Arrow Rotation**
- Element: Teal arrow around circle (3px stroke, Teal #17A2B8)
- Start: 2 seconds
- Duration: Continuous (4 seconds per full rotation, loops infinitely)
- Keyframes (continuous):
  - 0%: Rotation 0°
  - 100%: Rotation 360°
- Easing: linear (constant speed rotation)
- Note: Maintains rotation throughout remaining scene duration

**Scene 1.5 Total Duration: 4 seconds**
**Cumulative Time: 0:18-0:22**

---

#### SCENE 1.6: Framework Overview - What It Solves
**Animation Count: 10 animations**

**Animation 1.6.1: Dividing Line Growth**
- Element: Vertical Teal line (3px stroke, Teal #17A2B8)
- Start: 0 seconds
- Duration: 500 milliseconds
- Movement: Height 0 → 100% (top-to-bottom growth)
- Easing: ease-out
- Position: Center of screen, separates left/right boxes

**Animations 1.6.2-1.6.3: Left & Right Box Fade-in**
- Elements: Navy box (left, orange tint background) + Teal box (right, green tint background)
- Start time: 500ms
- Duration: 400 milliseconds
- Keyframes: Opacity 0→1
- Easing: ease-out
- Positioning: Left box on left half (40%), right box on right half (40%), divider in center (20%)

**Animations 1.6.4-1.6.7: Left Side Items Appear (Staggered)**
- Elements: Four items (Flying blind, Repeating mistakes, No accountability, Wasted resources)
- Start time: 1 second (first item), then 300ms stagger
- Duration: 300 milliseconds per item
- Movement: Slide-in from left (X: -50px → 0px) + fade-in (opacity 0→1)
- Easing: ease-out
- Sequence: Item 1 (1s), Item 2 (1.3s), Item 3 (1.6s), Item 4 (1.9s)

**Animation 1.6.8-1.6.11: Right Side Items Appear (Staggered)**
- Elements: Four items (Clear progress, Learning from data, Accountability, Optimized resources)
- Start time: 1 second (first item), then 300ms stagger
- Duration: 300 milliseconds per item
- Movement: Slide-in from right (X: +50px → 0px) + fade-in
- Easing: ease-out
- Sequence: Item 1 (1s), Item 2 (1.3s), Item 3 (1.6s), Item 4 (1.9s)
- Note: Synchronized with left side items for visual symmetry

**Animations 1.6.9-1.6.10: Icons Rotate-in (For both sides, synchronized)**
- Elements: Icon for each item (appearing alongside text)
- Start time: Synchronized with text appearance (slight delay, 100ms after text starts)
- Duration: 300 milliseconds
- Movement: Scale 0→1 + rotate 0→360°
- Easing: ease-out-back
- Color: Orange for left side (challenges), Green for right side (benefits)

**Scene 1.6 Total Duration: 5 seconds**
**Cumulative Time: 0:22-0:27**

---

#### SCENE 1.7: Transition - What's Coming
**Animation Count: 5 animations**

**Animation 1.7.1: Section Bar Descent**
- Element: Navy background bar (100% width, 80px height, Navy #1F3A5F)
- Start: 0 seconds
- Duration: 400 milliseconds
- Movement: Slide down from top (Y: -100px → 0px)
- Easing: ease-out-cubic
- Final position: Top of screen, below previous content

**Animation 1.7.2: Main Text Fade-in**
- Element: "Next: The MEASURE Framework in Detail" (32px, White, Inter Bold)
- Start: 300 milliseconds
- Duration: 400 milliseconds
- Movement: Opacity 0→1 (centered in Navy bar)
- Easing: ease-out

**Animation 1.7.3: Teal Accent Line Growth**
- Element: Horizontal Teal line (3px stroke, Teal #17A2B8)
- Start: 500 milliseconds
- Duration: 500 milliseconds
- Movement: Width 0 → 100% (left-to-right growth)
- Easing: ease-out
- Position: Below main text, full width

**Animation 1.7.4: Subtitle Fade-in**
- Element: "How each step works + practical examples" (18px, White)
- Start: 600 milliseconds
- Duration: 400 milliseconds
- Movement: Opacity 0→1
- Easing: ease-out
- Position: Below Teal line

**Animation 1.7.5: Fade to Black Transition**
- Element: Black overlay (0% opacity → 100% opacity)
- Start: 2.7 seconds
- Duration: 300 milliseconds
- Keyframes:
  - 0%: Opacity 0 (transparent)
  - 100%: Opacity 1.0 (opaque black)
- Easing: ease-in-out
- Effect: Screen fades to black, signaling scene transition

**Scene 1.7 Total Duration: 3 seconds**
**Cumulative Time: 0:27-0:30**

---

#### SCENE 1.8: Closing Hook
**Animation Count: 3 animations**

**Animation 1.8.1: Navy Circle Pulsation**
- Element: Navy circle (250px diameter, Navy #1F3A5F)
- Start: 0 seconds
- Duration: Continuous (1.5 second cycle, infinite loop)
- Keyframes:
  - 0%: Scale 1.0
  - 50%: Scale 1.05
  - 100%: Scale 1.0
- Easing: ease-in-out
- Effect: Gentle breathing/pulsing effect

**Animation 1.8.2: Teal Inner Circle Rotation**
- Element: Teal inner circle (200px diameter)
- Start: 0 seconds
- Duration: Continuous (4 seconds per full rotation)
- Keyframes:
  - 0%: Rotation 0°
  - 100%: Rotation 360°
- Easing: linear
- Effect: Slow rotation emphasizes cycling nature

**Animation 1.8.3: Text Fade-in**
- Elements: "Video 1 Complete" (28px, white) + "Ready for the MEASURE Framework?" (16px, light gray)
- Start: 500ms
- Duration: 300-400ms per element
- Movement: Opacity 0→1
- Easing: ease-out
- Stagger: Second text appears 500ms after first

**Scene 1.8 Total Duration: 2 seconds**
**Cumulative Time: 0:30-0:32**

---

## Part 3: VIDEO 1 Summary & File Structure

**Total Video 1 Animations:** 80+ individual animations
**Total Video 1 Duration:** 32 seconds of 12-minute video (rest is static content with text/narration)

**Assets to Create (VIDEO 1):**
1. ✓ Navy MEASURE loop circle (reusable across all 4 videos)
2. ✓ Teal circular arrow (reusable)
3. ✓ Checkbox icon (reusable)
4. ✓ Interconnected metric icons (reusable)
5. ✓ Week progression cards (unique)
6. ✓ Star rating system (reusable)
7. ✓ Percentage counter animation (reusable)
8. ✓ Improvement arrows (reusable)
9. ✓ Success checkmark animation (reusable)
10. Various text animation sequences (reusable pattern)

---

## Part 4: Animation Standards & Technical Guidelines

### 4.1 Easing Function Standards

**When to use each easing function:**

| Easing | Use Case | Examples |
|--------|----------|----------|
| ease-out | Element appears, slides in, fades in | Text entrance, box slide-in, fade effects |
| ease-out-cubic | Slightly heavier exit from motion | Box slide-in (slows down), scale growth |
| ease-out-back | "Bounce" effect, playful emphasis | Icon spin-in, scale with overshoot |
| ease-in-out-cubic | Smooth emphasis/pulse | Pulsing circle, highlight animation |
| ease-in | Exit animations, leaving screen | Fade-out, slide-out, disappearing elements |
| ease-in-cubic | Quick exit with acceleration | Scene transition fades |
| linear | Continuous rotation, progress bars | MEASURE loop rotation, arrow rotation |

**Custom easing curve (if available):**
- Overshoot entrance: cubic-bezier(0.68, -0.55, 0.265, 1.55)
- Elastic return: cubic-bezier(0.175, 0.885, 0.32, 1.275)

### 4.2 Color Application Standards

**Color usage in animations:**

- **Navy #1F3A5F**: Primary elements, text, default state
- **Teal #17A2B8**: Active/current state, highlights, arrows, accent animations
- **Green #28A745**: Success indicators, completed states, positive metrics
- **Orange #FD7E14**: Attention needed, incomplete states, challenges
- **Gray #495057**: Supporting elements, secondary information
- **Light Background #F8F9FA**: Scene background, content areas

**Highlight animations:**
- Color change: 300ms transition time, ease-in-out
- Opacity change: 200-400ms duration, ease-out for entrance, ease-in for exit
- Glow effect: Subtle (2-4px blur) behind element, 50% opacity maximum

### 4.3 Timing Standards

**Standard animation durations:**

| Element Type | Duration | Use |
|--------------|----------|-----|
| Text fade-in | 300-400ms | All text entrance |
| Icon entrance | 300-500ms | Scale/spin-in effects |
| Box/container slide | 400-600ms | Column slides, box movements |
| Diagram growth | 500-800ms | Circle growth, line drawing |
| Large diagram reveal | 1000-1500ms | Complex multi-element sequences |
| Pulsing/looping | 1200-4000ms | Ongoing background animations |
| Scene transition | 300-600ms | Fade between scenes |

**Total scene duration principle:**
- Don't exceed 6 seconds of animation in a single 4-second narration scene
- Animations should complete before or synchronized with narration (not creating visual lag)
- 200ms visual lead-time before narration mentions element (animator cue: narrator mentions element, visual appeared 0.2s prior)

### 4.4 Positioning Standards

**Coordinate system (for planning):**
- Origin: Top-left of video frame
- X-axis: Horizontal (0 = left edge, 1920 = right edge)
- Y-axis: Vertical (0 = top edge, 1080 = bottom edge)
- Center point: (960, 540)

**Safe area (for critical elements):**
- Minimum 40px padding from edges (accounts for various display crop ratios)
- Avoid placing text/critical elements in outer 40px zones
- Icons can extend closer to edges if necessary

**Alignment standards:**
- All elements align to 8px grid
- Boxes/containers: Minimum 20px padding internal
- Text: Minimum 20px margin from box edges
- Spacing between elements: 20px (small), 40px (medium), 60px (large)

---

## Part 5: Reusable Animation Components Library

### 5.1 MEASURE Loop Variations

**Standard MEASURE Loop (250px):**
- Base circle: Navy #1F3A5F
- Highlights: Teal #17A2B8 per segment
- Rotation speed: 4s per full rotation
- Segment count: 5

**Small MEASURE Loop (120px):**
- Same as standard but 50% scale
- Used in headers, badges
- Font reduction: 14px labels instead of 20px

**Highlighted MEASURE Loop (250px, specific segment):**
- Default: Navy #1F3A5F (all segments)
- Highlight specific segment in Teal
- Use case: Showing "current" step in process

**Usage locations:**
- Video 1: Scenes 1.5, 1.8
- Video 2: Opening, multiple scenes
- Video 3: Header, diagram context
- Video 4: Background element

---

### 5.2 Data Visualization Animation Patterns

**Column Chart Reveal:**
- Bars animate bottom-to-top (height: 0→target height)
- Duration: 0.8s per bar (stagger 200ms between bars)
- Easing: ease-out-cubic
- Color: Navy (baseline), Teal (current), Green (target)

**Line Chart Animation:**
- Axes appear first (300ms)
- Grid lines fade in (200ms)
- Data line draws from left-to-right (600ms, stroke animation)
- Data points pulse on as line passes (100ms each)
- Label text fades in below axis (300ms)

**Pie/Donut Chart:**
- Avoided if possible (hard to interpret)
- If necessary: Segments draw in sequence (150ms each)
- Starting from 12 o'clock, clockwise progression

**Number Counter Animation:**
- Text animation (count-up): Linear progression from 0→target
- Duration: 0.8-1.2s per number sequence
- Font: IBM Plex Mono (monospace for smooth counting)
- Easing: ease-out (slows down at end)
- Example: 65% appears as 0%, 15%, 35%, 50%, 65% (rapid progression)

---

### 5.3 Icon Animation Patterns

**Spin-in Entrance:**
- Scale: 0→1.0
- Rotation: 0°→360°
- Duration: 300-500ms
- Easing: ease-out-back (slight overshoot at end)
- Used for: Emphasis, important indicators

**Fade-in Entrance:**
- Opacity: 0→1.0
- Duration: 300-400ms
- Easing: ease-out
- Used for: Supporting elements, secondary icons

**Pulse Emphasis:**
- Scale: 1.0→1.15→1.0
- Duration: 1.2s cycle
- Easing: ease-in-out
- Used for: Current/active state indication

**Rotation (Continuous):**
- Rotation: 0°→360°
- Duration: 4-6s per full rotation
- Easing: linear
- Used for: Loading states, ongoing processes

---

## Part 6: Quality Assurance Checklist

### 6.1 Per-Scene QA Standards

Before submitting final animation files, verify each scene:

- [ ] **Timing**: All animations complete on schedule (no delays, no overshoots)
- [ ] **Easing**: Correct easing function applied (matches coaching specification)
- [ ] **Color**: All colors match mood board spec (Navy #1F3A5F, Teal #17A2B8, etc.)
- [ ] **Positioning**: All elements align to 8px grid, safe padding observed
- [ ] **Voiceover sync**: Visual element appears 200ms before narration mentions it
- [ ] **Duration**: Total scene duration matches specification
- [ ] **Smoothness**: No jittering, frame skipping, or rendering artifacts
- [ ] **Text rendering**: Clean, anti-aliased, no pixelation
- [ ] **Icon quality**: Crisp edges, consistent stroke width, proper scaling
- [ ] **Transparency**: Proper alpha blending (no fringing, clean edges)
- [ ] **Sound sync**: Animation endpoints align with audio effects (if applicable)

### 6.2 Technical Standards

**Render specifications:**
- Resolution: 1920x1080 (16:9)
- Frame rate: 30fps
- Color space: sRGB (not ProPhoto, not Adobe RGB)
- File format: ProRes 422 HQ or 10-bit H.265 (for editing)
- Audio: 48kHz (if audio embedded)

**Compatibility check:**
- Preview on multiple monitors (verify colors appear correct)
- Test on low-end playback device (verify no performance issues)
- Check on mobile preview (if applicable for short-form clips)

### 6.3 Common Issues & Solutions

| Issue | Solution | Prevention |
|-------|----------|-----------|
| Animation jitter | Ensure keyframes use whole pixel values | Use snapping grid in animation software |
| Color mismatch | Sample colors directly from mood board spec | Create color swatch file in editing software |
| Timing issues | Use frame counter (not visual estimation) | Create timing spreadsheet with all durations |
| Text pixelation | Render at 2x resolution, then downscale | Use vector text (not rasterized) |
| Icon stroke inconsistency | Apply consistent 2px stroke to all icons | Use master template for all icon creation |
| Voiceover sync lag | Check 200ms lead-time, verify audio timing | Reference voiceover script during animation |

---

## Part 7: Asset Delivery Structure

### 7.1 File Organization

```
Systems_Evaluations_Animation_Assets/
├── 01_Logo_and_Branding/
│   ├── MEASURE_Loop_Circle.ai
│   ├── MEASURE_Loop_Rotating.mov
│   ├── Teal_Circular_Arrow.ai
│   └── Brand_Animation_Library.ai
├── 02_Video_1_Assets/
│   ├── Scene_1.1_Opening.prproj
│   ├── Scene_1.2_Hook.prproj
│   ├── Scene_1.3_Testing_vs_Evaluation.prproj
│   ├── Icons_Set_1.ai
│   └── Column_Cards_Component.ai
├── 03_Video_2_Assets/
│   ├── Measure_Framework_Breakdown.prproj
│   ├── Three_Types_of_Evaluation.prproj
│   ├── Nested_Circles_Animation.ai
│   └── Timeline_Components.ai
├── 04_Video_3_Assets/
│   ├── Metrics_Design_Comparison.prproj
│   ├── Code_Animation_Reveal.ai
│   └── Design_Process_Flow.ai
├── 05_Video_4_Assets/
│   ├── Improvement_Spiral.prproj
│   ├── Case_Study_Timeline.ai
│   └── Drawing_Room_Visualization.ai
├── 06_Reusable_Components/
│   ├── Data_Visualization_Templates/
│   ├── Icon_Library_Master.ai
│   ├── Text_Animation_Patterns.prproj
│   └── Transition_Effects.prproj
└── 07_Reference_Files/
    ├── Mood_Board_Reference.pdf
    ├── Storyboard_Reference.pdf
    ├── Animation_Timing_Spreadsheet.xlsx
    └── Voice_Script_with_Timing.pdf
```

### 7.2 Delivery Checkpoints

**Checkpoint 1 (Week 1):**
- [ ] Logo and branding animations complete
- [ ] Icon library finalized
- [ ] Animation timing spreadsheet reviewed
- [ ] 3-5 representative animation samples approved

**Checkpoint 2 (Week 2):**
- [ ] Video 1 animations (50% complete)
- [ ] Reusable components (100% complete)
- [ ] Editor briefing on animation imports prepared

**Checkpoint 3 (Week 3):**
- [ ] Video 1 animations (100% complete)
- [ ] Video 2 animations (50% complete)
- [ ] First video assembled for editing review

**Checkpoint 4 (Week 4-5):**
- [ ] Videos 2-3 animations (100% complete)
- [ ] Video 4 animations (50% complete)
- [ ] Color grading reference applied to all animations

**Checkpoint 5 (Week 6-7):**
- [ ] All animations finalized
- [ ] QA checklist complete (per scene)
- [ ] Asset library organized for final delivery

---

## Part 8: Animator Notes & Special Considerations

### 8.1 Animation Software Recommendations

**Primary Software:**
- Adobe Animate or Adobe After Effects (for motion graphics)
- Blender (for 3D elements, if needed)
- Cinema 4D (alternative for 3D, if preferred)

**Supporting Software:**
- Adobe Illustrator (vector creation)
- Adobe Photoshop (bitmap work)
- Figma (collaborative design)

**Recommended settings (Adobe After Effects):**
- Composition: 1920x1080, 29.97fps (drop-frame for video)
- Color depth: 16-bit or 32-bit linear (for high-quality)
- Motion blur: On (2 frames)

### 8.2 Performance Considerations

**File size:**
- Target: Keep individual animation compositions under 500MB (edit-friendly)
- Final render: ProRes 422 HQ approximately 1-1.5GB per minute of video
- Full series: Approximately 50-75GB total (edit + source files)

**Rendering time:**
- Complex animations with effects: 1-2 minutes per second
- Simple animations: 30-45 seconds per second
- Plan 2-3 weeks for rendering all four videos with revisions

### 8.3 Revision Protocol

**Change request categories:**
1. **Minor timing adjustment** (rerender only, no resync): 1-2 hours turnaround
2. **Color change** (rerender existing animation): 2-4 hours turnaround
3. **Animation change** (modify keyframes, rerender): 4-8 hours turnaround
4. **Structural change** (redesign animation from scratch): 1-2 days turnaround

**Approval process:**
1. Submit animation for review
2. Receive feedback within 24 hours
3. Make revisions
4. Submit revised version
5. Final approval before integration with voiceover/audio

---

## Final Notes

**This brief is comprehensive but not final.** As production begins:

1. **Create animated samples** (3-5 seconds) from each animation category for approval
2. **Verify timing** against voiceover script (will be delivered separately)
3. **Test color accuracy** on multiple displays before final render
4. **Plan render queue** to ensure animations are ready for editor on schedule
5. **Maintain asset organization** for future updates (if needed after feedback)

**Contact points:**
- Animation questions: [To be determined - usually project manager or creative director]
- Technical issues: [To be determined]
- Approval authority: Aroma Tahir (aroma.tahir@taleemabad.com)

---

**End of Animation Brief**

*Next document: Music & Sound Design Brief (audio direction for all videos)*
