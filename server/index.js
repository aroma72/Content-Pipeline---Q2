'use strict';
/**
 * Drawing Room — the agent you talk to.
 *
 * Two front doors, one worker:
 *   POST /slack/events   mention the bot in Slack
 *   POST /jira/webhook   mention it in a Jira comment
 *
 * Both do the same thing: acknowledge in milliseconds, hand the request to the
 * worker, and let the worker report back into the conversation it came from.
 *
 * This file is the entrypoint and nothing else. The application itself lives in
 * server/app.js, which builds it without starting anything -- see the note there
 * for why that split exists. Everything with a side effect is here: reading
 * .env, binding the port, and starting the tick loop that does paid work.
 */

// Load .env locally. On Railway the variables are already in the environment and
// there is no file, which this handles silently. Deliberately here rather than in
// app.js: building the app must not reach into the filesystem for credentials.
try { require('../orchestrator/lib/env').loadDotenv(); } catch { /* not fatal */ }

const { config, readiness } = require('./lib/config');
const tick = require('./lib/tick');
const { createApp } = require('./app');
const jobStore = require('./lib/job-store').shared();
const jobs = require('./lib/jobs');
const ledger = require('./lib/ledger');
const owner = require('./lib/owner');
const tenants = require('./lib/tenants');

const app = createApp();

const server = app.listen(config.port, () => {
  const r = readiness();
  console.log(`[server] listening on ${config.port}`);
  console.log('[server] surfaces:', JSON.stringify(r));
  // Say plainly at boot what will not work, instead of letting the first real
  // request be the thing that discovers it.
  if (!r.slackPost) console.warn('[server] SLACK_BOT_TOKEN unset — cannot post or upload');
  if (!r.slackPoll) console.warn('[server] SLACK_USER_TOKEN unset — cannot poll for mentions (search.messages needs a user token)');
  if (!r.notion) console.warn('[server] NOTION_API_KEY / NOTION_DATABASE_ID unset — no work queue');
  if (!r.model) console.warn(`[server] MODEL UNAVAILABLE — ${r.modelNote}`);
  if (!r.gemini) console.warn('[server] no GEMINI_API_KEY / GOOGLE_STUDIO_API_KEY — no art or voiceover');
  if (!r.budgetAuthorised) console.warn('[server] PIPELINE_BUDGET_USD is 0 — every request will refuse to spend');

  // A course that stops before 'review' can never pause for a person, so the
  // approve/reject routes are dead and nothing is ever published -- while every
  // lesson still reports `done`. That is a silent misconfiguration, and it was
  // the live one until 2026-09-20. Say it at boot rather than let an LMS discover
  // it by paying for a lesson nobody ever sees.
  const { STAGE_ORDER } = require('../orchestrator/lib/spine');
  const courseStop = config.pipeline.courseStopAfter;
  const stopIdx = STAGE_ORDER.indexOf(courseStop);
  if (stopIdx === -1) {
    console.warn(`[server] PIPELINE_COURSE_STOP_AFTER='${courseStop}' is not a stage `
      + `(${STAGE_ORDER.join(', ')}) — no stage will match it and courses will run the whole chain`);
  } else if (stopIdx < STAGE_ORDER.indexOf('review')) {
    console.warn(`[server] PIPELINE_COURSE_STOP_AFTER='${courseStop}' stops before 'review' — `
      + 'course lessons will be marked done without ever pausing for approval, and never published');
  }
  if (r.dryRun) console.log('[server] DRY RUN is on — the chain runs but nothing is spent or rendered');

  // Say what the job store actually is, at boot, rather than letting a lost job
  // be the thing that discovers it.
  const store = jobStore.health();
  console.log(`[server] job store: ${store.durability} at ${store.dir} (${store.jobs} jobs)`);
  if (store.durability !== 'volume') console.warn(`[server] ${store.note}`);
  if (store.error) console.warn(`[server] job store error: ${store.error}`);

  const reg = tenants.registry().health();
  console.log(`[server] tenants: ${reg.count} (${reg.ids.join(', ') || 'none'})`);
  for (const e of reg.errors) console.warn(`[server] tenant config: ${e}`);
  if (owner.usingEphemeralSecret()) {
    console.warn('[server] OWNER_COOKIE_SECRET unset — anonymous demo sessions will not survive a restart');
  }

  // Reconcile what the last process left mid-flight. A job found `producing`
  // had its promise die with that process; nothing will ever move it again.
  const restored = jobs.restore({ store: jobStore });
  if (restored.interrupted || restored.failed) {
    console.warn(`[server] restored ${restored.loaded} jobs: `
      + `${restored.interrupted} interrupted mid-produce, ${restored.failed} failed`);
  }
  // Same reconciliation for courses. A lesson left 'claimed' was mid-build when
  // the process died; it is parked for a person rather than rebuilt, because a
  // rebuild costs about $1.50 and Railway retries a failing deploy three times.
  try {
    const cw = require('./lib/course-worker');
    const courses = cw.restore();
    if (courses.lessons) {
      console.log(`[server] courses: ${courses.lessons} lesson(s) on a ${courses.durability} queue`
        + (courses.interrupted ? `, ${courses.interrupted} interrupted mid-build` : ''));
    }
    if (courses.durability !== 'volume') {
      console.warn('[server] course queue durability is '
        + `${courses.durability} — a redeploy can interrupt a course. Attach a Railway volume.`);
    }
    // A clean boot resumes itself; a crash loop or interrupted work waits for a
    // person. The decision is taken here, after restore() has parked anything
    // caught mid-build, and the marker is written whatever was decided.
    const decision = cw.bootDecision({
      interrupted: courses.interrupted,
      lastBootAt: cw.readBoot(),
      enabled: process.env.COURSE_AUTO_RESUME !== '0',
      cooldownMs: Number(process.env.COURSE_AUTO_RESUME_COOLDOWN_MS) || 15 * 60_000,
    });
    cw.markBoot();
    console.log(`[course-worker] boot: ${decision.why}`);
    if (decision.resume) cw.resume('boot');
  } catch (e) {
    console.error('[server] course restore failed:', e.message);
  }

  const reconciled = ledger.reconcileOpen(jobStore, { jobs });
  if (reconciled.closed) console.warn(`[server] closed ${reconciled.closed} open spend reservations`);

  // One sweeper, not a timer per job. The old per-job timeout was armed at
  // CREATION, so a produce running at the two-hour mark lost its record while it
  // was still spending. This runs on the last transition instead.
  const sweepMs = Number(process.env.JOB_STORE_SWEEP_MS) || 3600_000;
  setInterval(() => {
    try {
      const r2 = jobStore.sweep();
      jobStore.sweepIdem();
      require('./lib/throttle').gc();
      if (r2.removed.length) console.log(`[sweep] removed ${r2.removed.length} expired jobs`);
      for (const id of r2.stuck) console.warn(`[sweep] job ${id} has not moved in over a week`);
    } catch (e) {
      console.error('[sweep]', e.message);
    }
  }, sweepMs).unref();

  tick.startLoop();
});

module.exports = { app, server };
