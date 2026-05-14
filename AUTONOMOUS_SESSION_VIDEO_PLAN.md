# Autonomous Systems Session - 3-Video Production Plan
**Status**: Scripts created, ready for voiceover generation & composition  
**Date**: 2026-05-14  
**Total Duration**: 11m 30s across 3 videos  

---

## 📋 What's Been Created

### ✅ Part 1: Consumer vs Producer Mindset (3m 45s)
- **File**: `video_scripts/autonomous_systems_session_part_1_intro.md`
- **Scenes**: 6 (Opening, Consumer, Problem, Producer, Impact, Question)
- **Frame Count**: 6,750 frames @ 30fps
- **Script Type**: VO + visual descriptions
- **Key Concepts**: 
  - Consumer mindset (dependent, instructed, bottlenecked)
  - Producer mindset (autonomous, goal-oriented, scalable)
  - Why the shift matters

### ✅ Part 2: Autonomy & Evaluation (3m 50s)
- **File**: `video_scripts/autonomous_systems_session_part_2_theory.md`
- **Scenes**: 6 (What is autonomy, 7 pillars, why measure, testing vs eval, 3 levels, the gap)
- **Frame Count**: 6,900 frames @ 30fps
- **Key Concepts**:
  - 7 dimensions of autonomy (Self-Direction, Ownership, Agency, Initiative, Independence, Capability, Learning)
  - Testing vs Evaluation distinction
  - 3 evaluation levels (Automated, Hooks, LLM Judge)

### ✅ Part 3: Building & Testing (3m 55s)
- **File**: `video_scripts/autonomous_systems_session_part_3_practical.md`
- **Scenes**: 6 (Challenge, 3 Tools, 6-step workflow, why it works, real example, next step)
- **Frame Count**: 7,050 frames @ 30fps
- **Key Concepts**:
  - Chrome MCP testing
  - BDD test cases
  - Skills as reusable instruction sets
  - Complete workflow from plan to evaluation

---

## 🎬 What's Next: Implementation Steps

### Step 1: Generate Voiceovers (VO Generation)
```bash
# Set your ElevenLabs API key in environment
$env:ELEVENLABS_API_KEY = "your_key_here"

# Run the VO generation script
py generate_autonomous_session_vo.py
```

**Output**: 18 MP3 files
- `voiceovers/autonomous_session/part_1_*.mp3` (6 files)
- `voiceovers/autonomous_session/part_2_*.mp3` (6 files)
- `voiceovers/autonomous_session/part_3_*.mp3` (6 files)

**Voice Settings**:
- Voice ID: 21m00Tcm4TlvDq8ikWAM (Professional male, Adam)
- Model: eleven_monolingual_v1
- Stability: 0.5 | Similarity Boost: 0.75

---

### Step 2: Create Remotion Compositions (NOT YET CREATED)

Need to create:
1. **AutonomousSessionPart1.tsx**
   - 6 scenes with corresponding visual designs
   - Color palette: Red (consumer) → Green (producer)
   - Key graphics: Flow diagrams, comparison charts, radial animations

2. **AutonomousSessionPart2.tsx**
   - 6 scenes with theoretical content
   - Key graphic: 7-pillar radial diagram (animated)
   - Comparison chart: Testing vs Evaluation
   - 3-level pyramid visualization

3. **AutonomousSessionPart3.tsx**
   - 6 scenes with practical workflow
   - Key graphic: 6-step horizontal flowchart
   - Before/After comparison
   - Real example visualization (payment feature)

**Design System** (Consistent across all 3):
- Font: DM Sans (Google Fonts)
- Resolution: 1920×1080 @ 30fps
- Warm color palette:
  - #faf8f5 (light background)
  - #f9f3ed (warm background)
  - #d99670 (soft orange - primary actions)
  - #c97070 (soft red - problems/consumer)
  - #8b9d7d (soft green - solutions/producer)
  - #7d9db8 (soft blue - learning)
- Animation: Spring physics (damping: 90, stiffness: 60)

---

### Step 3: Sync VO with Scenes

Each video has 6 scenes with specific timing:

**Part 1 (225s total)**:
- Scene 1: 15s
- Scene 2: 35s
- Scene 3: 20s
- Scene 4: 60s
- Scene 5: 50s
- Scene 6: 45s

**Part 2 (230s total)**:
- Scene 1: 20s
- Scene 2: 70s
- Scene 3: 40s
- Scene 4: 50s
- Scene 5: 40s
- Scene 6: 10s

**Part 3 (235s total)**:
- Scene 1: 18s
- Scene 2: 52s
- Scene 3: 70s
- Scene 4: 40s
- Scene 5: 45s
- Scene 6: 10s

---

### Step 4: Render Videos

**Per-video render command**:
```bash
cd drawing-room-video/drawing-room-remotion

# Part 1
npx remotion render src/index.ts AutonomousSessionPart1 ../../output/autonomous_session_part_1_silent.mp4 --fps 30 --width 1920 --height 1080

# Part 2
npx remotion render src/index.ts AutonomousSessionPart2 ../../output/autonomous_session_part_2_silent.mp4 --fps 30 --width 1920 --height 1080

# Part 3
npx remotion render src/index.ts AutonomousSessionPart3 ../../output/autonomous_session_part_3_silent.mp4 --fps 30 --width 1920 --height 1080
```

---

### Step 5: Mux VO with Video

Once silent videos are rendered and VO is generated:

```bash
# Part 1
ffmpeg -i output/autonomous_session_part_1_silent.mp4 \
        -i voiceovers/autonomous_session/part_1_combined.mp3 \
        -c:v copy -c:a aac -shortest \
        output/autonomous_session_part_1_final.mp4

# Part 2 & 3 similar...
```

**Note**: Need to combine individual scene VOs into single track per video (use ffmpeg concat)

---

## 📊 Video Specifications

| Video | Duration | Frames | Scenes | Key Visual |
|-------|----------|--------|--------|------------|
| Part 1 | 3m 45s | 6,750 | 6 | Mindset comparison, color shift |
| Part 2 | 3m 50s | 6,900 | 6 | 7-pillar radial, testing vs eval |
| Part 3 | 3m 55s | 7,050 | 6 | 6-step workflow, before/after |
| **Total** | **11m 30s** | **20,700** | **18** | **Dynamic, educational** |

---

## 🎯 Educational Best Practices Implemented

✅ **Progressive Complexity**:
- Part 1: Foundational (Consumer vs Producer)
- Part 2: Conceptual (Autonomy framework)
- Part 3: Practical (Implementation tools)

✅ **Engagement Techniques**:
- Contrasting colors (red/green) for comparison
- Animated diagrams (7-pillar, workflows)
- Real-world example (payment feature)
- Continuous questions to viewer

✅ **Clear Concept Conveyance**:
- Define before diving deep
- Use visuals to explain complex ideas
- Relate back to earlier concepts
- End with actionable insight

✅ **Professional Production Value**:
- Consistent design system
- Smooth animations with physics
- Proper pacing (education vs. rush)
- High-contrast typography
- Dynamic motion (not static slides)

---

## 📁 File Structure

```
Content Queen/
├── video_scripts/
│   ├── autonomous_systems_session_part_1_intro.md
│   ├── autonomous_systems_session_part_2_theory.md
│   └── autonomous_systems_session_part_3_practical.md
├── voiceovers/
│   └── autonomous_session/
│       ├── part_1_opening.mp3
│       ├── part_1_consumer.mp3
│       ├── part_1_problem.mp3
│       ├── part_1_producer.mp3
│       ├── part_1_why_matters.mp3
│       ├── part_1_shift.mp3
│       ├── part_2_*.mp3 (6 files)
│       └── part_3_*.mp3 (6 files)
├── drawing-room-video/drawing-room-remotion/src/
│   ├── AutonomousSessionPart1.tsx (TO CREATE)
│   ├── AutonomousSessionPart2.tsx (TO CREATE)
│   └── AutonomousSessionPart3.tsx (TO CREATE)
├── output/
│   ├── autonomous_session_part_1_silent.mp4
│   ├── autonomous_session_part_2_silent.mp4
│   ├── autonomous_session_part_3_silent.mp4
│   ├── autonomous_session_part_1_final.mp4
│   ├── autonomous_session_part_2_final.mp4
│   └── autonomous_session_part_3_final.mp4
└── generate_autonomous_session_vo.py
```

---

## 🚀 Ready for Launch When:

1. ✅ VO scripts created (DONE)
2. ⏳ VOs generated via ElevenLabs
3. ⏳ Remotion compositions built
4. ⏳ Videos rendered silently
5. ⏳ VOs muxed with video
6. ⏳ Final quality review
7. ⏳ Upload to platform

---

## 🎓 Learning Outcomes (Viewer Perspective)

After watching all 3 videos, learner will:
1. ✅ Understand difference between consumer and producer mindsets
2. ✅ Know the 7 dimensions of autonomy
3. ✅ Be able to evaluate if a system is truly autonomous
4. ✅ Know how to implement Chrome MCP testing
5. ✅ Understand BDD format for test cases
6. ✅ Be able to create a feedback loop with Skills
7. ✅ See practical example of a complete workflow
8. ✅ Be inspired to build their own autonomous system

---

## 📝 Notes

- Scripts are extracted and cleaned from session transcription
- All content is based on actual teaching from Agentic AI Mastery cohort
- Timing is precise for 30fps rendering
- Visual descriptions are detailed enough for developer to implement
- Color psychology applied: red for problems/limitations, green for solutions/growth

**Next Action**: Generate VOs using ElevenLabs API key, then proceed with Remotion compositions.
