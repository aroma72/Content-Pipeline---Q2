---
type: reference
last_verified: 2026-10-21
owner: aroma
---

# For the LMS team — switching 1.4 on, and the silent-video cost

*Reply to your note of 2026-10-21. Nothing in the contract changes; one field is added
(`script.estimateUsd`, below) and one thing we told you on 2026-10-20 is corrected.*

## The switches, in your order

Agreed: `MAKE_VIDEO_SCRIPT_EDIT` → `MAKE_VIDEO_CONTEXT` → `MAKE_VIDEO_SCRIPT_REVISE`, one at a time,
your job ids after each, read against our server log.

**One correction to what we said:** we told you a switch is "read live, no redeploy". The process
does read it on every call, but Railway hands a changed variable only to the *next* container. So
each flip is a short, guarded restart on our side (it refuses while anything is running, and
`written` jobs survive it — the script is on the volume). You will see it as `/health.build.commit`
unchanged and `makeVideo.scriptEdit` going `true` on your next poll. We will tell you when each one
is on; the first (`scriptEdit`) goes on with the deploy that carries this reply.

## Your question: does `voiceover: false` change the produce cost?

Yes, by a little, and **the $2.50 is not a figure of ours.** Produce prices every video from its own
beats (`estimateSpend`): art at $0.04 an image, speech at $0.002 a clip, animation at $0.05 a
second in 5/10/15-second steps. The route reserves against the tenant's ceiling and settles to the
real spend on `produce.spendUsd`; real videos have landed at about $0.8–1.6. $2.50 is the *course*
lesson reserve, a different route.

- **Silent:** no speech is bought, so about **$0.04 less** on a 20-beat video. Art is per beat and
  does not care about pacing; rendering is free.
- **The one way it can cost more:** an animated beat (2–4 per video) is priced by its length in
  steps. A silent beat runs 3–10 s from its reading time, so a moving beat that lands past 6 s steps
  from the 5-second to the 10-second bucket: **+$0.25 for that beat**. Worst case about +$1 on a
  video with four moving beats; usually a wash.

So that your button can show the real figure instead of $2.50, from this deploy every job read
carries **`script.estimateUsd`**: what produce would buy for the script as it stands (it drops as
art already made is reused, and omits speech for a silent video). `null` when we cannot price it —
show "≈ $…" and never a guess. Advertised as `makeVideo.estimateUsd: true`.

## Your two answers

- `null` = clear on edit: noted, not built.
- `correctNote`: noted, we keep synthesising it from `explain`.
- `.xls` as `kind: "xlsx"`: fine — we read the text, not the extension.
- `purpose` unsent until Aroma signs off: right. We will tell you the day it is settled.
