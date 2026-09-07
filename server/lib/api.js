'use strict';
/**
 * api -- the read API the LMS (Taleemabad University) calls.
 *
 * Scope is deliberately tiny: the LMS asks "what questions belong to this video,
 * and when do they fire", and optionally reports back what a learner answered.
 * Nothing here can start work, spend money, or change a video.
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
const fs = require('fs');
const checkpoints = require('./checkpoints');
const { PATHS } = require('../../orchestrator/lib/paths');
const path = require('path');

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
          auth: true, description: 'Optional. Report what a learner answered.' },
      ],
      demo: `${req.protocol}://${req.get('host')}/demo/quiz`,
      notes: [
        'atSeconds is measured from the start of <videoId>_final.mp4, which begins '
        + 'with a 2.6s brand intro. lessonAtSeconds excludes it.',
        'Do not fire a checkpoint whose timing.trusted is false.',
        'Call this server-to-server; a browser would expose the token.',
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

  // ── optional: what the learner answered ─────────────────────────────────
  // Appended to .beads/checkpoint_attempts.jsonl, matching the project's
  // append-only convention. Storing attempts is still an open decision, so this
  // records and returns rather than pretending to be a gradebook.
  router.post('/videos/:videoId/checkpoints/:id/attempts', requireToken, (req, res) => {
    const body = req.body || {};
    if (typeof body.chosenIndex !== 'number') {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Send JSON: { "chosenIndex": 0, "learnerRef": "<opaque id>" }. '
          + 'chosenIndex is required and must be a number.',
      });
    }
    const row = {
      at: new Date().toISOString(),
      videoId: req.params.videoId,
      checkpointId: req.params.id,
      chosenIndex: body.chosenIndex,
      correct: typeof body.correct === 'boolean' ? body.correct : null,
      // Opaque by design: we do not want learner identities in this repo.
      learnerRef: typeof body.learnerRef === 'string' ? body.learnerRef.slice(0, 64) : null,
    };
    try {
      fs.mkdirSync(PATHS.beads, { recursive: true });
      fs.appendFileSync(
        path.join(PATHS.beads, 'checkpoint_attempts.jsonl'),
        JSON.stringify(row) + '\n'
      );
    } catch (e) {
      return res.status(500).json({ error: 'write_failed', message: e.message });
    }
    res.status(201).json({ recorded: true, at: row.at });
  });

  return router;
}

module.exports = { build, requireToken, cors };
