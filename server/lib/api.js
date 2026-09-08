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

  return router;
}

module.exports = { build, requireToken, cors };
