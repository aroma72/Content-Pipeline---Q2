---
type: reference
last_verified: 2026-09-20
owner: Aroma Tahir
---

# Course API — what changed, why your lesson died, and what it cost

**To:** Abdulrehman Siddiqi — Cohort 2 Learning Platform (LMS)
**From:** Content Automation — Drawing Room / Content Queen
**Re:** `2026-09-20-course-api-change-requests.md`
**Date:** 2026-09-20

---

All five are answered. Items 2 and 4 landed as you asked. Item 1 is fixed, but **not
because it was your bug** — that matters enough that it is the first thing below rather
than a footnote. Item 3 has a real answer now. Item 5 has a correction you need before
you touch an instructor's ledger again.

And one thing you did not ask for: **your lesson was fully built.** The finished,
bumper-wrapped video exists. It was discarded by a grammar check, not lost.

---

## 1 · `stopAfter` — you read the default correctly, but production overrides it

Everything in your §1 is accurate about the code. `STAGE_ORDER` does put `qa` one stage
before `review`, and `spine.js:386-391` does settle reaching `stopAfter` as
`queue.done()`. A deployment that leaves `PIPELINE_STOP_AFTER` unset really does build a
lesson, pay for it, mark it `done`, and never pause.

**Ours is not unset.** The live value is `upload`. So courses ran to `upload`, review did
pause them, and publishing did work. Your lesson came back `failed` for a different
reason entirely — §3.

We are telling you this plainly rather than accepting the diagnosis, because you were
explicit that you did not want to send us chasing the wrong thing, and the same courtesy
is owed back. If you had rebuilt against the `'review'` theory you would have found the
same failure again.

**One correction to the fix itself.** The line you suggested —
`stopAfter: config.pipeline.stopAfter || 'upload'` — would not have worked either.
`config.pipeline.stopAfter` is never empty; it defaults to `'qa'`, so the `||` never
fires. It needed its own resolved value:

```js
// server/lib/config.js -- courses resolve their own stage
courseStopAfter: process.env.PIPELINE_COURSE_STOP_AFTER || 'upload',

// server/lib/course-worker.js:94
stopAfter: config.pipeline.courseStopAfter,
```

`upload`, which is what production was already doing, so nothing you rely on changes.
Deliberately **not** chained off `PIPELINE_STOP_AFTER`: if that is ever changed for the
single-video path, courses must not follow it back behind `review`. The service now warns
at boot if the resolved stage cannot pause, and a test fails the build if it can neither
pause nor publish.

**The live values you asked for twice:** `PIPELINE_STOP_AFTER` is `upload`.
`PIPELINE_COURSE_STOP_AFTER` is unset, resolving to `upload`.

## 2 · The error field — done, plus `runId`

`api.js` now carries the reason through:

```js
runId: i.runId,
...(i.status === 'failed' && i.error ? { error: i.error } : {}),
...(i.status === 'blocked' && i.reason ? { reason: i.reason } : {}),
```

Two notes on the shape:

- **Each field is gated on the status it belongs to.** `currentItems()` is a shallow fold
  that never deletes a key, so an `error` from a first attempt survives a later `done`.
  Ungated, a lesson that failed, was rebuilt and finished would report the failure it had
  already moved past. A `done` item carries neither field.
- **`runId` is new and you did not ask for it.** It is the only handle tying a lesson to
  what it cost — your item 5.

We also split `blocked` out of `inProgress`. A lesson waiting on a person was being
counted as work in flight, which is the opposite of what your UI needs to say.

## 3 · Why your lesson failed — it was the fourth candidate

From `/data/cq-jobs/queue/queue.jsonl`, the last event for
`front-desk/say-the-caller-s-concern-back-before-offering-a-solution`:

```
failed  2026-09-19T14:55:57Z  run 20260919T143042-say-the-caller-s-concern-...
error: grammar and clarity of the spoken and on-screen text FAILED (eval-text.js, exit 1):
       ❌ ERROR "Have I got that right"
       The sentence is a question but lacks a question mark.
       → Add a question mark at the end.
```

The non-redraftable post-render `eval-text.js` — the last of your four, and the one you
could not distinguish from the outside.

**The flagged line is `beats.js:80`:**

```js
vo: "Then he asks, have I got that right, and he stops talking."
```

That is reported speech inside a narrated sentence. A question mark there would be wrong,
and in narration nobody can hear punctuation at all. `eval-text.js` is an LLM judge, and
it runs **twice** over the same `beats.js` — once before the spend, where a finding is a
redraft brief, and once after the render, where it was not. **It passed that line the
first time and failed it the second.** Same text, same run.

So the honest answer to "will the same topic fail again" is: not reliably, and that is
worse than yes. It was a coin-flip on a gate that could end a run.

**What we changed.** The post-render call now throws `BlockedError` instead of
`RejectedError`, so a finding after the render settles the lesson as `blocked` carrying
the finding as its `reason` — a person looks at the video and decides. The sensors before
the spend are untouched and still reject; there is no video to save yet, so rejecting
there is free. The comment above that line already said findings should "go to a human";
it just was not true.

We have not touched the judge. Narrowing it so a spoken line is never failed for
punctuation a listener cannot hear is the right deeper fix, but it edits a template every
video shares, and this change already stops it costing anyone a render.

## 4 · `PIPELINE_BUDGET_USD` — set, and you were right that it was not your failure

**The live value is `50`.** So the asymmetry never fired here, exactly as you said. You
flagged it as a latent trap and that is precisely what it is.

It is now in `docs/DEPLOYMENT_PREREQS.md` in the **Required** table, saying plainly that
without it every course lesson blocks at produce while every single video keeps working.

**We did not take the fallback you preferred**, and would rather say why than do it
quietly. `budgetUsd || maxApprovableUsd` would make the *unset* case "spend up to the
per-run hard wall" instead of "refuse to spend". The current failure is loud, free and
course-only; the proposed one is quiet and costs money. For a budget variable we would
rather be stopped than be generous.

One related trap we found and fixed while there: `Number('')` is `0` and `0` is finite, so
a variable set to an **empty string** in Railway read as "authorised nothing" while looking
configured in the dashboard. A blank value now falls back properly.

## 5 · Spend — the real number, and a correction

**Your lesson cost `$0.598`.** Not $1.50. You are holding about ninety cents too much
against that instructor's monthly credits.

Now the correction, which changes how you should read your own evidence:

> **`/demo/spend` reporting `spentUsd: 0, runs: 0` is not evidence that nothing was spent.
> That endpoint structurally cannot see courses.**

Courses create **queue items**; `/demo/make-video` creates **jobs**; and `ledger.js` builds
its summary from job records only. A course never reserves, never settles, and never counts
against a tenant's monthly ceiling. You read `0`, refused to trust it, and were right — for
a stronger reason than you had. No course spend has ever been recorded anywhere a ledger
can see.

**1. Does a failed lesson cost anything?** Yours did. It failed *after* `produce`, so art
and speech were already bought. Do not reverse this one. The rule you want is not
"reverse on `failed`" but "reverse on `failed` before `produce`" — a failure in research,
script or gate is free. The `error` string now names the stage, so you can tell the two
apart without asking us.

**2. Can a course report spend?** Not today, and we will not quote a number we do not
record. What you have now is `runId` on every lesson, which is the handle into
`.beads/runs.jsonl` where the figure exists. Routing course runs through the ledger
`/demo/spend` reads is the right fix; it touches the money path and we would rather do it
deliberately than alongside five other things.

One caveat before relying on that run log: **it is not on the volume.** `.beads/` lives on
the container filesystem, so a redeploy takes a run's cost with it even though the course
survives. Our diagnostic prints "spend unknown, not zero" rather than `0` for exactly this
reason.

## 6 · Your video exists

`out/say-the-caller-s-concern-back-before-offering-a-solution_final.mp4` — 28 MB,
1920×1080, h264/AAC, 1 minute 59 seconds, bumper-wrapped, complete. The render finished at
14:54; the grammar check failed it at 14:55.

We have pulled it off the container and verified it byte-for-byte
(`sha256 e70cf9f4…76d3`). It was sitting in a working directory that is not on the volume,
so a redeploy would have destroyed it.

**It is yours if you want it.** We can hand you the file, or publish it unlisted and give
you the URL and `youtubeVideoId` — which would also close your still-open item 4 for at
least one row. Say which; we are not publishing anything to your course without you asking.

Worth knowing before you decide: it has never been through `review`, so nobody has watched
it. The QA score it never reached is unknown.

---

## Still open from v5

| # | What | Where it stands |
|---|---|---|
| 1 | Rotate the token, mint a staging credential | **Still open.** You are right, including that editing the document does not help — it is in git history and in rendered PDFs. Treat the current value as public until we say otherwise. |
| 2 | `TENANTS_JSON` | **Still open.** You are on the shared `default` tenant. |
| 3 | A monthly ceiling on that tenant | Follows item 2. |
| 4 | `youtubeVideoId` | Courses do reach `upload`, so new lessons will populate it once approved. §6 may close one row retroactively. |
| 5 | `series` → module mapping | **Still open** since 09-07. |

## On your side

Nothing to change. `testing` is the right convention for test builds and we would have
asked for exactly that; `front-desk` cost us nothing and the folder is fine where it is.
Not blind-retrying `/courses/build` without an `Idempotency-Key` is the correct call while
that is missing, and treating your own table as the authority on course membership is more
defensible than our substring match on `notes` — that is our debt, not your workaround.

---

## The retest

One lesson into `testing`. Pass condition, in your words: it reaches `blocked` with a
populated `awaitingApproval` rather than sliding to `done`. Approve it and it should publish
unlisted and settle `done` with a `youtubeVideoId`.

A second thing to watch, now that a post-render finding blocks rather than fails: a lesson
can come back `blocked` with a grammar finding as its reason. That is a video that exists
and needs a human, not a failure — your UI should offer it for review, not for retry.

Tell us if anything reads differently from this, including the wording. The payload is
yours to explain to an instructor, and we would rather change a field name now than after
it is in your UI.
