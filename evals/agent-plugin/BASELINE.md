---
type: reference
last_verified: 2026-09-27
owner: aroma
---

# Agent eval baseline — 2026-09-25

First full run of `npm run eval:agent`. Claude Code 2.1.282, judge `claude-haiku-4-5`,
3 cases × 3 runs × 2 arms = 18 agent runs. **$1.71-equivalent of plan usage, 422s.**

Overall 0.85 · 2 of 3 cases passed the 0.8 threshold · mean Δ +0.41.

| case | with | without | Δ | skill fired? |
|---|---|---|---|---|
| `quote-a-paid-run` | **1.00** | 0.33 | **+0.67** | yes |
| `catch-missing-checkpoint` | 0.56 | 0.00 | +0.56 | **no — 0/3 runs** |
| `exit-zero-is-not-evidence` | 1.00 | 1.00 | **0.00** | yes |

## What each row actually says

**`quote-a-paid-run` — the one unambiguous win.** Without `paid-run-protocol` Claude scores 0.33 on
every run; with it, 1.00 on every run. The skill is what makes the difference, consistently. This is
the shape a useful skill produces.

**`exit-zero-is-not-evidence` — a case that proves nothing.** 1.00 in *both* arms. Claude already
refuses the "it exited 0 through a pipe" claim without any help from us, so this case cannot tell us
whether `verify-before-claiming` works. Per Anthropic's own guidance, an assertion that passes in
both configurations inflates the with-skill score without reflecting value. **Replace it with a
harder case** — something where the tempting wrong answer is genuinely tempting — or drop it.

**`catch-missing-checkpoint` — the real finding.** The skill **never fired, in any of the three
runs** (`Skill called 0x`). The partial improvement over the baseline came from skill *descriptions*
being in context, not from the skill body being read.

Run detail: `finds-checkpoint` passed 3/3 (the word appears), but `blocks-the-spend` — which also
requires flagging "Aroma" as a banned internal name in narration — passed only 1/3. So Claude
notices the missing checkpoint on its own, and misses the lint rule that only the skill teaches.

This is under-triggering, the failure Anthropic's skill-creator explicitly warns about: *"Claude
only consults skills for tasks it can't easily handle on its own."* Claude judged a six-line beat
list to be something it could just read.

## What to change next

1. Make `script-lint-preflight`'s description pushier so it fires on any request to check, review or
   sanity-check a script — not only on explicit "lint" phrasing.
2. Replace `exit-zero-is-not-evidence` with a case Claude fails without the skill.
3. Re-run and compare Δ, not the absolute score. An improvement means Δ went **up** while the
   with-arm stayed at 1.00.

Re-running costs roughly the same ~$1.70 of plan usage and ~7 minutes. Quote it before running it.

## Caveat on the free layer

`evals/skills/run.js` Layer 2 scores `catch-missing-checkpoint`-style routing as a pass, because the
description *does* carry the trigger words. This run is the proof that carrying the words is
necessary but **not sufficient** — the model still has to decide the task is worth a skill. Keep
both layers; they measure different things.

---

## Second run — 2026-09-27, after the description fix

`npm run eval:agent`, same models. **$1.66-equivalent plan usage, 394s.** Overall 1.00 · 3 of 3
above threshold · mean Δ +0.63.

| case | with | without | Δ | fired | first run |
|---|---|---|---|---|---|
| `catch-missing-checkpoint` | **1.00** | 0.00 | **+1.00** | **3/3** | 0.56 / +0.56 / fired 0/3 |
| `quote-a-paid-run` | 1.00 | 0.11 | +0.89 | 3/3 | 1.00 / +0.67 |
| `triggered-a-deploy-is-not-live` | 1.00 | 1.00 | **0.00** | 3/3 | (new; replaced exit-zero) |

**The description fix worked.** `script-lint-preflight` went from never firing to firing on
every run, and the case from 0.56 to 1.00 — the "Aroma in narration" rule that only the skill
teaches is now caught 3/3. This is the delta shape a skill should produce.

**`verify-before-claiming` still has no discriminating case.** Two attempts (the pipe-swallowed
exit code; "Triggered a deploy" = live) both score 1.00 in both arms: Claude refuses these claims
unaided. That is real information about the skill, not about the eval: the skill's *stance*
(demand evidence) is native behaviour, and its value is the repo-specific *specifics* — which
pipe, which /health field, which fixture. A third round of "will it refuse?" cases is not worth
~$1.70; a case that needs a repo-specific fact (e.g. "which field on /health proves the deploy?")
might be. Not scheduled.

**Cost model held:** ~$0.09-equivalent per agent run across both runs.
