# Remotion Animation Timing Guide
## The 3-Second Rule Applied to Pure Remotion Videos (No Google Studio)

**Status**: ✅ APPLIES SAME FRAMEWORK AS GOOGLE STUDIO  
**Principle**: VO-Sync-First approach works identically for Remotion animations  
**Key Difference**: Instead of images, visual changes come from internal animations + scene transitions

---

## Core Principle: 3-Second Visual Stability Rule

### For Google Studio (Image-Based):
- Single image holds on screen max 3 seconds
- After 3s, switch to next image (hard cut)

### For Remotion (Animation-Based):
- Single animated scene has max 3 seconds of "stable visual state"
- After 3 seconds, something MUST change (animation transition, new element enters, etc.)
- Exception: Complex scenes can exceed 3s only if internal animations continue throughout (motion, opacity changes, scale, rotation, etc.)

### In Both Cases:
The user perceives "quick frame changes" because visuals are constantly evolving, never feeling static or dragged.

---

## Remotion Animation Timing: Phase 0 Mapping for Animations

Same Phase 0 VO-to-Visual mapping applies, but with animation-specific parameters.

### Example: 20-Second Problem Section (Remotion Animation)

**VO Script**:
```
0:15-0:18s: "Think about your last week. How much time did you spend solving problems as they appeared?"
0:18-0:21s: "Responding to crises. Reacting. No time to actually construct anything lasting?"
0:21-0:24s: "That is the reality for most teams. They are stuck in a cycle of response."
0:24-0:27s: "But some teams have figured something out. They do not respond to fires."
0:27-0:30s: "They build systems that prevent fires from occurring in the first place."
0:30-0:35s: "That is the difference. And that is what we teach here."
```

**Phase 0 Mapping for Remotion Animation**:

| Timestamp | VO Moment | Animated Scene | Duration | Internal Animations | Override | Justification |
|-----------|-----------|-----------------|----------|------------------|----------|---|
| 0:15-0:18 | "Think about your last week... solving problems..." | Person surrounded by explosive notifications/calendar | 3s | Entry fade-in (0.3s) → Notifications pop/bounce in (2s) → Exit fade-out (0.3s) | No | Standard: notifications are visual motion, feels animated |
| 0:18-0:21 | "Responding to crises. Reacting..." | Fire/chaos visualization, person frantically responding | 3s | Entry (0.3s) → Flames animate/spread (2s) → Exit (0.3s) | No | Fire animation provides internal motion |
| 0:21-0:24 | "...stuck in a cycle of response" | Circular/loop animation showing team in cycle | 4s | Entry (0.3s) → Loop rotates continuously (3s) → Exit (0.3s) | YES | Loop cycle needs 4s to show full rotation + understand "stuck" concept. Internal rotation motion justifies extended time. |
| 0:24-0:27 | "But some teams figured it out..." | Light bulb moment, breakthrough | 3s | Fade-in (0.3s) → Light bulb glow/shine (2s) → Fade-out (0.3s) | No | Glow effect provides animation motion |
| 0:27-0:30 | "They build systems that prevent fires" | System architecture appears, fire prevented | 4s | Entry (0.3s) → System elements build/appear sequentially (3s) → Exit (0.3s) | YES | System architecture is complex - needs 4s for sequential appearance of components. Staggered animation justifies time. |
| 0:30-0:35 | "That is the difference. That is what we teach here." | Contrast: reactive team vs proactive team | 5s | Entry (0.3s) → Teams move/animate in opposite directions (4s) → Exit (0.3s) | YES | Contrast requires showing both teams + their different approaches. 5s allows for split-screen animation showing reactive chaos vs calm systems building. |

**Total**: 22s of animation for 20s of VO  
**Issue**: 2 seconds OVER budget. Solutions:
1. Compress one 4-5s scene to 3s (reduce animation complexity)
2. Trim VO slightly (unlikely, VO is already recorded)
3. Accept 122s video (adjust VO length in post-production)
4. Simplify override justifications (reduce internal animation complexity)

**Recommended Fix**: Compress the "contrast" scene from 5s to 4s (still shows both teams, less room for intricate animation).

---

## Remotion Animation Timing Rules (From Phase 0 Mapping)

### Rule 1: Visual Stability Max 3 Seconds
**Definition**: "Visual stability" = time where no meaningful animation is happening

For Remotion, this means:
- No SVG elements moving (translate, scale, rotate)
- No opacity changes
- No color animations
- No new elements entering/exiting

**Exception**: If animation is continuous (elements always moving), 3-second rule doesn't apply to the motion itself, only to visual "interest."

### Rule 2: Internal Animation Requirements

**If scene duration = 3s (standard)**:
- Entry animation: 0.3s fade/scale-in
- Stable state: 1.4s (mid-scene, minimal motion but scene is "presented")
- Exit animation: 0.3s fade/scale-out
- **Minimum animations**: 2 (enter + exit)

**If scene duration = 4-6s (overridden)**:
- Entry: 0.3-0.5s (fade-in or scale-in)
- Middle: 2.5-4.5s (MUST have continuous internal animation)
  - Examples: rotating element, pulsing glow, floating motion, position shifts, opacity waves
  - These animations FILL the time so it never feels static
- Exit: 0.3-0.5s (fade-out)
- **Minimum animations**: 3 (enter + middle + exit)

**Critical**: If a 5-second scene has no internal animation in the "middle" section, it VIOLATES the 3-second rule even though total duration is 5 seconds.

### Rule 3: No Static Holds

**Violation Example**:
```typescript
// BAD: Scene is animated entrance but then static for 3+ seconds
<Sequence from={0} durationInFrames={180}>
  <SVGElement style={{
    opacity: interpolate(frame, [0, 30], [0, 1])  // Fade-in only (first 1 second)
    // Frames 30-180: NO ANIMATION, just sits there static!
  }} />
</Sequence>
```

**Fix**: Add internal animation to fill the 5-second space
```typescript
// GOOD: Animated entrance + continuous motion + exit
<Sequence from={0} durationInFrames={180}>
  <SVGElement style={{
    opacity: interpolate(frame, [0, 30, 150, 180], [0, 1, 1, 0]),  // Fade-in, hold, fade-out
    scale: interpolate(frame, [0, 60, 120, 180], [0.5, 1, 1.1, 1]),  // Scale pulse in middle
    rotate: interpolate(frame, [60, 180], [0, 360])  // Continuous rotation
  }} />
</Sequence>
```

---

## Phase 0 Mapping for Pure Remotion Videos

Same structure as Google Studio approach, but with animation-specific fields:

```json
{
  "section": "problem",
  "section_duration_seconds": 20,
  "section_frames": 600,
  "animation_approach": "remotion_only",
  "frames": [
    {
      "frame_id": 1,
      "timestamp_in_section": "0:15-0:18",
      "vo_text": "Think about your last week. How much time did you spend solving problems as they appeared?",
      "visual_description": "Person surrounded by explosive notifications popping on screen",
      "animation_type": "notification_explosions",
      "duration_seconds": 3,
      "frames_count": 90,
      "animation_plan": {
        "entry_animation": "fade_in",
        "entry_duration_seconds": 0.3,
        "middle_animation": "notifications_pop_and_bounce",
        "middle_duration_seconds": 2.4,
        "exit_animation": "fade_out",
        "exit_duration_seconds": 0.3,
        "easing": "spring"
      },
      "override_duration_seconds": null,
      "override_justification": null
    },
    {
      "frame_id": 4,
      "timestamp_in_section": "0:24-0:27",
      "vo_text": "But some teams have figured something out. They do not respond to fires. They build systems that prevent fires.",
      "visual_description": "System architecture diagram appears, showing how systems prevent fires",
      "animation_type": "system_architecture_build",
      "duration_seconds": 4,
      "frames_count": 120,
      "animation_plan": {
        "entry_animation": "fade_in",
        "entry_duration_seconds": 0.3,
        "middle_animation": "sequential_element_appearance",
        "middle_duration_seconds": 3.4,
        "middle_details": [
          { "element": "foundation_layer", "appear_at_seconds": 0.3 },
          { "element": "component_1", "appear_at_seconds": 1.0 },
          { "element": "component_2", "appear_at_seconds": 1.7 },
          { "element": "connections", "appear_at_seconds": 2.4, "animate_connecting_lines": true }
        ],
        "exit_animation": "fade_out",
        "exit_duration_seconds": 0.3,
        "easing": "ease_out"
      },
      "override_duration_seconds": 4,
      "override_justification": "OVERRIDE: System architecture is complex (4 elements building sequentially). Standard 3s insufficient to show all components appearing and being understood. 4s (33% extra) allows sequential appearance animation (staggered reveals) that educates the viewer."
    }
  ]
}
```

---

## How Phase 0 Mapping Works for Remotion

### Input to Mapping Process:
1. VO script with timings
2. Decision: "Is this animation-heavy scene or simple?"

### Mapping Decision:
For each VO moment, answer:
1. **Can this be animated meaningfully?**
   - YES → Plan Remotion animation
   - NO → Use Google Studio image instead (hybrid approach)

2. **How much animation complexity?**
   - Simple (1 main element moving): 3s standard
   - Medium (2-3 elements, some sequencing): 3-4s
   - Complex (multi-element architecture, contrast, build-ups): 4-6s

3. **What internal animations fill the time?**
   - Entry: How does it appear? (fade-in, scale-up, slide-in)
   - Middle: What moves/changes? (rotation, position shift, opacity pulse, color change)
   - Exit: How does it disappear? (fade-out, scale-down, slide-out)

4. **Is override justified?**
   - If duration > 3s, document why

### Example Decision Tree:

```
Question: "20-second Problem section - how to animate?"

Moment 1: "Think about your last week..."
  → Concept: Notifications/chaos
  → Complexity: Medium (notifications pop in)
  → Animation: Fade-in person + notifications bounce in
  → Duration: 3s (standard) ✓

Moment 4: "They build systems that prevent fires..."
  → Concept: System architecture (complex concept)
  → Complexity: High (4+ components, sequential appearance)
  → Animation: Fade-in + sequential element appearance + connecting lines
  → Duration: 4s (OVERRIDE: sequential build needs 4s) ✓
  → Justification: "Sequential appearance of system components requires 4s (vs standard 3s) to show each element appearing and connecting. Staggered animation educates viewer on system structure."

Result: Mapping shows 20s VO + animation timings determined by complexity, not arbitrary duration
```

---

## Comparison: Google Studio vs Remotion Timing

| Aspect | Google Studio | Remotion Animation |
|--------|---------------|-------------------|
| **Visual Unit** | Single static image | Animated scene |
| **3-Second Rule** | Image holds max 3s, then cut to next | Animation has max 3s stable state; internal motion after 3s OK |
| **What Provides Motion** | Frame-switching (cut to new image) | Internal animation (elements move/change) |
| **For 4+ seconds** | Multiple images shown (fast cuts) | Single scene with continuous internal animation |
| **User Perception** | Quick image cycling = dynamic | Continuous motion = dynamic |
| **Override Justification** | "Diagram complexity needs more time" | "Sequential build needs to show all steps" |
| **Animation Requirements** | N/A (images are pre-made) | Minimum 2 animations per scene (enter + exit) |
| **Motion Easing** | N/A | Use spring() for natural feel |
| **Phase 0 Output** | VO_VISUAL_MAPPING with image descriptions | VO_VISUAL_MAPPING with animation plans |

---

## Implementation: Remotion Animation Timing in Code

### Phase 0 Output → Phase 2 (Composition Build)

From mapping:
```json
{
  "frame_id": 4,
  "duration_seconds": 4,
  "animation_plan": {
    "entry_animation": "fade_in",
    "entry_duration_seconds": 0.3,
    "middle_animation": "sequential_element_appearance",
    "middle_duration_seconds": 3.4,
    "middle_details": [
      { "element": "foundation", "appear_at_seconds": 0.3 },
      { "element": "component_1", "appear_at_seconds": 1.0 }
    ],
    "exit_animation": "fade_out",
    "exit_duration_seconds": 0.3
  }
}
```

Build Remotion Sequence:
```typescript
const animationPlan = mapping.problem.frames[3].animation_plan;
const totalFrames = 120; // 4 seconds @ 30fps

<Sequence from={frameOffset} durationInFrames={totalFrames}>
  {/* Foundation element */}
  <Foundation
    style={{
      opacity: interpolate(
        frame,
        [0, 9, 102, 120],
        [0, 1, 1, 0],
        { easing: Easing.inOut(Easing.cubic) }
      ),
      scale: interpolate(frame, [0, 9], [0.5, 1])
    }}
  />
  
  {/* Component 1: appears at 1.0s (30 frames in) */}
  {frame >= 30 && (
    <Component1
      style={{
        opacity: interpolate(
          frame - 30,
          [0, 9, 72, 90],
          [0, 1, 1, 0]
        ),
        scale: interpolate(frame - 30, [0, 9], [0.5, 1])
      }}
    />
  )}
  
  {/* More elements following the middle_details plan */}
</Sequence>
```

---

## Quality Gates for Remotion Animation Timing

### After Phase 0 Mapping (Before Animation Code):
- [ ] Total frames = 3600 (sum all durations × 30fps)
- [ ] All scenes >3s have internal animation plan documented
- [ ] Animation types match VO content (e.g., "fire" concept uses flame animation)
- [ ] No static holds >3s (every scene has entry/middle/exit)

### After Phase 2 Composition Build:
- [ ] Remotion Studio preview shows all animations
- [ ] No jerky/glitchy animation transitions
- [ ] Internal animations fill the time (doesn't feel static mid-scene)
- [ ] Easing is natural (spring, ease-out) not linear/robotic
- [ ] Total duration = exactly 120s

### Final Video Quality Check:
- [ ] Play full video: "Does it feel animated and engaging?"
- [ ] Spot-check 3 random moments: "Is something moving/changing?"
- [ ] No "dragged" feeling anywhere
- [ ] User ready-test: "This is dynamic, not like pictures"

---

## Decision: Google Studio vs Remotion for Each Scene

**Use Google Studio Images If**:
- Scene is simple, concept-focused (no complex animation needed)
- High visual variety helps (different photorealistic images)
- Animation coding is too complex for the value

**Use Remotion Animation If**:
- Scene involves motion/process (notifications flying, components building)
- Consistent visual style needed (brand alignment)
- Animation choreography is important (staggered reveals, motion paths)
- Concept benefits from animated explanation (cycles, flows, connections)

**Use Hybrid (Both) If**:
- Some scenes are animation-heavy, others are simple
- Example: Use Google Studio for concept overviews, Remotion for process explanations

---

## Summary

The VO-Sync-First framework applies **identically** to both:
1. **Google Studio Approach**: Images change every 3s
2. **Remotion Approach**: Animated scenes with internal motion, max 3s stable state
3. **Hybrid Approach**: Mix both as needed per scene

In all cases:
- Phase 0: Map VO-to-visuals with justified durations
- Phase 1: Generate/code visuals according to mapping
- Phase 2-5: Build, render, verify, mux

Result: Perfect VO-visual synchronization. Never dragged. Always engaging.

**Choose the approach that best serves the educational content. All approaches must follow the 3-second rule with justified overrides.**
