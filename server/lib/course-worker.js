'use strict';
/**
 * course-worker -- actually build the lessons a course build queued.
 *
 * WHY THIS EXISTS
 * The course builder enqueued lessons into orchestrator/queue.jsonl and nothing
 * drained them. The only thing in the deployed service that ever called
 * spine.execute() was tick.js's dispatch(), which is driven by Notion tickets --
 * so a queued course sat there forever and the feature appeared to "stop at
 * planning". It did not stop; nobody was listening.
 *
 * WHAT IT DOES
 * One lesson at a time, oldest first, until the queue is empty. Single-flight on
 * purpose: a render drives headless Chrome and ffmpeg, and two at once on one
 * container fight over CPU and produce slower, worse videos than doing them in
 * order. There is nothing clever here and there should not be.
 *
 * WHAT IT DOES NOT DO
 * Retry a failed lesson (the spine already retries per stage, and a lesson that
 * exhausts that needs a human), or survive a redeploy. The container has no
 * volume, so a build interrupted by a deploy loses its remaining lessons. That
 * is stated in the handoff rather than papered over.
 */

const queue = require('../../orchestrator/lib/queue');
const spine = require('../../orchestrator/lib/spine');
const state = require('../../orchestrator/lib/state');
const { config } = require('./config');

let running = false;
let current = null;
const history = [];   // recent finished lessons, newest last

const log = (m) => console.log(`[course-worker] ${m}`);

/** Queued items this worker owns. Notion-driven work is dispatch()'s, not ours. */
function mine() {
  return queue.currentItems()
    .filter((i) => i.status === 'queued' && i.source === 'course-builder')
    .sort((a, b) => String(a.enqueuedAt).localeCompare(String(b.enqueuedAt)));
}

function status() {
  return {
    running,
    current: current && { id: current.id, topic: current.topic, startedAt: current.startedAt },
    pending: mine().length,
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
      // The review stage fails closed without an approval, and that is correct:
      // a course build must not be able to publish to learners unwatched. So a
      // lesson renders and is scored, then waits for a human to promote it.
      reviewApproved: false,
      stopAfter: config.pipeline.stopAfter || null,
      dryRun: config.pipeline.dryRun,
      quiet: true,
    });
    const outcome = { id: item.id, topic: item.topic, status: final && final.status,
      finishedAt: new Date().toISOString() };
    history.push(outcome);
    log(`${item.id} -> ${outcome.status}`);
    return outcome;
  } catch (e) {
    const outcome = { id: item.id, topic: item.topic, status: 'failed',
      error: e.message, finishedAt: new Date().toISOString() };
    history.push(outcome);
    log(`${item.id} FAILED: ${e.message}`);
    // Leave the queue item as the spine left it; a human requeues. Retrying a
    // paid render automatically is how a bug becomes an invoice.
    return outcome;
  } finally {
    current = null;
    if (history.length > 60) history.splice(0, history.length - 60);
  }
}

/**
 * Drain the queue. Safe to call repeatedly -- a second call while running is a
 * no-op rather than a second worker.
 */
async function drain() {
  if (running) return { alreadyRunning: true };
  running = true;
  let built = 0;
  try {
    for (;;) {
      const next = mine()[0];
      if (!next) break;
      await buildOne(next);
      built++;
    }
  } finally {
    running = false;
  }
  if (built) log(`drained ${built} lesson(s)`);
  return { built };
}

/** Kick the drain without waiting for it -- for use from an HTTP handler. */
function kick() {
  drain().catch((e) => log('drain crashed: ' + e.message));
}

module.exports = { drain, kick, status, mine };
