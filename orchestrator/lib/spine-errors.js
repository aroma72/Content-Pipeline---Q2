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
  constructor(message, { blocker, planItem } = {}) {
    super(message);
    this.name = 'BlockedError';
    this.blocker = blocker || null;
    this.planItem = planItem || null;
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

module.exports = { BlockedError, RejectedError, RedraftError };
