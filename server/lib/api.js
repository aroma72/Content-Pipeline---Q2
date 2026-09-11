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
 * Fail closed. With no CONTENT_API_TOKEN set, the data routes answer 503 rather
 * than serving openly. A misconfigured deploy must not silently become public.
 *
 * Calling pattern. Prefer server-to-server: the LMS backend fetches the payload
 * with the token and hands its own page only what that learner needs. A browser
 * calling this directly would have to ship the token to the client, and would
 * need CORS -- available via CONTENT_API_ORIGINS for local development, but it
 * is not the intended production path.
 */

const express = require('express');
const checkpoints = require('./checkpoints');

const TOKEN = () => process.env.CONTENT_API_TOKEN || '';
const ORIGINS = () => (process.env.CONTENT_API_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

/** Constant-time compare, so a wrong token cannot be found byte by byte. */
function tokenMatches(supplied) {
  const expected = TOKEN();
  if (!expected || !supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return require('crypto').timingSafeEqual(a, b);
}

function bearerOf(req) {
  const h = req.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  // Accepted for curl convenience while integrating; the header is the contract.
  return (req.get('x-api-key') || '').trim();
}

function requireToken(req, res, next) {
  if (!TOKEN()) {
    return res.status(503).json({
      error: 'api_not_configured',
      message: 'CONTENT_API_TOKEN is not set on the server, so the checkpoint API '
        + 'is disabled. It fails closed rather than serving answer keys openly.',
    });
  }
  if (!tokenMatches(bearerOf(req))) {
    res.set('WWW-Authenticate', 'Bearer realm="content-queen"');
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Send the token as: Authorization: Bearer <CONTENT_API_TOKEN>',
    });
  }
  return next();
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
      configured: Boolean(TOKEN()),
      endpoints: [
        { method: 'GET', path: '/api/v1', auth: false,
          description: 'This index.' },
        { method: 'GET', path: '/api/v1/videos', auth: true,
          description: 'Every video that has at least one question checkpoint.',
          example: `${base}/videos` },
        { method: 'GET', path: '/api/v1/videos/:videoId/checkpoints', auth: true,
          description: 'The checkpoints for one video, with firing times.',
          example: `${base}/videos/autonomy-01-spectrum/checkpoints` },
        { method: 'POST', path: '/api/v1/videos/:videoId/checkpoints/:id/attempts',
          auth: true, implemented: false,
          description: 'Returns 501. The LMS is the system of record for answers; '
            + 'this service holds no learner identity.' },
        { method: 'POST', path: '/api/v1/courses/plan', auth: true,
          description: 'Topic in, full course plan out: modules, lessons, an SLO and a '
            + 'question per lesson, plus a cost and time estimate. Spends one model call '
            + 'and nothing else.' },
        { method: 'POST', path: '/api/v1/courses/build', auth: true,
          description: 'Queues every lesson in a plan as a video. Refuses without '
            + '`confirmLessons` matching the plan, because this spends real money.' },
        { method: 'GET', path: '/api/v1/courses/:courseId', auth: true,
          description: 'Build progress for a queued course.' },
      ],
      demo: `${req.protocol}://${req.get('host')}/demo/quiz`,
      notes: [
        'atSeconds is measured from the start of <videoId>_final.mp4, which begins '
        + 'with a 2.6s brand intro. lessonAtSeconds excludes it.',
        'Do not fire a checkpoint whose timing.trusted is false.',
        'Call this server-to-server; a browser would expose the token.',
        'Answers are recorded by the LMS, not here.',
      ],
    });
  });

  // ── the catalogue ───────────────────────────────────────────────────────
  router.get('/videos', requireToken, (req, res) => {
    const videos = checkpoints.listVideos();
    sendJson(req, res, { count: videos.length, videos });
  });

  // ── one video's checkpoints ─────────────────────────────────────────────
  router.get('/videos/:videoId/checkpoints', requireToken, (req, res) => {
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
    for (const l of lessons) {
      try {
        const item = queue.enqueue({
          topic: l.title,
          series,
          notes: `[${courseId}] ${l.brief}\nSLO: ${l.slo}`,
          module: l.module,
          moduleTopic: l.moduleTitle,
          source: 'course-builder',
        });
        queued.push(item.id);
      } catch (e) {
        // Usually "already in the queue" — report it rather than aborting the rest.
        rejected.push({ title: l.title, reason: e.message });
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
      note: 'Building has started. Videos are rendered one at a time, about 30 minutes '
        + 'each; poll the status URL. Each finished lesson is scored and waits for a human '
        + 'to promote it before any learner sees it.',
    });
  });

  router.get('/courses/:courseId', requireToken, (req, res) => {
    const queue = require('../../orchestrator/lib/queue');
    const tag = `[${req.params.courseId}]`;
    const items = queue.currentItems()
      .filter((i) => (i.notes || '').includes(tag))
      .map((i) => ({ id: i.id, topic: i.topic, status: i.status, module: i.module }));
    if (!items.length) {
      return res.status(404).json({ error: 'not_found',
        message: `No queued lessons tagged ${tag}. Note the queue is not durable across `
          + 'deploys on this service — see the technical handoff.' });
    }
    const by = (s) => items.filter((i) => i.status === s).length;
    const worker = require('./course-worker').status();
    res.json({
      courseId: req.params.courseId,
      lessons: items.length,
      done: by('done'),
      failed: by('failed'),
      inProgress: items.length - by('done') - by('failed'),
      // What the machine is doing this second, so a stalled build is visible
      // rather than looking identical to a slow one.
      worker: { building: worker.current, pendingAcrossAllCourses: worker.pending },
      items,
    });
  });

  return router;
}

module.exports = { build, requireToken, cors };
