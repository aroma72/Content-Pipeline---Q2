'use strict';
/**
 * Stage control-flow errors.
 *
 * These live in their own module because spine.js requires the stages and the
 * stages need to throw these -- putting them in spine.js would make that a
 * require cycle, and a cycle here resolves to `undefined` at load time, so
 * `err instanceof BlockedError` would silently be false and a blocked run would
 * be misreported as a crash.
 */

/** A dependency the stage cannot proceed without (missing spec, access, approval). */
class BlockedError extends Error {
  constructor(message, { blocker, planItem, details, code } = {}) {
    super(message);
    this.name = 'BlockedError';
    this.blocker = blocker || null;
    this.planItem = planItem || null;
    // A stable, closed-set name for WHY this blocked, as opposed to `blocker`
    // and `message`, which are prose for a person to read. It is the only part
    // of this error that survives to the queue and out through the API, because
    // a caller deciding what to show cannot match on a sentence a model wrote.
    //
    // The closed set is BLOCKED_BY below -- use it rather than a literal, because
    // this list drifted for months: the prose here named six values, the API
    // description named seven, and the code threw nine. A consumer downstream
    // wrote off matching on it entirely for that reason.
    this.code = code || null;
    // Anything the blocker's handler needs to act (a file to post, a score to
    // quote). Named keys passed as siblings are silently dropped by this
    // destructure, so everything structured goes in here.
    this.details = details || null;
  }
}

/** The work was produced but failed its own quality bar. Not a crash. */
class RejectedError extends Error {
  constructor(message, { verdict, details } = {}) {
    super(message);
    this.name = 'RejectedError';
    this.verdict = verdict || null;
    this.details = details || null;
  }
}

/**
 * The work is fixable and the reviewer said how -- rewind and try again.
 * ILHAM plan 3.3.
 *
 * Distinct from RejectedError, which is terminal. The gate used to produce a
 * precise, actionable critique and then the run simply stopped, with nobody
 * acting on it. This carries the critique back to an earlier stage so the next
 * draft can answer it.
 */
class RedraftError extends Error {
  constructor(message, { fromStage, feedback, verdict } = {}) {
    super(message);
    this.name = 'RedraftError';
    if (!fromStage) throw new Error('RedraftError needs a fromStage to rewind to');
    this.fromStage = fromStage;
    this.feedback = feedback || message;
    this.verdict = verdict || null;
  }
}

/**
 * Every value `BlockedError.code` can take, and the one a block defaults to.
 *
 * It lives here rather than in queue.js because the throwers are the stages and
 * the spine, which already require this module and do not require the queue. The
 * queue re-exports it for the server side.
 *
 * This is a PUBLISHED contract: it is served on the API index so a caller can pin
 * a test against it instead of reading our comments. Adding a value means adding
 * it here first -- test-regressions asserts that every `code:` thrown under
 * orchestrator/lib is a member of this map.
 */
const BLOCKED_BY = {
  /** The container cannot render at all -- a broken deploy, not a bad video. */
  PREFLIGHT: 'preflight',
  /** A person must watch the video and approve it. The ordinary case. */
  REVIEW: 'review',
  /** A sensor on the finished render disagreed with the script. */
  POST_RENDER_CHECK: 'post-render-check',
  /** Money is needed and no budget was pre-approved. */
  SPEND_APPROVAL: 'spend-approval',
  /** produce could not start: beats.js was missing. */
  PRODUCE_INPUT: 'produce-input',
  /** YouTube would not take it -- credentials, consent, API, or quota. */
  UPLOAD: 'upload',
  /** The NAZIM content-write hand-off, which is not built. */
  NAZIM: 'nazim',
  /** The worker died mid-run; the lesson needs rebuilding, not approving. */
  INTERRUPTED: 'interrupted',
  /** The run hit the wall-clock ceiling. */
  TIME_CEILING: 'time-ceiling',
  /** QA had nothing assessable to score. */
  QA_NO_EVIDENCE: 'qa-no-evidence',
};

/**
 * What a block records when the thrower did not say why.
 *
 * 'review' and not 'unknown': every caller has one Approve button, and the
 * ordinary meaning of a block is "a person must look". Defaulting to a value
 * nobody handles would be worse than defaulting to the common case.
 */
const DEFAULT_BLOCKED_BY = BLOCKED_BY.REVIEW;

/** Every value, for validation and for serving on the API index. */
const BLOCKED_BY_VALUES = Object.freeze(Object.values(BLOCKED_BY));

module.exports = {
  BlockedError, RejectedError, RedraftError,
  BLOCKED_BY, DEFAULT_BLOCKED_BY, BLOCKED_BY_VALUES,
};
