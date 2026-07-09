---
name: animation-motion-design
description: Cutout-puppet + infographic motion mechanics for the explainer pipeline — clean-hero art, segmentation, sway/breathe/push-in, and evolving infographics. Use when authoring beats.js art prompts, tuning animation/lesson.html, or debugging cutouts.
type: skill
last_verified: 2026-07-09
owner: aroma
---

# animation-motion-design

How motion is produced without paid AI video. Real character motion = **cutout-puppet**: segment the
flat PNG, then sway/breathe the cutout over an inpainted plate with a slow camera push-in.

## Clean-hero art (Law 4 — the cutout depends on it)
Prompt for: single subject **centered, standing**, on **plain flat cream** (#F5F1E8) filling the frame;
props **float detached** (never touching); **no** desk/scenery/ground/shadow; **no** dark/navy fill.
`generate-lesson-art.js` appends a hard clean-hero suffix as backstop. If a still won't cut clean,
regenerate it (`ART_IDS=03 node generate-lesson-art.js --yes`) — don't fight a bad plate.

## Segmentation (`segment-all.py`)
Foreground = NOT near-white/cream (brightness + low-saturation test). Keep the **largest connected
component** (seed the biggest blob, not the centre pixel). Erode ~1px then feather to kill halos.
A **full-image bbox = merged background** → the art is too dark/busy; regenerate. Outputs
`layers/<id>/{boy,plate}.png` + `anchors.json` (bbox/head/feet/center pivots).

## Puppet motion (`animation/lesson.html`)
- **sway** ±0.6° rotation, origin bottom-center; **breathe** scale ±0.6%; **camera push-in** on the
  layer (scale 1.02→1.06 across the beat). Scenes get **Ken Burns** (scale 1.05→1.15 + slight pan) +
  lower-third caption card.
- **Continuous gentle drift** so nothing is ever dead-still (Law 6).

## Infographics must EVOLVE (Law 6)
Templates live in `animation/info.js` (+ `info.css`). Use `.seq` for staggered reveals across the beat,
`.io-late` for a late state-change, `data-tick` for count-up numbers. Never a static hold; never a new
busy composition each beat — one persistent visual that BUILDS (progressive disclosure).

## Determinism (Law 7)
Everything is driven by `window.seekTo(ms)` recomputing visual state from time — so frame-stepping is
exact and edits are reproducible. Never animate via wall-clock timers.

## Verify motion, not a still
`SAMPLE_IDS=03,05 node compile-lesson.js --sample` writes early/mid/late frames **within** each beat.
Confirm the visual actually changes across them before a full render.
