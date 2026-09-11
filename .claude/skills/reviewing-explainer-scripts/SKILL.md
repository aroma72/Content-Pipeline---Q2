---
name: reviewing-explainer-scripts
description: Gate an explainer/lesson script before any art/TTS/render — verdict READY / NEEDS WORK / NOT READY against the house scripting standard and pipeline laws. Use as step 0 of creating-explainer-videos.
type: skill
last_verified: 2026-07-09
owner: aroma
---

# reviewing-explainer-scripts

The **step-0 gate**. Only a **READY** script gets art, TTS, or a render — this is the cheapest place
to catch a defect (a re-render costs hours + spend). Run the `explainer-script-gatekeeper` agent, or
apply this rubric directly.

## Verdict
- **READY** — animate it.
- **NEEDS WORK** — fixable; list exact line-level fixes, re-gate after.
- **NOT READY** — structural problem (wrong concept scope, no protagonist, assignments in body); rewrite.

## Hard-fail checks (any one → not READY)
1. **No single protagonist carried in depth** (domain-hops, switches characters, or stays abstract).
2. **A real colleague's name** appears anywhere.
3. **Assignments/file-homework in the body** ("create a `producer-mindset.md`", "your task", "submit").
   A spoken reflection prompt is fine; a deliverable is not.
4. **Beat isn't one speakable sentence** (too long to read in its beat, or off-topic).
5. **Jargon undefined on first use**, or **>1 metaphor per concept**.
6. **More than one concept** for a technical video.
7. **Hard-coded fast-moving model names** in narration (say "a modern image model (e.g. …)").
8. **Title-card beats** present (bumpers own the title, not beats).
8b. **`ali` beat holds/overlaps a prop** (laptop, phone, papers, mug, tool…) → the cutout slices it
    into a nonsensical half-object. Props may only float *detached* beside a clean-hero Ali; anything
    held/leaned-on, or any 2-object composition, MUST be `mode:'scene'`. Run `node qa-cutouts.js` — it
    fails this deterministically. (Body-only poses — three fingers, thumbs-up, open hands — are fine.)
    See memory `feedback_cutout_qa`.
9. **No CHECKPOINT beat** (Standard §3b, REQUIRED effective 2026-09-11): every video must contain at
   least one `{mode:'checkpoint', quiz:{stem, options, answer, explain}}` beat. Missing → NOT READY.
   Also NOT READY if: it is the first or last beat (the pause has no sentence either side), `answer` is
   not a valid 0-based index into `options`, there are fewer than three options, or `explain` is missing
   or is a six-word caption rather than feedback for someone who just chose wrong. A script that still
   renders QUESTION/REVEAL cards on screen (`tpl:'quiz'`) → NEEDS WORK: convert it to a checkpoint.
10. **No animation plan** (Standard §3c, REQUIRED effective 2026-08-17): `module.exports.animateIds`
    must name **2–4 beats where real motion carries the story** (emotional turn, metaphor coming alive,
    closing invite), to be generated with omni i2v. Missing, empty, or pointing at ids that don't exist
    → NOT READY. Beats chosen purely to decorate a static definition → NEEDS WORK with the better beats
    named. (Exempt: IDE-screencast assignment/assessment videos, where i2v does not apply.)

11. **Fails the Evals-Grade Visual Standard** (Standard §3d, REQUIRED effective 2026-08-21): run
    `node qa-visuals.js` in the video folder. Any violation → NOT READY. The six rules: one concrete
    persistent setting (not an abstract room) · the AI is a real laptop with a blank screen (NEVER a
    glowing orb/blob) · ≥28% `scene` beats · ≤2 plain `statement` cards · ≥3 distinct data templates
    plus real numbers · scenes show a physical action. This is the DEFAULT visual format for every
    video unless Aroma asks for something else. (Exempt: IDE-screencast assignment videos.)

## Soft checks (→ NEEDS WORK)
- **No web-research grounding** (Standard §0): script teaches factual/current claims but no cited
  `research.md` beside it, or on-screen numbers/analogy don't trace to it. (A purely illustrative
  script with no external facts is exempt.)
- Missing the pyramid lead (answer-first) in beat 1.
- <2 emotional checkpoints, or any shaming language ("obviously", "simply", "just", "as you know").
- Sentences drifting long (aim 7–14 words) / too few `…` pauses.
- Mode mismatch (a number sentence not on an `info` beat; a context beat not a `scene`).
- Bare time-phrase objects ("solves today" → "solves today's problem").

## Output
`VERDICT: READY | NEEDS WORK | NOT READY` + a table of `beat · rule broken · exact fix`. Append the
verdict to `content_feedback.jsonl` so it joins the existing feedback loop.
