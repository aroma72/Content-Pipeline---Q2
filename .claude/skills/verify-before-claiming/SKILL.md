---
name: verify-before-claiming
description: Proves a change actually works before saying it does, using this repo's own failure history - assert on the artefact the thing produced, never on an exit code, and never diagnose from source without running the thing. Use before reporting something fixed, passing, deployed or working, before trusting a new test or gate, after any push, and whenever a command exits 0 but you have not seen its effect. NOT a substitute for the pipeline QA gates - this is about how you check, not what the gates check.
type: skill
last_verified: 2026-09-23
owner: aroma
---

# Verify before claiming

This repo has lost real money and real days to claims that turned out to be unverified. Every rule
below is here because it already went wrong at least once, and the incident is cited so you can
judge whether it still applies.

The generic discipline lives in `superpowers:verification-before-completion`. This skill is the
repo-specific version: the exact shapes that fooled us here.

## The one rule

**A green exit code is not evidence. The evidence is the artefact.**

The row written. The file moved. The bytes served. The push blocked. The frame rendered.

> "Three separate bugs in one afternoon all presented as exit 0 and no output. In every case the
> exit code said success. A hook's contract is the row it writes, the file it moves, the push it
> blocks - never its status." — `.claude/memories/lessons.md` H9

## Checklist

Work through these before you say *fixed*, *passing*, *deployed* or *working*.

- [ ] **Did I watch this guard fail?** A test or gate you have never seen go red is not a guard.
- [ ] **Did I assert on the artefact, not the status?**
- [ ] **Is there a pipe between the command and the exit code I read?**
- [ ] **Did I run the thing, or reason about its source?**
- [ ] **Is the artefact I inspected still the artefact in play?**
- [ ] **Did I check CI, not just the local suite?**
- [ ] **Could this component have failed quietly and reported nothing?**

---

## 1. Watch every new guard fail

A test that has never failed may be passing for the wrong reason, which is worse than no test.

> "A green test you have never seen fail is not evidence." — H13. Two of three new tests in that
> batch *could not* have failed.

> "`\s` written inside a template literal collapses to `s`, so `/\bcode:\s*'...'/` was written to
> disk as `/code:s*'...'/` - a regex that matches nothing. Both produced tests that passed or
> failed for the wrong reason." — H11

**How to do it:** after writing a check, break the thing it checks, run it, see it go red, restore,
see it go green. Mutation is a mandatory step, not an optional one. If breaking the input does not
turn the check red, the check is decorative.

Tell-tale of a vacuous pass: the check reports on zero items. `qa-frames.js` now fails outright on
`built 0 layers` for exactly this reason.

## 2. Never read an exit code through a pipe

`cmd | head` reports `head`'s status. `cmd | tail` reports `tail`'s.

> "`node gate.js | head` reports `head`'s status, not the gate's. Two separate diagnoses this week
> were wrong because a pipe swallowed a non-zero exit." — H17

> "A backgrounded `docker build ... | tail -25` reported exit 0 while failing."
> — `session-archive/2026-09-22.md`

**Do this instead:**

```bash
set -o pipefail            # at the top of any script
node gate.js > /tmp/g.log 2>&1; rc=$?; tail -25 /tmp/g.log; exit $rc
echo "${PIPESTATUS[0]}"    # when you must pipe
```

## 3. Run the thing; do not diagnose from source

An argument from real code can be careful, internally valid, and wrong.

> "I read `animation/lesson.html` and concluded from the source that the rule false-positived. It
> was a careful argument from real code. It was wrong. Running the gate against a shipped video
> took minutes and cost nothing." — H16

> "Beat 14 disproved my own deduction, and that is the real find. I argued captions were guaranteed
> because `script.js:439` runs `validateBeats(..., {strictCanon:true})`. A `scene` beat still
> reached the render wordless." — `session-archive/2026-09-22.md`

**Before declaring a gate wrong**, run it against a committed fixture under `evals/skills/fixtures/`
or a real `beats.js`. It costs nothing.

**Before reasoning about deployed behaviour**, read the live value. Config defaults lie:

> "Verify against production, not against code defaults." — H4. Three `config.js` defaults
> disagreed with what production was actually running.

## 4. Re-read the artefact at the moment of use

A redraft loop can replace the thing you inspected while you are still talking about it.

> "The 20-beat script I inspected and declared verified before spending was replaced twice more
> DURING produce. My caption check was against a version that no longer existed."
> — `.claude/memories/active-session.md`

If you verified a script before a paid stage, re-read it immediately before the spend.

## 5. Check CI after every push

The local suite and CI can disagree, most often because a commit published a dependency that was
never committed.

> "CI was RED for both earlier deploys - my fault. I had deployed to production twice on a red
> build without looking." — `session-archive/2026-09-22.md`

```bash
git push origin <branch>
gh run list --limit 3          # then wait for it, and read it
```

Related: see `git-workflow` for why staging a whole file can do this to you.

## 6. Treat silence as failure, not success

The worst failures here were designed to be quiet.

> "`references` returned `[]` on every lesson this deployment ever built. It was shipped, announced
> to the LMS, and never once worked. Nobody noticed because the failure mode was designed to be
> quiet." — H21

> "Every other check passed, the overall verdict was YES, this container can render, and the one
> thing it existed to verify had quietly not been verified. An `??` on the load-bearing check is a
> red build wearing green." — H18

**Rule:** a check that *could not measure* is a third state. It must not render as a pass.
`qa-art.js` exit 3 (UNJUDGED) and `eval-text.js` exit 3 (infrastructure) exist for this. Never
collapse them into 0.

**Rule:** any degraded path must surface its reason somewhere a human reads - a log line and the
API response, not just an internal variable.

## 7. When a check misfires, scope it - do not re-instrument

> "The wrong fix - which I shipped first - was to swap the instrument. It invented a 201px spill on
> a text-heavy fixture that had always passed. Trading one false positive for another." — H19

Name what makes the misfiring case legitimate and exclude *that*. Derive the exclusion from data
the beat already carries (its `mode`), not from a hand-maintained selector list that drifts. Keep
two fixtures of opposite shape so the next change cannot quietly break the other one.

## 8. Publish the fact, not the inference

> "Our API reference tabulated `blockedBy` against 'money spent?'. They spent a day probing a gate
> that does not exist, then asked us to relax it." — H25

If a field is hardcoded, document it as hardcoded. Do not describe what it would mean if it were
computed.

## 9. A deploy is live when the new build answers, not when the CLI says so

"Triggered a deploy", a green dashboard, and `/health` `ok:true` are all true of the **old** build
too. On 2026-09-25 three redeploys reported success and changed nothing (`railway redeploy
--from-source` rebuilds the last snapshot on this service), and `/health` was hardcoded
`ok:true` besides.

**Proof is something only the new build can say:** `/health.build.commit` equal to the hash you
pushed (`scripts/deploy.sh` waits for exactly this), a field or route the old build did not have,
or the fixed behaviour reproduced against production. Until one of those holds, the fix is not
live and nobody should be told it is.

---

## How to report

State what you ran and what you saw:

> `node evals/skills/run.js` - 3 layers, 47/47 assertions, exit 0.

Not:

> The eval harness passes.

If part of it is unverified, say which part and why. An honest gap costs less than a wrong claim.
