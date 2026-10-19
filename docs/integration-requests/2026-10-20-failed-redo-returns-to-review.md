---
type: reference
last_verified: 2026-10-20
owner: aroma
---

# For the LMS team — what the first production redo found, and what changed

*Contract stays `1.3`. One new item field, `redoFailed`. Everything else is a fix on our side.*

Changelog: `docs/CONTRACT-CHANGELOG.md` ("1.3, clarification — 2026-10-20"). Frozen copy:
`docs/contracts/course-api-v1.3.md` (§1 statuses, §2 fields).

## Your three questions

**1. Is the reviewed video still there, and can the lesson go back to review with it?**
Yes. The video your reviewer watched is on the Shared Drive, verified (its md5 matches the record).
Until now a failed redo ended the lesson as `failed`; the contract did not say. From this release **a
redo that fails returns the lesson to `blocked` at `review` with the same `reviewedSha256`**, because
the video was never replaced. Approve publishes it unchanged; `video/revise` can be sent again while
`redosLeft > 0`; reject stops the course as before. The lesson from the test
(`why-the-worked-example-comes-first`) was failed under the old rule and the new code does not reach
back to it: please **cancel** it (frees the course at $0) and run the redo again on a new lesson.

**2. Does a failed redo use up a redo and get charged?**
Yes to both. The round is counted when the redo is accepted (`redoRound` 1, `redosLeft` 2 on that
lesson) and stays counted after a failure — a redo that keeps failing must not loop on paid retries.
The hold settles at what the redo bought before it failed. Here: **$0.48** ($0.16 media, $0.32
model); the discarded work is not refunded. The lesson's $2.50 hold from its own build is untouched.

**3. The lesson came to review without `reviewedSha256`. Expected?**
No — a defect, now fixed. The fingerprint was taken after the video had already moved to Drive, so
there was no local file to hash. It is now taken from the verified Drive record when the file is
gone. Every lesson blocked at review carries `reviewedSha256` from this release.

## What actually failed, and the three other things we found

The last step wraps the lesson in the brand bumpers and mixes the music bed. When no licensed track
is configured, a small script synthesises one with ffmpeg — and it fed ffmpeg **twenty generated
inputs**, each of which builds its own filter graph with a thread per CPU. On the 48-core Railway
host that is ~700–950 threads at once against a container ceiling of 1000. The first build of the
lesson slipped under it; the redo, with more dead Chrome processes on the box, did not:
`pthread_create failed: Resource temporarily unavailable`. Our runner kept only the last eight
lines of the error, which were Node's dump, so the message read "Exit 1" and nothing else.

Fixed: the twenty tones are now sources inside one graph pinned to one thread (82 processes at
peak against a baseline of 75, measured on the container); the runner now leads with the line that
says why; an init process reaps the dead Chrome processes that were eating into the same ceiling.

Two more, found while reading the run:

- **The redo re-judged an unflagged scene.** The vision judge looked at all 14 images, flagged scene
  09 (which it had accepted with a warning on the first build), re-bought it ($0.04) and redrafted
  the script — for a redo of scene 02. Now a redo judges **only the flagged scenes**; every other
  image is reused as bought, as the contract says.
- **A failed redo stranded the lesson** (`failed`, course held, paid Retry offered). Covered above.

## What you see on a failed redo

```json
{ "status": "blocked", "blockedBy": "review",
  "reviewedSha256": "7257c8d1…",            // unchanged
  "redoRound": 1, "redosLeft": 2,            // the failed round counts
  "deliverableAvailable": true, "residueAvailable": true,
  "redoFailed": { "round": 1, "beats": ["02"],
                  "firstLine": "pthread_create failed: Resource temporarily unavailable …",
                  "error": "…", "runId": "…", "at": "2026-10-19T14:43:29Z" },
  "reason": "The redo of scene(s) 02 (round 1) failed before a new video was made: … The video you reviewed is unchanged and is still the one that approve publishes. You can approve it, send it back again, or reject the lesson." }
```

No `redoBeats`/`redoWhy` (no redo is in progress). `redoFailed` is cleared by the next successful redo.

## What to do on your side

- **Add `redoFailed` to `KNOWN_COURSE_ITEM_FIELDS`** and key your "Remade — ready for you" badge, the
  "Saving a copy of the remade version…" placeholder and the round summary on its absence: with
  `redoFailed` present the video is the **old** one, and the label should say the redo failed (use
  `redoFailed.firstLine` or our `reason`).
- **Re-archive will fire once more for the unchanged file**, because your redo route parked your
  copy at dispatch. That is one wasted download and otherwise correct; `deliverableAvailable` is
  true on the returned lesson, so your archive queue picks it up and Approve unlocks as usual.
- Nothing else changes: `cancel`, `video/revise`, `approve` and `reject` behave as in the contract.

## Next test

Please build a new lesson and send one scene back, as before. We will watch for: `residueAvailable
true` at review, the new `reviewedSha256` and `…_final.r1.mp4` on Drive after the redo, only the
flagged scene's media bought, and the published bytes matching the `.r1` file after approve.
