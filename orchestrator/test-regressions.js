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
const PATHS_REPO = path.join(__dirname, '..');
const produceInternals = require('./lib/stages/produce')._internals;

let pass = 0;
let skipped = 0;
const failures = [];

/**
 * A third outcome, because two were not enough.
 *
 * Some tests need something the machine may legitimately not have -- a .env
 * file, a rendered video, a network. With only PASS and FAIL the choice was to
 * fail the suite on a clean checkout, or to weaken the assertion until it proved
 * nothing. Both are worse than saying plainly that the test did not run.
 *
 * A skip is NOT a pass: it is counted and reported separately, so a suite that
 * has quietly stopped testing anything is visible rather than green.
 */
const skip = (why) => ({ __skip: true, why });

function report(name, detail) {
  if (detail && detail.__skip) {
    skipped++;
    console.log(`  SKIP  ${name}  (${detail.why})`);
    return;
  }
  pass++;
  console.log(`  PASS  ${name}${detail ? `  (${detail})` : ''}`);
}

function check(name, fn) {
  try {
    report(name, fn());
  } catch (e) {
    failures.push({ name, message: e.message });
    console.log(`  FAIL  ${name}\n          ${e.message}`);
  }
}
async function checkAsync(name, fn) {
  try {
    report(name, await fn());
  } catch (e) {
    failures.push({ name, message: e.message });
    console.log(`  FAIL  ${name}\n          ${e.message}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// --- 1. .env is loaded, and GOOGLE_STUDIO_API_KEY bridges to GEMINI_API_KEY ---
console.log('\n1. .env loading (was: "no credentials" while the key sat in .env)');

check('loadDotenv populates keys from .env', () => {
  const envPath = path.join(__dirname, '..', '.env');
  // CI and a fresh clone have no .env, and should not. Skipping says so plainly.
  // The loader itself is proved against a temp file in test-store.js, which
  // needs no secret and therefore runs everywhere.
  if (!fs.existsSync(envPath)) return skip('no .env on this machine (CI or a fresh clone)');
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  delete process.env.GEMINI_API_KEY;
  require('./lib/env').loadDotenv({ force: true });
  // What this regression is about is that loadDotenv puts the file's credentials
  // into process.env at all -- the bug was "no credentials" while they sat in
  // .env. Which credential is not the point, and naming ANTHROPIC_API_KEY made it
  // the point: the deployed service runs LLM_BACKEND=cli on CLAUDE_CODE_OAUTH_TOKEN
  // and has no ANTHROPIC_API_KEY at all, so an .env copied from production failed
  // a test about loading rather than about keys. Accept either credential the
  // router (lib/llm-router.js:21-51) can actually start on.
  const cred = process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
  assert(cred, 'neither CLAUDE_CODE_OAUTH_TOKEN nor ANTHROPIC_API_KEY set after loadDotenv');
  return `credential len ${cred.length}`;
});

check('GOOGLE_STUDIO_API_KEY is bridged to GEMINI_API_KEY for child processes', () => {
  // Same reason the check above skips: the bridge can only be observed once
  // loadDotenv has had a .env to load. CI has no secret to put there, so without
  // this guard the pair disagreed -- one skipped, one failed -- and the suite was
  // red on main for a week over a file it is correct not to have.
  if (!fs.existsSync(path.join(__dirname, '..', '.env'))) {
    return skip('no .env on this machine (CI or a fresh clone)');
  }
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
async function beatChecks() {
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

  check('every real template name is ACCEPTED', () => {
    // Per-template check on one-beat scripts, so the whole-script checkpoint rule
    // does not apply -- that rule has its own tests in 3b.
    const tpls = ['checks', 'fourparts', 'gauge', 'statement', 'twocard', 'quote'];
    for (const t of tpls) {
      const { errors } = validateBeats([{ id: '01', mode: 'info', vo: 'X.', info: { tpl: t, data: {} } }], realDir);
      const structural = errors.filter((e) => !/QUESTION->REVEAL|quiz beat|CHECKPOINT beat/.test(e));
      assert(structural.length === 0, `template '${t}' wrongly rejected: ${structural[0]}`);
    }
    return tpls.join(', ');
  });

  check('ali/scene beat with no art is REJECTED', () => {
    const { errors } = validateBeats([{ id: '01', mode: 'ali', vo: 'X.' }], realDir);
    assert(errors.length > 0, 'art-less ali beat accepted');
    return 'rejected';
  });

  check('the real shipped beats.js has no structural/render defects', () => {
    const beats = require(path.join(realDir, 'beats.js'));
    const { errors } = validateBeats(beats, realDir);
    // evals-08 was published before the checkpoint mandate, so it trips that rule
    // legitimately. This test is about the render-breaking defects it was written
    // for; the question rules have their own tests below.
    const structural = errors.filter((e) => !/QUESTION->REVEAL|quiz beat|CHECKPOINT beat/.test(e));
    assert(structural.length === 0, `real beats.js has errors: ${structural.join('; ')}`);
    return `${beats.length} beats, 0 structural errors`;
  });

  check('template list is read from info.js, so it cannot drift', () => {
    const { knownTemplates } = require('./lib/validate-beats');
    const names = knownTemplates(realDir);
    assert(Array.isArray(names) && names.length === 6, `expected 6 templates, got ${names && names.length}`);
    return names.join(',');
  });

  // --- 4a2. Reading the model's reply --------------------------------------
  // A script draft failed three times in production with "JSON in reply is
  // unbalanced (truncated output?)" on replies that ended in a complete `}]}`.
  // They were not truncated: they were complete and INVALID, and the one message
  // covering both sent three identical retries after the wrong problem.
  console.log('\n3a2. telling a truncated reply from an invalid one');

  const extractJson = (() => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'llm-cli.js'), 'utf8');
    const grab = (name) => {
      // \r? because a Windows checkout (core.autocrlf=true) gives this file CRLF
      // endings, and an LF-only regex matched no function at all -- the whole suite
      // aborted here, before a single course check ran.
      const m = src.match(new RegExp('function ' + name + '[\\s\\S]*?\\r?\\n\\}\\r?\\n'));
      assert(m, `${name} not found in llm-cli.js`);
      return m[0];
    };
    // Every helper extractJson calls. Naming them individually meant adding a
    // repair to the chain broke this test with 'X is not defined' rather than
    // testing the repair -- so the list is derived from the source instead.
    const helpers = [...src.matchAll(/^function (\w+)\(/gm)]
      .map((m) => m[1]).filter((n) => n !== 'extractJson');
    return eval('(function(){' + grab('extractJson') + helpers.map(grab).join('')
      + 'return extractJson})()');
  })();

  check('a raw newline inside a string is repaired, not retried', () => {
    // The malformation a model actually produces: a long art prompt written across
    // two lines. JSON forbids a literal newline in a string, the span balances, and
    // the old message blamed truncation.
    const reply = '{"art":"a cream room, no text\nprops floating","id":"05"}';
    const parsed = JSON.parse(extractJson(reply));
    assert(parsed.art.includes('\n'), 'the newline was lost rather than escaped');
    assert(parsed.id === '05', 'the rest of the object did not survive the repair');
    return 'escaped, content intact';
  });

  check('a curly quote in a structural position is repaired', () => {
    // Three script drafts in a row died on this in production: a model writes " and "
    // in prose constantly, and one landing where a key or delimiter belongs makes a
    // 12,000-character draft unparseable. The parser blames a beat boundary that
    // reads perfectly, which is why it took a character-level diagnostic to see.
    const LQ = '\u201C', RQ = '\u201D';
    const o = JSON.parse(extractJson('{' + LQ + 'id' + RQ + ':"12","vo":"a sentence"}'));
    assert(o.id === '12', 'a curly-quoted key was not repaired');
    // Inside a string it is content, and must survive exactly as written.
    const k = JSON.parse(extractJson('{"vo":"She said ' + LQ + 'no' + RQ + ' firmly."}'));
    assert(k.vo === 'She said ' + LQ + 'no' + RQ + ' firmly.', 'prose quotes were altered');
    return 'structural repaired, prose untouched';
  });

  check('a trailing comma is dropped, but not one inside a string', () => {
    const o = JSON.parse(extractJson('{"beats":[{"id":"1"},{"id":"2"},],}'));
    assert(o.beats.length === 2, 'trailing commas were not dropped');
    const k = JSON.parse(extractJson('{"vo":"Wait, then speak."}'));
    assert(k.vo === 'Wait, then speak.', 'a comma inside a string was dropped');
    return 'dropped where illegal only';
  });

  check('a genuinely truncated reply still says truncated', () => {
    let msg = null;
    try { extractJson('{"a":"x","b":[1,2'); } catch (e) { msg = e.message; }
    assert(msg && /unbalanced|truncated/.test(msg), `wrong message: ${msg}`);
    return 'unbalanced';
  });

  check('a complete but invalid reply says so, and shows where', () => {
    let msg = null;
    // Not a trailing comma any more -- that is repaired now. A missing colon is
    // a defect no deterministic repair should guess at.
    try { extractJson('{"a" 1}'); } catch (e) { msg = e.message; }
    assert(msg && /complete but invalid/.test(msg), `wrong message: ${msg}`);
    assert(/Near:/.test(msg), 'the message does not show the offending text');
    // A window of text in which every character looks ordinary is what made the
    // production failure undiagnosable. Name the character by code point.
    assert(/U\+[0-9A-F]{4}/.test(msg), 'the message does not name the character');
    assert(!/truncated/.test(msg), 'still blames truncation');
    return 'named and located';
  });

  check('a brace dropped INSIDE the beats array is repaired, not discarded', () => {
    // Production, 2026-09-15, topic "how do I handle an angry parent on the phone".
    // The model wrote the mandatory checkpoint beat -- the only beat in the schema
    // with a NESTED object -- closed the quiz and never closed the beat, then
    // carried on for another 3,700 characters and ended cleanly with `"}]}` at
    // stop_reason=end_turn. A complete 12,980-character draft was thrown away.
    const reply = '{"beats":[{"id":"15","mode":"checkpoint","quiz":{"stem":"s",'
      + '"options":["a","b","c","d"],"answer":1,"explain":"e"}, '
      + '{"id":"16","mode":"ali","vo":"x"}]}';
    const o = JSON.parse(extractJson(reply));
    assert(o.beats.length === 2, `expected 2 beats, got ${o.beats && o.beats.length}`);
    assert(o.beats[0].quiz.answer === 1, 'the checkpoint quiz did not survive the repair');
    assert(o.beats[1].vo === 'x', 'the beat after the drop was swallowed');
    return 'brace inserted, both beats intact';
  });

  check('the same drop on the LAST beat is repaired too', () => {
    // Same slip one beat later: the `]` arrives while the beat is still open.
    const o = JSON.parse(extractJson('{"beats":[{"id":"15","quiz":{"a":1}]}'));
    assert(o.beats.length === 1 && o.beats[0].quiz.a === 1, 'the last beat was lost');
    return 'closed before the array closer';
  });

  check('a dropped brace AND a trailing comma are repaired together', () => {
    // Both produce the SAME parser message, so the order of the repair chain is
    // load-bearing: the comma has to go first, or the brace pass repairs into
    // something that still will not parse.
    const o = JSON.parse(extractJson('{"beats":[{"id":"1","quiz":{"a":1}, {"id":"2"},]}'));
    assert(o.beats.length === 2, `expected 2 beats, got ${JSON.stringify(o)}`);
    return 'comma dropped, brace closed';
  });

  check('a repair only ever changes nesting, never content', () => {
    const reply = '{"beats":[{"vo":"He said {yes}, then: [ok]","quiz":{"a":1}, {"id":"2"}]}';
    const o = JSON.parse(extractJson(reply));
    assert(o.beats[0].vo === 'He said {yes}, then: [ok]', `the voiceover was edited: ${o.beats[0].vo}`);
    return 'brackets in prose untouched';
  });

  check('a truncated reply that ends on a COMPLETE beat still throws', () => {
    // The dangerous one. Every beat in this text is well formed and it ends in `}`,
    // so any rule based on "does it end in a closer" would happily close it -- and
    // ship a half-length video with a clean exit code. It must stay a failure.
    let msg = null;
    try { extractJson('{"beats":[{"id":"01","vo":"x"},{"id":"02","vo":"y"}'); } catch (e) { msg = e.message; }
    assert(msg && /unbalanced|truncated/.test(msg), `wrong message: ${msg}`);
    return 'still truncated';
  });

  check('a FRAGMENT of a broken reply is never returned as the script', () => {
    // When the document does not balance, the scan starts finding the perfectly
    // valid objects INSIDE it. The first beat of a truncated reply parses on its
    // own; returning it hands the next stage a one-beat "script" and no error.
    let out = null;
    try { out = extractJson('{"beats":[{"id":"01","quiz":{"a":1,"b":2,"c":3,"d":4}'); }
    catch { out = 'THREW'; }
    assert(out === 'THREW', `an inner fragment was returned as the document: ${out}`);
    return 'threw instead';
  });

  check('a repair says so, so a silent rescue is still visible in the log', () => {
    const lines = [];
    extractJson('{"beats":[{"id":"1","quiz":{"a":1}, {"id":"2"}]}', { log: (m) => lines.push(m) });
    assert(lines.length === 1, `expected one log line, got ${JSON.stringify(lines)}`);
    assert(/repair|closed/i.test(lines[0]), `log did not mention the repair: ${lines[0]}`);
    return lines[0].slice(0, 44);
  });

  check('ordinary replies are unaffected', () => {
    assert(extractJson('here you go: {"x":2} done') === '{"x":2}', 'prose-wrapped object broke');
    assert(extractJson('```json\n{"y":3}\n```') === '{"y":3}', 'fenced object broke');
    assert(JSON.parse(extractJson('[{"a":{"b":[1]}}]'))[0].a.b[0] === 1, 'nesting broke');
    return 'prose, fences and nesting';
  });

  // --- 4a3. What a redraft leaves behind -----------------------------------
  // Every one of these was found by auditing rather than by a failed run, which
  // is the point: each would have cost a 25-minute paid run to discover.
  console.log('\n3a3. artefacts a redraft invalidates');

  const produceSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');

  check('a one-beat redraft re-buys one image, not the whole video', () => {
    // THE root cause of "it fails somewhere different every run".
    //
    // A redraft rewrites the whole beats.js even when its patch changed one beat.
    // Freshness was `file.mtime < beats.js mtime`, so every picture and every
    // paid motion clip was marked stale and re-bought -- twenty fresh images to
    // fix one beat, twenty fresh chances for the vision judge to object, another
    // redraft, another twenty. Each round was a fresh sample from a 20-step
    // chain. Voice never had this problem because staleVo compares the sidecar
    // TEXT; this gives art and clips the same test.
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-'));
    fs.mkdirSync(path.join(dir, 'art'));

    const beats = [
      { id: '01', mode: 'scene', art: 'a cream room, no text' },
      { id: '02', mode: 'scene', art: 'a shop counter, no text' },
      { id: '03', mode: 'scene', art: 'a phone on a desk, no text' },
    ];
    for (const b of beats) {
      fs.writeFileSync(path.join(dir, 'art', `${b.id}.png`), 'x');
      fs.writeFileSync(path.join(dir, 'art', `${b.id}.txt`), b.art);
    }

    // The redraft: beat 02 is reworded, and beats.js is rewritten wholesale so
    // it is now newer than every PNG -- exactly what happens on a real redraft.
    beats[1].art = 'a shop counter with a ledger open, no text';
    fs.writeFileSync(path.join(dir, 'beats.js'), 'module.exports = [];');

    const missing = produceInternals.missingPerBeat(beats, dir, 'art', (id) => `${id}.png`);
    assert(JSON.stringify(missing) === JSON.stringify(['02']),
      `expected only beat 02 to be re-bought, got ${JSON.stringify(missing)}`);

    // And a redraft that touched no art prompt must buy nothing at all.
    fs.writeFileSync(path.join(dir, 'art', '02.txt'), beats[1].art);
    fs.writeFileSync(path.join(dir, 'beats.js'), 'module.exports = [];  // rewritten again');
    const none = produceInternals.missingPerBeat(beats, dir, 'art', (id) => `${id}.png`);
    assert(none.length === 0, `a redraft with no art change still re-buys ${JSON.stringify(none)}`);

    // An older folder has no sidecars; there the timestamp is all we have, and
    // reusing possibly-stale art is the worse error.
    for (const b of beats) fs.rmSync(path.join(dir, 'art', `${b.id}.txt`));
    // Age the PNGs explicitly. Written in the same millisecond as beats.js they
    // compare equal, not older -- the mtime rule is only as good as the clock's
    // resolution, which is one more reason content is the better test.
    const old = new Date(Date.now() - 60000);
    for (const b of beats) fs.utimesSync(path.join(dir, 'art', `${b.id}.png`), old, old);
    const legacy = produceInternals.missingPerBeat(beats, dir, 'art', (id) => `${id}.png`);
    assert(legacy.length === 3, `a folder with no sidecars must fall back to mtime, got ${JSON.stringify(legacy)}`);

    fs.rmSync(dir, { recursive: true, force: true });
    return 'one beat changed, one image bought';
  });

  check('the spend estimate is priced per beat, not per folder', () => {
    // hasOutput() said "art/ has a PNG" so images cost $0 from the second
    // redraft round on, while the regeneration path bought art per beat. Eight
    // rounds could re-buy most of the art with --budget never consulted again.
    const est = produceSrc.slice(produceSrc.indexOf('function estimateSpend'),
      produceSrc.indexOf('function readDuration'));
    assert(!/hasOutput\(/.test(est), 'estimateSpend still prices from an aggregate folder check');
    assert(/missingPerBeat\(beats, dir, 'art'/.test(est), 'art is not priced per beat');
    assert(/staleVo\(beats, dir\)/.test(est), 'voiceover is not priced per beat');
    return 'art, voice and motion all per beat';
  });

  check('motion clips are checked per beat, like art and voice', () => {
    // Worse than a stale still: compile-lesson picks clips/<id>.mp4 on existence
    // alone and plays it INSTEAD of the picture, so a redrafted beat played the
    // old art, moving, under the new voiceover.
    assert(!/hasOutput\(path\.join\(dir, 'clips'\)/.test(produceSrc),
      'clips/ is still skipped on an aggregate check');
    assert(/missingPerBeat\(motionBeats, dir, 'clips'/.test(produceSrc),
      'clips/ has no per-beat freshness check');
    return 'per beat';
  });

  check('the render-skip sees clips and durations', () => {
    // A run that bought animation after an earlier run had compiled would log
    // "out/lesson.mp4 is newer" and ship the stills -- motion paid for, never seen.
    const fn = produceSrc.slice(produceSrc.indexOf('function isFresherThanInputs'),
      produceSrc.indexOf('/** A directory that exists'));
    assert(/'clips'/.test(fn), 'clips/ is not an input to the render-skip');
    assert(/durations\.json/.test(fn), 'durations.json is not an input to the render-skip');
    return 'both counted';
  });

  check('a removed beat leaves nothing behind', () => {
    // A removal-only redraft changes no wording, so staleVo is empty, so
    // tts-lesson never runs -- and it holds the only prune loop in the pipeline.
    // The orphan durations entry then makes verify.js fail a good video for
    // "truncation", because it sums every key while compile sums current beats.
    assert(/function pruneOrphans/.test(produceSrc), 'nothing prunes orphans');
    assert(/pruneOrphans\(beatsForArt, dir, log\)/.test(produceSrc), 'pruneOrphans is never called');
    const fn = produceSrc.slice(produceSrc.indexOf('function pruneOrphans'),
      produceSrc.indexOf('Copy the skill templates'));
    for (const what of ['art', 'clips', 'layers', 'audio', 'durations.json']) {
      assert(fn.includes(what), `pruneOrphans does not clean ${what}`);
    }
    return 'art, clips, layers, audio and durations keys';
  });

  check('a gate that could not run is not a finding against the video', () => {
    // eval-text exited 1 on an HTTP failure, the same code as "grammar errors",
    // and at the post-render call that is terminal -- so a Gemini 503 discarded a
    // finished, rendered, bumper-wrapped video. qa-art counted an unjudged image
    // as a failed one and re-bought art nobody had looked at.
    assert(/e\.code === 3/.test(produceSrc), 'produce does not recognise an infrastructure exit');
    const tpl = path.join(__dirname, '..', '.claude', 'skills', 'creating-explainer-videos', 'templates');
    const evalSrc = fs.readFileSync(path.join(tpl, 'eval-text.js'), 'utf8');
    assert(/judge HTTP[\s\S]{0,120}exitCode=3/.test(evalSrc), 'a judge outage still exits as a grammar failure');
    const artSrc = fs.readFileSync(path.join(tpl, 'qa-art.js'), 'utf8');
    assert(/verdict === 'FAIL'\)\.map/.test(artSrc), 'qa-art still counts an unjudged image as failed');
    assert(/process\.exit\(3\)/.test(artSrc), 'qa-art has no infrastructure exit');
    const cfgSrc = fs.readFileSync(path.join(tpl, 'lib', 'config.js'), 'utf8');
    assert(!/No Google API key[\s\S]{0,240}process\.exit\(1\)/.test(cfgSrc),
      'a missing credential still reports as a content failure');
    return 'outage and verdict are distinguishable';
  });

  check('a malformed script is sent back with the findings, not retried blind', () => {
    // Measured on "how do I handle an angry parent on the phone": beats 02 and 08
    // drew the child, which Imagen silently refuses. The stage threw a plain
    // Error, the spine retried it three times from scratch, and the writer never
    // learned what was wrong -- so it drew the child every time and the run died.
    // Every finding this check emits is a beats.js edit, which is what a redraft
    // is for.
    const scriptSrc = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'script.js'), 'utf8');
    assert(/Malformed script[\s\S]{0,80}RedraftError|RedraftError[\s\S]{0,200}Malformed script/.test(scriptSrc)
      || /throw new RedraftError\(\s*`Malformed script/.test(scriptSrc),
      'a malformed script is still thrown as a plain error and retried blind');
    assert(/fromStage: 'script', verdict: 'INVALID_BEATS'/.test(scriptSrc),
      'the findings are not carried back to the writer');

    // produce holds a second copy of the same check, and it was terminal while
    // qa-visuals five lines later was redraftable -- the weaker gate could
    // improve a video, the stricter one could only throw it away.
    assert(!/beats\.js will not render correctly[\s\S]{0,120}RejectedError/.test(produceSrc),
      'produce still rejects a fixable beats.js instead of redrafting it');
    assert(/beats\.js will not render correctly[\s\S]{0,200}fromStage: 'script'/.test(produceSrc),
      'produce does not send validation findings back to the writer');
    return 'both copies redraft';
  });

  check('the container pins ffmpeg and the render worker count', () => {
    // os.totalmem()/os.cpus() report the HOST, not the cgroup, so the memory cap
    // computed a large number and launched six 1920x1080 Chromes on an instance
    // that could not hold them. And ffmpeg-static downloads an ~80MB binary at
    // render time, per video folder, because node_modules is never in the image.
    const df = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
    assert(/FFMPEG_BIN=\/usr\/bin\/ffmpeg/.test(df), 'ffmpeg is not pinned to the one in the image');
    assert(/RENDER_WORKERS=\d/.test(df), 'the render worker count is not pinned');
    return 'pinned';
  });

  // --- 4b. The mandatory CHECKPOINT ----------------------------------------
  // SCRIPTING_STANDARDS 3b (2026-09-11) replaced the on-screen QUESTION -> REVEAL
  // cards with a beat that is never drawn and never spoken: the player pauses and
  // the LMS pops the question. It had the same history as every other rule here --
  // mandated in prose, enforced nowhere -- so the writer's schema had no field for
  // it and the autonomous path kept emitting the superseded cards. Worse, a lone
  // quiz card with its answer baked in yields NO checkpoint from the API, so those
  // videos reached the LMS with no question at all.
  console.log('\n3b. the mandatory checkpoint beat (was: the writer had no field for it)');

  const tplDir = path.join(__dirname, '..', '.claude', 'skills', 'creating-explainer-videos', 'templates');
  const spoken = (id) => ({ id, mode: 'scene', vo: 'A sentence.', art: 'a cream room, no text' });
  const checkpoint = () => ({
    id: '02', mode: 'checkpoint',
    quiz: {
      stem: 'Which check survives?', options: ['A', 'B', 'C', 'D'], answer: 1,
      explain: 'The tempting option confirms the message arrived, not what it said, '
        + 'which is where the money is actually lost.',
    },
  });
  const okBeats = () => ([spoken('01'), checkpoint(), spoken('03')]);

  check('a script with NO checkpoint beat is REJECTED', () => {
    const { errors } = validateBeats([spoken('01'), spoken('02')], tplDir);
    assert(errors.some((e) => /CHECKPOINT beat/.test(e)), 'a video with no question was accepted');
    return 'rejected';
  });

  check('a well-formed checkpoint is ACCEPTED', () => {
    const { errors } = validateBeats(okBeats(), tplDir);
    assert(errors.length === 0, `wrongly rejected: ${errors.join('; ')}`);
    return 'accepted';
  });

  check('a checkpoint with a vo is REJECTED (it is never spoken)', () => {
    const b = okBeats(); b[1].vo = 'Here is your question.';
    const { errors } = validateBeats(b, tplDir);
    assert(errors.some((e) => /never spoken/.test(e)), 'a spoken checkpoint was accepted');
    return 'rejected';
  });

  check('a checkpoint first or last is REJECTED (no boundary to pause on)', () => {
    assert(validateBeats([checkpoint(), spoken('03')], tplDir).errors.some((e) => /first or last/.test(e)),
      'a leading checkpoint was accepted');
    assert(validateBeats([spoken('01'), checkpoint()], tplDir).errors.some((e) => /first or last/.test(e)),
      'a trailing checkpoint was accepted');
    return 'both rejected';
  });

  check('a checkpoint with no explain is REJECTED', () => {
    const b = okBeats(); delete b[1].quiz.explain;
    const { errors } = validateBeats(b, tplDir);
    assert(errors.some((e) => /explain/.test(e)), 'a question with no feedback was accepted');
    return 'rejected';
  });

  check('a blank stem, <2 options or an out-of-range answer is REJECTED', () => {
    const noStem = okBeats(); noStem[1].quiz.stem = '';
    const oneOpt = okBeats(); oneOpt[1].quiz.options = ['A'];
    const badIdx = okBeats(); badIdx[1].quiz.answer = 5;
    assert(validateBeats(noStem, tplDir).errors.some((e) => /stem/.test(e)), 'blank stem accepted');
    assert(validateBeats(oneOpt, tplDir).errors.some((e) => /options/.test(e)), 'single option accepted');
    assert(validateBeats(badIdx, tplDir).errors.some((e) => /answer/.test(e)), 'out-of-range answer accepted');
    return 'all three rejected';
  });

  check('a checkpoint needs NO animation template, so a stale kit cannot block it', () => {
    // The old rule could not be satisfied in a folder whose info.js predated the
    // quiz template. A checkpoint is never drawn, so it has no such dependency --
    // realDir is exactly such a folder.
    const { errors } = validateBeats(okBeats(), realDir);
    assert(!errors.some((e) => /CHECKPOINT|stale/.test(e)), `blocked by the kit: ${errors.join('; ')}`);
    return 'accepted in a pre-quiz folder';
  });

  check('a legacy quiz CARD is still shape-checked when one is present', () => {
    // Videos written before 3b keep their cards through a recut, so the old shape
    // rules must not have been deleted along with the requirement.
    const withCard = [spoken('01'), checkpoint(), {
      id: '03', mode: 'info', vo: 'Which one?', holdAfter: 2,
      info: { tpl: 'quiz', data: { stem: 'Q?', options: ['A'], answer: 0 } },
    }];
    const { errors } = validateBeats(withCard, tplDir);
    assert(errors.some((e) => /options/.test(e)), 'a one-option legacy card was accepted');
    const noHold = JSON.parse(JSON.stringify(withCard)); delete noHold[2].holdAfter;
    noHold[2].info.data.options = ['A', 'B'];
    assert(validateBeats(noHold, tplDir).errors.some((e) => /holdAfter/.test(e)),
      'a legacy card with no thinking pause was accepted');
    return 'shape rules intact';
  });

  check('the writer can actually emit a checkpoint (schema + beats.js)', () => {
    // The rule was unsatisfiable before this: mode had no 'checkpoint' and the beat
    // had no 'quiz', so the writer could not comply however it was prompted.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'script.js'), 'utf8');
    assert(/'ali', 'scene', 'info', 'checkpoint'/.test(src), "mode enum has no 'checkpoint'");
    assert(/required: \['stem', 'options', 'answer', 'explain'\]/.test(src),
      'no quiz field in the beat schema');
    assert(/b\.quiz \?/.test(src), 'renderBeatsFile drops quiz, so the checkpoint never reaches beats.js');
    assert(/mode === 'checkpoint' \? null/.test(src), 'a checkpoint would be written with a vo');
    return 'schema + writer + renderer';
  });

  // --- 4c. The scaffold can actually build what is now required -------------
  console.log('\n3c. the skill templates (was: a July renderer scaffolding every autonomous video)');

  check('templates/animation/info.js defines the quiz template', () => {
    const { knownTemplates } = require('./lib/validate-beats');
    const names = knownTemplates(tplDir) || [];
    assert(names.includes('quiz'), `no quiz template; has: ${names.join(',')}`);
    return `${names.length} templates`;
  });

  check('the script schema can emit every template the renderer defines, except quiz', () => {
    // Read the ENUMS, not the source text. Grepping for the name passed as soon as
    // a template was mentioned in a comment -- including a comment saying it had
    // been deliberately removed, which is the opposite of what the test checks.
    const { knownTemplates } = require('./lib/validate-beats');
    const rendered = knownTemplates(tplDir) || [];
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'script.js'), 'utf8');
    const enums = [...src.matchAll(/enum:\s*\[([^\]]*?)\]/g)]
      .map((m) => m[1].match(/'[^']+'/g) || [])
      .map((list) => list.map((q) => q.slice(1, -1)));
    const tplEnums = enums.filter((e) => e.includes('gauge'));
    assert(tplEnums.length === 2, `expected 2 template enums, found ${tplEnums.length}`);

    for (const e of tplEnums) {
      // quiz is intentionally unreachable: the checkpoint beat replaced the
      // on-screen card, and while it stayed in the enum the writer kept emitting
      // one alongside the checkpoint -- the question and its answer, drawn.
      assert(!e.includes('quiz'), 'quiz is back in a template enum');
      const missing = rendered.filter((t) => t !== 'quiz' && !e.includes(t));
      assert(missing.length === 0, `schema cannot emit: ${missing.join(', ')}`);
    }
    return `${rendered.length - 1} reachable, quiz withheld`;
  });

  check('a quiz payload on a drawn beat is REJECTED', () => {
    // The old card wearing the new field: it draws the question AND its answer.
    const beats = [spoken('01'), checkpoint(), {
      id: '03', mode: 'ali', vo: 'A sentence.', art: 'ali alone on plain cream, no ground, no shadow, no text',
      quiz: { stem: 'Q?', options: ['a', 'b'], answer: 0, explain: 'because of the thing that matters here' },
    }];
    const { errors } = validateBeats(beats, tplDir);
    assert(errors.some((e) => /carries a quiz payload/.test(e)), 'a drawn quiz beat was accepted');
    return 'rejected';
  });

  check('an on-screen quiz card alongside a checkpoint is REJECTED', () => {
    const beats = [spoken('01'), checkpoint(), {
      id: '03', mode: 'info', vo: 'Which one?', holdAfter: 2,
      info: { tpl: 'quiz', data: { stem: 'Q?', options: ['a', 'b'], answer: 0 } },
    }];
    const { errors } = validateBeats(beats, tplDir);
    assert(errors.some((e) => /same question twice/.test(e)), 'the question was asked twice');
    return 'rejected';
  });

  check('holdAfter survives the writer -> beats.js round trip', () => {
    // Same extraction trick the applyEdits tests below use: the stage exports only
    // its contract, so reach the pure helper out of the source.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'script.js'), 'utf8');
    const fn = (src.match(/function renderBeatsFile[\s\S]*?\n\}/) || [])[0];
    assert(fn, 'renderBeatsFile not found in script.js');
    const renderBeatsFile = eval('(' + fn.replace('function renderBeatsFile', 'function') + ')');
    // okBeats() is now a checkpoint script, which carries no holdAfter by design,
    // so this builds the beat it is actually about.
    const out = renderBeatsFile({ title: 'T', beats: [
      { id: '01', mode: 'info', vo: 'Which one?', holdAfter: 2,
        info: { tpl: 'quiz', data: { stem: 'Q?', options: ['A', 'B'], answer: 0 } } },
      checkpoint(),
    ] });
    // Dropped here, the quiz pause is silently lost: tts-lesson.js reads it off beats.js.
    assert(/holdAfter:\s*2/.test(out), 'renderBeatsFile dropped holdAfter');
    // Same failure shape, newer field: a dropped quiz means the LMS gets no question.
    assert(/quiz:\s*\{/.test(out) && /Which check survives\?/.test(out),
      'renderBeatsFile dropped the checkpoint quiz');
    // And a checkpoint must not be written with a vo -- it is never spoken.
    const cpBlock = out.slice(out.indexOf("mode: \"checkpoint\""));
    assert(!/vo:/.test(cpBlock.slice(0, cpBlock.indexOf('},'))), 'checkpoint written with a vo');
    return 'holdAfter + quiz, no vo';
  });

  check('tts-lesson.js turns holdAfter into real silence', () => {
    const src = fs.readFileSync(path.join(tplDir, 'tts-lesson.js'), 'utf8');
    assert(/holdAfter/.test(src), 'the template TTS script ignores holdAfter -- the pause is fictional');
    return 'honoured';
  });

  check('templates/compile-lesson.js binds every identifier it injects', () => {
    // openPage() passed { beats, durations, anchors, clips, rigs } while clips and
    // rigs were never declared -- a ReferenceError on every fresh scaffold.
    const src = fs.readFileSync(path.join(tplDir, 'compile-lesson.js'), 'utf8');
    const injected = (src.match(/window\.__DATA = data; \}, \{ ([^}]+) \}/) || [])[1];
    assert(injected, 'could not find the __DATA injection');
    for (const name of injected.split(',').map((x) => x.trim()).filter(Boolean)) {
      assert(
        new RegExp(`(const|let|var)\\s+${name}\\b`).test(src),
        `compile-lesson.js injects '${name}' but never declares it -- ReferenceError at render`
      );
    }
    return injected;
  });

  // --- 4d. The quality sensors actually run --------------------------------
  console.log('\n3d. produce runs the quality sensors (was: verify.js only, on the autonomous path)');

  // A sensor shipped in the templates but wired into nothing reports safety it
  // never checked. qa-checkpoint, qa-info and qa-frames sat that way for months
  // while CLAUDE.md said qa-checkpoint "fails the build", so this list is the
  // guard: adding a sensor to templates/ without calling it here fails the suite.
  const SENSORS = ['qa-visuals.js', 'qa-cutouts.js', 'qa-checkpoint.js', 'qa-info.js',
    'qa-art.js', 'qa-frames.js', 'eval-text.js'];

  check('produce.js runs every sensor, each before the spend it protects', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    const at = (needle) => src.indexOf(needle);
    for (const name of SENSORS) {
      assert(at(`sensor('${name}'`) !== -1, `produce.js never runs ${name}`);
    }
    // Script-level sensors read only beats.js, so they must land before any money
    // is committed -- there they cost nothing to fail.
    for (const name of ['qa-visuals.js', 'qa-cutouts.js', 'qa-checkpoint.js', 'qa-info.js']) {
      assert(at(`sensor('${name}'`) < at('--- spend gate'), `${name} runs after money is committed`);
    }
    assert(at("sensor('qa-art.js'") < at('// 4. voiceover'), 'qa-art runs after TTS is bought');
    // qa-frames needs durations.json, so it cannot precede TTS -- but it must
    // precede the ~1h compile, which is the whole point of measuring the frame.
    assert(at("sensor('qa-frames.js'") < at('// 5. render'), 'qa-frames runs after the expensive render');
    return `all ${SENSORS.length}, correctly ordered`;
  });

  check('every sensor ships in the templates, so a scaffold can run them', () => {
    for (const name of SENSORS) {
      assert(fs.existsSync(path.join(tplDir, name)), `${name} missing from the skill templates`);
    }
    return `${SENSORS.length} present`;
  });

  check('the template sync is unconditional, so old folders get new gates', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    // Gating the copy on "compile-lesson.js is absent" is how folders scaffolded
    // before a gate existed never received it.
    assert(
      !/if \(!fs\.existsSync\(path\.join\(dir, 'compile-lesson\.js'\)\)\)/.test(src),
      'copyTemplates is still gated on the folder being brand new'
    );
    return 'unconditional';
  });

  check('a sensor failure is a RejectedError carrying the findings', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    assert(/SENSOR_FAIL/.test(src), 'sensor failures are not tagged for the reviewer loop');
    // RejectedError keeps only verdict+details, so a sibling "sensor" key is dropped.
    assert(/details: \{ sensor: script/.test(src),
      'the failing sensor name is not inside details -- it is silently dropped');
    assert(/e instanceof shell\.CommandError/.test(src),
      'a spawn failure would be reported as a quality verdict');
    return 'tagged + distinguishes infra failure';
  });

  check('the QA judge is shown the sensor verdicts', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'qa.js'), 'utf8');
    // Without these the judge has no observation of the visuals at all and scores
    // that factor neutrally on every video.
    assert(/quality_sensors/.test(src), 'qa.js does not pass the sensor results to the judge');
    return 'passed through';
  });

  // --- 4e. Animation: motion lives on the beat -----------------------------
  console.log('\n3e. i2v animation (was: not in the spine at all, and a stale per-video motion map)');

  check('the animator reads motion off the BEAT, not a per-video map', () => {
    const src = fs.readFileSync(path.join(tplDir, 'generate-lesson-video-omni.js'), 'utf8');
    // A hardcoded map travels with the copied folder and beat ids repeat, so a
    // scaffolded video silently animated the previous video's story.
    assert(/b\.motion \|\| MOTION\[b\.id\]/.test(src), 'motion is not taken from the beat first');
    assert(/const MOTION = \{\};/.test(src), 'the per-video MOTION map is still populated in the template');
    return 'per-beat';
  });

  check('only beats that ask for motion are animated', () => {
    const src = fs.readFileSync(path.join(tplDir, 'generate-lesson-video-omni.js'), 'utf8');
    // Animating every art beat costs more than the whole rest of the video.
    assert(/const wantMotion = artBeats\.filter\(\(b\) => b\.motion\)/.test(src),
      'the animator still defaults to every art beat');
    return 'opt-in';
  });

  check('motion survives the writer -> beats.js round trip', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'script.js'), 'utf8');
    const fn = (src.match(/function renderBeatsFile[\s\S]*?\n\}/) || [])[0];
    const renderBeatsFile = eval('(' + fn.replace('function renderBeatsFile', 'function') + ')');
    const out = renderBeatsFile({ title: 'T', beats: [
      { id: '01', mode: 'scene', vo: 'x', art: 'a', motion: 'he writes steadily down the page' },
    ] });
    assert(/motion: "he writes steadily down the page"/.test(out), 'renderBeatsFile dropped motion');
    return 'written';
  });

  check('animation is inside the spend estimate the budget gate checks', () => {
    const { estimateSpend, i2vSeconds } = require('./lib/stages/produce')._internals;
    const beats = [
      { id: '01', mode: 'scene', vo: 'x', art: 'a', motion: 'small movement' },
      { id: '02', mode: 'scene', vo: 'x', art: 'a' },
    ];
    const est = estimateSpend(beats, path.join(os.tmpdir(), 'no-such-video-dir'));
    // i2v is priced per second, so it can dwarf art+TTS -- a budget gate that does
    // not see it is guarding the cheap half of the bill.
    assert(est.animBeats === 1, `expected 1 animated beat, got ${est.animBeats}`);
    assert(est.animUsd > 0, 'animation priced at zero');
    assert(est.totalUsd > est.artUsd + est.ttsUsd, 'animation is not in the total');
    // Must round to kie's fixed clip buckets, or the estimate is not the bill.
    assert(i2vSeconds(3) === 5 && i2vSeconds(8) === 10 && i2vSeconds(13) === 15,
      'clip length does not round to kie buckets');
    return `$${est.totalUsd} incl. $${est.animUsd} animation`;
  });

  check('animation runs after TTS (it needs the measured durations) and before the render', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    const at = (n) => src.indexOf(n);
    assert(at('// 4b. animation') > at('// 4. voiceover'), 'animation runs before TTS measures durations');
    assert(at('// 4b. animation') < at('// 5. render'), 'animation runs after the render, so clips are ignored');
    return 'ordered';
  });

  check('a failed or unaffordable animation falls back to stills, it does not fail the run', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    // A run that dies because kie is out of credits trades a good video for no video.
    assert(/animation SKIPPED/.test(src) && /animation_skipped_over_budget/.test(src),
      'over-budget animation is not a graceful skip');
    assert(/animation FAILED[\s\S]{0,200}falling back to stills/.test(src),
      'an i2v failure is not a graceful fallback');
    return 'graceful';
  });

  // --- 4e2. A failing gate must be able to IMPROVE the video ---------------
  console.log('\n3e2. sensor findings drive a redraft (was: the strictest gates could only kill a run)');

  check('the pre-spend sensors send the script back, they do not end the run', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    assert(/qa-visuals\.js'[^)]*redraftable: true/.test(src), 'qa-visuals cannot redraft');
    assert(/qa-cutouts\.js'[^)]*redraftable: true/.test(src), 'qa-cutouts cannot redraft');
    assert(/new RedraftError\([\s\S]{0,200}fromStage: 'script'/.test(src), 'no redraft back to script');
    return 'redraftable';
  });

  check('eval-text runs twice: redraftable before the spend, terminal after', () => {
    // It reads beats.js and nothing else, so learning about a mixed-up pronoun only
    // AFTER paying for art and a voice threw the whole video away for a line edit --
    // measured on a real run. Early it is a redraft brief; late it stays terminal,
    // because rewinding past a finished render would discard it over a comma.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    const calls = [];
    let at = -1;
    while ((at = src.indexOf("sensor('eval-text.js'", at + 1)) !== -1) {
      calls.push({ at, line: src.slice(at, at + 220) });
    }
    assert(calls.length === 2, `expected 2 eval-text calls, found ${calls.length}`);
    assert(/redraftable/.test(calls[0].line), 'the pre-spend eval-text is not redraftable');
    assert(!/redraftable/.test(calls[1].line), 'the post-render eval-text would discard a finished video');
    // The first must genuinely sit before the money, not merely earlier in the file.
    const gate = src.indexOf('Paid art/TTS not approved');
    assert(gate > 0 && calls[0].at < gate, 'the redraftable eval-text runs after the spend gate');
    assert(calls[1].at > gate, 'the terminal eval-text runs before the render');
    return 'early redraftable, late terminal';
  });

  check('a redrafted beat does not reuse the art from the sentence it replaced', () => {
    // The redraft can reword a beat's art prompt and keep its id, so the old PNG
    // still EXISTS -- and "the file is there" would ship the wrong picture.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    const fn = (src.match(/function missingPerBeat[\s\S]*?\n\}/) || [])[0];
    assert(fn, 'missingPerBeat not found');
    const missingPerBeat = eval('(' + fn.replace('function missingPerBeat', 'function') + ')');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-art-'));
    try {
      fs.mkdirSync(path.join(dir, 'art'));
      const beats = [{ id: '01', mode: 'scene', art: 'a' }];
      fs.writeFileSync(path.join(dir, 'art', '01.png'), 'x');
      fs.writeFileSync(path.join(dir, 'beats.js'), 'module.exports=[]');
      // Backdate the art explicitly. Writing it first left the two mtimes under a
      // millisecond apart, so on a coarse filesystem clock they could tie and the
      // test flaked -- the assertion is about staleness, not about write order.
      const older = Date.now() / 1000 - 10;
      fs.utimesSync(path.join(dir, 'art', '01.png'), older, older);
      const stale = missingPerBeat(beats, dir, 'art', (i) => `${i}.png`);
      assert(stale.length === 1, 'art older than beats.js was treated as done');

      const later = Date.now() / 1000 + 10;
      fs.utimesSync(path.join(dir, 'art', '01.png'), later, later);
      const fresh = missingPerBeat(beats, dir, 'art', (i) => `${i}.png`);
      assert(fresh.length === 0, 'art newer than beats.js was needlessly re-bought');
      return 'stale detected, fresh kept';
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  check('the writer and the gate are told the rule the sensor enforces', () => {
    // A deterministic gate the writer has never heard of costs a redraft round
    // on every single video.
    const writer = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'video_script.txt'), 'utf8');
    const gate = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'script_gate.txt'), 'utf8');
    for (const [name, src] of [['writer', writer], ['gate', gate]]) {
      assert(/quiz/i.test(src), `${name} prompt never mentions the quiz beat`);
      assert(/motion/i.test(src), `${name} prompt never mentions motion`);
      assert(/ACTION|physical act/i.test(src), `${name} prompt never mentions the scene-action rule`);
    }
    return 'quiz + motion + action in both';
  });

  // --- 4e3. An installed-but-unauthenticated CLI ---------------------------
  // Found live on Railway 2026-09-01: /health reported model:false and every
  // video request died in `research`. The image installs the claude CLI, so
  // isAvailable() (which only runs `claude --version`) said yes, the router chose
  // the CLI, and the call failed with no credential -- with an API key sitting
  // unused, because the fallback only ran when the BINARY was missing.
  console.log('\n3e3. model routing when the CLI has no credential');

  check('an unauthenticated CLI is a hard, typed failure -- not a transient one', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'llm-cli.js'), 'utf8');
    assert(/AUTH_FAILURE_RE/.test(src), 'no auth-failure detection at all');
    assert(/AUTH_FAILURE_RE\.test\(e\.message\)[\s\S]{0,120}LlmUnavailableError/.test(src),
      'an auth failure is not raised as LlmUnavailableError, so retries burn on it');
    return 'typed';
  });

  check('CLAUDE_CODE_OAUTH_TOKEN is what the container authenticates with', () => {
    const df = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
    assert(/npm install -g @anthropic-ai\/claude-code/.test(df), 'the image no longer installs the CLI');
    assert(/CLAUDE_CODE_OAUTH_TOKEN/.test(df), 'the Dockerfile no longer documents the CLI credential');
    const cfg = fs.readFileSync(path.join(__dirname, '..', 'server', 'lib', 'config.js'), 'utf8');
    assert(/CLAUDE_CODE_OAUTH_TOKEN/.test(cfg), '/health does not count the CLI token as a model credential');
    return 'documented + surfaced on /health';
  });

  await checkAsync('the router falls back to the API key instead of failing the run', async () => {
    const cliPath = require.resolve('./lib/llm-cli');
    const apiPath = require.resolve('./lib/llm');
    const routerPath = require.resolve('./lib/llm-router');
    const saved = [cliPath, apiPath, routerPath].map((k) => [k, require.cache[k]]);
    try {
      class LlmUnavailableError extends Error {
        constructor(m) { super(m); this.name = 'LlmUnavailableError'; }
      }
      let apiCalled = false;
      require.cache[cliPath] = { id: cliPath, filename: cliPath, loaded: true, exports: {
        isAvailable: async () => true,   // the binary exists, as in the container
        askJson: async () => { throw new LlmUnavailableError('no credential'); },
        LlmUnavailableError,
      } };
      require.cache[apiPath] = { id: apiPath, filename: apiPath, loaded: true, exports: {
        askJson: async () => { apiCalled = true; return { ok: true }; },
      } };
      delete require.cache[routerPath];
      const router = require('./lib/llm-router');

      const hadKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      await router.askJson({ log: () => {} });
      assert(apiCalled, 'the API key was available and the router still failed the run');

      delete process.env.ANTHROPIC_API_KEY;
      const hadAuth = process.env.ANTHROPIC_AUTH_TOKEN;
      delete process.env.ANTHROPIC_AUTH_TOKEN;
      let threw = false;
      try { await router.askJson({ log: () => {} }); } catch (e) { threw = e.name === 'LlmUnavailableError'; }
      assert(threw, 'with no credential anywhere it must fail loudly, not silently');

      if (hadKey) process.env.ANTHROPIC_API_KEY = hadKey;
      if (hadAuth) process.env.ANTHROPIC_AUTH_TOKEN = hadAuth;
      return 'falls back once, then fails loudly';
    } finally {
      for (const [k, v] of saved) { if (v) require.cache[k] = v; else delete require.cache[k]; }
      delete require.cache[routerPath];
    }
  });

  // --- 4e4. A production failure has to leave a trace ---------------------
  // For two days every Slack video died in `research` and the Railway log said
  // nothing at all, because the server runs the spine with quiet:true. Diagnosing
  // it meant inspecting a credential's shape instead of reading an error.
  console.log('\n3e4. production observability (was: quiet:true silenced the reason for every failure)');

  await checkAsync('a quiet run still logs WHY it failed', async () => {
    const spine = require('./lib/spine');
    const item = { id: 'testing/obs-proof', series: 'testing', slug: 'obs-proof', topic: 'obs' };
    const boom = {
      name: 'research', maxAttempts: 1,
      async run() { throw new Error('DISTINCTIVE-CAUSE-42'); },
    };
    const lines = [];
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk, ...rest) => { lines.push(String(chunk)); return write(chunk, ...rest); };
    try {
      await spine.execute(item, { quiet: true, stopAfter: 'research', stageOverrides: { research: boom } });
    } finally { process.stdout.write = write; }
    const out = lines.join('');
    assert(/DISTINCTIVE-CAUSE-42/.test(out), 'the failure reason was swallowed by quiet');
    assert(/FAILED at research/.test(out), 'the run outcome was swallowed by quiet');
    return 'reason + outcome survive quiet';
  });

  // Measured: 17 failed runs burned 23.4 hours between them, the worst single run
  // 19.4 hours. Every stage had its own timeout the whole time -- they cannot see a
  // redraft loop, which restarts the clock on each stage it rewinds to.
  await checkAsync('a run that has been going for hours is stopped for a person', async () => {
    const spine = require('./lib/spine');
    const item = { id: 'testing/time-ceiling', series: 'testing', slug: 'time-ceiling', topic: 't' };
    const state = require('./lib/state');
    const st = state.create(item);
    // Pretend this run started four hours ago; the ceiling is 180 minutes.
    st.startedAt = new Date(Date.now() - 240 * 60000).toISOString();
    let ran = false;
    const shouldNotRun = { name: 'research', maxAttempts: 1, async run() { ran = true; return { ok: 1 }; } };
    const out = await spine.execute(item, {
      quiet: true, resumeState: st, stopAfter: 'research',
      stageOverrides: { research: shouldNotRun },
    });
    assert(!ran, 'the next stage started anyway, so the ceiling buys nothing');
    // BLOCKED, not FAILED: art and voice are usually already bought by this point,
    // and `failed` would tell the LMS to give up on something a person can rescue.
    assert(out.status === 'blocked', `expected blocked, got ${out.status}`);
    return 'stopped before the next stage, parked as blocked';
  });

  await checkAsync('a normal-length run is not touched by the ceiling', async () => {
    const spine = require('./lib/spine');
    const item = { id: 'testing/time-ok', series: 'testing', slug: 'time-ok', topic: 't' };
    let ran = false;
    const ok = { name: 'research', maxAttempts: 1, async run() { ran = true; return { ok: 1 }; } };
    const out = await spine.execute(item, {
      quiet: true, stopAfter: 'research', stageOverrides: { research: ok },
    });
    assert(ran, 'the ceiling blocked a run that had only just started');
    assert(out.status === 'done', `expected done, got ${out.status}`);
    return 'unaffected';
  });

  check('stage chatter is still suppressed, so the log stays readable', () => {
    // The point of quiet was ffmpeg/npm/puppeteer spam; promoting EVERYTHING
    // would trade one unreadable log for another.
    //
    // Rewritten 2026-09-22 to assert the PROPERTY rather than one line of source.
    // The original matched the literal `log: (msg) => log(name, msg)`, which broke
    // the moment that closure was given a name so `.always` could hang off it --
    // while the behaviour it guards was unchanged. A test that fails on a rename
    // and passes on a regression is worse than no test, so this one now checks
    // what actually matters, and adds the bound the original never had.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'spine.js'), 'utf8');

    assert(/const log = \(stage, msg\) => \{ if \(!quiet\) emit\(stage, msg\); \}/.test(src),
      'quiet no longer suppresses anything');

    // The channel a stage gets by default must still be the quiet-able one.
    assert(/const stageLog = \(msg\) => log\(name, msg\);/.test(src),
      'per-stage messages are no longer routed through the quiet-able logger');
    assert(/stageLog\.always = \(msg\) => log\.always\(name, msg\);/.test(src),
      'stages have no way to say something that survives quiet');

    // The real guard: a budget. spine.js documents always-lines as "a couple of
    // dozen per run", and produce is where the temptation to promote everything
    // lives, because it is the stage that spends money and runs every sensor.
    const prod = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    const always = (prod.match(/log\.always\(/g) || []).length;
    const quiet = (prod.match(/(^|[^.\w])log\(/g) || []).length;
    assert(always <= 20, `produce has ${always} always-lines -- past the couple-of-dozen budget`);
    assert(quiet > always,
      `produce routes ${quiet} lines through quiet and ${always} through always -- `
      + 'chatter is being promoted, which is what quiet exists to prevent');
    return `${always} always-lines, ${quiet} still quiet`;
  });

  await checkAsync('queue bookkeeping cannot replace the real cause of death', async () => {
    // queue.jsonl lives on the container filesystem, which Railway wipes on
    // redeploy. A missing item made queue.fail() throw from INSIDE the failure
    // handler, so the run died with "No queue item" instead of the real reason.
    const spine = require('./lib/spine');
    const item = { id: 'testing/not-in-queue-' + Date.now(), series: 'testing', slug: 'nq', topic: 'nq' };
    const boom = {
      name: 'research', maxAttempts: 1,
      async run() { throw new Error('REAL-CAUSE-99'); },
    };
    let st;
    try {
      st = await spine.execute(item, { quiet: true, stopAfter: 'research', stageOverrides: { research: boom } });
    } catch (e) {
      throw new Error(`the run threw instead of reporting: ${e.message}`);
    }
    assert(st && st.status === 'failed', `expected status failed, got ${st && st.status}`);
    assert(/REAL-CAUSE-99/.test(JSON.stringify(st.stages.research || {})),
      'the real error is not on the run state');
    return 'real cause preserved';
  });

  // --- 4e5. The log flood -------------------------------------------------
  console.log('\n3e5. slack log flood (was: channel_not_found every tick, per ticket, forever)');

  await checkAsync('an unreadable channel is polled once, not every tick', async () => {
    const sp = require.resolve('@slack/web-api');
    const saved = require.cache[sp];
    const slackPath = require.resolve('../server/lib/slack');
    const savedSlack = require.cache[slackPath];
    const hadToken = process.env.SLACK_BOT_TOKEN;
    let apiCalls = 0;
    try {
      require.cache[sp] = { id: sp, filename: sp, loaded: true, exports: { WebClient: class {
        constructor() {
          this.conversations = { replies: async () => {
            apiCalls++; throw new Error('An API error occurred: channel_not_found');
          } };
        }
      } } };
      process.env.SLACK_BOT_TOKEN = 'xoxb-test';
      delete require.cache[slackPath];
      const slack = require('../server/lib/slack');

      const warn = console.warn, err = console.error;
      const lines = [];
      console.warn = (...a) => lines.push(a.join(' '));
      console.error = (...a) => lines.push(a.join(' '));
      try {
        for (let tick = 0; tick < 6; tick++) {
          for (let t = 0; t < 5; t++) await slack.threadReplies({ channel: 'C0DEAD', threadTs: '171' + t });
        }
      } finally { console.warn = warn; console.error = err; }

      assert(apiCalls === 1, `hit the Slack API ${apiCalls} times for a known-unreadable channel`);
      assert(lines.length === 1, `wrote ${lines.length} log lines for one unreadable channel`);
      assert(/invite the bot/.test(lines[0]), 'the one line does not say what a human should do');
      return `30 attempts -> ${apiCalls} call, ${lines.length} line`;
    } finally {
      if (saved) require.cache[sp] = saved; else delete require.cache[sp];
      if (savedSlack) require.cache[slackPath] = savedSlack; else delete require.cache[slackPath];
      if (hadToken) process.env.SLACK_BOT_TOKEN = hadToken; else delete process.env.SLACK_BOT_TOKEN;
    }
  });

  check('the block is a cool-off, not a permanent ban', () => {
    // Someone may invite the bot; the channel must recover without a redeploy.
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'lib', 'slack.js'), 'utf8');
    assert(/UNREACHABLE_COOLOFF_MS/.test(src), 'no cool-off, so a fixed channel stays blocked forever');
    assert(/is readable again/.test(src), 'recovery is not reported');
    return 'recovers after the cool-off';
  });

  // --- 4e6. Root refuses bypassPermissions --------------------------------
  // Confirmed in the shipped CLI binary: it carries "cannot be used with root"
  // and names --permission-mode bypassPermissions as one of the refused forms.
  // The container has no USER directive, so every Slack video died in research
  // with exit 1 while the identical command worked on a laptop.
  console.log('\n3e6. root vs bypassPermissions (was: exit 1 before any model call, only in the container)');

  check('the image tells Claude Code it is already sandboxed', () => {
    const df = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
    assert(/^ENV IS_SANDBOX=1$/m.test(df), 'IS_SANDBOX is not set, so root will be refused again');
    return 'IS_SANDBOX=1';
  });

  check('a root refusal falls back instead of failing the run', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'llm-cli.js'), 'utf8');
    assert(/ROOT_PERMISSION_REFUSAL_RE/.test(src), 'no detection of the root refusal');
    assert(/argsFor\('default'\)/.test(src), 'no retry with a usable permission mode');
    // Safe only because no tools are permitted in the first place.
    assert(/'--allowed-tools', ''/.test(src), 'tools are allowed, so dropping the bypass could prompt');
    return 'detects + retries';
  });

  check('a command error leads with the cause, not 1500 chars of prompt', () => {
    // claude -p carries the system prompt in argv; echoing it first pushed the
    // real stderr past the end of the Slack message.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'shell.js'), 'utf8');
    assert(src.includes('while running:'), 'the command is no longer demoted below the cause');
    assert(src.includes('full.length > 220'), 'the command echo is not truncated');
    // Behavioural, not just textual: a huge argv must not push the cause out.
    const fn = (src.match(/const tail = [\s\S]*?\n      \}/) || [])[0];
    assert(fn && fn.indexOf('${tail}') < fn.indexOf('while running'),
      'the cause does not come before the command in the message');
    return 'cause first, command truncated';
  });

  // --- 4e7. The topic the human asked for is the topic that gets made -----
  console.log('\n3e7. request parsing (was: a one-word topic silently became a folder name)');

  check('a question ABOUT the series is not an answer to it', () => {
    const { parseFollowUp } = require('../server/lib/parse');
    // Seen in production: "follow-up accepted: 'ai in 2030' / name" -- a video
    // filed under a series literally called `name`.
    const out = parseFollowUp('what should the series name be?');
    assert(!out.series, `parsed a series from a question: ${JSON.stringify(out)}`);
    for (const q of ['which series should it be?', 'what series do we use?', 'is the series evals or fol?']) {
      const r = parseFollowUp(q);
      assert(!r.series || r.series === 'evals' || r.series === 'fol',
        `question "${q}" produced a bogus series ${JSON.stringify(r)}`);
    }
    return 'questions are not answers';
  });

  check('a bare reply answers the question that was ASKED, not always "series"', () => {
    const { parseFollowUp } = require('../server/lib/parse');
    // "checklists" is a topic when a topic was asked for, and a series when a
    // series was. Guessing meant a short topic became a folder and the video was
    // never about what the person wanted.
    assert(parseFollowUp('checklists', { needs: ['topic'] }).topic === 'checklists',
      'a one-word TOPIC was not accepted as a topic');
    assert(parseFollowUp('checklists', { needs: ['series'] }).series === 'checklists',
      'a one-word SERIES was not accepted as a series');
    assert(parseFollowUp('how agents use memory', { needs: ['topic'] }).topic === 'how agents use memory',
      'a multi-word topic reply was dropped');
    return 'context decides';
  });

  check('tick tells the parser which field it actually asked for', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'lib', 'tick.js'), 'utf8');
    assert(/parseFollowUp\(r\.text, \{ needs \}\)/.test(src),
      'the follow-up parser is still called without context');
    assert(/if \(!t\.series\) needs\.push\('series'\)/.test(src), 'missing series is not requested');
    assert(/if \(stub\) needs\.push\('topic'\)/.test(src), 'missing topic is not requested');
    return 'context passed';
  });

  check('a fully specified request still parses exactly as asked', () => {
    const { parseRequest } = require('../server/lib/parse');
    const cases = [
      ['<@U1> make a video about why a checklist beats a careful reader, series: evals',
       'why a checklist beats a careful reader', 'evals'],
      ['<@U1> make a video on prompt injection, series evals', 'prompt injection', 'evals'],
      ['<@U1> create an explainer about how agents use memory, series: memory',
       'how agents use memory', 'memory'],
      ['<@U1> build a lesson on what a rubric actually does series evals',
       'what a rubric actually does', 'evals'],
    ];
    for (const [text, topic, series] of cases) {
      const r = parseRequest(text);
      assert(r.ok, `refused a valid request: ${text}`);
      assert(r.topic === topic, `topic came out as "${r.topic}", asked for "${topic}"`);
      assert(r.series === series, `series came out as "${r.series}", asked for "${series}"`);
    }
    return `${cases.length} phrasings exact`;
  });

  // --- 4f. Human review before YouTube -------------------------------------
  console.log('\n3f. the human review gate (was: QA pass -> straight to YouTube)');

  check('review sits between qa and upload in the chain', () => {
    const { STAGE_ORDER } = require('./lib/spine');
    assert(STAGE_ORDER.indexOf('review') === STAGE_ORDER.indexOf('qa') + 1, 'review is not right after qa');
    assert(STAGE_ORDER.indexOf('review') < STAGE_ORDER.indexOf('upload'), 'review is not before upload');
    return STAGE_ORDER.join(' -> ');
  });

  await checkAsync('without an approval the run BLOCKS, it does not publish', async () => {
    const review = require('./lib/stages/review');
    const base = {
      item: { topic: 'x' },
      state: { runId: 'r', interventions: [], spend: { usd: 0 } },
      artifacts: { produce: { finalPath: 'out/x_final.mp4' }, qa: { combined_score: 6.1 } },
      log: () => {},
    };
    let blocked = false;
    try { await review.run({ ...base, opts: { dryRun: false } }); }
    catch (e) { blocked = e.name === 'BlockedError' && /awaiting human review/.test(e.blocker || ''); }
    assert(blocked, 'an unreviewed video was allowed through to upload');
    const ok = await review.run({ ...base, opts: { dryRun: false, reviewApproved: 'Aroma (Slack)' } });
    assert(ok && ok.approved, 'an approved video was still blocked');
    return 'fails closed';
  });

  check('the blocker carries what Slack needs to post', () => {
    // BlockedError destructures only { blocker, planItem, details } -- a sibling key
    // is dropped, and state.finishStage used to flatten the error to its message.
    const { BlockedError } = require('./lib/spine-errors');
    const e = new BlockedError('x', { blocker: 'b', details: { finalPath: 'a.mp4', qaScore: 6 } });
    assert(e.details && e.details.finalPath === 'a.mp4', 'BlockedError drops details');
    const stateSrc = fs.readFileSync(path.join(__dirname, 'lib', 'state.js'), 'utf8');
    assert(/if \(error\.details\) s\.details = error\.details;/.test(stateSrc),
      'finishStage still flattens a blocker to its message');
    return 'carried';
  });

  // A rendered, paid-for lesson was destroyed by the grammar gate that runs AFTER
  // the render: eval-text.js is an LLM judge, it had passed the same beats.js before
  // the spend, and it failed the second time on "Then he asks, have I got that right,
  // and he stops talking." -- narration, where the question mark it wanted cannot be
  // heard. 25 minutes and $0.598, and the finished _final.mp4 was left on disk while
  // the run was settled `failed`. The gate keeps its verdict; it no longer gets to
  // throw the video away on its own.
  // `.beads/runs.jsonl` is the only record of what a course run cost -- the tenant
  // ledger never sees a course at all. So an unrecorded purchase is not a logging gap,
  // it is an under-read invoice. repairArt() bought up to 2 x N images with `--yes` and
  // recorded only an intervention, and estimateSpend cannot catch it either: a repaired
  // image keeps its prompt sidecar, so the cache correctly considers it already bought.
  // The same prices live in two files: produce.js prices the run for the budget gate,
  // and templates/lib/config.js prices it for the generators' own guard. They cannot be
  // a shared import -- the template is COPIED standalone into every video folder, and
  // requiring it here would run its loadDotenv() as a side effect of pricing a video.
  // So the coupling is enforced here instead: an understated estimate would walk a run
  // straight through the budget that was meant to stop it.
  // i2v is the only per-second item: at $0.05/s a few animated beats cost more than
  // every still in the video. qa-clips.js -- which catches frozen and morphed clips --
  // shipped in the templates and was called by nothing, so the most expensive asset was
  // the only ungated one.
  // --- the judge that destroyed a finished lesson ------------------------------
  // 2026-09-19: eval-text.js PASSED a line before the spend and FAILED the same line
  // after the render -- same text, same model, temperature 0 -- and the run was
  // settled `failed` with a complete _final.mp4 sitting on disk. 25.3 min, $0.598.
  // Two independent guards, because either alone would have saved that lesson and
  // neither alone is enough: the cache stops the second ask, the demotion stops the
  // finding mattering.
  const TPL_LIB = path.join(__dirname, '..', '.claude', 'skills', 'creating-explainer-videos',
    'templates', 'lib');

  check('a question mark nobody can hear cannot fail a build', () => {
    const { demoteInaudible } = require(path.join(TPL_LIB, 'spoken-text'));
    // The exact line and the exact verdict, from the queue event.
    const LINE = 'Then he asks, have I got that right, and he stops talking.';
    const kindOf = (t) => (t === LINE ? 'spoken' : 'shown');
    const out = demoteInaudible([{
      text: LINE, severity: 'error',
      problem: 'The sentence is a question but lacks a question mark.',
      suggestion: 'Then he asks, have I got that right?, and he stops talking.',
    }], kindOf);
    assert(out[0].severity === 'nit',
      'the finding that destroyed the LMS lesson is still an error, so it can still kill a run');
    assert(out[0].demoted === true, 'the demotion is not recorded, so nobody can see it happened');
    // Kept, not deleted: a judge that has started flagging inaudible punctuation is
    // itself worth seeing.
    assert(out.length === 1, 'the finding was dropped rather than demoted');
    return 'demoted to a nit, and still reported';
  });

  check('a real error in speech, and any error in drawn text, still fails', () => {
    const { demoteInaudible } = require(path.join(TPL_LIB, 'spoken-text'));
    const SPOKEN = 'proof one change helped';
    const SHOWN = 'Have I got that right';
    const kindOf = (t) => (t === SPOKEN ? 'spoken' : 'shown');
    const out = demoteInaudible([
      // A dropped word IS audible -- the demotion must not reach it.
      { text: SPOKEN, severity: 'error', problem: 'dropped that', suggestion: 'proof that one change helped' },
      // On a drawn card the viewer READS it, so punctuation counts normally.
      { text: SHOWN, severity: 'error', problem: 'missing question mark', suggestion: 'Have I got that right?' },
    ], kindOf);
    assert(out[0].severity === 'error', 'a dropped word in narration was demoted -- that IS audible');
    assert(out[1].severity === 'error', 'punctuation was demoted on text the viewer reads');
    return 'audible errors and drawn text are untouched';
  });

  check('the same text is never judged twice with two different answers', () => {
    const cache = require(path.join(TPL_LIB, 'judge-cache'));
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-judge-'));
    const payload = [{ kind: 'spoken', text: 'a line' }];
    const k = cache.key({ sensor: 'eval-text', judge: 'g', promptVersion: 1, payload });

    assert(cache.get(dir, k) === undefined, 'a cold cache claimed to have a verdict');
    cache.put(dir, k, [], { sensor: 'eval-text' });
    // The post-render ask, with the same input: it must get the pre-spend answer.
    assert(JSON.stringify(cache.get(dir, k)) === '[]', 'the second ask did not reuse the first verdict');

    // Key order must not matter, or the same payload would miss its own entry.
    const k2 = cache.key({ payload, promptVersion: 1, judge: 'g', sensor: 'eval-text' });
    assert(k2 === k, 'the key depends on property order, so identical input can miss');

    // Everything that could change the answer must change the key. A cached verdict
    // served after a prompt rewrite would look like the new rubric agreed with it.
    const changed = [
      ['prompt', { sensor: 'eval-text', judge: 'g', promptVersion: 2, payload }],
      ['model', { sensor: 'eval-text', judge: 'other', promptVersion: 1, payload }],
      ['input', { sensor: 'eval-text', judge: 'g', promptVersion: 1, payload: [{ kind: 'spoken', text: 'b' }] }],
      ['sensor', { sensor: 'qa-art', judge: 'g', promptVersion: 1, payload }],
    ];
    for (const [what, args] of changed) {
      assert(cache.key(args) !== k, `changing the ${what} did not change the cache key`);
    }
    fs.rmSync(dir, { recursive: true, force: true });
    return 'one verdict per input, invalidated by prompt, model and input';
  });

  check('eval-text asks once and enforces the spoken rule in code', () => {
    const src = fs.readFileSync(path.join(TPL_LIB, '..', 'eval-text.js'), 'utf8');
    assert(/cache\.get\(/.test(src) && /cache\.put\(/.test(src),
      'eval-text does not consult the verdict cache, so it can still answer twice');
    assert(/demoteInaudible\(/.test(src),
      'eval-text relies on the prompt alone to spare spoken punctuation -- it did not hold');
    // The prompt says it too, and should keep saying it; the code is the backstop.
    assert(/Punctuation is inaudible/.test(src), 'the prompt lost its spoken-text rule');
    return 'cached, and enforced in code as well as in the prompt';
  });

  check('the clips we pay per second for are actually checked', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    assert(/sensor\('qa-clips\.js'/.test(src),
      'qa-clips.js is never called, so a frozen or morphed clip reaches the learner');
    // It must not be able to DISCARD them: art, voice and the clips themselves are all
    // bought by the time it runs.
    const call = src.match(/sensor\('qa-clips\.js'[^;]*;/);
    assert(call && /blockOnFail:\s*true/.test(call[0]),
      'qa-clips can end the run, discarding paid-for art, voice and clips over one bad clip');
    // And it has to exist where the sensor will look for it.
    const tpl = path.join(__dirname, '..', '.claude', 'skills', 'creating-explainer-videos',
      'templates', 'qa-clips.js');
    assert(fs.existsSync(tpl), 'qa-clips.js is wired in but missing from the templates');
    return 'wired, and blocks rather than discards';
  });

  check('the two copies of the cost table cannot drift apart', () => {
    const grabCost = (file) => {
      const src = fs.readFileSync(file, 'utf8');
      const m = src.match(/const COST = (\{[^}]*\})/);
      assert(m, `no COST table found in ${file}`);
      return eval(`(${m[1]})`);
    };
    const a = grabCost(path.join(__dirname, 'lib', 'stages', 'produce.js'));
    const b = grabCost(path.join(__dirname, '..', '.claude', 'skills',
      'creating-explainer-videos', 'templates', 'lib', 'config.js'));
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    const drift = keys.filter((k) => a[k] !== b[k]);
    assert(drift.length === 0,
      'produce.js and templates/lib/config.js disagree on price: ' +
      drift.map((k) => `${k} ${a[k]} vs ${b[k]}`).join(', '));
    // i2v is the only per-SECOND item and the one that can run away, so it is named
    // explicitly rather than trusted to the loop above.
    assert(typeof a.i2vPerSecond === 'number' && a.i2vPerSecond > 0,
      'i2vPerSecond is missing or zero, so animation would price as free');
    return `${keys.length} prices agree ($${a.imagePerImage}/img, $${a.i2vPerSecond}/s i2v)`;
  });

  check('every paid generator call in produce records what it spent', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    const lines = src.split(/\r?\n/);
    // `--yes` is what turns off the generators' own spend guard (templates/lib/config.js
    // guardSpend), so it marks exactly the lines that can charge the account.
    const paid = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /run\('node',/.test(l) && /'--yes'/.test(l));
    assert(paid.length >= 5,
      `expected at least 5 paid call sites in produce.js, found ${paid.length} -- ` +
      'if one was removed, update this test deliberately rather than losing the guard');
    const WINDOW = 30;
    const unrecorded = paid.filter(({ i }) =>
      !lines.slice(i, i + WINDOW).some((l) => /state\.recordSpend\(/.test(l)));
    assert(unrecorded.length === 0,
      'these paid calls spend without recording it, so the run ledger under-reads: ' +
      unrecorded.map(({ i, l }) => `produce.js:${i + 1} ${l.trim()}`).join('; '));
    return `${paid.length} paid call sites, all recorded`;
  });

  check('a finding AFTER the render parks the video for a person instead of killing the run', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');

    const blockBranch = /if \(blockOnFail\) \{\s*throw new BlockedError\(/.test(src);
    assert(blockBranch,
      'the post-render branch does not throw BlockedError -- RejectedError is settled as '
      + '`failed` by the spine, which discards a finished video and gives the LMS nothing to act on');

    // Scope is the whole point: every sensor BEFORE the spend must still reject, because
    // there is no video to save yet and a rejection there costs nothing.
    //
    // This used to assert exactly one blockOnFail call site, which was the same thing
    // while eval-text was the only sensor past the spend gate. qa-frames is now also
    // past it, so count stopped tracking the rule. Assert the rule itself: a blocking
    // sensor may sit anywhere after the spend gate and nowhere before it.
    const spendGateAt = src.indexOf('--- spend gate');
    assert(spendGateAt !== -1, 'the spend gate marker moved -- this check cannot locate it');
    const callsites = [...src.matchAll(/blockOnFail:\s*true/g)];
    assert(callsites.length >= 1, 'no sensor blocks after the render any more');
    for (const m of callsites) {
      assert(m.index > spendGateAt,
        'a sensor BEFORE the spend gate passes blockOnFail -- there is no video to save '
        + 'yet, so it must reject the script rather than park a run for a person');
    }

    // `blockOnFail` may now travel with `finalRendered`, which says whether a video
    // actually exists when the sensor runs -- so match the option, not the exact
    // object literal.
    const postRender = /await sensor\('eval-text\.js'[^;]*blockOnFail: true[^;]*\);/.test(src);
    assert(postRender, 'the post-render eval-text.js call does not pass blockOnFail');

    const preSpend = /await sensor\('eval-text\.js',[^;]*\{ redraftable: true \}\);/.test(src);
    assert(preSpend, 'the pre-spend eval-text.js call lost `redraftable: true`');

    return 'blocks after the render, still rejects before the spend';
  });

  check('a change request never counts as approval', () => {
    const { reviewVerdict } = require('../server/lib/tick')._internals;
    // "yes but change the ending" as approval publishes the unchanged ending --
    // the one outcome this gate exists to prevent.
    const cases = [
      ['approve', 'approved'], ['approve, no changes needed', 'approved'],
      ['yes but change the ending', 'changes'], ['approve but fix the typo', 'changes'],
      ['reject', 'rejected'], ['do not publish this', 'rejected'],
      ['hmm', 'changes'],
    ];
    for (const [t, want] of cases) {
      const got = reviewVerdict(t);
      assert(got === want, `"${t}" -> ${got}, wanted ${want}`);
    }
    return `${cases.length} phrasings`;
  });

  check('approval reaches the spine, so a re-dispatch can actually publish', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'lib', 'tick.js'), 'utf8');
    assert(/reviewApproved/.test(src), 'tick never passes reviewApproved to the spine');
    assert(/\[reviewed:approved\]/.test(src), 'the approved marker is not read off the ticket');
    return 'wired';
  });

  // --- 4g. Slack says which gates ran --------------------------------------
  console.log('\n3g. Slack reports the evidence (was: a bare QA score)');

  check('the Slack report lists the sensors, not just the score', () => {
    const { sensorLines } = require('../server/lib/tick')._internals;
    const out = sensorLines([
      { ok: true, what: 'the Evals-Grade Visual Standard' },
      { ok: false, what: 'grammar and clarity', detail: '2 errors' },
    ]);
    // A bare score cannot tell you whether the video was inspected or just narrated.
    assert(/✅ the Evals-Grade Visual Standard/.test(out), 'passing sensors are not listed');
    assert(/❌ grammar and clarity — 2 errors/.test(out), 'a failing sensor loses its finding');
    assert(/no quality sensors recorded/.test(sensorLines([])), 'an empty list is not called out');
    return 'listed';
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

  // A redraft that reaches BEHIND where the run started.
  //
  // The Make a Video page writes and gates a script, then produces it as a second,
  // separately-approved call -- so that run starts at `produce` with the script
  // seeded from disk. When a produce sensor sent the script back, the rewind landed
  // on a stage the run was told to skip, so it was skipped again and control fell
  // straight back onto the stage that had just failed. Measured in production: eight
  // redraft rounds inside one second, then REJECTED, and the critique never once
  // reached a writer.
  try {
    let drafts = 0, produces = 0;
    const st = await spine.execute(testItem(), {
      quiet: true, fromStage: 'produce', stopAfter: 'produce',
      seedArtifacts: { script: { title: 't', beats: [] } },
      stageOverrides: {
        script: stub('script', async () => { drafts++; return { title: 't', beats: [] }; }),
        gate: stub('gate', async () => ({ verdict: 'READY' })),
        produce: stub('produce', async () => {
          produces++;
          if (produces === 1) {
            throw new RedraftError('a sensor failed', {
              fromStage: 'script', feedback: ['half-cut prop on beat 03'], verdict: 'NEEDS WORK',
            });
          }
          return { ok: true };
        }),
      },
    });

    // The whole point: the rewind must actually reach the writer. Before the fix
    // it spun eight times in one second without a single draft being made.
    assert(drafts === 1, `the rewind did not run the writer (drafts: ${drafts})`);
    assert(produces === 2, `produce ran ${produces} times, expected 2`);
    assert(st.status === 'done', `run ended ${st.status}, expected done`);
    pass++; console.log('  PASS  a redraft behind --from runs that stage instead of spinning  (1 redraft, then done)');
  } catch (e) {
    failures.push({ name: 'redraft behind --from', message: e.message });
    console.log(`  FAIL  redraft behind --from\n          ${e.message}`);
  }

  // One reviewer must not be able to spend another reviewer's budget.
  //
  // The gate and the produce-stage sensors are two loops that rewind to the same
  // place. Sharing a single count of 8 meant the art sensors could burn six rounds
  // and leave the gate to hit the cap on its ninth -- which is exactly how a
  // 25-minute paid run died holding one specific, fixable blocker ("beat 19
  // describes no physical act") that nothing was allowed to act on.
  try {
    let produceCalls = 0, gateCalls = 0, drafts = 0;
    const st = await spine.execute(testItem(), {
      quiet: true, stopAfter: 'produce',
      stageOverrides: {
        research: stub('research', async () => ({ ok: 1 })),
        script: stub('script', async () => { drafts++; return { title: 't', beats: [] }; }),
        gate: stub('gate', async () => {
          gateCalls++;
          // Two gate rounds early, then produce spends seven of its own: nine
          // requests in total, so a SHARED budget of 8 would reject the ninth.
          if (gateCalls === 2) {
            throw new RedraftError('gate wants a fix', {
              fromStage: 'script', feedback: ['beat 19 has no physical act'], verdict: 'NEEDS WORK',
            });
          }
          return { verdict: 'READY' };
        }),
        produce: stub('produce', async () => {
          produceCalls++;
          if (produceCalls <= 2) {
            throw new RedraftError('a sensor failed', {
              fromStage: 'script', feedback: [`art defect ${produceCalls}`], verdict: 'NEEDS WORK',
            });
          }
          return { ok: true };
        }),
      },
    });
    // Under one shared budget of 8 the gate's 7th and 8th requests would have hit
    // the cap and failed the run. Per reviewer, both are well inside their own.
    assert(st.status === 'done', `run ended ${st.status}: the gate was starved by produce`);
    assert(drafts > 0, 'the rewind never ran the writer');
    assert(produceCalls === 3, `produce ran ${produceCalls} times, expected 3`);
    assert(st.redraftsBy && st.redraftsBy.produce === 2 && st.redraftsBy.gate === 1,
      `budgets not tracked per reviewer: ${JSON.stringify(st.redraftsBy)}`);
    assert(st.redrafts === 3, `total was ${st.redrafts}, expected 3 -- more than a shared cap of 2 allows`);
    pass++; console.log('  PASS  each reviewer gets its own redraft budget  (produce 2, gate 1 = 3 > a shared cap of 2)');
  } catch (e) {
    failures.push({ name: 'per-reviewer redraft budget', message: e.message });
    console.log(`  FAIL  per-reviewer redraft budget\n          ${e.message}`);
  }

  // ...but not an unbounded one: two reviewers handing work back and forth still stops.
  try {
    let calls = 0;
    const st = await spine.execute(testItem(), {
      quiet: true, stopAfter: 'produce',
      stageOverrides: {
        research: stub('research', async () => ({ ok: 1 })),
        script: stub('script', async () => ({ title: 't', beats: [] })),
        gate: stub('gate', async () => {
          calls++;
          throw new RedraftError('never happy', {
            fromStage: 'script', feedback: ['again'], verdict: 'NEEDS WORK',
          });
        }),
        produce: stub('produce', async () => ({ ok: true })),
      },
    });
    assert(st.status === 'failed', `an unresolvable critique ended ${st.status}`);
    assert(calls <= 9, `gate ran ${calls} times; its own cap should have stopped it`);
    pass++; console.log(`  PASS  a reviewer that is never happy still stops  (${calls} rounds, then failed)`);
  } catch (e) {
    failures.push({ name: 'redraft budget still bounded', message: e.message });
    console.log(`  FAIL  redraft budget still bounded\n          ${e.message}`);
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

  // A deterministic validator says the same thing every time. On 2026-09-22 the
  // spine spent its lenient pass -- a third Opus draft, 47 seconds -- on
  // "overlay has no 'tpl'", which strictCanon fails identically, then REJECTED.
  // The lenient pass exists for a judge that may disagree with itself, not for this.
  try {
    let drafts = 0;
    const st = await spine.execute(testItem(), {
      quiet: true, stopAfter: 'gate',
      stageOverrides: {
        research: stub('research', async () => ({ ok: 1 })),
        script: stub('script', async () => {
          drafts++;
          throw new RedraftError('Malformed script:\n  - beat 12: overlay has no \'tpl\'', {
            fromStage: 'script', feedback: ['beat 12: overlay has no tpl'], verdict: 'INVALID_BEATS',
          });
        }),
        gate: stub('gate', async () => ({ verdict: 'READY' })),
      },
    });
    assert(st.status === 'failed', `expected failed, got ${st.status}`);
    assert(drafts === spine.MAX_REDRAFTS + 1,
      `a deterministic validator failure got a lenient re-run: ${drafts} drafts, expected ${spine.MAX_REDRAFTS + 1}`);
    assert(!(st.interventions || []).some((i) => i.kind === 'accepted_with_warning'),
      'the run recorded accepting-with-a-warning for a fault that cannot be waived');
    pass++; console.log('  PASS  a deterministic validator failure is not given a lenient Opus re-run');
  } catch (e) {
    failures.push({ name: 'no lenient pass for INVALID_BEATS', message: e.message });
    console.log(`  FAIL  no lenient pass for INVALID_BEATS\n          ${e.message}`);
  }

  // Both findings from that run are mechanical: a dead overlay is dropped, and a
  // wordless illustration beat borrows its first eight words from its own vo.
  try {
    const { repairBeats, validateBeats } = require(path.join(__dirname, 'lib', 'validate-beats'));
    const beats = [
      { id: '11', mode: 'ali', vo: 'Ali reads the trace.', cap: 'Read the trace' },
      { id: '12', mode: 'ali', vo: 'Ali finds the line where the error actually happened, and stops.', overlay: { data: { x: 1 } } },
      { id: '13', mode: 'scene', vo: 'The room is quiet.', overlay: { tpl: 'nope', data: {} } },
      { id: '14', mode: 'info', vo: 'A question.', info: { tpl: 'quiz', data: { stem: 'q', options: ['a', 'b'], answer: 0 } } },
    ];
    const { beats: fixed, repairs } = repairBeats(beats, ['quiz', 'stat']);
    assert(fixed[0] === beats[0] || JSON.stringify(fixed[0]) === JSON.stringify(beats[0]), 'a valid beat was changed');
    assert(!fixed[1].overlay, 'the tpl-less overlay was kept');
    assert(fixed[1].cap && fixed[1].cap.split(/\s+/).length <= 8 && /^Ali finds the line/.test(fixed[1].cap),
      `no caption synthesised from vo: ${JSON.stringify(fixed[1].cap)}`);
    assert(!fixed[2].overlay && fixed[2].cap === 'The room is quiet', `unknown-template overlay: ${JSON.stringify(fixed[2])}`);
    assert(JSON.stringify(fixed[3]) === JSON.stringify(beats[3]), 'an info beat was touched');
    assert(repairs.length === 4 && repairs.every((r) => /beat 1[23]/.test(r)), `repairs: ${JSON.stringify(repairs)}`);
    const v = validateBeats(fixed, '/nonexistent', { strictCanon: true });
    const overlayErrors = v.errors.filter((e) => /overlay|draws art and no text/.test(e));
    assert(overlayErrors.length === 0, `repaired beats still fail: ${overlayErrors.join(' | ')}`);
    pass++; console.log(`  PASS  repairBeats fixes the beat-12 shape for free  (${repairs.length} repairs)`);
  } catch (e) {
    failures.push({ name: 'repairBeats', message: e.message });
    console.log(`  FAIL  repairBeats\n          ${e.message}`);
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
    // The cap came DOWN to 2, and what happens at the cap changed with it.
    // Rounds three onward almost never settled a point the first two had not,
    // and each cost a writer call, a gate call and a slice of produce. The run
    // no longer dies there: one lenient pass accepts the work and carries the
    // unresolved finding to the human review step.
    const cap = Number((spineSrc.match(/MAX_REDRAFTS = (\d+)/) || [])[1]);
    assert(cap >= 2 && cap <= 4, `redraft cap is ${cap}; expected a small number with a lenient pass behind it`);
    assert(/st\.lenient = true/.test(spineSrc),
      'there is no lenient pass -- an unsettled critique still ends the run');
    assert(/accepted_with_warning/.test(spineSrc),
      'accepting with a warning is not recorded as an intervention');
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
    // A runner without the Claude CLI installed is not a regression in shell.js.
    // ENOENT means the binary is absent, which is the normal state of CI; anything
    // else means the call was made and went wrong, and that still fails.
    if (/ENOENT/.test(e.message)) {
      skipped++;
      console.log('  SKIP  live: no "waiting on stdin" warning from claude  (claude CLI not installed)');
    } else {
      failures.push({ name: 'stdin warning', message: e.message.split('\n')[0] });
      console.log(`  FAIL  stdin warning\n          ${e.message.split('\n')[0]}`);
    }
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

  // The gate never drifted -- qa.js has always enforced 4.9. What drifted was
  // everything that TELLS the judge what the bar is. qa.js:85 hands it
  // threshold: 4.9 in the input while the system prompt said the default was 6.0
  // and asked for a CONDITIONAL_PASS band at 4.5 that no live code can even accept.
  // Two numbers, one model, every run. Nothing caught it because no test had ever
  // asserted the value -- changing THRESHOLD broke nothing.
  const qaStage = require('./lib/stages/qa');
  const promptSrc = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'quality_rating.txt'), 'utf8');

  check('the judge prompt states the threshold the code enforces, and no other', () => {
    assert(typeof qaStage.THRESHOLD === 'number', 'qa.js no longer exports THRESHOLD');
    assert(promptSrc.includes(String(qaStage.THRESHOLD)),
      `the prompt never states the enforced bar ${qaStage.THRESHOLD}`);
    // Any other bar-shaped number in the prompt is a second instruction to the judge.
    for (const stale of ['6.0', '4.5']) {
      assert(!promptSrc.includes(stale),
        `the prompt still names ${stale} as a bar -- the judge is told two different thresholds`);
    }
    assert(!/CONDITIONAL/i.test(promptSrc),
      'the prompt asks for a CONDITIONAL_PASS again; qa.js is strictly PASS/FAIL');
    // Assert the SHAPE, not the prose: qa.js's own comment discusses CONDITIONAL_PASS
    // as history, and a string match would fail on the explanation of the bug. What
    // matters is that the schema cannot carry a verdict at all -- the model scores,
    // the caller decides.
    assert(!('status' in qaStage.SCHEMA.properties),
      'the schema accepts a status field again -- the judge should score, not rule');
    return `one bar: ${qaStage.THRESHOLD}`;
  });

  // Across the ratings on file the judge hedged about unobservability in 6 of 7
  // notes; `visuals` was the lowest-mean factor and most often named weakest -- the
  // one factor it was structurally unable to observe. Both escapes it was offered
  // were wrong: neutral 0.7s across seven factors sum to 4.9, the pass mark exactly,
  // and scoring the unobservable at 0.0 failed a sound video at 2.2/7.0.
  check('a factor nobody could assess neither rescues nor condemns a video', () => {
    const { combine } = qaStage._internals;

    // Seven hedges used to land exactly on the bar. Now four real scores decide it.
    const hedged = combine({
      accuracy: 0.9, objectives_coverage: 0.9, storytelling: 0.9, qa_at_each_step: 0.9,
      post_production: null, voiceover_quality: null, visuals: null,
    });
    assert(hedged.score === 6.3, `expected the assessed mean scaled to 7, got ${hedged.score}`);
    assert(hedged.excluded.length === 3, 'the excluded factors are not reported');

    // And the 2.2: four factors zeroed purely for being unobservable.
    const zeroed = combine({
      accuracy: 0.9, objectives_coverage: 0.7, storytelling: 0.6,
      post_production: null, visuals: null, voiceover_quality: null, qa_at_each_step: null,
    });
    assert(zeroed.score >= qaStage.THRESHOLD,
      `a video with three sound scores still fails at ${zeroed.score} -- this is the 2.2 again`);

    // A genuinely weak video must still fail. The exclusion is not a way through.
    const weak = combine({ accuracy: 0.3, objectives_coverage: 0.3, storytelling: 0.4, visuals: null });
    assert(weak.score < qaStage.THRESHOLD, `a weak video passed at ${weak.score}`);

    // Nothing assessable at all is not a score. The caller blocks instead.
    assert(combine({ accuracy: null, visuals: null }).score === null,
      'with no evidence at all it still produced a number');
    return 'excluded, not guessed; the scale still reads out of 7';
  });

  check('visuals is scored by the gates that looked, not by the judge that could not', () => {
    const { deriveVisuals } = qaStage._internals;
    assert(!qaStage.JUDGED_FACTORS.includes('visuals'),
      'the judge is still asked to score what it is told it cannot see');
    assert(!('visuals' in qaStage.SCHEMA.properties.factors.properties),
      'the schema still accepts a visuals score from the judge');
    assert(qaStage.FACTORS.includes('visuals'),
      'visuals vanished from the rubric entirely -- it should be derived, not dropped');

    assert(deriveVisuals([{ sensor: 'qa-art.js', ok: true }]) === 1.0, 'a clean vision verdict did not score');
    assert(deriveVisuals([{ sensor: 'qa-art.js', ok: true }, { sensor: 'qa-frames.js', ok: false }]) === 0.4,
      'a gate objected to the pictures and visuals still scored clean');
    assert(deriveVisuals([{ sensor: 'qa-art.js', ok: false, accepted: true }]) === 0.6,
      'a finding carried through under lenient should not read as a clean pass');
    // Nobody looked, or every gate was unavailable: excluded, never invented.
    assert(deriveVisuals([]) === null, 'visuals was scored with no visual evidence at all');
    assert(deriveVisuals([{ sensor: 'qa-art.js', ok: null }]) === null,
      'an unavailable judge was read as evidence about the pictures');
    return 'derived from qa-art and qa-frames, or excluded';
  });

  check('the prompt asks for exactly the fields the schema accepts', () => {
    for (const k of qaStage.SCHEMA.required) {
      assert(promptSrc.includes(`- ${k}:`),
        `the schema requires ${k} but the prompt never asks for it -- weakest_factor went unexplained for months`);
    }
    // Fields the prompt used to demand that qa.js silently drops.
    for (const ghost of ['minimum_threshold', 'remediation_required', 'passing_factors',
      'low_scoring_factors', 'failing_factors']) {
      assert(!promptSrc.includes(ghost),
        `the prompt still asks for ${ghost}, which the schema forbids -- two output contracts in one context`);
    }
    return `${qaStage.SCHEMA.required.length} fields, matched`;
  });

  check('the standards agree with the code about the bar', () => {
    const bar = String(qaStage.THRESHOLD);
    for (const rel of [['..', 'CLAUDE.md'], ['..', '.claude', 'standards', 'QA_RATING_SYSTEM.md']]) {
      const p = path.join(__dirname, ...rel);
      const src = fs.readFileSync(p, 'utf8');
      assert(src.includes(bar), `${rel[rel.length - 1]} does not state the enforced bar ${bar}`);
      assert(!/minimum 6\.0|≥6\.0|6\.0\/7\.0/.test(src),
        `${rel[rel.length - 1]} still states 6.0 as the minimum`);
    }
    return `CLAUDE.md + QA_RATING_SYSTEM.md at ${bar}`;
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

// ── 11. a course outlives the process that started it ─────────────────────────
//
// Three bugs, all of which cost money rather than correctness:
//   - the queue was wiped on redeploy, so a course could not survive its build;
//   - a lesson was never marked 'claimed', so a restart re-picked it and the
//     first attempt's ~$1.50 vanished with no record;
//   - queue.setStatus was never exported, so approve() and reject() -- the whole
//     point of a course pausing for a human -- threw TypeError on every call.

async function referenceChecks() {
  const refs = require('./lib/stages/references');
  const { validateReferences } = require('./lib/validate-references');
  const { validateReferenceUrl } = require('./lib/verify-url');

  const ctx = (item, extra) => ({
    item,
    state: { spend: { usd: 0, calls: [] } },
    artifacts: { research: { slo: 'x' }, script: { title: 'A subtopic' } },
    opts: { dryRun: false },
    log: () => {},
    ...(extra || {}),
  });

  await checkAsync('a lesson that did not ask for references buys no search', async () => {
    // The guard that keeps this feature free for every course that never wanted
    // it. If this regresses, every lesson on the platform starts paying for a web
    // search nobody asked for -- and it would not show up as a failure, only as a
    // bill.
    let searched = false;
    const llm = require('./lib/llm');
    const real = llm.askWithSearch;
    llm.askWithSearch = async () => { searched = true; return { text: 'x', searches: 1 }; };
    try {
      const out = await refs.run(ctx({ topic: 't' }));
      assert(!searched, 'it searched for a lesson that never asked');
      assert(Array.isArray(out.references) && out.references.length === 0, 'returned references anyway');
      assert(out.skipped === 'not requested', 'did not say why it skipped');
    } finally {
      llm.askWithSearch = real;
    }
    return 'no search, empty list';
  });

  await checkAsync('references never fail a lesson, whatever goes wrong', async () => {
    // The stage sits before produce. A throw here would stop a build that was
    // about to succeed, over a feature whose absence costs a learner nothing.
    const llm = require('./lib/llm');
    const real = llm.askWithSearch;
    const failures = [
      new Error('network is down'),
      new llm.LlmUnavailableError('no credential'),
    ];
    try {
      for (const err of failures) {
        llm.askWithSearch = async () => { throw err; };
        const out = await refs.run(ctx({ topic: 't', wantReferences: true }));
        assert(Array.isArray(out.references), `threw instead of returning on: ${err.message}`);
        assert(out.references.length === 0, 'invented references out of a failure');
      }
    } finally {
      llm.askWithSearch = real;
    }
    return 'every failure returns an empty list';
  });

  await checkAsync('an answer produced without searching is thrown away', async () => {
    // The whole feature rests on the URLs having been looked up. A model that
    // answers from memory returns plausible, well-formed, dead links -- which is
    // the exact outcome the consumer said would make them keep the toggle off.
    const llm = require('./lib/llm');
    const real = llm.askWithSearch;
    llm.askWithSearch = async () => ({
      text: 'Some Real Looking Doc\nhttps://example.com/a\ndocs\nBecause it is good.',
      searches: 0,
    });
    try {
      const out = await refs.run(ctx({ topic: 't', wantReferences: true }));
      assert(out.references.length === 0, 'kept references from a model that never searched');
      assert(out.skipped === 'did not search', 'did not record why');
    } finally {
      llm.askWithSearch = real;
    }
    return 'unsearched answers are discarded';
  });

  check('a reference that is not the right shape never reaches the network', () => {
    const { references, dropped } = validateReferences([
      { title: 'Good', url: 'https://example.com/a', why: 'Worth it.', kind: 'docs' },
      { title: 'No url', why: 'x', kind: 'docs' },
      { title: 'No reason', url: 'https://example.com/b', kind: 'docs' },
      { title: 'Odd kind', url: 'https://example.com/c', why: 'x', kind: 'newsletter' },
      { title: 'Dupe', url: 'https://example.com/a/', why: 'x', kind: 'docs' },
      'not an object',
    ]);
    assert(references.length === 2, `kept ${references.length}, expected 2`);
    assert(references[1].kind === 'article', 'an unknown kind was not mapped onto a known one');
    assert(dropped.some((d) => d.why === 'duplicate url'), 'the duplicate url survived');
    return '2 kept, unknown kind mapped, duplicate dropped';
  });

  check('a URL we would be unsafe to fetch is refused before any request', () => {
    // These are attacker-chosen strings: they come out of a model, and we fetch
    // them from our own server. 169.254.169.254 is the cloud metadata address.
    const unsafe = [
      'http://example.com/x',
      'https://user:pw@example.com/',
      'https://example.com:8080/x',
      'https://127.0.0.1/x',
      'https://169.254.169.254/latest/meta-data/',
      'https://10.0.0.5/internal',
      'nonsense',
    ];
    for (const u of unsafe) {
      assert(!validateReferenceUrl(u).ok, `would have fetched ${u}`);
    }
    assert(validateReferenceUrl('https://example.com/ok').ok, 'refused an ordinary https URL');
    return `${unsafe.length} refused, a normal URL allowed`;
  });

  check('the references stage cannot block or fail a run', () => {
    // maxAttempts 1 and no BlockedError anywhere: a retry would buy a second
    // search for the same answer, and a block would park a lesson for a person
    // over a reading list.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'references.js'), 'utf8');
    assert(/maxAttempts:\s*1/.test(src), 'references retries, and a retry re-buys the search');
    assert(!/BlockedError|RejectedError|RedraftError/.test(src), 'references can stop a run');
    const spine = fs.readFileSync(path.join(__dirname, 'lib', 'spine.js'), 'utf8');
    assert(/'gate', 'references', 'produce'/.test(spine),
      'references is not between the gate and produce');
    return 'one attempt, no control-flow errors, placed before the money';
  });

  check('the CLI search offers WebSearch as well as permitting it', () => {
    // Measured, not assumed: with only --allowedTools the tool is permitted but
    // never OFFERED, so the model answers from memory, emits plausible URLs and
    // reports success. That is the exact failure this whole feature exists to
    // prevent, and it is invisible unless both flags are asserted.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'llm-cli.js'), 'utf8');
    assert(/'--tools',\s*'WebSearch'/.test(src), 'WebSearch is permitted but never offered');
    assert(/'--allowedTools',\s*'WebSearch'/.test(src), 'WebSearch is offered but not permitted');
    assert(/'--output-format',\s*'stream-json'/.test(src),
      'the plain envelope cannot prove a search ran; stream-json is what carries the tool calls');
    // And the no-tools guard on the JSON path must be untouched by all of this.
    assert(/'--allowed-tools',\s*''/.test(src), 'the thinking stages lost their no-tools guard');
    return 'both flags, streamed, and askJson still runs with no tools at all';
  });

  await checkAsync('the search count is counted from the streamed tool calls', async () => {
    // references.js throws away any answer produced without searching, so this
    // number is load-bearing: report it wrongly and invented URLs get treated as
    // researched ones. It cannot come from usage.server_tool_use -- that counts
    // the API's server-side tool and stays 0 for the CLI's WebSearch.
    const cli = require('./lib/llm-cli');
    const shell = require('./lib/shell');
    const realRun = shell.run;
    const frame = (name) => JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'tool_use', name, input: {} }] },
    });
    const result = JSON.stringify({
      type: 'result', subtype: 'success', is_error: false,
      result: 'some prose with a url', total_cost_usd: 0,
    });
    try {
      shell.run = async () => ({ code: 0, stderr: '', stdout: [frame('WebSearch'), frame('WebSearch'), result].join('\n') });
      const two = await cli.askWithSearch({ promptName: 'video_references_search', input: 'x' });
      assert(two.searches === 2, `counted ${two.searches} searches, not 2`);
      assert(two.text === 'some prose with a url', 'lost the answer');

      // A run that called some OTHER tool has still not searched.
      shell.run = async () => ({ code: 0, stderr: '', stdout: [frame('Read'), result].join('\n') });
      const none = await cli.askWithSearch({ promptName: 'video_references_search', input: 'x' });
      assert(none.searches === 0, 'counted a non-search tool call as a search');
    } finally {
      shell.run = realRun;
    }
    return 'two WebSearch calls counted as two; another tool counted as none';
  });

  await checkAsync('the search runs outside the repo, where there are no settings to inherit', async () => {
    // Found only in production. Claude Code reads the working directory's
    // .claude/settings.json, and once a tool is PERMITTED it also requires the
    // workspace to have been trusted -- which a container never has. From /app it
    // exited 1 with "this workspace has not been trusted" and the stage
    // fail-softed to no references, i.e. the original bug in a new costume. Local
    // runs pass either way, so only an assertion keeps this fixed.
    const cli = require('./lib/llm-cli');
    const shell = require('./lib/shell');
    const realRun = shell.run;
    let sawCwd = null;
    try {
      shell.run = async (_cmd, _args, opts) => {
        sawCwd = opts && opts.cwd;
        return {
          code: 0,
          stderr: '',
          stdout: JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'x' }),
        };
      };
      await cli.askWithSearch({ promptName: 'video_references_search', input: 'x' });
      assert(sawCwd, 'the search ran with no cwd, so it inherits the repo it happens to start in');
      assert(!path.resolve(sawCwd).startsWith(path.resolve(__dirname, '..')),
        `the search ran inside the repo (${sawCwd}), where .claude/settings.json blocks it`);
    } finally {
      shell.run = realRun;
    }
    return `runs in ${sawCwd}, not the repo`;
  });

  await checkAsync('a search without an API key goes to the CLI instead of returning nothing', async () => {
    // The regression that shipped the feature switched off: this threw, so every
    // lesson this deployment ever built got an empty reference list.
    const llm = require('./lib/llm');
    const cli = require('./lib/llm-cli');
    const realCli = cli.askWithSearch;
    const key = process.env.ANTHROPIC_API_KEY;
    const authTok = process.env.ANTHROPIC_AUTH_TOKEN;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    let viaCli = false;
    cli.askWithSearch = async () => { viaCli = true; return { text: 'prose', searches: 1 }; };
    try {
      const out = await llm.askWithSearch({ promptName: 'video_references_search', input: 'x' });
      assert(viaCli, 'it did not fall back to the CLI');
      assert(out.searches === 1 && out.text === 'prose', 'lost the CLI answer');
    } finally {
      cli.askWithSearch = realCli;
      if (key !== undefined) process.env.ANTHROPIC_API_KEY = key;
      if (authTok !== undefined) process.env.ANTHROPIC_AUTH_TOKEN = authTok;
    }
    return 'no key means search on the CLI, not silence';
  });
}

function browserChecks() {
  check('the gates are told where Chrome is, in the variable Puppeteer reads', () => {
    // This cost every course lesson its render. PUPPETEER_EXECUTABLE_PATH is the
    // variable Puppeteer resolves against; CHROME_PATH is a Lighthouse convention
    // it has never read. With the skip-download flags set and neither of those
    // pointing anywhere, Puppeteer looked for a chrome-headless-shell that the
    // image deliberately does not ship, and exited 1 AFTER the art was bought.
    const df = fs.readFileSync(path.join(PATHS_REPO, 'Dockerfile'), 'utf8');
    assert(/PUPPETEER_EXECUTABLE_PATH=\/usr\/bin\/chromium/.test(df),
      'the Dockerfile does not set PUPPETEER_EXECUTABLE_PATH');
    assert(/PUPPETEER_SKIP_DOWNLOAD=1/.test(df),
      'the skip flag went away; Puppeteer would download its own Chrome');
    assert(/chromium/.test(df) && /apt-get install/.test(df),
      'no system chromium is installed for that path to point at');
    return 'PUPPETEER_EXECUTABLE_PATH set, system chromium installed';
  });

  check('every frame gate can launch a browser on a container', () => {
    // Belt-and-braces to the Dockerfile: a gate copied into a video folder and run
    // somewhere else must still find a browser rather than fail after the spend.
    const files = [path.join(PATHS_REPO, '.claude', 'skills', 'creating-explainer-videos',
      'templates', 'qa-frames.js')];
    const vids = path.join(PATHS_REPO, 'explainer-videos');
    const walk = (d, depth) => {
      if (depth > 3) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const p = path.join(d, e.name);
        if (e.name === 'node_modules') continue;
        const g = path.join(p, 'qa-frames.js');
        if (fs.existsSync(g)) files.push(g);
        walk(p, depth + 1);
      }
    };
    if (fs.existsSync(vids)) walk(vids, 1);

    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const rel = path.relative(PATHS_REPO, f).split(path.sep).join('/');
      assert(/executablePath/.test(src), `${rel} launches Chrome without an executablePath`);
      assert(!/headless:\s*'shell'/.test(src),
        `${rel} asks for headless 'shell', which needs a binary the image does not ship`);
      assert(/--disable-dev-shm-usage/.test(src),
        `${rel} omits --disable-dev-shm-usage; a container's /dev/shm is small`);
    }
    return `${files.length} frame gate(s) can find a browser`;
  });

  check('nothing is bought before the machine is asked if it can render', () => {
    // Twice in two days a run bought art and voice and then stopped on something
    // that was already false before it started -- a Chrome nobody had installed.
    // Every one of those facts was knowable for nothing, so they are now asked
    // first, and the check sits ABOVE every paid call in produce.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');

    const pf = src.indexOf("require('../preflight')");
    assert(pf > 0, 'produce no longer runs a preflight');

    // Above the money. If a paid call can run first, the guard is decoration.
    for (const paid of ['generate-lesson-art', 'tts-lesson.js']) {
      const at = src.indexOf(paid);
      assert(at < 0 || pf < at, `preflight runs AFTER ${paid} -- the spend would already have happened`);
    }

    // And it must stop the run, not merely log.
    const after = src.slice(pf, pf + 1200);
    assert(/BlockedError/.test(after), 'a failed preflight does not stop the run');
    assert(/code: 'preflight'/.test(after),
      'a failed preflight does not carry its own code -- a broken deploy would read as a video problem');
    return 'preflight runs first, blocks, and is coded as infrastructure';
  });

  check('the preflight checks the things that actually broke', () => {
    // Written against the real failures rather than a guess at what might break:
    // a browser Puppeteer could not resolve, and a store that looked durable and
    // was not. A launch, not a `which` -- the binary was never missing, the
    // RESOLUTION was, because Puppeteer reads PUPPETEER_EXECUTABLE_PATH and the
    // image set CHROME_PATH.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'preflight.js'), 'utf8');
    assert(/puppeteer\.launch/.test(src), 'it does not actually launch a browser');
    assert(/PUPPETEER_EXECUTABLE_PATH/.test(src), 'it does not check the variable Puppeteer reads');
    assert(/ffmpeg/i.test(src) && /python/i.test(src), 'ffmpeg or python is unchecked');
    assert(/durability === 'volume'/.test(src), 'it does not notice a non-durable store');

    // A third outcome, so "could not measure" never reads as "fine". The suite
    // learned this the hard way: a skip that counts as a pass is how a check
    // quietly stops checking.
    assert(/ok: null/.test(src), 'every check is pass/fail -- unknown must be its own answer');
    return 'launches a browser, checks ffmpeg/python/store, and reports unknown as unknown';
  });

  check('a finished lesson is copied somewhere a redeploy cannot reach', () => {
    // The failure this prevents actually happened: a lesson an instructor paid for
    // lived only in a directory .dockerignore excludes, a redeploy landed, and the
    // video and its questions went together with no copy anywhere.
    const os = require('os');
    const { execFileSync } = require('child_process');
    const store = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cqvol-')), 'cq-jobs');

    // A fresh module registry, so the job store resolves against this fake volume
    // rather than whatever the suite has already cached.
    const run = (code) => {
      const out = execFileSync(process.execPath, ['-e', code], {
        env: { ...process.env, JOB_STORE_DIR: store, JOB_STORE_DURABLE: '1' },
        cwd: PATHS_REPO, encoding: 'utf8',
      });
      return JSON.parse(out.trim().split('\n').pop());
    };

    const vid = fs.mkdtempSync(path.join(os.tmpdir(), 'vid-'));
    fs.writeFileSync(path.join(vid, 'x_final.mp4'), Buffer.alloc(2048, 3));
    fs.writeFileSync(path.join(vid, 'beats.js'), 'module.exports=[];');
    fs.writeFileSync(path.join(vid, 'durations.json'), '{}');

    const j = JSON.stringify;
    const saved = run(`const d=require('./orchestrator/lib/deliverables');`
      + `const r=d.persist({series:'s',slug:'g',finalPath:${j(path.join(vid, 'x_final.mp4'))},`
      + `videoDir:${j(vid)}});console.log(JSON.stringify({ok:r.ok,files:r.files}))`);
    assert(saved.ok, 'a finished lesson was not persisted to a durable store');

    // beats.js as well as the mp4. A video whose beats.js died is playable and
    // unanswerable -- that is how a catalogue row disappears rather than going stale.
    for (const f of ['x_final.mp4', 'beats.js', 'durations.json']) {
      assert(saved.files.includes(f), `${f} was not kept -- the questions or timing would be lost`);
    }

    // Survives the render directory being destroyed, which is what a redeploy does.
    fs.rmSync(vid, { recursive: true, force: true });
    const found = run(`const d=require('./orchestrator/lib/deliverables');`
      + `console.log(JSON.stringify({found:Boolean(d.find('s','g'))}))`);
    assert(found.found, 'the copy did not survive the render directory being deleted');

    const gone = run(`const d=require('./orchestrator/lib/deliverables');d.forget('s','g');`
      + `console.log(JSON.stringify({found:Boolean(d.find('s','g'))}))`);
    assert(!gone.found, 'forget() left the copy behind');

    fs.rmSync(store, { recursive: true, force: true });
    return 'mp4 + beats + durations kept, survive the render dir, and can be dropped';
  });

  check('nothing is persisted to a store that is not durable', () => {
    // Copying to a container path costs disk and buys nothing, and reporting
    // success for it is how somebody comes to believe a video is safe when the
    // next deploy will take it.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'deliverables.js'), 'utf8');
    assert(/durability !== 'volume'/.test(src), 'it no longer checks for a real volume');
    assert(/writable === false/.test(src), 'a read-only volume would be treated as writable');
    assert(/NOT persisted/.test(src), 'a skip is silent -- it must say so');
    return 'volume-only, writable-only, and it says when it declines';
  });

  check('our copy is dropped only when the consumer says so', () => {
    // The whole point of keeping it. A GET that failed halfway must never be read
    // as "they have it now" -- that would destroy the last copy of a paid render.
    const src = fs.readFileSync(path.join(PATHS_REPO, 'server', 'lib', 'api.js'), 'utf8');
    assert(/router\.delete\('\/courses\/:courseId\/lessons\/:lessonId\(\*\)\/file'/.test(src),
      'there is no explicit delete for a collected deliverable');
    const getIdx = src.indexOf("router.get('/courses/:courseId/lessons/:lessonId(*)/file'");
    const delIdx = src.indexOf("router.delete('/courses/:courseId/lessons/:lessonId(*)/file'");
    assert(getIdx > 0 && delIdx > getIdx, 'expected the GET and DELETE routes to both exist');
    const getBody = src.slice(getIdx, delIdx);
    assert(!/forget\(/.test(getBody), 'the GET route deletes the copy -- a failed download loses it');
    return 'GET never forgets; DELETE is explicit';
  });

  check('a paid render reaches the volume even if the last gate blocks it', () => {
    // THE BUG THE LMS FOUND. The mp4 persist used to sit AFTER the eval-text
    // sensor, and that sensor blocks by throwing -- so a lesson that blocked there
    // jumped straight past the copy. The only copy of a finished, paid render
    // stayed in a directory .dockerignore excludes, one redeploy from gone: the
    // exact loss this module was written to prevent, reproduced by it.
    //
    // Source-level because the ordering IS the guarantee -- there is no observable
    // difference until a sensor happens to fail in production, which is precisely
    // how it went unnoticed.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    // lastIndexOf on both: 'verify.js' and eval-text each appear earlier in prose
    // and in the pre-spend call, and anchoring on the first occurrence compared the
    // wrong pair entirely.
    const persistIdx = src.indexOf('finalPath, videoDir: dir');
    const evalIdx = src.lastIndexOf("sensor('eval-text.js'");
    assert(persistIdx > 0, 'the mp4 persist call is gone');
    assert(evalIdx > 0, 'the post-render eval-text sensor is gone');
    assert(persistIdx < evalIdx,
      'the mp4 is persisted AFTER a gate that can block -- a block there loses the render');
    return 'the render is on the volume before the last gate can stop the run';
  });

  check('a gate that runs before the render does not claim one happened', () => {
    // `finalRendered: true` was hardcoded into every blocking sensor, and two of
    // the three run BEFORE compile-lesson.js. So a lesson blocked at qa-frames
    // reported a finished render that had never been made -- which is what sent
    // the LMS looking for bytes that did not exist, and what our own API reference
    // then repeated back to them as fact.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    assert(!/finalRendered:\s*true\s*\}/.test(src.slice(src.indexOf('if (blockOnFail)'),
      src.indexOf('if (blockOnFail)') + 600)),
    'the block still hardcodes finalRendered: true');
    assert(/finalRendered\s*=\s*false\s*\}\s*=\s*\{\}/.test(src),
      'finalRendered is not a sensor option defaulting to false');
    // The pre-render gates must not opt in.
    const framesCall = src.slice(src.indexOf("sensor('qa-frames.js'"), src.indexOf("sensor('qa-frames.js'") + 200);
    assert(!/finalRendered:\s*true/.test(framesCall),
      'qa-frames runs before the render but claims one happened');
    return 'only the sensor that runs after a render says so';
  });

  check('a script can be reviewed before it is paid for, not just read aloud', () => {
    // The whole point of splitting writing from rendering is that somebody reads
    // the script while it is still free. That only works if the script shows what
    // reaches the SCREEN -- and for weeks it showed only what gets spoken.
    //
    // The cost was concrete: a beat rendered with no words on it, nobody could see
    // that from any surface, and finding out took a paid render and then reading
    // the renderer's source to work out what it would have drawn.
    const src = fs.readFileSync(path.join(PATHS_REPO, 'server', 'app.js'), 'utf8');

    // The projection has to carry it before the page can show it.
    const proj = src.slice(src.indexOf('beats: (r.beats || []).map'), src.indexOf('checkpoint: checkpoint'));
    for (const field of ['cap', 'art', 'overlay', 'info']) {
      assert(proj.includes(field + ':'),
        `the stored script drops '${field}', so no surface can ever show it`);
    }

    // And the readable form has to call out the case that actually bit.
    const md = src.slice(src.indexOf("app.get('/demo/make-video/:jobId/script.md'"));
    assert(/NO WORDS ON SCREEN/.test(md),
      'script.md does not flag a beat that draws art and nothing else');
    assert(/caption:/.test(md) && /overlay:/.test(md),
      'script.md still shows only the spoken line');
    return 'cap, art, overlay and info survive to a page a person reads';
  });

  check('a course script can put words on an illustration beat', () => {
    // The defect that blocked every course lesson, and it was NOT a bad gate.
    // animation/lesson.html draws an `ali`/`scene` beat as art and nothing else
    // unless the beat carries `cap` or `overlay`. 909 of the 1276 beats in the
    // shipped library carry a caption -- but the course script SCHEMA had no
    // `cap` field and additionalProperties:false, so a course video could not
    // produce one. Every illustration beat rendered wordless, qa-frames refused
    // it, and the refusal was read as a broken gate for a day.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'script.js'), 'utf8');

    // Three schema blocks: the writer's, and the redraft patcher's edits +
    // new_beats. A field added to one and not the others is silently dropped on
    // any redraft, which is the hardest version of this bug to see.
    const blocks = src.split(/holdAfter:\s*\{/).length - 1;
    const caps = src.split(/\n\s+cap:\s*\{/).length - 1;
    assert(blocks >= 3, `expected 3 beat schema blocks, found ${blocks}`);
    assert(caps === blocks,
      `cap is in ${caps} of ${blocks} beat schemas -- a redraft would drop it`);

    // And it must survive being written out. renderBeatsFile is the only thing
    // that puts a field into beats.js; a field it omits never reaches the
    // renderer no matter how well the model filled it in.
    assert(/b\.cap \?/.test(src), 'renderBeatsFile drops cap, so the renderer never sees it');

    const prompt = fs.readFileSync(path.join(PATHS_REPO, 'prompts', 'video_script.txt'), 'utf8');
    assert(/\bcap\b/.test(prompt), 'the writer prompt never asks for a caption');
    return `cap in ${caps} schema block(s), serialised, and required by the prompt`;
  });

  check('the frame gate tells a wordless beat apart from a blank one', () => {
    // The old rule called any beat with no text "a blank frame". An illustration
    // beat is not blank, and that wording cost an hour of chasing the wrong fault.
    // It also could not see the thing it was named for: a broken <img> keeps its
    // box, so only naturalWidth distinguishes art-that-failed from art-that-drew.
    const gate = fs.readFileSync(path.join(PATHS_REPO, '.claude', 'skills',
      'creating-explainer-videos', 'templates', 'qa-frames.js'), 'utf8');

    assert(/naturalWidth/.test(gate), 'the gate still cannot detect an image that failed to load');
    assert(!/renders NO visible text — a blank frame/.test(gate),
      'the misleading "blank frame" wording is back');
    assert(/draws art but NO words/.test(gate), 'a wordless illustration beat is no longer named');

    // The image wait is load-bearing: layers are built from window.__DATA AFTER
    // `load` fires, so without it a still-loading image reads as a broken one and
    // the new check becomes the next false alarm.
    assert(/document\.images/.test(gate) && /onerror/.test(gate),
      'the gate measures images without waiting for them to load');

    // Every copy in a video folder must match, or a re-render of an old video
    // runs a gate nobody has fixed.
    const stale = [];
    const vids = path.join(PATHS_REPO, 'explainer-videos');
    const walk = (d, depth) => {
      if (depth > 3 || !fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name === 'node_modules') continue;
        const p = path.join(d, e.name);
        const g = path.join(p, 'qa-frames.js');
        if (fs.existsSync(g) && !/naturalWidth/.test(fs.readFileSync(g, 'utf8'))) {
          stale.push(path.relative(PATHS_REPO, g).split(path.sep).join('/'));
        }
        walk(p, depth + 1);
      }
    };
    walk(vids, 1);
    assert(!stale.length, `qa-frames copies not synced from the template: ${stale.join(', ')}`);
    return 'wordless vs blank separated, broken images caught, all copies synced';
  });

  check('a gate that could not RUN is never reported as a finding', () => {
    // The whole reason this was invisible for days. A finding parks the lesson for
    // a person; nobody can rule on a missing binary. Tested with the exact stderr
    // production produced, so a rewrite of the matcher cannot quietly stop
    // catching the case that caused the outage.
    const { isEnvironmentFailure } = require('./lib/stages/produce.js')._internals;

    const realOutage = { stdout: '', stderr:
      'Error: Could not find chrome-headless-shell (ver. 153.0.8010.36). This can occur if either\n'
      + '1. you did not perform an installation before running the script' };
    assert(isEnvironmentFailure(realOutage),
      'the outage that blocked every course lesson still reads as a quality finding');

    for (const e of [
      { stdout: '', stderr: 'Failed to launch the browser process' },
      { stdout: '', stderr: "Error: Cannot find module './lib/config'" },
      { stdout: '', stderr: 'python: command not found' },
      { stdout: '', stderr: 'spawn ffmpeg ENOENT' },
      { stdout: '', stderr: 'ModuleNotFoundError: No module named PIL' },
    ]) assert(isEnvironmentFailure(e), `not recognised as infrastructure: ${e.stderr}`);

    // And the other direction, which matters just as much: a real verdict must
    // still reach a person. Swallowing findings would be a worse bug than the one
    // being fixed -- it would publish videos nobody judged.
    for (const e of [
      { stdout: '[qa-frames] beat 7: text at 22px is below the 28px floor', stderr: '' },
      { stdout: '[qa-clips] clip 3 is frozen (SSIM 0.991)', stderr: '' },
      { stdout: '[eval-text] beat 12 reads as a sentence fragment', stderr: '' },
    ]) assert(!isEnvironmentFailure(e), `a real finding was swallowed: ${e.stdout}`);

    return 'infrastructure recognised, verdicts still reach a person';
  });
}

function contractChecks() {
  check('every blockedBy a stage can throw is in the published set', () => {
    // This drifted for months in three directions at once: the comment on
    // BlockedError named six values, the API description named seven, and the code
    // threw nine. The consumer downstream read all three, concluded there was no
    // enum, and stopped matching on the field -- so the machine-readable half of a
    // block was dead in the only place it mattered. A comment cannot be tested;
    // this can.
    const { BLOCKED_BY_VALUES } = require('./lib/spine-errors');
    const known = new Set(BLOCKED_BY_VALUES);

    const roots = [path.join(__dirname, 'lib'), path.join(PATHS_REPO, 'server', 'lib')];
    const files = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.js')) files.push(p);
      }
    };
    for (const r of roots) walk(r);

    const found = new Set();
    for (const p of files) {
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/\bcode:\s*'([a-z-]+)'/g)) found.add(m[1]);
      for (const m of src.matchAll(/blockedBy:\s*'([a-z-]+)'/g)) found.add(m[1]);
    }
    assert(found.size > 0, 'found no blockedBy codes at all -- the scan is broken, not the code');

    const unpublished = [...found].filter((c) => !known.has(c));
    assert(!unpublished.length,
      `thrown but not in BLOCKED_BY: ${unpublished.join(', ')} -- add them to spine-errors.js`);

    // And the other direction: a value nobody can reach is a promise we cannot keep.
    const unreachable = BLOCKED_BY_VALUES.filter((v) => !found.has(v));
    assert(!unreachable.length, `published but never thrown: ${unreachable.join(', ')}`);
    return `${BLOCKED_BY_VALUES.length} values, all thrown and all published`;
  });

  check('nothing defaults a block to a bare string any more', () => {
    // Three files independently wrote `|| 'review'`. Three literals is how a closed
    // set stops being closed.
    const srcs = [
      path.join(__dirname, 'lib', 'queue.js'),
      path.join(PATHS_REPO, 'server', 'lib', 'api.js'),
      path.join(PATHS_REPO, 'server', 'lib', 'course-worker.js'),
    ].map((p) => fs.readFileSync(p, 'utf8'));
    for (const src of srcs) {
      assert(!/blockedBy:\s*\|\|\s*'review'|blockedBy:\s*[\w.]+\s*\|\|\s*'review'/.test(src),
        "a literal review default survives; use DEFAULT_BLOCKED_BY");
    }
    return 'all three defaults name the constant';
  });

  check('a settled lesson says what its money was spent on, not just how much', () => {
    // The consumer was reading spendUsd/spendUsdTotal as a media/model split. They
    // are this-attempt and all-attempts; a lesson that failed once and succeeded on
    // retry reports a bigger total for that reason alone. The real split was already
    // recorded on every call and thrown away at the queue boundary.
    const queue = require('./lib/queue');
    const fields = queue.spendFields('nonexistent/item', { usd: 1.5, media: 1.2, model: 0.3 });
    assert(fields.spendUsd === 1.5, 'total lost');
    assert(fields.spendMediaUsd === 1.2, 'media lost');
    assert(fields.spendModelUsd === 0.3, 'model lost');
    assert(Math.abs((fields.spendMediaUsd + fields.spendModelUsd) - fields.spendUsd) < 0.0001,
      'the split does not reconcile to the total');

    // A bare number still settles, because old events replay through the fold and
    // must not start claiming their whole cost was media.
    const legacy = queue.spendFields('nonexistent/item', 0.9);
    assert(legacy.spendUsd === 0.9, 'a plain number no longer settles');
    assert(!('spendMediaUsd' in legacy), 'a plain number invented a media figure');
    return 'breakdown reconciles, and a bare number is still accepted';
  });

  check('a course carries its running scenario into every lesson', () => {
    // The planner produced protagonist_scenario and /courses/build read only the
    // per-lesson fields, so it never reached a run: a "course" was videos sharing a
    // title and nothing else.
    const src = fs.readFileSync(path.join(PATHS_REPO, 'server', 'lib', 'api.js'), 'utf8');
    assert(/protagonist_scenario/.test(src), '/courses/build still drops the scenario');
    assert(/Running scenario for this course/.test(src), 'the scenario is not written into notes');
    const tagFirst = src.indexOf('`[${courseId}] ${l.brief}`');
    const scenarioAt = src.indexOf('Running scenario for this course');
    assert(tagFirst > 0 && tagFirst < scenarioAt,
      'the [courseId] tag must stay first in notes -- membership is a substring match');
    return 'scenario rides in notes, behind the course tag';
  });
}

async function courseChecks() {
  console.log('');
  console.log('11. courses survive a restart, and cost at most the lesson in flight');

  const os = require('os');
  const queue = require(path.join(__dirname, 'lib', 'queue'));
  const jobStore = require(path.join(__dirname, '..', 'server', 'lib', 'job-store'));

  // approve() calls kick(), which drains the queue through the spine. No test
  // may start a render, call a model, or spend a cent, so the spine is replaced
  // with a stub that reports the lesson blocked and does nothing.
  const spine = require(path.join(__dirname, 'lib', 'spine'));
  // Keep the options the worker passed. Stubbing the spine to a bare status left
  // every option invisible to the suite -- which is how courses shipped running to
  // 'qa', one stage short of the review they are built around, with nothing failing.
  let lastSpineOpts = null;
  spine.execute = async (item, opts) => { lastSpineOpts = opts; return { status: 'blocked' }; };

  const freshQueue = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-course-'));
    jobStore.reset();
    queue.resetPathCache();
    delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
    process.env.JOB_STORE_DIR = dir;
    return dir;
  };

  // A hook script named by a RELATIVE path resolves against the session's working
  // directory, not the repo. Move the cwd and every hook command fails with 127 --
  // and because the PreToolUse wrapper turned any non-zero status into exit 2, that
  // 127 blocked every Bash and PowerShell call, and the PostToolUse pair blocked
  // every Write and Edit. The guards did not refuse anything; they could not run,
  // and said so in the same voice. $CLAUDE_PROJECT_DIR is what the hooks docs give
  // for this, and a missing script must exit 0 loudly rather than brick the session.
  check('hook commands find their scripts from any working directory', () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.claude', 'settings.json'), 'utf8'));
    const cmds = Object.values(cfg.hooks || {})
      .flat().flatMap((g) => g.hooks || []).map((h) => h.command || '');
    assert(cmds.length, 'no hook commands found -- did the hooks block move?');
    for (const c of cmds) {
      if (!c.includes('.claude/hooks/')) continue;
      assert(c.includes('CLAUDE_PROJECT_DIR'),
        `a hook runs .claude/hooks/ by a relative path, which breaks outside the repo root: ${c.slice(0, 80)}`);
    }
    // Fail-safe, not fail-closed: a guard that cannot run must not look like a refusal.
    const guards = cmds.filter((c) => c.includes('.claude/hooks/') && /exit 2/.test(c));
    for (const c of guards) {
      assert(/\[ -r "\$H" \]/.test(c),
        'a blocking hook does not check its script is readable first, so a missing file exits 2 and blocks every tool call');
    }
    return `${cmds.length} commands, ${guards.length} blocking`;
  });

  check('the laptop queue is not shipped inside the image', () => {
    const di = fs.readFileSync(path.join(__dirname, '..', '.dockerignore'), 'utf8');
    assert(/^orchestrator\/queue\.jsonl$/m.test(di),
      '.dockerignore admits !orchestrator wholesale, so a developer queue.jsonl ships to production');
    return 'excluded';
  });

  check('queue.setStatus is exported, so approve and reject do not throw', () => {
    assert(typeof queue.setStatus === 'function',
      'course-worker calls queue.setStatus -- unexported, every approve and reject threw TypeError');
    return 'exported';
  });

  check('the worker records a lesson as claimed before anything is spent on it', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'lib', 'course-worker.js'), 'utf8');
    const claimAt = src.indexOf('queue.claim(');
    const spendAt = src.indexOf('spine.execute(');
    assert(claimAt > -1, 'buildOne never claims the lesson, so a restart cannot tell it from one never started');
    assert(claimAt < spendAt, 'the lesson is claimed after the spend begins, which is too late to help');
    return 'claimed first';
  });

  await checkAsync('a course lesson runs far enough to reach the stage that pauses for a person', async () => {
    freshQueue();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    lastSpineOpts = null;
    queue.enqueue({ topic: 'Lesson six', series: 'demo', slug: 'stops', source: 'course-builder' });
    await cw.drain();
    assert(lastSpineOpts, 'the worker never called the spine');
    const order = spine.STAGE_ORDER;
    const stop = lastSpineOpts.stopAfter;
    assert(order.includes(stop), `stopAfter '${stop}' is not a stage, so nothing will ever match it`);
    // Both halves, because the value can drift in either direction and each costs
    // something different. Before 'review' the lesson can never pause: it is settled
    // `done` unseen and never published. Before 'upload' it pauses but publishing
    // stops working -- which is what production already did, so stopping short of it
    // would take a working behaviour away.
    assert(order.indexOf(stop) >= order.indexOf('review'),
      `courses stop after '${stop}', which is before 'review' -- every lesson is settled done `
      + 'without ever pausing for approval, and is never published');
    assert(order.indexOf(stop) >= order.indexOf('upload'),
      `courses stop after '${stop}', so an approved lesson is never published and `
      + 'youtubeVideoId stays null -- production already ran them to upload');
    return `stops after '${stop}'`;
  });

  check('a lesson left mid-build is parked for a human, not silently rebuilt', () => {
    freshQueue();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    queue.enqueue({ topic: 'Lesson two', series: 'demo', slug: 'mid', source: 'course-builder' });
    queue.claim('demo/mid', 'run-dead');
    const r = cw.restore();
    const item = queue.get('demo/mid');
    assert(r.interrupted === 1, 'expected 1 interrupted, got ' + r.interrupted);
    assert(item.status === 'blocked', 'expected blocked, got ' + item.status);
    assert(item.interrupted === true, 'the lesson does not say it was interrupted');
    assert(/rebuild this lesson/.test(item.reason), 'the reason does not name the cost of rebuilding');
    return 'parked, and the cost is stated';
  });

  check('restore starts no build of its own, so a crash loop cannot spend', () => {
    freshQueue();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    queue.enqueue({ topic: 'Lesson three', series: 'demo', slug: 'idle', source: 'course-builder' });
    cw.restore();
    // Railway retries a failing deploy three times; three unattended rebuilds is real money.
    assert(queue.get('demo/idle').status === 'queued', 'restore moved a queued lesson on its own');
    assert(cw.status().running === false, 'restore started the worker');
    return 'nothing started';
  });

  check('approving an interrupted lesson rebuilds it instead of publishing a video that was never made', () => {
    freshQueue();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    queue.enqueue({ topic: 'Lesson four', series: 'demo', slug: 'rebuilt', source: 'course-builder' });
    queue.claim('demo/rebuilt', 'run-dead');
    cw.restore();
    cw.approve('demo/rebuilt', 'Aroma');
    const item = queue.get('demo/rebuilt');
    // reviewApproved would make the spine skip review for a render that is gone.
    assert(!item.reviewApproved,
      'an interrupted lesson carried reviewApproved -- the spine would skip review and publish nothing');
    assert(item.interrupted === false, 'the interrupted flag was not cleared on approval');
    return 'rebuilds, then blocks at review as normal';
  });

  check('the course stop stage is its own, not the global default', () => {
    // config.pipeline.stopAfter is never empty -- it defaults to 'qa' -- so a
    // `config.pipeline.stopAfter || 'review'` fallback on the course path never
    // fires. Courses must resolve their own value or they silently inherit 'qa'.
    const configPath = require.resolve(path.join(__dirname, '..', 'server', 'lib', 'config'));
    const before = process.env.PIPELINE_STOP_AFTER;
    process.env.PIPELINE_STOP_AFTER = 'qa';
    delete require.cache[configPath];
    const c = require(configPath).config;
    if (before === undefined) delete process.env.PIPELINE_STOP_AFTER;
    else process.env.PIPELINE_STOP_AFTER = before;
    delete require.cache[configPath];
    assert(c.pipeline.courseStopAfter === 'upload',
      `PIPELINE_STOP_AFTER=qa dragged courses to '${c.pipeline.courseStopAfter}'`);
    return 'independent of PIPELINE_STOP_AFTER';
  });

  check('a blank budget variable reads as unset, not as an authorised zero', () => {
    // Number('') is 0, and 0 is finite -- so a variable left empty in Railway looks
    // configured in the dashboard and reads as "authorised nothing", which blocks
    // every course lesson at produce.
    const configPath = require.resolve(path.join(__dirname, '..', 'server', 'lib', 'config'));
    const before = process.env.PIPELINE_MAX_APPROVABLE_USD;
    process.env.PIPELINE_MAX_APPROVABLE_USD = '   ';
    delete require.cache[configPath];
    const c = require(configPath).config;
    if (before === undefined) delete process.env.PIPELINE_MAX_APPROVABLE_USD;
    else process.env.PIPELINE_MAX_APPROVABLE_USD = before;
    delete require.cache[configPath];
    assert(c.pipeline.maxApprovableUsd === 10,
      'a blank variable read as ' + c.pipeline.maxApprovableUsd + ' rather than falling back');
    return 'blank falls back';
  });

  check('approving a normally-built lesson still skips the expensive render', () => {
    freshQueue();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    queue.enqueue({ topic: 'Lesson five', series: 'demo', slug: 'normal', source: 'course-builder' });
    queue.block('demo/normal', 'run-1', 'awaiting human review');
    cw.approve('demo/normal', 'Aroma');
    assert(queue.get('demo/normal').reviewApproved === 'Aroma',
      'a normally-built lesson lost its approval and would re-render');
    return 'resumes to publish';
  });


  // A lesson that was approved, rendered, and THEN failed still carries
  // reviewApproved: currentItems() is a shallow fold that never deletes a key.
  // A bare status flip back to queued would resume it straight past human review
  // and publish a video nobody watched.
  check('requeueing a lesson clears the approval its last attempt carried', () => {
    freshQueue();
    queue.enqueue({ topic: 'Lesson seven', series: 'demo', slug: 'retried', source: 'course-builder' });
    queue.block('demo/retried', 'run-1', 'awaiting human review', 'review');
    queue.setStatus('demo/retried', queue.ITEM_STATUS.QUEUED, { reviewApproved: 'Aroma' });
    queue.fail('demo/retried', 'run-2', 'the upload died');

    queue.requeue('demo/retried');
    const item = queue.get('demo/retried');
    assert(item.status === 'queued', `requeue left it '${item.status}'`);
    assert(!item.reviewApproved,
      'the retried lesson kept its old approval, so the rebuild would publish without anyone watching it');
    assert(!item.error, 'the retried lesson still reports the failure it is being retried past');
    assert(!item.blockedBy, 'the retried lesson still names what blocked a previous attempt');
    return 'approval, error and blockedBy all cleared';
  });

  // Rejecting means "do not publish this". There was no status guard at all, so
  // a lesson already on YouTube could be marked failed after the fact, leaving
  // the course's record disagreeing with the catalogue.
  check('a published lesson cannot be rejected after the fact', () => {
    freshQueue();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    queue.enqueue({ topic: 'Lesson eight', series: 'demo', slug: 'published', source: 'course-builder' });
    queue.done('demo/published', 'run-1', { upload: { url: 'https://youtu.be/x', videoId: 'x' } });
    const r = cw.reject('demo/published', 'changed my mind');
    assert(r.ok === false, 'a published lesson was rejected');
    assert(queue.get('demo/published').status === 'done', 'a published lesson was marked failed');
    return 'refused';
  });

  // Only a failed lesson may be retried: a retry buys another render, and one
  // that is merely waiting for a person should be approved or rejected instead.
  check('only a failed lesson can be requeued', () => {
    freshQueue();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    queue.enqueue({ topic: 'Lesson nine', series: 'demo', slug: 'waiting', source: 'course-builder' });
    queue.block('demo/waiting', 'run-1', 'awaiting human review', 'review');
    assert(cw.requeue('demo/waiting').ok === false, 'a lesson waiting for a person was requeued');
    assert(queue.get('demo/waiting').status === 'blocked', 'the waiting lesson was moved anyway');
    return 'refused';
  });

  // ── the hold is per course, not per service ──────────────────────────────────
  // On 2026-09-22 one course's lesson failed script validation and drain() broke
  // out of its loop. "Paused" was never a state -- just the absence of a running
  // drain -- and only build/approve/requeue ever started one again. Every other
  // course, every other tenant, sat queued behind it for a day. The header comment
  // said "nothing after a rejected lesson is built"; the code stopped everything.

  // A per-item stub: which lessons end how. Anything unnamed blocks at review.
  const outcomes = {};
  const spend = {};
  const built = [];
  spine.execute = async (item, opts) => {
    lastSpineOpts = opts;
    built.push(item.id);
    const status = outcomes[item.id] || 'blocked';
    const usd = spend[item.id];
    if (status === 'failed') queue.fail(item.id, 'run-t', 'stubbed failure', usd);
    else if (status === 'done') queue.done(item.id, 'run-t', {}, usd);
    else queue.block(item.id, 'run-t', 'awaiting human review', 'review', usd);
    return { status };
  };
  const course = (tag, slug, extra = {}) => queue.enqueue({
    topic: slug, series: 'demo', slug, source: 'course-builder', notes: `[${tag}] brief`, ...extra,
  });
  // Earlier checks call approve(), whose kick() drains fire-and-forget; a drain
  // still running when the next check starts makes that check's drain() return
  // alreadyRunning and build nothing. Settle first, then start clean.
  const settled = async () => {
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    for (let i = 0; i < 200 && cw.status().running; i++) await new Promise((res) => setTimeout(res, 10));
    assert(!cw.status().running, 'the worker is still running from an earlier check');
  };
  const fresh = async () => {
    await settled();
    freshQueue(); built.length = 0;
    for (const k of Object.keys(outcomes)) delete outcomes[k];
    for (const k of Object.keys(spend)) delete spend[k];
  };

  await checkAsync('a failed lesson holds its own course and no other', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-a', 'a1'); course('course-a', 'a2'); course('course-b', 'b1');
    outcomes['demo/a1'] = 'failed';
    await cw.drain();
    assert(queue.get('demo/a1').status === 'failed', 'a1 did not fail as stubbed');
    assert(queue.get('demo/a2').status === 'queued', 'a2 was built after its sibling failed');
    assert(queue.get('demo/b1').status === 'blocked', `b1 was parked behind another course's failure: '${queue.get('demo/b1').status}'`);
    assert(built.join(',') === 'demo/a1,demo/b1', `built ${built.join(',')}`);
    const st = cw.status();
    assert(st.held.some((h) => h.courseId === 'course-a' && h.by === 'demo/a1' && h.status === 'failed'),
      'status() does not name the held course and the lesson holding it');
    assert(st.needsResume === false, 'nothing is eligible, yet needsResume is true');
    return 'a2 waits, b1 builds';
  });

  await checkAsync('reject stops the rejected course and releases the others', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-a', 'a1'); course('course-a', 'a2'); course('course-b', 'b1');
    queue.block('demo/a1', 'run-1', 'awaiting human review', 'review');
    const r = cw.reject('demo/a1', 'wrong format', 'course-a');
    assert(r.ok, r.why);
    // kick() is fire-and-forget; drain() returns alreadyRunning until it settles.
    for (let i = 0; i < 50 && cw.status().running; i++) await new Promise((res) => setTimeout(res, 10));
    await cw.drain();
    const a2 = queue.get('demo/a2');
    assert(a2.status === 'failed', `the rejected course's next lesson is '${a2.status}' -- it must stop with the course`);
    assert(/stopped with the course/.test(a2.error || ''), 'a2 does not say why it failed');
    assert(a2.stoppedWithCourse === 'demo/a1', 'a2 does not name the lesson whose rejection stopped it');
    assert(!built.includes('demo/a2'), 'the lesson after a rejected one was BUILT');
    assert(queue.get('demo/b1').status === 'blocked', 'rejecting course-a did not release course-b');
    return 'a2 stopped free, b1 built';
  });

  await checkAsync('an approved lesson publishes even when a sibling has failed', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-a', 'a1'); course('course-a', 'a2');
    queue.fail('demo/a1', 'run-1', 'script never validated');
    queue.block('demo/a2', 'run-2', 'awaiting human review', 'review');
    outcomes['demo/a2'] = 'done';
    cw.approve('demo/a2', 'Aroma', 'course-a');
    for (let i = 0; i < 50 && cw.status().running; i++) await new Promise((res) => setTimeout(res, 10));
    await cw.drain();
    assert(queue.get('demo/a2').status === 'done', `the approved lesson is '${queue.get('demo/a2').status}' -- the hold swallowed a human's approval`);
    return 'human release passes the hold';
  });

  await checkAsync('requeue lets only that lesson through the hold', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-a', 'a1'); course('course-a', 'a2');
    queue.fail('demo/a1', 'run-1', 'broke');
    queue.requeue('demo/a1', { requeuedBy: 'test' });
    const ids = cw.eligible().map((i) => i.id);
    assert(ids[0] === 'demo/a1', `the requeued lesson is not first in line: ${ids.join(',')}`);
    // Once a1 is queued again the course has no failed lesson and is not held --
    // which is right -- but a1 blocks at review and re-holds it before a2's turn.
    await cw.drain();
    assert(built.join(',') === 'demo/a1', `built ${built.join(',')} -- the requeue released the sibling too`);
    assert(queue.get('demo/a2').status === 'queued', "a2 was built on the back of a1's requeue");
    return 'a1 rebuilt, a2 still waits';
  });

  await checkAsync('skip lifts the hold without buying a rebuild', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-a', 'a1'); course('course-a', 'a2');
    queue.fail('demo/a1', 'run-1', 'broke');
    assert(cw.skip('demo/a2', 'test', 'course-a').ok === false, 'a queued lesson could be skipped');
    const r = cw.skip('demo/a1', 'test', 'course-a');
    assert(r.ok, r.why);
    const a1 = queue.get('demo/a1');
    assert(a1.status === 'failed' && a1.skipped === true && a1.skippedBy === 'test',
      'skip changed the status or did not record who skipped');
    for (let i = 0; i < 50 && cw.status().running; i++) await new Promise((res) => setTimeout(res, 10));
    await cw.drain();
    assert(!built.includes('demo/a1'), 'skip rebuilt the failed lesson');
    assert(queue.get('demo/a2').status === 'blocked', 'the course did not continue after the skip');
    return 'a2 built, a1 untouched';
  });

  await checkAsync('resume starts nothing when every course is held', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-a', 'a1'); course('course-a', 'a2');
    queue.fail('demo/a1', 'run-1', 'broke');
    const r = cw.resume('test');
    assert(r.ok && r.eligible === 0, `resume reported ${r.eligible} eligible`);
    for (let i = 0; i < 50 && cw.status().running; i++) await new Promise((res) => setTimeout(res, 10));
    assert(built.length === 0, `resume built ${built.join(',')}`);
    return 'nothing eligible, nothing built';
  });

  await checkAsync('restore still starts nothing, and says a resume is needed', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-b', 'b1');
    cw.restore();
    const st = cw.status();
    assert(queue.get('demo/b1').status === 'queued', 'restore moved a queued lesson');
    assert(st.running === false, 'restore started the worker');
    assert(st.needsResume === true, 'an eligible lesson is waiting after a boot and nothing says so');
    assert(st.eligible === 1, `eligible is ${st.eligible}`);
    return 'needsResume: true';
  });

  await checkAsync('a fresh enqueue of a previously failed slug does not inherit a human release', async () => {
    await fresh();
    course('course-a', 'a1');
    queue.fail('demo/a1', 'run-1', 'broke');
    queue.requeue('demo/a1', { requeuedBy: 'test' });
    queue.fail('demo/a1', 'run-2', 'broke again');
    queue.setStatus('demo/a1', 'failed', { skipped: true, skippedBy: 'test' });
    const item = course('course-a', 'a1');
    const folded = queue.get('demo/a1');
    assert(item.status === 'queued', 'enqueue did not re-queue a failed slug');
    assert(!folded.requeuedBy && !folded.rebuildApprovedBy && !folded.reviewApproved && folded.skipped === false,
      'the fold kept a stale release: ' + JSON.stringify({ r: folded.requeuedBy, a: folded.reviewApproved, s: folded.skipped }));
    return 'release fields reset on enqueue';
  });

  // ── tenants and money on course lessons ──────────────────────────────────────
  // Courses were queue items with no tenant and no ledger entry: the shared
  // `default` credential paid for everything, GET /demo/spend could not see a
  // course, and a course's budget was the global PIPELINE_BUDGET_USD whoever
  // asked for it.
  check('enqueue records which tenant paid for a lesson', () => {
    freshQueue();
    const a = queue.enqueue({ topic: 'paid', series: 'demo', slug: 'paid', source: 'course-builder', tenantId: 'lms', spendRef: 'ref-1' });
    const b = queue.enqueue({ topic: 'legacy', series: 'demo', slug: 'legacy', source: 'course-builder' });
    assert(a.tenantId === 'lms' && a.spendRef === 'ref-1', 'tenantId/spendRef not recorded');
    assert(b.tenantId === null && b.spendRef === null, 'a legacy enqueue should carry explicit nulls');
    return 'tenantId and spendRef on the item';
  });

  check('another tenant cannot act on a lesson, and a legacy lesson stays open', () => {
    freshQueue();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    queue.enqueue({ topic: 'mine', series: 'demo', slug: 'mine', source: 'course-builder', notes: '[course-a] b', tenantId: 'lms' });
    queue.enqueue({ topic: 'old', series: 'demo', slug: 'old', source: 'course-builder', notes: '[course-b] b' });
    queue.block('demo/mine', 'r', 'awaiting human review', 'review');
    queue.block('demo/old', 'r', 'awaiting human review', 'review');
    const other = cw.approve('demo/mine', 'x', 'course-a', 'someone-else');
    assert(other.ok === false && /another tenant/.test(other.why), `another tenant approved it: ${JSON.stringify(other)}`);
    assert(queue.get('demo/mine').status === 'blocked', 'the lesson moved anyway');
    assert(cw.skip('demo/mine', 'x', 'course-a', 'someone-else').ok === false, 'another tenant could skip it');
    assert(cw.reject('demo/mine', 'x', 'course-a', 'someone-else').ok === false, 'another tenant could reject it');
    // Built before tenants were recorded: nobody owns it, so the check stays off.
    assert(cw.approve('demo/old', 'x', 'course-b', 'someone-else').ok === true, 'a legacy lesson was refused');
    return 'refused across tenants, open for legacy items';
  });

  await checkAsync('a course lesson\'s media budget is capped by its tenant\'s maxRunUsd', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    const before = process.env.TENANTS_JSON;
    process.env.TENANTS_JSON = JSON.stringify([{ id: 'capped', name: 'Capped', token: 'a-token-long-enough-for-the-rules-x', monthlyUsd: 50, maxRunUsd: 0.75 }]);
    try {
      queue.enqueue({ topic: 'cap', series: 'demo', slug: 'cap', source: 'course-builder', notes: '[course-c] b', tenantId: 'capped' });
      lastSpineOpts = null;
      await cw.drain();
      assert(lastSpineOpts, 'the worker never called the spine');
      assert(lastSpineOpts.budgetUsd <= 0.75, `budgetUsd ${lastSpineOpts.budgetUsd} ignores the tenant's maxRunUsd of 0.75`);
    } finally {
      if (before === undefined) delete process.env.TENANTS_JSON; else process.env.TENANTS_JSON = before;
    }
    return `budgetUsd ${lastSpineOpts.budgetUsd}`;
  });

  await checkAsync('a course lesson settles its reservation at what it cost', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    const ledger = require(path.join(__dirname, '..', 'server', 'lib', 'ledger'));
    const store = jobStore.shared();
    assert(store.canRecordSpend(), 'the test store cannot record spend');
    const r = ledger.reserve(store, { tenantId: 'lms', jobId: 'course-s', usd: 2.5, key: 'demo/settled', kind: 'course' });
    assert(r.ok, 'reserve failed');
    queue.enqueue({ topic: 'settled', series: 'demo', slug: 'settled', source: 'course-builder', notes: '[course-s] b', tenantId: 'lms', spendRef: r.ref });
    outcomes['demo/settled'] = 'blocked';
    spend['demo/settled'] = 1.23;
    await cw.drain();
    const bal = ledger.spentUsd(store, 'lms');
    assert(bal.reserved === 0 && Math.abs(bal.settled - 1.23) < 1e-9,
      `ledger after the build: ${JSON.stringify(bal)} -- expected the $2.50 reservation settled at $1.23`);
    return 'reserved 2.50, settled 1.23';
  });

  // ── a stopped course is not a held course ────────────────────────────────────
  // course-mub7whoa read `held.by: <a lesson Aroma rejected>` for a day, and /health
  // counted it in heldCourses, with nothing queued behind it. A hold that can never
  // be released looks, on a dashboard, exactly like one waiting for a person.
  await checkAsync('a course with nothing queued behind its failed lesson is stopped, not held', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-a', 'a1');
    queue.fail('demo/a1', 'run-1', 'rejected by a human: wrong format');
    assert(cw.heldCourses().size === 0, 'a course with no queued lesson is reported as held');
    assert(cw.status().held.length === 0, 'status().held lists a course nothing is waiting behind');
    assert(cw.eligible().length === 0, 'nothing should be eligible either');
    return 'held: none';
  });

  await checkAsync('a course with a queued sibling behind a failed lesson is held', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-a', 'a1'); course('course-a', 'a2');
    queue.fail('demo/a1', 'run-1', 'broke');
    const held = cw.heldCourses();
    assert(held.size === 1 && held.get('course-a').by === 'demo/a1', `held: ${JSON.stringify([...held.values()])}`);
    return 'held by a1';
  });

  await checkAsync('a sibling stopped by a reject cannot be requeued one lesson at a time', async () => {
    await fresh();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    course('course-a', 'a1'); course('course-a', 'a2');
    queue.block('demo/a1', 'run-1', 'awaiting human review', 'review');
    cw.reject('demo/a1', 'wrong format', 'course-a');
    for (let i = 0; i < 50 && cw.status().running; i++) await new Promise((res) => setTimeout(res, 10));
    const r = cw.requeue('demo/a2', 'test', 'course-a');
    assert(r.ok === false && /rejected/.test(r.why), `a stopped sibling was requeued: ${JSON.stringify(r)}`);
    assert(queue.get('demo/a2').status === 'failed', 'the stopped sibling moved');
    // A lesson that merely failed is still retryable: that is a build that did not work,
    // not a decision somebody made.
    assert(cw.requeue('demo/a1', 'test', 'course-a').ok === true, 'the rejected lesson itself cannot be retried');
    for (let i = 0; i < 50 && cw.status().running; i++) await new Promise((res) => setTimeout(res, 10));
    return 'refused for the sibling, allowed for a plain failure';
  });

  // ── a clean boot resumes itself; a crash loop does not ───────────────────────
  // Every deploy left the queue parked until a person called /worker/resume. The
  // boot line already tells the two cases apart: `0 interrupted` is a clean boot.
  check('bootDecision resumes a clean boot and refuses a restart loop or interrupted work', () => {
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    const now = Date.parse('2026-09-23T12:00:00Z');
    const min = 60_000;
    const d = (o) => cw.bootDecision({ now, cooldownMs: 15 * min, enabled: true, interrupted: 0, lastBootAt: null, ...o });
    assert(d({}).resume === true, 'a clean first boot did not resume');
    assert(d({ lastBootAt: new Date(now - 60 * min).toISOString() }).resume === true, 'a boot an hour after the last did not resume');
    const loop = d({ lastBootAt: new Date(now - 3 * min).toISOString() });
    assert(loop.resume === false && /ago/.test(loop.why), `a boot 3 minutes after the last resumed: ${JSON.stringify(loop)}`);
    const hurt = d({ interrupted: 1 });
    assert(hurt.resume === false && /mid-build/.test(hurt.why), `a boot with interrupted work resumed: ${JSON.stringify(hurt)}`);
    const off = d({ enabled: false });
    assert(off.resume === false && /COURSE_AUTO_RESUME/.test(off.why), 'disabling it is not honoured or not explained');
    return 'clean → resume; loop, interrupted, disabled → wait';
  });

  check('the boot marker round-trips on the job store', () => {
    freshQueue();
    const cw = require(path.join(__dirname, '..', 'server', 'lib', 'course-worker'));
    assert(cw.readBoot() === null, 'a fresh store already has a boot marker');
    const at = cw.markBoot();
    assert(at && cw.readBoot() === at, `marker did not round-trip: ${cw.readBoot()} vs ${at}`);
    return at;
  });

  check('index.js decides at boot through bootDecision, and never kicks directly', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
    const restoreAt = src.indexOf('.restore()');
    const decideAt = src.indexOf('bootDecision(');
    assert(decideAt > -1, 'index.js never consults bootDecision, so every deploy parks the queue');
    assert(restoreAt > -1 && decideAt > restoreAt, 'the boot decision is taken before restore() has parked interrupted work');
    assert(!/\.kick\(/.test(src), 'index.js kicks the worker directly, bypassing the crash-loop guard');
    assert(/markBoot\(/.test(src), 'index.js never writes the boot marker, so the cooldown can never fire');
    return 'restore → bootDecision → resume/markBoot';
  });

  // Put the plain stub back for anything after this section.
  spine.execute = async (item, opts) => { lastSpineOpts = opts; return { status: 'blocked' }; };

  // The budget is a ceiling on what a video BUYS -- images, speech, motion. Model
  // spend is now counted on the run too, and letting it into this comparison
  // would spend the art budget on research and ship a stills-only video instead.
  check('the budget gate measures paid media, not the model calls that led to it', () => {
    const state = require(path.join(__dirname, 'lib', 'state'));
    const st = { spend: { usd: 0, calls: [] }, stages: {}, interventions: [] };
    // save() writes to disk; these are folded by hand so the check stays a unit.
    st.spend.calls.push({ usd: 0.60, kind: 'model', stage: 'script' });
    st.spend.calls.push({ usd: 0.40, kind: 'media', stage: 'produce' });
    st.spend.calls.push({ usd: 0.10, stage: 'produce' });   // recorded before `kind` existed
    st.spend.usd = 1.10;

    assert(state.mediaSpend(st) === 0.5,
      `media spend is ${state.mediaSpend(st)} -- a model call is being charged against the art budget`);
    assert(state.spendOfKind(st, 'model') === 0.6, 'model spend is not counted');

    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    const gate = src.slice(src.indexOf('const spendApproved'), src.indexOf('const spendApproved') + 300);
    assert(!/st\.spend\.usd/.test(gate),
      'the spend gate is back on the run total, so token spend now eats the art budget');
    return 'media only, and an untagged call still counts as media';
  });

  // buildOne() reaches the script stage, which writes into explainer-videos/.
  // A leftover fixture series becomes a REAL catalogue row served to the LMS --
  // two junk rows reached the catalogue this way before this cleanup existed.
  // Remove ONLY the fixture series directory. videoDir('demo','') yields
  // explainer-videos/demo, whose dirname is explainer-videos itself -- taking the
  // dirname here once deleted the entire video library, so the path is built
  // explicitly and asserted to sit under explainer-videos before anything is removed.
  const PATHS = require(path.join(__dirname, 'lib', 'paths')).PATHS;
  const fixtureDir = path.join(PATHS.explainerVideos, 'demo');
  if (path.relative(PATHS.explainerVideos, fixtureDir) === 'demo') {
    try { fs.rmSync(fixtureDir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  check('the fixture series left no row in the catalogue', () => {
    delete require.cache[require.resolve(path.join(__dirname, '..', 'server', 'lib', 'checkpoints'))];
    const rows = require(path.join(__dirname, '..', 'server', 'lib', 'checkpoints')).listVideos();
    const junk = rows.filter((r) => r.series === 'demo');
    assert(junk.length === 0, junk.length + ' test videos are being served to the LMS');
    return rows.length + ' real rows';
  });
}


(async () => {
  await interpreterChecks();
  await beatChecks();
  await uploadChecks();
  await llmChecks();
  await integrationChecks();
  await redraftChecks();
  namingChecks();
  contractChecks();
  browserChecks();
  await referenceChecks();
  await courseChecks();

  console.log(`\n${'-'.repeat(64)}`);
  console.log(`  ${pass} passed, ${failures.length} failed` + (skipped ? `, ${skipped} skipped` : ''));
  if (failures.length) {
    for (const f of failures) console.log(`    - ${f.name}: ${f.message}`);
    process.exitCode = 1;
  }
  console.log('');
})();
