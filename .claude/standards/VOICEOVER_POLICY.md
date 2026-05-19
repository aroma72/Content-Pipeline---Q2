---
type: standards
last_verified: 2026-05-19
owner: aroma
---

# Voiceover Policy

Rules and workflows for voiceover generation, extraction, and synchronization.

## Core Rules (Never Break)

🚫 **Never use ElevenLabs without explicit permission**
- Claude must receive direct user authorization before any ElevenLabs API call
- Flag in code: `--permission-granted` required
- Default: Render silent videos and skip VO generation

🚫 **Never regenerate voiceover**
- Extract from existing videos instead
- Edit visuals to match existing audio, not the reverse
- Prevents desync and saves 44% of credits

---

## VO Extraction Workflow

### Step 1: Extract Audio from Final Video

Use ffmpeg to extract AAC audio from existing MP4:

```bash
ffmpeg -i input.mp4 -vn -acodec aac -y output.aac
```

**Flags:**
- `-vn` — No video (audio only)
- `-acodec aac` — Output AAC codec
- `-y` — Overwrite without prompt

**Example:**
```bash
ffmpeg -i drawing-room-remotion/output/autonomous_session_part1_silent.mp4 \
  -vn -acodec aac -y video_production/voiceovers/part_1_vo.aac
```

### Step 2: Validate Audio Duration

```bash
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 part_1_vo.aac
```

**Record duration for frame count calculation:**
- Frame count = duration_seconds × 30fps

### Step 3: Synchronize Visuals to Audio

If audio duration differs from visual composition:
- **Option A (Preferred):** Trim silent video to match audio duration
  - Adjust Root.tsx `durationInFrames` to match VO duration
  - Trim trailing blank slides in Sequence allocations
- **Option B (Last Resort):** Extend composition with filler slides
  - Only if VO is longer than composition
  - Add blank scenes at end, never regenerate VO

### Step 4: Mux Audio with Video

Combine silent MP4 + extracted AAC into final video:

```bash
ffmpeg -i silent_video.mp4 -i audio.aac \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y final.mp4
```

**Flags:**
- `-c:v copy` — Copy video codec (no re-encoding)
- `-c:a aac` — Output audio as AAC
- `-map 0:v:0` — Use video stream 0 from input 0
- `-map 1:a:0` — Use audio stream 0 from input 1
- `-y` — Overwrite without prompt

**Example:**
```bash
ffmpeg -i video_production/autonomous_part1_silent.mp4 \
  -i video_production/voiceovers/part_1_vo.aac \
  -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y \
  updated/autonomous_part1_final.mp4
```

---

## ElevenLabs Policy (If Explicitly Permitted)

### When Permitted Use Cases

✅ **Allowed only with explicit user approval:**
1. User says: "Generate voiceover for [video]"
2. User approves: "Use ElevenLabs for this"
3. Implementation includes: `--permission-granted` flag in code

### API Call Pattern

```python
import anthropic

client = anthropic.Anthropic()

# Only call if user explicitly approved
if permission_granted:
    # Generate VO via Claude + ElevenLabs integration
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"Generate voiceover script for: {video_content}"
        }]
    )
```

### Permission Validation

- [ ] User explicitly said "use ElevenLabs" or "generate voiceover"
- [ ] Code includes `--permission-granted` flag or environment variable
- [ ] Log records timestamp and user authorization
- [ ] No ElevenLabs calls on default silent video workflow

---

## Credit Optimization

### Extraction vs Regeneration Cost

| Scenario | Cost | Time | Quality |
|---|---|---|---|
| Extract existing VO | $0 | 2 min | ✅ Perfect (original) |
| Regenerate VO (ElevenLabs) | $0.30/min | 5-10 min | ⚠️ May desync |
| Regenerate + re-sync visuals | $0.30/min + labor | 30+ min | ⚠️ High risk |

**44% credit savings:** Extract from final video instead of regenerate.

### Approved Workflows

**Silent Video (Default):**
```
TSX Composition → Render Silent MP4 → Extract VO (if exists) → Mux → Publish
Cost: $0 (labor only)
```

**With ElevenLabs (Explicit Permission Only):**
```
Script → ElevenLabs Generate VO → Create Remotion Composition → Render → Mux → Publish
Cost: $0.30/min audio + labor
Precondition: User approval + --permission-granted flag
```

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| VO duration doesn't match video | Extraction incomplete or wrong file | Verify ffprobe duration; re-extract if needed |
| Audio sync off by frames | Composition frames ≠ VO frames × 30 | Recalculate durationInFrames using formula |
| ffmpeg mux fails | Wrong codec or stream mapping | Verify input streams with ffprobe; check flags |
| Permission denied error | ElevenLabs without explicit approval | Check for --permission-granted flag; ask user first |

---

## Checklist: Before Publishing

- [ ] VO extracted successfully (ffprobe confirms duration)
- [ ] Frame count = VO_duration_seconds × 30fps
- [ ] Audio mux successful (ffmpeg no errors)
- [ ] Final video plays audio correctly (spot check 2-3 sections)
- [ ] No blank slides extending beyond audio
- [ ] Video saved to `updated/` folder (not video_production/)

---

*Last verified: 2026-05-19*
