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
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '',
  },

  jira: {
    baseUrl: (process.env.JIRA_BASE_URL || '').replace(/\/+$/, ''),
    email: process.env.JIRA_EMAIL || '',
    apiToken: process.env.JIRA_API_TOKEN || '',
    projectKey: process.env.JIRA_PROJECT_KEY || '',
    // Jira's outgoing webhooks are unsigned, so the shared secret rides in the
    // URL and is compared on every request. Without it the endpoint is an open
    // door that anyone can use to start paid renders.
    webhookSecret: process.env.JIRA_WEBHOOK_SECRET || '',
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
  },
};

/** Which surfaces have enough credentials to actually work. */
function readiness() {
  return {
    slack: Boolean(config.slack.botToken && config.slack.signingSecret),
    jira: Boolean(config.jira.baseUrl && config.jira.email && config.jira.apiToken),
    jiraWebhook: Boolean(config.jira.webhookSecret),
    model: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    budgetAuthorised: config.pipeline.budgetUsd > 0,
  };
}

module.exports = { config, readiness };
