# Explainer / Lesson Video Pipeline — Adoption Spec

> Canonical spec provided by Aroma (2026-07-09) and implemented in this repo. The working code lives
> in the `creating-explainer-videos` skill (`.claude/skills/creating-explainer-videos/templates/`)
> plus `explainer-videos/brand-intro-outro/`. This file is the reference for the *why* and the LAWS.

A portable spec for the **line-synced explainer-video pipeline**: from a written script to a branded,
narrated MP4 where **every voiceover sentence has its own matching, animated visual** — for ~$0 render.

**What this produces:** a 1920×1080 / 30 fps / H.264 (yuv420p) / AAC MP4, wrapped in branded intro +
outro bumpers, where an illustrated character and animated infographics change in sync with a
single-take voiceover. Typical length ~1.5–2.5 min (~24 beats).

---

## 1. Cost & constraints
| Item | Cost | Notes |
|---|---|---|
| AI illustration (Imagen 4.0 Ultra) | ~$0.04 / image | ~10–20 images per video |
| Voiceover (Gemini TTS) | pennies | one clip per beat |
| Frame render + encode (Puppeteer + ffmpeg) | **$0** | fully local |
| AI video (Veo etc.) | **rejected** | $10–50+ with re-rolls; do NOT use |

**Hard rule: no paid AI video.** Real character motion comes from **cutout-puppet** animation
(segment the flat PNG → sway/breathe over an inpainted plate + camera push-in), not Veo.

## 2. Prerequisites
- Node 18+ (Puppeteer 25). This repo: Node v24.
- npm per video: `puppeteer@^25`, `ffmpeg-static@^5.3`, `lottie-web@^5.13` (optional).
- Python 3.9+ with **Pillow** and **numpy** (`pip install pillow numpy`) — for `segment-all.py`.
- ffmpeg via `ffmpeg-static`. Headless Chrome auto-downloaded by puppeteer.
- API key: `GEMINI_API_KEY` for Imagen + Gemini TTS. **This repo maps `GOOGLE_STUDIO_API_KEY`**
  automatically (see `templates/lib/config.js`).
- Disk: a single video's `frames/` dump is multiple GB; finished MP4 is a few MB.

Models: art `imagen-4.0-ultra-generate-001`; voice `gemini-2.5-flash-preview-tts`.

## 3. Architecture — single source of truth is `beats.js`
One beat = one voiceover sentence + the visual that plays while it's spoken.
`beats.js` → `generate-lesson-art.js` → `segment-all.py` → `tts-lesson.js` →
`animation/lesson.html` → `compile-lesson.js` (bare MP4) → `stitch-brand.js` → `out/<name>_final.mp4`.

Beat modes: `ali` (cutout-puppet character + optional overlay) · `scene` (full scene + Ken Burns +
caption, preferred for story) · `info` (evolving CSS/SVG infographic). **No title-card beats.**

## 4. Files
Per-video (copy `templates/`): `beats.js`, `generate-lesson-art.js`, `segment-all.py`,
`tts-lesson.js`, `animation/{lesson.html,info.js,info.css,mckinsey.css}`, `music.js`, `mix-audio.js`,
`compile-lesson.js`, `stitch-brand.js`, `verify.js`, `lib/config.js`, `package.json`.
Generated (git-ignored): `art/ layers/ audio/ frames/ out/ preview-lesson/`.
Shared once per repo: `brand-intro-outro/` (bumpers).

## 5. Adoption steps
1. Install the skills (`creating-explainer-videos` + companions) — done in this repo.
2. Set `GEMINI_API_KEY` (or `GOOGLE_STUDIO_API_KEY`) in a `.env` at a parent of the video folders.
3. Set up `explainer-videos/brand-intro-outro/` once (brand font, logo, palette, outro line). `npm i`.
4. Per video: make a folder, copy `templates/`, `npm i`, then Section 6.

Layout:
```
explainer-videos/
  brand-intro-outro/            # shared bumpers — set up once
  <series>/<video-name>/        # one folder per video (copied from templates/)
    beats.js  animation/ ...  art/ layers/ audio/ frames/ out/  (generated, ignored)
```

## 6. Per-video workflow (8 steps)
0. Gate the script (`reviewing-explainer-scripts` / `explainer-script-gatekeeper`) → only animate READY.
1. `npm i` · Python has Pillow+numpy · `.env` key present.
2. Write `beats.js` (one beat/sentence; pick mode; overlays on ali beats that name things).
3. `node generate-lesson-art.js --yes` → `art/*.png` (eyeball each).
4. `python segment-all.py` → `layers/<id>/{boy,plate}.png` + anchors (verify **tight** bboxes).
5. `node tts-lesson.js --yes` → `audio/vo_<id>.wav` + `durations.json`.
6. `SAMPLE_IDS=03,05 node compile-lesson.js --sample` → early/mid/late frames (confirm motion).
7. `node compile-lesson.js` → `out/<name>.mp4` (bare; NOT the deliverable).
8. `node stitch-brand.js --title "<Title>" --lesson out/<name>.mp4 --out out/<name>_final.mp4` → deliverable.
9. `node verify.js` → acceptance checks.

## 7. Non-negotiable LAWS
1. Always ship wrapped in the brand bumpers; deliverable is `<name>_final.mp4`. No CSS title cards.
2. One voice, one take — pin all five in `tts-lesson.js` (voice, style directive, temp ~0.7,
   tempo-to-median `atempo` ±10%, loudnorm EBU R128).
3. Force a fresh render — `compile-lesson.js` wipes frames unless `--reuse`.
4. Clean-hero art or the cutout fails — plain cream bg, detached props, no ground/shadow/dark fill.
5. Scene + plain + real data + progressive — scenes over floating characters; plain short narration;
   real on-screen values; one persistent visual that builds; one concept per video; single protagonist.
6. Infographics must evolve, not hold — `.seq` reveals, a late `.io-late` change, continuous drift.
7. Everything deterministic / seekable — `window.seekTo(ms)`; text count-ups via `data-tick`.

## 8. Brand customization (once, in `brand-intro-outro/`)
Intro title per lesson via `--title`. Outro sign-off, brand font, logo, palette in `config.js` +
`brand/`. **Render invariants:** all bumpers AND lessons render at 1920×1080 / 30 fps / yuv420p /
AAC 48k so the concat re-encodes cleanly. Character art generated ~1408×768, scaled to cover 1080p.

## 9. `.gitignore` — commit source, never artifacts
Ignore `art/ layers/ audio/ frames/ out/ preview*/ *.mp4 *.wav *.mp3`. Commit code, `beats.js`,
brand assets. Finished deliverables go to Releases / a bucket, not Git.

## 10. Gotchas checklist
- **Segmentation** drops white/cream bg → **breaks on dark backgrounds**; force plain cream, seed the
  largest connected component (not the centre pixel), erode ~1px before feathering.
- **Stale frames**: if an edit "does nothing", `rm -rf frames/<dir>` and re-render the full MP4.
- **TTS duration**: measure from the real WAV (walk RIFF chunks), never a fixed header offset.
- **Audio matches script**: `audio/vo_<id>.txt` sidecar per line; regenerate on change; prune deleted;
  assert `clips == beats` and each sidecar == the beat's `vo` (avoids OLD VO under new visuals).
- **Transient TTS 500s**: retry ~3× before a silence fallback.
- **Standalone template preview**: `.seq`/`.io` start at opacity 0 — advance via `seekTo`, not by
  forcing opacity, or the card looks blank.

## 11. Acceptance / verification
- Script passed the gate (READY) before any art/TTS/render.
- `ffmpeg -i out/<name>_final.mp4` shows 1920×1080, 30 fps, h264/yuv420p, AAC.
- Opens on branded intro (with title), ends on branded outro — not a hard cut.
- Voiceover is one continuous take (scrub 3–4 beats; pace/tone/loudness indistinguishable).
- Each beat's visual matches its sentence and **changes within the beat** (early/mid/late frames).
- Cutouts have no ghost limbs / halos; scenes have depth + caption.
- `clips == beats` and every sidecar equals its beat's `vo`.

## 12. Quick command reference
```bash
cp -r .claude/skills/creating-explainer-videos/templates explainer-videos/<series>/<video>
cd explainer-videos/<series>/<video> && npm i
node generate-lesson-art.js --yes
python segment-all.py
node tts-lesson.js --yes
SAMPLE_IDS=01,05 node compile-lesson.js --sample
rm -rf frames/lesson && node compile-lesson.js
node stitch-brand.js --title "My Lesson" --lesson out/lesson.mp4 --out out/lesson_final.mp4
node verify.js
```

*Adapted to this repo: Gemini TTS, `GOOGLE_STUDIO_API_KEY`, cost-guarded paid calls (ask before spend).*
