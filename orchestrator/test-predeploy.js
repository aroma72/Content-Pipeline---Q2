'use strict';
/**
 * predeploy-check must refuse on ANY running work, not only a course lesson.
 *
 * On 2026-09-25 it said "safe to deploy" while a one-video job was being
 * written, because it only read courses.worker. Each case here stubs /health
 * and runs the real script as a child, asserting on its exit code and on the
 * reason it prints -- the reason is what a person deploying will act on.
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'predeploy-check.js');
let pass = 0; const failures = [];

async function check(name, fn) {
  try { const note = await fn(); pass++; console.log(`  PASS  ${name}${note ? '  (' + note + ')' : ''}`); }
  catch (e) { failures.push(name); console.log(`  FAIL  ${name}\n          ${e.message}`); }
}
function assert(c, m) { if (!c) throw new Error(m); }

async function withHealth(body, status, fn) {
  const server = http.createServer((_req, res) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await fn(base); } finally { await new Promise((r) => server.close(r)); }
}

// Async, never spawnSync: the stub /health server lives in THIS process, and a
// synchronous spawn blocks the event loop the stub needs to answer the child.
// The first version deadlocked on the very first case and was killed at 120s.
function run(base, extraEnv = {}) {
  return new Promise((resolve) => {
    const env = { ...process.env, BASE: base, ...extraEnv };
    delete env.PREDEPLOY_ALLOW_UNKNOWN_JOBS;
    Object.assign(env, extraEnv);
    const child = spawn(process.execPath, [SCRIPT], { env });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
  });
}

const idleWorker = { running: false, building: false, eligible: 0, needsResume: false, heldCourses: 0 };
const noJobs = { writing: 0, producing: 0, publishing: 0, any: false };

(async () => {
  console.log('\npredeploy-check refuses to land on running work');

  await withHealth({ ok: true, courses: { worker: idleWorker }, jobs: { inFlight: noJobs } }, 200, async (base) => {
    await check('idle service: exit 0', async () => {
      const r = await run(base);
      assert(r.code === 0, `exit ${r.code}: ${r.out}`);
      assert(/safe to deploy/.test(r.out), r.out);
      return 'safe';
    });
  });

  await withHealth({ ok: true, courses: { worker: idleWorker }, jobs: { inFlight: { ...noJobs, writing: 1, any: true } } }, 200, async (base) => {
    await check('a one-video job being written: exit 1, and the reason names it', async () => {
      const r = await run(base);
      assert(r.code === 1, `exit ${r.code}: ${r.out}`);
      assert(/one-video job\(s\) being WRITTEN/.test(r.out), `reason does not name the job: ${r.out}`);
      return 'refused';
    });
  });

  await withHealth({ ok: true, courses: { worker: idleWorker }, jobs: { inFlight: { ...noJobs, producing: 1, any: true } } }, 200, async (base) => {
    await check('a one-video job producing (money already spent): exit 1', async () => {
      const r = await run(base);
      assert(r.code === 1, `exit ${r.code}: ${r.out}`);
      assert(/PRODUCED/.test(r.out), r.out);
      return 'refused';
    });
  });

  await withHealth({ ok: true, courses: { worker: { ...idleWorker, running: true, building: true } }, jobs: { inFlight: noJobs } }, 200, async (base) => {
    await check('a course lesson building: still exit 1 (the original case)', async () => {
      const r = await run(base);
      assert(r.code === 1, `exit ${r.code}: ${r.out}`);
      assert(/BUILDING a lesson/.test(r.out), r.out);
      return 'refused';
    });
  });

  await withHealth({ ok: true, courses: { worker: idleWorker } }, 200, async (base) => {
    await check('an older build with no jobs.inFlight: exit 1, unknown is not idle', async () => {
      const r = await run(base);
      assert(r.code === 1, `exit ${r.code}: ${r.out}`);
      assert(/does not report jobs.inFlight/.test(r.out), r.out);
      return 'refused';
    });
  });

  await withHealth({ ok: true, courses: { worker: idleWorker } }, 200, async (base) => {
    await check('the bootstrap override lets the first jobs.inFlight build deploy, and says so', async () => {
      const r = await run(base, { PREDEPLOY_ALLOW_UNKNOWN_JOBS: '1' });
      assert(r.code === 0, `exit ${r.code}: ${r.out}`);
      assert(/PREDEPLOY_ALLOW_UNKNOWN_JOBS=1/.test(r.out), 'the override must announce itself');
      return 'proceeded, loudly';
    });
  });

  await withHealth({ ok: true, courses: { worker: { ...idleWorker, running: true, building: true } } }, 200, async (base) => {
    await check('the bootstrap override never overrides a building course worker', async () => {
      const r = await run(base, { PREDEPLOY_ALLOW_UNKNOWN_JOBS: '1' });
      assert(r.code === 1, `exit ${r.code}: ${r.out}`);
      return 'still refused';
    });
  });

  await withHealth({ ok: false, notOkBecause: ['job store is in memory'], courses: { worker: idleWorker }, jobs: { inFlight: noJobs } }, 503, async (base) => {
    await check('a 503 /health is still readable, and idle work is still idle', async () => {
      const r = await run(base);
      assert(r.code === 0, `exit ${r.code}: ${r.out}`);
      return 'read through the 503';
    });
  });

  await check('an unreachable service: exit 1, never deploy blind', async () => {
    const r = await run('http://127.0.0.1:1');
    assert(r.code === 1, `exit ${r.code}: ${r.out}`);
    assert(/not deploying blind/.test(r.out), r.out);
    return 'refused';
  });

  console.log(`\n  ${pass} passed, ${failures.length} failed`);
  if (failures.length) process.exitCode = 1;
})();
