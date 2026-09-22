#!/usr/bin/env node
'use strict';
/**
 * calibrate-judges.js — measure whether a judge agrees with a human, and with itself.
 *
 *   node scripts/calibrate-judges.js                 # all fixtures, 5 runs each
 *   node scripts/calibrate-judges.js --runs 10       # more runs = tighter flip rate
 *   node scripts/calibrate-judges.js --fixture lms-question-mark
 *   node scripts/calibrate-judges.js --no-cache      # measure the RAW judge
 *
 * WHY THIS EXISTS
 * Every change to a judge in this repo has been an opinion. On 2026-09-19 eval-text.js
 * passed a line before the spend and failed the same line after the render -- same
 * text, same model, temperature 0 -- and destroyed a finished lesson. Nobody could
 * have said beforehand how often that happens, because nobody had ever asked the same
 * question twice and counted.
 *
 * Two numbers, and they are different questions:
 *
 *   FLIP RATE      — run the judge N times on identical input. How often does it
 *                    disagree with itself? This is self-consistency, and temperature 0
 *                    does not make it zero (arXiv 2606.26185). Finer-grained rubrics
 *                    make it worse (arXiv 2510.27106).
 *   AGREEMENT      — does its verdict match the human label on the fixture? A perfectly
 *                    consistent judge that is consistently wrong is worse than a noisy
 *                    one, because it is trusted.
 *
 * A change is an improvement when the flip rate falls AND agreement does not. Either
 * alone can be bought cheaply and means nothing: a judge that always passes has a flip
 * rate of zero.
 *
 * COSTS MONEY. Every run is a real judge call. `--runs 5` over 3 fixtures is 15 calls.
 * Refuses to start without --yes, like every other paid script here.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');

// The judge runs in a scratch copy under the OS temp dir, and templates/lib/config.js
// finds its key by walking UP from cwd looking for a .env -- which from /tmp never
// reaches this repo. Load it here and hand it down explicitly.
try { require(path.join(REPO, 'orchestrator', 'lib', 'env')).loadDotenv(); } catch { /* CI may have it in the environment already */ }
const TEMPLATES = path.join(REPO, '.claude', 'skills', 'creating-explainer-videos', 'templates');
const FIXTURES = path.join(REPO, 'gates', 'judge-fixtures');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const RUNS = Math.max(1, Number(flag('runs', 5)) || 5);
const ONLY = flag('fixture', null);
const NO_CACHE = argv.includes('--no-cache');
const APPROVED = argv.includes('--yes') || process.env.CONFIRM_SPEND === '1';

function loadFixtures() {
  if (!fs.existsSync(FIXTURES)) {
    console.error(`No fixtures at ${FIXTURES}. Each fixture is a folder with beats.js and label.json.`);
    process.exit(2);
  }
  return fs.readdirSync(FIXTURES, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => !ONLY || e.name === ONLY)
    .map((e) => {
      const dir = path.join(FIXTURES, e.name);
      const label = JSON.parse(fs.readFileSync(path.join(dir, 'label.json'), 'utf8'));
      return { name: e.name, dir, label };
    });
}

/**
 * One judge call, in a scratch copy so the fixture is never written to.
 * Returns 'pass' | 'fail' | 'unavailable' -- the same three outcomes produce sees.
 */
function runJudge(fixture) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-calib-'));
  try {
    fs.copyFileSync(path.join(fixture.dir, 'beats.js'), path.join(work, 'beats.js'));
    fs.cpSync(path.join(TEMPLATES, 'lib'), path.join(work, 'lib'), { recursive: true });
    fs.copyFileSync(path.join(TEMPLATES, 'eval-text.js'), path.join(work, 'eval-text.js'));

    let code = 0;
    let out = '';
    try {
      out = execFileSync(process.execPath, ['eval-text.js'], {
        cwd: work, encoding: 'utf8', timeout: 5 * 60 * 1000,
        env: {
          ...process.env,
          // Both spellings, because config.js accepts either and the repo stores it
          // under the second one.
          GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_STUDIO_API_KEY || '',
          ...(NO_CACHE ? { JUDGE_CACHE_OFF: '1' } : {}),
        },
      });
    } catch (e) {
      code = typeof e.status === 'number' ? e.status : 3;
      out = `${e.stdout || ''}${e.stderr || ''}`;
    }
    // 0 pass, 1 findings, 3 infrastructure. An outage is not a verdict and must not
    // be counted as one -- averaging it in would quietly move both numbers.
    const verdict = code === 0 ? 'pass' : (code === 1 ? 'fail' : 'unavailable');
    const demoted = /finding\(s\) demoted/.test(out);
    return { verdict, demoted };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

(async () => {
  const fixtures = loadFixtures();
  if (!fixtures.length) { console.error('No fixtures matched.'); process.exit(2); }

  const calls = fixtures.length * RUNS;
  if (!APPROVED) {
    console.log(`Would make ${calls} real judge call(s): ${fixtures.length} fixture(s) x ${RUNS} run(s).`);
    console.log('Re-run with --yes (or CONFIRM_SPEND=1) to actually spend.');
    process.exit(2);
  }

  const rows = [];
  for (const f of fixtures) {
    const verdicts = [];
    for (let i = 0; i < RUNS; i++) verdicts.push(runJudge(f));
    const real = verdicts.filter((v) => v.verdict !== 'unavailable');
    const counts = real.reduce((a, v) => ({ ...a, [v.verdict]: (a[v.verdict] || 0) + 1 }), {});
    const majority = (counts.fail || 0) > (counts.pass || 0) ? 'fail' : 'pass';
    // Flip rate: the share of runs that disagreed with the majority of runs. Zero
    // means the judge said the same thing every time, whatever that thing was.
    const flips = real.filter((v) => v.verdict !== majority).length;
    rows.push({
      fixture: f.name,
      expected: f.label.expect,
      runs: real.length,
      unavailable: verdicts.length - real.length,
      pass: counts.pass || 0,
      fail: counts.fail || 0,
      flipRate: real.length ? Number((flips / real.length).toFixed(2)) : null,
      agrees: real.length ? majority === f.label.expect : null,
      demotions: verdicts.filter((v) => v.demoted).length,
      why: f.label.why,
    });
  }

  console.log('');
  console.log('fixture                     expected  pass/fail  flip  agrees  note');
  console.log('-'.repeat(96));
  for (const r of rows) {
    console.log(
      `${r.fixture.padEnd(27)} ${String(r.expected).padEnd(9)} ${`${r.pass}/${r.fail}`.padEnd(10)} `
      + `${String(r.flipRate).padEnd(5)} ${(r.agrees ? 'yes' : 'NO').padEnd(7)} ${r.why}`
    );
  }

  const measurable = rows.filter((r) => r.flipRate !== null);
  const meanFlip = measurable.length
    ? Number((measurable.reduce((a, r) => a + r.flipRate, 0) / measurable.length).toFixed(3)) : null;
  const agreed = measurable.filter((r) => r.agrees).length;
  console.log('');
  console.log(`mean flip rate: ${meanFlip}   agreement: ${agreed}/${measurable.length}`);
  console.log('A change is an improvement when flip falls AND agreement does not.');
  console.log('A judge that always passes has a flip rate of 0 and is useless.');

  const outFile = path.join(REPO, '.beads', 'judge_calibration.jsonl');
  fs.appendFileSync(outFile, `${JSON.stringify({
    type: 'judge_calibration', at: new Date().toISOString(),
    sensor: 'eval-text', runs: RUNS, cacheDisabled: NO_CACHE,
    meanFlipRate: meanFlip, agreement: `${agreed}/${measurable.length}`, rows,
  })}\n`);
  console.log(`\nappended to ${path.relative(REPO, outFile)}`);

  // Non-zero when the judge disagrees with a human label, so CI can fail on it.
  if (agreed < measurable.length) process.exitCode = 1;
})().catch((e) => { console.error('[calibrate] ' + e.message); process.exitCode = 3; });
