'use strict';
/**
 * Environment the server reads, in one place.
 *
 * Nothing here throws on load. A missing Jira token should disable Jira and leave
 * Slack working, not crash the container into a restart loop where the logs that
 * would explain the problem scroll past before anyone can read them. Each surface
 * reports its own readiness instead, and /health shows what is live.
 */

/**
 * A number from the environment, or the fallback.
 *
 * The blank check is not defensive tidying. `Number('')` is 0, and 0 is finite, so a
 * variable set to an empty string in Railway -- which looks configured in the
 * dashboard -- used to read as a deliberate zero. For PIPELINE_BUDGET_USD that is the
 * difference between "nobody set a budget" and "somebody authorised nothing", and the
 * second silently blocks every course lesson at produce.
 */
const num = (v, fallback) => {
  if (v === undefined || v === null || String(v).trim() === '') return fallback;
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
    // Where the chain stops when nobody says otherwise. 'qa' is the cautious
    // default for a container that has never been given the one-time Google OAuth
    // grant: the video is delivered as a file rather than failing at upload.
    // Production sets this to 'upload' and HAS that grant, so the default is the
    // fallback, not the live behaviour -- check the variable before reasoning from
    // this line.
    stopAfter: process.env.PIPELINE_STOP_AFTER || 'qa',
    // Courses resolve their own stop stage instead of inheriting the line above.
    //
    // Not a preference -- a fuse. The spine settles reaching stopAfter as `done`,
    // and 'qa' is one stage BEFORE 'review'. Any deployment that leaves the line
    // above at its default therefore builds a course lesson, pays for it, marks it
    // done, and never pauses for a person: awaitingApproval stays empty and the
    // approve/reject routes have nothing to act on. Production was not in that
    // state, but it was one variable away from it, and the LMS read the default and
    // reasonably concluded it was.
    //
    // 'upload' is what production already ran courses at, and it keeps publishing
    // working -- 'review' comes first in STAGE_ORDER regardless, so the lesson still
    // pauses for approval and only then goes up, unlisted and flagged for a human.
    // Deliberately NOT chained off PIPELINE_STOP_AFTER: a future change to the
    // single-video path must not be able to drag courses back behind 'review'.
    courseStopAfter: process.env.PIPELINE_COURSE_STOP_AFTER || 'upload',
    // What a course build reserves per lesson on the tenant ledger before it
    // starts; settled to the real cost when the lesson ends. $2.50 is what the
    // LMS already authorises per lesson, and above every measured full-cost run.
    courseLessonReserveUsd: num(process.env.PIPELINE_COURSE_LESSON_RESERVE_USD, 2.5),
    dryRun: process.env.PIPELINE_DRY_RUN === '1',
    // A video costing more than budgetUsd is not refused outright — it stops and
    // asks. Aroma's rule: never exceed the ceiling without explicit permission,
    // and never treat silence as permission.
    askAboveBudget: process.env.PIPELINE_ASK_ABOVE_BUDGET !== '0',
    // The hard wall. Even an approval cannot spend past this on one video.
    maxApprovableUsd: num(process.env.PIPELINE_MAX_APPROVABLE_USD, 10),
  },
};

/**
 * Is this string shaped like an Anthropic credential at all?
 *
 * Presence was not enough. Someone pasted the project's own `cq_...` API token
 * into CLAUDE_CODE_OAUTH_TOKEN, /health cheerfully reported `model: true`, and
 * every video request still died in `research` -- because the CLI rejected it.
 * A health check that goes green on a credential that cannot possibly work is
 * worse than one that goes red: it sends you looking in the wrong place.
 *
 * Deliberately a shape check, not a live call: /health must stay instant and
 * free. It cannot tell you the token is VALID, only that it is the right kind of
 * thing -- which is the mistake that actually happened.
 */
function looksLikeAnthropicCredential(v) {
  return typeof v === 'string' && /^sk-ant-/.test(v.trim());
}

/** Which surfaces have enough credentials to actually work. */
function readiness() {
  // The judgement stages prefer `claude -p` under the subscription, so a
  // long-lived CLI token counts as "we can reach a model" just as much as an
  // API key does. Reporting only on the key made a working CLI setup look
  // broken on /health.
  const modelVars = {
    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
  };
  const set = Object.entries(modelVars).filter(([, v]) => Boolean(v));
  const usable = set.filter(([, v]) => looksLikeAnthropicCredential(v));
  const malformed = set.filter(([, v]) => !looksLikeAnthropicCredential(v)).map(([k]) => k);

  return {
    slackPost: Boolean(config.slack.botToken),
    slackPoll: Boolean(config.slack.userToken),
    notion: Boolean(config.notion.apiKey && config.notion.databaseId),
    model: usable.length > 0,
    // Name the variable that is set but wrong, so the next person is not left
    // comparing an opaque false against a variable they can see is populated.
    modelNote: usable.length
      ? undefined
      : (malformed.length
        ? `${malformed.join(', ')} is set but does not look like an Anthropic credential `
          + `(expected it to start "sk-ant-"). The thinking stages will fail in research.`
        : 'no model credential set; the thinking stages cannot run'),
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_STUDIO_API_KEY),
    budgetAuthorised: config.pipeline.budgetUsd > 0,
    dryRun: config.pipeline.dryRun,
  };
}

module.exports = { config, readiness, looksLikeAnthropicCredential };
