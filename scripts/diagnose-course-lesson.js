#!/usr/bin/env node
'use strict';
/**
 * Say why a course lesson ended where it did, and what it cost.
 *
 *   node scripts/diagnose-course-lesson.js course-mu8hiu9r
 *   node scripts/diagnose-course-lesson.js front-desk/say-the-caller-s-concern-back
 *
 * WHY THIS EXISTS
 * The LMS built a course lesson on 2026-09-19, watched it sit `claimed` for
 * twenty-six minutes and then go `failed`, and could not find out why from
 * outside. The reason was recorded the whole time -- `queue.fail()` writes it
 * into the same event that sets the status -- it simply was not reachable
 * without a shell. Guessing from the outside got them four candidates and no
 * answer, which is the situation this replaces. (It was the fourth: the post-render
 * eval-text.js gate, on a line it had already passed before the spend.)
 *
 * READ-ONLY BY CONSTRUCTION. It opens the queue and the run log, prints, and
 * exits. It never enqueues, claims, requeues or approves, so it cannot start a
 * build or spend a cent, and it is safe to run against production.
 *
 * WHERE TO RUN IT
 * Inside the Railway container. The queue lives on the mounted volume at
 * /data/cq-jobs/queue/queue.jsonl, which `railway run` does NOT see -- that runs
 * the process locally with the remote environment, and resolves to an empty
 * local store. If a container shell is unavailable, the fallback is the deploy
 * log: the spine prints `FAILED at <stage>`, `BLOCKED: ...` and `REJECTED: ...`
 * through log.always, which survives the `quiet: true` the course worker sets.
 */

const path = require('path');
const fs = require('fs');

const jsonl = require(path.join(__dirname, '..', 'orchestrator', 'lib', 'jsonl'));
const queue = require(path.join(__dirname, '..', 'orchestrator', 'lib', 'queue'));
const { PATHS } = require(path.join(__dirname, '..', 'orchestrator', 'lib', 'paths'));

const target = process.argv[2];
if (!target) {
  console.error('usage: node scripts/diagnose-course-lesson.js <courseId|lessonId>');
  console.error('  e.g. node scripts/diagnose-course-lesson.js course-mu8hiu9r');
  process.exit(2);
}

const file = queue.queueFile();
console.log(`queue:      ${file}`);
console.log(`durability: ${queue.durability()}  (a non-volume queue did not survive the last redeploy)`);
if (!fs.existsSync(file)) {
  console.log('\nNo queue file at that path. Either nothing has ever been enqueued on this');
  console.log('machine, or this is not the container the service runs in.');
  process.exit(1);
}

// Every event, in the order it was written -- not the folded item. The fold
// keeps only the last value of each key, and the whole question here is what
// happened in between.
const all = jsonl.readValid(file);

// Which lessons the argument names. A courseId appears only in `notes`, and only
// on the enqueue event -- the claim and fail events that follow carry just the
// id. Matching event-by-event would therefore find the enqueue and miss the
// failure, which is the one thing anybody is looking for.
const ids = new Set(all
  .filter((e) => e.id && `${e.id} ${e.notes || ''}`.includes(target))
  .map((e) => e.id));
const events = all.filter((e) => ids.has(e.id));

if (!events.length) {
  console.log(`\nNothing in the queue mentions "${target}".`);
  const ids = [...new Set(jsonl.readValid(file).map((e) => e.id).filter(Boolean))];
  console.log(`The queue holds ${ids.length} lesson(s):`);
  for (const id of ids.slice(0, 40)) console.log(`  ${id}`);
  process.exit(1);
}

const byId = new Map();
for (const e of events) {
  if (!e.id) continue;
  if (!byId.has(e.id)) byId.set(e.id, []);
  byId.get(e.id).push(e);
}

// The run log is the only place a course run's cost is written. It is written
// twice: to .beads on the container filesystem, and -- since a redeploy takes
// that copy with it while the course itself survives -- to the durable job
// store. Read both. If neither has it, the figure really is gone, and saying so
// is the honest answer.
const runLogs = [PATHS.runsLog];
try {
  const store = require('../server/lib/job-store').shared();
  if (store && store.dir) runLogs.push(path.join(store.dir, 'runs.jsonl'));
} catch { /* no store -- .beads is all there is */ }
const runs = runLogs
  .filter((p) => fs.existsSync(p))
  .flatMap((p) => jsonl.readValid(p));

for (const [id, evs] of byId) {
  console.log(`\n${'='.repeat(72)}\n${id}\n${'='.repeat(72)}`);
  for (const e of evs) {
    const bits = [`${String(e.status || 'enqueued').padEnd(8)} ${e.updatedAt || e.enqueuedAt || ''}`];
    if (e.runId) bits.push(`run=${e.runId}`);
    console.log(`  ${bits.join('  ')}`);
    if (e.error) console.log(`      error:  ${e.error}`);
    if (e.reason) console.log(`      reason: ${e.reason}`);
    if (e.interrupted) console.log('      interrupted by a restart mid-build');
  }

  const runIds = [...new Set(evs.map((e) => e.runId).filter(Boolean))];
  for (const runId of runIds) {
    const matches = runs.filter((r) => r.runId === runId);
    if (!matches.length) {
      console.log(`\n  run ${runId}: no row in ${runLogs.join(' or ')}`);
      console.log('    Spend UNKNOWN, not zero. Runs from before the log was also written to the');
      console.log('    durable store only ever existed in .beads, which a redeploy takes.');
      continue;
    }
    const r = matches[matches.length - 1];
    console.log(`\n  run ${runId}: ${r.status}  ${r.totalMinutes ?? '?'} min  spend $${r.spendUsd ?? '?'}`);
    const stages = Object.entries(r.stageMs || {});
    if (stages.length) console.log(`    stages reached: ${stages.map(([k, v]) => `${k}${v === null ? '(skipped)' : ''}`).join(' -> ')}`);
    for (const [stage, n] of Object.entries(r.stageAttempts || {})) {
      if (n > 1) console.log(`    ${stage} took ${n} attempts`);
    }
    for (const iv of r.interventions || []) {
      console.log(`    [${iv.stage}] ${iv.kind}: ${iv.detail}`);
    }
  }
}

console.log('\nIf a lesson ended `failed` with no error text above, the run predates the');
console.log('fix that surfaces it; the deploy log still has the spine\'s own line:');
console.log('  railway logs | grep -E "FAILED at|BLOCKED:|REJECTED:"');
