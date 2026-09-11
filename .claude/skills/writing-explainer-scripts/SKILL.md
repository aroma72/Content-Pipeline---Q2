---
name: writing-explainer-scripts
description: Draft a beats-ready explainer/lesson script — one spoken sentence per beat, single protagonist in depth, a mode picked per sentence. Use before beats.js, when turning a topic/SLO into a script for the explainer-video pipeline. ALWAYS web-researches the topic + best teaching techniques first.
type: skill
last_verified: 2026-08-03
owner: aroma
requires_tools: [WebSearch, WebFetch]
---

# writing-explainer-scripts

Draft a script that drops straight into `beats.js` for `creating-explainer-videos`.

## Step 0 — Research the topic on the web (ALWAYS do this first)
Never write beats from memory alone. Before drafting, ground the script in **current facts** and the
**best proven way to teach this exact topic**. If `WebSearch`/`WebFetch` aren't loaded, load them via
`ToolSearch` (`select:WebSearch,WebFetch`) first.

Run BOTH search tracks (several queries each — fan out, don't stop at one):
1. **Topic currency & accuracy** — latest developments, correct up-to-date definitions, current
   tools/models/numbers, and the mistakes practitioners actually make. Queries like:
   `"<topic> 2026"`, `"<topic> latest / state of the art"`, `"<topic> best practices"`,
   `"<topic> common mistakes / pitfalls"`.
2. **Pedagogy — how to teach it best** — the most effective explanations, analogies, worked examples,
   and misconceptions to pre-empt for THIS topic. Queries like:
   `"how to explain <topic> to beginners"`, `"best analogy for <topic>"`,
   `"teaching <topic> misconceptions"`, `"<topic> worked example"`.

Then: `WebFetch` the 2–4 most authoritative/recent sources to pull specifics (dates, numbers, exact
mechanisms). Prefer sources from the **last ~12–18 months**; note each source's date; discard stale or
contradicted claims. Verify any surprising fact against a second source before using it.

**Output a Research Brief** and save it in the video folder as `research.md`:
- 5–10 **verified facts** to teach, each with a source URL + date.
- The **1–2 strongest analogies** found (and any to AVOID because they mislead).
- Top **2–3 learner misconceptions** to pre-empt → these become the "failure mode" beat(s).
- Any **current numbers / tool names** worth putting on an `info` card (kept accurate).
- The single **best teaching technique** for this topic (e.g. contrast pair, worked example, before→after).

Write the beats **from the brief**: the metaphor, the failure-mode beat, and any on-screen numbers must
trace to a verified fact in `research.md`. On-screen text stays plain (no citations shown), but the
underlying facts must be accurate and current. **Do not draft beats until `research.md` exists.**

## Rules (house standard — `.claude/standards/SCRIPTING_STANDARDS.md`)
- **Single protagonist, in depth.** ONE named, invented character (e.g. "Ali, a statistician")
  carried through ONE scenario — friction → fix → structure → failure mode → payoff. NOT a list of
  domain examples. Never a real colleague's name. Same protagonist across a series.
- **Lead with the answer** (pyramid) in the first beat.
- **One sentence per beat.** Plain, short (≈7–14 words), read-aloud-able. If it's a mouthful, split it.
- **One concept per video.** Define jargon on first use. One metaphor per concept.
- **Mentor tone:** ≥2 emotional checkpoints (normalize early, reassure at the hard part); no shaming.
- **Interactive CHECKPOINT (REQUIRED in every video).** One multiple-choice question the learner really
  answers — **never drawn, never spoken**. The player pauses there and the LMS pops the question. Write
  it as a zero-time beat sitting BETWEEN two spoken beats at ~⅔ through (never first or last, or the
  pause has no sentence to land between):
  `{id:'14', mode:'checkpoint', quiz:{stem, options:[…3–4…], answer:<0-based index>, explain:'why that is
  right, and why the tempting wrong one is wrong'}}`. Write `explain` for the learner who just chose
  wrong — it is the only feedback they get. Same beat in every format, illustrated or IDE-screencast.
  See SCRIPTING_STANDARDS §3b.
- **The Evals-Grade Visual Standard (DEFAULT for every video — Standard §3d).** Build the visuals the
  way the evals series did, unless Aroma asks otherwise: (1) ONE concrete setting as a const, repeated
  in every `scene` prompt — never an abstract "room with soft rounded walls"; (2) the AI is a real
  **laptop with a plain blank screen**, NEVER a glowing orb/blob — its output is crisp HTML; (3) ≥28%
  of beats are `scene`; (4) at most **2** plain `statement` cards; (5) ≥3 distinct data templates AND
  real numbers (countable stakes — quantities, money, time, a before/after); (6) scenes show an act
  (held, written, dropped), not just an expression. Verify with `node qa-visuals.js` before any art.
- **Animation at the story points (REQUIRED in every video).** While drafting, mark the **2–4 beats
  where real movement genuinely carries the story** — an emotional turn, a metaphor coming alive, the
  closing invite — and export them as `module.exports.animateIds = ['04','12','22']`. These are
  generated as true image-to-video motion with **omni** (`ART_IDS=… node generate-lesson-video-omni.js
  --yes`, paid/kie-gated); compile picks up `clips/<id>.mp4` automatically and falls back to Ken Burns
  if a clip is absent. Pick beats where motion *teaches* — never decorate a static definition beat.
  See `animation-motion-design` and SCRIPTING_STANDARDS §3c.
- **No title-card beats, no assignments in the body.** A closing "your turn" is a *spoken reflection
  prompt*, never a file-homework deliverable.

## Pick a mode per sentence
- `scene` — story sentence needing context (setting/character) → preferred for narrative beats.
- `ali` — story sentence carrying the through-line; add an `overlay` when the sentence names things.
- `info` — a number, list, or diagram sentence → an infographic that evolves.

## Output
1. `research.md` — the cited Research Brief (Step 0).
2. A numbered list of beats: `id · mode · vo · cap · (art | info | overlay)`, written FROM the brief.
Then hand to `reviewing-explainer-scripts` for the gate before any art/TTS. Target ~24 beats / ~1.5–2.5 min.

## Check before handing off
`research.md` exists and its facts are current + sourced · script is grounded in the brief (metaphor,
failure-mode, and numbers trace to it) · every beat is one spoken sentence · protagonist consistent ·
leads with the answer · jargon defined · 2+ emotional beats · **a CHECKPOINT beat is present**
(between two spoken beats, valid `answer` index, `explain` written for a wrong answer) · **`animateIds` names the 2–4 story beats to animate with
omni** · no assignments · modes chosen ·
Taleemabad (if used) is the protagonist's lived context, not a tacked-on example.
