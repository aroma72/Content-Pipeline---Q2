# Autonomous Systems Part 4 - Voiceover Script
## Building Autonomous Systems

**Total Duration**: 60 seconds (1800 frames @ 30fps)
**Pacing**: Natural, constructive, conclusive

---

### Scene 1: Three Pillars Intro (0-13 seconds / 0-390 frames)
**Duration**: 13 seconds

> You now understand what evaluation is. You know four methods to do it. But how do you actually build an autonomous system that stays good? It requires three foundational pillars working together. Without any one of them, the system fails.

---

### Scene 2: Pillar 1 - Skills (13-26 seconds / 390-780 frames)
**Duration**: 13 seconds

> Pillar One: Skills. These are your system's capabilities. What can it do? What actions can it take? Skills are composable—they build on each other. A system is only as autonomous as its skills allow it to be. Skills give it the power to act.

---

### Scene 3: Pillar 2 - Evaluation Hooks (26-39 seconds / 780-1170 frames)
**Duration**: 13 seconds

> Pillar Two: Evaluation Hooks. These are the system's conscience. Real-time checks that ask: Is this safe? Before the system acts, hooks evaluate. They guard against harm. They ensure the system respects boundaries. Without hooks, skills become dangerous.

---

### Scene 4: Pillar 3 - Self-Improvement (39-52 seconds / 1170-1560 frames)
**Duration**: 13 seconds

> Pillar Three: Self-Improvement. The system learns from what happens. It reflects on outcomes. It feeds data back into decision-making. The system gets better over time because it measures, learns, and adapts. Without this loop, progress stops.

---

### Scene 5: Integration (52-60 seconds / 1560-1800 frames)
**Duration**: 8 seconds

> Three pillars. Skills, hooks, learning. When they work together, you have a truly autonomous system. One that acts independently, stays safe, and continuously improves. That's what autonomy looks like.

---

## Voiceover Specifications

**Voice Style**: Professional, clear, building  
**Pace**: Moderate - steady accumulation of concepts  
**Tone**: Educational, constructive, empowering  
**Emphasis**: Three pillars as foundational elements  

**ElevenLabs Settings**:
- Model: eleven_monologue_v1 (professional narration)
- Voice: Professional male or female (natural sounding)
- Stability: 0.5 (balanced)
- Similarity Boost: 0.75 (natural variation)
- Style: 0.3 (subtle emotional expression)

---

## Audio Integration

Each scene voiceover will be:
1. Generated separately via ElevenLabs API
2. Timed to match scene duration exactly
3. Mixed at -18dB (voiceover level)
4. Crossfaded (200ms) between scenes
5. Combined with video using ffmpeg

**Final Audio Mix**:
- Clean voiceover focus
- No background music
- Clear, professional narration

---

**Generated**: 2026-05-13  
**Format**: MP4 with AAC audio  
**Bitrate**: 128 kbps audio + 5000 kbps video
