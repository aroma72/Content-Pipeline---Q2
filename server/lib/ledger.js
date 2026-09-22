'use strict';
/**
 * ledger -- what each tenant has spent this month, and what they may still spend.
 *
 * WHY RESERVE BEFORE, NOT RECORD AFTER
 * A produce run takes about twenty-five minutes. If spend were recorded when the
 * run finished, a tenant with ten dollars left could start five nine-dollar runs
 * in the same minute and every one of them would pass the check. The reservation
 * is taken at the WORST CASE -- the budget being authorised, not a guess at the
 * actual -- and released or settled when the run ends. Reserving an estimate is
 * the only thing that makes concurrent requests safe.
 *
 * WHY A FAILED RUN STILL SETTLES
 * A run that bought art and then fell over has spent money. Releasing the whole
 * reservation would mean a tenant could burn the budget for free by failing runs
 * deliberately. Only a run that never started is released.
 *
 * WHY THIS REFUSES WHEN IT CANNOT WRITE
 * A spend limit you cannot record is not a spend limit. If the store is not
 * durable the produce route returns 503 rather than spending against a ceiling
 * it has no way to enforce -- the same rule api.js already applies when it
 * refuses to accept learner answers it would drop.
 */

const crypto = require('crypto');

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function newRef() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Fold one month's entries into a balance.
 *
 * An open reservation counts at the amount reserved; a settled one counts at
 * what it actually cost. So the balance is pessimistic while work is in flight
 * and exact once it lands, which is the correct direction to be wrong in.
 */
function spentUsd(store, tenantId, month = monthKey()) {
  const rows = store.readLedger(tenantId, month);
  const byRef = new Map();
  for (const r of rows) {
    if (!r || !r.ref) continue;
    const cur = byRef.get(r.ref) || { reserved: 0, settled: null, released: false, kind: 'job', outcome: null };
    if (r.type === 'reserve') { cur.reserved = Number(r.usd) || 0; if (r.kind) cur.kind = r.kind; }
    if (r.type === 'settle') { cur.settled = Number(r.usd) || 0; cur.outcome = r.outcome || null; }
    if (r.type === 'release') cur.released = true;
    byRef.set(r.ref, cur);
  }
  let settled = 0;
  let reserved = 0;
  let runs = 0;
  // Courses used to be invisible here -- they never reserved -- so a reader saw
  // 0 after a course and took it as proof nothing was spent. Broken out so the
  // figure a course consumer wants is a field, not an inference from the total.
  const courses = { settledUsd: 0, reservedUsd: 0, lessons: 0, doneUsd: [] };
  for (const v of byRef.values()) {
    if (v.released) continue;
    runs++;
    if (v.settled === null) reserved += v.reserved;
    else settled += v.settled;
    if (v.kind === 'course') {
      courses.lessons++;
      if (v.settled === null) courses.reservedUsd += v.reserved;
      else {
        courses.settledUsd += v.settled;
        if (v.outcome === 'done') courses.doneUsd.push(v.settled);
      }
    }
  }
  return { settled, reserved, total: settled + reserved, runs, month, courses };
}

/** p50 / p90 of a sample, or null under three points -- a figure from two runs is a guess. */
function percentiles(xs) {
  if (!xs || xs.length < 3) return null;
  const s = [...xs].sort((a, b) => a - b);
  const at = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
  return { p50: Number(at(0.5).toFixed(4)), p90: Number(at(0.9).toFixed(4)), n: s.length };
}

/**
 * Take a reservation, or explain why not.
 * @returns {{ok:true, ref:string, remaining:number}|{ok:false, why:string, ...}}
 */
function reserve(store, { tenantId, jobId, usd, key, tenant = null, kind = 'job' }) {
  if (!store.canRecordSpend()) {
    return { ok: false, reason: 'ledger_unavailable',
      why: 'this server cannot durably record spending, so it will not spend' };
  }
  const month = monthKey();
  const monthlyUsd = tenant && Number.isFinite(tenant.monthlyUsd) ? tenant.monthlyUsd : null;
  const bal = spentUsd(store, tenantId, month);

  if (monthlyUsd !== null && bal.total + Number(usd) > monthlyUsd) {
    return {
      ok: false,
      reason: 'tenant_budget_exhausted',
      why: `this would take ${tenantId} past its $${monthlyUsd} monthly budget`,
      monthlyUsd,
      spentUsd: Number(bal.total.toFixed(4)),
      remainingUsd: Number(Math.max(0, monthlyUsd - bal.total).toFixed(4)),
      resetsAt: nextMonthIso(),
    };
  }

  const ref = newRef();
  store.appendLedger(tenantId, {
    type: 'reserve', at: new Date().toISOString(), month,
    tenantId, jobId, ref, usd: Number(usd), key: key || null, kind,
  });
  return {
    ok: true,
    ref,
    remaining: monthlyUsd === null ? null : Number((monthlyUsd - bal.total - Number(usd)).toFixed(4)),
  };
}

function settle(store, { tenantId, ref, jobId, runId, usd, outcome }) {
  if (!store.canRecordSpend()) return false;
  store.appendLedger(tenantId, {
    type: 'settle', at: new Date().toISOString(), month: monthKey(),
    tenantId, jobId, ref, runId: runId || null,
    usd: Number(usd) || 0, outcome: outcome || 'done',
  });
  return true;
}

/** Only for a run that never started. A run that bought anything settles. */
function release(store, { tenantId, ref, jobId, why }) {
  if (!store.canRecordSpend()) return false;
  store.appendLedger(tenantId, {
    type: 'release', at: new Date().toISOString(), month: monthKey(),
    tenantId, jobId, ref, why: why || 'dispatch_failed',
  });
  return true;
}

function nextMonthIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

function summary(store, tenant) {
  const tenantId = tenant.id;
  const bal = spentUsd(store, tenantId);
  const monthlyUsd = Number.isFinite(tenant.monthlyUsd) ? tenant.monthlyUsd : null;
  return {
    tenant: tenantId,
    month: bal.month,
    monthlyUsd,
    spentUsd: Number(bal.settled.toFixed(4)),
    reservedUsd: Number(bal.reserved.toFixed(4)),
    totalUsd: Number(bal.total.toFixed(4)),
    remainingUsd: monthlyUsd === null ? null : Number(Math.max(0, monthlyUsd - bal.total).toFixed(4)),
    runs: bal.runs,
    // Course lessons, separately. A course reserves per lesson at build and
    // settles each lesson at its real cost; lessons that never started are
    // released and do not appear. `perLessonUsd` is measured from done lessons
    // and is null until there are three -- quote the ceiling, not a guess.
    courses: {
      lessons: bal.courses.lessons,
      reservedUsd: Number(bal.courses.reservedUsd.toFixed(4)),
      spentUsd: Number(bal.courses.settledUsd.toFixed(4)),
      perLessonUsd: percentiles(bal.courses.doneUsd),
      note: 'Course spend recorded here from 2026-09-23. Lessons built before that '
        + 'are costed only on GET /api/v1/courses/:courseId (spendUsdTotal).',
    },
    resetsAt: nextMonthIso(),
    recordable: store.canRecordSpend(),
    note: monthlyUsd === null
      ? 'This credential has no monthly ceiling; the per-run hard wall still applies.'
      : 'A reservation is taken before a run starts and settled at its real cost.',
  };
}

/**
 * Close reservations whose job did not survive a restart.
 *
 * Without this, one killed container holds a tenant's whole monthly budget
 * hostage until the month rolls over. Optimistic -- it settles at zero -- and
 * flagged as such, because the alternative is a tenant unable to work at all.
 */
function reconcileOpen(store, { jobs } = {}) {
  if (!store.canRecordSpend()) return { closed: 0 };
  let closed = 0;
  for (const job of store.all()) {
    if (job.status !== 'interrupted' || !job.spendRef || !job.tenantId) continue;
    const bal = spentUsd(store, job.tenantId);
    if (!bal.runs) continue;
    store.appendLedger(job.tenantId, {
      type: 'settle', at: new Date().toISOString(), month: monthKey(),
      tenantId: job.tenantId, jobId: job.id, ref: job.spendRef,
      usd: Number(job.produce && job.produce.spendUsd) || 0,
      outcome: 'interrupted', reconciled: false,
      note: 'the container stopped mid-run; the real cost is not known here',
    });
    if (jobs) jobs.transition(job.id, { patch: { spendRef: null } }, { store });
    closed++;
  }
  return { closed };
}

module.exports = { monthKey, spentUsd, reserve, settle, release, summary, reconcileOpen, nextMonthIso };
