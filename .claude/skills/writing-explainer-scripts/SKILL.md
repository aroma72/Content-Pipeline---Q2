---
name: writing-explainer-scripts
description: Draft a beats-ready explainer/lesson script — one spoken sentence per beat, single protagonist in depth, a mode picked per sentence. Use before beats.js, when turning a topic/SLO into a script for the explainer-video pipeline.
type: skill
last_verified: 2026-07-09
owner: aroma
---

# writing-explainer-scripts

Draft a script that drops straight into `beats.js` for `creating-explainer-videos`.

## Rules (house standard — `.claude/standards/SCRIPTING_STANDARDS.md`)
- **Single protagonist, in depth.** ONE named, invented character (e.g. "Ali, a statistician")
  carried through ONE scenario — friction → fix → structure → failure mode → payoff. NOT a list of
  domain examples. Never a real colleague's name. Same protagonist across a series.
- **Lead with the answer** (pyramid) in the first beat.
- **One sentence per beat.** Plain, short (≈7–14 words), read-aloud-able. If it's a mouthful, split it.
- **One concept per video.** Define jargon on first use. One metaphor per concept.
- **Mentor tone:** ≥2 emotional checkpoints (normalize early, reassure at the hard part); no shaming.
- **No title-card beats, no assignments in the body.** A closing "your turn" is a *spoken reflection
  prompt*, never a file-homework deliverable.

## Pick a mode per sentence
- `scene` — story sentence needing context (setting/character) → preferred for narrative beats.
- `ali` — story sentence carrying the through-line; add an `overlay` when the sentence names things.
- `info` — a number, list, or diagram sentence → an infographic that evolves.

## Output
A numbered list of beats: `id · mode · vo · cap · (art | info | overlay)`. Then hand to
`reviewing-explainer-scripts` for the gate before any art/TTS. Target ~24 beats / ~1.5–2.5 min.

## Check before handing off
Every beat is one spoken sentence · protagonist consistent · leads with the answer · jargon defined ·
2+ emotional beats · no assignments · modes chosen · Taleemabad (if used) is the protagonist's lived
context, not a tacked-on example.
