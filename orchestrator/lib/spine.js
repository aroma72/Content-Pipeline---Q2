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

// How many times EACH reviewer may send work back before the run is called failed.
//
// Per reviewer, not per run. The gate and the produce-stage sensors are two
// different loops that happen to rewind to the same place, and sharing one budget
// meant whichever ran first could starve the other. Measured: the art sensors
// spent six of eight rounds, and the gate then hit its ninth with exactly one
// blocker left -- a specific, fixable, named defect ("beat 19 describes no
// physical act") that nothing was allowed to fix. The run died one edit short.
// The plan said 3; measurement says otherwise. With the patch mechanism the critique
// shrinks steadily (22->21->18->19->15) and round 5 ended with the gate saying
// "three line-level defects... these are edits, not a redraft" -- i.e. it was one
// round short, twice. Still bounded, because a loop that cannot converge must stop.
// Two rounds, not eight. Measured: rounds three onward almost never settled a
// point the first two had not, and each one re-ran the writer, the gate and a
// slice of produce. After this the reviewer accepts with a warning rather than
// ending the run -- see the lenient pass below.
// A ceiling on the WALL CLOCK of a whole run, not of any one stage.
//
// Every stage already has its own timeout, and none of them stopped this: measured
// across 34 real runs, 17 failed ones burned 23.4 hours between them and the worst
// single run ran 19.4 HOURS before failing. Per-stage timeouts cannot see that,
// because a redraft loop restarts the clock on every stage it rewinds to -- six
// redraft rounds of a 90-minute render is nine hours nobody authorised.
//
// Deliberately BLOCKED, not failed: at this point art and voice are usually bought,
// so a person should decide, and `blocked` is the state that says so. Nineteen hours
// is not a slow build, it is an incident, and it should reach someone while the
// working directory still exists.
const MAX_RUN_MINUTES = Number(process.env.PIPELINE_MAX_RUN_MINUTES) > 0
  ? Number(process.env.PIPELINE_MAX_RUN_MINUTES)
  : 180;

const MAX_REDRAFTS = 2;

// And a ceiling across all of them, so two reviewers cannot hand the same script
// back and forth indefinitely just because neither has spent its own budget.
const MAX_REDRAFTS_TOTAL = 6;

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
const STAGE_ORDER = ['research', 'script', 'gate', 'references', 'produce', 'qa', 'review', 'upload', 'nazim'];

function loadStages(overrides = {}) {
  const stages = {
    research: require('./stages/research'),
    script:   require('./stages/script'),
    gate:     require('./stages/gate'),
    // After the gate so it sees the subtopic the script settled on, and before
    // produce so a lesson nobody asked references for pays nothing for them.
    // Fail-soft: it cannot stop a build.
    references: require('./stages/references'),
    produce:  require('./stages/produce'),
    qa:       require('./stages/qa'),
    // Between QA and upload: a person watches it before it reaches YouTube.
    review:   require('./stages/review'),
    upload:   require('./stages/upload'),
    nazim:    require('./stages/nazim'),
  };
  return { ...stages, ...overrides };
}

/**
 * Two levels, because `quiet` was doing too much.
 *
 * The server runs the spine with quiet:true to keep ffmpeg/npm/puppeteer chatter
 * out of the Railway log -- but that also silenced WHY a run failed, so a
 * production failure left no trace at all. Diagnosing one meant inspecting a
 * credential's shape instead of reading an error message.
 *
 *   log(stage, msg)         progress and child-process chatter; silenced by quiet
 *   log.always(stage, msg)  lifecycle and failures; printed no matter what
 *
 * The always-lines are a couple of dozen per run, which is the difference between
 * an operator being able to answer "what happened?" and not.
 */
/**
 * Record the queue outcome without letting bookkeeping destroy the diagnosis.
 *
 * queue.jsonl lives on the container filesystem, which Railway wipes on redeploy.
 * If the item is gone, queue.fail() throws `No queue item '<id>'` -- from INSIDE
 * the failure handler -- and that replaces the real error with a bogus one. The
 * run's actual cause of death disappears at exactly the moment it matters.
 *
 * The queue is a convenience index; the run state is the record of truth. So a
 * bookkeeping failure is logged and stepped over, never propagated.
 */
// What this run has spent so far, for the queue event that settles it. A course's
// cost exists nowhere else -- see queue.spendFields.
//
// Broken down as well as totalled. The split already exists on every recorded call
// (state.recordSpend tags each one media or model) and is already written to the run
// log, but it died here: this returned one scalar, so a caller reconciling a lesson
// could see what it cost and never what it was spent ON. Returned as an object so
// the seven settle sites below keep passing one value.
const spentSoFar = (st) => ({
  usd: (st.spend && Number(st.spend.usd)) || 0,
  media: st.spend ? state.spendOfKind(st, 'media') : 0,
  model: st.spend ? state.spendOfKind(st, 'model') : 0,
});

function settleQueue(log, fn, what, id) {
  try {
    fn();
  } catch (e) {
    log.always('spine', `queue bookkeeping failed (${what} ${id}): ${e.message} -- run outcome stands`);
  }
}

function makeLogger(runId, quiet) {
  const emit = (stage, msg) => {
    const t = new Date().toISOString().slice(11, 19);
    process.stdout.write(`[${t}] ${runId} ${String(stage).padEnd(8)} ${msg}\n`);
  };
  const log = (stage, msg) => { if (!quiet) emit(stage, msg); };
  log.always = emit;
  return log;
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
    reviewApproved = null,   // a person watched it and said publish
  } = opts;

  const stages = loadStages(stageOverrides);
  const st = resumeState || state.create(item);
  const log = makeLogger(st.runId, quiet);

  // Starting mid-chain: the caller is supplying by hand what the skipped stages
  // would have produced (e.g. an already-written beats.js). Recorded as
  // `skipped`, never `done`, so the run log cannot later be read as evidence
  // that those stages ran and passed.
  let skipUntil = fromStage ? STAGE_ORDER.indexOf(fromStage) : 0;
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

  log.always('spine', `${resumeState ? 'resuming' : 'starting'} "${item.topic}" (${item.id})`);
  if (dryRun) log('spine', 'DRY RUN -- no external calls, no spend, no files written by stages');

  // Counted across the whole run, not per stage pair, so a script/gate argument
  // cannot ping-pong indefinitely.
  let redrafts = (st.redrafts && Number(st.redrafts)) || 0;
  // Per requesting stage, so one reviewer cannot spend another reviewer's budget.
  const redraftsBy = { ...(st.redraftsBy || {}) };

  for (let idx = 0; idx < STAGE_ORDER.length; idx++) {
    const name = STAGE_ORDER[idx];
    const stage = stages[name];
    if (!stage) throw new Error(`Stage '${name}' is in STAGE_ORDER but has no implementation`);

    if (idx < skipUntil) {
      log(name, 'skipped (--from)');
      continue;
    }

    // Checked between stages rather than inside one: interrupting a paid call
    // mid-flight would spend the money and lose the artefact, which is the outcome
    // this is here to prevent. The next stage simply never starts.
    const runMinutes = (Date.now() - new Date(st.startedAt).getTime()) / 60000;
    if (runMinutes > MAX_RUN_MINUTES) {
      const err = new BlockedError(
        `This run has been going for ${Math.round(runMinutes)} minutes, past the `
        + `${MAX_RUN_MINUTES}-minute ceiling, and was about to start '${name}'. Stopped for a `
        + 'person rather than left running. Nothing already built has been discarded.',
        {
          blocker: 'run exceeded its time ceiling',
          // Its own code, not the default 'review': a caller with one Approve button
          // must not offer to approve a video that was never finished.
          code: 'time-ceiling',
          details: { runMinutes: Math.round(runMinutes), nextStage: name },
        }
      );
      state.recordIntervention(st, {
        stage: name,
        kind: 'run_time_ceiling',
        detail: `${Math.round(runMinutes)} min elapsed (ceiling ${MAX_RUN_MINUTES}); stopped before '${name}'.`,
      });
      log.always(name, `BLOCKED: ${err.message}`);
      state.finish(st, state.STATUS.BLOCKED);
      settleQueue(log, () => queue.block(item.id, st.runId, err.message, err.code, spentSoFar(st)),
        'block', item.id);
      return st;
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
        log.always(name, `retry ${attempt}/${maxAttempts} in ${Math.round(waitMs / 1000)}s`);
        await new Promise((r) => setTimeout(r, waitMs));
      }

      try {
        // Stages get BOTH channels, not just the quiet one.
        //
        // `log` is silenced by quiet:true, which the server always passes to keep
        // ffmpeg and npm chatter out of Railway. That is right for chatter and
        // wrong for everything else: it also threw away the preflight result, the
        // art purchase, and every sensor's verdict, so a production run reported
        // five redrafts with no way to learn what caused even one of them. A stage
        // needs a way to say something that survives.
        const stageLog = (msg) => log(name, msg);
        stageLog.always = (msg) => log.always(name, msg);

        const output = await stage.run({
          item,
          state: st,
          artifacts: st.artifacts,
          opts: { dryRun, budgetUsd, reviewApproved, lenient: Boolean(st.lenient) },
          log: stageLog,
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
          log.always(name, `BLOCKED: ${err.message}`);
          state.finish(st, state.STATUS.BLOCKED);
          settleQueue(log,
            () => queue.block(item.id, st.runId, err.message, err.code, spentSoFar(st)),
            'block', item.id);
          return st;
        }

        // Fixable, with the reviewer's critique attached -- rewind and redraft
        // (ILHAM 3.3). Bounded, because an unbounded loop between a writer and a
        // critic that never agree would burn tokens forever.
        if (err instanceof RedraftError) {
          const mine = redraftsBy[name] || 0;
          const spent = mine >= MAX_REDRAFTS ? `${name} has used all ${MAX_REDRAFTS} of its redrafts`
            : `${redrafts} redrafts across all reviewers (ceiling ${MAX_REDRAFTS_TOTAL})`;
          if (mine >= MAX_REDRAFTS || redrafts >= MAX_REDRAFTS_TOTAL) {
            // ONE lenient pass before giving up.
            //
            // The critique is real but unsettled, and everything else about the
            // work may be sound. Ending the run here threw away a whole video
            // over a point two rounds could not agree on. So the stage runs once
            // more with lenient set: its redraftable gates record the finding as
            // a warning and let the work through, and the warning travels in
            // sensorResults to the human review step. Nothing is hidden, and a
            // person still decides.
            //
            // Not for a deterministic validator. INVALID_BEATS comes from
            // validate-beats.js, which strictCanon fails identically every time;
            // on 2026-09-22 the lenient pass bought a third Opus draft (47s) for
            // "overlay has no 'tpl'" and then REJECTED on the same line. Skip
            // straight to giving up: the money was the only thing the pass changed.
            if (!st.lenient && err.verdict !== 'INVALID_BEATS') {
              st.lenient = true;
              state.recordIntervention(st, {
                stage: name,
                kind: 'accepted_with_warning',
                detail: `${spent}. Re-running '${name}' leniently; the finding is `
                  + `recorded for review rather than failing the run: ${err.message.slice(0, 300)}`,
              });
              state.save(st);
              log.always(name, `${spent} -- accepting with a warning and carrying on`);
              delete st.stages[name];
              idx -= 1;            // the for-loop's idx++ re-enters this stage
              rewound = true;
              break;
            }

            const giveUp = new RejectedError(
              `${err.message}\n  Gave up: ${spent} -- the critique was not resolved.`,
              { verdict: err.verdict, details: err.feedback }
            );
            state.finishStage(st, name, { status: state.STATUS.FAILED, error: giveUp });
            recordFailure(st, name, giveUp);
            log.always(name, `REJECTED: ${spent}: ${err.message}`);
            state.finish(st, state.STATUS.FAILED);
            settleQueue(log, () => queue.fail(item.id, st.runId, giveUp.message, spentSoFar(st)), 'fail', item.id);
            return st;
          }

          redrafts++;
          redraftsBy[name] = (redraftsBy[name] || 0) + 1;
          const target = STAGE_ORDER.indexOf(err.fromStage);
          if (target === -1) throw new Error(`RedraftError names unknown stage '${err.fromStage}'`);

          // Hand the critique to the redrafting stage, and keep every round so a
          // third draft can see it is repeating a mistake the critic already named.
          st.redrafts = redrafts;
          st.redraftsBy = redraftsBy;
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
            detail: `${name} sent it back to ${err.fromStage} (${name} round ${redraftsBy[name]}/${MAX_REDRAFTS}).`,
          });
          state.save(st);
          // Name the CAUSE, not just the fact. A run reported five redrafts with no
          // way to learn what triggered even one of them: the sensor's verdict was
          // in the error all along and this line threw it away. The first line of
          // the message is `<what> FAILED (<script>)`, which is the whole answer.
          const cause = String(err.message || '').split('\n')[0].slice(0, 160);
          log.always(name, `NEEDS WORK -> redrafting from '${err.fromStage}' `
            + `(${name} round ${redraftsBy[name]}/${MAX_REDRAFTS}) -- ${cause}`);

          // A rewind can name a stage this run was seeded PAST (--from produce, with
          // an already-written script on disk). Leaving skipUntil where it is means
          // the loop below skips that stage again and lands straight back on the
          // stage that just failed -- which fails identically, because the thing it
          // asked to have changed was never given the chance to change. Measured on
          // a real run: eight redraft rounds in one second, then REJECTED, with the
          // critique never once reaching a writer.
          if (target < skipUntil) {
            log.always(name, `redraft reaches behind --from '${fromStage}'; running ` +
              `'${err.fromStage}' onward for real`);
            state.recordIntervention(st, {
              stage: err.fromStage,
              kind: 'rewound_behind_start',
              detail: `A redraft from '${name}' needed '${err.fromStage}', which this run `
                + 'started past. It now runs rather than being skipped again.',
            });
            skipUntil = target;
          }

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
          log.always(name, `REJECTED: ${err.message}`);
          state.finish(st, state.STATUS.FAILED);
          settleQueue(log, () => queue.fail(item.id, st.runId, err.message, spentSoFar(st)), 'fail', item.id);
          return st;
        }

        log.always(name, `error (attempt ${attempt}/${maxAttempts}): ${err.message}`);
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
      settleQueue(log, () => queue.fail(item.id, st.runId, lastErr ? lastErr.message : 'unknown error', spentSoFar(st)), 'fail', item.id);
      log.always('spine', `FAILED at ${name} after ${maxAttempts} attempt(s)`);
      return st;
    }

    if (stopAfter && name === stopAfter) {
      log.always('spine', `stopping after '${stopAfter}' as requested`);
      state.finish(st, state.STATUS.DONE);
      settleQueue(log, () => queue.done(item.id, st.runId, st.artifacts, spentSoFar(st)), 'done', item.id);
      return st;
    }
  }

  state.finish(st, state.STATUS.DONE);
  settleQueue(log, () => queue.done(item.id, st.runId, st.artifacts, spentSoFar(st)), 'done', item.id);
  log.always('spine', 'complete');
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
