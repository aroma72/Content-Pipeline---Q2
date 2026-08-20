---
title: Avatar Video Kit
type: kit-overview
last_verified: 2026-08-08
owner: aroma
---

# Avatar Video Kit

Everything needed to spin up a **new, standalone project** that makes exactly one kind of asset:
a **2D illustrated talking-avatar video** — a stylised character sitting and talking straight to
camera, with the mouth **truly lip-synced** to a generated voiceover, for ~$3–4 a minute.

This kit is self-contained. It does **not** depend on the Drawing Room explainer pipeline (Ali,
Taleemabad bumpers, Remotion, Puppeteer, Python — none of that is used here).

## What it produces
- A `<name>.mp4`, 1280×720 / 30 fps / H.264 (yuv420p) / AAC, ~50–60s, one continuous shot.
- A named character (any look you describe — glam, clean-girl, mascot, spokesperson) at a table/desk.
- Mouth lip-synced to a warm TTS voiceover; natural head/blink/hand motion; consistent background.

## The 4-step pipeline
```
script.js ──▶ generate-avatar.js ──▶ tts-avatar.js ──▶ generate-lipsync.js ──▶ assemble.js
  (edit)        1 still image           N voice chunks     N lip-synced clips     1 final MP4
              kie nano-banana-2         Gemini TTS          kie infinitalk         ffmpeg concat
```

## Read these in order
1. **[docs/SETUP-AND-PREREQUISITES.md](docs/SETUP-AND-PREREQUISITES.md)** — accounts, API keys, installs. Do this once.
2. **[docs/AVATAR-VIDEO-SPEC.md](docs/AVATAR-VIDEO-SPEC.md)** — the full spec: architecture, file-by-file, quality bar, gotchas.
3. **[docs/API-REFERENCE.md](docs/API-REFERENCE.md)** — exact model slugs, endpoints, request/response shapes, costs, limits.
4. **[SKILL.md](SKILL.md)** — the step-by-step operating skill (drop into `.claude/skills/creating-avatar-videos/` to make it a Claude Code skill).

## 60-second quickstart (after setup)
```bash
cp -r avatar-video-kit/templates my-avatar-video && cd my-avatar-video
npm i                                  # ffmpeg-static + ffprobe-static
# edit script.js: your avatarPrompt (the look) + your vo chunks (the words)
node generate-avatar.js --yes          # -> art/girl.png   (eyeball it)
node tts-avatar.js --yes               # -> audio/vo_*.wav + durations.json
node generate-lipsync.js --yes         # -> clips/*.mp4     (the paid step, ~$3/min)
node assemble.js                       # -> out/<name>.mp4  (verifies audio+duration)
```

## Cost per 1-minute video (approx)
| Item | Model | Cost |
|---|---|---|
| 1 still image | kie nano-banana-2 | ~$0.04 |
| ~5 voice chunks | Gemini TTS | ~$0.01 |
| ~55s lip-sync @ 720p | kie infinitalk | ~$3.30 |
| render/concat | local ffmpeg | $0.00 |
| **Total** | | **~$3.35** |

`--yes` (or `CONFIRM_SPEND=1`) is required on every paid step — nothing spends silently.
