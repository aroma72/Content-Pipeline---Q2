'use strict';
/**
 * course-worker -- build a course ONE LESSON AT A TIME, pausing for approval.
 *
 * WHY IT IS PACED THIS WAY
 * The first version drained the whole queue back to back. For an eight-lesson
 * course that meant rendering eight videos -- and spending the entire course
 * budget -- before a human had seen a single one. If lesson one was wrong, so
 * were the other seven, and the money was already gone.
 *
 * So: build one lesson, stop, wait for a person. Approving a lesson publishes
 * it and releases the next one. Nothing after a rejected or unreviewed lesson
 * is ever built.
 *
 * HOW THE PAUSE HAPPENS
 * It is not a new mechanism. The spine's `review` stage already fails closed --
 * without an explicit approval a run ends `blocked`, never `done`. This worker
 * simply treats "blocked" as "a human is needed here" and stops rather than
 * moving to the next lesson. Any other blocker (spend, a missing credential)
 * stops the course for the same reason, which is the behaviour you want: a
 * course that hit a wall should not keep spending.
 *
 * APPROVING
 * approve() records the approval on the queue item and requeues it. The spine
 * resumes from its saved state, so the completed stages -- including the
 * expensive render -- are skipped, not repeated. It picks up at review, passes
 * now that approval is present, and uploads.
 *
 * SURVIVING A RESTART
 * The queue lives in the job store, so it lands on the Railway volume and the
 * course outlives a redeploy. What does NOT survive is the lesson that was
 * mid-build: its render working directories are .dockerignore'd and do not come
 * back. So restore() parks that one lesson as blocked and asks a person, rather
 * than silently rebuilding and re-spending -- Railway retries a failing deploy
 * three times, and three unattended rebuilds is real money. The honest claim is
 * therefore: a redeploy costs at most the lesson in flight, never the course.
 */

const queue = require('../../orchestrator/lib/queue');
const spine = require('../../orchestrator/lib/spine');
const state = require('../../orchestrator/lib/state');
const { config } = require('./config');

let running = false;
let current = null;
const history = [];

const log = (m) => console.log(`[course-worker] ${m}`);

/** Queued lessons this worker owns. Notion-driven work belongs to dispatch(). */
function queued() {
  return queue.currentItems()
    .filter((i) => i.status === 'queued' && i.source === 'course-builder')
    .sort((a, b) => String(a.enqueuedAt).localeCompare(String(b.enqueuedAt)));
}

/** Lessons that finished a build and are waiting for a person to approve them. */
function awaitingApproval(courseId = null) {
  return queue.currentItems()
    .filter((i) => i.source === 'course-builder' && i.status === 'blocked')
    .filter((i) => !courseId || String(i.notes || '').includes(`[${courseId}]`))
    .map((i) => ({ id: i.id, topic: i.topic, reason: i.reason || 'awaiting human review' }));
}

function status() {
  return {
    running,
    current: current && { id: current.id, topic: current.topic, startedAt: current.startedAt },
    queued: queued().length,
    awaitingApproval: awaitingApproval(),
    recent: history.slice(-12),
  };
}

async function buildOne(item) {
  const st = state.create(item);
  // Record that this lesson is being built BEFORE any of it is paid for. The
  // spine only ever writes block/fail/done, so a lesson used to sit at 'queued'
  // for its whole ~30-minute, ~$1.50 build: after a restart it was
  // indistinguishable from one that had never started, drain() picked it up
  // again, and the first attempt's spend vanished with no record of it. Let a
  // failure here throw -- a build with no record of itself is the thing to stop.
  queue.claim(item.id, st.runId);
  current = { id: item.id, topic: item.topic, startedAt: new Date().toISOString() };
  log(`building ${item.id} (run ${st.runId})`);

  try {
    const final = await spine.execute(item, {
      resumeState: st,
      budgetUsd: config.pipeline.budgetUsd,
      // Approval rides on the queue item, recorded by approve(). Absent it, the
      // review stage blocks -- which is the pause this worker is built around.
      reviewApproved: item.reviewApproved || false,
      stopAfter: config.pipeline.stopAfter || null,
      dryRun: config.pipeline.dryRun,
      quiet: true,
    });
    const outcome = {
      id: item.id, topic: item.topic,
      status: (final && final.status) || 'unknown',
      finishedAt: new Date().toISOString(),
    };
    history.push(outcome);
    log(`${item.id} -> ${outcome.status}`);
    return outcome;
  } catch (e) {
    const outcome = { id: item.id, topic: item.topic, status: 'failed',
      error: e.message, finishedAt: new Date().toISOString() };
    history.push(outcome);
    log(`${item.id} FAILED: ${e.message}`);
    return outcome;
  } finally {
    current = null;
    if (history.length > 60) history.splice(0, history.length - 60);
  }
}

/**
 * Build lessons until one needs a person, then stop.
 *
 * A lesson that ends `done` (an approved one that has just published) lets the
 * next begin. Anything else -- blocked at review, blocked on spend, failed --
 * ends the pass. Continuing past a lesson nobody has looked at is the exact
 * behaviour this replaced.
 */
async function drain() {
  if (running) return { alreadyRunning: true };
  running = true;
  let built = 0;
  try {
    for (;;) {
      const next = queued()[0];
      if (!next) break;
      const outcome = await buildOne(next);
      built++;
      if (outcome.status !== 'done') {
        log(`pausing: ${next.id} ended ${outcome.status} and needs a person`);
        break;
      }
    }
  } finally {
    running = false;
  }
  return { built };
}

function kick() {
  drain().catch((e) => log('drain crashed: ' + e.message));
}

/**
 * Approve a built lesson: publish it, then release the next one.
 * @returns {{ok:true}|{ok:false, why:string}}
 */
function approve(lessonId, by = 'Aroma') {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  if (item.status === 'done') return { ok: false, why: 'That lesson is already published.' };
  if (item.status !== 'blocked') {
    return { ok: false, why: `That lesson is '${item.status}', not waiting for approval. `
      + 'Only a lesson that has finished building can be approved.' };
  }
  // A lesson interrupted by a restart never finished rendering, and its working
  // files are gone. Carrying reviewApproved here would make the spine skip
  // review for a video that does not exist -- publishing nothing, or something
  // stale. Approving THAT means "yes, rebuild it", so the approval is not
  // carried and the lesson blocks at review again once it has really been made.
  const rebuild = item.interrupted === true;
  queue.setStatus(lessonId, queue.ITEM_STATUS.QUEUED, rebuild
    ? { interrupted: false, rebuildApprovedBy: by, approvedAt: new Date().toISOString() }
    : { reviewApproved: by, approvedAt: new Date().toISOString() });
  log(rebuild
    ? `approved ${lessonId} by ${by} -- rebuilding the lesson a restart interrupted`
    : `approved ${lessonId} by ${by} -- resuming to publish, then the next lesson`);
  kick();
  return { ok: true };
}

/** Reject a built lesson. The course stops; nothing after it is built. */
function reject(lessonId, why = '') {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  queue.setStatus(lessonId, queue.ITEM_STATUS.FAILED, {
    rejectedAt: new Date().toISOString(),
    error: `rejected by a human${why ? ': ' + why : ''}`,
  });
  log(`rejected ${lessonId}${why ? ' -- ' + why : ''}`);
  return { ok: true };
}

/**
 * Fold the queue after a restart and park anything caught mid-build.
 *
 * Mirrors jobs.restore(), which turns a producing job into interrupted+resumable
 * and stops. Deliberately starts nothing: a crash loop must not be able to spend.
 */
function restore() {
  let interrupted = 0;
  const items = queue.currentItems().filter((i) => i.source === 'course-builder');
  for (const i of items) {
    if (i.status !== queue.ITEM_STATUS.CLAIMED) continue;
    queue.setStatus(i.id, queue.ITEM_STATUS.BLOCKED, {
      interrupted: true,
      interruptedAt: new Date().toISOString(),
      previousRunId: i.runId || null,
      reason: 'interrupted by a server restart before it finished. Nothing was published, '
        + 'and the partial render did not survive. Approve to rebuild this lesson '
        + '(about $1.50 and 30 minutes), or reject to stop the course.',
    });
    interrupted++;
  }
  if (items.length) {
    log(`restored ${items.length} lesson(s), ${interrupted} interrupted mid-build`);
  }
  return { lessons: items.length, interrupted, durability: queue.durability() };
}

module.exports = { drain, kick, status, approve, reject, queued, awaitingApproval, restore };
