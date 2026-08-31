'use strict';
/**
 * review -- a human sees the video before it reaches YouTube.
 *
 * Aroma's rule (2026-08-31): the finished video is shared with her on Slack, she
 * approves, rejects or asks for changes there, and only then does it go up
 * unlisted. So this sits between `qa` and `upload` and fails CLOSED: without an
 * explicit approval the run stops as `blocked`, never `done`.
 *
 * The same shape as the spend gate that already works in server/lib/tick.js:
 * silence is not consent. An unanswered ticket stays blocked forever rather than
 * eventually publishing, because the failure mode of the alternative -- a video
 * nobody watched appearing on the channel -- is the one worth being slow about.
 *
 * Approval is granted by the caller (`opts.reviewApproved`), not read from here:
 * this stage knows nothing about Slack, which is what keeps the spine free of the
 * front door's concerns.
 */

const { BlockedError } = require('../spine-errors');
const state = require('../state');

/** Marker the front door matches on to know a run is waiting for a person. */
const AWAITING_REVIEW = 'awaiting human review';

module.exports = {
  name: 'review',
  maxAttempts: 1,

  async run({ item, state: st, artifacts, opts, log }) {
    const produced = artifacts.produce || {};
    const qa = artifacts.qa || {};

    // A dry run must still exercise the ordering, but blocking every dry run would
    // make the chain untestable -- so it passes through and says it did.
    if (opts.dryRun) {
      log('dry run -- human review skipped (a real run stops here until approved)');
      return { approved: true, by: '(dry run)' };
    }

    if (opts.reviewApproved) {
      const by = typeof opts.reviewApproved === 'string' ? opts.reviewApproved : 'human';
      log(`approved by ${by} -- proceeding to upload`);
      state.recordIntervention(st, {
        stage: 'review',
        kind: 'human_approved',
        detail: `${by} approved publishing "${item.topic}" after watching it.`,
      });
      return { approved: true, by };
    }

    // Everything the reviewer needs to decide, carried on the error so the front
    // door can post it without reaching back into the run state.
    throw new BlockedError(
      `${AWAITING_REVIEW}: the video is finished and has not been approved for upload yet.`,
      {
        blocker: AWAITING_REVIEW,
        planItem: '2.3',
        details: {
          finalPath: produced.finalPath || null,
          qaScore: typeof qa.combined_score === 'number' ? qa.combined_score : null,
          sensorResults: produced.sensorResults || [],
        },
      }
    );
  },

  AWAITING_REVIEW,
};
