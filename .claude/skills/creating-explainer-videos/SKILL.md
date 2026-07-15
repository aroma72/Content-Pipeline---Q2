---
name: creating-explainer-videos
description: Produce a branded, narrated explainer/lesson MP4 where every voiceover sentence has its own matching animated visual, for ~$0 render cost. Use when creating a lesson/explainer video from a written script. Stack: beats.js + Imagen art + Python cutout + Gemini TTS + Puppeteer/ffmpeg + brand bumpers.
type: skill
last_verified: 2026-07-09
owner: aroma
---

# creating-explainer-videos

Turns a written script into a **1920×1080 / 30 fps / H.264 (yuv420p) / AAC** MP4 wrapped in
branded intro + outro bumpers, where an illustrated character and animated infographics change in
sync with a single-take voiceover. Local render = **$0**; only art (~$0.04/img) and TTS (pennies)
cost anything, and both are gated behind a spend confirmation.

> **This is the default video pipeline for the project** (replaced Remotion + ElevenLabs).
> `templates/` here are the source of truth — copy them per video.

## When to use
- Any concept / lesson / explainer video for the Agentic AI Mastery course.
- Script must first pass the gate (`reviewing-explainer-scripts`) — only animate a READY script.
- Companion skills: `writing-explainer-scripts` (draft), `reviewing-explainer-scripts` (gate),
  `animation-motion-design` (cutout-puppet mechanics).

## Architecture — one source of truth: `beats.js`
One beat = one voiceover sentence + the visual played while it's spoken. Modes:

| mode | visual | when |
|---|---|---|
| `ali` | AI character, cutout-puppet animated, optional synced `overlay` infographic | narrative through-line |
| `scene` | full illustrated scene + Ken Burns + lower-third caption | story beats needing context (preferred) |
| `info` | CSS/SVG infographic that **evolves** through the sentence | numbers / lists / diagrams |

Pipeline: `beats.js` → `generate-lesson-art.js` (Imagen) → `segment-all.py` (cutout+plate+anchors)
→ `tts-lesson.js` (VO + `durations.json`) → `animation/lesson.html` (seekable timeline) →
`compile-lesson.js` (bare MP4) → `stitch-brand.js` (wrap in bumpers → `_final.mp4`).

## Setup (once per repo)
1. `GEMINI_API_KEY` (or this repo's `GOOGLE_STUDIO_API_KEY`) in a `.env` at a parent folder.
2. Set up `explainer-videos/brand-intro-outro/` once (brand font, logo, palette, outro line).
3. Node 18+, Python 3.9+ with Pillow+numpy (`pip install pillow numpy`), ffmpeg via `ffmpeg-static`.

## Per-video workflow (run from inside the video folder)
| # | command | produces / checks |
|---|---|---|
| 0 | gate the script (`reviewing-explainer-scripts`) | READY before any art/TTS/render |
| 1 | `npm i` · ensure Python has Pillow+numpy · `.env` key present | env ready |
| 2 | write `beats.js` (one beat/sentence; pick mode; overlays on ali beats that name things) | script as data |
| 3 | `node generate-lesson-art.js --yes` | `art/*.png` — eyeball each; regenerate any that won't cut clean |
| 4 | `python segment-all.py` | `layers/<id>/{boy,plate}.png`+anchors — verify **tight** bboxes |
| 5 | `node tts-lesson.js --yes` | `audio/vo_<id>.wav` + `durations.json` (one-take normalized) |
| 6 | `SAMPLE_IDS=03,05 node compile-lesson.js --sample` | early/mid/late frames per beat — confirm motion |
| 7 | `node compile-lesson.js` | `out/<name>.mp4` — the **bare** lesson (NOT the deliverable) |
| 8 | `node stitch-brand.js --title "<Title>" --lesson out/<name>.mp4 --out out/<name>_final.mp4` | **the deliverable** |
| 9 | `node verify.js` | acceptance checklist (Section 11 of the spec) |

`--yes` (or `CONFIRM_SPEND=1`) is required on steps 3 and 5 — the cost guard blocks paid calls otherwise.

## Quality bar — measure EVERY video against this (see memory: explainer-video-quality-standard)
Established on the Change Management video. A miss is a FAIL to fix, not ship:
1. Protagonist **always named "Ali"** — one invented protagonist, in depth, for any example.
2. **Warm human voice** (Aoede, conversational, temp ~0.85) — never robotic.
3. **Breathing pauses** — trim each clip's dead-air, then add ~0.4s after a sentence / ~0.7s at a visual change.
4. **Consistent flat-illustration visuals** — never mix photoreal with illustration; same Ali throughout.
5. **No baked-in text in images** (prompts forbid text/letters/numbers; blank props); teaching text is crisp HTML.
6. **Cutouts never cut an object halfway** — whole object or none; 2-person/complex beats use `scene`, not `ali`.
7. **Movement in every beat** — push-in / parallax / Ken Burns + evolving infographics; no dead-still holds.
8. **Taleemabad bumpers** intro+outro (logo+wordmark, intro title, no outro sign-off unless asked).
9. **Subtle calm music** (School-of-Life vibe) starts at the logo, ducks under VO; prefer `brand/music.mp3`.

## Non-negotiable LAWS (each fixed a shipped defect — do not drop any)
1. **Always ship wrapped in the brand bumpers.** Deliverable is `<name>_final.mp4`, never the bare
   render. Intro title comes from `--title`. No CSS/beat title cards (no double-titling).
2. **One warm, human, one-take voice.** `tts-lesson.js` pins: voice `Aoede`, one conversational style
   directive, temp ~0.85, tempo-to-median (`atempo` ±10%), loudnorm EBU R128, silence trimmed, then a
   deliberate breathing pause per beat (0.4s / 0.7s at visual change). Human, never robotic or rushed.
3. **Force a fresh render.** `compile-lesson.js` wipes frames unless `--reuse`; when in doubt
   `rm -rf frames/<dir>` first. (A stale-frame cache once made edits silently not appear.)
4. **Clean-hero art or the cutout fails.** Character centered, standing, plain cream bg; props float
   detached; no desk/scenery/ground/shadow; no dark/navy fill. A full-image bbox = merged = bad art.
5. **Never cut an object halfway (lasso rule).** The cutout includes a WHOLE object or none. `ali`
   (cutout) beats must be a SINGLE subject; any beat with a second person/complex composition uses
   `scene` (no cutout) so nothing is sliced at the frame edge.
6. **Consistent illustration + no baked text.** ALL beats flat 2D vector illustration (never photoreal);
   same Ali throughout; art prompts forbid text/letters/numbers (blank props). Teaching text is HTML.
7. **Scene + plain + real data + progressive.** Prefer `scene` over floating characters; plain short
   narration (read aloud); real values on screen; one persistent visual that BUILDS; one concept/video.
   Follows `.claude/standards/SCRIPTING_STANDARDS.md` (single protagonist Ali, in depth).
8. **Movement in every beat.** Visible motion always — push-in / parallax / Ken Burns on art; infographics
   evolve (`.seq` reveals across the beat, a late `.io-late` change, continuous gentle drift). No dead-still.
9. **Subtle calm music from the logo.** `stitch-brand.js` lays a soft contemplative bed over the whole
   video (starts at the intro logo), ducked under narration. Prefer `brand/music.mp3`; else `make-music.js`.
10. **Everything deterministic / seekable.** `window.seekTo(ms)` recomputes every visual from time.

## Cost & policy
- **No paid AI video (Veo rejected)** — motion comes from cutout-puppet animation, not video models.
- Imagen + Gemini TTS calls are **gated**: nothing spends without `--yes`/`CONFIRM_SPEND=1`
  (honors the project's ask-before-API-calls rule).

## Gotchas
See the adoption spec in `explainer-videos/EXPLAINER-VIDEO-PIPELINE-SPEC.md` §10 (segmentation on dark
bg, stale frames, TTS duration from real WAV, `clips == beats` assertion, transient TTS 500s).

## Files (templates/)
`beats.js` · `generate-lesson-art.js` · `segment-all.py` · `tts-lesson.js` · `music.js` ·
`mix-audio.js` · `compile-lesson.js` · `stitch-brand.js` · `verify.js` · `lib/config.js` ·
`animation/{lesson.html,info.js,info.css,mckinsey.css}` · `package.json`.
