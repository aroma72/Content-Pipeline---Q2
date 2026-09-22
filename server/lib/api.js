'use strict';
/**
 * api -- the read API the LMS (Taleemabad University) calls.
 *
 * Scope is deliberately tiny, and read-only: the LMS asks "what questions belong
 * to this video, and when do they fire". Nothing here can start work, spend
 * money, change a video, or store anything -- answers live in the LMS.
 *
 * Auth. Lesson answers are behind a bearer token, because the payload contains
 * `correctIndex` -- publishing it unauthenticated would hand every learner the
 * answer key. The index at GET /api/v1 is public and carries no lesson data, so
 * a developer can discover the surface without a credential.
 *
 * Fail closed. With no credential configured at all -- neither CONTENT_API_TOKEN
 * nor TENANTS_JSON -- the data routes answer 503 rather than serving openly. A
 * misconfigured deploy must not silently become public.
 *
 * Who is calling. Every authenticated route resolves the bearer token to a
 * tenant (see tenants.js) and leaves it on req.tenant, so spend and approvals
 * can be attributed to the organisation that asked for them rather than all
 * landing under Aroma's name.
 *
 * Calling pattern. Prefer server-to-server: the LMS backend fetches the payload
 * with the token and hands its own page only what that learner needs. A browser
 * calling this directly would have to ship the token to the client, and would
 * need CORS -- available via CONTENT_API_ORIGINS for local development, but it
 * is not the intended production path.
 */

const express = require('express');
// Streaming a deliverable off the volume needs the filesystem: see the lesson
// /file route. It was absent, and a missing require here fails at REQUEST time
// rather than at load, so the route would have 500'd for the LMS and looked fine
// in every startup check.
const fs = require('fs');
const path = require('path');
const checkpoints = require('./checkpoints');

const tenants = require('./tenants');

const ORIGINS = () => (process.env.CONTENT_API_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

function bearerOf(req) {
  const h = req.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  // Accepted for curl convenience while integrating; the header is the contract.
  return (req.get('x-api-key') || '').trim();
}

/**
 * Resolve the caller to a tenant, or refuse.
 *
 * Sets `req.tenant` on the way through, so every route downstream can attribute
 * what it does to somebody. The matching itself lives in tenants.js -- this only
 * decides what a failure looks like.
 *
 * Still fails closed with 503 when NO credential is configured at all. That
 * distinction matters: 503 means the server is misconfigured, 401 means your
 * token is wrong, and collapsing them sends the next person to the wrong place.
 */
function requireToken(req, res, next) {
  const reg = tenants.registry();
  if (!reg.configured) {
    return res.status(503).json({
      error: 'api_not_configured',
      message: 'No API credential is configured on this server (CONTENT_API_TOKEN or '
        + 'TENANTS_JSON), so the API is disabled. It fails closed rather than '
        + 'serving answer keys openly.',
    });
  }
  const tenant = reg.match(bearerOf(req));
  if (!tenant) {
    res.set('WWW-Authenticate', 'Bearer realm="content-queen"');
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Send your token as: Authorization: Bearer <token>',
    });
  }
  req.tenant = tenant;
  return next();
}

/**
 * Require a tenant that additionally holds a named scope.
 *
 * A scope is refused with 403, not 404: unlike a job id, the existence of an
 * endpoint is not a secret, and telling a caller their credential lacks a
 * permission is the only way they can ask for the right one.
 */
function requireScope(scope) {
  return (req, res, next) => requireToken(req, res, () => {
    if (scope && !req.tenant.scopes.has(scope)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `This credential does not carry the '${scope}' scope.`,
        tenant: req.tenant.id,
      });
    }
    return next();
  });
}

/** CORS only for explicitly allowlisted origins. Never a wildcard. */
function cors(req, res, next) {
  const origin = req.get('origin');
  if (origin && ORIGINS().includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Api-Key');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
}

/** Serve JSON with an ETag so the LMS can poll cheaply. */
function sendJson(req, res, payload) {
  const etag = checkpoints.etagOf(payload);
  res.set('ETag', etag);
  res.set('Cache-Control', 'public, max-age=60');
  if (req.get('if-none-match') === etag) return res.status(304).end();
  return res.json(payload);
}

function build() {
  const router = express.Router();
  router.use(cors);

  // ── public index: the surface, with no lesson data ──────────────────────
  router.get('/', (req, res) => {
    const base = `${req.protocol}://${req.get('host')}/api/v1`;
    res.json({
      service: 'content-queen checkpoint api',
      version: 'v1',
      auth: 'Authorization: Bearer <token>  (ask Aroma Tahir for CONTENT_API_TOKEN)',
      configured: tenants.registry().configured,
      endpoints: [
        { method: 'GET', path: '/api/v1', auth: false,
          description: 'This index.' },
        { method: 'GET', path: '/api/v1/videos', auth: true,
          description: 'Every video that has at least one question checkpoint.',
          example: `${base}/videos` },
        { method: 'GET', path: '/api/v1/videos/:videoId/checkpoints', auth: true,
          description: 'The checkpoints for one video: where to pause, the question, and the feedback for each answer.',
          example: `${base}/videos/autonomy-01-spectrum/checkpoints` },
        { method: 'POST', path: '/api/v1/videos/:videoId/checkpoints/:id/attempts',
          auth: true, implemented: false,
          description: 'Returns 501. The LMS is the system of record for answers; '
            + 'this service holds no learner identity.' },
        { method: 'GET', path: '/api/v1/health', auth: false,
          description: 'Liveness and what is configured, with no credential and no lesson data.' },
        { method: 'POST', path: '/demo/make-video', auth: false,
          description: 'Write and gate a script from a topic. Buys nothing, so no token is '
            + 'needed; the job is bound to the caller. Pass a callbackUrl (tenants only) to '
            + 'be told when it moves instead of polling.' },
        { method: 'GET', path: '/demo/make-video/:jobId', auth: 'owner',
          description: 'Job status. Only the owner of the job can read it.' },
        { method: 'POST', path: '/demo/make-video/:jobId/claim', auth: true,
          description: 'Take ownership of a job created in a browser session you hold, so it '
            + 'can then be produced with your credential.' },
        { method: 'POST', path: '/demo/make-video/:jobId/produce', auth: true,
          description: 'SPENDS MONEY. Accepts Idempotency-Key; a retry returns the existing '
            + 'run rather than buying a second video.' },
        { method: 'POST', path: '/demo/make-video/:jobId/approve', auth: true,
          description: 'PUBLISHES to YouTube. `by` is recorded against your tenant.' },
        { method: 'GET', path: '/demo/jobs', auth: true,
          description: 'Your jobs, oldest transition first. Page with ?since= and ?cursor=.' },
        { method: 'GET', path: '/demo/spend', auth: true,
          description: 'What you have spent this month and what remains.' },
        { method: 'POST', path: '/api/v1/courses/plan', auth: true,
          description: 'Topic in, full course plan out: modules, lessons, an SLO and a '
            + 'question per lesson, plus a cost and time estimate. Spends one model call '
            + 'and nothing else.' },
        { method: 'POST', path: '/api/v1/courses/build', auth: true,
          description: 'Queues every lesson in a plan as a video. Refuses without '
            + '`confirmLessons` matching the plan, because this spends real money. '
            + 'Reserves $2.50 per lesson on your tenant ledger first (402 '
            + '`tenant_budget_exhausted` if it does not fit; nothing is queued), settled '
            + 'to the real cost as each lesson ends -- GET /demo/spend shows it under `courses`. '
            + 'Optional `references: true` adds two or three verified external reading '
            + 'links to each finished lesson.' },
        { method: 'GET', path: '/api/v1/courses/:courseId', auth: true,
          description: 'Build progress, and which lesson is waiting for approval. A lesson '
            + 'carries `runId`, a `reason` and a `blockedBy` while blocked, an `error` when it '
            + 'failed, and when done its `path` (the key into GET /api/v1/videos) plus its '
            + '`youtube` URL and `youtubeVideoId`. Spend is split into `spendMediaUsd` '
            + '(art and speech) and `spendModelUsd` (tokens); the `Total` variants of all '
            + 'three accumulate across retries. `references` appears on a done lesson only '
            + 'when the course asked for them AND the links resolved when we fetched them -- '
            + 'absent means none were verified, never that none were sought.' },
        { method: 'POST', path: '/api/v1/courses/:courseId/lessons/:lessonId/approve',
          auth: true,
          description: 'Publish a built lesson and release the next one. Courses build '
            + 'ONE lesson at a time and pause until approved.' },
        { method: 'POST', path: '/api/v1/courses/:courseId/lessons/:lessonId/reject',
          auth: true,
          description: 'Reject a lesson. THIS course stops: its queued lessons are failed, free, '
            + 'with `stoppedWithCourse` naming the rejection. Other courses continue.' },
        { method: 'POST', path: '/api/v1/courses/:courseId/lessons/:lessonId/skip',
          auth: true,
          description: 'Drop ONE failed lesson for free so its course continues without it. The '
            + 'lesson stays `failed` with `skipped: true`; nothing is rebuilt. The paid '
            + 'alternative is requeue.' },
        { method: 'POST', path: '/api/v1/courses/worker/resume', auth: true,
          description: 'Start the course worker after a restart. Boot deliberately starts '
            + 'nothing, so queued lessons wait for this, a build, an approve or a requeue. '
            + 'Builds only lessons whose course is not held by a failed or blocked lesson; '
            + 'spends nothing a build did not already authorise.' },
        { method: 'POST', path: '/api/v1/courses/:courseId/lessons/:lessonId/requeue',
          auth: true,
          description: 'Retry ONE failed lesson, leaving the rest of the course alone. '
            + 'Refuses anything that is not failed, and buys another render -- call it '
            + 'from an explicit human action, never automatically.' },
        // These three were reachable but unlisted, which made a liar of the advice
        // above -- we told the LMS to pin to this index rather than to a document,
        // then left the routes they most needed out of it, so the day the answer
        // changed they had no way to notice except by asking.
        { method: 'GET', path: '/api/v1/courses/:courseId/lessons/:lessonId/file', auth: true,
          description: 'The finished mp4, off the durable volume, before anyone publishes it. '
            + 'Supports Range. 404 `no_deliverable` carries `renderExists` and `partsAvailable` '
            + 'so you can tell "not yet" from "there is no video and never will be" -- see '
            + '`deliverableAvailable` on the course view, which answers it without a fetch.' },
        { method: 'DELETE', path: '/api/v1/courses/:courseId/lessons/:lessonId/file', auth: true,
          description: 'Drop our copy once yours is stored. Never inferred from a GET.' },
        { method: 'GET', path: '/api/v1/courses/:courseId/lessons/:lessonId/beats', auth: true,
          description: 'What the lesson was going to draw and say: beats.js as source text plus '
            + 'durations.json, kept before the frame gate can block. For a lesson that stopped '
            + 'before its render this is the only artefact there is, and it answers what the '
            + 'findings were about without paying for another build.' },
        { method: 'GET', path: '/api/v1/deliverables', auth: true,
          description: 'Everything currently held on the volume, with sizes. So the store can be '
            + 'watched rather than discovered full, and so "is it actually there?" is one call.' },
      ],
      // The closed set of `blockedBy`, served rather than documented. It is here
      // because a comment is not something a consumer can pin a test against: this
      // set drifted to six values in one comment, seven in another, and nine in the
      // code, and the LMS gave up matching on the field at all rather than go quiet
      // the day we added a tenth. Adding a value means adding it to BLOCKED_BY in
      // orchestrator/lib/spine-errors.js, which is what this reads.
      blockedBy: require('../../orchestrator/lib/queue').BLOCKED_BY_VALUES,
      demo: `${req.protocol}://${req.get('host')}/demo/quiz`,
      howTheQuestionBehaves: {
        summary: 'Nothing about the question is in the video. At atSeconds you PAUSE '
          + 'playback, show the question, take the answer, show the feedback for that '
          + 'answer, and then RESUME from the same instant.',
        sequence: [
          '1. Play until atSeconds, then pause. The stop is on a boundary between two '
          + 'spoken sentences, never inside one — see pause.atBeatBoundary.',
          '2. Show preamble, stem and options. correctIndex is the 0-based answer.',
          '3. THE LEARNER MUST PICK AN OPTION TO CONTINUE. requiresAnswer/blocking are true '
          + 'and allowSkip is false on every checkpoint: no dismiss, no close-on-outside-click, '
          + 'no skip button, and seeking past atSeconds should bring them back to it. The '
          + 'question is the gate — that is the whole point of pausing.',
          '4. Show feedback.correct if they picked correctIndex, otherwise '
          + 'feedback.incorrect — which says why the right answer is right and why the '
          + 'tempting wrong one is wrong. Give them time to read it; do not auto-dismiss.',
          '5. Resume at resumeAtSeconds (the same instant you paused).',
        ],
        rules: [
          'atSeconds ALREADY INCLUDES the brand intro. It is measured from the start of '
          + '<videoId>_final.mp4, the file we serve and the file we upload. Do NOT add the '
          + 'intro length yourself — that is the single most expensive mistake available '
          + 'here, and it is always late, so the learner meets a question about something '
          + 'the narrator has already moved past. lessonAtSeconds excludes it, and is there '
          + 'only so the two can never be silently confused.',
          'Read timing.introOffsetSource rather than assuming 2.6. It is "probed" (measured '
          + 'from that video own intro), "brand-constant" (the committed measurement — the '
          + 'usual answer in production, where .mp4 files are not in the image), "no-bumpers" '
          + '(delivered bare, so the offset is genuinely 0 and atSeconds === lessonAtSeconds), '
          + 'or "assumed" — and "assumed" is exactly the case where timing.trusted is false.',
          'durability says whether you may bind a lesson block to this row. "committed" is in '
          + 'our repository and survives a redeploy. "ephemeral" was made at runtime and will '
          + 'disappear on the next one — link it and the block will one day serve no questions. '
          + '"unknown" means we could not tell; treat it as ephemeral.',
          'Slugs are immutable. A videoId is minted once, before the video is made, and is '
          + 'never rewritten. If a slug stops resolving, the video was ephemeral and the '
          + 'container was redeployed — not renamed.',
          'Only fire a checkpoint whose pause.safe is true. False means it has no whole '
          + 'sentence on one side and there is nowhere clean to stop.',
          'Do not fire a checkpoint whose timing.trusted is false.',
          'questionStyle tells you which of the two formats a video is, and it is derived: '
          + 'a row is "popup" only when EVERY one of its checkpoints has rendersInVideo:false. '
          + 'Videos we make now are all popup; older ones draw the question on screen.',
          'On a popup checkpoint the four behaviour flags agree: rendersInVideo:false, '
          + 'pausesVideo:true, requiresAnswer:true, allowSkip:false. The popup is the ONLY '
          + 'place the learner ever sees the question, so if you skip it they miss it entirely.',
          'On an on-screen checkpoint all four relax together: pausesVideo:false, '
          + 'requiresAnswer:false, blocking:false, allowSkip:true, plus onScreenUntilSeconds. '
          + 'Do not pause over these — the video answers itself. A question that never pauses '
          + 'cannot gate anything, so you will never see pausesVideo:false alongside '
          + 'requiresAnswer:true; if you ever do, treat it as our bug and tell us.',
          'The learner\'s answer is recorded by you. This service stores nothing.',
        ],
      },
      notes: [
        'Call this server-to-server; a browser would expose the token.',
        'Answers are recorded by the LMS, not here.',
      ],
    });
  });

  /**
   * Liveness, with no credential.
   *
   * Asked for twice. An integrator needs something to point a monitor at that is
   * not an authenticated data route, and that does not go red when a token is
   * rotated. Deliberately carries no lesson data and no roster -- just whether
   * this service is up and whether it is configured enough to answer.
   */
  router.get('/health', (_req, res) => {
    const reg = tenants.registry();
    res.set('Cache-Control', 'no-store');
    res.json({
      ok: true,
      service: 'content-queen',
      version: 'v1',
      configured: reg.configured,
      time: new Date().toISOString(),
    });
  });

  // ── the catalogue ───────────────────────────────────────────────────────
  router.get('/videos', requireToken, (req, res) => {
    const videos = checkpoints.listVideos();
    sendJson(req, res, { count: videos.length, videos });
  });

  // ── one video's checkpoints ─────────────────────────────────────────────
  router.get('/videos/:videoId/checkpoints', requireToken, (req, res) => {
    // The fixed example, so the popup can be built and demonstrated without
    // producing a video first. Identical in shape to a real one, so anything
    // built against it works unchanged against a real video.
    if (req.params.videoId === 'sample') {
      res.set('Cache-Control', 'public, max-age=3600');
      const sample = checkpoints.sampleCheckpoints();
      if (!sample) {
        return res.status(503).json({
          error: 'no_sample',
          message: 'The worked example has not been generated yet. Run a demo video and capture it with scripts/refresh-demo-sample.js.',
        });
      }
      return res.json(sample);
    }
    let payload = null;
    try {
      payload = checkpoints.findByVideoId(req.params.videoId);
    } catch (e) {
      return res.status(500).json({ error: 'extraction_failed', message: e.message });
    }
    if (!payload) {
      return res.status(404).json({
        error: 'not_found',
        message: `No video '${req.params.videoId}' with checkpoints. `
          + 'List them at GET /api/v1/videos.',
      });
    }
    sendJson(req, res, payload);
  });

  /**
   * Answer recording -- deliberately NOT implemented, and loud about it.
   *
   * An earlier version of this route appended attempts to a JSONL file and
   * answered `{recorded: true}`. That was false in three ways at once: the
   * Railway service has no mounted volume, so the file died on every redeploy;
   * no route could read it back; and nothing consumed it. A caller would have
   * been told its data was safe while it was being dropped.
   *
   * Decision (2026-09-08): the LMS is the system of record. It already holds the
   * learner, the enrolment and the gradebook; this repo holds no learner
   * identity at all and should not start. A second copy here would be a shadow
   * store with no reader, free to drift from the real one.
   *
   * This returns 501 rather than 404 so anyone who wired it up from an early
   * draft gets a clear failure instead of silently losing every answer.
   */
  router.post('/videos/:videoId/checkpoints/:id/attempts', requireToken, (_req, res) => {
    res.status(501).json({
      error: 'not_implemented',
      message: 'Answer recording is not implemented here, on purpose. Record '
        + 'attempts in the LMS, which owns the learner and the gradebook; this '
        + 'service holds no learner identity. If you need us to receive them, '
        + 'ask Aroma Tahir and we will build a durable store rather than an '
        + 'endpoint that drops what it is sent.',
      systemOfRecord: 'lms',
    });
  });

  // ── course builder ──────────────────────────────────────────────────────
  // Planning and building are separate calls on purpose. Planning is one model
  // call and spends nothing else; building is ~$1.50 and ~30 minutes PER LESSON,
  // so an eight-lesson course is ~$12 and most of a working day. Nobody should
  // find that out by clicking a button, so `build` refuses without an explicit
  // confirmation carrying the lesson count the caller believes it is approving.

  router.post('/courses/plan', requireToken, async (req, res) => {
    try {
      const plan = await require('./course-planner')
        .plan(req.body || {}, { log: (m) => console.log('[course]', m) });
      res.json(plan);
    } catch (e) {
      res.status(e.status || 500).json({ error: 'plan_failed', message: e.message });
    }
  });

  router.post('/courses/build', requireToken, (req, res) => {
    const body = req.body || {};
    const planner = require('./course-planner');
    const queue = require('../../orchestrator/lib/queue');

    // A course is hours of work and tens of dollars. On a store that dies with
    // the process there is no queue file at all: a built lesson could never be
    // approved and GET /courses/:id would 404 immediately. Mirrors the rule that
    // a spend which cannot be recorded is not a spend we accept.
    if (queue.durability() === 'memory') {
      return res.status(503).json({ error: 'no_durable_store',
        message: 'This service cannot currently record course state, so a course started now '
          + 'could not be approved or resumed. GET /api/v1/health reports the store.' });
    }

    if (!body.plan || !Array.isArray(body.plan.modules)) {
      return res.status(400).json({ error: 'bad_request',
        message: 'Send the plan you got from POST /api/v1/courses/plan as `plan`.' });
    }
    const lessons = planner.lessonsOf(body.plan);

    // The count must be echoed back, so a caller cannot approve "a course" and
    // be charged for whatever the plan happened to grow into.
    if (body.confirmLessons !== lessons.length) {
      return res.status(409).json({
        error: 'confirmation_required',
        message: `This will build ${lessons.length} videos, costing about `
          + `$${planner.estimate(body.plan).estimatedCostUsd} and taking about `
          + `${planner.estimate(body.plan).estimatedBuildMinutes} minutes. Re-send with `
          + `"confirmLessons": ${lessons.length} to start it.`,
        lessons: lessons.length,
        estimate: planner.estimate(body.plan),
      });
    }

    const series = String(body.series || '').trim();
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(series)) {
      return res.status(400).json({ error: 'bad_request',
        message: 'A `series` is required: the explainer-videos subfolder the videos are '
          + 'filed under, lowercase, e.g. "whatsapp-orders". It is never guessed — a wrong '
          + 'one files a whole course in the wrong place and is only noticed after the spend.' });
    }

    const courseId = `course-${Date.now().toString(36)}`;
    const queued = [];
    const rejected = [];

    // Money first. A course used to create queue items and nothing else: no
    // reservation, no settlement, so GET /demo/spend could not see it and a
    // tenant's monthly ceiling never applied to the one route that spends N x
    // $2.50. Reserve per lesson (one ref each -- settling a shared ref would drop
    // the other lessons' reservations the moment lesson one landed), or refuse
    // the whole build before anything is queued.
    const ledger = require('./ledger');
    const jobStore = require('./job-store').shared();
    if (!jobStore.canRecordSpend()) {
      return res.status(503).json({ error: 'ledger_unavailable',
        message: 'This server cannot durably record what it spends, so it refuses to spend. '
          + 'See jobStore.durability on /health.' });
    }
    const perLesson = require('./config').config.pipeline.courseLessonReserveUsd;
    const reservations = [];
    for (const l of lessons) {
      const slug = queue.slugify(l.title);
      const r = ledger.reserve(jobStore, {
        tenantId: req.tenant.id, jobId: courseId, usd: perLesson,
        key: `${series}/${slug}`, tenant: req.tenant, kind: 'course',
      });
      if (!r.ok) {
        for (const taken of reservations) {
          ledger.release(jobStore, { tenantId: req.tenant.id, ref: taken.ref, jobId: courseId, why: 'build_refused' });
        }
        const status = r.reason === 'ledger_unavailable' ? 503 : 402;
        return res.status(status).json({
          error: r.reason, message: r.why,
          monthlyUsd: r.monthlyUsd, spentUsd: r.spentUsd, remainingUsd: r.remainingUsd, resetsAt: r.resetsAt,
          lessons: lessons.length, perLessonUsd: perLesson,
          note: 'Nothing was queued and nothing was reserved.',
        });
      }
      reservations.push({ slug, ref: r.ref });
    }
    // The ONE scenario Ali is followed through for the whole course. The planner has
    // produced it since it was written (course-planner.js SCHEMA) and this loop threw it
    // away, so cross-lesson continuity existed only where a lesson's own brief happened
    // to restate it -- which made a "course" a bag of unrelated videos sharing a title.
    // It rides in `notes`, which research.js already reads into every downstream prompt.
    const scenario = String((body.plan && body.plan.protagonist_scenario) || '').trim();
    // Opt-in, per course. Off by default: it buys a web search per lesson, and a
    // caller that did not ask for reading should not be charged for looking.
    const wantReferences = body.references === true;
    for (const l of lessons) {
      try {
        const item = queue.enqueue({
          topic: l.title,
          series,
          // The [courseId] tag stays FIRST: course membership is a substring match on
          // notes, and so is the check that refuses a brief carrying someone else's tag.
          notes: [
            `[${courseId}] ${l.brief}`,
            `SLO: ${l.slo}`,
            scenario ? `Running scenario for this course: ${scenario}` : null,
          ].filter(Boolean).join('\n'),
          module: l.module,
          moduleTopic: l.moduleTitle,
          source: 'course-builder',
          wantReferences,
          tenantId: req.tenant.id,
          spendRef: (reservations.find((x) => x.slug === queue.slugify(l.title)) || {}).ref || null,
        });
        queued.push(item.id);
      } catch (e) {
        // Usually "already in the queue" — report it rather than aborting the rest.
        rejected.push({ title: l.title, reason: e.message });
        const taken = reservations.find((x) => x.slug === queue.slugify(l.title));
        if (taken) ledger.release(jobStore, { tenantId: req.tenant.id, ref: taken.ref, jobId: courseId, why: 'not_queued' });
      }
    }

    // Start building. Without this the lessons sat queued forever: the only
    // thing that dispatched work in this service was the Notion tick, so a
    // course build looked like it "stopped at planning".
    if (queued.length) require('./course-worker').kick();

    res.status(202).json({
      courseId,
      series,
      queued: queued.length,
      rejected,
      items: queued,
      status: `${req.protocol}://${req.get('host')}/api/v1/courses/${courseId}`,
      note: 'Building has started, ONE LESSON AT A TIME. The first video takes about 30 '
        + 'minutes, then the course pauses: approve that lesson and the next one begins. '
        + 'Nothing after an unapproved lesson is built, so a wrong format costs one video '
        + 'rather than the whole course.',
    });
  });

  /**
   * Start the worker by hand. restore() starts nothing on boot -- a crash loop
   * must not spend -- so after every redeploy the queue waits for a kick, and the
   * only kicks were build, approve and requeue. Declared before /courses/:courseId
   * so `worker` can never be read as a course id.
   */
  router.post('/courses/worker/resume', requireToken, (req, res) => {
    const by = (req.body && req.body.by) || req.tenant.id;
    const r = require('./course-worker').resume(by);
    res.status(202).json({
      resumed: true,
      by,
      eligible: r.eligible,
      running: r.running,
      held: r.held,
      note: r.eligible
        ? `Building ${r.eligible} eligible lesson(s), one at a time. Courses held by a failed or blocked lesson are not touched.`
        : 'Nothing is eligible: every queued lesson belongs to a course that is waiting for a person.',
    });
  });

  router.get('/courses/:courseId', requireToken, (req, res) => {
    const queue = require('../../orchestrator/lib/queue');
    const cw = require('./course-worker');
    const tag = `[${req.params.courseId}]`;
    // Where each queued lesson stands in the worker's line, 1-based, counting only
    // lessons the worker may actually take. A lesson behind its own course's hold
    // has no position: it is not in line, it is waiting for a person.
    const line = cw.eligible().map((e) => e.id);
    const items = queue.currentItems()
      .filter((i) => (i.notes || '').includes(tag))
      .map((i) => ({
        id: i.id, topic: i.topic, status: i.status, module: i.module,
        ...(i.tenantId ? { tenantId: i.tenantId } : {}),
        ...(i.status === 'queued'
          ? { queuePosition: line.includes(i.id) ? line.indexOf(i.id) + 1 : null }
          : {}),
        // The run that owns this lesson. It is the only handle that ties a lesson
        // to what it cost, and without it a course cannot be reconciled against
        // any spend figure at all.
        runId: i.runId,
        // queue.fail() records `error` and queue.block() records `reason` in the
        // same event that sets the status -- this projection was simply dropping
        // them, so a failed lesson said only "failed" and nobody could tell an
        // instructor anything, or whether re-running was sensible.
        //
        // Gated on the status each belongs to, because currentItems() is a shallow
        // fold that never deletes a key: an `error` from a first attempt survives a
        // later `done`, and reporting it would describe a lesson by a failure it has
        // already moved past.
        ...(i.status === 'failed' && i.error ? { error: i.error } : {}),
        ...(i.status === 'blocked' && i.reason ? { reason: i.reason } : {}),
        // Which blocked this is. `reason` is free text written by whatever stopped
        // the lesson -- sometimes a sentence a model wrote -- so a caller that has
        // one Approve button cannot tell "waiting for a person" from "a judge
        // flagged the finished video" without matching on prose. This is a closed
        // set, published as `blockedBy` on GET /api/v1 so a caller can pin a test
        // against it rather than against this comment -- which is how it drifted to
        // six values here and nine in the code. Defaulted as well as at
        // queue.block() so items blocked before this field existed still read as
        // the normal case.
        ...(i.status === 'blocked' ? { blockedBy: i.blockedBy || queue.DEFAULT_BLOCKED_BY } : {}),
        // Whether GET .../file will actually serve bytes right now.
        //
        // A fact, not an inference. The LMS reasonably read our own documentation
        // as "these four blockedBy values mean the video exists" and built against
        // it -- but two of those values are thrown by gates that run BEFORE the
        // render, so for them there is no mp4 and never will be. Any rule mapping
        // blockedBy to "fetchable" is wrong for some value of blockedBy, so we
        // answer the question directly instead of publishing a rule to infer it
        // from. Costs one readdir per blocked lesson, and only for blocked ones.
        ...(i.status === 'blocked' || i.status === 'done' ? {
          deliverableAvailable: (() => {
            try {
              return Boolean(require('../../orchestrator/lib/deliverables').find(i.series, i.slug));
            } catch { return false; }
          })(),
        } : {}),
        // What the lesson actually produced. A finished lesson used to say only
        // that it succeeded, so the caller knew a video existed and could not say
        // which one -- there was no way to drop it into the block waiting for it.
        //
        // `path` is not reconstructed from series + slug: the item's own id IS the
        // catalogue path, minted as `${series}/${slug}` at queue.js:118 and filed
        // under the same string at checkpoints.js:533. It joins to a row in
        // GET /api/v1/videos, and from there to that video's checkpoints.
        ...(i.status === 'done' ? {
          path: i.id,
          // The answer directly, skipping the join. queue.done() stores the run's
          // artifacts on the item and courses stop after `upload` (config.js:80),
          // so a finished course lesson already knows its own URL. Absent if the
          // run stopped earlier than upload -- `path` still resolves it.
          ...(i.artifacts && i.artifacts.upload && i.artifacts.upload.url
            ? { youtube: i.artifacts.upload.url, youtubeVideoId: i.artifacts.upload.videoId }
            : {}),
          // External reading, when the course asked for it and the links survived
          // being fetched. ABSENT means none were verified -- never "we did not
          // look", and never a link we could not open ourselves. The consumer said
          // it would not render an unverified list, which is the whole contract:
          // an empty answer here is a correct answer.
          ...(i.artifacts && i.artifacts.references
            && Array.isArray(i.artifacts.references.references)
            && i.artifacts.references.references.length
            ? { references: i.artifacts.references.references }
            : {}),
        } : {}),
        // What it cost. A course creates queue items, never jobs, and the tenant
        // ledger is built from job records -- so GET /demo/spend structurally cannot
        // see a course, and reporting 0 there is not evidence that nothing was spent.
        // This is the only figure an LMS can settle an authorisation against.
        //
        // Settle against `spendUsdTotal`: it accumulates across retries, so it is what
        // the lesson has really cost. `spendUsd` is the last attempt alone, which is
        // what reconciles against `runId` on the same row.
        // A lesson that failed without ever being claimed -- stopped with its course,
        // or rejected while queued -- has no run and so no spend event. Absent means
        // "unknown" to the consumer, which left a $2.50 hold standing on a lesson that
        // cost nothing. Say zero, explicitly, when it is known to be zero.
        ...(i.status === 'failed' && !i.runId && !Number.isFinite(i.spendUsdTotal)
          ? { spendUsd: 0, spendUsdTotal: 0 } : {}),
        ...(Number.isFinite(i.spendUsd) ? { spendUsd: i.spendUsd } : {}),
        ...(Number.isFinite(i.spendUsdTotal) ? { spendUsdTotal: i.spendUsdTotal } : {}),
        // And what it was spent ON. Media is art and speech -- the part that scales
        // with how long the video is and the only part the budget gate measures.
        // Model is tokens: research, script, the gate, QA and every redraft.
        //
        // The pair above is NOT this split, which is what it was being read as. Both
        // of those are totals; these two divide one. Absent on lessons that finished
        // before this shipped: the per-call breakdown lives in run state, not on the
        // queue item, so it cannot be back-filled -- absent means unknown, not zero.
        ...(Number.isFinite(i.spendMediaUsd) ? { spendMediaUsd: i.spendMediaUsd } : {}),
        ...(Number.isFinite(i.spendModelUsd) ? { spendModelUsd: i.spendModelUsd } : {}),
        ...(Number.isFinite(i.spendMediaUsdTotal) ? { spendMediaUsdTotal: i.spendMediaUsdTotal } : {}),
        ...(Number.isFinite(i.spendModelUsdTotal) ? { spendModelUsdTotal: i.spendModelUsdTotal } : {}),
      }));
    if (!items.length) {
      // Report durability; do not assert the worst case. This used to tell every
      // caller the queue was not durable and point at a handoff they had never
      // been sent, so an unknown courseId and a lost course read identically.
      const durability = queue.durability();
      const since = queue.durableSince();
      return res.status(404).json({
        error: 'not_found',
        message: `No lessons tagged ${tag} on this service.`,
        durability,
        durableSince: since,
        note: durability === 'volume'
          ? 'Course state is held on a mounted volume and survives a redeploy, so this is an '
            + 'unrecognised courseId rather than a lost course.'
          : `Course state on this service is "${durability}" durability, which does NOT survive `
            + 'a redeploy. Attach a Railway volume before starting a course you cannot afford '
            + 'to rebuild. GET /api/v1/health reports this under jobStore.durability.',
      });
    }
    const by = (s) => items.filter((i) => i.status === s).length;
    const worker = cw.status();
    const heldHere = worker.held.find((h) => h.courseId === req.params.courseId) || null;
    const waiting = cw.awaitingApproval(req.params.courseId);
    res.json({
      courseId: req.params.courseId,
      lessons: items.length,
      done: by('done'),
      failed: by('failed'),
      // Counted separately rather than folded into inProgress: a blocked lesson is
      // not work in flight, it is work waiting on a person, and the two need
      // different words in front of an instructor.
      blocked: by('blocked'),
      inProgress: items.length - by('done') - by('failed') - by('blocked'),
      // The course's bill so far, summed from the lessons that have settled. An LMS
      // authorises `lessons x estimate` before calling us and has had nothing to
      // converge on since: ours held $1.50 for a lesson that cost $0.598. Lessons
      // still building contribute nothing yet, so this only ever rises.
      spentUsd: Number(items.reduce((a, i) => a + (Number(i.spendUsdTotal) || 0), 0).toFixed(4)),
      // What the machine is doing this second, so a stalled build is visible
      // rather than looking identical to a slow one.
      // One lesson is built at a time and then waits. This is the field the UI
      // acts on: while it is non-empty, nothing else is being built or spent.
      awaitingApproval: waiting,
      worker: {
        building: worker.current,
        queuedAcrossAllCourses: worker.queued,
        // `building: null` was the same value for idle and for parked, and the LMS
        // read it as "fine" in the one case where nothing would move without a
        // person. These say which it is.
        running: worker.running,
        buildingCourseId: worker.buildingCourseId,
        eligibleAcrossAllCourses: worker.eligible,
        // True when lessons the worker may take are waiting and nobody is building:
        // the normal state after a redeploy, because boot starts nothing.
        // POST /api/v1/courses/worker/resume clears it.
        needsResume: worker.needsResume,
        // What holds THIS course, or null. `by` is the lesson a person must deal
        // with (approve / reject / skip / requeue) before the course moves again.
        held: heldHere && { by: heldHere.by, status: heldHere.status, since: heldHere.since },
      },
      items,
    });
  });

  /**
   * Approve a built lesson: publish it, and release the next one.
   *
   * Courses are built one lesson at a time on purpose -- rendering eight videos
   * before a human sees the first one spends the whole budget on a format that
   * might be wrong. So nothing after this lesson is built until it is approved.
   */
  router.post('/courses/:courseId/lessons/:lessonId(*)/approve', requireToken, (req, res) => {
    const by = (req.body && req.body.by) || 'Aroma';
    const r = require('./course-worker')
      .approve(req.params.lessonId, by, req.params.courseId, req.tenant.id);
    if (!r.ok) return res.status(409).json({ error: 'cannot_approve', message: r.why });
    res.status(202).json({
      approved: req.params.lessonId,
      by,
      note: 'Publishing this lesson, then building the next one. The render is not '
        + 'repeated -- the run resumes from where it stopped.',
    });
  });

  /** Reject a built lesson. The course stops here; nothing after it is built. */
  router.post('/courses/:courseId/lessons/:lessonId(*)/reject', requireToken, (req, res) => {
    const why = (req.body && req.body.why) || '';
    const r = require('./course-worker')
      .reject(req.params.lessonId, why, req.params.courseId, req.tenant.id);
    if (!r.ok) return res.status(409).json({ error: 'cannot_reject', message: r.why });
    res.status(202).json({
      rejected: req.params.lessonId,
      stopped: r.stopped || [],
      note: 'Nothing further will be built for THIS course: its queued lessons are now failed '
        + '(free, `stoppedWithCourse`). Other courses continue. The video was not published.',
    });
  });

  /**
   * Drop one failed lesson so its course continues. Free -- nothing is rebuilt.
   * The lesson keeps status `failed` and gains `skipped: true`, so a consumer
   * holding the status set closed sees nothing new.
   */
  router.post('/courses/:courseId/lessons/:lessonId(*)/skip', requireToken, (req, res) => {
    const by = (req.body && req.body.by) || 'Aroma';
    const r = require('./course-worker')
      .skip(req.params.lessonId, by, req.params.courseId, req.tenant.id);
    if (!r.ok) return res.status(409).json({ error: 'cannot_skip', message: r.why });
    res.status(202).json({
      skipped: req.params.lessonId,
      by,
      note: 'This lesson stays failed and no longer holds its course. The next lesson of the '
        + 'course builds now. Nothing was bought.',
    });
  });

  /**
   * Retry one failed lesson.
   *
   * A course is many lessons and one failing does not make the other nine wrong.
   * Rebuilding the course is not the workaround it looks like: enqueue() rejects
   * the duplicate slugs, so it would buy fresh videos for the lessons that
   * already worked and refuse the one that did not.
   *
   * This buys another render, so it refuses anything that is not `failed` and
   * exists to be called from a person's click -- nothing in this service calls
   * it on its own, and nothing should.
   */
  router.post('/courses/:courseId/lessons/:lessonId(*)/requeue', requireToken, (req, res) => {
    const by = (req.body && req.body.by) || 'Aroma';
    const r = require('./course-worker')
      .requeue(req.params.lessonId, by, req.params.courseId, req.tenant.id);
    if (!r.ok) return res.status(409).json({ error: 'cannot_requeue', message: r.why });
    res.status(202).json({
      requeued: req.params.lessonId,
      by,
      note: 'Building this lesson again from the start. It is a new render and it costs '
        + 'again -- the previous attempt bought nothing that survives.',
    });
  });

  /**
   * The bytes of a finished lesson, before anyone publishes it.
   *
   * Asked for by the LMS on 2026-09-22 after they lost a paid video to a
   * redeploy: they want to archive a copy to their own storage before
   * publication, which is the only thing that makes a render durable on their
   * side. Scoped to the course exactly as approve/reject/requeue are.
   *
   * Served from the VOLUME, not the render directory. The render directory is
   * excluded from the image, so on the container the file exists only until the
   * next deploy -- serving from there would hand them a URL that works right up
   * until the moment it matters.
   */
  router.get('/courses/:courseId/lessons/:lessonId(*)/file', requireToken, (req, res) => {
    const queue = require('../../orchestrator/lib/queue');
    const item = queue.get(req.params.lessonId);
    if (!item) return res.status(404).json({ error: 'no_such_lesson' });
    if (!(item.notes || '').includes(`[${req.params.courseId}]`)) {
      return res.status(404).json({ error: 'no_such_lesson' });
    }

    const deliverables = require('../../orchestrator/lib/deliverables');
    const found = deliverables.find(item.series, item.slug);
    if (!found) {
      // WHY THIS IS THREE ANSWERS AND NOT ONE.
      //
      // This used to say `This lesson is '<status>', so there is no finished video
      // yet` for anything that was not `done`. For a lesson blocked after a paid
      // render that sentence is simply false, and it reads as a status gate -- so
      // the LMS spent a day probing the route and asking us to relax a gate that
      // does not exist, when the real answer was that the bytes were never copied.
      // A wrong explanation costs more than no explanation.
      //
      // Each branch below is a different action for the reader, which is the only
      // reason to distinguish them.
      const dir = deliverables.dirFor(item.series, item.slug);
      const partial = dir && fs.existsSync(dir);
      const rendered = item.status === 'done'
        || Boolean(item.details && item.details.finalRendered);

      let message;
      if (partial && !rendered) {
        // The ordinary blocked-before-the-render case. Something was bought, but
        // no video was ever made, so there is nothing here to wait for.
        message = `This lesson stopped before a video was rendered (${item.blockedBy || item.status})`
          + ', so there is no mp4 to serve and there never was one. Art and speech may still have '
          + 'been paid for. What it did leave is its beats and timings -- GET the /beats route '
          + 'beside this one to see exactly what each beat was going to draw and say.';
      } else if (partial) {
        message = 'A render finished for this lesson but no mp4 reached the durable volume. '
          + 'That is a fault on our side, not a state you can wait out -- please tell us, and '
          + 'quote the lesson id.';
      } else {
        message = 'Nothing was kept on the durable volume for this lesson. Lessons built before '
          + 'deliverable persistence shipped (2026-09-22) exist only on a container and are gone '
          + 'after a redeploy; a lesson built since should have at least its beats here.';
      }
      return res.status(404).json({
        error: 'no_deliverable',
        message,
        // The machine-readable half, so nothing has to be inferred from prose.
        status: item.status,
        ...(item.blockedBy ? { blockedBy: item.blockedBy } : {}),
        renderExists: Boolean(rendered),
        partsAvailable: partial ? ['beats.js', 'durations.json'] : [],
      });
    }

    const stat = fs.statSync(found.file);
    const range = req.headers.range;
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? parseInt(m[1], 10) : 0;
      const end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
      if (Number.isNaN(start) || start >= stat.size || end >= stat.size || start > end) {
        res.setHeader('Content-Range', `bytes */${stat.size}`);
        return res.status(416).end();
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', end - start + 1);
      return fs.createReadStream(found.file, { start, end }).pipe(res);
    }
    res.setHeader('Content-Length', stat.size);
    return fs.createReadStream(found.file).pipe(res);
  });

  /**
   * What is actually on the volume.
   *
   * `deliverables.list()` has existed since the module shipped and nothing ever
   * called it. Diagnosing "the LMS says /file 404s" therefore meant shelling into
   * the container, and the answer -- the directory is there with 4KB of beats in
   * it, not 26MB of video -- was one readdir away the whole time.
   *
   * Also the capacity view. A full Railway volume triggers an offline resize that
   * restarts the service, possibly mid-render, so this is worth watching before it
   * is worth reacting to.
   */
  router.get('/deliverables', requireToken, (req, res) => {
    try {
      const listed = require('../../orchestrator/lib/deliverables').list();
      return res.json({
        durable: listed.durable,
        count: listed.items.length,
        bytes: listed.bytes,
        items: listed.items,
        ...(listed.durable ? {} : {
          note: 'This store is not a volume, so nothing here survives a redeploy.',
        }),
      });
    } catch (e) {
      return res.status(500).json({ error: 'list_failed', message: e.message });
    }
  });

  /**
   * What a lesson was going to draw and say, off the volume.
   *
   * produce.js copies beats.js and durations.json BEFORE the frame gate can block,
   * precisely so a lesson that stopped there can be understood without paying for
   * another render. Until now nothing could read them: the data was being kept for
   * a reader that did not exist, and "which element spills off 1920x1080?" could
   * only be answered by rebuilding the lesson.
   *
   * This is the whole answer for the two gates that run BEFORE the render -- there
   * is no mp4 for those and never will be, so this is what "preview it" can mean.
   *
   * beats.js is a JS module, not JSON. It is returned as text rather than parsed,
   * because evaluating a file to serve it would make a render artefact into code
   * this process runs.
   */
  router.get('/courses/:courseId/lessons/:lessonId(*)/beats', requireToken, (req, res) => {
    const queue = require('../../orchestrator/lib/queue');
    const item = queue.get(req.params.lessonId);
    if (!item) return res.status(404).json({ error: 'no_such_lesson' });
    if (!(item.notes || '').includes(`[${req.params.courseId}]`)) {
      return res.status(404).json({ error: 'no_such_lesson' });
    }

    const deliverables = require('../../orchestrator/lib/deliverables');
    const dir = deliverables.dirFor(item.series, item.slug);
    if (!dir || !fs.existsSync(dir)) {
      return res.status(404).json({
        error: 'no_beats',
        message: 'Nothing was kept on the durable volume for this lesson. Lessons built before '
          + 'deliverable persistence shipped (2026-09-22) left nothing behind.',
        status: item.status,
      });
    }

    const read = (name) => {
      try { return fs.readFileSync(path.join(dir, name), 'utf8'); } catch { return null; }
    };
    const beats = read('beats.js');
    const durationsRaw = read('durations.json');
    if (!beats && !durationsRaw) {
      return res.status(404).json({ error: 'no_beats', message: 'No beats were kept for this lesson.' });
    }

    let durations = null;
    try { durations = durationsRaw ? JSON.parse(durationsRaw) : null; } catch { durations = null; }

    return res.json({
      lessonId: item.id,
      status: item.status,
      ...(item.blockedBy ? { blockedBy: item.blockedBy } : {}),
      // Verbatim source, so what you read is what the renderer was given.
      beats,
      durations,
      note: 'beats.js is returned as source text, not evaluated. durations.json is the timing the '
        + 'checkpoints are anchored to.',
    });
  });

  /**
   * Drop our copy, once theirs is safe.
   *
   * ONLY on this explicit call. Never inferred from a successful GET: a download
   * that failed halfway would otherwise destroy the last remaining copy, which is
   * the exact failure the volume was added to prevent.
   */
  router.delete('/courses/:courseId/lessons/:lessonId(*)/file', requireToken, (req, res) => {
    const queue = require('../../orchestrator/lib/queue');
    const item = queue.get(req.params.lessonId);
    if (!item) return res.status(404).json({ error: 'no_such_lesson' });
    if (!(item.notes || '').includes(`[${req.params.courseId}]`)) {
      return res.status(404).json({ error: 'no_such_lesson' });
    }
    const r = require('../../orchestrator/lib/deliverables').forget(item.series, item.slug);
    if (!r.ok) return res.status(404).json({ error: 'no_deliverable', message: r.why });
    res.status(200).json({
      deleted: req.params.lessonId,
      note: 'Our copy is gone. Yours is now the only one unless the lesson was published.',
    });
  });

  return router;
}

module.exports = { build, requireToken, requireScope, cors, bearerOf };
