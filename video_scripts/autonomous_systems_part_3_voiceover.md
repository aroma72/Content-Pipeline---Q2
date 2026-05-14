# Autonomous Systems Part 3 - Voiceover Script
## Four Methods of Evaluation

**Total Duration**: 65 seconds (1950 frames @ 30fps)
**Pacing**: Natural, methodical, building understanding

---

### Scene 1: Four Methods Overview (0-13 seconds / 0-390 frames)
**Duration**: 13 seconds

> Now that you understand evaluation, you need to know how to do it. There are four proven methods. Each measures something different. Each works best in different situations. The systems that stay reliable are the ones using all four together.

---

### Scene 2: Method 1 - Code Review (13-26 seconds / 390-780 frames)
**Duration**: 13 seconds

> Method One: Code Review. A human or another system examines your code and asks: Does this logic make sense? Are there bugs? Edge cases? Code review is powerful for finding logical errors, security problems, and inefficiencies. It catches issues before they run.

---

### Scene 3: Method 2 - End-to-End Testing (26-39 seconds / 780-1170 frames)
**Duration**: 13 seconds

> Method Two: End-to-End Testing. You take real data, run it through the entire system, and check if the output is correct. This tests the whole workflow, not just pieces. When real data flows through, does your system produce the right result? End-to-End testing answers that.

---

### Scene 4: Method 3 - Safety Hooks (39-50 seconds / 1170-1500 frames)
**Duration**: 11 seconds

> Method Three: Safety Hooks. You add guardrails during execution. If something looks dangerous, the system stops and alerts instead of proceeding. Safety hooks prevent disasters. They don't fix problems—they prevent the catastrophic ones.

---

### Scene 5: Method 4 - LLM as Judge (50-65 seconds / 1500-1950 frames)
**Duration**: 15 seconds

> Method Four: LLM as Judge. You use an AI to evaluate your AI's outputs. Is the response helpful? Accurate? Professional? When human judgment is hard to code, LLM evaluation works surprisingly well. The four methods together give you complete coverage. Code review for logic. Testing for correctness. Safety hooks for risk. LLM-as-judge for quality. Use all four.

---

## Voiceover Specifications

**Voice Style**: Professional, clear, direct  
**Pace**: Moderate - steady, methodical progression  
**Tone**: Educational, practical, authoritative  
**Emphasis**: Clear method names, practical examples  

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
