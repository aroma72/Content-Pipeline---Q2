# VO-Sync-First Video Generation Framework

**Status**: ✅ IMPLEMENTATION READY  
**Approach**: Custom Google Studio API + Dynamic Frame Generation + Smart Duration Logic  
**Core Principle**: Perfect VO-Visual Synchronization Before Any Image Is Generated

---

## The New 3-Second Rule (with Smart Overrides)

### Default Rule
**NO visual/screen should remain static for more than 3 seconds**

This keeps the video dynamic and engaging, preventing the "feels dragged" feeling.

### When to Override (3+ seconds allowed)
Only override the 3-second rule when:
1. **Visual complexity requires understanding time**: Complex diagrams, multi-step processes, system architecture
2. **Educational value justifies longer hold**: The learner needs time to parse the visual
3. **No alternative framing possible**: Cannot split into simpler visuals

### How to Justify Overrides
Every override >3s MUST have a documented reason:
```json
{
  "frame_id": 3,
  "duration_seconds": 5,
  "override_justification": "OVERRIDE: Complex contrast diagram (using AI vs building AI) requires 5 seconds for audience to parse left vs right distinction"
}
```

### Enforcement
Overrides are:
- ✅ **Documented** in VO_VISUAL_MAPPING.json
- ✅ **Logged** in Phase 0 output
- ✅ **Reviewable** by user before Phase 1 proceeds
- ✅ **Justified** with specific reasons

---

## The VO-Sync-First Framework

### Why This Approach?

**Problem with static frame allocation** (old way):
- Plan says "37 frames, ~3s each"
- Generate images without reference to VO script
- Mux video + VO afterward
- Result: Visual and narration sometimes lag/rush each other

**Solution: Map First, Generate Second** (new way):
- Timestamp every moment of the VO script
- For each moment, decide what visual should appear
- Calculate frame duration based on visual content
- Generate images specifically for those moments
- Result: Perfect VO-visual alignment guaranteed

---

## Phase 0: VO-to-Visual Mapping (Critical First Step)

### Input
- All 6 voiceover WAV files (01_opening.wav through 06_closing.wav)
- Voiceover script text with timings

### Process

#### Step 1: Break VO into Natural Chunks
Listen to each VO file and identify natural "moments" where a visual should change.

**Example - Opening Section (15s total)**:
```
0:00-0:03s: "Hello. I imagine you have been exploring AI platforms like ChatGPT or Claude."
            → Visual: Person discovering new learning space
            → Duration: 3s (standard)

0:03-0:06s: "But here is the distinction — using AI is one skill."
            → Visual: Frame 1 complete, transition to possibilities visual
            → Duration: 3s (standard)

0:06-0:10s: "But here is the distinction — using AI is one skill. Building with AI is something entirely different."
            → Visual: SPLIT SCREEN contrast (left: using AI, right: building AI)
            → Duration: 4s (OVERRIDE - diagram complexity)
            → Justification: Audience needs time to parse visual contrast between two approaches
```

#### Step 2: Calculate Frames Per Visual
For each visual chunk:
```
Frames = Duration (seconds) × 30 fps

Examples:
- 3s visual = 90 frames
- 4s visual = 120 frames
- 5s visual = 150 frames
```

#### Step 3: Create Frame Mapping JSON
Structure:
```json
{
  "opening": {
    "section_duration_seconds": 15,
    "section_frames": 450,
    "frames": [
      {
        "frame_id": 1,
        "frame_offset_from_section_start": 0,
        "frame_offset_from_video_start": 0,
        "timestamp_in_section": "0:00-0:03",
        "timestamp_in_vo_seconds": 0,
        "vo_text": "Hello. I imagine you have been exploring AI platforms like ChatGPT or Claude.",
        "visual_description": "Person standing in warm library discovering new learning space. Doors opening to light, books floating, sense of discovery.",
        "visual_style": "School of Life aesthetic - cream background, warm colors, organic shapes",
        "duration_seconds": 3,
        "frames_count": 90,
        "minimum_duration_seconds": 3,
        "override_duration_seconds": null,
        "override_justification": null,
        "complexity_notes": "Simple establishing shot"
      },
      {
        "frame_id": 2,
        "frame_offset_from_section_start": 90,
        "frame_offset_from_video_start": 90,
        "timestamp_in_section": "0:03-0:06",
        "timestamp_in_vo_seconds": 3,
        "vo_text": "...exploring AI platforms like ChatGPT or Claude.",
        "visual_description": "Floating books, scrolls, digital interfaces expanding, sense of possibilities opening up",
        "visual_style": "School of Life aesthetic - continuous warm palette",
        "duration_seconds": 3,
        "frames_count": 90,
        "minimum_duration_seconds": 3,
        "override_duration_seconds": null,
        "override_justification": null,
        "complexity_notes": "Medium complexity - multiple elements floating"
      },
      {
        "frame_id": 3,
        "frame_offset_from_section_start": 180,
        "frame_offset_from_video_start": 180,
        "timestamp_in_section": "0:06-0:10",
        "timestamp_in_vo_seconds": 6,
        "vo_text": "But here is the distinction — using AI is one skill. Building with AI is something entirely different.",
        "visual_description": "SPLIT SCREEN CONTRAST: LEFT SIDE shows person using AI (ChatGPT chat interface, passive consumption). RIGHT SIDE shows person building AI systems (coding, architecture diagrams, active creation). Clear visual separation emphasizing the contrast.",
        "visual_style": "School of Life - side-by-side comparison, clear labeling",
        "duration_seconds": 4,
        "frames_count": 120,
        "minimum_duration_seconds": 3,
        "override_duration_seconds": 4,
        "override_justification": "OVERRIDE: Complex contrast diagram requires 4 seconds (33% more than default) for audience to understand the distinction between passive AI consumption vs active AI building. This is a core conceptual moment that sets up the entire course.",
        "complexity_notes": "HIGH - Requires audience to process two different scenarios simultaneously"
      }
    ]
  },
  "problem": { /* similar structure */ },
  "foundations": { /* similar structure */ },
  "path_forward": { /* similar structure */ },
  "why_matters": { /* similar structure */ },
  "closing": { /* similar structure */ }
}
```

#### Step 4: Verify Total Frames = 3600
```
Sum all section_frames values
Opening:       450 frames
Problem:       600 frames
Foundations:   600 frames (or 720 with overrides)
Path Forward:  900 frames
Why Matters:   450 frames
Closing:       600 frames
─────────────────────
TOTAL:        3600 frames ✓ (or 3720 if overrides push beyond budget)
```

**If total ≠ 3600**: Adjust by either:
1. Reducing some 3s frames to 2.5s (use sparingly, minimum is 3s)
2. Compressing override justifications (reduce number of >3s frames)
3. Extending total video to 124-130s (less ideal, requires VO length adjustment)

### Output: VO_VISUAL_MAPPING.json

This becomes the **single source of truth** for:
- Image generation (Phase 1)
- Remotion composition (Phase 2)
- Verification (all phases)

---

## Phase 1: Image Generation (Using Custom Google Studio API)

### Input
- VO_VISUAL_MAPPING.json from Phase 0
- Custom Google Studio API credentials

### Process

For each frame in mapping:
1. **Extract visual_description** from mapping
2. **Add complexity context** from complexity_notes and override_justification
3. **Create detailed prompt** for Google Studio API
4. **Call API** with custom credentials
5. **Save image** to `/course-overview-images/{section}/frame_{frame_id}.png`
6. **Verify** image quality and file size

### Prompt Template
```
[VO CONTEXT FOR TIMING]
VO text: "{vo_text}"
Duration: {duration_seconds} seconds ({frames_count} frames @ 30fps)
{if override: "TIMING NOTE: This visual has {override_duration_seconds}s (override) because: {override_justification}"}

[VISUAL REQUIREMENTS]
Create a {duration_seconds}-second visual moment showing:
{visual_description}

Visual Style:
{visual_style}

Complexity Level: {complexity_notes}

Technical:
- 16:9 aspect ratio (1920×1080)
- Professional, educational tone
- Clean, readable layout
- No text overlays (captions added separately)
```

### Example Prompt
```
[VO CONTEXT FOR TIMING]
VO text: "But here is the distinction — using AI is one skill. Building with AI is something entirely different."
Duration: 4 seconds (120 frames @ 30fps)
TIMING NOTE: This visual has 4s (override) because: Complex contrast diagram requires 4 seconds (33% more than default) for audience to understand the distinction between passive AI consumption vs active AI building.

[VISUAL REQUIREMENTS]
Create a side-by-side comparison visual showing:
LEFT SIDE: Person using AI (ChatGPT chat interface, passive consumption, scrolling, reading responses)
RIGHT SIDE: Person building AI systems (coding on laptop, architecture diagrams, thinking, designing, creating)
Clear visual separation emphasizing the contrast between these two different relationships with AI.

Visual Style:
School of Life aesthetic - warm cream background, organic shapes, soft colors (terracotta, sage green, soft blue). Side-by-side layout with clear visual distinction.

Complexity Level: HIGH - Requires audience to process two different scenarios simultaneously and understand the conceptual difference.

Technical:
- 16:9 aspect ratio (1920×1080)
- Professional, educational tone
- Clean visual hierarchy separating left and right
- No text overlays
```

### Verification
- [ ] All images generated successfully
- [ ] File count matches Phase 0 mapping
- [ ] Each image tagged with frame_id
- [ ] Total size reasonable (~2-3 MB per image = 40-100 MB total)
- [ ] No corrupted files or API errors
- [ ] Timing notes preserved in generation log

---

## Phase 2: Remotion Composition Build

### Input
- Generated images from Phase 1
- VO_VISUAL_MAPPING.json from Phase 0

### Process

Build Remotion composition by iterating through mapping:

```typescript
const mapping = require('./VO_VISUAL_MAPPING.json');

function buildComposition() {
  let currentFrame = 0;
  const sequences = [];

  // For each section
  ['opening', 'problem', 'foundations', 'path_forward', 'why_matters', 'closing'].forEach(section => {
    // For each frame in section
    mapping[section].frames.forEach(frame => {
      sequences.push({
        from: currentFrame,
        durationInFrames: frame.frames_count,
        imagePath: `/course-overview-images/${section}/frame_${frame.frame_id}.png`,
        voText: frame.vo_text,
        timestamp: frame.timestamp_in_vo_seconds
      });
      currentFrame += frame.frames_count;
    });
  });

  // Verify total frames
  const totalFrames = currentFrame;
  console.assert(totalFrames === 3600, `Frame mismatch: expected 3600, got ${totalFrames}`);

  return sequences;
}
```

### Verification
- [ ] Total frames = 3600 (120 seconds)
- [ ] No frame offset gaps or overlaps
- [ ] All image files exist
- [ ] Composition durationInFrames in Root.tsx = 3600
- [ ] Preview plays without glitches
- [ ] Captions sync correctly with images

---

## Phase 3-5: Caption Integration, Rendering, Final Mux

Unchanged from original plan. Captions already synced if Phase 0 mapping is accurate.

---

## Quality Gates: The Sync Verification Checklist

Before proceeding from each phase:

### After Phase 0 (Mapping):
- [ ] Total frames = 3600 (no rounding errors)
- [ ] All overrides (>3s) are documented with justification
- [ ] VO text matches actual VO script exactly
- [ ] No visual lags VO narration (visual appears before/at start of phrase)
- [ ] No visual rushes ahead (visual appropriate for VO timing)

### After Phase 1 (Images):
- [ ] All images generated (count matches mapping)
- [ ] Each image file size reasonable (2-3 MB)
- [ ] No corrupted images
- [ ] Visual content matches mapping descriptions

### After Phase 2 (Composition):
- [ ] Remotion preview plays full 120s without errors
- [ ] Frame offsets verify (no gaps, monotonically increasing)
- [ ] Images load in correct order
- [ ] Transitions are hard cuts (no fades)

### Final Video (After Phases 3-5):
- [ ] Video duration = exactly 120 seconds
- [ ] Captions appear at correct times
- [ ] VO + visuals perfectly synced (no lag/rush)
- [ ] User ready-test: "Does this feel dynamic? Engaging? Professional?"

---

## Decision Tree: 3-Second Rule with Smart Overrides

```
For each visual in mapping:

1. Is this a simple, straightforward visual?
   YES → Use 3s (standard, 90 frames)
   NO → Go to 2

2. Does this visual require more than 3s to understand?
   NO → Can you simplify it? If yes, go to 1. If no, go to 3.
   YES → Go to 3

3. What educational value justifies >3s?
   - Multi-step process? (e.g., "This is how memory works...")
   - Complex diagram? (e.g., five pillars connected)
   - Contrast comparison? (e.g., "consuming vs building")
   - Step-by-step instruction? (e.g., "Week 1: do X, Week 2: do Y")
   
   If yes to any → OVERRIDE JUSTIFIED
   If no → PUSH BACK on visual design (is it too complex?)

4. Override duration:
   - Minimum extra: +1 second (4s total)
   - Maximum recommended: +2 seconds (5s total)
   - Beyond 5s: Requires strong justification + user approval
   
5. Document override in mapping:
   - Set override_duration_seconds = new duration
   - Set override_justification = "OVERRIDE: [Specific reason]"
```

---

## Example: Applying the Framework to Course Overview

### Section: 5 Foundations (20 seconds VO)

**VO Script Chunks**:
1. "There are five essential components..." (2-3s, intro)
2. "Mental Models — First, you must understand..." (3-4s, Pillar 1 explain)
3. "Memory Architecture — So we correct that..." (3-4s, Pillar 2 explain)
4. "Skills and Patterns — Then we enable..." (3-4s, Pillar 3 explain)
5. "Real World Systems — We connect it..." (3-4s, Pillar 4 explain)
6. "Advanced Patterns — Finally, we test..." (3-4s, Pillar 5 explain)
7. All five connected/integrated (5-6s, system wholeness visual)

**Mapping Decision**:
```
Frame 1: All 5 pillars appear (intro shot)
         → 3s (standard pacing for overview)
         → NO OVERRIDE

Frame 2: Pillar 1 (Mental Models) highlighted
         → 3s (standard, single pillar is simple)
         → NO OVERRIDE

Frame 3: Pillar 1 misconception (AI thinking it remembers)
         → 2.5s (short for quick correction)
         → NO OVERRIDE (quick + punchy)

Frames 4-6: Pillars 2-4 (each similar to Pillar 1)
            → 3s each (standard)
            → NO OVERRIDES

Frame 7: Pillar 5
         → 3s (standard)
         → NO OVERRIDE

Frame 8: All 5 pillars connected (system integration visual)
         → 5s (OVERRIDE)
         → Justification: "System integration visual is complex - shows how all 5 components work together. Audience needs 5 seconds (vs standard 3s) to understand relationships and see the complete architecture. This is a conceptual anchor moment."
         → Total override frames: 150 vs standard 90 = +60 frames

TOTAL for section: 7 × 90 + 150 = 780 frames (26 seconds)
Budget was: 600 frames (20 seconds)
PROBLEM: 80 frames (2.67 seconds) OVER BUDGET

SOLUTION: Either...
A) Compress earlier sections to reclaim 80 frames (possible)
B) Accept 122-123 second video (adjust VO length)
C) Reduce integration visual from 5s to 4s (compromise understanding time)

RECOMMENDATION: Option A or C (Option B requires VO modification)
```

This example shows how the framework forces intentional design decisions.

---

## Summary

**Old Approach**: 
- Plan frame count (37 images)
- Generate images
- Mux with VO
- Hope timing works out

**New Approach (VO-Sync-First)**:
- Map VO-to-visuals exactly (Phase 0)
- Make frame duration decisions upfront (3s default, justified overrides)
- Generate images for those specific moments (Phase 1)
- Build composition with precise timing (Phase 2)
- Result: Perfect VO-visual synchronization guaranteed

**Key Principle**: Narration and visuals NEVER lag or rush each other. Every moment is intentional.

---

## Files Generated by This Framework

| Phase | Files Created | Purpose |
|-------|---------------|---------|
| 0 | VO_VISUAL_MAPPING.json | Frame-by-frame VO-visual alignment |
| 0 | FRAME_TIMING_BREAKDOWN.xlsx | Verify all frame math sums to 3600 |
| 0 | SYNC_VERIFICATION_CHECKLIST.md | Approval before proceeding to generation |
| 1 | /course-overview-images/{section}/frame_N.png | Generated images (count determined by mapping) |
| 1 | IMAGE_GENERATION_REPORT.md | Success/failure log |
| 2 | src/CourseOverviewGoogleStudio.tsx | Remotion composition with dynamic frame sequencing |
| 3 | Final video with captions | Ready for mux |
| 5 | course-overview-FINAL-GOOGLE-STUDIO.mp4 | Ready for distribution |

---

**Status**: ✅ FRAMEWORK READY FOR IMPLEMENTATION

Ready to map the Course Overview VO to visuals?
