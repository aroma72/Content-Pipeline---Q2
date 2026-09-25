'use strict';
/**
 * health -- the two facts /health used to get wrong.
 *
 * `ok` was hardcoded `true`, so Railway's deploy-time probe could never fail,
 * and a container whose job store had fallen back to memory -- which refuses
 * every spend -- was reported healthy. And the route counted course lessons but
 * not one-video jobs, so `predeploy-check.js` was blind to a job being written
 * through /demo/make-video: on 2026-09-25 two redeploys landed on exactly that
 * and took the written script with them.
 *
 * Pure functions, so they can be tested without a server.
 */

/** Which one-video jobs a restart would interrupt right now. Counts only. */
function inFlight(store) {
  const counts = { writing: 0, producing: 0, publishing: 0 };
  let rows = [];
  try { rows = store.all(); } catch { rows = []; }
  for (const j of rows) {
    if (j.status === 'running') counts.writing++;
    else if (j.status === 'producing') counts.producing++;
    else if (j.status === 'publishing') counts.publishing++;
  }
  return { ...counts, any: counts.writing + counts.producing + counts.publishing > 0 };
}

/**
 * Is this container fit to take paid work?
 *
 * Returns { ok, status, reasons }. `status` is the HTTP code /health should
 * answer with:
 *   200  healthy, or degraded-but-serving (ok:false, reasons say why)
 *   503  the job store is memory -- every spend would be refused, and a deploy
 *        whose probe sees this should not go live. Railway probes at deploy
 *        time, so a 503 keeps the previous build serving, which is the outcome
 *        we want. Nothing else is 503: a missing model key must not make
 *        Railway restart a container that is mid-render.
 */
function verdict({ store, readiness }) {
  const reasons = [];
  const sh = (store && store.health && store.health()) || {};
  if (sh.durability === 'memory') reasons.push('job store is in memory: every spend would be refused and nothing survives a restart');
  if (sh.writable === false) reasons.push('job store is not writable');
  const r = (typeof readiness === 'function' ? readiness() : readiness) || {};
  if (r.model === false) reasons.push('model unavailable' + (r.modelNote ? ': ' + r.modelNote : ''));
  if (r.gemini === false) reasons.push('no GEMINI_API_KEY / GOOGLE_STUDIO_API_KEY: no art or voiceover');
  if (r.budgetAuthorised === false) reasons.push('PIPELINE_BUDGET_USD is 0: every course lesson will refuse to spend');
  const fatal = sh.durability === 'memory';
  return { ok: reasons.length === 0, status: fatal ? 503 : 200, reasons };
}

/** What deploy.sh stamped into the tree it uploaded, if anything. */
function build() {
  try {
    const path = require('path');
    const fs = require('fs');
    const p = path.join(__dirname, '..', '..', 'build.json');
    if (!fs.existsSync(p)) return null;
    const b = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { commit: b.commit || null, builtAt: b.builtAt || null, by: b.by || null };
  } catch { return null; }
}

module.exports = { inFlight, verdict, build };
