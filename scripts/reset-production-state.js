#!/usr/bin/env node
'use strict';
/**
 * Empty this service's job store, deliverables and queue -- on purpose, once.
 *
 *   CONTENT_API_TOKEN=<token> node scripts/reset-production-state.js
 *   CONTENT_API_TOKEN=<token> node scripts/reset-production-state.js --yes --because "clearing the pipeline test runs"
 *
 * DRY RUN BY DEFAULT, like scripts/offload-deliverables-to-drive.js. Without
 * --yes it prints exactly what would go and changes nothing.
 *
 * Why a script and not a curl. POST /api/v1/admin/reset refuses unless `confirm`
 * echoes the live counts exactly, so a plan that went stale between reading and
 * acting is rejected rather than applied to state you have not seen. Typing
 * those numbers by hand defeats the guard -- it turns a safety check into a
 * transcription exercise. This reads them from the same server, one second
 * earlier, and passes them straight back.
 *
 * What it will NOT do: touch the ledger. Open reservations belonging to the
 * records being removed are released -- an appended row -- so a tenant's monthly
 * ceiling is not left holding money against a job that no longer exists. Spend
 * that really happened stays on the books.
 *
 * The token is read from the environment and never printed, not even truncated.
 * It falls back to `.env`, which is gitignored and already holds this credential.
 * Requiring it to be exported by hand does not make anything safer -- it makes a
 * person paste a live token into a shell history, which is strictly worse.
 */

const path = require('path');

// `override: false` is dotenv's default and is the behaviour we want stated out
// loud: a token already in the environment wins, so `--base` against staging
// with a different credential still works.
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: false });
} catch { /* no dotenv, no .env -- the environment is then the only source */ }

const BASE = (() => {
  const i = process.argv.indexOf('--base');
  return (i > -1 && process.argv[i + 1]) || 'https://content-queen-production.up.railway.app';
})();
const BECAUSE = (() => {
  const i = process.argv.indexOf('--because');
  return (i > -1 && process.argv[i + 1]) || 'clearing the pipeline test runs so production starts empty';
})();
const GO = process.argv.includes('--yes');
const TOKEN = process.env.CONTENT_API_TOKEN || '';

function usd(n) { return `$${Number(n || 0).toFixed(2)}`; }
function mb(n) { return `${(Number(n || 0) / 1024 / 1024).toFixed(1)} MB`; }

async function post(body) {
  const res = await fetch(`${BASE}/api/v1/admin/reset`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { /* reported below */ }
  return { status: res.status, json, text };
}

(async () => {
  if (!TOKEN) {
    console.error('CONTENT_API_TOKEN is not set, and .env does not carry it either.\n'
      + 'This route needs the operator credential; a partner token has no `admin`\n'
      + 'scope and is refused with 403.\n\n'
      + 'PowerShell:  $env:CONTENT_API_TOKEN = "<token>"');
    process.exit(2);
  }

  console.log(`\n  ${BASE}\n`);

  // 1. Ask the server what it can see, by handing it counts it can never match.
  //    The refusal carries the real ones, so the numbers are never guessed here.
  const probe = await post({ because: 'probe', confirm: { jobs: -1, deliverables: -1, queueItems: -1 } });
  if (probe.status === 403) {
    console.error('  403 -- this credential has no `admin` scope. Use CONTENT_API_TOKEN, not a tenant token.');
    process.exit(1);
  }
  if (probe.status === 409 && probe.json && probe.json.error === 'work_in_flight') {
    console.error('  REFUSED: something is running.\n');
    console.error(`    ${JSON.stringify(probe.json.inFlight)}`);
    if (probe.json.building) console.error(`    course worker is building ${probe.json.building}`);
    console.error('\n  A reset deletes records; it cannot cancel work. Wait for it to finish.');
    process.exit(1);
  }
  if (probe.status !== 409 || !probe.json || !probe.json.actual) {
    console.error(`  Unexpected answer to the probe: ${probe.status} ${probe.text.slice(0, 300)}`);
    process.exit(1);
  }
  const counts = probe.json.actual;

  // 2. The rehearsal. Same code path the real call takes, so it cannot describe
  //    a different operation from the one that would run.
  const plan = await post({ confirm: counts, because: BECAUSE });
  if (plan.status !== 200 || !plan.json) {
    console.error(`  Dry run failed: ${plan.status} ${plan.text.slice(0, 300)}`);
    process.exit(1);
  }
  const p = plan.json;

  console.log(`  ${p.jobs.length} job record(s)`);
  for (const j of p.jobs) console.log(`      ${j.id}  ${j.status}${j.tenantId ? `  [${j.tenantId}]` : ''}`);
  console.log(`\n  ${p.deliverables.length} deliverable(s), ${mb(p.bytesReclaimed)}`);
  for (const d of p.deliverables) console.log(`      ${d.id}  ${mb(d.bytes)}`);
  console.log(`\n  ${p.queueItems.length} queue item(s)`);
  for (const q of p.queueItems) console.log(`      ${q.id}  ${q.status}`);

  if (p.releasing.length) {
    console.log(`\n  ${p.releasing.length} open reservation(s) to release -- money held against records that are going:`);
    for (const h of p.releasing) console.log(`      ${h.tenantId}  ${usd(h.usd)}  ref ${h.ref}`);
  } else {
    console.log('\n  No open reservations. Nothing is holding money.');
  }
  console.log('\n  The ledger itself is never touched: spend that really happened stays on the books.');

  if (!GO) {
    console.log('\n  DRY RUN -- nothing was changed.');
    console.log('  Re-run with --yes to carry this out.\n');
    return;
  }

  // 3. For real.
  const done = await post({ confirm: counts, because: BECAUSE, dryRun: false });
  if (done.status !== 200 && done.status !== 207) {
    console.error(`\n  FAILED: ${done.status} ${done.text.slice(0, 400)}`);
    process.exit(1);
  }
  const r = done.json;
  console.log('\n  done:');
  console.log(`      jobs removed          ${r.jobsRemoved.length}`);
  console.log(`      deliverables removed  ${r.deliverablesRemoved.length}  (${mb(r.bytesReclaimed)} reclaimed)`);
  console.log(`      reservations released ${r.released.length}`);
  console.log(`      queue archived to     ${r.queueArchived || '(nothing to archive)'}`);
  if (r.errors && r.errors.length) {
    console.log(`\n  ${r.errors.length} step(s) did NOT land -- this is a 207, not a success:`);
    for (const e of r.errors) console.log(`      ${e.step} ${e.id || e.ref || ''}: ${e.message}`);
    process.exitCode = 1;
  }
  console.log('\n  Check /health: jobStore.jobs and storage.deliverables.bytes should both be 0.\n');
})().catch((e) => {
  console.error(`\n  ${e.message}\n`);
  process.exit(1);
});
