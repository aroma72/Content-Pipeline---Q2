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
const jira = require('./lib/jira');
const jobs = require('./lib/jobs');
const { parseRequest, adfToText } = require('./lib/parse');

const app = express();

// Keep the raw body: Slack's signature is computed over the exact bytes sent, so
// verifying against a re-serialised object never matches.
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

app.get('/health', (_req, res) => {
  res.json({ ok: true, surfaces: readiness(), jobs: jobs.status() });
});

app.get('/', (_req, res) => res.type('text').send('Drawing Room agent. Talk to me in Slack or Jira.'));

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

  const result = jobs.submit({
    topic: parsed.topic,
    series: parsed.series,
    origin,
    requestedBy: event.user,
  });

  if (!result.ok) await slack.postMessage({ ...origin, text: `Couldn't queue that: ${result.error}` });
}

// ─── Jira ─────────────────────────────────────────────────────────────────────

// Jira's outgoing webhooks carry no signature, so the endpoint is protected by a
// shared secret in the URL that the webhook is registered with.
app.post('/jira/webhook', (req, res) => {
  const supplied = req.query.token || req.get('x-webhook-token') || '';
  if (!config.jira.webhookSecret || supplied !== config.jira.webhookSecret) {
    console.warn('[jira] rejected webhook: bad or missing token');
    return res.status(401).send('bad token');
  }

  res.status(200).send();
  handleJira(req.body || {}).catch((e) => console.error('[jira] handler:', e));
});

async function handleJira(body) {
  const issueKey = body.issue && body.issue.key;
  if (!issueKey) return;

  // Only comments and new issues carry a request; ignore field edits, transitions
  // and the rest of the firehose Jira will send.
  let text = '';
  let author = '';
  if (body.comment) {
    text = adfToText(body.comment.body);
    author = body.comment.author && body.comment.author.accountId;
  } else if (body.webhookEvent === 'jira:issue_created' && body.issue.fields) {
    text = `${body.issue.fields.summary || ''} ${adfToText(body.issue.fields.description)}`;
  } else {
    return;
  }

  // Our own result comments contain the words that would re-trigger a build.
  if (author && author === process.env.JIRA_BOT_ACCOUNT_ID) return;

  const parsed = parseRequest(text);
  if (!parsed.ok) {
    // Stay quiet on ordinary Jira chatter — this webhook sees every comment on
    // the project, and replying to all of them would be unbearable.
    if (parsed.reason === 'no_series' || parsed.reason === 'no_topic') {
      await jira.addComment(issueKey, parsed.question);
    }
    return;
  }

  const origin = { type: 'jira', issueKey };
  const result = jobs.submit({
    topic: parsed.topic,
    series: parsed.series,
    origin,
    requestedBy: author,
  });

  if (!result.ok) await jira.addComment(issueKey, `Couldn't queue that: ${result.error}`);
}

// ─── start ────────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  const r = readiness();
  console.log(`[server] listening on ${config.port}`);
  console.log('[server] surfaces:', JSON.stringify(r));
  // Say plainly at boot what will not work, instead of letting the first real
  // request be the thing that discovers it.
  if (!r.slack) console.warn('[server] Slack is NOT configured — set SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET');
  if (!r.jira) console.warn('[server] Jira is NOT configured — set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN');
  if (!r.jiraWebhook) console.warn('[server] JIRA_WEBHOOK_SECRET unset — /jira/webhook will reject everything');
  if (!r.model) console.warn('[server] no ANTHROPIC_API_KEY — the thinking stages cannot run in a container');
  if (!r.budgetAuthorised) console.warn('[server] PIPELINE_BUDGET_USD is 0 — every request will refuse to spend');
});
