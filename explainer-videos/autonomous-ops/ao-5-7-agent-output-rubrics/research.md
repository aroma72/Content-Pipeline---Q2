# Research brief — 5.7 "Evaluate agent output quality using structured rubrics"

## Verified facts to teach
- **Andrew Ng: evaluation is the single biggest predictor of agent progress.** Verbatim: the "single
  biggest predictor of how rapidly a team makes progress building an AI agent lay in their ability to
  drive a disciplined process for evals and error analysis." • https://x.com/AndrewYNg/status/1978867684537438628 • Oct 2025
- The field has moved **from "vibe checks" to written rubrics** — datasets, rubrics and judge models
  versioned as code; rubrics are "the ultimate governance tool." • Confident AI, 2026 • Adnan Masood, 2026
- Best practice for rubric evals: **define 5–8 quality dimensions with clear descriptions and anchor
  examples**, then score against them (with multiple raters for subjective work).
  • https://www.confident-ai.com/blog/llm-agent-evaluation-complete-guide • 2026
- **Start manual, then automate**: inspect outputs by hand, build the rubric, then hand it to an
  LLM-as-a-judge to run every time (cap the judge's share so most of the score stays deterministic).
  • Ng's invoice-processing example • Confident AI, 2026
- The five dimensions in the SLO map cleanly to the literature: **completeness** (task done fully),
  **accuracy** (correct), **efficiency** (resource/time), **safety** (constraints, no harmful action),
  **style** (clear, well-formed, coherent). • Galileo agent-eval framework, 2026 • RUBAS (agent safety rubrics), 2026

## The five rubric lines (for ONE card — not five separate lessons)
completeness · accuracy · efficiency · safety · style. Shop-floor form: all buttons on · the size
correct · cut without waste · seams that hold · a clean finish.

## Strongest analogy
- **A written scorecard for finished garments vs. a glance.** A glance sees the *whole* and misses the
  *parts* (the missing fourth button). A written card forces you to walk each line and gives a
  repeatable score. Ties directly to 5.4's tailor workshop.
- AVOID: a school "grade" with no criteria shown — that's the vibe check dressed up. The card's lines
  must be visible and checkable.

## Learner misconceptions → failure-mode beat
1. **"It looks right, so it's fine."** (The before. A feeling can't be checked twice and agree with
   itself. Stage the missed 4th button.)
2. **"A rubric is bureaucracy."** (No — it's what turns a shrug into a number you can defend and repeat.)
3. **"Automated evals come first."** (No — start by hand until the card is right, then automate.)

## Overlap note (important)
The evals series already has **video-05-write-the-rubric** and **video-06-llm-as-a-judge**. This video
is **agent-output** quality specifically, with the five named dimensions, and should **cross-reference**
those, not re-teach how a rubric or a judge works. Keep the automate-it beat light and point onward.

## Numbers / names for a card
- The five-line scorecard (above). Score example: **nine out of ten pass clean**.
- Captions only: *completeness/accuracy/efficiency/safety/style*; *evaluation*.

## Best teaching technique
**Stage the glance failing, then replace it with a scored walk.** Show "looks right" ship a flawed
coat, then the same coat failing line one of a written card — turning an intuition into a repeatable
number, exactly Ng's "manual rubric first" bridge.
