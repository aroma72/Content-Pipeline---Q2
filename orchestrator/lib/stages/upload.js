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
const os = require('os');
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

/**
 * Find the branded deliverable, wherever it now lives.
 *
 * Returns `{ path, from, cleanup }`. `cleanup` is a function the caller MUST run
 * once it is done: when the bytes came down from Drive they are in a temp file
 * that nothing else will ever remove, and leaking those would recreate the disk
 * problem this whole change exists to solve.
 */
async function resolveSource(finalPath, item, log) {
  // 1. The render directory -- the normal case for a single video that runs
  //    straight through without a human pause.
  if (finalPath && fs.existsSync(finalPath)) {
    return { path: finalPath, from: 'render-dir', cleanup: () => {} };
  }

  const deliverables = require('../deliverables');

  // 2. The volume copy.
  const held = deliverables.find(item.series, item.slug);
  if (held && held.file && fs.existsSync(held.file)) {
    log('render directory is gone; uploading the copy held on the volume');
    return { path: held.file, from: 'volume', cleanup: () => {} };
  }

  // 3. Drive.
  const drive = deliverables.driveRecord(item.series, item.slug);
  if (drive && drive.saved2drive && drive.driveFileId) {
    const gdrive = require('../gdrive');
    if (!gdrive.isAuthorised()) {
      throw new BlockedError(
        `This lesson's video was offloaded to Google Drive (${drive.driveFileId}) and the ` +
        'local copies were reclaimed, but Drive is not authorised on this machine so it ' +
        'cannot be fetched back.\n  Set GDRIVE_REFRESH_TOKEN, or run: node orchestrator/gdrive-auth.js',
        { blocker: 'video is on Drive but Drive is not authorised', code: 'upload' }
      );
    }
    const tmp = path.join(os.tmpdir(), `cq-upload-${item.slug}-${Date.now()}_final.mp4`);
    log(`fetching the deliverable back from Drive (${drive.driveFileId})`);
    const got = await gdrive.downloadFile({ fileId: drive.driveFileId, toPath: tmp, log });

    // The size Drive recorded at offload time is a free integrity check on the
    // way back. A truncated download that reached YouTube would publish a video
    // that cuts off partway through, which nobody would notice until a learner did.
    if (drive.bytes && got.bytes !== drive.bytes) {
      try { fs.unlinkSync(tmp); } catch { /* best effort */ }
      throw new BlockedError(
        `Fetched ${got.bytes} bytes from Drive but the record says ${drive.bytes}. ` +
        'Refusing to publish a partial video.',
        { blocker: 'incomplete download from Drive', code: 'upload' }
      );
    }
    return {
      path: tmp,
      from: 'drive',
      cleanup: () => { try { fs.unlinkSync(tmp); } catch { /* best effort */ } },
    };
  }

  return { path: null, from: 'nowhere', cleanup: () => {} };
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
        { blocker: 'no produce artifact', code: 'upload' }
      );
    }

    const finalPath = produced.finalPath;
    if (!/_final\.mp4$/i.test(finalPath)) {
      throw new BlockedError(
        `Refusing to upload ${path.basename(finalPath)} -- only the bumper-wrapped ` +
        `_final.mp4 is the deliverable (LAW 1).`,
        { blocker: 'not the branded deliverable', code: 'upload' }
      );
    }

    if (opts.dryRun) {
      log(`dry run -- would upload ${path.basename(finalPath)} as unlisted`);
      return { skipped: 'dry-run', wouldUpload: finalPath };
    }

    // WHERE THE BYTES ARE, IN ORDER OF PREFERENCE.
    //
    // This stage runs AFTER the human review gate: a course lesson blocks at
    // `review`, waits (hours, days), and only then is requeued into `upload`. By
    // that point the Drive offload has almost always reclaimed both the render
    // directory and the volume copy, so `produced.finalPath` -- recorded by a
    // produce stage that ran before the wait -- points at a file that no longer
    // exists.
    //
    // Without this ladder, offloading would have silently broken publishing for
    // every course lesson, and it would have looked like a deliverable that went
    // missing rather than one that was deliberately moved.
    const resolved = await resolveSource(finalPath, item, log);
    const uploadPath = resolved.path;
    if (!uploadPath) {
      throw new BlockedError(
        `Deliverable is missing at ${finalPath}, and no copy was found on the volume ` +
        `or on Drive.`,
        { blocker: 'deliverable absent', code: 'upload' }
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
        { blocker: 'one-time Google OAuth consent not done', planItem: '2.1', code: 'upload' }
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
        filePath: uploadPath,
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
          blocker: 'YouTube credentials need renewing', planItem: '2.1', code: 'upload',
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
          { blocker: 'YouTube Data API v3 not enabled', planItem: '2.1', code: 'upload' }
        );
      }

      // Quota is also not a code fault, and it resets daily.
      if (/quota|rateLimitExceeded|userRateLimitExceeded/i.test(e.message)) {
        throw new BlockedError(
          `YouTube API quota exhausted: ${String(e.message).slice(0, 200)}\n` +
          '  Default quota allows roughly 6 uploads/day. It resets at midnight Pacific.',
          { blocker: 'YouTube API quota', planItem: '2.1', code: 'upload' }
        );
      }

      throw e;
    } finally {
      // Runs on success AND on every throw above. If the bytes came down from
      // Drive they are in a temp file nothing else owns, and every blocked
      // upload -- an expired grant, exhausted quota -- would otherwise leave a
      // 30MB orphan behind on the very disk this change exists to free.
      resolved.cleanup();
    }

    // Born provisional (2.3). Recorded so a human can find and clear it later
    // without the pipeline ever waiting on them.
    const provisional = result.privacyStatus !== 'public';
    if (provisional) {
      const record = {
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
      };
      jsonl.append(path.join(PATHS.beads, 'publish_review.jsonl'), record);

      // Mirrored into the job store as well, when it is durable. .beads lives on
      // the container filesystem, so on Railway this record -- the only evidence
      // that a paid-for video exists on YouTube -- died with the next redeploy.
      // The catalogue joins against this to hand the LMS a playable URL.
      try {
        if (require('../../../server/lib/publish-log').record(record)) {
          log('mirrored the publish record into the durable job store');
        }
      } catch { /* the mirror is a bonus; .beads above is the pipeline's own log */ }

      log(`flagged for review in .beads/publish_review.jsonl (still ${result.privacyStatus})`);
    }

    log(`live at ${result.url}`);
    return {
      url: result.url,
      videoId: result.videoId,
      privacyStatus: result.privacyStatus,
      bytes: result.bytes,
      provisional,
      // Which copy was published. Worth recording: "it came back from Drive" is
      // the difference between a healthy offload and a missing render.
      sourcedFrom: resolved.from,
    };
  },
};
