'use strict';
/**
 * upload -- publish the deliverable to YouTube and return the live URL.
 * ILHAM plan 2.1, with 2.3's born-provisional rule built in.
 *
 * Two invariants worth stating, because both were tempting to break:
 *
 *  1. Only `_final.mp4` is ever uploaded. The bare render has no brand bumpers,
 *     and LAW 1 says that isn't the deliverable. Uploading it would put an
 *     unbranded video in front of learners.
 *
 *  2. Videos are born UNLISTED and flagged for review. An autonomous pipeline
 *     that could publish publicly would mean an unwatched video reaching learners
 *     the moment a QA score rounded up. A human promotes it later, asynchronously,
 *     which is 2.3's "never blocking" requirement.
 */

const fs = require('fs');
const path = require('path');
const { BlockedError } = require('../spine-errors');
const state = require('../state');
const jsonl = require('../jsonl');
const { PATHS } = require('../paths');
const yt = require('../youtube');

/**
 * The QA stage's score field is `combined_score`. Reading `qa.total` -- which never
 * existed -- silently recorded `null` in the review log and dropped the score from
 * the video description, i.e. exactly the number a human reviewer needs. Read the
 * real field, tolerate `total` in case an older run's artifact is replayed.
 */
function qaScoreOf(qa) {
  if (!qa) return null;
  if (typeof qa.combined_score === 'number') return qa.combined_score;
  if (typeof qa.total === 'number') return qa.total;
  return null;
}

/** Description shown on YouTube. Kept factual; no invented claims about the video. */
function buildDescription({ item, script, qa }) {
  const lines = [];
  if (script && script.beats) {
    // The spoken script IS the most useful description, and doubles as a transcript.
    lines.push(script.beats.map((b) => b.vo).join(' '));
    lines.push('');
  }
  lines.push(`Series: ${item.series}`);
  const qaScore = qaScoreOf(qa);
  if (qaScore !== null) lines.push(`Internal QA score: ${qaScore.toFixed(1)}/7.0`);
  lines.push('');
  lines.push('Produced by the Drawing Room content pipeline for Taleemabad.');
  return lines.join('\n').slice(0, 4900); // YouTube's limit is 5000
}

module.exports = {
  name: 'upload',
  // One attempt at the stage level: uploadVideo already retries and resumes
  // internally, so a second stage attempt would re-upload from scratch and risk
  // a duplicate video on the channel.
  maxAttempts: 1,

  async run(ctx) {
    const { item, state: st, artifacts, opts, log } = ctx;

    const produced = artifacts.produce;
    if (!produced || !produced.finalPath) {
      throw new BlockedError(
        'Nothing to upload: the produce stage did not report a final deliverable.',
        { blocker: 'no produce artifact' }
      );
    }

    const finalPath = produced.finalPath;
    if (!/_final\.mp4$/i.test(finalPath)) {
      throw new BlockedError(
        `Refusing to upload ${path.basename(finalPath)} -- only the bumper-wrapped ` +
        `_final.mp4 is the deliverable (LAW 1).`,
        { blocker: 'not the branded deliverable' }
      );
    }

    if (opts.dryRun) {
      log(`dry run -- would upload ${path.basename(finalPath)} as unlisted`);
      return { skipped: 'dry-run', wouldUpload: finalPath };
    }

    if (!fs.existsSync(finalPath)) {
      throw new BlockedError(
        `Deliverable is missing at ${finalPath}.`,
        { blocker: 'deliverable absent' }
      );
    }

    // Fail closed, and say exactly what a human must do once. This is a blocker
    // rather than an error because nothing is wrong with the video or the code --
    // a person simply has not granted consent yet.
    if (!yt.isAuthorised()) {
      throw new BlockedError(
        'YouTube is not authorised on this machine. A human must run once:\n' +
        '    node orchestrator/youtube-auth.js\n' +
        '  (needs YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET in .env)',
        { blocker: 'one-time Google OAuth consent not done', planItem: '2.1' }
      );
    }

    const title = (artifacts.script && artifacts.script.title) || item.topic;
    const privacyStatus = opts.publishPublic ? 'public' : 'unlisted';

    if (opts.publishPublic) {
      // Loud, and recorded: this bypasses 2.3's provisional-publish safeguard.
      log('WARNING: --publish-public given, so 2.3 born-unlisted is bypassed');
      state.recordIntervention(st, {
        stage: 'upload',
        kind: 'public_publish_override',
        detail: 'Operator passed --publish-public; video goes live without human review.',
      });
    }

    let result;
    try {
      result = await yt.uploadVideo({
        filePath: finalPath,
        title,
        description: buildDescription({ item, script: artifacts.script, qa: artifacts.qa }),
        tags: [item.series, 'Taleemabad', 'explainer'],
        privacyStatus,
        log: (m) => log(m),
      });
    } catch (e) {
      // An expired/revoked grant is a human problem, not a code failure -- report
      // it as blocked so the queue item can be requeued once consent is renewed.
      if (e instanceof yt.YouTubeAuthError) {
        throw new BlockedError(`YouTube authorisation failed: ${e.message}`, {
          blocker: 'YouTube credentials need renewing', planItem: '2.1',
        });
      }

      // "API not enabled" is a one-click console setting, not a bug. Surface it as
      // a blocker naming the exact page, so nobody re-reads this stack trace
      // looking for a code fault that isn't there.
      const enableUrl = (String(e.message).match(/https:\/\/console\.developers\.google\.com\S*?(?=["\s\\])/) || [])[0];
      if (/has not been used in project|is disabled/i.test(e.message)) {
        throw new BlockedError(
          'The YouTube Data API v3 is not enabled on this Google Cloud project.\n' +
          `  Enable it here, then requeue:\n    ${enableUrl || 'https://console.cloud.google.com/apis/library/youtube.googleapis.com'}\n` +
          '  (Creating the OAuth client does not enable the API -- they are separate steps.)',
          { blocker: 'YouTube Data API v3 not enabled', planItem: '2.1' }
        );
      }

      // Quota is also not a code fault, and it resets daily.
      if (/quota|rateLimitExceeded|userRateLimitExceeded/i.test(e.message)) {
        throw new BlockedError(
          `YouTube API quota exhausted: ${String(e.message).slice(0, 200)}\n` +
          '  Default quota allows roughly 6 uploads/day. It resets at midnight Pacific.',
          { blocker: 'YouTube API quota', planItem: '2.1' }
        );
      }

      throw e;
    }

    // Born provisional (2.3). Recorded so a human can find and clear it later
    // without the pipeline ever waiting on them.
    const provisional = result.privacyStatus !== 'public';
    if (provisional) {
      jsonl.append(path.join(PATHS.beads, 'publish_review.jsonl'), {
        type: 'provisional_publish',
        at: new Date().toISOString(),
        runId: st.runId,
        itemId: item.id,
        series: item.series,
        title,
        url: result.url,
        videoId: result.videoId,
        privacyStatus: result.privacyStatus,
        qaTotal: qaScoreOf(artifacts.qa),
        cleared: false,
        note: 'Unlisted pending human review. Clear by setting cleared=true after watching.',
      });
      log(`flagged for review in .beads/publish_review.jsonl (still ${result.privacyStatus})`);
    }

    log(`live at ${result.url}`);
    return {
      url: result.url,
      videoId: result.videoId,
      privacyStatus: result.privacyStatus,
      bytes: result.bytes,
      provisional,
    };
  },
};
