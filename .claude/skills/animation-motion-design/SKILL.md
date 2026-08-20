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

## True motion (i2v) on story-critical beats — REQUIRED where it helps (effective 2026-08-17)
Cutout-puppet + Ken Burns is the free default on **every** beat. On top of that, **always add real
image-to-video (i2v) motion to the beats where movement genuinely carries the story** — the emotional
turns, a key scene/metaphor coming alive, the closing invite. Not every beat (cost + it can distract);
the 2–4 per video where a still-with-pan undersells the moment.

- **Generate:** `ART_IDS=<the story beats> node generate-lesson-video-omni.js --yes` → `clips/<id>.mp4`
  via kie.ai i2v (`wan/2-6-image-to-video`, ~$0.05/s ≈ ~$0.25–0.30 per beat). Uses the `omniKey`
  (GEMINI_OMNI_API_KEY / KIE_API_KEY). Per-beat motion from the `MOTION` map, else a calm in-character
  idle (breathe/blink/shift). **Paid + kie-credit-gated → confirm spend first; ask before the call.**
- ⚠️ **RETUNE the `MOTION` map for every new video, before you spend.** The map is keyed by beat id
  (`'07': '…'`), and beat ids repeat across videos — so a copied folder will silently animate the
  *previous* video's story (a self-healing beat animated as "the young man tastes a slice of mango").
  It fails silently: the call succeeds, the clip looks fine in isolation, and the mismatch only shows
  in the finished render. Rewrite every entry to describe THIS video's beat, then generate.
- **Consume:** `compile-lesson.js` auto-uses any `clips/<id>.mp4`; a beat with no clip falls back to
  cutout-puppet/Ken Burns. So if kie credits are out, clips just don't generate and the render still
  succeeds (no animation on those beats) — verify which beats actually got a clip.
- **Pick beats by story value:** normalize/reassure emotional beats, the metaphor "coming alive"
  scene, the final "your turn" invite. Keep motion small and in-character (flat 2D, camera locked,
  no style change) so it matches the illustration.
- This is a house rule now (see memory `feedback_use_animations`). Author `beats.js` with an
  `module.exports.animateIds = [...]` list documenting the chosen story beats, and generate those.

## Verify motion, not a still
`SAMPLE_IDS=03,05 node compile-lesson.js --sample` writes early/mid/late frames **within** each beat.
Confirm the visual actually changes across them before a full render.
