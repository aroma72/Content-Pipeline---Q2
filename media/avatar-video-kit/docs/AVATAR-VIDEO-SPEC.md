---
title: Avatar Video Specification
type: reference
last_verified: 2026-08-08
owner: aroma
---

# Avatar Video Specification

The complete technical spec for a **2D lip-synced talking-avatar video**. If you build to this doc,
you get the same result as the `fashion-tech-avatar` videos.

## 1. Output contract (the deliverable)
| Property | Value |
|---|---|
| Container | MP4 (`+faststart`) |
| Resolution | 1280×720 (16:9) |
| Frame rate | 30 fps |
| Video codec | H.264 / yuv420p / CRF 18 |
| Audio codec | AAC 192 kbps, 48 kHz stereo |
| Length | ~50–60s (function of the script) |
| Composition | one continuous shot — same character, framing, background throughout |

`assemble.js` **verifies** every render has both a video and an audio stream and prints the duration;
it exits non-zero if either stream is missing.

## 2. Architecture — one source of truth: `script.js`
`script.js` holds **two** things and nothing else needs editing for a new video:
1. `module.exports` = an array of **chunks** `{ id, vo }` — each `vo` is a slice of narration that must
   be **≤ ~14.5s spoken** (the infinitalk cap). ~28–32 words ≈ 10–12s is the sweet spot.
2. `avatarPrompt` + `background` = the **look** of the character and the scene (fed to the image model).
   A matching `MOTION_PROMPT` lives in `generate-lipsync.js` (style-lock for the animation).

## 3. Pipeline stages (each = one script)
| # | Script | Reads | Writes | Paid? |
|---|---|---|---|---|
| 1 | `generate-avatar.js` | `script.avatarPrompt` | `art/girl.png` | kie image (~$0.04) |
| 2 | `tts-avatar.js` | `script[].vo` | `audio/vo_<id>.wav` + `durations.json` | Gemini TTS (pennies) |
| 3 | `generate-lipsync.js` | `art/girl.png` + `audio/*` | `clips/<id>.mp4` | kie infinitalk (~$3/min) |
| 4 | `assemble.js` | `clips/*` | `out/<name>.mp4` | free (ffmpeg) |

Why per-chunk clips then concat: infinitalk caps audio at ~15s/call, so each chunk is lip-synced
separately from the **same** still and joined. Because every chunk starts from the identical still,
the joins read as one continuous shot.

## 4. Quality bar — measure every video against this
1. **Character look is intentional and consistent** — one `avatarPrompt`, one still, reused for all chunks.
2. **Front-facing, clear face, mouth closed-neutral in the still** — the lip-sync model needs a clean face to drive.
3. **Warm human voice** — Gemini `Aoede`, one style directive, temp ~0.85, loudness-normalized. Never robotic.
4. **True lip-sync** — mouth moves with the words (not just a panned still). Verify on playback.
5. **No baked-in text in the art** — prompts forbid text/letters/numbers/watermark; any on-screen text is added later as an overlay, not generated.
6. **Fills the frame, consistent framing** — assembler crops-to-fill 1280×720 (no letterbox bars, no clip that "goes short").
7. **Motion in every beat** — natural blink / head tilt / hand gesture from the motion prompt.
8. **One continuous shot** — same background + framing across all chunks.

## 5. Editing for a new video — the only two things you touch
```js
// script.js
module.exports = [
  { id: '01', vo: "First ≤14.5s of narration…" },
  { id: '02', vo: "Next ≤14.5s…" },
  // …as many chunks as the script needs
];
module.exports.avatarPrompt = 'A <describe the character, outfit, pose, seated at a table, front-facing, clear face, mouth closed>, <2D illustration style>';
module.exports.background   = ' Behind them, <describe the scene, softly blurred>. No text, no letters, no watermark.';
```
Then in `generate-lipsync.js`, keep `MOTION_PROMPT` consistent with the look (character + style-lock + "static locked camera, no text").

## 6. Knobs (env vars)
| Env | Default | Use |
|---|---|---|
| `RESOLUTION` | `720p` | `480p` for a cheaper/faster run or to dodge a 720p server timeout on one chunk |
| `LIPSYNC_DEADLINE_MIN` | `15` | raise to `25`–`30` when kie is congested |
| `CHUNK_IDS` | (all) | e.g. `03,05` to (re)render only some chunks |
| `TTS_VOICE` | `Aoede` | any Gemini prebuilt voice |
| `OMNI_MODEL` / `LIPSYNC_MODEL` | `nano-banana-2` / `infinitalk/from-audio` | swap models |
| `CONFIRM_SPEND` | (unset) | `1` = approve paid calls without `--yes` |

## 7. Gotchas (each one bit us — don't rediscover them)
- **Still with an open/smiling mouth** lip-syncs worse — ask for "mouth closed, soft neutral expression".
- **≤14.5s per chunk** — `tts-avatar.js` asserts this and exits non-zero if a chunk is too long; shorten that `vo` line.
- **kie congestion** at night → use `LIPSYNC_DEADLINE_MIN=25` and expect the occasional single-chunk retry; fall back to `RESOLUTION=480p` on a stubborn chunk (see [API-REFERENCE](API-REFERENCE.md) §3).
- **Uploads go to `kieai.redpandaai.co`**, not `api.kie.ai`.
- **Reuse audio across re-renders** — if only the *look* changes, keep `audio/` + `durations.json` and just re-do the still + clips (identical voice, saves TTS + keeps timing).
- **Letterbox bars / a clip that "goes short"** = mismatched clip aspect. Fixed by the assembler's crop-to-fill; don't switch it back to pad.

## 8. Not in scope (deliberately)
No brand bumpers, no background music, no captions, no Python, no Remotion. Those can be layered on
afterward with ffmpeg if a specific brief needs them, but the core kit stays lean.
