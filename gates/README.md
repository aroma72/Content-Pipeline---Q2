# Quality-Gate Layer

A layer of **content** quality gates on top of the existing pipeline (Remotion
render → ElevenLabs VO → ffmpeg mux → production QA → publish). It does **not**
replace anything — the reviewer-gated steps and `.beads/content_feedback.jsonl`
keep working. These gates add the checks production-QA can't make: *does the
finished video actually teach, and was it worth the format?*

Runs on Node (no Python needed) and uses the **bundled** `ffmpeg-static` /
`ffprobe-static` binaries, so it works without a system ffmpeg on PATH. LLM and
vision gates use the Anthropic API (`ANTHROPIC_API_KEY` from env or the repo `.env`).

## Install

```bash
cd gates && npm install
```

## Run

One command, two phases:

```bash
# PRE-RENDER — on the narration script
node run-gates.js pre  --script <SCRIPT.md|VO_SCRIPT_EXACT.txt> --project <id>

# POST-RENDER — on the rendered/muxed MP4
node run-gates.js post --video <final.mp4> --script <script> \
     [--audio <vo.mp3>] --outcome "<intended learning outcome>" --project <id>

# both
node run-gates.js all  --video <mp4> --script <script> --audio <vo.mp3> --outcome "..."
```

A video **ships only when every non-skipped gate passes**. Exit code is `1` when
blocked, `0` when clear. Every verdict is appended to
`.beads/content_feedback.jsonl` (`type: "gate_verdict"`), joining the existing
feedback loop.

Each gate is also runnable standalone, e.g.
`node step1-content-judge.js --video … --script … --outcome "…"`.

## The gates

| Step | Gate | Phase | Kind | Checks |
|---|---|---|---|---|
| 2 | content-lint | pre | LLM + regex | no assignments (r1); no internal/brand names (r2, scrub); jargon defined on first use (r3); no bare time-phrase objects (r4); no hard-coded model names (r5, scrub); one metaphor per concept (r6) |
| 3 | voice/pacing | pre+post | deterministic | no silence > 3s in the final audio; sentence-length band 7–14 words; deliberate-pause share |
| 4 | visual-hierarchy | post | vision LLM | new/adopt behavior visually dominates old/drop (catches inverted emphasis); no leaked production labels / garbled / crowded frames |
| 5 | sync/flow | post | deterministic | \|video − VO\| within tolerance; trailing blank-video / cut-off-VO detection; frame-count vs VO_seconds×30 |
| 6 | pedagogy-rubric | post | LLM | **ACTIVE** — 8-domain rubric (1-4 levels) adapted from the Taleemabad Teaching & Learning Material Assessment Framework, calibrated to `docs/agentic-ai-mastery-curriculum.md`. Pass = mean ≥ 3/4 and no applicable criterion < 2/4. |
| 1 | content-judge | post | vision LLM | the finished artifact on 4 axes: educational efficacy, clarity, engagement, **cost** (was this the cheapest format that teaches it?) |

Order matches the spec: pre = lint → cadence; post = silence → visual-hierarchy
→ sync → pedagogy → judge.

## Calibration (read this)

The thresholds in `config.js` are **starting points, not truth**. They were not
tuned against this curriculum yet. The intended workflow is the same as
`content_feedback.jsonl`: when a gate flags something you think is fine, or
misses something you'd reject, change the number/list in `config.js` and note
why. Knobs you'll likely touch first:

- `lint.assumedKnownTerms` — words your audience already knows, so rule 3 won't
  demand a definition (starts with AI, tool, model, …). *Observed false-flag on
  first run: "tool"/"AI" — fixed via this list.*
- `lint.bannedNames` — your team's names + the brand, scrubbed from narration.
- `judge.minPerAxis` / `judge.minMean` — the content-judge pass bar.
- `voice.maxSilenceSeconds`, `voice.min/maxAvgWordsPerSentence` — pacing bars.
- `sync.driftToleranceSeconds` — A/V drift tolerance.

**Known false-flag to expect (Step 6):** a pedagogy rubric written expecting a
committable artifact will ding a *concept* video for "no assessable deliverable"
even though a spoken reflection IS valid assessment for a concept video. The stub
rubric documents this so it won't flip-flop once activated.

## Step 6 (pedagogy) — calibrated 2026-06-10

`prompts/pedagogy-rubric.txt` is adapted from the **Taleemabad Teaching & Learning
Material Assessment Framework** (8 domains, 4 levels) and calibrated to
`docs/agentic-ai-mastery-curriculum.md`:
- **Kept** Relevance/Alignment, Progression, Accuracy/Depth, Visual Support,
  Pedagogical Appropriateness, Assessment/Feedback, Originality/Currency.
- **Dropped** the K-12/literacy/numeracy/grade-level/child-friendliness criteria.
- **Adapted** "grade level" → curriculum Bloom levels (Novice…Expert); alignment
  is scored against the stated **SLO** (pass `--outcome "SLO 1.3: …"`).
- **Added** `mentor_tone` (≥2 safety beats, zero shaming — a hard course standard)
  and `deliver_not_assign` (first-contact delivers; reflection is spoken).
- **Encoded the known false-flag:** on a `concept`/delivery-only video a SPOKEN
  reflection is valid assessment — the rubric does NOT demand a committable
  artifact (only `--videoType assignment|lab` does). Pass `--videoType` to set it.

`config.pedagogy.rubricReady` is `true`. To re-pend it (e.g. while re-tuning),
set it back to `false` and the gate reports PENDING instead of scoring.

## Notes / known edges

- Step 5 prefers a muxed audio stream when present; a Remotion "silent" render can
  carry a full-length silent track, so Step 3's silence scan on the real VO file
  is the safety net for actual dead air.
- Step 4 judges emphasis/labels, not "blank frame" per se — a pure-black tail
  frame is caught by the content-judge (cost/efficacy), as seen in testing.
