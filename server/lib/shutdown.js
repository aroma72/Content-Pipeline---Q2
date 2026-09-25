'use strict';
/**
 * shutdown -- say where the work was when the process is told to stop.
 *
 * Until 2026-09-25 nothing handled SIGTERM, unhandledRejection or
 * uncaughtException. A redeploy killed a job mid-write and the job record only
 * learned about it at the NEXT boot, from jobs.restore(). A rejection escaping
 * any of the fire-and-forget produce promises would have terminated Node
 * mid-spend, and Railway would have retried three times.
 *
 * `markInterrupted` is pure enough to test: it takes the store and returns what
 * it changed. `install` wires the process events and is called once from
 * server/index.js.
 */

/** Mark every in-flight one-video job now, rather than at the next boot. */
function markInterrupted({ jobs, store, reason }) {
  // jobs.restore() already encodes the policy (producing -> interrupted and
  // resumable; running/publishing -> failed with the reason). Reuse it so a
  // SIGTERM and a crash leave the record in the same shape.
  const r = jobs.restore({ store });
  return { interrupted: r.interrupted, failed: r.failed, reason };
}

function install({ jobs, store, courseWorker, server, log = console.log, exit = process.exit }) {
  let stopping = false;

  function onSignal(signal) {
    if (stopping) return;
    stopping = true;
    try {
      const cw = courseWorker && courseWorker.status ? courseWorker.status() : null;
      if (cw && cw.current) {
        log(`[server] ${signal}: course lesson ${cw.current.id} was building (run started ${cw.current.startedAt}); it will be parked as interrupted at the next boot`);
      }
      const m = markInterrupted({ jobs, store, reason: signal });
      if (m.interrupted || m.failed) {
        log(`[server] ${signal}: marked ${m.interrupted} producing job(s) interrupted and ${m.failed} writing/publishing job(s) failed before exit`);
      } else {
        log(`[server] ${signal}: no one-video job in flight`);
      }
    } catch (e) {
      log(`[server] ${signal}: could not record in-flight work: ${e.message}`);
    }
    // Stop taking requests, then leave. Railway's grace period is short; the
    // record above is the thing that had to happen first.
    try { if (server && server.close) server.close(() => exit(0)); else exit(0); }
    catch { exit(0); }
    setTimeout(() => exit(0), 5000).unref();
  }

  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGINT', () => onSignal('SIGINT'));

  // Log and carry on: a rejection here is almost always inside a produce
  // promise that already has its own catch; the ones that reach this handler
  // are bugs, and Node 22 would otherwise exit mid-render over one of them.
  process.on('unhandledRejection', (err) => {
    const e = err instanceof Error ? err : new Error(String(err));
    log(`[server] unhandledRejection: ${e.message}`);
    if (e.stack) log(e.stack.split('\n').slice(0, 6).join('\n'));
  });

  // An uncaught exception means state is unknown. Record the work, then leave
  // so Railway restarts a clean process rather than a wounded one.
  process.on('uncaughtException', (err) => {
    log(`[server] uncaughtException: ${err && err.message}`);
    if (err && err.stack) log(err.stack.split('\n').slice(0, 8).join('\n'));
    onSignal('uncaughtException');
  });

  return { onSignal };
}

module.exports = { install, markInterrupted };
