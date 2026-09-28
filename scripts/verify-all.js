#!/usr/bin/env node
'use strict';
/**
 * Is everything still working? One command, three tiers.
 *
 *   npm run verify                      Tier 1 -- offline, no media spend
 *   npm run verify -- --live            Tier 1 + Tier 2 -- every credential probed, nothing generated
 *   npm run verify -- --paid            Tier 3 quote only: prints the estimate, refuses to spend
 *   npm run verify -- --paid --yes      Tier 3 for real: one tiny video through the real produce stage
 *   npm run verify -- --all --yes       all three
 *
 * Tier 1 runs the suites that already exist (lint, npm test -- which includes
 * test-layout.js -- pytest, the skill evals) plus the DOM gates on a fixture
 * copied to a temp dir. `npm test` makes two small `claude -p` calls under the
 * subscription: plan usage, not dollars (paid-run-protocol §2).
 *
 * Tier 2 asks each provider "is this key good?" through an endpoint that
 * generates nothing, and reads production /health. A key that is absent is a
 * SKIP; a key that is present and rejected is a FAIL. No key is ever printed.
 *
 * Tier 3 does not hand-roll API calls. It runs the REAL produce stage -- the
 * same code the service runs -- on a four-beat video in a temp dir: one image,
 * three TTS clips, compile, bumpers, verify. It prints produce's own estimate
 * line and refuses unless --yes (paid-run-protocol §1 and §3), under a hard
 * ceiling. No i2v (per-second). No ElevenLabs (CLAUDE.md: never without
 * permission). kie.ai is probed in Tier 2 but not bought: the repo prices only
 * per-second kie video, and its cheapest call is over the ceiling.
 *
 * Nothing is written inside the repo: every store, render dir and run log is
 * redirected to os.tmpdir().
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'orchestrator', 'lib', 'env')).loadDotenv();

const args = new Set(process.argv.slice(2));
const ALL = args.has('--all');
const LIVE = ALL || args.has('--live');
const PAID = ALL || args.has('--paid');
const YES = args.has('--yes') || process.env.CONFIRM_SPEND === '1';
const TIER1 = ALL || !PAID || LIVE;
const CEILING_USD = 0.10;

// ── output ────────────────────────────────────────────────────────────────────

const results = [];
function record(tier, name, status, detail) {
  results.push({ tier, name, status, detail });
  const tag = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP' }[status];
  console.log(`  ${tag}  ${name}${detail ? `  (${detail})` : ''}`);
}

function run(cmd, argv, { cwd = ROOT, env = {}, timeoutMs = 20 * 60 * 1000, echo = false } = {}) {
  return new Promise((resolve) => {
    let out = '';
    let done = false;
    const child = spawn(cmd, argv, {
      cwd, env: { ...process.env, ...env }, windowsHide: true,
      shell: process.platform === 'win32' && /^(npm|npx|claude)$/.test(cmd), // .cmd shims on Windows
    });
    const onData = (d) => { out += d; if (echo) process.stdout.write(d); };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const t = setTimeout(() => { if (!done) { done = true; child.kill(); resolve({ code: null, out: `${out}\n(timed out)` }); } }, timeoutMs);
    child.on('error', (e) => { if (!done) { done = true; clearTimeout(t); resolve({ code: null, out: e.message }); } });
    child.on('close', (code) => { if (!done) { done = true; clearTimeout(t); resolve({ code, out }); } });
  });
}

const tail = (s, n = 3) => String(s).trim().split(/\r?\n/).filter(Boolean).slice(-n).join(' | ').slice(0, 300);
const mkTmp = (tag) => fs.mkdtempSync(path.join(os.tmpdir(), `cq-verify-${tag}-`));

async function pythonCmd() {
  for (const c of [process.env.PYTHON, 'py', 'python', 'python3'].filter(Boolean)) {
    const r = await run(c, ['-c', 'import sys; print(sys.version_info[0])'], { timeoutMs: 20000 });
    if (r.code === 0 && r.out.trim().endsWith('3')) return c;
  }
  return null;
}

async function browserOk() {
  const pf = require(path.join(ROOT, 'orchestrator', 'lib', 'preflight'));
  const r = await pf.check({ videoDir: mkTmp('pf') });
  const b = r.results.find((x) => x.name === 'browser');
  return { ok: Boolean(b && b.ok === true), why: b ? (b.why || b.detail || '') : 'no browser check' };
}

// ── Tier 1 ────────────────────────────────────────────────────────────────────

async function tier1() {
  console.log('\nTier 1 — offline, no media spend');

  let r = await run('npm', ['run', 'lint']);
  record(1, 'lint (npm run lint)', r.code === 0 ? 'pass' : 'fail', r.code === 0 ? '' : tail(r.out));

  r = await run('npm', ['test']);
  const summaries = [...r.out.matchAll(/(\d+) passed, (\d+) failed(?:, (\d+) skipped)?/g)];
  const failed = summaries.reduce((n, m) => n + Number(m[2]), 0);
  const passed = summaries.reduce((n, m) => n + Number(m[1]), 0);
  // The suites are chained with &&, so a failure also hides every suite after it: name both.
  const failedNames = [...r.out.matchAll(/^\s+FAIL\s+(.+)$/gm)].map((m) => m[1].trim());
  const hidden = 5 - summaries.length;
  record(1, 'npm test (regressions, store, server, predeploy, layout)',
    r.code === 0 && failed === 0 ? 'pass' : 'fail',
    `${passed} passed, ${failed} failed across ${summaries.length} of 5 suites`
    + (failedNames.length ? ` -- failed: ${failedNames.slice(0, 5).join('; ')}` : '')
    + (hidden > 0 && r.code !== 0 ? ` -- ${hidden} later suite(s) never ran (&& chain)` : ''));

  const py = await pythonCmd();
  if (!py) record(1, 'pytest tests/', 'skip', 'no Python 3 on PATH');
  else {
    r = await run(py, ['-m', 'pytest', 'tests/', '-q', '-p', 'no:cacheprovider'], { env: { PYTHONIOENCODING: 'utf-8' } });
    record(1, 'pytest tests/', r.code === 0 ? 'pass' : 'fail', tail(r.out, 1));
  }

  r = await run(process.execPath, ['evals/skills/run.js']);
  record(1, 'skill evals (evals/skills/run.js)', r.code === 0 ? 'pass' : 'fail', tail(r.out, 1));

  // The render gates, on a fixture copied OUT of the repo: make-fixture-assets
  // writes into whatever folder it is given.
  const browser = await browserOk();
  const gates = ['qa-frames.js', 'qa-info.js', 'qa-cutouts.js', 'qa-checkpoint.js'];
  if (!browser.ok) {
    for (const g of gates) record(1, `render gate ${g} on a fixture`, 'skip',
      `no launchable browser: ${browser.why.split('\n')[0].slice(0, 90)} -- fix: npx puppeteer browsers install chrome`);
    return;
  }
  const fx = path.join(ROOT, 'explainer-videos', 'notion-slack', 'ns-01-why-a-chat-window');
  const work = path.join(mkTmp('fixture'), 'ns-01');
  fs.cpSync(fx, work, { recursive: true, filter: (s) => !/[\\/](node_modules|frames|out|audio|clips)([\\/]|$)/.test(s) });
  r = await run(process.execPath, [path.join(ROOT, 'scripts', 'make-fixture-assets.js'), work, '--force']);
  if (r.code !== 0) { record(1, 'fixture assets', 'fail', tail(r.out)); return; }
  const templates = path.join(ROOT, '.claude', 'skills', 'creating-explainer-videos', 'templates');
  for (const g of gates) {
    fs.copyFileSync(path.join(templates, g), path.join(work, '__gate.js'));
    const res = await run(process.execPath, ['__gate.js'], { cwd: work, env: { NODE_PATH: path.join(ROOT, 'node_modules') }, timeoutMs: 10 * 60 * 1000 });
    if (res.code === 0 && /⏭/.test(res.out)) record(1, `render gate ${g} on a fixture`, 'skip', tail(res.out, 1));
    else record(1, `render gate ${g} on a fixture`, res.code === 0 ? 'pass' : 'fail', tail(res.out, 1));
  }
}

// ── Tier 2 ────────────────────────────────────────────────────────────────────

async function probe(url, init = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 20000);
  try {
    const res = await fetch(url, { ...init, signal: ac.signal });
    let body = null;
    try { body = await res.json(); } catch { /* not json */ }
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, error: e.name === 'AbortError' ? 'timed out' : e.message };
  } finally {
    clearTimeout(t);
  }
}

async function tier2() {
  console.log('\nTier 2 — credentials and production, nothing generated ($0)');
  const env = process.env;

  // Anthropic
  if (env.ANTHROPIC_API_KEY) {
    const r = await probe('https://api.anthropic.com/v1/models?limit=1', {
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    });
    record(2, 'Anthropic API key (list models)', r.status === 200 ? 'pass' : 'fail', `HTTP ${r.status || r.error}`);
  } else {
    record(2, 'Anthropic API key', 'skip', 'ANTHROPIC_API_KEY not set');
  }
  const cli = await run('claude', ['--version'], { timeoutMs: 30000 });
  record(2, 'Claude CLI present (the service\'s default LLM backend)', cli.code === 0 ? 'pass' : 'fail', tail(cli.out, 1));

  // Gemini (Imagen + TTS)
  const gkey = env.GEMINI_API_KEY || env.GOOGLE_STUDIO_API_KEY;
  if (gkey) {
    const r = await probe('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': gkey } });
    record(2, 'Gemini key (list models)', r.status === 200 ? 'pass' : 'fail', `HTTP ${r.status || r.error}`);
  } else record(2, 'Gemini key', 'skip', 'GEMINI_API_KEY / GOOGLE_STUDIO_API_KEY not set');

  // kie.ai: read a task that cannot exist. A bad key is 401; a good one gets "not found".
  const kkey = env.GEMINI_OMNI_API_KEY || env.KIE_API_KEY;
  if (kkey) {
    const r = await probe('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=verify-all-probe-does-not-exist', { headers: { authorization: `Bearer ${kkey}` } });
    const code = r.body && (r.body.code || r.body.status);
    const rejected = r.status === 401 || r.status === 403 || code === 401 || code === 403;
    record(2, 'kie.ai key (read a nonexistent task)', r.status === 0 ? 'fail' : (rejected ? 'fail' : 'pass'),
      `HTTP ${r.status || r.error}${code ? `, code ${code}` : ''}${rejected ? ' -- key rejected' : ''}`);
  } else record(2, 'kie.ai key', 'skip', 'GEMINI_OMNI_API_KEY / KIE_API_KEY not set');

  // YouTube and Drive have their own --check modes: mint a token, upload nothing.
  for (const [name, script, keys] of [
    ['YouTube (youtube-auth.js --check)', 'orchestrator/youtube-auth.js', ['YOUTUBE_REFRESH_TOKEN']],
    ['Google Drive (gdrive-auth.js --check)', 'orchestrator/gdrive-auth.js', ['GDRIVE_REFRESH_TOKEN', 'GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_JSON', 'GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_PATH', 'GDRIVE_SERVICE_ACCOUNT_KEY_JSON', 'GDRIVE_SERVICE_ACCOUNT_KEY_PATH']],
  ]) {
    if (!keys.some((k) => env[k])) { record(2, name, 'skip', `none of ${keys[0]}... set`); continue; }
    const r = await run(process.execPath, [script, '--check'], { timeoutMs: 60000 });
    record(2, name, r.code === 0 ? 'pass' : 'fail', tail(r.out, 1));
  }

  if (env.SLACK_BOT_TOKEN) {
    const r = await probe('https://slack.com/api/auth.test', { method: 'POST', headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}` } });
    record(2, 'Slack bot token (auth.test)', r.body && r.body.ok ? 'pass' : 'fail', r.body ? (r.body.ok ? `team ${r.body.team}` : r.body.error) : `HTTP ${r.status || r.error}`);
  } else record(2, 'Slack bot token', 'skip', 'SLACK_BOT_TOKEN not set');

  if (env.NOTION_API_KEY) {
    const r = await probe('https://api.notion.com/v1/users/me', { headers: { authorization: `Bearer ${env.NOTION_API_KEY}`, 'notion-version': '2022-06-28' } });
    record(2, 'Notion key (users/me)', r.status === 200 ? 'pass' : 'fail', `HTTP ${r.status || r.error}`);
  } else record(2, 'Notion key', 'skip', 'NOTION_API_KEY not set');

  // Production, read-only.
  const base = env.VERIFY_BASE || 'https://content-queen-production.up.railway.app';
  const h = await probe(`${base}/health`);
  const hb = h.body || {};
  const why = hb.notOkBecause && hb.notOkBecause.length ? ` -- ${[].concat(hb.notOkBecause).join('; ').slice(0, 160)}` : '';
  record(2, `production /health (${base.replace(/^https?:\/\//, '')})`,
    h.status === 200 && hb.ok !== false ? 'pass' : 'fail',
    `HTTP ${h.status || h.error}${hb.build && hb.build.commit ? `, build ${String(hb.build.commit).slice(0, 7)}` : ''}${why}`);
  if (env.CONTENT_API_TOKEN) {
    const r = await run(process.execPath, ['scripts/verify-live.js', '--base', base], { timeoutMs: 120000 });
    record(2, 'production API contract (scripts/verify-live.js, read-only)', r.code === 0 ? 'pass' : 'fail', tail(r.out, 1));
  } else record(2, 'production API contract', 'skip', 'CONTENT_API_TOKEN not set');
}

// ── Tier 3 ────────────────────────────────────────────────────────────────────

/** One image, three spoken beats, the mandatory checkpoint. The smallest video the gates accept. */
const PAID_BEATS = [
  { id: '01', mode: 'scene', vo: 'Ali opens the weekly report and the totals do not add up.', cap: 'The totals are wrong',
    art: 'a teacher named Ali at a wooden desk reading a printed weekly report with a puzzled look, warm morning light, flat vector illustration, soft cream background, no text' },
  { id: '02', mode: 'info', vo: 'He checks each column against the source sheet, one row at a time.', cap: 'Check against the source',
    info: { tpl: 'statement', data: { text: 'Check each column against the source.', hi: 'source' } } },
  { id: '03', mode: 'checkpoint', quiz: { stem: 'What should Ali check first?', options: ['The font of the report', 'The source sheet the numbers came from'], answer: 1,
    correctNote: 'Right: the numbers come from the source.', explain: 'Formatting cannot change a total. The source data can.' } },
  { id: '04', mode: 'info', vo: 'The mismatch was one copied formula, and now he knows where to look.', cap: 'One copied formula',
    info: { tpl: 'statement', data: { text: 'One copied formula broke the total.', hi: 'copied formula' } } },
];

function produceScript() {
  return `
    const path = require('path');
    const ROOT = process.cwd(); const tmp = process.env.VERIFY_TMP;
    require(path.join(ROOT, 'orchestrator/lib/env')).loadDotenv();
    const { PATHS } = require(path.join(ROOT, 'orchestrator/lib/paths'));
    PATHS.beads = path.join(tmp, 'beads'); PATHS.runsDir = path.join(tmp, 'runs');
    for (const k of ['runsLog','failuresLog','improvementsLog','qaRatingsLog']) PATHS[k] = path.join(tmp, 'beads', k + '.jsonl');
    const spine = require(path.join(ROOT, 'orchestrator/lib/spine'));
    const state = require(path.join(ROOT, 'orchestrator/lib/state'));
    const beats = JSON.parse(process.env.VERIFY_BEATS);
    const item = { id: 'verify/tiny', series: 'verify', slug: 'tiny', topic: 'Verify: a tiny video' };
    spine.executeStages(item, {
      quiet: true, fromStage: 'produce', stopAfter: 'produce',
      budgetUsd: Number(process.env.VERIFY_BUDGET),
      seedArtifacts: { script: { title: 'Verify: a tiny video', beats, beatCount: beats.length, handWritten: true } },
      scriptApproved: true,
    }).then((st) => {
      const p = st.stages.produce || {};
      const a = (st.artifacts && st.artifacts.produce) || {};
      process.stdout.write('\\n@@' + JSON.stringify({ status: st.status, stage: p.status, error: p.error || null,
        finalPath: a.finalPath || null, media: state.mediaSpend(st) })); process.exit(0);
    }).catch((e) => { process.stdout.write('\\n@@' + JSON.stringify({ threw: e.message })); process.exit(0); });`;
}

async function tier3() {
  console.log(`\nTier 3 — one real, tiny video through the real produce stage (ceiling $${CEILING_USD.toFixed(2)})`);

  // The quote comes from produce's own estimator, so it is the number produce will check.
  const { _internals } = require(path.join(ROOT, 'orchestrator', 'lib', 'stages', 'produce'));
  const est = _internals.estimateSpend(PAID_BEATS, mkTmp('quote'));
  console.log(`  estimated spend: ${est.images} image(s) + ${est.clips} TTS clip(s)${est.animBeats ? ` + ${est.animSecs}s of motion` : ''}`
    + `  ->  $${est.totalUsd}`);
  console.log('  not in that figure: the Gemini judges produce runs (qa-art, eval-text) -- real money, fractions of a cent;'
    + ' and one Claude call -- plan usage, not dollars.');

  if (est.totalUsd > CEILING_USD) {
    record(3, 'real produce run', 'fail', `estimate $${est.totalUsd} is over the $${CEILING_USD} ceiling -- refusing`);
    return;
  }
  const browser = await browserOk();
  if (!browser.ok) {
    record(3, 'real produce run', 'skip', `this machine cannot render, so nothing was bought: ${browser.why.split('\n')[0].slice(0, 80)} -- fix: npx puppeteer browsers install chrome`);
    return;
  }
  if (!YES) {
    record(3, 'real produce run', 'skip', `not approved -- re-run with --paid --yes to spend ~$${est.totalUsd}`);
    return;
  }

  const tmp = mkTmp('paid');
  const vids = path.join(tmp, 'vids');
  console.log(`  producing in ${vids} (this takes several minutes: npm i, art, TTS, compile, bumpers)`);
  const r = await run(process.execPath, ['-e', produceScript()], {
    env: {
      VERIFY_TMP: tmp, VERIFY_BEATS: JSON.stringify(PAID_BEATS), VERIFY_BUDGET: String(CEILING_USD),
      EXPLAINER_VIDEOS_DIR: vids, JOB_STORE_DIR: path.join(tmp, 'store'), TICK_INTERVAL_MS: '0',
    },
    timeoutMs: 60 * 60 * 1000, echo: true,
  });
  const at = r.out.lastIndexOf('@@');
  const res = at === -1 ? { threw: tail(r.out) } : JSON.parse(r.out.slice(at + 2));
  if (res.threw) { record(3, 'real produce run', 'fail', res.threw.slice(0, 300)); return; }
  const media = typeof res.media === 'number' ? ` -- media spend $${res.media.toFixed(3)}` : '';
  const ok = res.stage === 'done' && res.finalPath && fs.existsSync(path.isAbsolute(res.finalPath) ? res.finalPath : path.join(vids, 'verify', 'tiny', res.finalPath));
  record(3, 'real produce run (art -> TTS -> compile -> bumpers -> verify)', ok ? 'pass' : 'fail',
    ok ? `deliverable at ${res.finalPath}${media}` : `${res.stage}: ${String(res.error || '').slice(0, 300)}`);

  const claude = await run('claude', ['-p', 'Say ok.', '--max-turns', '1', '--model', 'claude-haiku-4-5-20251001', '--output-format', 'json'], { timeoutMs: 120000 });
  record(3, 'one real Claude call (plan usage)', claude.code === 0 && /"result"/.test(claude.out) ? 'pass' : 'fail', tail(claude.out, 1));
  record(3, 'kie.ai generation', 'skip', 'the repo prices only per-second kie video; its cheapest call is over the ceiling (key checked in Tier 2)');
}

// ── run ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`verify-all: ${[TIER1 && 'tier 1', LIVE && 'tier 2', PAID && 'tier 3'].filter(Boolean).join(' + ')}`);
  if (TIER1) await tier1();
  if (LIVE) await tier2();
  if (PAID) await tier3();

  const n = (s) => results.filter((r) => r.status === s).length;
  console.log(`\n${'-'.repeat(64)}`);
  console.log(`  ${n('pass')} passed, ${n('fail')} failed, ${n('skip')} skipped`);
  for (const r of results.filter((x) => x.status === 'fail')) console.log(`    - [tier ${r.tier}] ${r.name}`);
  if (n('fail')) process.exitCode = 1;
  setTimeout(() => process.exit(process.exitCode || 0), 300).unref();
})();
