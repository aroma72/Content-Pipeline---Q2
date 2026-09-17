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
 *
 * This file is the entrypoint and nothing else. The application itself lives in
 * server/app.js, which builds it without starting anything -- see the note there
 * for why that split exists. Everything with a side effect is here: reading
 * .env, binding the port, and starting the tick loop that does paid work.
 */

// Load .env locally. On Railway the variables are already in the environment and
// there is no file, which this handles silently. Deliberately here rather than in
// app.js: building the app must not reach into the filesystem for credentials.
try { require('../orchestrator/lib/env').loadDotenv(); } catch { /* not fatal */ }

const { config, readiness } = require('./lib/config');
const tick = require('./lib/tick');
const { createApp } = require('./app');

const app = createApp();

const server = app.listen(config.port, () => {
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

module.exports = { app, server };
