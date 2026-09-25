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
 * THERE ARE NOW TWO PAUSES, AND THE FIRST ONE IS THE CHEAP ONE
 * Since 2026-09-24 a lesson stops TWICE: once at `script-approval`, before a
 * penny is spent, and once at `review`, after the render. The first pause is the
 * one that matters for money -- an instructor who dislikes the angle of a lesson
 * now finds out at cents rather than at ~$1.50, and says so by sending the script
 * back with notes instead of paying for a video to reject.
 *
 * HOW THE PAUSE HAPPENS
 * It is not a new mechanism. The spine's `review` and `script-approval` stages
 * both fail closed -- without an explicit approval a run ends `blocked`, never
 * `done`. This worker simply treats "blocked" as "a human is needed here" and
 * stops rather than moving to the next lesson. Any other blocker (spend, a
 * missing credential) stops the course for the same reason, which is the
 * behaviour you want: a course that hit a wall should not keep spending.
 *
 * APPROVING
 * approve() records the approval on the queue item and requeues it. The spine
 * resumes from its saved state, so the completed stages -- including the
 * expensive render -- are skipped, not repeated. It picks up at review, passes
 * now that approval is present, and uploads.
 *
 * approveScript() and revise() are the same idea one gate earlier, with one
 * difference that is the point of the whole feature: they resume from the SCRIPT
 * ON THE VOLUME, not from run state, and the approval names a sha. A person
 * approves a specific script, so a specific script is what gets built -- see
 * seedFromScript() and stages/script-approval.js.
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

const fs = require('fs');
const path = require('path');
const queue = require('../../orchestrator/lib/queue');
const spine = require('../../orchestrator/lib/spine');
const state = require('../../orchestrator/lib/state');
const deliverables = require('../../orchestrator/lib/deliverables');
const { videoDir } = require('../../orchestrator/lib/paths');
const { config } = require('./config');
const ledger = require('./ledger');
const tenants = require('./tenants');

/**
 * How many times a person may send a script back before the lesson has to be
 * approved, rejected or restarted.
 *
 * Deliberately separate from the spine's MAX_REDRAFTS_TOTAL (spine.js), which
 * exists to stop two MODELS handing work back and forth on nobody's budget. A
 * person is the budget holder, is rate-limited by their own attention, and each
 * round costs one script and one gate call -- so the cap is higher, and it is here
 * only so that an abandoned lesson cannot hold a course and an open reservation
 * forever. Counted on the QUEUE ITEM, never in run state: run state does not
 * survive a redeploy, so a counter kept there would silently reset to zero.
 */
const MAX_HUMAN_REVISIONS = 5;

/** The store the queue and the ledger share. Null when none is writable. */
function store() {
  try { return require('./job-store').shared(); } catch { return null; }
}

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

/**
 * Refuse a lesson another tenant paid for. Off for a lesson enqueued before
 * tenants were recorded (no tenantId) and for internal callers (no tenantId
 * supplied), so nothing already built changes hands or locks up.
 */
function notThisTenant(item, tenantId) {
  if (!tenantId || !item.tenantId) return null;
  if (item.tenantId === tenantId) return null;
  return { ok: false, why: `Lesson '${item.id}' belongs to another tenant.` };
}

/**
 * Close a lesson's ledger reservation. A lesson that ran settles at what it
 * cost -- a failed render still bought art. One that never started is released.
 */
function settleSpend(item, outcome) {
  const s = store();
  if (!s || !item || !item.spendRef || !item.tenantId) return;
  try {
    const fresh = queue.get(item.id) || item;
    ledger.settle(s, {
      tenantId: item.tenantId, ref: item.spendRef, jobId: courseTagOf(item),
      runId: fresh.runId || null, usd: Number(fresh.spendUsdTotal) || 0, outcome,
    });
  } catch (e) { log(`ledger settle failed for ${item.id}: ${e.message}`); }
}

function releaseSpend(item, why) {
  const s = store();
  if (!s || !item || !item.spendRef || !item.tenantId) return;
  try {
    ledger.release(s, { tenantId: item.tenantId, ref: item.spendRef, jobId: courseTagOf(item), why });
  } catch (e) { log(`ledger release failed for ${item.id}: ${e.message}`); }
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
  return Boolean(i.reviewApproved || i.rebuildApprovedBy || i.requeuedBy
    // A script a person has read and approved -- or sent back with notes -- is as
    // much a human release as a video they watched, and it is the one that comes
    // FIRST now. Without these two, approving lesson two's script while lesson one
    // is blocked would queue it and never build it: its course is held, and
    // eligible() only lets a released lesson through a hold.
    || i.scriptApproved || i.scriptRevisedBy);
}

/**
 * Courses with work waiting behind a lesson that needs a person: a lesson
 * blocked, or failed and not skipped, AND at least one queued sibling.
 * Map of courseId -> { courseId, by, status, since }. A loose lesson holds nothing.
 *
 * The second condition is the point. A course whose rejected lesson has no
 * queued sibling is STOPPED, not held: nothing is being kept from building, and
 * reporting it as held put a course a person had finished with on /health for a
 * day, indistinguishable from one waiting for that person (LMS memo 2026-09-23 §3).
 */
function heldCourses() {
  const items = queue.currentItems().filter((i) => i.source === 'course-builder');
  const withWork = new Set(items.filter((i) => i.status === queue.ITEM_STATUS.QUEUED).map(courseTagOf));
  const held = new Map();
  for (const i of items) {
    const holds = i.status === queue.ITEM_STATUS.BLOCKED
      || (i.status === queue.ITEM_STATUS.FAILED && i.skipped !== true);
    if (!holds) continue;
    const c = courseTagOf(i);
    if (!c || !withWork.has(c) || held.has(c)) continue;
    held.set(c, { courseId: c, by: i.id, status: i.status, since: i.updatedAt || null });
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

/**
 * Rebuild what research/script/gate produced, from the DURABLE copy, so a lesson
 * whose script a person has read is built from that script and no other.
 *
 * Why not state.load(runId): run state is deliberately not on the volume
 * (paths.js:36-39), because it points at render working directories a redeploy
 * takes with it. A script can wait days for a person, and Railway redeploys in
 * that window -- so run state is exactly the wrong place to resume a human pause
 * from. The volume copy is the one surface built to survive it.
 *
 * Returns null when there is nothing to resume from: a first build, or a volume
 * copy that is gone. The lesson then starts at research and pauses at
 * script-approval again with a NEW sha, which no longer matches the recorded
 * approval -- so the worst case is one extra cheap draft and one extra read, never
 * a render of a script nobody approved.
 */
function seedFromScript(item) {
  if (!item.scriptApproved && !item.scriptNotes) return null;
  const held = deliverables.findScript(item.series, item.slug);
  if (!held) return null;

  let beats = null;
  try {
    delete require.cache[require.resolve(held.beats)];
    const mod = require(held.beats);
    if (!Array.isArray(mod) || !mod.length) return null;
    beats = mod;
  } catch (e) {
    log(`${item.id}: could not read the held script (${e.message}) -- rebuilding it`);
    return null;
  }

  // produce reads videoDir/beats.js, not the volume, and after a redeploy the
  // working directory is empty. Copy it back before anything downstream looks.
  const dir = videoDir(item.series, item.slug);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(held.beats, path.join(dir, 'beats.js'));
    if (held.durations) fs.copyFileSync(held.durations, path.join(dir, 'durations.json'));
  } catch (e) {
    log(`${item.id}: could not restore the script to the render dir (${e.message}) -- rebuilding it`);
    return null;
  }

  const ctx = held.context || {};
  // Notes present -> rewrite first, from `script`. Otherwise straight to the gate
  // stage itself -- NOT past it: resuming at 'references' would record the human
  // gate as skipped and skip the sha check, which is the one thing making the
  // approval mean anything.
  const fromStage = item.scriptNotes ? 'script' : 'script-approval';
  const seedArtifacts = {
    script: {
      title: ctx.topic || item.topic,
      beats,
      beatsPath: path.join(dir, 'beats.js'),
      beatCount: beats.length,
    },
    ...(ctx.research ? { research: ctx.research } : {}),
    ...(ctx.gate && fromStage === 'script-approval' ? { gate: ctx.gate } : {}),
    ...(item.scriptNotes ? { redraftFeedback: humanFeedback(item, ctx) } : {}),
  };
  return { fromStage, seedArtifacts, sha: ctx.sha || null };
}

/**
 * A person's notes, in the shape the script stage already reads feedback in
 * (spine.js writes exactly this structure for a machine reviewer). Reusing it
 * means a human revision goes through the redraft path the writer is already
 * tuned for: script.js sees previousBeats plus a critique and returns a PATCH,
 * so beats nobody complained about survive the rewrite verbatim.
 */
function humanFeedback(item, ctx) {
  const prior = (ctx.redraftFeedback && ctx.redraftFeedback.history) || [];
  const round = Number(item.humanRevisions) || 1;
  return {
    round,
    fromStage: 'script',
    requestedBy: 'human',
    latest: [item.scriptNotes],
    history: [...prior, { round, critique: [item.scriptNotes] }],
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

  // The media budget is the service ceiling, or the tenant's own per-run wall
  // if it is lower. A course used to get the global figure whoever paid.
  const tenant = item.tenantId ? tenants.registry().byId(item.tenantId) : null;
  const wall = tenant && Number.isFinite(tenant.maxRunUsd) && tenant.maxRunUsd !== null
    ? tenant.maxRunUsd : Infinity;

  // A script a person has already read is never written again: they approved a
  // particular one, and a fresh draft is a different one.
  const resumeFrom = seedFromScript(item);
  if (resumeFrom) {
    log(`${item.id}: resuming at '${resumeFrom.fromStage}' from the held script`
      + `${resumeFrom.sha ? ` (${resumeFrom.sha})` : ''} -- not re-writing it`);
  }

  try {
    const final = await spine.execute(item, {
      resumeState: st,
      ...(resumeFrom ? { fromStage: resumeFrom.fromStage, seedArtifacts: resumeFrom.seedArtifacts } : {}),
      budgetUsd: Math.min(config.pipeline.budgetUsd, wall),
      // The pre-spend gate. Absent it, `script-approval` blocks before references
      // -- the pause this worker now opens with, rather than the one it ends with.
      // The sha rides along so the stage can refuse an approval that names a
      // different script than the one on disk.
      scriptApproved: item.scriptApproved || false,
      scriptApprovedSha: item.scriptApprovedSha || null,
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
    // Do NOT close the reservation for a pause that happens BEFORE the spend it
    // was taken for. Settling at the script gate would release $2.50 against a
    // lesson that has cost about five cents, and the approved build that follows
    // would then buy ~$1.50 of art with no authorisation standing behind it and
    // no room left under the tenant's monthly ceiling to account for it. The hold
    // survives the pause; the next build's settle, or reject(), is what closes it.
    const fresh = queue.get(item.id);
    if (fresh && fresh.blockedBy === 'script-approval') {
      log(`${item.id}: reservation held open across the script pause (spent so far: `
        + `$${Number(fresh.spendUsdTotal) || 0})`);
    } else {
      settleSpend(item, outcome.status);
    }
    return outcome;
  } catch (e) {
    const outcome = { id: item.id, topic: item.topic, status: 'failed',
      error: e.message, finishedAt: new Date().toISOString() };
    history.push(outcome);
    log(`${item.id} FAILED: ${e.message}`);
    // The queue record, before anything else. A throw OUTSIDE the spine's stage
    // handling (state.startStage writing to a full volume, for one) left the item
    // `claimed`: not queued, not blocked, not failed -- invisible to /health and
    // un-restartable until the next boot. "Starts processing, then nothing."
    try {
      queue.setStatus(item.id, queue.ITEM_STATUS.FAILED, { error: e.message, reason: null, blockedBy: null });
    } catch (e2) {
      log(`${item.id}: could not record the failure on the queue (${e2.message})`);
    }
    settleSpend(item, 'failed');
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
function approve(lessonId, by = 'Aroma', courseId = null, tenantId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId) || notThisTenant(item, tenantId);
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
 * Approve a lesson's SCRIPT, before anything has been bought.
 *
 * `sha` is the fingerprint of the script the approver was actually shown. It is
 * required and it is checked, twice: here, so a stale read is refused before a
 * build even starts, and again inside the stage against the bytes on disk. An
 * approval that does not name a script would be a standing licence to render
 * whatever beats.js happened to exist later, which is precisely the thing this
 * gate is for.
 *
 * @returns {{ok:true, sha:string}|{ok:false, why:string}}
 */
function approveScript(lessonId, by = 'Aroma', sha = null, courseId = null, tenantId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId) || notThisTenant(item, tenantId);
  if (wrong) return wrong;
  if (item.status !== 'blocked' || item.blockedBy !== 'script-approval') {
    return { ok: false, why: `That lesson is not waiting on its script `
      + `(${item.blockedBy || item.status}). A finished video is approved with /approve.` };
  }
  if (!item.scriptSha) {
    return { ok: false, why: 'That lesson has no recorded script fingerprint, so an approval '
      + 'could not be tied to anything. Requeue it to build a script that can be.' };
  }
  if (!sha) {
    return { ok: false, why: 'An approval must name the script being approved. Send the `sha` '
      + `from GET .../script (currently ${item.scriptSha}).` };
  }
  if (sha !== item.scriptSha) {
    return { ok: false, why: `That approval names script ${sha}, but this lesson's script is `
      + `${item.scriptSha}. It changed since you read it -- read it again and approve that one.` };
  }
  queue.setStatus(lessonId, queue.ITEM_STATUS.QUEUED, {
    scriptApproved: by,
    scriptApprovedSha: sha,
    scriptApprovedAt: new Date().toISOString(),
    scriptNotes: null,
    error: null, reason: null, blockedBy: null,
  });
  log(`script approved for ${lessonId} by ${by} (${sha}) -- building the video`);
  kick();
  return { ok: true, sha };
}

/**
 * Send a script back with notes. Cheap on purpose: it re-runs script -> gate ->
 * script-approval and stops again, buying nothing. This is the whole argument for
 * gating before the render rather than after it -- a wrong angle costs a model
 * call here and $1.50 plus half an hour on the other side of produce.
 */
function revise(lessonId, notes = '', by = 'Aroma', courseId = null, tenantId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId) || notThisTenant(item, tenantId);
  if (wrong) return wrong;
  if (item.status !== 'blocked' || item.blockedBy !== 'script-approval') {
    return { ok: false, why: `That lesson is not waiting on its script `
      + `(${item.blockedBy || item.status}). Notes on a finished video go through /reject.` };
  }
  if (!String(notes || '').trim()) {
    return { ok: false, why: 'A revision needs notes saying what to change -- the writer is '
      + 'answering them, and "no" on its own is not something it can rewrite towards.' };
  }
  const round = (Number(item.humanRevisions) || 0) + 1;
  if (round > MAX_HUMAN_REVISIONS) {
    return { ok: false, why: `This script has already been revised ${MAX_HUMAN_REVISIONS} times. `
      + 'Approve it, reject the lesson, or requeue it to start again from the brief.' };
  }
  const text = String(notes).trim();
  queue.setStatus(lessonId, queue.ITEM_STATUS.QUEUED, {
    scriptNotes: text,
    scriptNotesHistory: [...(item.scriptNotesHistory || []),
      { round, by, at: new Date().toISOString(), notes: text, onSha: item.scriptSha || null }],
    humanRevisions: round,
    scriptRevisedBy: by,
    // A revision invalidates any approval: the script is about to change.
    scriptApproved: false,
    scriptApprovedSha: null,
    error: null, reason: null, blockedBy: null,
  });
  log(`revise ${lessonId} round ${round} by ${by} -- rewriting the script from notes, no spend`);
  kick();
  return { ok: true, round, remaining: MAX_HUMAN_REVISIONS - round };
}

/**
 * Reject a lesson. ITS course stops: the rejected lesson is failed and so is
 * every queued sibling, free, with a reason naming the rejection. Other courses
 * are released -- before this kicked, a reject left the whole worker idle.
 */
function reject(lessonId, why = '', courseId = null, tenantId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId) || notThisTenant(item, tenantId);
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
  // Rejected before it was ever claimed: nothing was bought, give the money back.
  // Otherwise settle at what it has cost so far -- normally a repeat of the settle
  // buildOne() wrote (last settle wins, same figure), but for a lesson a restart
  // parked as `interrupted` it is the only settle there will ever be, and without
  // it the reservation would sit on the tenant's ledger until the month rolled.
  if (item.status === queue.ITEM_STATUS.QUEUED) releaseSpend(item, 'rejected_before_build');
  else settleSpend(item, 'rejected');
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
      releaseSpend(i, 'stopped_with_course');
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
function skip(lessonId, by = 'Aroma', courseId = null, tenantId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId) || notThisTenant(item, tenantId);
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
function requeue(lessonId, by = 'Aroma', courseId = null, tenantId = null) {
  const item = queue.get(lessonId);
  if (!item) return { ok: false, why: `No lesson '${lessonId}'.` };
  const wrong = notThisCourse(item, courseId) || notThisTenant(item, tenantId);
  if (wrong) return wrong;
  if (item.status !== queue.ITEM_STATUS.FAILED) {
    return { ok: false, why: `That lesson is '${item.status}', not failed. Only a failed lesson `
      + 'can be retried; a lesson waiting for a person should be approved or rejected, and '
      + 'retrying one that is building or built would buy a second render of the same video.' };
  }
  // A sibling failed at $0 because its course was rejected is not a build that
  // went wrong; it is a decision somebody made. Retrying it one lesson at a time
  // would rebuild a course a person just stopped -- the LMS refuses this on its
  // side (`course_stopped`), and so do we.
  if (item.stoppedWithCourse) {
    return { ok: false, why: `That lesson was stopped when '${item.stoppedWithCourse}' was rejected. `
      + 'It never ran, so there is nothing to retry; build the course again if you want it.' };
  }
  queue.requeue(lessonId, { requeuedBy: by });
  log(`requeued ${lessonId} by ${by} -- building it again from the start`);
  kick();
  return { ok: true };
}

/**
 * Should this boot start the worker by itself?
 *
 * Every deploy used to park the queue until a person called /worker/resume,
 * because restore() starts nothing and boot never kicked. That rule exists for a
 * crash loop -- three unattended rebuilds is real money -- but the boot line
 * already tells the cases apart: interrupted work means the last process died
 * mid-build, and a boot minutes after the previous one is a restart loop. A
 * clean boot outside the cooldown can resume without ever repeating the build
 * that killed a container. Pure; index.js supplies the facts and acts on the answer.
 */
function bootDecision({ interrupted = 0, lastBootAt = null, now = Date.now(), cooldownMs = 15 * 60_000, enabled = true } = {}) {
  if (!enabled) return { resume: false, why: 'COURSE_AUTO_RESUME=0 -- a person starts the worker (POST /api/v1/courses/worker/resume)' };
  if (interrupted > 0) {
    return { resume: false, why: `${interrupted} lesson(s) were mid-build when the last process died; a person decides before anything is rebuilt` };
  }
  const last = lastBootAt ? Date.parse(lastBootAt) : NaN;
  if (Number.isFinite(last) && now - last < cooldownMs) {
    const mins = Math.max(1, Math.round((now - last) / 60_000));
    return { resume: false, why: `booted ${mins} min ago -- looks like a restart loop; waiting for a person or the next clean boot` };
  }
  return { resume: true, why: 'clean boot -- resuming the eligible lessons' };
}

function bootMarkerPath() {
  const s = store();
  return s && s.dir ? require('path').join(s.dir, 'boot.json') : null;
}

/** When this service last booted, from the job store; null if never or unreadable. */
function readBoot() {
  const p = bootMarkerPath();
  if (!p) return null;
  try { return JSON.parse(require('fs').readFileSync(p, 'utf8')).lastBootAt || null; } catch { return null; }
}

/** Record this boot on the job store, so the next one can tell a loop from a deploy. */
function markBoot(at = new Date().toISOString()) {
  const p = bootMarkerPath();
  if (!p) return null;
  try {
    require('fs').mkdirSync(require('path').dirname(p), { recursive: true });
    require('fs').writeFileSync(p, JSON.stringify({ lastBootAt: at }) + '\n');
    return at;
  } catch (e) { log(`could not write the boot marker: ${e.message}`); return null; }
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
      // The cost of a rebuild depends on how far it got. A lesson interrupted
      // before its script was ever fingerprinted had not reached the spend at all,
      // and quoting ~$1.50 at that person is wrong by two orders of magnitude --
      // they may reject a lesson to avoid a bill that does not exist.
      reason: i.scriptSha
        ? 'interrupted by a server restart before it finished. Nothing was published, '
          + 'and the partial render did not survive. Approve to rebuild this lesson '
          + '(about $1.50 and 30 minutes), or reject to stop the course.'
        : 'interrupted by a server restart before anything was bought. Approve to write '
          + 'its script again (cents, a couple of minutes); it will then pause for you to '
          + 'read it, as it would have. Or reject to stop the course.',
    });
    interrupted++;
  }
  if (items.length) {
    log(`restored ${items.length} lesson(s), ${interrupted} interrupted mid-build`);
  }
  return { lessons: items.length, interrupted, durability: queue.durability() };
}

module.exports = {
  drain, kick, status, approve, approveScript, revise, reject, requeue, skip, resume,
  queued, eligible, heldCourses, courseTagOf, awaitingApproval, restore, bootDecision,
  readBoot, markBoot, MAX_HUMAN_REVISIONS,
};
