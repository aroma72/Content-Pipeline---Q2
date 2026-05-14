# Voiceover Scene Synchronization Standard

**Effective**: 2026-05-12  
**Status**: REQUIRED FOR ALL VIDEO PRODUCTION  
**Updated by**: Claude Code

---

## Core Requirement

**Every voiceover must be synchronized to the exact scene it describes.**

When a video shows a scene, the voiceover narrator MUST be talking about that exact scene at that exact moment. No lag, no overlap, no mismatch.

---

## Implementation

### 1. Scene Timing Mapping

Before generating voiceovers, map each scene in your Remotion video to its exact timing:

```
Scene ID          | Frames    | Duration (30fps) | Content
------------------|-----------|------------------|------------------
scene_1_title     | 0-385     | 0-12.8s (~13s)   | Title/intro
scene_2_...       | 385-770   | 12.8-25.7s (~13s)| Content 2
scene_3_...       | 770-1155  | 25.7-38.5s (~13s)| Content 3
...               | ...       | ...              | ...
```

Get exact frame counts from `Sequence from={X} durationInFrames={Y}` in TSX files.

### 2. Voiceover Script Requirements

- **One voiceover script per scene**
- **Script content must match visual content exactly**
- **Script duration must not exceed scene duration by more than 0.5 seconds**
- **Scene transitions must be clean**: When moving from Scene A to Scene B, the voiceover must END before Scene B visual appears
- **No overlap**: If Scene B shows "Producer Mindset", the voiceover MUST start talking about Producer Mindset, not continuing from Consumer Mindset

Example (Scene 2: Consumer Mindset Definition, 13 second scene):

```
Scene Duration: 13 seconds max
Script: "The Consumer Mindset says: Tell me what to do. It needs detailed 
         instructions. It requires constant guidance. All decisions come from 
         outside. This is the default for many systems. They wait. They listen. 
         They execute only what they're told."
```

### 3. Generation Process

1. **Generate voiceover for each scene** using ElevenLabs API
2. **Check actual duration** after generation
3. **If duration exceeds target:**
   - Option A: Trim the audio to exact scene duration using ffmpeg
   - Option B: Regenerate with shorter, more concise text
4. **Never concatenate misaligned audio** - each voiceover MUST match its scene

### 4. Quality Validation

Before mixing audio with video, validate each scene:

```python
timing_check = await skill.validate_scene_timing(
    scene_id="scene_2",
    actual_duration=13.2
)

if not timing_check['matches']:
    print(f"⚠️ {timing_check['message']}")
    # Adjust before proceeding
```

---

## Scene Duration Standards

### Default Part 1 (90s total, 7 scenes)
- Scene 1: 13s (Title)
- Scene 2: 13s (Consumer Definition)
- Scene 3: 13s (Consumer Visual)
- Scene 4: 13s (Producer Definition)
- Scene 5: 13s (Producer Visual)
- Scene 6: 16s (Autonomy Concept)
- Scene 7: 10s (Conclusion)

**Total: 91s** (1s margin for audio codec timing)

### For Other Video Lengths
- 60s video: 7 scenes = 8-9s each
- 120s video: 8-10 scenes = 12-15s each
- Adjust based on visual complexity and narrative flow

---

## Voiceover Generation Script Template

```bash
#!/bin/bash

SCENES=(
  "scene_1|Title text for scene 1 matching visual"
  "scene_2|Definition text for scene 2 matching visual"
  # ... one per scene
)

for scene in "${SCENES[@]}"; do
  IFS='|' read -r id text <<< "$scene"
  target_duration=${TARGETS[$id]}
  
  # Generate
  curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
    -H "xi-api-key: $API_KEY" \
    -d "{\"text\": \"$text\"}" \
    -o "$id.mp3"
  
  # Validate timing
  actual=$(ffprobe -v error -show_entries format=duration ...)
  
  if [ "$actual" > "$target_duration" ]; then
    # Trim
    ffmpeg -i "$id.mp3" -to "$target_duration" -c copy "$id_trim.mp3"
    mv "$id_trim.mp3" "$id.mp3"
  fi
done
```

---

## Skills File Updates

The `voiceover_generation_skill.py` has been updated with:

1. **`DEFAULT_SCENE_DURATIONS` dict** - stores target duration for each scene
2. **`validate_scene_timing()` method** - checks actual vs target duration
3. **Documentation** - scene sync requirements

### Using in Skills

```python
from skills.voiceover_generation_skill import VoiceoverGenerationSkill

skill = VoiceoverGenerationSkill()

# Validate a scene
timing = await skill.validate_scene_timing("scene_2", actual_duration=13.1)
print(timing['message'])  # Scene 2: 13.10s vs 13s target ✅ MATCH

if not timing['matches']:
    raise ValueError(f"Scene timing mismatch: {timing}")
```

---

## Scene Transition Best Practice

**Real Example from Part 1:**

**Scene 3 (Consumer Visual)** - ENDS at exactly ~10 seconds:
```
VO: "Here's what that looks like. A human provides all direction. 
     Every command flows one way: from person to system."
[STOP - Do NOT continue with "The system has no independent thought..."]
```

**Scene 4 (Producer Definition)** - BEGINS at exactly the moment Scene 3 visual changes:
```
VO: "Now, the Producer Mindset is different. It says: Here's the goal. 
     Figure it out. Self-Directed..."
[STARTS IMMEDIATELY - No lag, no overlap with Consumer content]
```

**Result**: Perfect visual-audio sync. When Producer Mindset appears on screen, voiceover is ALREADY talking about Producer Mindset.

---

## Troubleshooting

### Problem: Voiceover is too long for scene
**Solution**: Rewrite script more concisely. Remove filler words, combine sentences.

**Before (18s):**  
"The Consumer Mindset says: Tell me what to do. It's characterized by three core traits: Step by Step—needing detailed instructions for every action. Dependency—constantly requiring guidance and validation..."

**After (13s):**  
"The Consumer Mindset says: Tell me what to do. It needs detailed instructions. It requires constant guidance. All decisions come from outside..."

### Problem: Voiceover is too short for scene
**Solution**: Add more content to fill the time. Expand on key concepts.

### Problem: Voiceover doesn't match visual content
**Solution**: STOP. Go back to storyboard. Rewrite script to match what's on screen.

---

## Checklist Before Final Render

- [ ] Each scene has 1:1 matching voiceover
- [ ] Voiceover content describes exact visual on screen
- [ ] Each voiceover duration ≤ scene duration + 0.5s
- [ ] All 7 scenes concatenated in order
- [ ] Audio mixed at correct timing with video
- [ ] Full video duration = sum of all scene durations
- [ ] Quality orchestrator passes validation
- [ ] Ready for delivery

---

## Reference

- **Voiceover Skill**: `skills/voiceover_generation_skill.py`
- **Render Script**: `render_with_voiceover.py`
- **Part 1 Script**: `video_scripts/autonomous_systems_part_1_voiceover_synced.md`
- **Quality Validation**: `agents/video_quality_orchestrator.py`

