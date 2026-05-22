# Unified Video Generation Framework
## Phase 0 Maps → Phase 1 Generates (Images OR Animations OR Both)

**Status**: ✅ FRAMEWORK UNIFIED FOR ALL APPROACHES  
**Key Insight**: The approach (Google Studio vs Remotion) is decided AFTER Phase 0, not before  
**Principle**: Same 3-second rule, same VO-sync requirements, different visual execution

---

## The Unified Process

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0: VO-TO-VISUAL MAPPING (SAME FOR ALL APPROACHES)    │
│                                                              │
│ Input: Voiceover script + timings                           │
│ Process: Break into visual moments, assign durations        │
│ Output: VO_VISUAL_MAPPING.json (with 3-second rules)       │
│                                                              │
│ This mapping is INDEPENDENT of HOW we make visuals          │
└─────────────────────────────────────────────────────────────┘
                           ↓
         ┌───────────────┬─────────────┬───────────────┐
         │               │             │               │
    OPTION A         OPTION B      OPTION C       (Choose AFTER
  Google Studio      Remotion        Hybrid        Phase 0 based
    Images        Animations      (both methods)   on content)
         │               │             │
         ↓               ↓             ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PHASE 1A:   │ │  PHASE 1B:   │ │  PHASE 1C:   │
│   Generate   │ │     Code     │ │   Generate   │
│    Images    │ │  Animations  │ │    Both      │
│              │ │              │ │              │
│ Custom API   │ │  TypeScript/ │ │  (Parallel)  │
│ Calls        │ │    React     │ │              │
│              │ │              │ │              │
│ Output:      │ │ Output:      │ │ Output:      │
│ PNG files    │ │ TSX/JS code  │ │ Images +     │
│              │ │              │ │ Code         │
└──────────────┘ └──────────────┘ └──────────────┘
         │               │             │
         └───────────────┬─────────────┘
                         ↓
    ┌────────────────────────────────────┐
    │ PHASE 2: BUILD REMOTION COMPOSITION│
    │                                    │
    │ (Same code structure for all       │
    │ options - imports from Phase 1)    │
    └────────────────────────────────────┘
                         ↓
    ┌────────────────────────────────────┐
    │   PHASE 3-5: VERIFY, RENDER, MUX   │
    │        (Same for all options)      │
    └────────────────────────────────────┘
                         ↓
         ┌──────────────────────────┐
         │  FINAL VIDEO (120 seconds)│
         │ VO + Visuals + Captions   │
         └──────────────────────────┘
```

---

## Phase 0: Universal VO-to-Visual Mapping

### Same Process Regardless of Approach

**Step 1**: Load voiceover WAV files  
**Step 2**: Break into natural visual moments  
**Step 3**: For each moment, decide:
- What visual content should appear?
- How long should it display (3s default, justified override)?
- How many frames? (duration × 30fps)

**Step 4**: Document in VO_VISUAL_MAPPING.json  
**Step 5**: Verify total = 3600 frames  

### Phase 0 Output: VO_VISUAL_MAPPING.json

This JSON contains:
```json
{
  "section": "opening",
  "frames": [
    {
      "frame_id": 1,
      "timestamp": "0:00-0:03",
      "vo_text": "Hello. I imagine you have been exploring AI platforms...",
      "visual_description": "Person in warm library discovering new learning space",
      "duration_seconds": 3,
      "frames_count": 90,
      "override_justification": null
    },
    {
      "frame_id": 2,
      "timestamp": "0:03-0:06",
      "vo_text": "...exploring AI platforms like ChatGPT or Claude",
      "visual_description": "Floating books, scrolls, possibilities expanding",
      "duration_seconds": 3,
      "frames_count": 90,
      "override_justification": null
    },
    {
      "frame_id": 3,
      "timestamp": "0:06-0:10",
      "vo_text": "But here is the distinction — using AI is one skill. Building with AI is entirely different.",
      "visual_description": "SPLIT SCREEN: LEFT (using AI), RIGHT (building AI)",
      "duration_seconds": 4,
      "frames_count": 120,
      "override_justification": "OVERRIDE: Complex contrast diagram requires 4s for audience to parse distinction"
    }
  ]
}
```

**Key Fields**:
- `visual_description`: Works for BOTH approaches (images use this as prompt, animations use as design brief)
- `duration_seconds` & `frames_count`: Same for all approaches
- `override_justification`: Documents why this visual needs >3s

---

## Decision Point: Which Approach for Phase 1?

**After Phase 0 mapping is complete**, decide for EACH SCENE:

### Use Google Studio Images If:
- Visual is relatively simple (one main concept)
- High visual variety helps (different photorealistic perspectives)
- Animation would be more complex than value adds
- Time constraint: faster to generate images

**Example scenes**: Concept overview, single visual focus, photorealistic needs

### Use Remotion Animation If:
- Visual involves motion/process (things moving, appearing, changing)
- Consistent visual style needed (brand-aligned SVG)
- Animation choreography is important (staggered reveals, motion paths)
- Concept benefits from animated explanation

**Example scenes**: Process flows, system architecture, cycles, progressive reveals

### Use Hybrid If:
- Some sections benefit from images (simple concepts)
- Other sections need animation (complex processes)
- Mix approaches per scene for optimal result

---

## Phase 1: Universal Output Format

Regardless of approach (A, B, or C), Phase 1 produces:
```
src/assets/
├── course-overview-images/           (if using images)
│   ├── opening/
│   │   ├── frame_1.png
│   │   ├── frame_2.png
│   │   └── frame_3.png
│   ├── problem/
│   │   └── ... (more frames)
│   └── ...
├── components/                       (if using Remotion animations)
│   ├── OpeningAnimation.tsx
│   ├── ProblemAnimation.tsx
│   └── ...
└── mapping/
    └── VO_VISUAL_MAPPING.json
```

---

## Phase 2: Universal Composition Building

Phase 2 code imports from Phase 0 mapping ONLY:

```typescript
import mapping from './mapping/VO_VISUAL_MAPPING.json';

export const CourseOverviewVideo: React.FC = () => {
  return (
    <>
      {['opening', 'problem', 'foundations', 'path_forward', 'why_matters', 'closing'].map(section => (
        mapping[section].frames.map(frame => {
          // Build Sequence from mapping
          const imageOrComponent = frame.use_image
            ? <Img src={require(`./course-overview-images/${section}/frame_${frame.frame_id}.png`)} />
            : <OpeningAnimation />; // or appropriate animated component
          
          return (
            <Sequence key={frame.frame_id} from={frame.frame_offset} durationInFrames={frame.frames_count}>
              {imageOrComponent}
            </Sequence>
          );
        })
      ))}
    </>
  );
};
```

**Note**: Phase 2 code is approach-agnostic. It imports what Phase 1 produced.

---

## The 3-Second Rule: Applies to All Approaches

### Google Studio (Image-Based):
- Image holds on screen max 3s
- After 3s, different image appears (hard cut)
- User perceives "quick frame changes"

### Remotion (Animation-Based):
- Animated scene has max 3s of "stable visual state"
- After 3s, something MUST change (new animation, element enters, etc.)
- If scene is 4-6s, MUST have continuous internal animation
- User perceives "continuous motion" (which IS a form of visual change)

### Both Must Pass:
**The "Feels Dragged" Test**: Play video. Does any moment feel static/boring?
- Google Studio: "Is any image on screen >3s unchanged?" 
- Remotion: "Is any moment >3s without animation?"
- If YES to either: FIX IT. If NO: PASS.

---

## Comparison Table: All Approaches

| Metric | Google Studio | Remotion Animation | Hybrid |
|--------|---------------|-------------------|--------|
| **Phase 0 Mapping** | Same | Same | Same |
| **Phase 0 Output** | VO_VISUAL_MAPPING.json | VO_VISUAL_MAPPING.json + animation_plan fields | Both |
| **Phase 1 Process** | Generate images via API | Code TSX components | Both in parallel |
| **Phase 1 Time** | 30-40 min + API time | 45-90 min development | 60-120 min total |
| **Visual Variety** | High (photorealistic) | Medium-High (design-consistent) | Best of both |
| **Animation Complexity** | Low (just cuts) | High (choreographed motion) | Varied per scene |
| **Engagement** | Frame-switching creates momentum | Continuous motion creates momentum | Dynamic mix |
| **Phase 2 Code** | Same (imports images) | Same (imports components) | Same (imports both) |
| **Phase 3-5** | Identical | Identical | Identical |

---

## Decision Example: Course Overview Video

**Phase 0 Mapping Complete**: All moments mapped, all durations decided (including overrides)

**Scene-by-Scene Phase 1 Decision**:

| Section | Visual Type | Decision | Reason |
|---------|-------------|----------|--------|
| Opening | Person discovering new space | Image | Simple, photorealistic needed |
| Problem | Notifications exploding, chaos | Animation | Motion is key to "chaos" concept |
| Foundations | 5 pillars appearing sequentially | Animation | Staggered reveal animation important |
| Path Forward | Timeline progression | Hybrid: Images for each week, Animation for transitions | Weeks can be static images, transitions use animation |
| Why Matters | Contrast (crowd vs single builder) | Animation | Split-screen animation shows contrast dynamically |
| Closing | Real projects montage | Image | Multiple photorealistic projects |

**Result**: Optimized mix that uses each approach's strengths

---

## Critical Rules (Apply to ALL Approaches)

### Rule 1: 3-Second Visual Stability
- No static visual for >3 seconds (without justification)
- Justification must be documented in Phase 0 mapping

### Rule 2: Exact VO-Visual Sync
- Every visual appears EXACTLY when VO mentions it
- Visual cannot lag VO (appear late)
- Visual cannot rush VO (appear early)
- Verified in Phase 2 composition (frame offsets from mapping)

### Rule 3: Minimum Visual Changes
- Every 3 seconds minimum (per 3-second rule)
- No scene feels "dragged"
- No moment of dead air without visual change

### Rule 4: Total Duration = 120 Seconds
- Phase 0 must sum to exactly 3600 frames
- Phase 1 output must preserve frame counts
- Phase 2 composition must total 3600 frames

---

## The Single Source of Truth

**VO_VISUAL_MAPPING.json** is the contract between all phases:
- Phase 0 CREATES it (mapping process)
- Phase 1 READS it (generation/animation blueprint)
- Phase 2 READS it (composition frame offsets)
- All phases must respect its durations and frame counts

If Phase 1 or Phase 2 deviates from the mapping, sync is broken.

---

## Workflow Summary

```
1. PHASE 0: Sit with VO script, map visual moments
   Output: VO_VISUAL_MAPPING.json
   
2. DECISION: Based on content, choose A/B/C for Phase 1
   
3. PHASE 1A/B/C: Generate images OR code animations OR both
   Output: Images and/or TSX components
   
4. PHASE 2: Build Remotion composition from Phase 0 mapping
   Import: VO_VISUAL_MAPPING.json + Phase 1 outputs
   Output: CourseOverviewVideo.tsx
   
5. PHASE 3-5: Render, verify, mux with VO
   Output: course-overview-FINAL.mp4
```

---

## For Implementation: Start with Phase 0

To begin any new video:
1. Load voiceover WAV files
2. Break script into visual moments
3. Create VO_VISUAL_MAPPING.json
4. Verify total = 3600 frames
5. Get user approval on all override justifications
6. THEN choose which Phase 1 approach(es) to use

This ensures perfect VO-visual sync regardless of which visual approach you choose.

---

## Summary

**The 3-second rule** + **VO-sync-first mapping** is your foundation.  
**The visual approach** (images, animations, or hybrid) is your choice.  
**The result** is always: dynamic, engaging, perfectly synchronized video.

Same framework. Different flavors. All roads lead to quality.
