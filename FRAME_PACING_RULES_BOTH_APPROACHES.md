# Frame Pacing Rules — Unified for Google Studio AND Remotion

**Status**: ✅ RULES APPLIED TO BOTH APPROACHES  
**Date**: 2026-05-21  
**User Requirement**: "make a lot of different frames so that the frame change is quick and it retains user attention and doesnt feel dragged"

---

## The Core Principle

Whether we use **Google Studio images** or **Remotion animations**, the visual experience must feel:
- ✅ Quick (frequent changes, not dragged)
- ✅ Engaging (motion, progressive reveals, micro-animations)
- ✅ Synchronized (frames match voiceover timing exactly)

This document explains how each approach enforces engagement while maintaining the same video quality standard.

---

## Approach A: Google Studio Images

### Frame Pacing Rules

**Duration per Image**: 2-4 seconds (60-120 frames @ 30fps)
- Faster pacing for high-energy sections (2-2.5s per image)
- Moderate pacing for conceptual sections (3-4s per image)
- **Never hold single image >4s** (would feel dragged)

**Total Images**: 30-40 distinct images for 120-second video
- Example: 120s ÷ 3.2s avg per image = 37-38 images

**Engagement Mechanism**: Rapid frame cycling
- Each image is a distinct visual moment
- Transitions are hard cuts (no fade) for maximum momentum
- Caption overlay provides context continuity

### Verification Checklist

- [ ] Count total images: ____/37-40 expected
- [ ] Check image durations:
  - Opening (15s): 5 images = 3s each ✓
  - Problem (20s): 8 images = 2.5s each ✓
  - Foundations (20s): 7 images = 2.9s each ✓
  - Path Forward (30s): 8 images = 3.75s each ✓
  - Why Matters (15s): 4 images = 3.75s each ✓
  - Closing (20s): 5 images = 4s each ✓
- [ ] Play video preview: Does it feel quick & engaging?
- [ ] Total duration = 120 seconds (3600 frames) ✓

### LOCKED RULE: `FRAME_PACING_QUICK_CHANGES`
```
No image holds longer than 4 seconds. 
Violating this rule = "feels dragged" (per user feedback).
Prevented by: Image sequencing in Remotion with timed Img components.
```

---

## Approach B: Remotion Animations

### Frame Pacing Rules

**Duration per Sequence Segment**: Max 6 seconds (180 frames @ 30fps)
- Never hold a single animated scene for 8+ seconds
- If VO narration is 10s, split into 2 segments (6s + 4s)
- Each segment is a distinct visual beat with animation lifecycle

**Internal Motion Requirement**: 2+ state changes per segment
- **Entry**: Opacity fade-in OR scale-in (0-30 frames, 1s)
- **Middle**: Motion, micro-animations, or progressive reveals (30-150 frames)
- **Exit**: Opacity fade-out OR scale-out (150-180 frames, 1s)
- **Never**: Flat static SVG on screen unchanged

**Transition Speed**: 0.2-0.5 seconds
- Fade-in: 0.3s (9 frames)
- Scale pulse: 0.2s (6 frames)
- Fade-out: 0.3s (9 frames)
- **Never >0.5s** (feels slow/dragging)

**Animation Easing**: Use `spring()` for natural, snappy feel
- Example: `interpolate(frame, [0, 180], [0, 1], { easing: Easing.inOut(Easing.quad) })`
- Avoid linear easing (feels robotic)

### Example: 20-Second Problem Section with Remotion

**VO Duration**: 20 seconds  
**Strategy**: 4 segments × 5 seconds each (20s total)

| Segment | Frames | Duration | Animation Pattern | Visual |
|---------|--------|----------|-------------------|--------|
| 1 | 0-150 | 5s | Fade-in → Chaos spread → Fade-out | Crisis visualization |
| 2 | 150-300 | 5s | Scale-in → Pulse → Fade-out | Team overwhelmed |
| 3 | 300-450 | 5s | Translate-in → Motion loop → Fade-out | Stuck in cycle |
| 4 | 450-600 | 5s | Fade-in → Flow animation → Pause | Systems solution |

**Total**: 600 frames = 20 seconds ✓

### Verification Checklist

- [ ] Count segments: ____/expected (typically 1 segment per 5-6s of VO)
- [ ] Check segment durations:
  - No segment > 6 seconds ✓
  - No segment < 3 seconds (too quick) ✓
- [ ] Animation content check:
  - Each segment has entry + middle + exit ✓
  - 2+ state changes per segment ✓
  - No flat static holds ✓
- [ ] Transition speed: 0.2-0.5s ✓
- [ ] Remotion Studio preview:
  - Does it feel snappy? ✓
  - Do you see motion/changes throughout? ✓
  - Any "dragged" feeling? FIX IT ✓
- [ ] Total duration = exact VO seconds ✓

### LOCKED RULE: `ANIMATION_SEGMENT_DURATION_MAX`
```
No single Sequence segment exceeds 6 seconds.
If VO narration is 10s, split into 2 segments with animated transition.
Violating this rule = "feels dragged" (per user feedback).
Prevented by: RemotionVideoAgent._verify_locked_rules() checks scene durations.
```

### LOCKED RULE: `ANIMATION_INTERNAL_MOTION`
```
Each segment MUST have 2+ internal state changes.
Static SVG on screen unchanged = "not animated" (user feedback phrase).
Violating this rule = video rejected as "just pictures".
Prevented by: System prompt instructs composition generator to add micro-animations.
```

---

## Side-by-Side Comparison

| Metric | Google Studio | Remotion |
|--------|---------------|----------|
| **Unit of Engagement** | Individual image | Animated segment |
| **Duration per Unit** | 2-4s | Max 6s with 2+ animations |
| **Total for 120s Video** | 30-40 images | 20-24 segments |
| **Engagement Mechanism** | Frame cycling | Internal animation motion |
| **Transition Speed** | Instant cut (0s) | 0.2-0.5s fade/scale |
| **User Perception** | Quick frame changes | Snappy animation with motion |
| **Feels "Dragged" If:** | Image holds >4s | Segment static >2s, or animation >0.5s |
| **Test Method** | Count images, preview timing | Remotion Studio preview, watch for motion |

---

## How Rules Are Enforced

### Google Studio Approach
- **Script**: `generate-course-overview-images.js`
- **Enforcement**: Image count + timing in Remotion Sequence components
- **Verification**: Total frames = 3600 (120s @ 30fps), sum of image durations = 120s
- **Locked Rule**: `FRAME_PACING_QUICK_CHANGES` (2-4s per image max)

### Remotion Approach
- **Agent**: `RemotionVideoAgent._build_multi_scene_composition()`
- **Enforcement**: 
  1. `_verify_locked_rules()` checks scene durations (max 6s)
  2. System prompt instructs composition generator to add 2+ animations per segment
  3. Developer tests in Remotion Studio and verifies "not dragged" feeling
- **Locked Rules**:
  1. `ANIMATION_SEGMENT_DURATION_MAX` (6s max per segment)
  2. `ANIMATION_INTERNAL_MOTION` (2+ state changes required)
  3. `FRAME_PACING_QUICK_CHANGES` (0.2-0.5s transitions)

---

## Practical Decision Tree

**Choose Approach Based On:**

### Use Google Studio IF:
- Fast turnaround needed (images generate in 2-5 minutes)
- High visual variety preferred (30+ distinct, photorealistic images)
- Less design complexity (no animation code to write)
- Budget constraint (free API calls vs development time)

**Verification**:
- Generate 37-40 images
- Sequence in Remotion at 2-4s each
- Preview: fast? engaging? ready ✓

### Use Remotion Animations IF:
- Deep visual consistency needed (cohesive SVG design system)
- Animation choreography matters (staggered reveals, motion paths)
- Component reusability needed (segments used across multiple videos)
- Designer prefers code-based control

**Verification**:
- Break into 20-24 segments (max 6s each)
- Add 2+ animations per segment (entry/middle/exit)
- Test in Remotion Studio: snappy? moving? ready ✓

---

## Quality Gate: The "Feels Dragged" Test

### Before Publishing ANY Video:
1. **Watch the preview full-length** (120 seconds unbroken)
2. **Ask**: Does any moment feel slow, static, or boring?
   - Google Studio: Is any image on screen >4s unchanged?
   - Remotion: Is any segment static for 2+ consecutive seconds?
3. **If YES to either**: FAIL. Go back and fix.
4. **If NO**: PASS. Ready for distribution.

### User Feedback That Triggered This Rule:
> "the video you shared does not have animation its juts pictures why are you not using veo use it to animate make the video more dynamic also its too less images use more of them to match the pacing of the VO script and redo it"

**Translation**: 
- Too few visual changes (speed up frame cycling)
- Not enough images/segments (add more, shorter ones)
- Felt boring/static (add animation or more image variety)

---

## Examples of Violations & Fixes

### VIOLATION 1: Google Studio Image Too Long
**Problem**: One image holds for 6 seconds  
**User Experience**: "feels dragged"  
**Fix**: Split into 2 images (3s each) with different content  
**Check**: `FRAME_PACING_QUICK_CHANGES` rule

### VIOLATION 2: Remotion Segment Without Animation
**Problem**: SVG appears on screen and stays still for 5 seconds  
**User Experience**: "not animated its just pictures"  
**Fix**: Add opacity fade-in (1s), scale pulse (3s), fade-out (1s)  
**Check**: `ANIMATION_INTERNAL_MOTION` rule

### VIOLATION 3: Remotion Transition Too Slow
**Problem**: Fade between segments takes 1.5 seconds  
**User Experience**: "feels slow/dragged"  
**Fix**: Reduce fade to 0.3 seconds (9 frames @ 30fps)  
**Check**: `FRAME_PACING_QUICK_CHANGES` rule

### VIOLATION 4: Single Remotion Segment 10 Seconds
**Problem**: One animated scene for entire 10s VO chunk  
**User Experience**: "monotonous, no visual momentum"  
**Fix**: Split into 2 segments (6s + 4s) with transition  
**Check**: `ANIMATION_SEGMENT_DURATION_MAX` rule

---

## Verification Worksheet

### For Google Studio Approach:
```
Video: course-overview-FINAL-GOOGLE-STUDIO.mp4

Opening (15s):
  Images: ___/5
  Durations: __s + __s + __s + __s + __s = 15s ✓

Problem (20s):
  Images: ___/8
  Durations: average __s per image ✓

[... continue for all sections ...]

Total images: ___/37-40 expected
Total duration: 120s ✓
Preview feeling: _______ (quick? engaging? dragged?)
PASS / FAIL
```

### For Remotion Approach:
```
Video: CourseOverviewGoogle-Studio or CourseOverviewRemotionAnimated

Opening (15s, 450 frames):
  Segments: ___/3-4 expected
  Segment 1: __s, animation: ________
  Segment 2: __s, animation: ________
  [... continue ...]

Total segments: ___/20-24 expected
Max segment duration: __s (must be ≤6s) ✓
Min animations per segment: 2+ ✓
Transition speed: 0.2-0.5s ✓

Remotion Studio preview:
  - Snappy transitions? YES / NO
  - Sees motion throughout? YES / NO
  - Any dragged moments? YES / NO
  - User ready? YES / NO
```

---

## Summary

Both approaches are valid. Both must pass the **"feels dragged" test**:
- **Google Studio**: 2-4s per image, 30-40 images total
- **Remotion**: Max 6s per segment, 2+ animations per segment, 0.2-0.5s transitions

Locked rules enforce this automatically. Locked rules are logged at agent startup. No regressions allowed.

**Choose the right approach. Test thoroughly. Ship with confidence.**
