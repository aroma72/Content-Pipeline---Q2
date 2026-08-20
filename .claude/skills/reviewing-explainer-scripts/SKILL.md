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
9. **No interactive QUESTION → REVEAL** (Standard §3b, REQUIRED effective 2026-08-17): every video must
   contain an in-video multiple-choice QUESTION beat (with `holdAfter` so the viewer can answer) AND a
   matching REVEAL beat a few beats later. Missing either → NOT READY. Confirm the QUESTION uses
   `tpl:'quiz'` with `note`/`holdAfter` and the REVEAL uses `tpl:'quiz'` with an `answer` index (or, for
   non-`info` formats, an equivalent answer-then-reveal card pair).
10. **No animation plan** (Standard §3c, REQUIRED effective 2026-08-17): `module.exports.animateIds`
    must name **2–4 beats where real motion carries the story** (emotional turn, metaphor coming alive,
    closing invite), to be generated with omni i2v. Missing, empty, or pointing at ids that don't exist
    → NOT READY. Beats chosen purely to decorate a static definition → NEEDS WORK with the better beats
    named. (Exempt: IDE-screencast assignment/assessment videos, where i2v does not apply.)

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
