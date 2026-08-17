'use strict';
/**
 * Slack: request verification, replies, and delivering the finished video.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { WebClient } = require('@slack/web-api');
const { config } = require('./config');

const client = config.slack.botToken ? new WebClient(config.slack.botToken) : null;

/**
 * Confirm a request genuinely came from Slack.
 *
 * Uses the raw body: re-serialising the parsed JSON changes key order and
 * whitespace, which changes the signature, which rejects every legitimate request.
 * The timestamp check bounds replay of a captured request to five minutes, which
 * is Slack's own documented window.
 */
function verifySlackRequest(req) {
  const secret = config.slack.signingSecret;
  if (!secret) return { ok: false, reason: 'SLACK_SIGNING_SECRET is not set' };

  const signature = req.get('x-slack-signature') || '';
  const timestamp = req.get('x-slack-request-timestamp') || '';
  if (!signature || !timestamp) return { ok: false, reason: 'missing signature headers' };

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) {
    return { ok: false, reason: 'timestamp outside the replay window' };
  }

  const base = `v0:${timestamp}:${req.rawBody || ''}`;
  const mine = 'v0=' + crypto.createHmac('sha256', secret).update(base).digest('hex');

  // Both sides are fixed-length hex here, but compare in constant time anyway so
  // the check never leaks how much of a forged signature was correct.
  const a = Buffer.from(mine);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'signature mismatch' };
  }
  return { ok: true };
}

async function postMessage({ channel, text, threadTs }) {
  if (!client) return null;
  try {
    return await client.chat.postMessage({
      channel,
      text,
      thread_ts: threadTs || undefined,
      // Keep the conversation in the thread rather than scattering it in-channel.
      unfurl_links: false,
    });
  } catch (e) {
    const unreachable = /channel_not_found|not_in_channel/.test(e.message);

    // The user token searches every conversation Aroma can see, including DMs
    // and channels the bot was never invited to. Posting there is impossible, so
    // the answer goes to the home channel instead of vanishing — a reply nobody
    // receives is worse than a reply in the wrong place.
    if (unreachable && config.slack.defaultChannel && channel !== config.slack.defaultChannel) {
      try {
        return await client.chat.postMessage({
          channel: config.slack.defaultChannel,
          text: `${text}\n_(couldn't reply in the original conversation — I'm not a member of it)_`,
          unfurl_links: false,
        });
      } catch (inner) {
        console.error('[slack] fallback post failed:', inner.message);
        return null;
      }
    }

    console.error('[slack] postMessage failed:', e.message);
    return null;
  }
}

/**
 * Upload the finished MP4 into the thread.
 *
 * filesUploadV2 wraps Slack's three-step external-upload flow; the older
 * files.upload it replaces is deprecated and now fails on new apps.
 */
async function uploadVideo({ channel, threadTs, filePath, title, comment }) {
  if (!client) return null;
  if (!fs.existsSync(filePath)) {
    console.error('[slack] deliverable missing at', filePath);
    return null;
  }

  const { size } = fs.statSync(filePath);
  const ONE_GB = 1024 * 1024 * 1024;
  if (size > ONE_GB) {
    // Slack rejects the upload outright at this size, so say so rather than
    // failing silently and leaving a run that looks delivered but isn't.
    await postMessage({
      channel,
      threadTs,
      text: `The render finished but it is ${(size / ONE_GB).toFixed(2)} GB, over Slack's 1 GB limit. It's on the server at \`${filePath}\`.`,
    });
    return null;
  }

  try {
    return await client.filesUploadV2({
      channel_id: channel,
      thread_ts: threadTs || undefined,
      file: fs.createReadStream(filePath),
      filename: path.basename(filePath),
      title: title || path.basename(filePath),
      initial_comment: comment || undefined,
    });
  } catch (e) {
    console.error('[slack] upload failed:', e.message);
    await postMessage({
      channel,
      threadTs,
      text: `The video rendered but Slack rejected the upload: ${e.message}`,
    });
    return null;
  }
}

/**
 * Find messages mentioning the bot, newest last.
 *
 * search.messages needs a USER token — bot tokens get `not_allowed_token_type`.
 * Slack has no "since" parameter here, so it returns the same historical matches
 * on every call; the caller must dedupe. That is what the ticket dedupe key is
 * for, and skipping it means one mention produces a video on every single tick.
 */
async function searchMentions({ limit = 20 } = {}) {
  if (!config.slack.userToken || !config.slack.botUserId) return [];

  const query = `<@${config.slack.botUserId}>`;
  const url = `https://slack.com/api/search.messages?query=${encodeURIComponent(query)}`
    + `&count=${limit}&sort=timestamp&sort_dir=desc`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${config.slack.userToken}` } });
  const body = await res.json().catch(() => ({}));
  if (!body.ok) {
    console.error('[slack] search.messages failed:', body.error);
    return [];
  }

  return ((body.messages && body.messages.matches) || []).map((m) => ({
    text: m.text || '',
    ts: m.ts,
    // A reply belongs to its thread; a top-level message is its own thread root.
    threadTs: (m.thread_ts) || m.ts,
    channel: (m.channel && m.channel.id) || null,
    channelName: (m.channel && m.channel.name) || '',
    // Search reports a human as `user` (an id) but a bot as `username` (a name),
    // so both are carried. Comparing only the id lets the bot's own posts look
    // like someone else's and be acted on.
    user: m.user || '',
    username: m.username || '',
    botId: m.bot_id || null,
    permalink: m.permalink || '',
  })).filter((m) => m.channel);
}

/** Replies in one thread — used to look for an approval after we asked. */
async function threadReplies({ channel, threadTs, limit = 50 }) {
  if (!client) return [];
  try {
    const r = await client.conversations.replies({ channel, ts: threadTs, limit });
    return (r.messages || []).map((m) => ({
      text: m.text || '', ts: m.ts, user: m.user || '', botId: m.bot_id || null,
    }));
  } catch (e) {
    console.error('[slack] conversations.replies failed:', e.message);
    return [];
  }
}

module.exports = {
  verifySlackRequest, postMessage, uploadVideo, searchMentions, threadReplies,
  isConfigured: () => Boolean(client),
};
