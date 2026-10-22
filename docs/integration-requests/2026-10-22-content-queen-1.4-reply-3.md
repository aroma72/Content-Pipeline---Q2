---
type: reference
last_verified: 2026-10-22
owner: aroma
---

# For the LMS team — edit test received, context switch, and how far spend can pass `estimateUsd`

*Reply to your note of 2026-10-22. No contract change in this reply; one optional produce field is
offered at the end.*

## 1. The edit test

Thank you, and agreed on keeping `/demo/*` job ids out of messages: they authorise spend and
publish. The `script.edits[]` shas are enough for us to find the job.

Our two refusals not firing is the right outcome: your API stopped both requests first. To see them
fire once on our side, please send the two raw edits you offered straight to our route, on the same
`written` job. Neither costs anything:

- a 9-word `cap` on any beat → expect **`422 check_failed`**, `check: "caption-length"`, `beatId`;
- edit 1 again with `sha: "a71a8b010b32ea8b"` → expect **`409 sha_mismatch`**, `currentSha: "afdf45d5f6ff676e"`.

## 2. `MAKE_VIDEO_CONTEXT`

Going on with our next deploy; we will tell you when `/health.makeVideo.context` reads `true`. Your
three checks (the echo, a figure found only in the files, the planted "ignore the brief" line) are
the right ones. The planted line should come back as content at most, never followed.

## 3. How far can real spend go above `estimateUsd`?

First, a correction to reply-2. `estimateUsd` is the **media** bill for one clean pass: art, speech,
animation. `produce.spendUsd`, which you settle to, is **media plus model calls**. A clean produce
records no model spend (its picture and text judges are not counted), so on most runs the two are
close. They come apart for three reasons:

| What | When | Size |
|--|--|--|
| A moving beat priced longer | Animation is priced in 5/10/15-second steps. The estimate uses 5 s, because real timing only exists after speech. Re-priced after speech. | +$0.25 per moving beat that lands past 6 s, +$0.50 past 11 s. The writer asks for movement on 2–4 beats. |
| Pictures re-bought | The picture judge rejects one and it is redrawn, at most twice. | $0.04 a picture; usually 0–3 pictures. |
| A redraft during produce | A check that can only run on the rendered video finds a script defect. The writer rewrites, and the reworded beats get new pictures. | About **$0.6–1.0 of model calls per round**, plus the new pictures. At most 2 rounds per check and 6 in total. |

**Media is capped; model calls are not.** Every media purchase is checked against the budget we set
at produce time. Animation falls back to stills, and redraws stop, rather than pass it. That budget
today is our service ceiling, cut to your tenant's monthly remainder. It is **not** your estimate,
so nothing on our side holds a run to `estimateUsd + margin`.

So: **+$0.50 covers the media drift of a normal run** (a few redraws and one or two long moving
beats). It does **not** cover a produce-time redraft (~$1 a round), or four long moving beats on a
voiced video (up to +$2). Holding the estimate **+ $1.50** covers one redraft plus drift. A run with
two or more redrafts can still go past that.

**What we can add, if you want it:** an optional `maxUsd` on `POST …/produce`. Our media budget
becomes `min(today's budget, maxUsd)`, so no art, speech or animation is bought past it (moving
beats fall back to stills first). A `maxUsd` below `estimateUsd` is refused before anything is
reserved. Model calls from a redraft would still be reported in `spendUsd` but not capped. Capping
those would mean stopping a video half-made, and we would rather report them. Say yes and it ships
with the context switch.
