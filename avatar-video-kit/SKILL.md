---
name: creating-avatar-videos
description: Produce a 2D illustrated talking-avatar video where a stylised character sits and talks straight to camera with the mouth truly lip-synced to a generated voiceover, ~$3-4/min. Use when creating a talking-head / spokesperson / influencer-style avatar clip from a short script. Stack: kie nano-banana-2 still + Gemini TTS + kie infinitalk lip-sync + ffmpeg concat. NOT the explainer/Ali pipeline.
type: skill
last_verified: 2026-08-08
owner: aroma
---

# creating-avatar-videos

Turns a short script + a described character into a **1280×720 / 30 fps / H.264 / AAC** MP4 of a
2D character talking straight to camera, mouth **lip-synced** to a warm TTS voice. One continuous shot.
Local render = $0; only the still (~$0.04), TTS (pennies) and lip-sync (~$3/min @720p) cost anything,
all gated behind a spend confirmation.

> Standalone kit — does NOT use the Drawing Room explainer pipeline (no Ali rule, no Taleemabad
> bumpers, no Remotion/Puppeteer/Python). `templates/` here are the source of truth — copy per video.

## When to use
- A talking-head, spokesperson, presenter, influencer, or mascot video from a short (~1 min) script.
- The character can be **any** look you describe (this is the key difference from the Ali explainer skill).

## When NOT to use
- Concept/lesson videos for the course → use `creating-explainer-videos` (Ali, bumpers, infographics).
- Anything needing on-screen teaching text/diagrams synced to narration → that's the explainer pipeline.

## Architecture — one source of truth: `script.js`
- An array of chunks `{ id, vo }`; each `vo` ≤ ~14.5s spoken (~28–32 words) — the infinitalk cap.
- `avatarPrompt` + `background` = the look; a matching `MOTION_PROMPT` in `generate-lipsync.js`.

Pipeline: `script.js` → `generate-avatar.js` (kie image) → `tts-avatar.js` (Gemini TTS + durations.json)
→ `generate-lipsync.js` (kie infinitalk, one clip/chunk) → `assemble.js` (crop-to-fill concat → final MP4).

## Per-video workflow (run from inside the copied folder)
| # | command | produces / checks |
|---|---|---|
| 0 | `cp -r <kit>/templates my-video && cd my-video && npm i` | project ready; `.env` reachable (this or a parent folder) |
| 1 | edit `script.js` — chunks (≤14.5s each) + `avatarPrompt`/`background`; keep `MOTION_PROMPT` in sync | script as data |
| 2 | `node generate-avatar.js --yes` | `art/girl.png` — **eyeball it**: front-facing, clear face, mouth closed, no text |
| 3 | `node tts-avatar.js --yes` | `audio/vo_<id>.wav` + `durations.json`; fails loudly if any chunk >14.5s |
| 4 | `node generate-lipsync.js --yes` | `clips/<id>.mp4` (one per chunk) — the paid step (~$3/min) |
| 5 | `node assemble.js` | `out/<name>.mp4` — verifies audio+video+duration |

`--yes` (or `CONFIRM_SPEND=1`) is required on steps 2–4; the cost guard blocks paid calls otherwise.

## Quality bar — measure EVERY video against this
1. Intentional, consistent character (one `avatarPrompt`, one still, reused for all chunks).
2. Still is front-facing with a clear face and **mouth closed-neutral** (drives cleaner lip-sync).
3. Warm human voice (`Aoede`, one style directive, temp ~0.85, loudness-normalized) — never robotic.
4. **True lip-sync** — mouth moves with the words; verify on playback, not just a still.
5. No baked-in text in the art (prompts forbid text/letters/numbers/watermark).
6. Fills the frame, consistent framing throughout — no letterbox, no clip that "goes short".
7. Visible natural motion (blink / head tilt / hand gesture) in every beat.
8. One continuous shot — same background + framing across all chunks.

## Non-negotiable LAWS (each fixed a real defect)
1. **Chunk the audio ≤14.5s.** infinitalk caps ~15s/call; lip-sync each chunk from the SAME still, then concat.
2. **One warm, one-take voice.** `tts-avatar.js` pins voice + style directive + temp + loudnorm; don't regenerate per-take.
3. **Clean driver still.** Front-facing, clear face, mouth closed; a busy/side/open-mouth face degrades sync.
4. **No baked text.** Any on-screen text is added later with ffmpeg, never generated into the art.
5. **Crop-to-fill on concat.** Assembler scales cover + crops to 1280×720 so mismatched clip aspects never letterbox.
6. **Resilient lip-sync polling.** Tolerate transient poll/download blips; `LIPSYNC_DEADLINE_MIN` for slow kie; per-chunk `CHUNK_IDS=` retries; `RESOLUTION=480p` fallback for a chunk that keeps hitting a 720p server timeout.
7. **Reuse audio when only the look changes.** Keep `audio/` + `durations.json`; re-do just the still + clips.
8. **Always verify.** `assemble.js` must report `video yes · audio yes` and a sane duration before you call it done.

## Cost & policy
- Only kie.ai (image + lip-sync) and Google Gemini (TTS) are used. No ElevenLabs, no Veo.
- Nothing spends without `--yes`/`CONFIRM_SPEND=1`.

## Files (templates/)
`script.js` · `generate-avatar.js` · `tts-avatar.js` · `generate-lipsync.js` · `assemble.js` ·
`lib/config.js` · `package.json` · `.env.example`

## Reference docs
`docs/SETUP-AND-PREREQUISITES.md` · `docs/AVATAR-VIDEO-SPEC.md` · `docs/API-REFERENCE.md`
