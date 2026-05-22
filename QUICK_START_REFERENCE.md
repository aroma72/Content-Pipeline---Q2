# Quick Start Reference
## Complete System Ready — Choose Your Path

---

## The Three-Part Foundation

### ✅ Part 1: Locked Rules System
**What**: Agent memory system enforcing non-negotiable rules  
**Where**: `agent_memory.json` + `memory_manager.py`  
**Agents Updated**: RemotionVideoAgent, PostProductionAgent, DistributionAgent  
**Rules Logged**: At every agent startup (cannot be bypassed)

**Key Rules**:
- 3-SECOND RULE: No visual static >3s (applies to both image + animation)
- NO_HARDCODED_PROMPTS: All prompts in `prompts/` directory
- PRESERVE_INFRASTRUCTURE: Never delete `prompts/`, `tests/`, `.claude/`
- FRAME_COUNT_MATH: frames = VO_seconds × 30fps
- AUDIO_CODEC: Always AAC (not mp3, not pcm)
- NO_FORCE_PUSH: Never force-push to main

### ✅ Part 2: VO-Sync-First Framework
**What**: Phase 0 mapping approach that works for ALL visual methods  
**Where**: Multiple guides document Phase 0-5 process  
**Applies To**: Google Studio images, Remotion animations, or hybrid  
**Key Insight**: Map VO-to-visuals BEFORE choosing how to generate visuals

**The Process**:
```
1. Phase 0: Map VO → visuals (3-second rule)
2. DECISION: Choose Google Studio OR Remotion OR Hybrid
3. Phase 1: Generate images OR animations OR both
4. Phase 2: Build composition from mapping
5. Phase 3-5: Render → verify → mux
```

### ✅ Part 3: Unified 3-Second Rule
**Google Studio**: 1 image max 3 seconds → cut to next  
**Remotion**: 1 scene has max 3s stable state → internal animation continues  
**Both**: User perceives "dynamic, never dragged" experience

---

## Which Document Do I Need?

### Planning a Video
→ `UNIFIED_VIDEO_GENERATION_FRAMEWORK.md`
- Decision tree (Google Studio vs Remotion vs Hybrid)
- Phase 0 mapping process
- Frame timing examples

### Understanding Locked Rules
→ `AGENT_MEMORY_SYSTEM_IMPLEMENTED.md`
- What rules exist
- How they're enforced
- Past mistakes to avoid

### Using Google Studio Images
→ `VO_SYNC_FIRST_VIDEO_GENERATION.md`
- Phase 0 mapping (detailed)
- Phase 1 image generation
- Timing examples

### Using Remotion Animations
→ `REMOTION_ANIMATION_TIMING_GUIDE.md`
- 3-second rule for animations
- Internal animation requirements
- When to override (5-6s scenes)

### Frame Pacing Details
→ `FRAME_PACING_RULES_BOTH_APPROACHES.md`
- Engagement rules for both approaches
- Verification worksheets
- Violation fixes

### Ready to Implement Now?
→ `IMPLEMENTATION_READY_SUMMARY.md`
- Status of all systems
- What's ready to use
- Next steps to begin

---

## The Workflow (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│ YOU HAVE A VOICEOVER SCRIPT (recorded WAV files)            │
│ YOU WANT A 2-MINUTE VIDEO WITH VISUALS                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
        ┌─────────────────────────────────────┐
        │ PHASE 0: MAP VO TO VISUALS          │
        │ (Same process regardless of approach)
        │ Time: 30-45 minutes                 │
        │ Output: VO_VISUAL_MAPPING.json      │
        │ Rule: 3-second per visual moment    │
        │ (with justified overrides)          │
        └─────────────────────────────────────┘
                           ↓
        ┌─────────────────────────────────────┐
        │ DECISION: WHICH VISUAL APPROACH?    │
        │ (Based on content of your mapping)  │
        └─────────────────────────────────────┘
             ↙              ↓              ↘
      ┌─────────┐    ┌──────────┐    ┌──────────┐
      │ GOOGLE  │    │ REMOTION │    │ HYBRID   │
      │ STUDIO  │    │ANIMATIONS│    │(both)    │
      │ IMAGES  │    │          │    │          │
      └─────────┘    └──────────┘    └──────────┘
           ↓              ↓              ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ PHASE 1A:    │ │ PHASE 1B:    │ │ PHASE 1C:    │
    │ Generate PNG │ │ Code TSX     │ │ Generate +   │
    │ files via    │ │ components   │ │ Code         │
    │ API          │ │ (animation)  │ │ (parallel)   │
    │              │ │              │ │              │
    │ 30-40 min +  │ │ 45-90 min    │ │ 60-120 min   │
    │ API time     │ │              │ │              │
    └──────────────┘ └──────────────┘ └──────────────┘
             ↓              ↓              ↓
        ┌────────────────────────────────────┐
        │ PHASE 2: BUILD COMPOSITION         │
        │ (Same code for all approaches)     │
        │ Time: 45-60 minutes                │
        │ Input: VO_VISUAL_MAPPING.json +    │
        │        Phase 1 outputs             │
        │ Output: Remotion composition       │
        └────────────────────────────────────┘
                           ↓
        ┌────────────────────────────────────┐
        │ PHASE 3: CAPTION INTEGRATION       │
        │ Time: 20 minutes                   │
        │ Uses existing caption system       │
        └────────────────────────────────────┘
                           ↓
        ┌────────────────────────────────────┐
        │ PHASE 4: RENDER VIDEO              │
        │ Time: 30-60 minutes (depends on    │
        │       machine)                     │
        │ Output: Silent video MP4           │
        └────────────────────────────────────┘
                           ↓
        ┌────────────────────────────────────┐
        │ PHASE 5: MUX VOICEOVER             │
        │ Time: 10-15 minutes                │
        │ Input: Voiceover WAV files         │
        │ Output: FINAL VIDEO (1.6-8 MB)     │
        └────────────────────────────────────┘
                           ↓
        ┌────────────────────────────────────┐
        │ ✅ READY FOR DISTRIBUTION           │
        │ 120-second video                   │
        │ Perfect VO-visual sync             │
        │ 1920×1080 Full HD                  │
        │ H.264 + AAC codec                  │
        └────────────────────────────────────┘
```

---

## Starting Right Now

### If You Want Google Studio Images:
1. Read: `VO_SYNC_FIRST_VIDEO_GENERATION.md` (Phase 0-1 process)
2. Read: `UNIFIED_VIDEO_GENERATION_FRAMEWORK.md` (decision confirmation)
3. Start: Create VO_VISUAL_MAPPING.json for your video
4. Wait: For Phase 0 approval from user
5. Execute: Phase 1 image generation script
6. Proceed: Phase 2-5 (build composition → render → mux)

### If You Want Remotion Animations:
1. Read: `REMOTION_ANIMATION_TIMING_GUIDE.md` (animation-specific rules)
2. Read: `UNIFIED_VIDEO_GENERATION_FRAMEWORK.md` (decision confirmation)
3. Start: Create VO_VISUAL_MAPPING.json with animation_plan fields
4. Wait: For Phase 0 approval from user
5. Execute: Phase 1 animation code development
6. Proceed: Phase 2-5 (build composition → render → mux)

### If You Want Hybrid:
1. Read: `UNIFIED_VIDEO_GENERATION_FRAMEWORK.md` (both approaches)
2. Read: Both `VO_SYNC_FIRST_VIDEO_GENERATION.md` and `REMOTION_ANIMATION_TIMING_GUIDE.md`
3. Start: Create VO_VISUAL_MAPPING.json specifying per-scene approach
4. Wait: For Phase 0 approval from user
5. Execute: Parallel Phase 1A (images) + Phase 1B (animations)
6. Proceed: Phase 2-5 (combined composition → render → mux)

---

## The Rules You Cannot Violate

### Locked (Enforced at agent startup):
- 🔴 NO_HARDCODED_PROMPTS: Prompts must be in `prompts/` directory
- 🔴 PRESERVE_INFRASTRUCTURE: Never delete `prompts/`, `tests/`, `.claude/`
- 🔴 NO_FORCE_PUSH: Never force-push to main branch
- 🔴 FRAME_COUNT_MATH: Verify frames = VO_seconds × 30fps before render

### Critical for Engagement:
- 🟡 FRAME_PACING_QUICK_CHANGES: 3-second rule (no static >3s)
- 🟡 ANIMATION_SEGMENT_DURATION_MAX: Remotion max 6s per segment
- 🟡 ANIMATION_INTERNAL_MOTION: 2+ animations per Remotion segment

### For Production Quality:
- 🟡 AUDIO_CODEC_COMPATIBILITY: Always AAC (never mp3/pcm)
- 🟡 SYNC_VERIFICATION_REQUIRED: Test VO-visual sync before publishing
- 🟡 CAPTION_SYNC_ABSOLUTE: Captions at exact frame offsets

---

## FAQ

**Q: Do I have to use Google Studio images?**  
A: No. You can use Remotion animations instead, or hybrid (both). Phase 0 mapping is the same for all approaches.

**Q: Can I skip the 3-second rule?**  
A: Only with documented justification (e.g., "Complex diagram requires 5 seconds"). Must be approved in Phase 0.

**Q: How long does the full process take?**  
A: Phase 0 (30-45 min) + Phase 1 (30-120 min depending on approach) + Phases 2-5 (2-3 hours) = 3-5 hours total.

**Q: What if my voiceover is different length?**  
A: Phase 0 mapping accommodates any duration. Frame count = VO_duration × 30fps.

**Q: Can I use both Google Studio AND Remotion in same video?**  
A: Yes, use Hybrid approach (Option C). Specify per-scene in Phase 0 mapping.

**Q: What happens if Phase 0 mapping is wrong?**  
A: Entire video will be out of sync. CRITICAL: Verify Phase 0 math multiple times before proceeding.

---

## Health Check: Is System Ready?

- [x] Agent memory system live (rules enforced at startup)
- [x] 3-second rule defined for both approaches
- [x] VO-sync-first framework documented (6 phases)
- [x] Google Studio approach ready (Phase 0-5 documented)
- [x] Remotion approach ready (Phase 0-5 documented, animation timing included)
- [x] Hybrid approach ready (both in parallel)
- [x] Implementation plan updated (unified framework)
- [x] All documentation written (7 comprehensive guides)

**System Status**: ✅ **PRODUCTION READY**

---

## Next Action

**Ready to start Phase 0 VO-to-visual mapping for your first video?**

When ready:
1. Load voiceover WAV files
2. Break into visual moments (3-second rule)
3. Create VO_VISUAL_MAPPING.json
4. Get approval (all overrides documented)
5. Decide: Google Studio OR Remotion OR Hybrid
6. Execute Phase 1
7. Proceed to Phases 2-5

All systems armed and ready. Locked rules will not allow violations. Framework is unified across all approaches.

**Let's build something great.**
