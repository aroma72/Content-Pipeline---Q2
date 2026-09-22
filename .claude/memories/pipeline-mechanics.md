---
type: reference
last_verified: 2026-09-21
owner: aroma
---

How a lesson video actually gets made, and the constraints that are settled.

**This file holds mechanism, not policy.** The rules live in `CLAUDE.md` and
`.claude/standards/`; the full stage-by-stage spec lives in
`explainer-videos/EXPLAINER-VIDEO-PIPELINE-SPEC.md` and the `creating-explainer-videos` skill.
What belongs here is the *why* behind a stage and the failure it exists to prevent — the things
that get re-derived expensively when they are not written down.

---

## 1. The default pipeline

`beats.js` → Imagen art → Python cutout → Gemini TTS → Puppeteer/ffmpeg compile → brand bumpers.

Deliverable is always `<name>_final.mp4`, wrapped in Taleemabad bumpers — never the bare render.

Remotion + ElevenLabs are **legacy**: maintenance of pre-existing videos only, never new work.

## 2. Constraints that are settled — do not renegotiate without Aroma

- **The protagonist is always named Ali.** Every example, every video, no exceptions.
- **One protagonist, followed in depth** — friction → fix → structure → failure mode → payoff. Not a list of domain examples. This supersedes the older "3+ diverse examples" rule.
- **Every video carries a CHECKPOINT beat.** `{mode:'checkpoint', quiz:{stem, options, answer, correctNote, explain}}`. Never drawn, never spoken. The player pauses at that beat boundary, the LMS shows the question, the learner **must** click an option to continue — no skip, dismiss or seek-past — gets feedback that explains the mistake, then the video resumes.
- **Paid generation never fires implicitly.** Imagen and paid TTS require `--yes` / `CONFIRM_SPEND=1`. Ask first.
- **No paid AI video.** Veo was evaluated and rejected.

## 3. The checkpoint publish path — the one that fails silently

Taleemabad University draws the in-video question popup from the checkpoint API, which serves
`beats.js` **out of the deployed container**. So a question only reaches learners once its video
is committed, pushed and rebuilt.

Left to a human that step gets forgotten, and the failure is silent: the video ships, the popup
simply never appears. This is why `.claude/hooks/publish-checkpoints.sh` runs async on `Stop` with
a long timeout — a deploy takes minutes and must not hold up a session.

Enforcement is two-sided: `qa-checkpoint.js` fails the build if the beat is missing, and
`scripts/publish-checkpoint.js` verifies it live on Railway.

## 4. Known failure modes

Each of these cost real time; the fix is cheap once known.

| Symptom | Cause | Fix |
|---|---|---|
| SVG text cut off at diagram edges | viewBox too short for 7-node radials | viewBox ≥ 850px height; 60px clearance under circles for labels |
| Blank slides in a legacy render | frame count does not match VO | `frames = VO_seconds × 30`, max +30 buffer |
| Cutout fails / subject lost | dark-background art | force cream background |
| Stale visuals after a change | leftover `frames/` | `rm -rf frames/` and re-render |
| Compile produces wrong length | `clips != beats` | assert equality before compile |
| Submodule pointer breaks | wrong commit order | commit the submodule **first**, then the main-repo pointer |

Longer history: `.beads/failures.jsonl`.

## 5. Quality gate

Every video is rated on all 7 factors of `.claude/standards/QA_RATING_SYSTEM.md` before
publication. Minimum combined score **4.9/7.0**; below that is a FAIL and the video is remade.
Ratings are logged to `.beads/qa_ratings.jsonl`.

Note that file carries **two incompatible row shapes** — an older hand-written form
(`timestamp`/`video_id`/`combined_score`/`verdict`) and a newer machine-written one
(`type`/`at`/`runId`/`videoId`/`combinedScore`/`status`). Anything reading it must handle both.

## 6. Voiceover

Default is Gemini TTS via the explainer pipeline, one-take normalized (`tts-lesson.js`).

For legacy ElevenLabs videos: **never regenerate**. Extract the existing audio and edit the visuals
to match — `ffmpeg -i in.mp4 -vn -acodec aac -y out.aac`.

---

## Invalidation triggers

Any change to the beats format, art generation, TTS provider, cutout, compile, bumpers, or the
checkpoint contract.
