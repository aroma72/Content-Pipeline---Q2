---
type: reference
last_verified: 2026-10-08
owner: aroma
---

# For the LMS team — choose a video style at the start of course creation

*Additive only. `contractVersion` stays `1.2`. A request that sends no `style` behaves exactly as
it did yesterday (it is built in `character-arc`).*

## What is new

Until now the course maker could only make one kind of video: an illustrated story following one
character, Ali. That is now one of **two styles**, and the instructor picks one **as the very
first step** of creating a course. Everything after that — the plan, the scripts, the voice, the
visuals and the music — follows the choice.

| id | Label | What it looks like | Cost per lesson |
|---|---|---|---|
| `character-arc` (default) | Character Arc | One illustrated character, Ali, followed through a single real scenario, with painted scenes and animated story moments. | ~$1.50 |
| `motion-graphics` | Flat Motion Graphics | Flat, colourful motion graphics: bold titles, icons and simple figures. Each skill is taught through a named model (e.g. SCARF, RASA, GROW) and walked through on real situations, spoken to the learner as "you". | ~$0.50 |

Each style has a **12-second preview video** you can play in the picker.

## What to build

**1. A style picker as the first screen of "Create a course".**
Fetch the list — don't hard-code it — and render a card per style: `label`, `summary`, `bestFor`,
`estimatedCostPerLessonUsd`, and the preview in a `<video>` element.

```
GET /api/v1/styles                 (public, no token)
→ {
    "default": "character-arc",
    "styles": [
      { "id": "character-arc", "label": "Character Arc", "default": true,
        "summary": "…", "bestFor": "…",
        "previewUrl": "https://<host>/api/v1/styles/character-arc/preview.mp4",
        "previewSeconds": 12, "estimatedCostPerLessonUsd": 1.5 },
      { "id": "motion-graphics", "label": "Flat Motion Graphics", "default": false, … }
    ],
    "howToUse": "…"
  }

GET /api/v1/styles/:styleId/preview.mp4   (public; Range requests supported → 206)
```

The same `styles` array is also on `GET /api/v1`.

**2. Send the chosen id as `style` on plan and build.**

```
POST /api/v1/courses/plan   { "topic": "…", "style": "motion-graphics", … }
POST /api/v1/courses/build  { "plan": <plan>, "confirmLessons": N, "series": "…", "style": "motion-graphics" }
```

`build` falls back to `plan.style` (the plan echoes the style it was made for), then to
`character-arc`. An unknown id is **400 `invalid_style`** on either route, before anything is
reserved or queued. `POST /demo/make-video` accepts the same optional `style`.

**3. In `motion-graphics`, the plan carries SLOs, models and walk-throughs — show them in the
plan editor.** These are what each video is built from:

```jsonc
{
  "style": "motion-graphics",
  "slos": [ { "id": "1.1", "text": "Explain the P&C Buddy's role at each stage of the employee journey" }, … ],
  "modules": [ { "title": "Week 1", "lessons": [ {
      "title": "Your Role as a P&C Buddy",
      "slo": "Given a journey moment, the learner can …",
      "sloIds": ["1.1", "1.2"],
      "models": [ { "name": "Empowerment Dynamic", "author": "David Emerald",
                    "summary": "Act as a Coach, not a Rescuer; the person is a Creator, not a Victim" } ],
      "walkthroughs": [ { "title": "Rescuer vs Coach",
                          "situation": "An employee says their manager never gives feedback. …" },
                        { "title": "The 3 E's", "situation": "…" } ],
      "brief": "…", "difficulty": "novice", "question": { … }
  } ] } ]
}
```

If an instructor edits the plan, keep at least **one model** and **two walk-throughs** per lesson —
`build` refuses a motion-graphics plan without them (**400 `invalid_plan`**, with the path of each
missing field), the same way it refuses a lesson with no SLO.

**4. Show the style on the course page.** `GET /api/v1/courses/:courseId` now returns `style` at the
top and on every item; `GET /demo/make-video/:jobId` returns `style` too. Items made before styles
existed report `character-arc`.

## What does not change

- The question checkpoint works exactly as before in both styles. In both, the question is **never
  in the video**: the LMS pauses, asks, requires an answer, shows the feedback, and resumes.
- Approval, review, files, Drive streaming and spend reporting are identical across styles.
- A course is one style throughout.

## Checked

`orchestrator/test-server.js` §"video styles" (6 tests: the list, both previews with Range, a
motion-graphics build storing the style on every lesson with its models in the brief, the default,
`invalid_style`/`invalid_plan` refusing before any reservation, and make-video). The storage test
was mutation-checked: forcing every lesson to `character-arc` turns it red.
