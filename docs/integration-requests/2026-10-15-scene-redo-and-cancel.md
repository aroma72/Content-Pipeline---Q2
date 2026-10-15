---
type: reference
last_verified: 2026-10-15
owner: aroma
---

# For the LMS team — send back one scene, cancel one lesson (contract 1.3)

*Additive. `contractVersion` becomes `1.3`. Both new verbs are **off by default** on the service
(`COURSE_VIDEO_REDO`); with the switch off, every request you make today behaves exactly as it did
yesterday, and `video/revise` answers `409 {"reason":"not_enabled"}`.*

Frozen copy: `docs/contracts/course-api-v1.3.md`. Changelog: `docs/CONTRACT-CHANGELOG.md`.

## What is new

Your letter of 2026-10-15 asked for a way to send a reviewed video back to its script without
stopping the course. This is that, and one step further: a reviewer who says *"scene 7 is drawn as
a bank"* gets **scene 7 remade and nothing else** — the other scenes' images, voice takes and
motion clips are reused as bought, only those seconds are rendered again, and they are spliced into
the video that was reviewed. The lesson pauses at review again with a new `reviewedSha256`.

| decision at review | verb | cost | time | the course |
|---|---|---|---|---|
| publish | `/approve` | $0 | — | continues |
| **remake these scenes** | **`/video/revise`** | **cents** (a 2-beat redo measured $0.45–0.65) | **8–15 min** | **continues** |
| stop | `/reject` | $0 | — | stops |

And **`/cancel`** drops one lesson at $0 beyond what it bought, lifts its hold, and the next lesson
builds. A lesson that is building is actually stopped (reject could not do that before).

## The five answers you asked for

1. **Shape.** `POST …/lessons/:id/video/revise {why, beats?, spans?, by, fullRebuild?}` → `202
   {revising, round, redosLeft, beats, mappedFromSpans, reservedUsd}`. `beats` are ids from
   `GET …/script`; `spans` are seconds in the file you watched (intro included — we shift them the
   same way the checkpoints are shifted). 409 carries a `reason`; §3 of the contract lists them.
2. **Money.** The lesson's $2.50 reservation settled when it blocked at review. A redo takes its
   own small hold (`reserveUsd`, default $0.75) and settles at what it bought; it shows in the
   lesson's `spendUsdTotal`. The discarded render is not refunded — it was ~$0.60 of media, not
   $1.50; the $1.50 figure was always mostly model calls and time.
3. **The cap.** Its own: `maxRounds` (3) per lesson, served at `GET /api/v1 → videoRedo`. It does
   not count against the 5 script revisions.
4. **The course.** Not stopped; no sibling touched. `cancel` is the lesson-level drop you asked for.
5. **The walk back.** `blocked(review) → queued → claimed → blocked(review)`. While `claimed`, the
   old `reviewedSha256` is gone from the item; when it blocks again the new one is there.
   `deliverableAvailable` is true again once the new file is on the volume. `scriptSha` changes
   (the patched script is re-fingerprinted and the approval re-bound to it — the reviewer's scoped
   instruction is the approval of the scoped change). `scriptRevisions` does not move;
   `redoRound`/`redoBeats`/`redoWhy` do.

## What you have to do on your side

- **Re-archive on `reviewedSha256` change.** Your archive worker copies a lesson once and never
  again (`drive_file_id IS NULL`). A redone lesson is a new file; if you do not clear that column
  when the sha changes, your reviewer keeps watching the old video. Our Drive copy is also a new
  file (`…_final.r<round>.mp4`), so nothing on our side overwrites yours.
- **Show the redo button only when `residueAvailable` is true.** False means the paid inputs were
  not kept (the lesson was built before `RESIDUE_KEEP` was on) and a redo would be a full rebuild;
  `fullRebuild: true` asks for that explicitly.
- **Mirror the new item fields** (`redoRound`, `redoBeats`, `redoWhy`, `redosLeft`,
  `residueAvailable`, `cancelled*`) — your `KNOWN_COURSE_ITEM_FIELDS` drops what it does not know.
- **Checkpoints.** A re-voiced scene that changed length moves every later checkpoint;
  `GET …/checkpoints` re-reads the timing, so fetch it again after a redo (the ETag changes).

## What is deliberately NOT in this

- Re-rendering a span of seconds *without* a beat behind it. A scene is a beat; "1:20–1:35" is
  mapped to the beats under it and those beats are remade whole. Finer than that is not something
  the renderer can do, and not something a reviewer can reason about.
- A redo at the script gate. `script/revise` already exists there and is the right verb.

## Rollout

1. We deploy with everything off. Nothing changes for you.
2. We turn on `RESIDUE_KEEP` and build one lesson on staging; the residue lands on the volume and
   on the Shared Drive. Lessons built before this step have no residue and report
   `residueAvailable: false`.
3. We turn on `COURSE_VIDEO_REDO` on staging and send one scene back with a changed line. We
   measure wall time and spend, confirm the new `reviewedSha256`, the `.r2` file on Drive and the
   shifted checkpoints, then approve it and confirm the published bytes are the `.r2` ones.
4. You vendor `course-api-v1.3.md` and flip your flag once your re-archive rule is in.
