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
 * THE HOLD IS PER COURSE
 * "Nothing after a rejected or unreviewed lesson is built" was always meant per
 * course. The first implementation broke out of the drain loop on ANY non-done
 * outcome, which made it per service: on 2026-09-22 one course's lesson failed
 * script validation and every other course -- another tenant's included -- sat
 * queued behind it for a day, because "paused" was never a state, only the
 * absence of a running drain, and only build/approve/requeue ever started one.
 * Now a course with a blocked or failed lesson is HELD; drain() skips held courses
 * and carries on with the rest. A lesson a person has released (approved,
 * requeued, or told to rebuild) passes through its course's hold, and skip()
 * lifts a hold for free. Boot still starts nothing; resume() is the operator's
 * starter after a deploy.
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

/**
 * Refuse a lesson that belongs to a different course.
 *
 * The lessonId is enough to find the item, so approve/reject/requeue acted on
 * whatever id was in the URL and never looked at the courseId beside it: any
 * known lesson could be published or failed through any course's endpoint. Same
 * predicate GET /courses/:courseId filters on. `null` skips the check, for the
 * internal callers that have no course in hand.
 */
function notThisCourse(item, courseId) {
  if (!courseId) return null;
  if (String(item.notes || '').includes(`[${courseId}]`)) return null;
  return { ok: false, why: `Lesson '${item.id}' does not belong to course '${courseId}'.` };
}

/** Queued lessons this worker owns. Notion-driven work belongs to dispatch(). */
function queued() {
  return queue.currentItems()
    .filter((i) => i.status === 'queued' && i.source === 'course-builder')
    .sort((a, b) => String(a.enqueuedAt).localeCompare(String(b.enqueuedAt)));
}

/** The [course-xxx] tag a lesson carries in its notes, or null for a loose lesson. */
function courseTagOf(item) {
  const m = String((item && item.notes) || '').match(/\[(course-[a-z0-9]+)\]/);
  return m ? m[1] : null;
}

/**
 * Written only by the routes a person clicks: approve() (reviewApproved or
 * rebuildApprovedBy) and requeue() (requeuedBy). A lesson carrying one of these
 * was released by a human and must build even though its course is held --
 * otherwise approving lesson two after lesson one failed would publish nothing.
 */
function humanReleased(i) {
  return Boolean(i.reviewApproved || i.rebuildApprovedBy || i.requeuedBy);
}

/**
 * Courses that need a person: any lesson blocked, or failed and not skipped.
 * Map of courseId -> { courseId, by, status, since }. A loose lesson holds nothing.
 */
function heldCourses() {
  const held = new Map();
  for (const i of queue.currentItems()) {
    if (i.source !== 'course-builder') continue;
    const holds = i.status === queue.ITEM_STATUS.BLOCKED
      || (i.status === queue.ITEM_STATUS.FAILED && i.skipped !== true);
    if (!holds) continue;
    const c = courseTagOf(i);
    if (c && !held.has(c)) held.set(c, { courseId: c, by: i.id, status: i.status, since: i.updatedAt || null });
  }
  return held;
}

/** Queued lessons the worker may build right now: not in a held course, or released by a person. */
function eligible() {
  const held = heldCourses();
  return queued().filter((i) => humanReleased(i) || !held.has(courseTagOf(i)));
}

/** Lessons that finished a build and are waiting for a person to approve them. */
function awaitingApproval(courseId = null) {
  return queue.currentItems()
    .filter((i) => i.source === 'course-builder' && i.status === 'blocked')
    .filter((i) => !courseId || String(i.notes || '').includes(`[${courseId}]`))
    .map((i) => ({
      id: i.id,
      topic: i.topic,
      reason: i.reason || 'awaiting human review',
      // Not every blocked lesson is waiting for approval. A post-render check can
      // flag a video that is finished and paid for, and that is a different thing
      // to put in front of a person than "ready for you". The prose in `reason`
      // said so and nothing machine-readable did.
      blockedBy: i.blockedBy || queue.DEFAULT_BLOCKED_BY,
    }));
}

function status() {
  const el = eligible().length;
  return {
    running,
    current: current && { id: current.id, topic: current.topic, startedAt: current.startedAt },
    buildingCourseId: current ? current.courseId : null,
    queued: queued().length,
    // The two facts an operator could not see on 2026-09-22: is there work the
    // worker may take, and is anyone taking it. Idle with eligible work after a
    // boot is the normal case -- restore() starts nothing -- and needsResume names it.
    eligible: el,
    needsResume: !running && el > 0,
    held: [...heldCourses().values()],
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
  current = { id: item.id, topic: item.topic, courseId: courseTagOf(item), startedAt: new Date().toISOString() };
  log(`building ${item.id} (run ${st.runId})`);

  try {
    const final = await spine.execute(item, {
      resumeState: st,
      budgetUsd: config.pipeline.budgetUsd,
      // Approval rides on the queue item, recorded by approve(). Absent it, the
      // review stage blocks -- which is the pause this worker is built around.
      reviewApproved: item.reviewApproved || false,
      // Its own stop stage, not the global default. `config.pipeline.stopAfter` is
      // never empty -- it defaults to 'qa' -- so a `||` fallback here would never
      // fire, and 'qa' is one stage before the review that this worker is built
      // around. See config.js `courseStopAfter`.
      stopAfter: config.pipeline.courseStopAfter,
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
 * Build every eligible lesson, one at a time, until none is left.
 *
 * A lesson that ends anything but `done` -- blocked at review, blocked on spend,
 * failed -- puts its COURSE on hold, and eligible() stops offering that course's
 * lessons. Other courses carry on. The loop terminates because each pass either
 * moves a lesson out of `queued` or finds nothing eligible.
 */
async function drain() {
  if (running) return { alreadyRunning: true };
  running = true;
  let built = 0;
  try {
    for (;;) {
      const next = eligible()[0];
      if (!next) break;
      const outcome = await buildOne(next);
      built++;
      if (outcome.status !== 'done') {
        const c = courseTagOf(next);
        log(`held: ${c || 'no course'} by ${next.id} (${outcome.status}) -- needs a person; other courses continue`);
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
 * Start the worker by hand. The one free way to move a queue after a boot:
 * restore() deliberately starts nothing, and until this existed the only kicks
 * were build, approve and requeue -- two of which cost money. Builds only what
 * eligible() offers, so a held course is never touched by it.
 */
function resume(by = 'Aroma') {
  const el = eligible();
  const held = [...heldCourses().values()];
  log(`resume by ${by}: ${el.length} eligible, ${held.length} course(s) held, running=${running}`);
  kick();
  return { ok: true, eligible: el.length, running, held };
}

/**
 * Approve a built lesson: publish it, then release the next one.
 * @returns {{ok:true}|{ok:false, why:string}}
 */
function approve(lessonId, by = 'Aroma', courseId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId);
  if (wrong) return wrong;
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

/**
 * Reject a lesson. ITS course stops: the rejected lesson is failed and so is
 * every queued sibling, free, with a reason naming the rejection. Other courses
 * are released -- before this kicked, a reject left the whole worker idle.
 */
function reject(lessonId, why = '', courseId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId);
  if (wrong) return wrong;
  // Rejecting means "do not publish this, stop the course here", which is not a
  // thing that can be said about a lesson already on YouTube. This had no status
  // guard at all, so a published lesson could be marked failed after the fact and
  // the course's own record would then disagree with the catalogue.
  if (item.status === 'done') {
    return { ok: false, why: 'That lesson is already published, so it cannot be rejected. '
      + 'Take the video down on YouTube if it should not be public.' };
  }
  queue.setStatus(lessonId, queue.ITEM_STATUS.FAILED, {
    rejectedAt: new Date().toISOString(),
    error: `rejected by a human${why ? ': ' + why : ''}`,
  });
  // The course stops here. Its queued siblings are failed now rather than left
  // `queued` behind a hold: a queued lesson reads as "still coming" to the LMS,
  // and a hold is invisible to a consumer that only reads statuses. Nothing was
  // spent on them, and their spend fields say so (spendUsdTotal 0, no runId).
  const tag = courseTagOf(item);
  const stopped = [];
  if (tag) {
    for (const i of queue.currentItems()) {
      if (i.source !== 'course-builder' || i.status !== queue.ITEM_STATUS.QUEUED) continue;
      if (courseTagOf(i) !== tag) continue;
      queue.setStatus(i.id, queue.ITEM_STATUS.FAILED, {
        stoppedWithCourse: lessonId,
        stoppedAt: new Date().toISOString(),
        error: `stopped with the course: ${lessonId} was rejected`,
      });
      stopped.push(i.id);
    }
  }
  log(`rejected ${lessonId}${why ? ' -- ' + why : ''}${stopped.length ? ` -- stopped ${stopped.length} queued sibling(s)` : ''}`);
  kick();
  return { ok: true, stopped };
}

/**
 * Drop one failed lesson so its course can continue. Free: nothing is rebuilt,
 * the lesson stays `failed` (the LMS treats the status set as closed) and simply
 * stops holding its course. The paid alternative is requeue().
 */
function skip(lessonId, by = 'Aroma', courseId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId);
  if (wrong) return wrong;
  if (item.status !== queue.ITEM_STATUS.FAILED) {
    return { ok: false, why: `That lesson is '${item.status}', not failed. Only a failed lesson `
      + 'can be skipped; a lesson waiting for a person should be approved or rejected.' };
  }
  if (item.skipped === true) return { ok: false, why: 'That lesson is already skipped.' };
  queue.setStatus(lessonId, queue.ITEM_STATUS.FAILED, {
    skipped: true, skippedBy: by, skippedAt: new Date().toISOString(),
  });
  log(`skipped ${lessonId} by ${by} -- its course continues without it`);
  kick();
  return { ok: true };
}

/**
 * Put one failed lesson back in the queue.
 *
 * A course is many lessons and they fail one at a time; rebuilding the course is
 * not a workaround, because enqueue() rejects the nine duplicate slugs and would
 * buy nothing but the one that already exists. There was no way to retry just the
 * broken one.
 *
 * Two rules the caller asked to have enforced here rather than trusted to them:
 * it is never automatic -- nothing in this process calls it, only the route a
 * person clicks -- and it refuses anything that is not `failed`, so it cannot be
 * used to re-run a lesson that is merely waiting for someone to watch it.
 */
function requeue(lessonId, by = 'Aroma', courseId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId);
  if (wrong) return wrong;
  if (item.status !== queue.ITEM_STATUS.FAILED) {
    return { ok: false, why: `That lesson is '${item.status}', not failed. Only a failed lesson `
      + 'can be retried; a lesson waiting for a person should be approved or rejected, and '
      + 'retrying one that is building or built would buy a second render of the same video.' };
  }
  queue.requeue(lessonId, { requeuedBy: by });
  log(`requeued ${lessonId} by ${by} -- building it again from the start`);
  kick();
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
      blockedBy: 'interrupted',
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

module.exports = {
  drain, kick, status, approve, reject, requeue, skip, resume, queued, eligible, heldCourses,
  courseTagOf, awaitingApproval, restore,
};
