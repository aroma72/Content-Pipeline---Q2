# Voiceover Post-Production Sync Guide
**Efficient Audio Integration Without Wasting Credits**

**Last Updated**: 2026-05-12  
**Framework**: Remotion videos + ElevenLabs TTS

---

## Core Principle: Video-First Workflow

**Traditional approach** (credit-wasteful):
1. Write script
2. Generate voiceover
3. Make video match audio duration
4. If mismatch → regenerate (costs credits)

**Our approach** (credit-efficient):
1. **Create video first** with exact scene timings
2. **Write script to match video**, not the other way around
3. **Generate voiceover** knowing exact target duration
4. **Trim if needed** (instant, free) instead of regenerating
5. **Validate sync** before final render

---

## Step 1: Video Architecture (Prerequisite)

### Get Exact Scene Timings from Remotion

In your TSX component, each scene should have explicit frame counts:

```tsx
// Example: AutonomousSystemsPart1.tsx
const SCENES = {
  scene_1: { frames: 385, label: "Title" },           // 0-385 frames
  scene_2: { frames: 385, label: "Consumer Def" },    // 385-770 frames
  scene_3: { frames: 325, label: "Consumer Visual" }, // 770-1095 frames
  // ... etc
};

// In composition:
<Sequence from={0} durationInFrames={385}>
  <Scene1Title />
</Sequence>
```

**Duration formula**: `seconds = frames ÷ 30 fps`
- 385 frames @ 30fps = 12.8s ≈ 13s

Document these in a timing reference (JSON or markdown).

### Build Timing Reference

```json
{
  "video": "autonomous_systems_part_1",
  "total_frames": 2700,
  "total_duration_seconds": 90,
  "fps": 30,
  "scenes": [
    { "id": "scene_1", "frames": 385, "seconds": 12.8, "target_vo": 13.0 },
    { "id": "scene_2", "frames": 385, "seconds": 12.8, "target_vo": 13.0 },
    { "id": "scene_3", "frames": 325, "seconds": 10.8, "target_vo": 10.0 },
    { "id": "scene_4", "frames": 385, "seconds": 12.8, "target_vo": 13.0 },
    { "id": "scene_5", "frames": 385, "seconds": 12.8, "target_vo": 13.0 },
    { "id": "scene_6", "frames": 480, "seconds": 16.0, "target_vo": 16.0 },
    { "id": "scene_7", "frames": 300, "seconds": 10.0, "target_vo": 10.0 }
  ]
}
```

---

## Step 2: Script Writing (Target Duration)

### Character Count to Duration

**Rule of thumb** (professional voiceover pacing):
- Speaking rate: ~150 words/minute
- Average word: ~5 characters
- **Result: ~750 characters/minute or 12.5 chars/second**

**Examples**:
- 13s scene = 13 × 12.5 = **~162 characters**
- 16s scene = 16 × 12.5 = **~200 characters**
- 10s scene = 10 × 12.5 = **~125 characters**

### Script Template

```markdown
### Scene 2: Consumer Mindset Definition (Target: 13s / 162 characters)

"The Consumer Mindset says: Tell me what to do. It needs detailed 
instructions. It requires constant guidance. All decisions come from 
outside. This is the default for many systems. They wait. They listen. 
They execute only what they're told."

**Count**: 157 characters ✅ Within 162 target (allows ~5 char buffer)
**Duration estimate**: ~13.0s
```

### Script Validation Checklist

- [ ] Script matches what's ON SCREEN during scene
- [ ] No narrative overlap between scenes (Scene 3 ends before Scene 4 visual)
- [ ] Character count within 10% of target (162 ± 16 for 13s)
- [ ] Tested pacing - read aloud at natural professional pace
- [ ] No jargon or unclear references

---

## Step 3: Voiceover Generation (With Auto-Trim)

### Use the Updated Skill

**File**: `skills/voiceover_generation_skill.py`

**Key method**: `generate_and_sync_voiceover()` with `auto_trim=True`

```python
from skills.voiceover_generation_skill import VoiceoverGenerationSkill
import asyncio

async def create_voiceovers():
    skill = VoiceoverGenerationSkill()
    
    scenes = [
        {
            'scene_id': 'scene_1',
            'text': 'Welcome to Autonomous Systems...',
            'duration_seconds': 13.0,
            'output_path': 'voiceovers/scene_1.mp3'
        },
        # ... one per scene
    ]
    
    # Generate and auto-trim to exact durations
    results = await skill.generate_and_sync_voiceover(
        scenes,
        auto_trim=True  # KEY: Trim instead of regenerate
    )
    
    for result in results:
        print(result['message'])
        # Output: "scene_1: 13.02s - Perfect match"
        # Or: "scene_2: 13.50s - Trimmed from 13.92s (saved 1 API call)"
```

### What Auto-Trim Does

**Scenario 1: Perfect duration**
```
Generated: 13.02s
Target: 13.0s
Status: ✅ MATCH (deviation 0.02s within 0.5s tolerance)
Action: Use as-is
Credits: 1 call
```

**Scenario 2: Too long**
```
Generated: 13.92s
Target: 13.0s
Status: ⚠️ MISMATCH (deviation 0.92s)
Action: Trim to 13.0s using ffmpeg
Credits: 1 call (NOT regenerated)
Savings: 1 credit vs regenerating
```

**Scenario 3: Too short**
```
Generated: 11.50s
Target: 13.0s
Status: ⚠️ TOO SHORT (deviation 1.5s)
Action: Flag for regeneration with expanded text
Credits: Will need 1 more call (can't trim)
```

---

## Step 4: Duration Validation

### Get Actual Audio Duration

```python
actual_duration = await skill.get_audio_duration('voiceovers/scene_1.mp3')
# Returns: 13.02 (seconds as float)
```

### Validate Against Target

```python
timing = await skill.validate_scene_timing('scene_1', actual_duration=13.02)
# Returns: {
#   'scene_id': 'scene_1',
#   'target_duration': 13.0,
#   'actual_duration': 13.02,
#   'matches': True,
#   'deviation': 0.02,
#   'message': "Scene 1: 13.02s vs 13s target ✅ MATCH"
# }
```

### Tolerance Rules

| Deviation | Status | Action |
|-----------|--------|--------|
| < 0.5s | ✅ MATCH | Use as-is |
| 0.5s-1.0s | ⚠️ ACCEPTABLE | Use with note |
| > 1.0s too long | 📌 TRIM | Use ffmpeg trim |
| > 1.0s too short | 🔴 REGENERATE | Rewrite + generate |

---

## Step 5: Scene Transition Validation

### Check Boundaries

Each scene voiceover must start and stop at exact visual boundaries:

**Scene 3 → Scene 4 Transition Example**:
```
Visual Scene 3:   Frames 770-1095 (325 frames = 10.8s)
VO Scene 3:       "...from person to system." [STOPS HERE]
                  Duration: 9.8s ✅ Fits within 10.8s scene

Visual Scene 4:   Frames 1095-1480 (385 frames = 12.8s)  
VO Scene 4:       "The Producer Mindset is different..." [STARTS HERE]
                  Duration: 13.0s ✅ Fits within 12.8s+tolerance
```

**Validation checklist**:
- [ ] Scene N voiceover ends before visual Scene N ends
- [ ] Scene N+1 voiceover starts exactly when visual Scene N+1 appears
- [ ] No voiceover overlap between scenes
- [ ] No gaps (silence) between scenes (unless intentional)

---

## Step 6: Final Video Assembly

### Audio Mixing Steps

1. **Extract all VO files** (or use trimmed versions)
   ```bash
   ls -la voiceovers/scene_*.mp3
   ```

2. **Concatenate in order** (if needed for single audio track)
   ```bash
   ffmpeg -f concat -safe 0 -i filelist.txt -c copy output_voiceover.mp3
   ```

3. **Mix with video** (in Remotion or post-production)
   ```bash
   ffmpeg -i video.mp4 -i voiceover.mp3 -c:v copy -c:a aac final_with_vo.mp4
   ```

4. **Validate sync** - Play video and verify:
   - Audio starts exactly with Scene 1 visual
   - Each voiceover describes what's on screen
   - No audio cuts off or overlaps visuals
   - No gaps between scenes

---

## Credit Efficiency Analysis

### Traditional Approach (Wasteful)

| Video | Scenes | API Calls | Notes |
|-------|--------|-----------|-------|
| Week 1, Video 1 | 7 | 14 | 7 generated, 7 regenerated due to timing |
| Week 1, Video 2 | 7 | 12 | 5 good first time, 2 regenerated |
| Week 1, Video 3 | 7 | 11 | 6 good, 1 regenerated, timing luck |
| Week 1, Video 4 | 7 | 13 | 6 good, 1 trimmed manually, 1 regenerated |
| **Week Total** | **28** | **50** | **1,250 chars** |

### Our Approach (Video-First + Auto-Trim)

| Video | Scenes | API Calls | Trimmed | Notes |
|-------|--------|-----------|---------|-------|
| Week 1, Video 1 | 7 | 7 | 2 | All generated, 2 trimmed automatically |
| Week 1, Video 2 | 7 | 7 | 1 | 1 trimmed automatically |
| Week 1, Video 3 | 7 | 7 | 3 | 3 trimmed automatically |
| Week 1, Video 4 | 7 | 7 | 2 | 2 trimmed automatically |
| **Week Total** | **28** | **28** | **8** | **700 chars** |

**Savings**: 22 fewer API calls = **44% credit reduction**

---

## Tools Required

### Must Install

```bash
# Audio duration detection
brew install ffmpeg  # or `choco install ffmpeg` on Windows

# Audio trimming and mixing
which ffprobe  # Should be in ffmpeg package
```

### Python Dependencies

Already in `voiceover_generation_skill.py`:
- `requests` - for ElevenLabs API
- `subprocess` - for ffmpeg/ffprobe calls

---

## Troubleshooting

### Problem: Audio Too Long

**Symptom**: `⚠️ MISMATCH (+1.2s)` - Generated audio longer than scene

**Solution**:
1. Auto-trim runs automatically if you use `generate_and_sync_voiceover(auto_trim=True)`
2. Or manually: `await skill.trim_audio_to_duration('scene_1.mp3', 13.0)`

### Problem: Audio Too Short

**Symptom**: `⚠️ TOO SHORT (-1.5s)` - Generated audio shorter than target

**Solution**:
1. Expand the script - add more descriptive content
2. Regenerate with the expanded text
3. Check character count - should be ~162 for 13s, you might have only 100

### Problem: Sync Doesn't Match Visual

**Symptom**: Audio talks about "Producer" while visual shows "Consumer"

**Solution**:
1. Return to script writing phase
2. Check if voiceover matches what's on screen at that moment
3. Update the VOICEOVER_SYNC_STANDARD.md with scene transitions

### Problem: ffmpeg/ffprobe Not Found

**Symptom**: `subprocess.TimeoutExpired` or `FileNotFoundError`

**Solution**:
```bash
# macOS
brew install ffmpeg

# Windows (with Chocolatey)
choco install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt-get install ffmpeg

# Verify
ffprobe -version
ffmpeg -version
```

---

## References & Best Practices

Based on industry standards from:

- [WellSaid Labs: Voiceover Post-Production Techniques](https://www.wellsaid.io/resources/blog/voiceover-post-production)
- [Zight: Ultimate Guide to AI Voiceover Sync](https://zight.com/blog/ultimate-guide-to-ai-voiceover-sync/)
- [Kukarella: Sync AI Voiceovers with Video](https://www.kukarella.com/resources/ai-audio-engineering/how-to-seamlessly-sync-ai-voiceovers-with-video-ai-dubbing-and-adr)

**Key Takeaways**:
1. ✅ Plan video timing FIRST
2. ✅ Write script to match video, not vice versa
3. ✅ Generate audio knowing exact target duration
4. ✅ Trim audio instead of regenerating (saves credits)
5. ✅ Validate sync before final render
6. ✅ Use visual waveforms for precise alignment

---

## Checklist: Before Final Render

- [ ] Video created in Remotion with exact scene frame counts
- [ ] Timing reference document created
- [ ] Scripts written matching target character counts
- [ ] All voiceovers generated with `generate_and_sync_voiceover()`
- [ ] Duration validation passed for all scenes
- [ ] Audio and video sync checked (play video, verify alignment)
- [ ] No scenes skipped or reordered
- [ ] Final MP4 matches expected 90-second duration
- [ ] Ready for quality orchestrator validation

---

## Next Steps

1. **Render your Remotion video** with exact scene structure
2. **Generate timing reference JSON** from frame counts
3. **Write synced scripts** using character count targets
4. **Run `generate_and_sync_voiceover()`** with auto_trim enabled
5. **Validate** with `validate_scene_timing()`
6. **Assemble final video** with audio mixed in
7. **Run quality orchestrator** before release

