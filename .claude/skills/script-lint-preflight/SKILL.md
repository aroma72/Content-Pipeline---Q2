---
name: script-lint-preflight
description: Applies the six content-lint rules and the free pre-spend sensors to an explainer script that already exists, so the gate does not reject it later and burn redrafts. Use to check or lint a draft beats.js or lesson script, before running the script gate, and before any paid art or TTS stage. Also use when a gate came back NEEDS WORK, when a run is stuck in a redraft loop, or when a rendered beat turned out blank or wordless. NOT for producing a script from scratch - that is writing-explainer-scripts.
type: skill
last_verified: 2026-09-23
owner: aroma
---

# Script lint preflight

Twenty-four of thirty-three content-lint verdicts in `.beads/content_feedback.jsonl` are failures,
and six of those are full sweeps — *"7 violation(s): rules 1, 2, 3, 4, 5, 6"* — the same script
regenerated and failing every rule again. Meanwhile the script gate says *"Spine is sound"* and
fails on something downstream of the spine, so a redraft that only fixes the story does not help.

Run this **while drafting**. Every check here is free and happens before any money moves.

## Part A — the six rules, by number

Authoritative list: `gates/step2-content-lint.js` (rules 2 and 5 are deterministic; 1, 3, 4, 6 are
judged). Check them by number — a generic "make it better" pass does not fix them.

### Rule 6 — one metaphor per concept · **16 hits, the most common failure**

A concept gets exactly one image, and it keeps it for the whole video.

> *"The concept 'context window' is given two competing metaphors: 'room to think' and 'memory' —
> only one is allowed."*

**How to check:** list every abstract concept the script teaches. For each, write down the one
metaphor. If a concept has two, delete one everywhere, including in a caption.

### Rule 3 — jargon defined on first use · **15 hits**

Every technical noun is defined the first time it is spoken, in the same sentence or the next.

Already assumed known, do not define: `AI, tool, tools, software, model, models, app, data`.

**How to check:** read only the nouns. The first appearance of each one either has a definition
beside it or it is a violation.

### Rule 1 — no assignments · 9 hits

The video teaches; it does not set homework or ask for a submission.

> *"Assigns a deliverable ('create a producer-mindset.md file') and requires submission ('submit it
> to Taleemabad by Friday')."*

The CHECKPOINT beat is the only thing the learner is asked to do.

### Rule 4 — no bare time-phrase objects · 9 hits

> *"Bare time-phrase object — 'today' is dangling (line: 'It solves today.')"*

A time word must modify, not be the object. "It solves today's problem", not "It solves today".

### Rule 2 — no internal or brand names in narration · 6 hits · deterministic

Banned outright: **Aroma, Harim, Haroon, Usman, Taleemabad**.

> *"internal/colleague or brand name in narration: 'Aroma' → (line: 'Today Aroma will show you how
> an agent works.')"*

The protagonist is **always Ali** (`SCRIPTING_STANDARDS` §3). Never a real colleague.

### Rule 5 — no hard-coded fast-moving model names · 6 hits · deterministic

Banned: `GPT-4o, GPT-4, GPT-5, DALL-E 3, DALL-E, Midjourney v6, Stable Diffusion XL, Gemini 1.5,
Gemini 2, Claude 3.5, Sora, Flux`.

Say "a modern image model" instead of pinning a version that will date.

---

## Part B — run the free sensors before spending

All of these read `beats.js` only. None costs anything. Run them from the video folder.

```bash
node qa-checkpoint.js   # exit 2 - the LMS question
node qa-visuals.js      # exit 2 - Evals-Grade Visual Standard
node qa-info.js         # exit 2 - info-card data shapes
node qa-cutouts.js      # exit 1 - LAW 5, half-cut props
```

A failure here rewinds to the script stage **before** art or voice is bought. A failure after
`generate-lesson-art.js` blocks a run that has already spent money.

### The ones that fail most often

**CHECKPOINT beat** — mandatory, never spoken, never drawn, never first or last. `explain` needs at
least 120 characters across at least two sentences; `correctNote` at least 40; three or four
options, none duplicated; position between 40% and 90% of the video.

**Art depicting a child** — `validate-beats.js` blocks `schoolgirl, schoolboy, child, children,
kid, pupil, toddler, teenager, young girl, young boy`. Imagen's safety filter returns **no bytes,
silently**, so the render just comes out empty.

**`info` beat with no `info.tpl`** — renders as a blank frame with no error.

**Props on an `ali` beat** — a cutout cannot hold anything. Either remove the prop or change the
beat to `mode:'scene'`.

**Scene share below 28%** and **more than two `statement` cards** — both fail `qa-visuals.js`.

---

## Part C — the contract drift only a paid render reveals

These have each shipped broken because the schema, the renderer and the gate disagreed.

- **`cap`** — the course script schema has no `cap` field and `additionalProperties: false`, so a
  course-generated beat *cannot* carry a caption. A `scene` beat with no `cap` and no `overlay`
  renders wordless. `qa-frames.js` calls this "draws art but NO words".
- **`overlay`** — declared as a string in the schema; the template asked that string for a `.tpl`,
  got undefined, and drew nothing. Overlay has never worked for a generated video. Do not rely on
  it until a test renders it.
- **`info.tpl`** — must be one of the templates in `animation/info.js`. An unknown name is a blank
  frame.

**Before a paid stage:** re-read the script as it exists *now*. A redraft loop may have replaced
the version you checked. See `verify-before-claiming` §4, and `paid-run-protocol` before spending.

---

## Order of work

1. Draft.
2. Part A — the six rules, by number.
3. Part B — the four free sensors.
4. Part C — `cap` / `overlay` / `info.tpl`.
5. `reviewing-explainer-scripts` for the verdict.
6. Only then `paid-run-protocol`.
