---
type: reference
last_verified: 2026-10-08
owner: aroma
---

# LMS patch: pick a video style when you create a course or a video

**Patch:** `lms-video-styles.patch` (one commit, `feat(content): pick a video style when creating a course or video`)
**Base:** `Orenda-Project/Taleemabad-University` `main` at `ed2abff` (fix(health): report the commit on hand-deployed staging via a BUILD_VERSION file)
**Partner contract:** Content Automation's integration request `docs/integration-requests/2026-10-08-video-styles.md`. The contract version stays `1.2` because the change only adds fields.

## Apply

```bash
git checkout -b feat/video-styles origin/main
git am lms-video-styles.patch
```

I checked that it applies cleanly with `git am` on `ed2abff`.

## What it does

Content Automation now makes videos in one of two **styles**:

- **Character Arc** (`character-arc`): the illustrated Ali story. This is the default, and every course and video made before this change used it.
- **Flat Motion Graphics** (`motion-graphics`): flat motion graphics that speak to the learner as "you". Each lesson is built from at least one named **model** and at least two **walk-throughs**.

The instructor picks the style on the same form where they type the topic. This works in both **Build with AI → Build a course** and **Build with AI → Make a video**. The style is sent on plan, build and make-video, stored, and shown as a badge on the course and video status pages.

### The motion-graphics difference in this LMS

The LMS course builder writes the plan itself ("authored mode", bd-097). It does not call their planner. Their planner would normally produce the models and walk-throughs, so in motion-graphics **the instructor writes them per video**. The server then builds the plan in the same shape their motion planner returns:

- course `slos: [{id:"1.1", text}]`, one per video, numbered `week.video`
- per lesson: `sloIds`, `models[{name, author?, summary?}]` and `walkthroughs[{title?, situation}]`

Their rule is checked in three places: the form, `POST /api/content-courses` and `POST /:id/build`. A motion lesson with no model, or with fewer than two walk-throughs that each have a situation, is refused **before anything is stored or charged**. If their build still answers `400 invalid_plan` or `invalid_style`, the error carries the message for each lesson and the money we authorised is reversed.

## Files

### API (`apps/api`)

| File | Change |
|---|---|
| `src/lib/content-queen-styles.ts` | **New.** `getStyles()` reads `GET /api/v1/styles`, which is public and needs no token. The result is normalised field by field, cached for 5 minutes, and the last good list is served if a refresh fails. The previews come from their URL path, but the host is rebuilt from `CONTENT_QUEEN_API_URL`, because they build URLs from the request protocol and behind Railway's proxy that can be `http`, which would be mixed content on our https page. Also: `VIDEO_STYLES`, `parseStyleInput`, `motionPlanErrors()` (a copy of their `planner.validate` motion branch, using the same `modules[i].lessons[j].x` paths), and a warning for fields we do not read, with a reset seam. |
| `src/lib/content-queen-courses.ts` | Types gain `PlannedModel`, `PlannedWalkthrough`, `PlannedSlo`, `CoursePlan.style/slos`, `PlannedLesson.sloIds/models/walkthroughs`, and `CourseState.style`. `buildAuthoredPlan` takes `style`. In motion-graphics it cleans, checks and carries models and walk-throughs, numbers the SLOs, and applies the course-tag guard to the new text as well. `planCourse` and `buildCourse` **always send** `style`. A `400` from build (`invalid_plan`/`invalid_style`) now maps to reason `invalid`, which reverses the authorisation, and its detail includes their `errors[].message`. `style` is added to the known course and item fields. |
| `src/lib/content-queen-jobs.ts` | `createJob(topic, style = 'character-arc')` sends `style`. A `400` maps to `invalid`. `style` is added to `KNOWN_JOB_FIELDS` and to `PartnerJob.style`. |
| `src/db/schema.ts` | `content_video_jobs.style` and `content_courses.style` are `text NOT NULL DEFAULT 'character-arc'`. |
| `migrations/0067_content_video_style.sql` + `meta/_journal.json` + `src/db/migrate.ts` | **Migration** (see below). It is mirrored in `migrate.ts` per Rule B. |
| `src/routes/content-courses.ts` | **New `GET /api/content-courses/styles`**, declared before `/:id` and gated by `content_courses:read`. `POST /` accepts `style` and answers `400 {error:'invalid_style', detail}` for an unknown one. It is forwarded to the authored builder and the planner, stored in the column, echoed on `plan.style`, and returned as `style` in the response. `COURSE_PUBLIC` gains `style`, so `GET /` and `GET /:id` return it. `POST /:id/build` reads the **stored** style, runs `motionPlanErrors` before any ledger row (answering `400 {error:'invalid_plan', detail, errors}`), and sends `style`. A partner `invalid` refusal answers 400 instead of 502. |
| `src/routes/content-videos.ts` | **New `GET /api/content-videos/styles`**, gated by `content_videos:read` and placed before `/:id`. `POST /` accepts and validates `style` **before** the hourly gate, so a bad style never uses up one of the 6 shared starts. It stores the style and passes it to `createJob`, and a partner `invalid_style` answers 400. `JOB_COLUMNS` gains `style`. |
| `tests/unit/content-queen-styles.test.ts` | **New**, 19 tests: parsing, normalisation (preview URL rebuilt, unknown fields dropped, a single default), the cache and the outage path, authored motion plans (accepted, and refused on missing model, on fewer than 2 walk-throughs, and on a course tag), `motionPlanErrors` paths, `style` on the wire for build and make-video, and the 400 mapping. |
| `tests/unit/content-queen-courses.test.ts` | The plan-body expectation now includes `style: 'character-arc'`, which is always sent. |
| `tests/unit/partner-clients-detect-drift.test.ts` | Registers `content-queen-styles.ts`. The guard test requires every `content-queen-*.ts` client to warn on fields it does not read. |

Workers: **no change.** `content-course-poll.ts` and `content-video-poll.ts` do not need the style. We keep our own copy, and their `style` on course, item and job is recognised, so the unknown-field log stays quiet.

### Web (`apps/web`)

| File | Change |
|---|---|
| `src/lib/video-styles.ts` | **New**, pure helpers with no React: the `VideoStyleInfo`/`WritingStyle` types, `loadStyles('courses'|'videos')`, `initialStyle`, `styleLabel`, `isMotion`, the motion field rows (`emptyMotionFields`, `motionGaps`, `motionPayload`, `motionFieldsFromPlan`) and `costPerVideoText`. |
| `src/lib/video-styles.test.ts` | **New**, 10 tests. |
| `src/components/VideoStyle.tsx` | **New.** `VideoStylePicker` (normal and compact), `StyleBadge`, `MotionFieldsEditor` (the model and walk-through rows for one video), `CourseSlos` and `MotionLessonDetails`. |
| `src/app/build/CourseBuilderForm.tsx` | The picker sits in step one under "What should learners be able to do?", in a new field titled **"What kind of video?"**. The default comes from the list's `default:true`. In motion-graphics every video row gets the model and walk-through editor, and "Generate Course" stays disabled until each video meets the minimum. The form says what is missing. `style`, models and walk-throughs are sent with the plan. After saving, the style shows as a badge and the course SLOs are listed. The confirm dialog adds "Every video is made in …". A resumed plan restores the style and every model and walk-through. |
| `src/app/build/MakeVideoForm.tsx` | A compact picker under the topic, and `style` sent on `POST /api/content-videos`. |
| `src/app/courses/build/[id]/page.tsx` | A style badge beside the title. In motion-graphics: the course SLOs list, and for each lesson its SLO id chips, models with authors, and walk-throughs, read from the stored plan. |
| `src/app/videos/[id]/page.tsx` | A style badge beside "Topic". |
| `src/lib/course-resume.ts` (+ test) | `CourseDetail.style`, `plan.slos` and lesson motion fields. `ResumeState.style`, per video `motion`, and `planned.style/slos`. Two new tests: a motion round-trip, and old courses defaulting to Character Arc. |
| `src/lib/content-courses-client.ts` | `PlanRequest.style`, plus per-video `models`/`walkthroughs`. |

## Migration

**Yes: `0067_content_video_style.sql`.**

```sql
ALTER TABLE "content_video_jobs" ADD COLUMN IF NOT EXISTS "style" text NOT NULL DEFAULT 'character-arc';
ALTER TABLE "content_courses"    ADD COLUMN IF NOT EXISTS "style" text NOT NULL DEFAULT 'character-arc';
```

- It only alters tables that the numbered migrations 0052 and 0054 create, so it is safe on a fresh database. It is also mirrored in `migrate.ts` per Rule B and registered in `_journal.json` (idx 67).
- On Postgres 11+, adding a column with a constant default only changes metadata, so neither table is rewritten. Existing rows read `character-arc`, which is exactly what their API reports for old items.
- There is no CHECK constraint, on purpose, for the same reason `content_courses.status` has none: the set of styles is theirs and grows. The routes validate against `VIDEO_STYLES`.
- It runs through the normal `pnpm db:migrate` (the start command already runs it).

## Env / config

- **Nothing new.** It uses the existing `CONTENT_QUEEN_API_URL`. The styles list and previews are public on their side, so no token is needed for them.
- The preview `<video>` loads straight from `CONTENT_QUEEN_API_URL/api/v1/styles/<id>/preview.mp4`. The web app sets no CSP, so nothing needs allow-listing. If a `media-src` CSP is added later, include that host.
- The style list does **not** depend on `CONTENT_QUEEN_JOBS_ENABLED`, because it is free. Creating anything still does.

## Verification I ran (locally, no secrets)

- `pnpm install --frozen-lockfile --ignore-scripts`, then I built `packages/shared` with `tsc`.
- **`apps/api`: `tsc --noEmit` passes (exit 0).**
- **`apps/web`: `tsc --noEmit` passes (exit 0).**
- **API unit suite** (`VITEST_SUITE=unit vitest run`), compared against the same run on the untouched base:
  - Before: 1280 tests, 49 failed, 65 suites failed.
  - After: 1301 tests, 49 failed, 65 suites failed.
  - **Zero new failures.**
  - The existing failures are environmental. This machine runs Node 24, but the repo pins 22, and drizzle-orm hits `ERR_REQUIRE_CYCLE_MODULE` under Node 24. They fail identically without the patch.
  - All `content-queen-*` suites, including the new one, pass, as does `partner-clients-detect-drift`.
- **Web unit tests**: all 25 `src/lib` test files pass. Across the whole app, 37 of 38 files pass. The one failure, `src/app/anchor-targets-exist.test.ts`, fails identically on the base.
- **ESLint** on the touched files: no new errors. The remaining errors (`schema.ts` unused `t`, duplicate rbac import in `content-videos.ts`, a floating promise in the existing rehydrate effect of `CourseBuilderForm.tsx`) are already on `main`, with the same count before and after.
- **Not run:**
  - The **integration suite**, which needs Postgres. Run `pnpm test:integration` in CI. `tests/integration/content-courses.test.ts` does not assert full build or plan bodies, so I expect no change, but I have not confirmed it.
  - **No browser or Playwright run**, so the UI is checked by type only, not visually.

## How to test by hand

1. Apply the patch, then run `pnpm db:migrate` and `pnpm dev`. Log in as an instructor.
2. **Build with AI → Build a course.** Under "What should learners be able to do?" you should see **"What kind of video?"** with two cards, each with a 12-second muted, looping preview. Character Arc is preselected.
3. Open **"Rules and sample lines"** on Flat Motion Graphics. The motion sample lines show their read cue small and in grey italics.
4. Select **Flat Motion Graphics** and add a video with a title and SLO. "Generate Course" stays disabled, and the row says "Still needs a model and two walk-throughs". Fill in one model (name and author) and two situations, and the button enables.
5. Generate. The form locks, a "Flat Motion Graphics" badge replaces the picker, and **Course outcomes (SLOs)** lists `1.1 …`.
6. Reload with `?tab=course&focus=<id>`. The style, models and walk-throughs all come back.
7. Create the course, enter a series, and open the confirm dialog. It lists "Every video is made in Flat Motion Graphics". This spends real money, so only confirm on staging with spend enabled.
8. On `/courses/build/<id>`: the style badge shows next to the title, then the SLO list, and each lesson shows its `SLO 1.1` chip, its models with authors, and its walk-throughs.
9. **Make a video**: a compact picker under the topic. Pick Flat Motion Graphics and start. `/videos/<id>` shows the badge. On the API side, `content_video_jobs.style` = `motion-graphics`.
10. Negative checks:
    - `curl -X POST /api/content-courses -d '{"topic":"x","style":"claymation","weeks":[...]}'` answers `400 {"error":"invalid_style","detail":"Unknown video style …"}`.
    - The same request for make-video answers 400 and does not use an hourly start.
    - Stop their service and open the form. The picker shows an amber note, "… This will be made in Character Arc", and the form still works.

## What the new UI looks like (no screenshots)

**Build a course, step one card.** After the three text fields comes a heading, **"What kind of video?"**, with a grey line saying every video in the course uses this style and pointing to "Rules and sample lines". Below it is a two-column grid of cards, one column on narrow screens.

Each card is a white rounded box. The selected one has a brand-blue border and a soft ring.

- **Top:** a 16:9 dark video area playing the 12-second preview, muted and looping.
- **Then:** the style name in bold with a radio dot on the right, the summary in grey, "Best for: …", and a small light-grey line, "Content Automation estimates about $1.50 per video".
- **"HOW THE SCRIPT SOUNDS"** (small caps label), under a divider:
  - "Narrator: …" and "Voice: …" are always visible.
  - A blue **"Rules and sample lines"** disclosure opens a bulleted list of rules, then a quoted block of sample lines with a blue left rule. Motion lines are followed by their read cue, e.g. *(with a warm, welcoming smile)*, small and italic.

**Flat Motion Graphics, per video.** Under each video's title and SLO is a dashed blue-bordered panel:

- **"Model it teaches through"**: name and author side by side, with an optional one-line summary under them, and "+ Another model" (up to 3).
- **"Walk-throughs (at least two)"**: two grey boxes, each with an optional title and a situation textarea, and "+ Another walk-through" (up to 5). Rows above the minimum get a red ✕.

While a video is short of the minimum, an amber line reads "Still needs a model and two walk-throughs". At the bottom, "N videos still need a model and two walk-throughs before this can be saved."

**After saving.** The picker is replaced by a small blue pill with the style name and the text "This course is made in this style". In motion-graphics, a "Course outcomes (SLOs)" box lists `1.1`, `1.2`, … in blue monospace chips with their text.

**Make a video.** Under the topic is the same picker in a compact form: smaller previews and tighter padding.

**Status pages.** The course page (`/courses/build/:id`) shows a blue pill next to the course title. In motion-graphics it also shows the SLO box, and each lesson card shows `SLO 1.1` chips, "Model: Empowerment Dynamic — David Emerald" and a bulleted "Walk-throughs" list. The video page (`/videos/:id`) shows the pill at the right of the "TOPIC" label.

## Not done / follow-ups

- **Library tab badge.** `LibraryItem` (`apps/api/src/lib/build-library.ts`) does not carry `style` yet. Adding it means touching `videoItem`, `courseItem` and `lessonItem`, plus their tests. It is a small, separate change.
- **Their planner path** (`POST /api/content-courses` without `weeks`) now sends `style`, and its motion plan, with `slos`, `models` and `walkthroughs`, is stored and displayed. The web app does not use that path today. Plans stay immutable after saving, as in their §8, so there is no plan editor to update. The "kept when building" requirement holds because build sends the stored plan exactly as saved.
- The repo's `.claude/docs/planning/` and `.beads/` conventions were not touched. Add a plan note or bead if the team wants one.
