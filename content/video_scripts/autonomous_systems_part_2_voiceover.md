# Autonomous Systems Part 2 - Voiceover Script
## Testing vs Evaluation

**Total Duration**: 60 seconds (1800 frames @ 30fps)
**Pacing**: Natural, conversational, thought-provoking

---

### Scene 1: The Critical Question (0-13 seconds / 0-390 frames)
**Duration**: 13 seconds

> You've built an autonomous system. You ran your tests. Every one passed. You feel confident. You deploy. Then something unexpected happens in production. Your system makes a decision that breaks. It misses an edge case. It's slower than expected. How did this happen? Your tests all passed. The answer is simple: You were testing, but you weren't evaluating.

---

### Scene 2: Testing Definition (13-31 seconds / 390-930 frames)
**Duration**: 18 seconds

> Testing asks: Does the code work? Does it run? If I give it input X, do I get output Y? Testing is essential. You definitely need it. But it's narrow. It only checks the mechanism itself.
> Testing verifies that your code is technically correct. It catches bugs. It ensures the system functions.

---

### Scene 3: Evaluation Definition (31-44 seconds / 930-1320 frames)
**Duration**: 13 seconds

> Evaluation asks a different question entirely: Is this system right? Does it actually solve the problem? Does the output help users? Does it meet real-world needs? Evaluation is broader. It checks whether the system achieves its actual purpose, not just whether the code works.

---

### Scene 4: The Critical Difference (44-60 seconds / 1320-1800 frames)
**Duration**: 16 seconds

> Here's the key: Your code can pass every test and still fail in the real world. A system can work perfectly—technically sound—and still be wrong. Testing ensures it runs. Evaluation ensures it should run. Both are necessary. One without the other leaves you blind. This distinction is everything.

---

## Voiceover Specifications

**Voice Style**: Professional, clear, conversational, warm  
**Pace**: Moderate - thoughtful and deliberate  
**Tone**: Educational, questioning, building awareness  
**Emphasis**: Calm and direct, emphasizing the "aha moment"  

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
