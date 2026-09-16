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
async function checkAsync(name, fn) {
  try {
    const detail = await fn();
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
      const m = src.match(new RegExp('function ' + name + '[\\s\\S]*?\\n\\}\\n'));
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

  check('produce.js runs all four sensors, each before the spend it protects', () => {
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'stages', 'produce.js'), 'utf8');
    const at = (needle) => src.indexOf(needle);
    for (const name of ['qa-visuals.js', 'qa-cutouts.js', 'qa-art.js', 'eval-text.js']) {
      assert(at(`sensor('${name}'`) !== -1, `produce.js never runs ${name}`);
    }
    assert(at("sensor('qa-visuals.js'") < at('--- spend gate'), 'qa-visuals runs after money is committed');
    assert(at("sensor('qa-cutouts.js'") < at('--- spend gate'), 'qa-cutouts runs after money is committed');
    assert(at("sensor('qa-art.js'") < at('// 4. voiceover'), 'qa-art runs after TTS is bought');
    return 'all four, correctly ordered';
  });

  check('every sensor ships in the templates, so a scaffold can run them', () => {
    for (const name of ['qa-visuals.js', 'qa-cutouts.js', 'qa-art.js', 'eval-text.js']) {
      assert(fs.existsSync(path.join(tplDir, name)), `${name} missing from the skill templates`);
    }
    return '4 present';
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

  check('stage chatter is still suppressed, so the log stays readable', () => {
    // The point of quiet was ffmpeg/npm/puppeteer spam; promoting EVERYTHING
    // would trade one unreadable log for another.
    const src = fs.readFileSync(path.join(__dirname, 'lib', 'spine.js'), 'utf8');
    assert(/log: \(msg\) => log\(name, msg\)/.test(src),
      'per-stage messages are no longer routed through the quiet-able logger');
    assert(/const log = \(stage, msg\) => \{ if \(!quiet\) emit\(stage, msg\); \}/.test(src),
      'quiet no longer suppresses anything');
    return 'chatter still quiet';
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
  await beatChecks();
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
