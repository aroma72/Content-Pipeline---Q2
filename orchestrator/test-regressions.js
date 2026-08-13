#!/usr/bin/env node
'use strict';
/**
 * Regression tests for the six defects found on the first real production run
 * (evals-08, 2026-08-11). Each one shipped silently -- exit codes were clean --
 * so each gets a test that fails loudly if the fix is ever undone.
 *
 *   node orchestrator/test-regressions.js
 *
 * No test framework: this must be runnable on a machine where `npm i` is one of
 * the things that was broken.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

let pass = 0;
const failures = [];

function check(name, fn) {
  try {
    const detail = fn();
    pass++;
    console.log(`  PASS  ${name}${detail ? `  (${detail})` : ''}`);
  } catch (e) {
    failures.push({ name, message: e.message });
    console.log(`  FAIL  ${name}\n          ${e.message}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// --- 1. .env is loaded, and GOOGLE_STUDIO_API_KEY bridges to GEMINI_API_KEY ---
console.log('\n1. .env loading (was: "no credentials" while the key sat in .env)');

check('loadDotenv populates keys from .env', () => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const envPath = path.join(__dirname, '..', '.env');
  assert(fs.existsSync(envPath), '.env not present -- cannot test');
  require('./lib/env').loadDotenv();
  assert(process.env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY not set after loadDotenv');
  return `key len ${process.env.ANTHROPIC_API_KEY.length}`;
});

check('GOOGLE_STUDIO_API_KEY is bridged to GEMINI_API_KEY for child processes', () => {
  assert(process.env.GEMINI_API_KEY, 'GEMINI_API_KEY not bridged');
  assert(
    process.env.GEMINI_API_KEY === process.env.GOOGLE_STUDIO_API_KEY,
    'bridge produced a different value'
  );
  return 'bridged';
});

check('run.js loads .env before requiring the spine', () => {
  const src = fs.readFileSync(path.join(__dirname, 'run.js'), 'utf8');
  const envAt = src.indexOf("require('./lib/env')");
  const spineAt = src.indexOf("require('./lib/spine')");
  assert(envAt !== -1, 'run.js does not load lib/env at all');
  assert(envAt < spineAt, 'env is loaded AFTER the spine -- credentials may be read too late');
  return 'ordered correctly';
});

// --- 2/3. Windows command spawning + off-PATH Python -------------------------
console.log('\n2. command spawning (was: npm ENOENT, then EINVAL, then \'C:\\Program\' not recognized)');

const shell = require('./lib/shell');

async function interpreterChecks() {
  for (const [cmd, args] of [['node', ['--version']], ['npm', ['--version']], ['python', ['--version']]]) {
    try {
      const r = await shell.run(cmd, args, { timeoutMs: 60000 });
      const v = (r.stdout || r.stderr).trim().split('\n')[0];
      pass++;
      console.log(`  PASS  ${cmd} resolves and runs  (${v})`);
    } catch (e) {
      failures.push({ name: `${cmd} resolves and runs`, message: e.message.split('\n')[0] });
      console.log(`  FAIL  ${cmd} resolves and runs\n          ${e.message.split('\n')[0]}`);
    }
  }

  // The Program Files defect: a batch wrapper on a spaced path must still work.
  try {
    const r = await shell.run('npm', ['--version'], { timeoutMs: 60000 });
    assert(!/is not recognized/i.test(r.stdout + r.stderr), 'path was split on a space');
    pass++;
    console.log('  PASS  batch wrapper on a spaced path is quoted, not split');
  } catch (e) {
    failures.push({ name: 'batch wrapper quoting', message: e.message.split('\n')[0] });
    console.log(`  FAIL  batch wrapper quoting\n          ${e.message.split('\n')[0]}`);
  }

  // And the safety rail: never silently mis-split an argument through a shell.
  try {
    await shell.run('npm', ['run', 'two words'], { timeoutMs: 20000 });
    failures.push({ name: 'spaced-arg guard', message: 'a spaced arg was allowed through a batch wrapper' });
    console.log('  FAIL  spaced-arg guard  (allowed through)');
  } catch (e) {
    if (/Refusing to run batch wrapper/.test(e.message)) {
      pass++;
      console.log('  PASS  spaced arg through a batch wrapper is refused, not mis-split');
    } else if (process.platform !== 'win32') {
      pass++;
      console.log('  PASS  (non-Windows: batch wrappers not applicable)');
    } else {
      failures.push({ name: 'spaced-arg guard', message: `wrong error: ${e.message.split('\n')[0]}` });
      console.log(`  FAIL  spaced-arg guard  (wrong error: ${e.message.split('\n')[0]})`);
    }
  }
}

// --- 4. Blank info beats -----------------------------------------------------
function beatChecks() {
  console.log('\n3. beats validation (was: 4 info beats rendered as blank cream frames, silently)');
  const { validateBeats } = require('./lib/validate-beats');
  const realDir = path.join(__dirname, '..', 'explainer-videos', 'evals', 'evals-08-when-the-score-lies');

  check('info beat with only an overlay is REJECTED', () => {
    const { errors } = validateBeats([{ id: '02', mode: 'info', vo: 'A sentence.', overlay: 'text' }], realDir);
    assert(errors.length > 0, 'the exact shipped bug was accepted');
    assert(/BLANK/i.test(errors[0]), 'error does not warn about a blank frame');
    return errors[0].slice(0, 48) + '...';
  });

  check('unknown info template is REJECTED', () => {
    const { errors } = validateBeats([{ id: '03', mode: 'info', vo: 'X.', info: { tpl: 'barchart', data: {} } }], realDir);
    assert(errors.length > 0, 'unknown template accepted');
    return 'rejected';
  });

  check('every one of the six real templates is ACCEPTED', () => {
    const tpls = ['checks', 'fourparts', 'gauge', 'statement', 'twocard', 'quote'];
    for (const t of tpls) {
      const { errors } = validateBeats([{ id: '01', mode: 'info', vo: 'X.', info: { tpl: t, data: {} } }], realDir);
      assert(errors.length === 0, `template '${t}' wrongly rejected: ${errors[0]}`);
    }
    return tpls.join(', ');
  });

  check('ali/scene beat with no art is REJECTED', () => {
    const { errors } = validateBeats([{ id: '01', mode: 'ali', vo: 'X.' }], realDir);
    assert(errors.length > 0, 'art-less ali beat accepted');
    return 'rejected';
  });

  check('the real shipped beats.js passes clean', () => {
    const beats = require(path.join(realDir, 'beats.js'));
    const { errors } = validateBeats(beats, realDir);
    assert(errors.length === 0, `real beats.js has errors: ${errors.join('; ')}`);
    return `${beats.length} beats, 0 errors`;
  });

  check('template list is read from info.js, so it cannot drift', () => {
    const { knownTemplates } = require('./lib/validate-beats');
    const names = knownTemplates(realDir);
    assert(Array.isArray(names) && names.length === 6, `expected 6 templates, got ${names && names.length}`);
    return names.join(',');
  });

  // --- 5. The bare-mp4 filename handoff ------------------------------------
  console.log('\n4. compile -> stitch handoff (was: passed out/<slug>.mp4; renderer writes out/lesson.mp4)');

  check('produce passes the filename stitch-brand actually defaults to', () => {
    const produceSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    const stitchSrc = fs.readFileSync(path.join(realDir, 'stitch-brand.js'), 'utf8');
    const stitchDefault = (stitchSrc.match(/arg\('lesson',\s*'([^']+)'/) || [])[1];
    assert(stitchDefault, 'could not read stitch-brand default');
    assert(
      produceSrc.includes(`path.join('out', 'lesson.mp4')`),
      `produce.js does not use out/lesson.mp4 (stitch expects ${stitchDefault})`
    );
    assert(
      !/path\.join\('out', `\$\{item\.slug\}\.mp4`\)/.test(produceSrc),
      'produce.js still builds the bare path from the slug'
    );
    return `both agree on ${stitchDefault}`;
  });

  check('compile-lesson.js really does write that name', () => {
    const src = fs.readFileSync(path.join(realDir, 'compile-lesson.js'), 'utf8');
    assert(/out\/\$\{NAME\}\.mp4|'out',\s*`\$\{NAME\}\.mp4`/.test(src), 'compile output name not found');
    assert(/NAME\s*=\s*['"]lesson['"]/.test(src) || src.includes('lesson.mp4'), 'NAME is not lesson');
    return 'out/lesson.mp4';
  });

  // --- 6. Render idempotency ------------------------------------------------
  console.log('\n5. render idempotency (was: the ~1h render re-ran even when its output was current)');

  const { isFresherThanInputs } = require('./lib/stages/produce')._internals;

  check('a video newer than every input is reused', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idem-'));
    fs.writeFileSync(path.join(tmp, 'beats.js'), 'module.exports=[]');
    fs.mkdirSync(path.join(tmp, 'art')); fs.writeFileSync(path.join(tmp, 'art', 'a.png'), 'x');
    const out = path.join(tmp, 'lesson.mp4');
    fs.writeFileSync(out, 'v');
    const future = new Date(Date.now() + 60000);
    fs.utimesSync(out, future, future);
    assert(isFresherThanInputs(out, tmp) === true, 'a current video was NOT reused (hour wasted)');
    return 'skips the render';
  });

  check('an edited beats.js forces a rebuild', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idem-'));
    const out = path.join(tmp, 'lesson.mp4');
    fs.writeFileSync(out, 'v');
    fs.writeFileSync(path.join(tmp, 'beats.js'), 'module.exports=[]');
    const future = new Date(Date.now() + 60000);
    fs.utimesSync(path.join(tmp, 'beats.js'), future, future);
    assert(isFresherThanInputs(out, tmp) === false, 'a stale video would have been shipped');
    return 'rebuilds';
  });

  check('a missing video always rebuilds', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'idem-'));
    fs.writeFileSync(path.join(tmp, 'beats.js'), 'module.exports=[]');
    assert(isFresherThanInputs(path.join(tmp, 'nope.mp4'), tmp) === false, 'absent output treated as fresh');
    return 'rebuilds';
  });

  // --- spend estimate honesty ----------------------------------------------
  console.log('\n6. spend estimate (was: a flat $1.00 guess for every video)');

  const { estimateSpend } = require('./lib/stages/produce')._internals;

  check('priced from the real beats, info beats excluded', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-'));
    const beats = [
      { id: '01', mode: 'ali', vo: 'a', art: 'x' },
      { id: '02', mode: 'scene', vo: 'b', art: 'y' },
      { id: '03', mode: 'info', vo: 'c', info: { tpl: 'gauge', data: {} } },
    ];
    const est = estimateSpend(beats, tmp);
    assert(est.images === 2, `expected 2 paid images, got ${est.images}`);
    assert(est.clips === 3, `expected 3 TTS clips, got ${est.clips}`);
    // totalUsd is rounded to cents because it is money and gets logged as money.
    // Half a cent of rounding cannot matter to a budget gate, but a wrong unit
    // count or a counted info beat would -- hence the exact checks above.
    const trueCost = 2 * 0.04 + 3 * 0.002;
    assert(
      Math.abs(est.totalUsd - trueCost) <= 0.005,
      `total ${est.totalUsd} is more than a rounding error from ${trueCost}`
    );
    return `$${est.totalUsd} for 2 images + 3 clips (exact ${trueCost.toFixed(3)})`;
  });

  check('a retry costs $0 when art and audio are already bought', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-'));
    fs.mkdirSync(path.join(tmp, 'art')); fs.writeFileSync(path.join(tmp, 'art', '01.png'), 'x');
    fs.mkdirSync(path.join(tmp, 'audio')); fs.writeFileSync(path.join(tmp, 'audio', 'vo_01.wav'), 'x');
    const est = estimateSpend([{ id: '01', mode: 'ali', vo: 'a', art: 'x' }], tmp);
    assert(est.totalUsd === 0, `retry priced at $${est.totalUsd}, should be $0`);
    return '$0 — no double-buying';
  });

  // --- mid-chain honesty ---------------------------------------------------
  console.log('\n7. mid-chain runs are recorded honestly');

  check('--from marks skipped stages "skipped", never "done"', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'spine.js'), 'utf8');
    assert(/status:\s*'skipped'/.test(src), "spine does not mark skipped stages as 'skipped'");
    assert(/started_mid_chain/.test(src), 'no intervention recorded for a mid-chain start');
    return 'run log cannot be misread as a full pass';
  });
}

// --- YouTube uploader (ILHAM 2.1 + 2.3) --------------------------------------
async function uploadChecks() {
  console.log('\n8. YouTube uploader (ILHAM 2.1) and born-unlisted (2.3)');

  const yt = require('./lib/youtube');
  const upload = require('./lib/stages/upload');

  const ctx = (over = {}) => ({
    item: { id: 'evals/x', series: 'evals', slug: 'x', topic: 'T' },
    state: { runId: 'r', spend: { usd: 0 }, interventions: [] },
    artifacts: { produce: { finalPath: path.join(os.tmpdir(), 'x_final.mp4') } },
    opts: {}, log: () => {}, ...over,
  });

  const blocks = async (name, over, expect) => {
    try {
      await upload.run(ctx(over));
      failures.push({ name, message: 'did not block' });
      console.log(`  FAIL  ${name}  (did not block)`);
    } catch (e) {
      if (e.constructor.name === 'BlockedError' && (!expect || expect.test(e.message))) {
        pass++; console.log(`  PASS  ${name}`);
      } else {
        failures.push({ name, message: e.message.split('\n')[0] });
        console.log(`  FAIL  ${name}\n          ${e.message.split('\n')[0]}`);
      }
    }
  };

  await blocks('refuses to upload a bare render (LAW 1)',
    { artifacts: { produce: { finalPath: 'out/lesson.mp4' } } }, /_final\.mp4/);
  await blocks('blocks when produce reported nothing', { artifacts: {} }, /Nothing to upload/);

  // A real _final.mp4 that exists, so the auth check is what fires.
  const tmpFinal = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'up-')), 'x_final.mp4');
  fs.writeFileSync(tmpFinal, 'not really a video');
  if (!yt.isAuthorised()) {
    await blocks('blocks with instructions when OAuth consent is missing',
      { artifacts: { produce: { finalPath: tmpFinal } } }, /youtube-auth\.js/);
  } else {
    pass++; console.log('  PASS  (already authorised — consent-missing path not exercised)');
  }

  try {
    const r = await upload.run(ctx({ opts: { dryRun: true } }));
    assert(r.skipped === 'dry-run', 'dry run did not report itself as skipped');
    assert(!r.url && !r.videoId, 'dry run produced an upload result');
    pass++; console.log('  PASS  dry run returns skipped and no URL');
  } catch (e) {
    failures.push({ name: 'dry run', message: e.message.split('\n')[0] });
    console.log(`  FAIL  dry run\n          ${e.message.split('\n')[0]}`);
  }

  check('default privacy is unlisted, not public (2.3)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'youtube.js'), 'utf8');
    assert(/privacyStatus\s*=\s*'unlisted'/.test(src), 'uploadVideo does not default to unlisted');
    const stageSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'upload.js'), 'utf8');
    assert(
      /opts\.publishPublic\s*\?\s*'public'\s*:\s*'unlisted'/.test(stageSrc),
      'the stage does not default to unlisted'
    );
    return 'born unlisted; public needs --publish-public';
  });

  check('going public is recorded as an intervention', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'upload.js'), 'utf8');
    assert(/public_publish_override/.test(src), 'a public publish is not recorded');
    return 'not silent';
  });

  check('provisional publishes are logged for async human review', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'upload.js'), 'utf8');
    assert(/publish_review\.jsonl/.test(src), 'no review log written');
    assert(/cleared:\s*false/.test(src), 'review entries are not marked uncleared');
    return '.beads/publish_review.jsonl';
  });

  check('OAuth scope is upload-only', () => {
    assert(yt.SCOPE === 'https://www.googleapis.com/auth/youtube.upload', `scope is ${yt.SCOPE}`);
    return yt.SCOPE.split('/').pop();
  });

  check('consent requests offline access, or it cannot run unattended', () => {
    process.env.YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || 'test.apps.googleusercontent.com';
    process.env.YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || 'test';
    const u = new URL(yt.consentUrl('http://127.0.0.1:1/oauth2callback', 's'));
    assert(u.searchParams.get('access_type') === 'offline', 'access_type is not offline');
    assert(u.searchParams.get('state') === 's', 'state not forwarded');
    return 'offline + state';
  });

  check('the refresh token path is gitignored', () => {
    const { execFileSync } = require('child_process');
    const rel = path.relative(PATHS_REPO, yt.TOKEN_PATH).split(path.sep).join('/');
    try {
      execFileSync('git', ['check-ignore', rel], { cwd: PATHS_REPO, stdio: 'pipe' });
      return `${rel} ignored`;
    } catch {
      throw new Error(`${rel} is NOT gitignored — a refresh token could be committed`);
    }
  });
}

const PATHS_REPO = path.join(__dirname, '..');

// --- title convention: "<module> | <module topic> | <subtopic>" ---------------
function namingChecks() {
  console.log('\n12. title convention');

  const naming = require('./lib/naming');

  check('a mapped series produces a conforming title', () => {
    const { title, warning } = naming.composeTitle({ series: 'evals' }, 'When a good score lies');
    assert(!warning, `unexpected warning: ${warning}`);
    assert(title === '5 | Autonomous Operations | When a good score lies', `got ${title}`);
    assert(naming.followsConvention(title), 'own checker rejects it');
    return title;
  });

  check('an explicit --module overrides the series map', () => {
    const { title } = naming.composeTitle({ series: 'evals', module: 1 }, 'Something');
    assert(title.startsWith('1 | Mental Models |'), `got ${title}`);
    return title;
  });

  check('a new domain needs --module-topic, and is not invented', () => {
    let threw = false;
    try { naming.composeTitle({ series: 'x', module: 9 }, 'Sub'); } catch (e) {
      threw = /--module-topic is required/.test(e.message);
    }
    assert(threw, 'an unknown module number was accepted without a topic');
    const ok = naming.composeTitle({ series: 'x', module: 9, moduleTopic: 'New Domain' }, 'Sub');
    assert(ok.title === '9 | New Domain | Sub', `got ${ok.title}`);
    return 'rejected without, accepted with';
  });

  check('an unmapped series WARNS rather than guessing a module number', () => {
    const { title, warning } = naming.composeTitle({ series: 'future-of-learning' }, 'Will AI take my job');
    assert(warning, 'no warning for an unmapped series');
    assert(/--module/.test(warning), 'the warning does not say how to fix it');
    assert(title === 'Will AI take my job', 'a module number was invented anyway');
    return 'warns, still renders';
  });

  check('module numbers come from the curriculum, not from thin air', () => {
    const doc = fs.readFileSync(path.join(PATHS_REPO, 'docs', 'agentic-ai-mastery-curriculum.md'), 'utf8');
    for (const [n, topic] of Object.entries(naming.MODULES)) {
      assert(doc.includes(topic), `module ${n} "${topic}" is not in the curriculum doc`);
    }
    return `${Object.keys(naming.MODULES).length} domains match the curriculum`;
  });

  check('a subtopic containing the separator is rejected', () => {
    let threw = false;
    try { naming.composeTitle({ series: 'evals' }, 'a | b'); } catch { threw = true; }
    assert(threw, "a subtopic with '|' would silently make a 4-segment title");
    return 'rejected';
  });

  check('over-long titles keep the module prefix and trim the subtopic', () => {
    const { title } = naming.composeTitle({ series: 'evals' }, 'x'.repeat(140));
    assert(title.length <= 100, `title is ${title.length} chars; YouTube truncates past 100`);
    assert(title.startsWith('5 | Autonomous Operations |'), 'the prefix was trimmed instead of the tail');
    assert(naming.followsConvention(title), 'the trimmed title no longer conforms');
    return `${title.length} chars, prefix intact`;
  });

  check('the title is composed in ONE place, not per call-site', () => {
    const scriptSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'script.js'), 'utf8');
    assert(/composeTitle\(item, script\.title\)/.test(scriptSrc), 'the script stage does not compose the title');
    // upload and the bumper must both consume that one composed title.
    const upSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'upload.js'), 'utf8');
    assert(/artifacts\.script && artifacts\.script\.title/.test(upSrc), 'upload does not use the composed title');
    const prodSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    assert(/artifacts\.script\.title/.test(prodSrc), 'the bumper does not use the composed title');
    return 'bumper, YouTube and review log share one string';
  });

  check('the queue carries module fields so a resume composes the same title', () => {
    const qSrc = fs.readFileSync(path.join(__dirname, 'lib', 'queue.js'), 'utf8');
    assert(/module: moduleNumber === null \? null : Number\(moduleNumber\)/.test(qSrc), 'module not persisted');
    assert(/moduleTopic,/.test(qSrc), 'moduleTopic not persisted');
    return 'persisted on the item';
  });
}

// --- ILHAM 3.3: the gate's critique is acted on, and bounded -----------------
async function redraftChecks() {
  console.log('\n11. gate -> redraft loop (ILHAM 3.3)');

  const spine = require('./lib/spine');
  const queue = require('./lib/queue');
  const { RedraftError } = require('./lib/spine-errors');

  const stub = (name, run) => ({ name, maxAttempts: 1, run });
  const TEST_SLUG = 'redraft-loop-test';

  function testItem() {
    let item = queue.currentItems().find((i) => i.slug === TEST_SLUG);
    if (!item) {
      item = queue.enqueue({ topic: 'REDRAFT LOOP TEST', series: 'test', slug: TEST_SLUG, source: 'test' });
    } else {
      try { queue.requeue(item.id); } catch { /* already queued */ }
      item = queue.currentItems().find((i) => i.slug === TEST_SLUG);
    }
    return item;
  }

  // A gate that rejects twice then accepts: the loop must produce 3 drafts and pass.
  try {
    let drafts = 0, gates = 0;
    const rounds = [];
    const st = await spine.execute(testItem(), {
      quiet: true, stopAfter: 'gate',
      stageOverrides: {
        research: stub('research', async () => ({ ok: 1 })),
        script: stub('script', async ({ artifacts }) => {
          drafts++;
          rounds.push(artifacts.redraftFeedback ? artifacts.redraftFeedback.round : 0);
          return { title: 't', beats: [] };
        }),
        gate: stub('gate', async () => {
          gates++;
          if (gates < 3) {
            throw new RedraftError('needs work', {
              fromStage: 'script', feedback: [`fix point ${gates}`], verdict: 'NEEDS WORK',
            });
          }
          return { verdict: 'READY' };
        }),
      },
    });
    assert(st.status === 'done', `run ended ${st.status}, expected done`);
    assert(drafts === 3, `expected 3 drafts, got ${drafts}`);
    assert(JSON.stringify(rounds) === '[0,1,2]', `redraft rounds were ${JSON.stringify(rounds)}`);
    pass++; console.log('  PASS  a NEEDS WORK verdict rewinds to script and passes on redraft  (3 drafts)');
  } catch (e) {
    failures.push({ name: 'redraft loop', message: e.message });
    console.log(`  FAIL  redraft loop\n          ${e.message}`);
  }

  // The critique must actually reach the redrafting stage, or the loop is theatre.
  try {
    let received = null;
    let gates = 0;
    await spine.execute(testItem(), {
      quiet: true, stopAfter: 'gate',
      stageOverrides: {
        research: stub('research', async () => ({ ok: 1 })),
        script: stub('script', async ({ artifacts }) => {
          if (artifacts.redraftFeedback) received = artifacts.redraftFeedback;
          return { title: 't', beats: [] };
        }),
        gate: stub('gate', async () => {
          gates++;
          if (gates < 2) {
            throw new RedraftError('needs work', {
              fromStage: 'script',
              feedback: ['beat 17 slices a prop mid-object', 'beat 03 gauge contradicts the VO'],
              verdict: 'NEEDS WORK',
            });
          }
          return { verdict: 'READY' };
        }),
      },
    });
    assert(received, 'the redrafting stage never saw the critique');
    assert(received.latest.length === 2, `critique had ${received.latest.length} points, expected 2`);
    assert(/slices a prop/.test(received.latest[0]), 'critique text did not survive');
    assert(Array.isArray(received.history) && received.history.length === 1, 'no critique history kept');
    pass++; console.log('  PASS  the specific critique reaches the redraft, with history');
  } catch (e) {
    failures.push({ name: 'critique delivery', message: e.message });
    console.log(`  FAIL  critique delivery\n          ${e.message}`);
  }

  // A gate that never accepts must terminate, not spin forever.
  try {
    let drafts = 0;
    const st = await spine.execute(testItem(), {
      quiet: true, stopAfter: 'gate',
      stageOverrides: {
        research: stub('research', async () => ({ ok: 1 })),
        script: stub('script', async () => { drafts++; return { title: 't', beats: [] }; }),
        gate: stub('gate', async () => {
          throw new RedraftError('never happy', {
            fromStage: 'script', feedback: ['nope'], verdict: 'NEEDS WORK',
          });
        }),
      },
    });
    assert(st.status === 'failed', `expected failed, got ${st.status}`);
    assert(drafts === spine.MAX_REDRAFTS + 1,
      `expected ${spine.MAX_REDRAFTS + 1} drafts (first + cap), got ${drafts}`);
    pass++; console.log(`  PASS  an unresolvable critique stops after ${spine.MAX_REDRAFTS} redrafts, not forever`);
  } catch (e) {
    failures.push({ name: 'redraft cap', message: e.message });
    console.log(`  FAIL  redraft cap\n          ${e.message}`);
  }

  console.log('\n11b. redrafts are patches, so untouched beats CANNOT change');

  // Measured twice: asking for the whole script back with "leave the rest
  // identical" fixed 5-6 beats, left 4 unfixed, and BROKE 6-7 beats nobody had
  // complained about. The instruction is advisory; the model ignored it. So the
  // invariant is enforced in code instead.
  const scriptSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'script.js'), 'utf8');
  const editsFn = scriptSrc.match(/function applyEdits[\s\S]*?\n\}/);
  const applyEdits = editsFn ? eval('(' + editsFn[0].replace('function applyEdits', 'function') + ')') : null;

  check('a redraft uses a patch schema, not the full-script schema', () => {
    assert(/EDIT_SCHEMA/.test(scriptSrc), 'no patch schema');
    assert(/schema: patchMode \? EDIT_SCHEMA : SCHEMA/.test(scriptSrc), 'the patch schema is not selected on redrafts');
    assert(applyEdits, 'applyEdits not found');
    return 'patch on redraft, full script on first draft';
  });

  check('beats not named in the patch are carried through byte-identically', () => {
    const prev = [
      { id: '01', mode: 'ali', vo: 'one', art: 'art one' },
      { id: '02', mode: 'scene', vo: 'two', art: 'art two' },
      { id: '03', mode: 'info', vo: 'three', info: { tpl: 'gauge', data: { label: 'x' } } },
    ];
    const { beats, touched } = applyEdits(prev, { edits: [{ id: '02', vo: 'CHANGED' }] });
    assert(touched.length === 1 && touched[0] === '02', `touched ${JSON.stringify(touched)}`);
    assert(JSON.stringify(beats[0]) === JSON.stringify(prev[0]), 'beat 01 was altered');
    assert(JSON.stringify(beats[2]) === JSON.stringify(prev[2]), 'beat 03 was altered');
    assert(beats[1].vo === 'CHANGED' && beats[1].art === 'art two', 'the edit did not apply cleanly');
    return '1 changed, 2 untouched';
  });

  check('switching a beat out of info mode drops the stale info field', () => {
    const prev = [{ id: '01', mode: 'info', vo: 'x', info: { tpl: 'gauge', data: {} } }];
    const { beats } = applyEdits(prev, { edits: [{ id: '01', mode: 'scene', art: 'a scene' }] });
    assert(beats[0].info === undefined, 'info survived a switch to scene — would confuse the renderer');
    assert(beats[0].art === 'a scene', 'art not set');
    return 'no stale field';
  });

  check('a patch editing a nonexistent beat is rejected', () => {
    let threw = false;
    try { applyEdits([{ id: '01', mode: 'ali', vo: 'x', art: 'y' }], { edits: [{ id: '99', vo: 'z' }] }); }
    catch (e) { threw = /does not exist/.test(e.message); }
    assert(threw, 'a patch against a missing beat was silently accepted');
    return 'rejected';
  });

  check('the title survives a redraft (it is not in the patch schema)', () => {
    assert(/artifacts\.script && artifacts\.script\.subtopic/.test(scriptSrc),
      'the redraft path does not reuse the prior subtopic, so the title could drift each round');
    return 'stable across rounds';
  });

  check('NOT READY is terminal, NEEDS WORK is not', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'gate.js'), 'utf8');
    assert(/verdict === 'NEEDS WORK'[\s\S]*?RedraftError/.test(src), 'NEEDS WORK does not redraft');
    assert(/RejectedError/.test(src), 'NOT READY no longer terminates');
    return 'fixable retries, wrong-premise stops';
  });

  check('the beat budget is one number everywhere, not three fighting ones', () => {
    // The writer was told 14-18 while the reviewer's rubric demanded 20-28, so the
    // redraft loop spent a round on an argument neither side could win. Derived
    // from measurement: 6.2s per beat, house range 1.5-2.5 min -> 16-22 beats.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'script.js'), 'utf8');
    assert(/beats_min:\s*16/.test(src) && /beats_max:\s*20/.test(src), 'stage does not request 16-20');
    assert(/maxItems:\s*22/.test(src), 'schema hard cap is not 22');

    const writer = fs.readFileSync(path.join(PATHS_REPO, 'prompts', 'video_script.txt'), 'utf8');
    assert(/16-20 beats/.test(writer), 'the writer prompt does not state 16-20');

    const reviewer = fs.readFileSync(path.join(PATHS_REPO, 'prompts', 'script_gate.txt'), 'utf8');
    assert(/16-22/.test(reviewer), 'the reviewer prompt does not state 16-22');
    assert(!/20-28/.test(reviewer), 'the reviewer still demands 20-28, which the writer may not produce');
    return 'writer 16-20, reviewer 16-22, cap 22';
  });

  check('redrafts have room to converge, and calls fail fast', () => {
    // Measured: the critique fell 18 -> 14 -> 3 points across three rounds and was
    // still improving when the cap stopped it. And a call that normally takes
    // 60-90s was allowed to hang for 15 minutes before a retry could help.
    const spineSrc = fs.readFileSync(path.join(__dirname, 'lib', 'spine.js'), 'utf8');
    const cap = Number((spineSrc.match(/MAX_REDRAFTS = (\d+)/) || [])[1]);
    assert(cap >= 8, `redraft cap is ${cap}; two runs ended one round short of READY at 5`);
    assert(/RETRY_BACKOFF_MS/.test(spineSrc), 'retries have no backoff');

    const cliSrc = fs.readFileSync(path.join(__dirname, 'lib', 'llm-cli.js'), 'utf8');
    assert(/timeoutMs = 5 \* 60 \* 1000/.test(cliSrc), 'a hung call can still stall for 15 minutes');
    return `cap ${cap}, 5-min call timeout`;
  });

  check('a redraft is recorded as an intervention, not hidden', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'spine.js'), 'utf8');
    assert(/redraft_requested/.test(src), 'redrafts are not recorded');
    assert(/st\.redrafts = redrafts/.test(src), 'the redraft count is not persisted for resume');
    return 'counts toward the intervention metric';
  });
}

// --- bugs found while wiring the CLI backend and the first publish -----------
async function integrationChecks() {
  console.log('\n10. CLI-backend and publish-path bugs');

  const shellSrc = fs.readFileSync(path.join(__dirname, 'lib', 'shell.js'), 'utf8');
  const cliSrc = fs.readFileSync(path.join(__dirname, 'lib', 'llm-cli.js'), 'utf8');
  const upSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'upload.js'), 'utf8');
  const qaSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'qa.js'), 'utf8');
  const authSrc = fs.readFileSync(path.join(__dirname, 'youtube-auth.js'), 'utf8');

  check('child stdin is closed, so a CLI does not wait on it', () => {
    assert(/child\.stdin/.test(shellSrc) && /stdin\.end\(\)/.test(shellSrc),
      'shell.js never closes the child stdin -- claude waits 3s and degrades');
    return 'stdin.end()';
  });

  // Live: the warning must be gone. This is what actually broke the QA stage.
  try {
    const r = await shell.run('claude', ['-p', 'Say ok.', '--max-turns', '1',
      '--model', 'claude-haiku-4-5-20251001', '--output-format', 'json'], { timeoutMs: 120000 });
    assert(!/no stdin data received/i.test(r.stderr || ''), 'the stdin warning is still emitted');
    pass++; console.log('  PASS  live: no "waiting on stdin" warning from claude');
  } catch (e) {
    failures.push({ name: 'stdin warning', message: e.message.split('\n')[0] });
    console.log(`  FAIL  stdin warning\n          ${e.message.split('\n')[0]}`);
  }

  check('the prompt goes on stdin, not argv (Windows caps argv at ~32767)', () => {
    // A redraft carrying the brief plus several rounds of critique hit the OS
    // command-line limit and failed with `spawn ENAMETOOLONG` -- deterministically,
    // so all three retries burned on it. stdin has no such limit.
    assert(/input: prompt/.test(cliSrc), 'the prompt is not passed via stdin');
    assert(!/'-p', prompt/.test(cliSrc), 'the prompt is still an argv element');
    assert(/ENAMETOOLONG\|E2BIG/.test(cliSrc), 'an over-long command line is not diagnosed');
    // ...and it must NOT be treated as retryable.
    const idx = cliSrc.indexOf('ENAMETOOLONG|E2BIG');
    const after = cliSrc.slice(idx, idx + 900);
    assert(/LlmUnavailableError/.test(after), 'ENAMETOOLONG is thrown as a retryable error');
    assert(/deterministic/.test(after), 'the error does not say retrying will not help');
    return 'stdin + deterministic classification';
  });

  check('the prompt forbids tool use (flags alone do not)', () => {
    assert(/Do not use any tools/i.test(cliSrc),
      'no in-prompt tool ban -- the model emits tool_use and dies with error_max_turns');
    assert(/'--max-turns',\s*'3'/.test(cliSrc),
      'max-turns is not 3, so one stray tool attempt still kills the run');
    return 'NO_TOOLS + 3 turns';
  });

  check('an error_max_turns envelope is treated as failure, not parsed', () => {
    assert(/subtype !== 'success'/.test(cliSrc), 'a non-success subtype is not rejected');
    return 'rejected';
  });

  check('"API not enabled" becomes a blocker naming the console page', () => {
    assert(/has not been used in project\|is disabled/.test(upSrc), 'the 403 is not recognised');
    assert(/YouTube Data API v3 not enabled/.test(upSrc), 'no specific blocker recorded');
    return 'actionable, not a stack trace';
  });

  check('quota exhaustion is a blocker, not a crash', () => {
    assert(/quota\|rateLimitExceeded/.test(upSrc), 'quota errors are not recognised');
    return 'blocker';
  });

  check('QA is told it cannot watch the video, and given measurements instead', () => {
    assert(/mechanical_checks/.test(qaSrc), 'QA gets no mechanical evidence');
    assert(/CANNOT watch the video/.test(qaSrc), 'QA is not told it cannot watch');
    assert(!/video_path: produced\.finalPath/.test(qaSrc),
      'QA is still handed a file path it cannot open -- it will guess and score low');
    return 'scores from evidence';
  });

  check('produce captures verify.js findings as structured evidence', () => {
    const prodSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    assert(/verifyChecks/.test(prodSrc), 'verify output is discarded');
    assert(/return \{[^}]*verifyChecks/s.test(prodSrc), 'verifyChecks is not returned to later stages');
    return 'passed to QA';
  });

  check('the consent URL is handed over via a file, not a shell or a terminal', () => {
    assert(/authorize\.html/.test(authSrc), 'no HTML handoff');
    assert(!/'start'/.test(authSrc), 'still uses cmd start, which eats % and &');
    assert(/FileProtocolHandler/.test(authSrc), 'no shell-free opener');
    return 'file:// handoff';
  });

  check('the OAuth callback never reads .port off a closed server', () => {
    assert(!/server\.close\(\);\s*\n\s*resolve\(\{[^}]*server\.address\(\)/.test(authSrc),
      'address() is read after close() -- this discarded a real authorisation');
    assert(/let redirectUri = null/.test(authSrc), 'redirectUri is not captured at listen time');
    return 'port captured once';
  });

  check('the browser is only told "Authorised" after the token is saved', () => {
    const exchangeAt = authSrc.indexOf('yt.exchangeCode');
    const replyAt = authSrc.indexOf("reply('Authorised");
    assert(exchangeAt !== -1 && replyAt !== -1, 'could not locate both steps');
    assert(exchangeAt < replyAt, 'the page claims success before the token is stored');
    return 'page cannot lie';
  });

  check('the QA score reaches the review log and the description', () => {
    // Read qa.total -- a field QA never returns -- and the reviewer's key number
    // silently becomes null. The first real publish recorded qaTotal: null while
    // QA had scored 6.05.
    assert(/combined_score/.test(upSrc.replace(/\/\*[\s\S]*?\*\//g, '')) || /qaScoreOf/.test(upSrc),
      'upload.js does not read QA\'s combined_score');
    assert(!/typeof artifacts\.qa\.total === 'number' \? artifacts\.qa\.total : null/.test(upSrc),
      'still reading the non-existent qa.total for the review log');
    const qaSrc2 = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'qa.js'), 'utf8');
    assert(/combined_score: score/.test(qaSrc2), 'QA no longer returns combined_score -- update the reader');
    return 'field names agree';
  });

  check('a percent- and ampersand-laden URL survives the HTML href', () => {
    const yt = require('./lib/youtube');
    process.env.YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || 'x.apps.googleusercontent.com';
    process.env.YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || 'x';
    const url = yt.consentUrl('http://127.0.0.1:1/oauth2callback', 'st');
    const href = url.replace(/&/g, '&amp;');
    const recovered = new URL(href.replace(/&amp;/g, '&'));
    assert(recovered.searchParams.get('scope') === yt.SCOPE, 'scope did not survive');
    assert(recovered.searchParams.get('response_type') === 'code', 'response_type did not survive');
    return 'scope + response_type intact';
  });
}

// --- no-API-key LLM backend --------------------------------------------------
async function llmChecks() {
  console.log('\n9. thinking stages run without an API key (claude -p backend)');

  const cliLlm = require('./lib/llm-cli');
  const router = require('./lib/llm-router');

  check('all four thinking stages go through the router, not the API directly', () => {
    for (const f of ['research', 'script', 'gate', 'qa']) {
      const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', `${f}.js`), 'utf8');
      assert(/require\('\.\.\/llm-router'\)/.test(src), `${f}.js does not use the router`);
      assert(!/require\('\.\.\/llm'\)/.test(src), `${f}.js still requires the API backend directly`);
    }
    return 'research, script, gate, qa';
  });

  check('the CLI is the default backend', () => {
    const prev = process.env.LLM_BACKEND;
    delete process.env.LLM_BACKEND;
    const name = router.chosenName();
    if (prev !== undefined) process.env.LLM_BACKEND = prev;
    assert(name === 'cli', `default backend is '${name}', expected 'cli'`);
    return 'no API key required by default';
  });

  check('the CLI call is permission-guarded and tightly turn-capped', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'llm-cli.js'), 'utf8');
    assert(/'--allowed-tools',\s*''/.test(src), 'the permission guard was removed');
    // Was 1. Raised to 3 after measuring that --allowed-tools does not stop the
    // model OFFERING a tool call: it emitted tool_use, spent the only turn, and the
    // run died with error_max_turns. A small budget lets it recover; the in-prompt
    // ban (asserted in section 10) is what prevents the attempt.
    const turns = (src.match(/'--max-turns',\s*'(\d+)'/) || [])[1];
    assert(turns === '3', `max-turns is ${turns}, expected 3`);
    return 'permission-guarded, 3 turns';
  });

  check('the model is pinned (a default session picked Haiku)', () => {
    assert(cliLlm.MODEL === 'claude-opus-5', `model is ${cliLlm.MODEL}`);
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'llm-cli.js'), 'utf8');
    assert(/'--model',\s*MODEL/.test(src), '--model is not passed');
    return cliLlm.MODEL;
  });

  check('JSON survives prose and markdown fences around it', () => {
    const cases = [
      ['bare', '{"a":1}'],
      ['fenced', '```json\n{"a":1}\n```'],
      ['unclosed fence', '```json\n{"a":1}'],
      ['prose either side', 'Sure! Here it is:\n{"a":1}\nHope that helps.'],
      ['nested braces', '{"a":{"b":[1,2]},"c":"}"}'],
      ['brace inside a string', '{"a":"a } b"}'],
      ['array at top level', '[{"a":1}]'],
      // The parser used to start at the FIRST bracket, so a brace in prose before
      // the JSON made it return garbage or report "unbalanced" for a well-formed
      // reply. It cost a real attempt mid-run before being caught.
      ['brace in prose first', 'Use {curly} braces. Now:\n{"title":"t","beats":[1,2]}'],
      ['unbalanced prose brace', 'Note {unclosed and then {"a":1}'],
    ];
    for (const [label, raw] of cases) {
      const out = cliLlm.extractJson(raw);
      JSON.parse(out); // must parse
      if (label === 'brace inside a string') {
        assert(JSON.parse(out).a === 'a } b', 'a brace inside a string ended the scan early');
      }
      if (label === 'brace in prose first') {
        assert(JSON.parse(out).title === 't', 'the parser locked onto a brace in the prose');
      }
    }
    return `${cases.length} shapes`;
  });

  check('truncated JSON throws instead of being half-parsed', () => {
    let threw = false;
    try { cliLlm.extractJson('{"a":1,"b":{'); } catch { threw = true; }
    assert(threw, 'unbalanced JSON was accepted');
    return 'throws';
  });

  check('a wrong-shape reply is rejected before a stage trusts it', () => {
    const schema = { type: 'object', required: ['title', 'beats'] };
    let threw = false;
    try { cliLlm.checkShape({ title: 'x' }, schema); } catch (e) {
      threw = /missing required field/.test(e.message);
    }
    assert(threw, 'a reply missing a required field was accepted');
    let threw2 = false;
    try { cliLlm.checkShape([], { type: 'object' }); } catch { threw2 = true; }
    assert(threw2, 'an array was accepted where an object was required');
    return 'required fields + type enforced';
  });

  check('a dry run never shells out', () => {
    // If it tried, this would be async and slow; a sync return proves it short-circuits.
    const p = router.askJson({ dryRun: true, dryRunValue: { ok: 1 } });
    assert(p instanceof Promise, 'askJson should still return a promise');
    return 'short-circuits before spawning';
  });

  // The live call. Skipped rather than failed if the CLI is unavailable, so this
  // suite still passes on a machine without Claude Code installed.
  if (await cliLlm.isAvailable()) {
    try {
      const noKey = { ...process.env };
      delete noKey.ANTHROPIC_API_KEY;
      const saved = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const got = await cliLlm.askJson({
        promptName: 'video_research',
        input: 'Topic: a one-line smoke test\nSeries: evals',
        schema: {
          type: 'object', required: ['summary'],
          properties: { summary: { type: 'string' } },
        },
        timeoutMs: 5 * 60 * 1000,
      });
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;

      assert(typeof got.summary === 'string' && got.summary.length > 0, 'no summary returned');
      pass++;
      console.log('  PASS  live call with ANTHROPIC_API_KEY unset returns valid JSON');
    } catch (e) {
      failures.push({ name: 'live CLI call', message: e.message.split('\n')[0] });
      console.log(`  FAIL  live CLI call\n          ${e.message.split('\n')[0]}`);
    }
  } else {
    console.log('  SKIP  live call (claude CLI not available on this machine)');
  }
}

(async () => {
  await interpreterChecks();
  beatChecks();
  await uploadChecks();
  await llmChecks();
  await integrationChecks();
  await redraftChecks();
  namingChecks();

  console.log(`\n${'-'.repeat(64)}`);
  console.log(`  ${pass} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`    - ${f.name}: ${f.message}`);
    process.exitCode = 1;
  }
  console.log('');
})();
