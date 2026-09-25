#!/usr/bin/env node
'use strict';
/**
 * Refuse to deploy onto running work.
 *
 * On 2026-09-23 06:08Z the course worker started the LMS's authorised lesson;
 * at 06:11Z a redeploy restarted the container. The lesson was parked as
 * `interrupted`, its partial spend lost, and the LMS was asked to pay again.
 *
 * On 2026-09-25 it happened again to a ONE-VIDEO job: two redeploys landed on a
 * script being written through /demo/make-video and erased it. This script only
 * looked at the course worker, so it said "safe to deploy" both times. It now
 * reads `jobs.inFlight` as well.
 *
 * Read-only: one GET. Exit 0 when nothing is running, 1 when something is (or
 * the service cannot be read -- deploying blind is the same mistake). It is the
 * first step of scripts/deploy.sh, which is the ONLY supported way to deploy.
 *
 *   BASE=https://staging.example node scripts/predeploy-check.js
 *   node scripts/predeploy-check.js --wait      # poll every 30s until idle (max 3h)
 */

const BASE = (process.env.BASE || 'https://content-queen-production.up.railway.app').replace(/\/$/, '');
const WAIT = process.argv.includes('--wait');
const POLL_MS = Number(process.env.PREDEPLOY_POLL_MS) || 30_000;
const MAX_MS = 3 * 60 * 60_000;

async function read() {
  const res = await fetch(BASE + '/health');
  if (!res.ok && res.status !== 503) throw new Error('/health answered ' + res.status);
  const h = await res.json();
  const w = h.courses && h.courses.worker;
  if (!w) throw new Error('/health has no courses.worker -- this build predates 1.1; deploy only when railway logs shows no "building" line');
  const jobs = h.jobs && h.jobs.inFlight;
  return {
    course: { building: Boolean(w.building), running: Boolean(w.running), eligible: w.eligible, held: w.heldCourses },
    // A build before this field cannot say; treat unknown as busy rather than
    // idle. A false "safe" is the failure this script exists to prevent.
    jobs: jobs || null,
  };
}

function busyReasons(s) {
  const out = [];
  if (s.course.building) out.push('the course worker is BUILDING a lesson');
  else if (s.course.running) out.push('the course worker is running');
  if (!s.jobs) {
    // The build that FIRST ships jobs.inFlight can never satisfy this check
    // against the build before it. For that one deploy -- and only after reading
    // the job store on the volume yourself -- set PREDEPLOY_ALLOW_UNKNOWN_JOBS=1.
    // It never overrides a running course worker.
    if (process.env.PREDEPLOY_ALLOW_UNKNOWN_JOBS === '1') {
      console.log('predeploy: NOTE /health does not report jobs.inFlight (older build); proceeding because PREDEPLOY_ALLOW_UNKNOWN_JOBS=1 says a person checked the job store by hand');
    } else {
      out.push('/health does not report jobs.inFlight (older build) -- cannot tell whether a one-video job is running (PREDEPLOY_ALLOW_UNKNOWN_JOBS=1 overrides this once you have read /data/cq-jobs/jobs yourself)');
    }
  } else {
    if (s.jobs.writing) out.push(`${s.jobs.writing} one-video job(s) being WRITTEN through /demo/make-video`);
    if (s.jobs.producing) out.push(`${s.jobs.producing} one-video job(s) being PRODUCED (art and voice already bought)`);
    if (s.jobs.publishing) out.push(`${s.jobs.publishing} one-video job(s) PUBLISHING`);
  }
  return out;
}

(async () => {
  const started = Date.now();
  for (;;) {
    let s;
    try { s = await read(); } catch (e) {
      console.log('predeploy: cannot read the service (' + e.message + ') -- not deploying blind');
      process.exit(1);
    }
    const why = busyReasons(s);
    if (!why.length) {
      console.log(`predeploy: idle (course eligible ${s.course.eligible}, held ${s.course.held}; one-video in flight 0) -- safe to deploy`);
      process.exit(0);
    }
    const msg = 'predeploy: NOT safe to deploy -- ' + why.join('; ') + '. A redeploy now would interrupt it and lose its work';
    if (!WAIT || Date.now() - started > MAX_MS) { console.log(msg); process.exit(1); }
    console.log(msg + '; waiting ' + POLL_MS / 1000 + 's');
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
})();
