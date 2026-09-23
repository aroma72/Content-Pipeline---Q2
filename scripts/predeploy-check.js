#!/usr/bin/env node
'use strict';
/**
 * Refuse to deploy onto a running build.
 *
 * On 2026-09-23 06:08Z the course worker started the LMS's authorised lesson;
 * at 06:11Z a `railway redeploy` restarted the container. The lesson was parked
 * as `interrupted`, its partial spend lost, and the LMS was asked to pay again
 * for a build we had cut short. /health said `building: true` the whole time.
 *
 * Read-only: one GET. Exit 0 when nothing is building, 1 when something is (or
 * the service cannot be read -- deploying blind is the same mistake), so it
 * can gate a deploy: `node scripts/predeploy-check.js && git push origin <b>:main && railway redeploy --from-source -y`.
 *
 *   BASE=https://staging.example node scripts/predeploy-check.js
 *   node scripts/predeploy-check.js --wait      # poll every 30s until idle (max 3h)
 */

const BASE = (process.env.BASE || 'https://content-queen-production.up.railway.app').replace(/\/$/, '');
const WAIT = process.argv.includes('--wait');
const POLL_MS = 30_000;
const MAX_MS = 3 * 60 * 60_000;

async function worker() {
  const res = await fetch(BASE + '/health');
  if (!res.ok) throw new Error('/health answered ' + res.status);
  const h = await res.json();
  const w = h.courses && h.courses.worker;
  if (!w) throw new Error('/health has no courses.worker -- this build predates 1.1; deploy only when railway logs shows no "building" line');
  return { ...w, building: Boolean(w.building), current: h.courses.building || null };
}

(async () => {
  const started = Date.now();
  for (;;) {
    let w;
    try { w = await worker(); } catch (e) {
      console.log('predeploy: cannot read the service (' + e.message + ') -- not deploying blind');
      process.exit(1);
    }
    if (!w.building && !w.running) {
      console.log('predeploy: worker idle (eligible ' + w.eligible + ', held ' + w.heldCourses + ') -- safe to deploy');
      process.exit(0);
    }
    const msg = 'predeploy: the course worker is BUILDING a lesson -- a redeploy now would interrupt it and lose its spend';
    if (!WAIT || Date.now() - started > MAX_MS) { console.log(msg); process.exit(1); }
    console.log(msg + '; waiting ' + POLL_MS / 1000 + 's');
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
})();
