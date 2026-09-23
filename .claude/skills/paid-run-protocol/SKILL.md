---
name: paid-run-protocol
description: The protocol for any pipeline stage that spends real money - quote the cost from this run's own estimate line, check it against a ceiling, get approval, persist the deliverable before any sensor that can throw, and stage commits by hunk because another session shares this working tree. Use before running art generation, TTS, or i2v motion, when asked how much a video will cost, when a run was refused for budget, and before committing or pushing anything a paid run produced.
type: skill
last_verified: 2026-09-23
owner: aroma
---

# Paid run protocol

Three wrong spend quotes, one wrong apology for a wrong quote, six budget-refused runs, four
concurrent-session git incidents, and one paid render very nearly lost after it was made. All of it
is preventable by the order of operations below.

## The unit costs

From `orchestrator/lib/stages/produce.js:30`, kept in step with `templates/lib/config.js:107`:

| Item | Price | Unit |
|---|---|---|
| Imagen art | **$0.04** | per image |
| Gemini TTS | **$0.002** | per clip |
| i2v motion | **$0.05** | **per second** |

i2v is the only **per-second** item, and it is where every under-quote came from. A single animated
beat of 15 seconds is **$0.75** — more than eighteen images.

## 1. Quote from this run's estimate line, never from the last run

`produce.js:662` already prints the arithmetic:

```
estimated spend: 22 image(s) x $0.04 = $0.88 + 22 TTS clip(s) x $0.002 = $0.044
                 + 3 animated beat(s) / 27s x $0.05 = $1.35   →  total $2.27
```

**Read that line. Quote that number.** Do not quote from memory, from a previous video, or from
the media figure alone.

> "I quoted Aroma ~$0.60 before spending. It was $2.81."
> "COST CORRECTION — I under-quoted again. I told Aroma ~$0.60. This run estimates $1.77."

Both times the estimate line existed and was not read.

## 2. Separate real money from plan usage

This distinction caused a *second* error — an apology for a number that was never billed.

- **Media spend** — Imagen, Gemini TTS, kie i2v. Real dollars. Quote this as money.
- **Model spend** — Claude/Gemini reasoning calls. Subscription plan usage. Quote this as plan
  usage, never as billed dollars.

Saying "this run cost $2.81" when $2.20 of it was plan usage is as wrong as under-quoting.

## 3. Nothing paid fires without explicit approval

Every paid entry point is guarded by `--yes` / `CONFIRM_SPEND=1`. **Do not pass it on your own
judgement.** Print the estimate, state the total, wait for Aroma.

```bash
node generate-lesson-art.js --yes        # $0.04 x images
node tts-lesson.js --yes                 # $0.002 x clips
ART_IDS=04,09 node generate-lesson-video-omni.js --yes   # $0.05 x SECONDS
```

Six runs were refused with *"Paid art/TTS not approved: this video costs ~$X and the budget is
$0/$0.01"*. The estimate is computed and logged, but **nothing enforces a ceiling against it** —
so the ceiling check is yours to make, by hand, before you run.

**Regenerate only what is missing.** `ART_IDS=` limits a repair to named beats; a bare re-run
re-buys every image. `produce.js` skips stages whose artefacts are already complete — let it.

## 4. Spend only after the free gates have passed

Everything in `script-lint-preflight` is free and catches most of what a paid run would waste.
A sensor failure before `produce` rewinds to the script. A sensor failure after it blocks a run
that has already spent money.

Re-read the script immediately before the spend — a redraft loop may have replaced the version you
approved. See `verify-before-claiming` §4.

## 5. Persist the deliverable before anything that can throw

> "The mp4 copy to the volume sat *after* the `eval-text` sensor. That sensor blocks by throwing.
> That is precisely the loss `deliverables.js` was written to prevent, reproduced by the module
> itself." — `lessons.md` H24

**Order: produce → copy the artefact to its durable home → then run the judging sensors.** A sensor
that blocks must never be able to strand something that was paid for.

The same applies to diagnosis: if a run blocks before persist, its `beats.js` is gone and the
failure cannot be investigated at all.

## 6. Commit by hunk — another session shares this tree

> "`git add orchestrator/test-regressions.js` once staged three of their tests along with ours.
> Their tests were committed; their implementation was not — so main went red." — `lessons.md` H5

```bash
git add -p <file>        # choose hunks; never `git add <file>` wholesale
git diff --cached        # read exactly what you are about to publish
```

Then: **submodule first, then the main repo pointer.** Never force-push main. After the push,
check CI — a green local suite is not a green build. See `git-workflow` and
`verify-before-claiming` §5.

## 7. Deploying

`railway redeploy --from-source` pulls `main`, so it **rolls back any unmerged work**. The deploy
is `git push origin <branch>:main` first, then the redeploy.

---

## Checklist

- [ ] Free gates green (`script-lint-preflight`)
- [ ] Script re-read as it exists now
- [ ] Estimate line printed and read
- [ ] Media total quoted as money; model spend quoted as plan usage
- [ ] Total checked against the ceiling
- [ ] Aroma approved, then `--yes`
- [ ] Deliverable persisted before judging sensors
- [ ] Staged by hunk, submodule first, CI checked after the push
