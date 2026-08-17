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

const express = require('express');
const { config, readiness } = require('./lib/config');
const slack = require('./lib/slack');
const tick = require('./lib/tick');
const { parseRequest } = require('./lib/parse');

const app = express();

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
  if (!r.model) console.warn('[server] no ANTHROPIC_API_KEY — the thinking stages cannot run in a container');
  if (!r.gemini) console.warn('[server] no GEMINI_API_KEY / GOOGLE_STUDIO_API_KEY — no art or voiceover');
  if (!r.budgetAuthorised) console.warn('[server] PIPELINE_BUDGET_USD is 0 — every request will refuse to spend');
  if (r.dryRun) console.log('[server] DRY RUN is on — the chain runs but nothing is spent or rendered');

  tick.startLoop();
});
