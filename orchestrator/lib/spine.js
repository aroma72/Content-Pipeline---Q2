'use strict';
/**
 * The orchestrator spine (ILHAM plan 3.1).
 *
 *   research -> script -> gate -> produce -> qa -> upload -> nazim
 *
 * The spine owns *sequencing, retry, persistence and measurement*. It knows
 * nothing about how a video is made -- every stage is a plugin behind one
 * interface, so 3.3 (gate auto-retry), 3.4 (auto-QA) and 2.1/2.2 (upload,
 * NAZIM) drop in by replacing a stage, never by editing this file.
 *
 * Two deliberate design choices:
 *
 * 1. Stages that are not built yet FAIL CLOSED. `upload` and `nazim` throw
 *    BlockedError, which halts the run as `blocked` rather than `failed`, and
 *    never marks the queue item done. A spine that silently skipped them would
 *    report success for videos that never reached a learner.
 *
 * 2. Retries are per-stage and bounded, and a retried stage must be
 *    idempotent-by-skip: `produce` checks for its own outputs and does not pay
 *    for art or TTS twice. Money is the reason retry is not a blanket wrapper.
 */

const state = require('./state');
const queue = require('./queue');
const jsonl = require('./jsonl');
const { PATHS } = require('./paths');

// Defined in their own module so requiring them from a stage does not create a
// cycle with this file (see spine-errors.js).
const { BlockedError, RejectedError, RedraftError } = require('./spine-errors');

// How many times a reviewer may send work back before the run is called failed.
// The plan said 3; measurement says otherwise. With the patch mechanism the critique
// shrinks steadily (22->21->18->19->15) and round 5 ended with the gate saying
// "three line-level defects... these are edits, not a redraft" -- i.e. it was one
// round short, twice. Still bounded, because a loop that cannot converge must stop.
const MAX_REDRAFTS = 8;

// Waits before the 2nd, 3rd and later stage attempts.
const RETRY_BACKOFF_MS = [5000, 15000, 30000];

/**
 * Stage contract. Every stage is:
 *   {
 *     name:     string,
 *     maxAttempts: number,           // bounded retry for transient failures
 *     run: async (ctx) => output     // ctx = { item, state, artifacts, opts, log }
 *   }
 * `output` is persisted to state.artifacts[name] and passed to later stages.
 */
const STAGE_ORDER = ['research', 'script', 'gate', 'produce', 'qa', 'upload', 'nazim'];

function loadStages(overrides = {}) {
  const stages = {
    research: require('./stages/research'),
    script:   require('./stages/script'),
    gate:     require('./stages/gate'),
    produce:  require('./stages/produce'),
    qa:       require('./stages/qa'),
    upload:   require('./stages/upload'),
    nazim:    require('./stages/nazim'),
  };
  return { ...stages, ...overrides };
}

function makeLogger(runId, quiet) {
  return (stage, msg) => {
    if (quiet) return;
    const t = new Date().toISOString().slice(11, 19);
    process.stdout.write(`[${t}] ${runId} ${stage.padEnd(8)} ${msg}\n`);
  };
}

/**
 * Execute one queue item through the spine.
 *
 * @param {object} item        a queue item
 * @param {object} opts        { dryRun, stopAfter, resumeState, stageOverrides, quiet, budgetUsd }
 * @returns {Promise<object>}  the final run state
 */
async function execute(item, opts = {}) {
  const {
    dryRun = false,
    stopAfter = null,        // e.g. 'qa' -- the plan scopes 3.1 to stop before upload
    fromStage = null,        // start here; earlier stages are marked skipped
    seedArtifacts = null,    // artifacts a skipped stage would have produced
    resumeState = null,
    stageOverrides = {},
    quiet = false,
    budgetUsd = null,
  } = opts;

  const stages = loadStages(stageOverrides);
  const st = resumeState || state.create(item);
  const log = makeLogger(st.runId, quiet);

  // Starting mid-chain: the caller is supplying by hand what the skipped stages
  // would have produced (e.g. an already-written beats.js). Recorded as
  // `skipped`, never `done`, so the run log cannot later be read as evidence
  // that those stages ran and passed.
  const skipUntil = fromStage ? STAGE_ORDER.indexOf(fromStage) : 0;
  if (fromStage && skipUntil === -1) {
    throw new Error(`Unknown --from stage '${fromStage}'. Valid: ${STAGE_ORDER.join(', ')}`);
  }
  if (seedArtifacts) Object.assign(st.artifacts, seedArtifacts);
  for (let i = 0; i < skipUntil; i++) {
    const name = STAGE_ORDER[i];
    if (!st.stages[name]) {
      st.stages[name] = {
        status: 'skipped', startedAt: null, finishedAt: null, ms: null, attempts: 0, error: null,
      };
    }
  }
  if (fromStage) {
    state.save(st);
    state.recordIntervention(st, {
      stage: fromStage,
      kind: 'started_mid_chain',
      detail: `Stages before '${fromStage}' were supplied by hand, not generated.`,
    });
  }

  log('spine', `${resumeState ? 'resuming' : 'starting'} "${item.topic}" (${item.id})`);
  if (dryRun) log('spine', 'DRY RUN -- no external calls, no spend, no files written by stages');

  // Counted across the whole run, not per stage pair, so a script/gate argument
  // cannot ping-pong indefinitely.
  let redrafts = (st.redrafts && Number(st.redrafts)) || 0;

  for (let idx = 0; idx < STAGE_ORDER.length; idx++) {
    const name = STAGE_ORDER[idx];
    const stage = stages[name];
    if (!stage) throw new Error(`Stage '${name}' is in STAGE_ORDER but has no implementation`);

    if (idx < skipUntil) {
      log(name, 'skipped (--from)');
      continue;
    }

    // Resume: skip stages already completed in a previous attempt.
    const prior = st.stages[name];
    if (prior && prior.status === state.STATUS.DONE) {
      log(name, 'already done -- skipping (resume)');
      continue;
    }

    const maxAttempts = stage.maxAttempts || 1;
    let lastErr = null;
    let succeeded = false;
    // Set when a stage sends the work back to an earlier stage. Distinct from
    // `succeeded`: the outer loop must jump straight to the rewound stage and skip
    // the post-stage bookkeeping (notably the stopAfter check, which otherwise
    // ended the run as `done` the moment the gate asked for a redraft).
    let rewound = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      state.startStage(st, name);
      if (attempt > 1) {
        // Back off before retrying. Without this the three attempts fired inside
        // two seconds, which cannot outlast anything transient -- the very thing
        // retry exists for. A real transient (process pressure, a momentary lock,
        // a rate limit) needs seconds, not milliseconds.
        const waitMs = RETRY_BACKOFF_MS[Math.min(attempt - 2, RETRY_BACKOFF_MS.length - 1)];
        log(name, `retry ${attempt}/${maxAttempts} in ${Math.round(waitMs / 1000)}s`);
        await new Promise((r) => setTimeout(r, waitMs));
      }

      try {
        const output = await stage.run({
          item,
          state: st,
          artifacts: st.artifacts,
          opts: { dryRun, budgetUsd },
          log: (msg) => log(name, msg),
        });
        state.finishStage(st, name, { status: state.STATUS.DONE, output });
        log(name, 'ok');
        succeeded = true;
        break;
      } catch (err) {
        lastErr = err;

        // Blocked is terminal for this run -- retrying a missing API spec is pointless.
        if (err instanceof BlockedError) {
          state.finishStage(st, name, { status: state.STATUS.BLOCKED, error: err });
          recordFailure(st, name, err);
          state.recordIntervention(st, {
            stage: name,
            kind: 'blocked',
            detail: `${err.message}${err.planItem ? ` (needs plan item ${err.planItem})` : ''}`,
          });
          log(name, `BLOCKED: ${err.message}`);
          state.finish(st, state.STATUS.BLOCKED);
          queue.block(item.id, st.runId, err.message);
          return st;
        }

        // Fixable, with the reviewer's critique attached -- rewind and redraft
        // (ILHAM 3.3). Bounded, because an unbounded loop between a writer and a
        // critic that never agree would burn tokens forever.
        if (err instanceof RedraftError) {
          if (redrafts >= MAX_REDRAFTS) {
            const giveUp = new RejectedError(
              `${err.message}\n  Gave up after ${MAX_REDRAFTS} redraft(s) -- the critique was not resolved.`,
              { verdict: err.verdict, details: err.feedback }
            );
            state.finishStage(st, name, { status: state.STATUS.FAILED, error: giveUp });
            recordFailure(st, name, giveUp);
            log(name, `REJECTED after ${MAX_REDRAFTS} redraft(s): ${err.message}`);
            state.finish(st, state.STATUS.FAILED);
            queue.fail(item.id, st.runId, giveUp.message);
            return st;
          }

          redrafts++;
          const target = STAGE_ORDER.indexOf(err.fromStage);
          if (target === -1) throw new Error(`RedraftError names unknown stage '${err.fromStage}'`);

          // Hand the critique to the redrafting stage, and keep every round so a
          // third draft can see it is repeating a mistake the critic already named.
          st.redrafts = redrafts;
          st.artifacts.redraftFeedback = {
            round: redrafts,
            fromStage: err.fromStage,
            requestedBy: name,
            latest: err.feedback,
            history: [
              ...((st.artifacts.redraftFeedback && st.artifacts.redraftFeedback.history) || []),
              { round: redrafts, critique: err.feedback },
            ],
          };

          // Everything from the redrafted stage onward must run again; leaving
          // them DONE would let the resume check skip the very work being redone.
          for (let j = target; j < STAGE_ORDER.length; j++) {
            if (st.stages[STAGE_ORDER[j]]) delete st.stages[STAGE_ORDER[j]];
          }
          state.recordIntervention(st, {
            stage: name,
            kind: 'redraft_requested',
            detail: `${name} sent it back to ${err.fromStage} (round ${redrafts}/${MAX_REDRAFTS}).`,
          });
          state.save(st);
          log(name, `NEEDS WORK -> redrafting from '${err.fromStage}' (round ${redrafts}/${MAX_REDRAFTS})`);

          idx = target - 1;   // the for-loop's idx++ lands on `target`
          rewound = true;
          break;
        }

        // Rejected = the work was made but failed its own quality bar, and is not
        // fixable by redrafting. Terminal and loud: publishing rejected work is
        // the worse failure.
        if (err instanceof RejectedError) {
          state.finishStage(st, name, { status: state.STATUS.FAILED, error: err });
          recordFailure(st, name, err);
          log(name, `REJECTED: ${err.message}`);
          state.finish(st, state.STATUS.FAILED);
          queue.fail(item.id, st.runId, err.message);
          return st;
        }

        log(name, `error (attempt ${attempt}/${maxAttempts}): ${err.message}`);
        if (attempt === maxAttempts) {
          state.finishStage(st, name, { status: state.STATUS.FAILED, error: err });
        }
      }
    }

    // Rewound: resume at the earlier stage without touching completion logic.
    if (rewound) continue;

    if (!succeeded) {
      recordFailure(st, name, lastErr);
      state.finish(st, state.STATUS.FAILED);
      queue.fail(item.id, st.runId, lastErr ? lastErr.message : 'unknown error');
      log('spine', `FAILED at ${name} after ${maxAttempts} attempt(s)`);
      return st;
    }

    if (stopAfter && name === stopAfter) {
      log('spine', `stopping after '${stopAfter}' as requested`);
      state.finish(st, state.STATUS.DONE);
      queue.done(item.id, st.runId, st.artifacts);
      return st;
    }
  }

  state.finish(st, state.STATUS.DONE);
  queue.done(item.id, st.runId, st.artifacts);
  log('spine', 'complete');
  return st;
}

/**
 * Append to .beads/failures.jsonl -- the corpus ILHAM plan 5.1 (self-repair)
 * matches known fixes against. Writing it now means 5.1 has history to learn
 * from on day one instead of starting blind.
 */
function recordFailure(st, stageName, err) {
  jsonl.append(PATHS.failuresLog, {
    type: 'orchestrator_stage_failure',
    at: new Date().toISOString(),
    runId: st.runId,
    itemId: st.item.id,
    stage: stageName,
    errorName: err ? err.name : 'Error',
    error: err ? err.message : 'unknown',
    blocker: err && err.blocker ? err.blocker : null,
    planItem: err && err.planItem ? err.planItem : null,
    attempts: st.stages[stageName] ? st.stages[stageName].attempts : null,
  });
}

module.exports = { execute, STAGE_ORDER, BlockedError, RejectedError, RedraftError, loadStages, MAX_REDRAFTS };
