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

## Soft checks (→ NEEDS WORK)
- Missing the pyramid lead (answer-first) in beat 1.
- <2 emotional checkpoints, or any shaming language ("obviously", "simply", "just", "as you know").
- Sentences drifting long (aim 7–14 words) / too few `…` pauses.
- Mode mismatch (a number sentence not on an `info` beat; a context beat not a `scene`).
- Bare time-phrase objects ("solves today" → "solves today's problem").

## Output
`VERDICT: READY | NEEDS WORK | NOT READY` + a table of `beat · rule broken · exact fix`. Append the
verdict to `content_feedback.jsonl` so it joins the existing feedback loop.
