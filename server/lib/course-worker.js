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
 * WHAT IT STILL DOES NOT DO
 * Survive a redeploy. The container has no volume, so a course interrupted by a
 * deploy loses its queue. Stated in the handoff rather than papered over.
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
  // Requeue carrying the approval. The spine resumes from saved state, so the
  // render is skipped and it continues from review -> upload.
  queue.setStatus(lessonId, queue.ITEM_STATUS.QUEUED, {
    reviewApproved: by,
    approvedAt: new Date().toISOString(),
  });
  log(`approved ${lessonId} by ${by} -- resuming to publish, then the next lesson`);
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

module.exports = { drain, kick, status, approve, reject, queued, awaitingApproval };
