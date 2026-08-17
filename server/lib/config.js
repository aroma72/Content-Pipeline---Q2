'use strict';
/**
 * Environment the server reads, in one place.
 *
 * Nothing here throws on load. A missing Jira token should disable Jira and leave
 * Slack working, not crash the container into a restart loop where the logs that
 * would explain the problem scroll past before anyone can read them. Each surface
 * reports its own readiness instead, and /health shows what is live.
 */

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const config = {
  port: num(process.env.PORT, 8080),

  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    // search.messages is not available to bot tokens, so polling needs a user
    // token. It acts as the human who issued it — that is the price of not
    // running webhooks.
    userToken: process.env.SLACK_USER_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '',
    botUserId: process.env.SLACK_BOT_USER_ID || '',
  },

  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
    databaseId: process.env.NOTION_DATABASE_ID || '',
  },

  tick: {
    // 0 disables the loop entirely; the /tick endpoint still works by hand.
    intervalMs: num(process.env.TICK_INTERVAL_MS, 120000),
    // Guards the manual /tick endpoint so it cannot be triggered by strangers.
    secret: process.env.TICK_SECRET || '',
  },

  pipeline: {
    // Which series a request lands in when the message does not say. Left empty
    // on purpose: guessing puts a video in the wrong folder, so the bot asks.
    defaultSeries: process.env.DEFAULT_SERIES || '',
    // produce refuses to spend on art and TTS without a pre-authorised budget.
    budgetUsd: num(process.env.PIPELINE_BUDGET_USD, 0),
    // upload needs a one-time Google OAuth grant that a fresh container does not
    // have, so the chain stops at qa and the video is delivered as a file.
    stopAfter: process.env.PIPELINE_STOP_AFTER || 'qa',
    dryRun: process.env.PIPELINE_DRY_RUN === '1',
    // A video costing more than budgetUsd is not refused outright — it stops and
    // asks. Aroma's rule: never exceed the ceiling without explicit permission,
    // and never treat silence as permission.
    askAboveBudget: process.env.PIPELINE_ASK_ABOVE_BUDGET !== '0',
    // The hard wall. Even an approval cannot spend past this on one video.
    maxApprovableUsd: num(process.env.PIPELINE_MAX_APPROVABLE_USD, 10),
  },
};

/** Which surfaces have enough credentials to actually work. */
function readiness() {
  return {
    slackPost: Boolean(config.slack.botToken),
    slackPoll: Boolean(config.slack.userToken),
    notion: Boolean(config.notion.apiKey && config.notion.databaseId),
    // The judgement stages prefer `claude -p` under the subscription, so a
    // long-lived CLI token counts as "we can reach a model" just as much as an
    // API key does. Reporting only on the key made a working CLI setup look
    // broken on /health.
    model: Boolean(
      process.env.CLAUDE_CODE_OAUTH_TOKEN
      || process.env.ANTHROPIC_API_KEY
      || process.env.ANTHROPIC_AUTH_TOKEN
    ),
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_STUDIO_API_KEY),
    budgetAuthorised: config.pipeline.budgetUsd > 0,
    dryRun: config.pipeline.dryRun,
  };
}

module.exports = { config, readiness };
