'use strict';
/**
 * Drawing Room — the agent you talk to.
 *
 * Two front doors, one worker:
 *   POST /slack/events   mention the bot in Slack
 *   POST /jira/webhook   mention it in a Jira comment
 *
 * Both do the same thing: acknowledge in milliseconds, hand the request to the
 * worker, and let the worker report back into the conversation it came from.
 */

// Load .env locally. On Railway the variables are already in the environment and
// there is no file, which this handles silently.
try { require('../orchestrator/lib/env').loadDotenv(); } catch { /* not fatal */ }

const fs = require('fs');
const path = require('path');
const express = require('express');
const { config, readiness } = require('./lib/config');
const slack = require('./lib/slack');
const tick = require('./lib/tick');
const { parseRequest } = require('./lib/parse');

const app = express();

// Railway terminates TLS at its edge and forwards over http, so without this
// req.protocol reads "http" and the self-describing API index hands the LMS
// developer http:// example URLs for an https-only service.
app.set('trust proxy', true);

// Keep the raw body: Slack's signature is computed over the exact bytes sent, so
// verifying against a re-serialised object never matches.
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

app.get('/health', (_req, res) => {
  res.json({ ok: true, surfaces: readiness(), tick: tick.status() });
});

app.get('/', (_req, res) => res.type('text').send('Drawing Room agent. Mention me in Slack, or file a ticket in Notion.'));

// ─── Checkpoint API + demo (Taleemabad University integration) ────────────────

// The read API the LMS calls for a video's in-video questions. Mounted before
// the Slack routes because it shares nothing with them: no signature check, no
// worker, no spend. See server/lib/api.js for the auth and CORS rules.
const apiRouter = require('./lib/api').build();
app.use('/api/v1', apiRouter);

/**
 * The interactive demo the LMS developer is asked to reproduce. Served from this
 * repo so the specification and the running example can never drift apart, and
 * so the developer needs no Claude account to see it.
 *
 * Self-contained on purpose: it does NOT call the API above, because doing so
 * from a browser would mean shipping the API token to the client.
 */
const DEMO_FILE = path.join(__dirname, '..', 'prototypes', 'lms-quiz-popup-prototype.html');
app.get('/demo/quiz', (_req, res) => {
  if (!fs.existsSync(DEMO_FILE)) {
    return res.status(404).type('text').send('Demo not built. Run: node prototypes/build.js');
  }
  // The page embeds its images as data URIs, so it needs no other assets.
  res.set('Cache-Control', 'public, max-age=300');
  res.type('html').send(fs.readFileSync(DEMO_FILE, 'utf8'));
});
app.get('/demo', (_req, res) => res.redirect(302, '/demo/quiz'));

/** The course-builder prototype. Needs no credential — see the demo planner below. */
const COURSE_FILE = path.join(__dirname, '..', 'prototypes', 'course-builder.html');
app.get('/demo/course-builder', (_req, res) => {
  if (!fs.existsSync(COURSE_FILE)) {
    return res.status(404).type('text').send('Course builder prototype not deployed.');
  }
  res.set('Cache-Control', 'public, max-age=300');
  res.type('html').send(fs.readFileSync(COURSE_FILE, 'utf8'));
});

/**
 * Planning for the demo page, with no token required.
 *
 * The token was removed so anyone handed the link can try it. That makes this
 * an unauthenticated endpoint that spends real money on every call -- roughly
 * $0.64 a plan -- so it is rate limited instead. Without a limit, one crawler
 * or one shared link is an open tap on the model budget.
 *
 * Limits are per running container and reset on redeploy. That is fine for a
 * prototype and deliberately not presented as security: the protection here is
 * that the URL is unlisted and the cost per caller is capped, not that callers
 * are identified. The real API at /api/v1/courses/plan still requires a token.
 */
const DEMO_LIMIT = { perIpPerHour: 5, globalPerHour: 40 };
const demoHits = [];           // timestamps, newest last
const demoByIp = new Map();    // ip -> timestamps

function demoRateCheck(ip) {
  const now = Date.now();
  const hourAgo = now - 3600_000;
  while (demoHits.length && demoHits[0] < hourAgo) demoHits.shift();
  const mine = (demoByIp.get(ip) || []).filter((t) => t >= hourAgo);

  if (demoHits.length >= DEMO_LIMIT.globalPerHour) {
    return { ok: false, why: 'This demo has planned as many courses as it is allowed to '
      + 'this hour. Try again shortly, or use the API with a token.' };
  }
  if (mine.length >= DEMO_LIMIT.perIpPerHour) {
    return { ok: false, why: `The demo allows ${DEMO_LIMIT.perIpPerHour} plans an hour. `
      + 'Try again later, or use the API with a token for unlimited planning.' };
  }
  mine.push(now);
  demoByIp.set(ip, mine);
  demoHits.push(now);
  // Keep the per-IP map from growing without bound on a long-lived container.
  if (demoByIp.size > 500) {
    for (const [k, v] of demoByIp) if (!v.some((t) => t >= hourAgo)) demoByIp.delete(k);
  }
  return { ok: true };
}

/**
 * Render a real preview video for one planned lesson.
 *
 * The simplest thing that actually works end to end: the lesson's own words,
 * drawn by the real renderer, in under a minute, for nothing. No art, no
 * voiceover, no branding -- those are the parts that break, and none of them is
 * needed to show that a plan becomes a video.
 */
app.post('/demo/course-builder/preview', async (req, res) => {
  const preview = require('./lib/lesson-preview');
  try {
    const r = await preview.render((req.body || {}).lesson);
    res.json({
      id: r.id,
      seconds: r.seconds,
      url: `${req.protocol}://${req.get('host')}/demo/preview/${r.id}.mp4`,
      note: 'Cards only -- no illustration, narration or branding. A preview of the '
        + 'content, not a sample of the finished lesson.',
    });
  } catch (e) {
    console.error('[preview]', e.message);
    res.status(e.status || 500).json({ error: 'preview_failed', message: e.message });
  }
});

/**
 * Start a build from the demo page, using the server's own credential.
 *
 * The page used to ask the operator to paste CONTENT_API_TOKEN. It is already
 * configured on this service, so asking for it again was friction with no
 * security value -- anyone holding the link can reach this route regardless.
 *
 * But building SPENDS REAL MONEY (~$1.50 a lesson), so removing the key removes
 * the only thing that made a stray click expensive. Two guards replace it:
 * the page still makes a human press Build twice with the cost on screen, and
 * this route allows one build an hour. The authenticated API at
 * /api/v1/courses/build stays unlimited for machine callers.
 */
const demoBuilds = [];
app.post('/demo/course-builder/build', (req, res) => {
  const hourAgo = Date.now() - 3600_000;
  while (demoBuilds.length && demoBuilds[0] < hourAgo) demoBuilds.shift();
  if (demoBuilds.length >= 1) {
    return res.status(429).json({
      error: 'rate_limited',
      message: 'The demo starts one build an hour, because each one spends real money. '
        + 'Use the API with a token to build without that limit.',
    });
  }

  // Reuse the authenticated route itself rather than a second copy of its
  // logic: supply the credential the service already holds, rewrite the path to
  // the one the API router expects, and hand the request straight to it.
  req.headers.authorization = `Bearer ${process.env.CONTENT_API_TOKEN || ''}`;
  req.url = '/courses/build';
  demoBuilds.push(Date.now());
  apiRouter(req, res, () => res.status(404).end());
});

/** Build progress for the demo page, again using the server's own credential. */
app.get('/demo/course-builder/status/:courseId', (req, res) => {
  req.headers.authorization = `Bearer ${process.env.CONTENT_API_TOKEN || ''}`;
  req.url = '/courses/' + encodeURIComponent(req.params.courseId);
  apiRouter(req, res, () => res.status(404).end());
});

app.get('/demo/preview/:id.mp4', (req, res) => {
  const file = require('./lib/lesson-preview').fileFor(req.params.id);
  if (!file) return res.status(404).type('text').send('No such preview.');
  res.type('video/mp4');
  res.set('Cache-Control', 'public, max-age=3600');
  require('fs').createReadStream(file).pipe(res);
});

app.post('/demo/course-builder/plan', async (req, res) => {
  const ip = req.ip || 'unknown';
  const gate = demoRateCheck(ip);
  if (!gate.ok) return res.status(429).json({ error: 'rate_limited', message: gate.why });

  try {
    const plan = await require('./lib/course-planner')
      .plan(req.body || {}, { log: (m) => console.log('[demo-course]', m) });
    res.json(plan);
  } catch (e) {
    console.error('[demo-course]', e.message);
    res.status(e.status || 500).json({ error: 'plan_failed', message: e.message });
  }
});

/**
 * Run a tick by hand. Useful for testing without waiting for the timer, and for
 * driving the loop from an external scheduler instead of the in-process one.
 * Secret-gated: a tick starts real, paid work.
 */
app.post('/tick', async (req, res) => {
  const supplied = req.query.token || req.get('x-tick-token') || '';
  if (!config.tick.secret || supplied !== config.tick.secret) {
    return res.status(401).json({ error: 'bad or missing token' });
  }
  // A tick can run for the length of a render, far longer than any sane HTTP
  // timeout, so acknowledge immediately and let it continue in the background.
  res.status(202).json({ started: true });
  tick.runTick({ trigger: 'manual' }).catch((e) => console.error('[tick]', e.message));
});

// ─── Slack ────────────────────────────────────────────────────────────────────

// Slack resends an event if it does not get a 200 within three seconds, and a
// slow render means that will happen. Without this, one mention starts the same
// video three times and pays for the art three times.
const seenEvents = new Set();
function alreadyHandled(id) {
  if (!id) return false;
  if (seenEvents.has(id)) return true;
  seenEvents.add(id);
  // Bound the set so a long-lived container does not leak memory.
  if (seenEvents.size > 1000) seenEvents.delete(seenEvents.values().next().value);
  return false;
}

app.post('/slack/events', (req, res) => {
  const body = req.body || {};

  // Slack proves it owns the endpoint before it will send any events. This
  // handshake is unsigned, so it is answered before the signature check.
  if (body.type === 'url_verification') return res.type('text').send(body.challenge);

  const check = slack.verifySlackRequest(req);
  if (!check.ok) {
    console.warn('[slack] rejected request:', check.reason);
    return res.status(401).send('bad signature');
  }

  // Acknowledge now; everything below runs after the response is on the wire.
  res.status(200).send();

  const event = body.event;
  if (!event) return;
  if (alreadyHandled(body.event_id)) return;

  // Never react to our own messages — the bot posts progress into the same
  // thread, and replying to that would loop.
  if (event.bot_id || event.subtype === 'bot_message') return;
  if (event.type !== 'app_mention' && !(event.type === 'message' && event.channel_type === 'im')) return;

  handleSlack(event).catch((e) => console.error('[slack] handler:', e));
});

async function handleSlack(event) {
  const origin = {
    type: 'slack',
    channel: event.channel,
    // Reply in-thread so a busy channel stays readable.
    threadTs: event.thread_ts || event.ts,
  };

  const parsed = parseRequest(event.text);

  if (!parsed.ok) {
    if (parsed.reason === 'not_a_request' || parsed.reason === 'empty') {
      await slack.postMessage({
        ...origin,
        text:
          'Ask me for a video and I\'ll make one — e.g. ' +
          '`make a video about what a rubric actually does, series: evals`.',
      });
      return;
    }
    await slack.postMessage({ ...origin, text: parsed.question });
    return;
  }

  // The webhook path does not dispatch directly. It creates the ticket the tick
  // would have created, then lets the tick pick it up — so a video started by a
  // push and one started by polling follow the identical path, and there is only
  // one place where work can begin.
  const notion = require('./lib/notion');
  try {
    const ticket = await notion.createTicket({
      title: parsed.topic,
      series: parsed.series,
      source: 'slack',
      dedupeKey: `slack-${event.channel}-${event.ts}`,
      notes: `[slack:${event.channel}/${origin.threadTs}]`,
    });
    if (!ticket.alreadyExisted) {
      await slack.postMessage({ ...origin, text: `Queued *${parsed.topic}*.\n${ticket.url}` });
      tick.runTick({ trigger: 'slack-event' }).catch(() => {});
    }
  } catch (e) {
    await slack.postMessage({ ...origin, text: `Couldn't queue that: ${e.message}` });
  }
}

// ─── start ────────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  const r = readiness();
  console.log(`[server] listening on ${config.port}`);
  console.log('[server] surfaces:', JSON.stringify(r));
  // Say plainly at boot what will not work, instead of letting the first real
  // request be the thing that discovers it.
  if (!r.slackPost) console.warn('[server] SLACK_BOT_TOKEN unset — cannot post or upload');
  if (!r.slackPoll) console.warn('[server] SLACK_USER_TOKEN unset — cannot poll for mentions (search.messages needs a user token)');
  if (!r.notion) console.warn('[server] NOTION_API_KEY / NOTION_DATABASE_ID unset — no work queue');
  if (!r.model) console.warn(`[server] MODEL UNAVAILABLE — ${r.modelNote}`);
  if (!r.gemini) console.warn('[server] no GEMINI_API_KEY / GOOGLE_STUDIO_API_KEY — no art or voiceover');
  if (!r.budgetAuthorised) console.warn('[server] PIPELINE_BUDGET_USD is 0 — every request will refuse to spend');
  if (r.dryRun) console.log('[server] DRY RUN is on — the chain runs but nothing is spent or rendered');

  tick.startLoop();
});
