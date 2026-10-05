#!/usr/bin/env node
'use strict';
/**
 * lms-e2e -- drive a live content-queen exactly the way the LMS does: over HTTP,
 * with a tenant token, nothing else. Both flows, stopping before anything publishes.
 *
 *   node scripts/lms-e2e.js                 # quote only: writes scripts (free), prices them, stops
 *   node scripts/lms-e2e.js --yes           # also produces, up to --cap per video (default $3.00)
 *   node scripts/lms-e2e.js --yes --only=course|single
 *   node scripts/lms-e2e.js --base https://staging.example
 *
 * Course flow   plan -> build (409 without confirm, 400 on a broken plan) -> script-approval
 *               -> script/beats/script.md -> stale-sha approve (409) -> quote -> approve
 *               -> review -> /file (Drive JSON) -> /deliverables /videos /checkpoints
 *               -> attempts (501) -> reject -> DELETE /file
 * Single video  make-video -> written -> quote -> produce (Idempotency-Key, replayed)
 *               -> awaiting_review -> /video (Drive JSON) -> DELETE /video
 * Cleanup       the Drive test files go to the Drive trash (scoped to our folder).
 *
 * Uses CONTENT_API_TOKEN (the operator's `default` tenant). Never the LMS's own token.
 * Prints each estimate line before spending (paid-run-protocol). No publish, no callbackUrl.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

// Fill missing env from .env without ever printing a value.
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env: rely on the environment */ }

const arg = (name, dflt) => {
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
};
const BASE = String(arg('base', 'https://content-queen-production.up.railway.app')).replace(/\/+$/, '');
const TOKEN = process.env.CONTENT_API_TOKEN || '';
const YES = process.argv.includes('--yes') || process.env.CONFIRM_SPEND === '1';
const CAP = Number(arg('cap', '3.00'));
const ONLY = arg('only', 'both');
const KEEP_DRIVE = process.argv.includes('--keep-drive');
const SERIES = arg('series', `lms-e2e-${new Date().toISOString().slice(0, 10)}`);

const { _internals: { COST, i2vSeconds } } = require('../orchestrator/lib/stages/produce');

const results = [];
function record(flow, what, ok, detail = '') {
  results.push({ flow, what, ok, detail });
  const mark = ok === true ? 'PASS' : ok === 'skip' ? 'SKIP' : 'FAIL';
  console.log(`  [${mark}] ${flow}: ${what}${detail ? ` -- ${detail}` : ''}`);
}
const expect = (flow, what, cond, detail) => { record(flow, what, Boolean(cond), detail); return Boolean(cond); };

async function http(method, p, { body, headers = {}, auth = true, raw = false } = {}) {
  const h = { ...headers };
  if (auth) h.authorization = `Bearer ${TOKEN}`;
  if (body !== undefined) h['content-type'] = 'application/json';
  const res = await fetch(BASE + p, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const type = res.headers.get('content-type') || '';
  let data = null;
  if (raw || !/json/.test(type)) { data = raw ? null : await res.text(); if (raw) await res.body?.cancel?.(); }
  else data = await res.json().catch(() => null);
  return { status: res.status, type, data, headers: res.headers };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function poll(label, fn, { everyMs = 15000, timeoutMs = 90 * 60 * 1000 } = {}) {
  const t0 = Date.now();
  let last = '';
  for (;;) {
    const r = await fn();
    if (r.done) return r;
    if (r.note && r.note !== last) { console.log(`    ${label}: ${r.note} (${Math.round((Date.now() - t0) / 1000)}s)`); last = r.note; }
    if (Date.now() - t0 > timeoutMs) return { done: true, timedOut: true, ...r };
    await sleep(everyMs);
  }
}

/**
 * Price a video from its raw beats the way produce does, with the repair allowance
 * shown separately. Before TTS there are no durations, so an animated beat is priced
 * at the 10s bucket here rather than produce's 5s floor: over-quoting is the safe side.
 */
function quote(beats) {
  const list = Array.isArray(beats) ? beats : [];
  const images = list.filter((b) => b.mode !== 'info' && b.mode !== 'checkpoint' && b.art).length;
  const clips = list.filter((b) => b.mode !== 'checkpoint' && b.vo).length;
  const moving = list.filter((b) => b.mode !== 'info' && b.art && b.motion);
  const animSecs = moving.reduce((a) => a + i2vSeconds(10), 0);
  const artUsd = images * COST.imagePerImage;
  const ttsUsd = clips * COST.ttsPerClip;
  const animUsd = animSecs * COST.i2vPerSecond;
  const totalUsd = Number((artUsd + ttsUsd + animUsd).toFixed(2));
  return { beats: list.length, images, clips, animBeats: moving.length, animSecs,
    artUsd: Number(artUsd.toFixed(2)), ttsUsd: Number(ttsUsd.toFixed(3)), animUsd: Number(animUsd.toFixed(2)), totalUsd };
}
function printQuote(flow, q) {
  console.log(`    ${flow} estimate: ${q.images} images x $${COST.imagePerImage} = $${q.artUsd}`
    + ` + ${q.clips} TTS x $${COST.ttsPerClip} = $${q.ttsUsd}`
    + ` + ${q.animBeats} animated beat(s) / ${q.animSecs}s x $${COST.i2vPerSecond} = $${q.animUsd}`
    + `  => $${q.totalUsd} (cap $${CAP.toFixed(2)})`);
}

/** beats.js is served as source text; evaluate it in an empty sandbox, never with require. */
function evalBeats(src) {
  const sandbox = { module: { exports: null }, exports: {} };
  vm.runInNewContext(String(src), sandbox, { timeout: 1000 });
  const out = sandbox.module.exports || sandbox.exports;
  return Array.isArray(out) ? out : (out && out.beats) || [];
}

const driveFiles = [];

function checkDriveJson(flow, what, r) {
  const d = r.data || {};
  expect(flow, `${what} answers the Drive record, not a 404`, r.status === 200 && d.saved2drive === true,
    `HTTP ${r.status}${d.saved2drive ? ` ${d.driveUrl}` : ` ${JSON.stringify(d).slice(0, 160)}`}`);
  if (d.saved2drive) {
    expect(flow, `${what} carries a verified md5`, d.verified === true && /^[a-f0-9]{32}$/.test(String(d.md5 || '')), `md5 ${d.md5}`);
    if (d.driveFileId) driveFiles.push({ flow, fileId: d.driveFileId, md5: d.md5, bytes: d.bytes });
  }
  return d;
}

async function health(flow) {
  const h = await http('GET', '/health', { auth: false });
  expect(flow, 'GET /health', h.status === 200 && h.data && h.data.ok, `build ${(h.data && h.data.build && h.data.build.commit || '').slice(0, 7)}`);
  const d = h.data && h.data.storage && h.data.storage.driveOffload;
  expect(flow, 'Drive offload configured and authorised', d && d.configured && d.authorised, JSON.stringify(d));
  const r = await http('GET', '/health/render', { auth: false });
  expect(flow, 'GET /health/render', r.status === 200, `HTTP ${r.status}`);
  const v1 = await http('GET', '/api/v1');
  expect(flow, 'GET /api/v1 (contract)', v1.status === 200, `HTTP ${v1.status}`);
  return h.data;
}

// ── course ────────────────────────────────────────────────────────────────
async function courseFlow() {
  const F = 'course';
  console.log('\nCourse flow (/api/v1/courses/*)');
  const planR = await http('POST', '/api/v1/courses/plan', { body: {
    topic: 'Writing a clear prompt for an AI assistant',
    audience: 'working adults new to AI tools', duration: 'one short lesson',
    description: 'One lesson: give the AI a role, the context and the exact output you want.',
  } });
  if (!expect(F, 'POST /courses/plan', planR.status === 200 && planR.data && planR.data.modules, `HTTP ${planR.status}`)) return;
  const plan = planR.data;
  plan.modules = [{ ...plan.modules[0], lessons: [plan.modules[0].lessons[0]] }];

  const noConfirm = await http('POST', '/api/v1/courses/build', { body: { plan, series: SERIES } });
  expect(F, 'build without confirmLessons is refused (409)', noConfirm.status === 409, `HTTP ${noConfirm.status}`);
  const broken = await http('POST', '/api/v1/courses/build', { body: { plan: { title: 'x', modules: [{ title: 'm', lessons: [{}] }] }, series: SERIES, confirmLessons: 1 } });
  expect(F, 'a broken plan is refused (400)', broken.status === 400, `HTTP ${broken.status}`);

  const built = await http('POST', '/api/v1/courses/build', { body: { plan, series: SERIES, confirmLessons: 1 } });
  if (!expect(F, 'POST /courses/build (202)', built.status === 202 && built.data && built.data.courseId, `HTTP ${built.status} ${JSON.stringify(built.data).slice(0, 200)}`)) return;
  const courseId = built.data.courseId;
  console.log(`    courseId ${courseId}`);

  const lesson = async () => {
    const r = await http('GET', `/api/v1/courses/${courseId}`);
    return (r.data && r.data.items && r.data.items[0]) || null;
  };
  const waitFor = (blockedBy, timeoutMs) => poll('lesson', async () => {
    const it = await lesson();
    if (!it) return { note: 'no item yet' };
    if (it.status === 'failed') return { done: true, item: it };
    if (it.status === 'blocked' && it.blockedBy === blockedBy) return { done: true, item: it };
    if (it.status === 'blocked' && it.blockedBy !== blockedBy && blockedBy === 'review' && it.blockedBy === 'script-approval') return { note: 'still at script-approval' };
    if (it.status === 'blocked' && !['script-approval', 'review'].includes(it.blockedBy)) return { done: true, item: it };
    return { note: `${it.status}${it.blockedBy ? `/${it.blockedBy}` : ''}` };
  }, { timeoutMs });

  let w = await waitFor('script-approval', 20 * 60 * 1000);
  if (!expect(F, 'lesson reaches script-approval', w.item && w.item.blockedBy === 'script-approval',
    w.timedOut ? 'timed out' : `${w.item && w.item.status} ${w.item && (w.item.reason || w.item.error || '')}`)) return { courseId, lessonId: w.item && w.item.id };
  const lessonId = w.item.id;
  const lp = `/api/v1/courses/${courseId}/lessons/${lessonId.split('/').map(encodeURIComponent).join('/')}`;

  const script = await http('GET', `${lp}/script`);
  expect(F, 'GET .../script', script.status === 200 && script.data && script.data.sha && script.data.awaitingApproval === true, `sha ${script.data && script.data.sha}`);
  const sha = script.data && script.data.sha;
  expect(F, 'script sha matches the course view', sha && sha === w.item.scriptSha, `${sha} vs ${w.item.scriptSha}`);
  expect(F, 'script carries a checkpoint', script.data && script.data.checkpoint && script.data.checkpoint.stem, '');
  const md = await http('GET', `${lp}/script.md`);
  expect(F, 'GET .../script.md', md.status === 200 && /markdown|text/.test(md.type) && String(md.data).length > 200, `${md.type} ${String(md.data || '').length} chars`);
  const beatsR = await http('GET', `${lp}/beats`);
  let beats = [];
  try { beats = evalBeats(beatsR.data && beatsR.data.beats); } catch (e) { /* recorded below */ }
  expect(F, 'GET .../beats (evaluable, matches beatCount)', beatsR.status === 200 && beats.length === script.data.beatCount, `${beats.length} beats`);

  const stale = await http('POST', `${lp}/script/approve`, { body: { by: 'lms-e2e', sha: 'deadbeef' } });
  expect(F, 'approving a stale sha is refused (409)', stale.status === 409, `HTTP ${stale.status}`);

  const q = quote(beats);
  printQuote(F, q);
  expect(F, 'script asks for animation', q.animBeats > 0, `${q.animBeats} moving beat(s)`);
  if (q.totalUsd > CAP) { record(F, 'quote under the cap', false, `$${q.totalUsd} > $${CAP} -- refusing to approve`); return { courseId, lessonId, lp }; }
  if (!YES) { record(F, 'produce', 'skip', 'quote only -- re-run with --yes to spend'); return { courseId, lessonId, lp }; }

  const ok = await http('POST', `${lp}/script/approve`, { body: { by: 'lms-e2e', sha } });
  if (!expect(F, 'POST .../script/approve (202)', ok.status === 202, `HTTP ${ok.status}`)) return { courseId, lessonId, lp };

  w = await waitFor('review', 90 * 60 * 1000);
  const it = w.item || {};
  expect(F, 'lesson reaches review (video made)', it.status === 'blocked' && it.blockedBy === 'review',
    w.timedOut ? 'timed out' : `${it.status}/${it.blockedBy} ${it.reason || it.error || ''}`);
  const spent = Number(it.spendMediaUsdTotal ?? it.spendUsdTotal ?? NaN);
  expect(F, 'spend is reported and within the cap', Number.isFinite(spent) && spent <= CAP,
    `media $${it.spendMediaUsdTotal} total $${it.spendUsdTotal} (quoted $${q.totalUsd})`);
  expect(F, 'course view says saved to Drive', it.saved2drive === true && it.driveUrl, `${it.driveUrl || ''}`);

  checkDriveJson(F, 'GET .../file', await http('GET', `${lp}/file`));
  const dl = await http('GET', '/api/v1/deliverables');
  expect(F, 'GET /deliverables', dl.status === 200, `HTTP ${dl.status}`);

  const slug = lessonId.split('/').pop();
  const vids = await http('GET', '/api/v1/videos');
  const listed = vids.data && (vids.data.videos || []).find((v) => v.videoId === slug || v.slug === slug);
  expect(F, 'GET /videos lists the lesson', vids.status === 200 && listed, `${vids.data && vids.data.count} video(s)`);
  const cps = await http('GET', `/api/v1/videos/${encodeURIComponent(slug)}/checkpoints`);
  const first = cps.data && (cps.data.checkpoints || [])[0];
  expect(F, 'GET /videos/:id/checkpoints has a timed popup', cps.status === 200 && first && Number.isFinite(first.atSeconds),
    first ? `atSeconds ${first.atSeconds}, ${((first.quiz || first).options || []).length} options` : `HTTP ${cps.status}`);
  const att = await http('POST', `/api/v1/videos/${encodeURIComponent(slug)}/checkpoints/${encodeURIComponent((first && first.id) || 'x')}/attempts`, { body: { answer: 0 } });
  expect(F, 'attempts is loudly not implemented (501)', att.status === 501, `HTTP ${att.status}`);

  return { courseId, lessonId, lp };
}

async function courseCleanup(c) {
  const F = 'course';
  if (!c || !c.lp) return;
  const rej = await http('POST', `${c.lp}/reject`, { body: { why: 'lms-e2e test run -- not for publishing', by: 'lms-e2e' } });
  expect(F, 'POST .../reject', rej.status === 202, `HTTP ${rej.status} ${rej.status !== 202 ? JSON.stringify(rej.data).slice(0, 160) : ''}`);
  const del = await http('DELETE', `${c.lp}/file`);
  expect(F, 'DELETE .../file', del.status === 200 || del.status === 404, `HTTP ${del.status}`);
}

// ── single video ─────────────────────────────────────────────────────────
async function singleFlow() {
  const F = 'single';
  console.log('\nSingle-video flow (/demo/make-video)');
  const made = await http('POST', '/demo/make-video', { body: {
    topic: 'Checking an AI answer before you use it',
    notes: `lms-e2e ${SERIES}: a short lesson; give 2 story-critical beats small motion.`,
  } });
  if (!expect(F, 'POST /demo/make-video (202)', made.status === 202 && made.data && made.data.jobId, `HTTP ${made.status} owner ${made.data && made.data.owner}`)) return null;
  const jobId = made.data.jobId;
  const jp = `/demo/make-video/${encodeURIComponent(jobId)}`;
  console.log(`    jobId ${jobId}`);

  const waitFor = (want, timeoutMs) => poll('job', async () => {
    const r = await http('GET', jp);
    const j = r.data || {};
    if (want.includes(j.status) || ['failed', 'rejected', 'published'].includes(j.status)) return { done: true, job: j };
    return { note: `${j.status}${j.stage ? `/${j.stage}` : ''}${j.produce && j.produce.stage ? `/${j.produce.stage}` : ''}` };
  }, { timeoutMs });

  let w = await waitFor(['written'], 20 * 60 * 1000);
  if (!expect(F, 'job reaches written', w.job && w.job.status === 'written', w.timedOut ? 'timed out' : `${w.job && w.job.status} ${w.job && (w.job.error || '')}`)) return { jobId, jp };
  // `script.beats` is the reader's summary (no quiz, no motion); `beatsFull` is what produce renders.
  const sc = w.job.script || {};
  const beats = sc.beatsFull || sc.beats || [];
  expect(F, 'job carries its script and a checkpoint', beats.length && sc.checkpoint && sc.checkpoint.stem
    && beats.some((b) => b.mode === 'checkpoint'), `${beats.length} beats, checkpoint after ${sc.checkpointAfterBeat}`);
  // Since 2026-10-05 write() runs the five free script checks and fingerprints
  // the checked bytes before the job is `written`; produce approves that sha.
  expect(F, 'written script carries the checked sha and its unresolved checks', /^[0-9a-f]{16}$/.test(String(sc.scriptSha || ''))
    && Array.isArray(sc.unresolvedChecks), `sha ${sc.scriptSha}, ${(sc.unresolvedChecks || []).length} unresolved`);
  expect(F, 'nothing is held for a job that has only been written', w.job.deliverableAvailable === false, `deliverableAvailable ${w.job.deliverableAvailable}`);
  const md = await http('GET', `${jp}/script.md`);
  expect(F, 'GET .../script.md', md.status === 200 && String(md.data || '').length > 200, `${String(md.data || '').length} chars`);
  const early = await http('GET', `${jp}/video`, { raw: true });
  expect(F, 'GET .../video before produce is a 404', early.status === 404, `HTTP ${early.status}`);

  const q = quote(beats);
  printQuote(F, q);
  expect(F, 'script asks for animation', q.animBeats > 0, `${q.animBeats} moving beat(s)`);
  if (q.totalUsd > CAP) { record(F, 'quote under the cap', false, `$${q.totalUsd} > $${CAP} -- refusing to produce`); return { jobId, jp }; }
  if (!YES) { record(F, 'produce', 'skip', 'quote only -- re-run with --yes to spend'); return { jobId, jp }; }

  const key = `lms-e2e-${crypto.randomUUID()}`;
  const go = await http('POST', `${jp}/produce`, { body: {}, headers: { 'idempotency-key': key } });
  if (!expect(F, 'POST .../produce (202)', go.status === 202 && go.data && go.data.status === 'producing', `HTTP ${go.status} budget $${go.data && go.data.budgetUsd}`)) return { jobId, jp };
  const again = await http('POST', `${jp}/produce`, { body: {}, headers: { 'idempotency-key': key } });
  expect(F, 'a retried produce is replayed, not re-bought', again.status === 202 && again.headers.get('idempotency-replayed') === 'true', `HTTP ${again.status}`);

  w = await waitFor(['awaiting_review'], 90 * 60 * 1000);
  const j = w.job || {};
  expect(F, 'job reaches awaiting_review (video made)', j.status === 'awaiting_review', w.timedOut ? 'timed out' : `${j.status} ${j.error || (j.lastError && j.lastError.message) || ''}`);
  const spent = Number(j.produce && j.produce.spendUsd);
  expect(F, 'spend is reported and within the cap', Number.isFinite(spent) && spent <= CAP, `$${j.produce && j.produce.spendUsd} (quoted $${q.totalUsd})`);
  // The record must say a video exists, and say what the run accepted with a
  // warning instead of blocking on it after the spend (2026-10-05).
  expect(F, 'deliverableAvailable is true once the video is made', j.deliverableAvailable === true, `deliverableAvailable ${j.deliverableAvailable}`);
  expect(F, 'produce.warnings is a list (possibly empty), never a post-render block', Array.isArray(j.produce && j.produce.warnings),
    `${(j.produce && j.produce.warnings || []).length} warning(s)${j.produce && j.produce.blocked ? `; blocked at ${j.produce.blocked.code}` : ''}`);
  if (j.lastError) record(F, 'lastError on an awaiting_review job', 'skip', `${j.lastError.kind} ${j.lastError.code || ''} spent $${j.lastError.spentUsd}`);
  checkDriveJson(F, 'GET .../video', await http('GET', `${jp}/video`));
  if (j.catalogue && j.catalogue.checkpointsUrl) {
    const u = new URL(j.catalogue.checkpointsUrl, BASE);
    const cps = await http('GET', u.pathname);
    const first = cps.data && (cps.data.checkpoints || [])[0];
    expect(F, 'catalogue checkpointsUrl resolves', cps.status === 200 && first && Number.isFinite(first.atSeconds), first ? `atSeconds ${first.atSeconds}` : `HTTP ${cps.status}`);
  } else record(F, 'catalogue checkpointsUrl', false, 'job has no catalogue entry');
  const vids = await http('GET', '/demo/videos');
  expect(F, 'GET /demo/videos lists it (from Drive)', vids.status === 200, `HTTP ${vids.status}`);
  return { jobId, jp };
}

async function singleCleanup(s) {
  if (!s || !s.jp) return;
  const del = await http('DELETE', `${s.jp}/video`);
  expect('single', 'DELETE .../video', del.status === 200 || del.status === 404, `HTTP ${del.status}`);
}

async function driveCleanup() {
  if (!driveFiles.length) return;
  const gdrive = require('../orchestrator/lib/gdrive');
  for (const f of driveFiles) {
    try {
      const meta = await gdrive.getFile(f.fileId);
      expect(f.flow, 'Drive copy exists with the recorded md5', meta.md5Checksum === f.md5, `${meta.name} ${meta.size} bytes`);
      if (KEEP_DRIVE) { record(f.flow, 'Drive cleanup', 'skip', '--keep-drive'); continue; }
      const t = await gdrive.trashFile(f.fileId);
      expect(f.flow, 'Drive test file trashed', t.trashed, t.name);
    } catch (e) {
      record(f.flow, 'Drive check/cleanup', false, e.message);
    }
  }
}

(async () => {
  if (!TOKEN) { console.error('CONTENT_API_TOKEN is not set (.env or env).'); process.exit(2); }
  console.log(`LMS end-to-end against ${BASE}  series=${SERIES}  ${YES ? `SPENDING up to $${CAP.toFixed(2)} per video` : 'quote only'}`);
  const h = await health('health');
  if (h && h.jobs && h.jobs.inFlight && h.jobs.inFlight.any) console.log('  note: other jobs are in flight');

  let c = null; let s = null;
  try {
    // Scripts are free, so both are written together; the paid halves then run one
    // at a time, which is what keeps one container from rendering two videos at once.
    if (ONLY === 'both' || ONLY === 'course') c = await courseFlow();
    if (ONLY === 'both' || ONLY === 'single') s = await singleFlow();
  } finally {
    console.log('\nCleanup');
    await courseCleanup(c).catch((e) => record('course', 'cleanup', false, e.message));
    await singleCleanup(s).catch((e) => record('single', 'cleanup', false, e.message));
    await driveCleanup();
    const after = await http('GET', '/health', { auth: false });
    const st = after.data && after.data.storage;
    if (st) {
      expect('health', 'no video held on the volume afterwards', st.deliverables.videosHeldLocally === 0, `videosHeldLocally ${st.deliverables.videosHeldLocally}`);
      console.log(`    memory rss ${Math.round(st.memory.rssBytes / 1e6)} MB`);
    }
  }

  const failed = results.filter((r) => r.ok === false);
  console.log(`\n${results.filter((r) => r.ok === true).length} passed, ${failed.length} failed, ${results.filter((r) => r.ok === 'skip').length} skipped`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
