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

module.exports = { verifySlackRequest, postMessage, uploadVideo, isConfigured: () => Boolean(client) };
