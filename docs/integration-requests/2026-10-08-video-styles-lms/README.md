---
type: reference
last_verified: 2026-10-08
owner: aroma
---

# LMS patch: pick a video style when you create a course or a video

- **Patch:** `lms-video-styles.patch` is one commit, `feat(content): pick a video style when creating a course or video`.
- **Base:** `Orenda-Project/Taleemabad-University` `main` at `ed2abff` (fix(health): report the commit on hand-deployed staging via a BUILD_VERSION file).
- **Partner contract:** Content Automation's integration request `docs/integration-requests/2026-10-08-video-styles.md`, plus their `POST /api/v1/courses/draft-teaching`. The contract stays at version `1.2` because everything is additive.

## Apply

```bash
git checkout -b feat/video-styles origin/main
git am lms-video-styles.patch
```

I checked that it applies cleanly with `git am` on `ed2abff`, and the result matches the branch exactly.

## What it does

Content Automation now makes videos in one of two **styles**:

- **Character Arc** (`character-arc`): the illustrated Ali story. This is the default, and everything made before this change used it.
- **Flat Motion Graphics** (`motion-graphics`): flat motion graphics that speak to the learner as "you". Each lesson is built from at least one named **model** and at least two **walk-throughs**.

The instructor picks the style on the same form where they type the topic. This works in **Build with AI → Build a course** and in **Build with AI → Make a video**. The style is sent on plan, build and make-video. It is stored, and it shows as a badge on the course and video status pages.

### Motion graphics: drafted by AI, then edited by the instructor

The LMS course builder writes the plan itself ("authored mode", bd-097). The instructor names each video and writes its SLO. In motion-graphics, the models and walk-throughs are then **drafted by Content Automation** and the instructor edits them:

1. **Automatic first draft.** The first draft runs on its own the first time the instructor moves on from the titles and SLOs:
   - "Moves on" means a title or SLO field loses focus, or the instructor switches the style to motion graphics.
   - It only runs when every video has both a title and an SLO, and when nothing has been drafted or edited by hand yet.
   - It runs once per form, even if it fails. A failure leaves the button; it does not retry in a loop.
2. **The button.** "Draft models & walk-throughs with AI" is always available once every video has a title and an SLO. After the first draft it reads **"Redraft"**.
3. **Loading state.** While the call runs, the button area shows "Drafting… this takes about half a minute." The model and walk-through editors are locked, and so is "Generate Course".
4. **Results.** Each video's model(s) and walk-throughs, and the course's numbered SLOs, land as **ordinary editable fields**. The manual editor stays exactly as it was.
   - Each video shows its `SLO 1.1` chips, tagged "drafted — edit freely" or "edited by you".
   - The course SLOs appear as editable text with their id chip.
5. **Hand edits are never overwritten silently.** Any keystroke in a video's model or walk-through marks that video as edited. Changing a course SLO marks the SLOs as edited.
   - If anything is edited, Redraft opens an **in-page confirm** (no `window.confirm`) with three choices: "Keep my edits, redraft the rest" / "Replace everything" / "Cancel".
   - A video whose title or SLO changed while the draft was running is **left alone**, even under "Replace everything". The status line says so.
6. **The existing rule still holds.** "Generate Course" needs at least one named model and at least two walk-throughs with a situation in every video. What is sent:
   - each video's (edited) models, walk-throughs and drafted `sloIds`;
   - the (edited) course `slos`.
   - On the server, `buildAuthoredPlan` keeps the drafted SLO ids that exist in the course list. A video with none gets its own numbered SLO (`week.video`), as before drafting existed.

The draft is one model call on their side (about 20–40 s). Nothing is stored, queued or charged. Their rule (one model, two walk-throughs) is checked in three places: the form, `POST /api/content-courses` and `POST /:id/build`. All three run before anything is stored or charged. If their build still answers `400 invalid_plan` or `invalid_style`, the error carries the message for each lesson and the money we authorised is reversed.

## New and changed endpoints (LMS API)

| Route | Auth | Notes |
|---|---|---|
| `GET /api/content-courses/styles` | `requireAuth` + `content_courses:read` | Content Automation's style list, normalised and cached for 5 minutes. On failure: `502` with a `detail` sentence. |
| `GET /api/content-videos/styles` | `requireAuth` + `content_videos:read` | The same list, under the video router's permission. |
| **`POST /api/content-courses/draft-teaching`** | `requireAuth` + `content_courses:create` (same as planning) | See the full contract below. |
| `POST /api/content-courses` | (unchanged) | New optional fields: `style`, `slos`, and per video `models`, `walkthroughs` and `sloIds`. An unknown style is `400 {error:'invalid_style', detail}`. |
| `POST /api/content-courses/:id/build` | (unchanged) | Sends the **stored** style. A motion plan that breaks the rule is `400 {error:'invalid_plan', detail, errors}` before any charge. |
| `POST /api/content-videos` | (unchanged) | New optional `style`, checked before the hourly gate. |
| `GET /api/content-courses[/:id]`, `GET /api/content-videos/:id` | (unchanged) | Now return `style`. |

**`POST /api/content-courses/draft-teaching` in full:**

- **Body:** `{ topic?, audience?, lessons: [{ title, slo }] }`, in course order, 1–30 lessons.
- **Validated here first:**
  - An empty list, a missing title or SLO, more than 30 lessons, or a course-tag string → `400 { error, detail: "Video 2 needs a title and an SLO before it can be drafted." }`.
  - None of these ever reaches Content Automation.
- **Forwarded to** their `POST /api/v1/courses/draft-teaching` with the bearer token, with a 120 s timeout.
- **Answer:** `200 { style: "motion-graphics", slos, lessons: [{ index, title, sloIds, models, walkthroughs }], draftedAt }`. It is normalised field by field and must match the request one for one: a lesson count or index that does not match is refused as `502`.
- **Their errors:**

  | Their answer | Our answer |
  |---|---|
  | `400 bad_request` | `400`, with **their sentence** as `detail` |
  | `5xx draft_failed`, a network failure, or a mismatched answer | `502`, detail "…Nothing was charged — try again, or write them yourself." |
  | `429` | `429` |
  | Kill switch off (`CONTENT_QUEEN_JOBS_ENABLED`) | `503` |

## Files

### API (`apps/api`)

| File | Change |
|---|---|
| `src/lib/content-queen-styles.ts` | **New.** <ul><li>`getStyles()` for the public `GET /api/v1/styles`: normalised field by field, cached for 5 minutes, and the last good list is served if a refresh fails.</li><li>The preview URL is rebuilt on `CONTENT_QUEEN_API_URL`, because they mint it from the request protocol, which can be `http` behind Railway's proxy and would then be blocked as mixed content.</li><li>Also `VIDEO_STYLES`, `parseStyleInput`, and `motionPlanErrors()`, which copies their `planner.validate` motion branch and paths.</li><li>A warning for fields we do not read, with a reset seam.</li></ul> |
| `src/lib/content-queen-courses.ts` | <ul><li>**Drafting:** `draftTeaching()`, `parseDraftTeachingBody()`, `normaliseTeachingDraft()` and `DRAFT_MAX_LESSONS`.</li><li>**Plan types:** models, walk-throughs, SLOs, `plan.style`, `CourseState.style`.</li><li>**`buildAuthoredPlan`:** takes `style`, drafted `slos` and per-video `sloIds`. It validates, cleans and carries the motion fields, and applies the course-tag guard to all the new text.</li><li>**On the wire:** `planCourse` and `buildCourse` always send `style`. A build `400` (`invalid_plan`/`invalid_style`) maps to `invalid`, which reverses our authorisation, and its detail includes their `errors[].message`.</li><li>`style` is added to the known fields, so the unknown-field log stays quiet.</li></ul> |
| `src/lib/content-queen-jobs.ts` | `createJob(topic, style)` sends `style`. A `400` maps to `invalid`. `style` is added to the known fields and to `PartnerJob`. |
| `src/routes/content-courses.ts` | The two new routes (`/styles`, `/draft-teaching`), `style` and `slos` on plan, the stored style plus the motion pre-check on build, and `style` in `COURSE_PUBLIC`. |
| `src/routes/content-videos.ts` | `/styles`, and `style` validated, stored and forwarded on create. `JOB_COLUMNS` gains `style`. |
| `src/db/schema.ts`, `migrations/0067_content_video_style.sql`, `migrations/meta/_journal.json`, `src/db/migrate.ts` | The `style` column on both tables (see Migration). |
| `tests/unit/content-course-draft-teaching.test.ts` | **New**, 18 tests. <ul><li>Body validation, with no fetch for a bad body.</li><li>The client: bearer token and body; 400 → `invalid` with their sentence; 5xx → `unavailable`; a draft that does not match one for one refused; the kill switch.</li><li>Drafted SLO ids kept in the authored plan, with a fallback number when an id is unknown.</li><li>**The route over HTTP** (supertest, with the DB and middleware mocked): 200 pass-through, 400 for a bad body without a fetch, their 400 sentence passed through, 5xx → 502 "Nothing was charged", 503 when switched off, 403 without `content_courses:create`.</li></ul> |
| `tests/unit/content-queen-styles.test.ts` | **New**, 19 tests: styles, normalisation, cache, the motion rule, `style` on the wire, the 400 mapping. |
| `tests/unit/content-queen-courses.test.ts` | The plan-body expectation now includes `style`, which is always sent. |
| `tests/unit/partner-clients-detect-drift.test.ts` | Registers the new styles client in the unknown-field guard. |

The workers (`content-course-poll.ts`, `content-video-poll.ts`) are **unchanged**.

### Web (`apps/web`)

| File | Change |
|---|---|
| `src/lib/video-styles.ts` | Pure helpers. <ul><li>**Styles:** `loadStyles`, `initialStyle`, `styleLabel`, `isMotion`.</li><li>**The motion rows:** `emptyMotionFields`, `motionGaps`, `motionPayload`, `motionFieldsFromPlan`.</li><li>**Drafting:** `canDraft`, `shouldAutoDraft`, `draftRequestLessons`, `editedVideoCount`.</li><li>**`applyDraft`:** never replaces an edited video unless `replaceEdited`, and never touches a video whose title or SLO changed since the request.</li><li>**`applyDraftSlos`:** the same rule for the course SLOs.</li></ul> |
| `src/lib/video-styles.test.ts` | 19 tests, including the "don't overwrite edited fields" merge, the changed-while-drafting skip, and every condition of the automatic draft. |
| `src/lib/content-courses-client.ts` | `draftTeaching()` with its own 150 s timeout (apiRequest's default 25 s is shorter than a draft), and `PlanRequest` with `style`, `slos`, models, walk-throughs and `sloIds`. |
| `src/components/VideoStyle.tsx` | **New.** `VideoStylePicker` (normal and compact), `StyleBadge`, `MotionFieldsEditor`, `CourseSlos`, `MotionLessonDetails`. |
| `src/app/build/CourseBuilderForm.tsx` | <ul><li>The picker, under "What should learners be able to do?".</li><li>The **draft panel** at the top of "The videos" card: the button or Redraft, the loading state, the inline confirm, the result note, and the editable course SLOs.</li><li>The automatic first draft, per-video SLO chips, edit tracking, and the payload carrying `slos` and `sloIds`.</li></ul> |
| `src/app/build/MakeVideoForm.tsx` | A compact picker, and `style` on create. |
| `src/app/courses/build/[id]/page.tsx` | A style badge. In motion-graphics: the course SLOs, and per lesson the SLO chips, models with authors, and walk-throughs. |
| `src/app/videos/[id]/page.tsx` | A style badge. |
| `src/lib/course-resume.ts` (+ test) | A resumed plan restores the style, the course SLOs, and each video's models, walk-throughs and `sloIds`. |

## Migration

**Yes: `0067_content_video_style.sql`.**

```sql
ALTER TABLE "content_video_jobs" ADD COLUMN IF NOT EXISTS "style" text NOT NULL DEFAULT 'character-arc';
ALTER TABLE "content_courses"    ADD COLUMN IF NOT EXISTS "style" text NOT NULL DEFAULT 'character-arc';
```

- It only alters tables that the numbered migrations 0052 and 0054 create, so it is safe on a fresh database. It is mirrored in `migrate.ts` per Rule B and registered in `_journal.json` (idx 67).
- On Postgres 11+, adding a column with a constant default only changes metadata, so neither table is rewritten. Old rows read `character-arc`, which is what their API reports for old items.
- There is no CHECK constraint, on purpose: the set of styles is theirs and grows. The routes validate against `VIDEO_STYLES`.
- Drafting stores nothing, so it needs no migration of its own.

## Env / config

- **Nothing new.** It uses the existing `CONTENT_QUEEN_API_URL` and `CONTENT_QUEEN_API_TOKEN`.
- Drafting is gated by the free switch `CONTENT_QUEEN_JOBS_ENABLED`, like planning. The style list is public and is not gated.
- The previews load straight from `CONTENT_QUEEN_API_URL/api/v1/styles/<id>/preview.mp4`. The web app sets no CSP. If a `media-src` CSP is added later, include that host.
- **Content Automation must have deployed `draft-teaching`.** Until they have, the button reports their answer as "could not draft … write them yourself", and the manual editor still works.

## Verification I ran (locally, no secrets)

- **Setup:** `pnpm install --frozen-lockfile --ignore-scripts`, then I built `packages/shared` with `tsc`.
- **Typecheck:**
  - `apps/api`: `tsc --noEmit` passes (exit 0).
  - `apps/web`: `tsc --noEmit` passes (exit 0).
- **API unit suite** (`VITEST_SUITE=unit vitest run`), compared against the same run on the untouched base:

  | | Tests | Passed | Failed | Suites failed |
  |---|---|---|---|---|
  | Before (base) | 1280 | 1231 | 49 | 65 |
  | After (this patch) | 1319 | 1270 | 49 | 65 |

  - **Zero new failures.**
  - The existing failures are environmental. This machine runs Node 24, but the repo pins 22, and drizzle-orm hits `ERR_REQUIRE_CYCLE_MODULE` under Node 24. They fail identically on the base.
  - These suites pass: `content-course-draft-teaching` (18), `content-queen-styles` (19), `content-queen-courses` (81) and `partner-clients-detect-drift` (7).
- **Web vitest:**
  - All 25 `src/lib` test files pass.
  - Across the whole app, 37 of 38 files pass. The one failure, `src/app/anchor-targets-exist.test.ts`, fails identically on the base.
- **ESLint** on the touched source files: no new errors. Six errors remain and are already on `main` (`schema.ts` unused `t` ×3, duplicate rbac import ×2 in `content-videos.ts`, and the floating promise in the existing rehydrate effect of `CourseBuilderForm.tsx`). The count is the same before and after.
- **Not run:**
  - The **integration suite**, which needs Postgres.
  - **No browser or Playwright run**, so the UI is checked by type and unit tests only.
  - **No call to the live `draft-teaching`.** The client is tested against the contract in the coordinator's message, with mocked `fetch`.

## How to test by hand

1. Apply the patch, then run `pnpm db:migrate` and `pnpm dev`. Log in as an instructor. `CONTENT_QUEEN_JOBS_ENABLED=true` needs to be set, with the token.
2. **Build with AI → Build a course.** Under "What should learners be able to do?" you should see **"What kind of video?"** with two cards. Each has a 12-second muted, looping preview, and Character Arc is preselected. Open "Rules and sample lines"; motion sample lines show their read cue small and italic.
3. Select **Flat Motion Graphics**. A blue "Models & walk-throughs" panel appears at the top of "The videos", saying "Give every video a title and an SLO, and they will be drafted for you."
4. Write two videos (title and SLO each), then click out of the last field. **The draft starts by itself**: "Drafting… this takes about half a minute." The editors and "Generate Course" are locked while it runs.
5. When it returns:
   - each video's model (with author) and two or more walk-throughs are filled in;
   - each video shows `SLO 1.1` chips tagged "drafted — edit freely";
   - the panel lists the editable course SLOs;
   - a green note reads "Drafted 2 videos. Everything below is yours to edit."
6. Edit one walk-through in video 1. Its tag becomes "edited by you".
7. Click **Redraft**. An amber inline box appears: "You have changed 1 video by hand…".
   - **Keep my edits, redraft the rest**: video 1 is unchanged, video 2 is redrafted, and the note says your edits on 1 video were kept.
   - **Replace everything**: both videos are redrafted.
   - **Cancel**: nothing changes.
8. Start a Redraft, then rename video 2 while it runs. Video 2 is left alone, and the note says so.
9. Delete a walk-through's situation so that a video has only one. "Generate Course" disables, and "Still needs a second walk-through" appears under the video.
10. Generate:
    - The form locks.
    - The picker becomes a "Flat Motion Graphics" badge.
    - The SLO list shows your edited text.
    - Reload with `?tab=course&focus=<id>`: everything comes back.
11. On `/courses/build/<id>`: a badge, the SLO list, and per lesson its chips, models with authors, and walk-throughs.
12. Build: create the course and enter a series. The confirm dialog lists "Every video is made in Flat Motion Graphics". This spends real money, so use staging only.
13. **Make a video**: a compact picker under the topic. `/videos/<id>` shows the badge, and `content_video_jobs.style` holds the chosen style.
14. Negative checks:
    - `POST /api/content-courses/draft-teaching` with `{"lessons":[{"title":"a"}]}` → `400` "Video 1 needs a title and an SLO before it can be drafted."
    - `POST /api/content-courses` with `"style":"claymation"` → `400 invalid_style`.
    - Stop their service: the picker shows an amber note and falls back to Character Arc, and the draft panel shows "Could not draft… write them yourself" while the manual editor keeps working.

## What the new UI looks like (no screenshots)

**Step one card.** After the three text fields comes **"What kind of video?"**, with a two-column grid of style cards (one column on narrow screens). The selected card has a brand-blue border and ring. Each card has:

- a 16:9 dark looping preview;
- the bold name with a radio dot;
- the summary, "Best for: …", and "Content Automation estimates about $X per video";
- under a divider, **HOW THE SCRIPT SOUNDS**: Narrator and Voice lines, plus a blue **"Rules and sample lines"** disclosure. It opens a bulleted list of rules and a quoted block of sample lines, with motion read cues in small grey italics.

**The videos card, in motion graphics.** A pale-blue panel titled **"Models & walk-throughs"** sits at the top:

- **Top right:** a white **"Draft models & walk-throughs with AI"** button with a wand icon, which reads **"Redraft"** after the first draft. While a draft runs, a blue spinner reads "Drafting… this takes about half a minute."
- **Status lines:** the inline amber confirm with its three buttons, a red error line, or a green result note.
- **Course outcomes (SLOs):** each SLO as a blue mono id chip next to an editable text field.

Each video row has its title and SLO, then a line of `SLO 1.1` chips tagged "· drafted — edit freely" or "· edited by you". Below that is a dashed blue panel:

- **"Model it teaches through":** name and author, plus an optional one-line summary, with "+ Another model" (up to 3).
- **"Walk-throughs (at least two)":** grey boxes, each with an optional title and a situation textarea, with "+ Another walk-through" (up to 5). Rows above the minimum get a red ✕.

While a video is short of the minimum, an amber "Still needs …" line shows under it, and a summary line at the bottom of the card counts them.

**After saving.** A style pill replaces the picker, and the course SLOs are listed read-only.

**Make a video.** The same picker in a compact form under the topic.

**Status pages.**

- **`/courses/build/:id`:** a pill next to the title. In motion-graphics, an SLO box, and on each lesson its `SLO x.y` chips, "Model: Name — Author", and the walk-through bullets.
- **`/videos/:id`:** a pill at the right of "TOPIC".

## Not done / follow-ups

- **Library tab badge.** `LibraryItem` in `apps/api/src/lib/build-library.ts` does not carry `style` yet. It is a small, separate change.
- **No live call to `draft-teaching`.** I tested it only against the contract we were sent.
- **Integration tests and a browser run** were not done (see Verification).
- **The draft is not stored.** Leaving the page before "Generate Course" loses unsaved drafts and edits, the same as the rest of the unsaved form today.
- **Repo bookkeeping.** The repo's `.claude/docs/planning/` and `.beads/` conventions were not touched.
