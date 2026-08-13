'use strict';
/**
 * produce -- drives the real explainer-video pipeline.
 *
 * This is the only stage that spends money and the only one that takes tens of
 * minutes, which shapes two decisions:
 *
 *   1. Every step is idempotent-by-skip. Art and TTS check for their own
 *      outputs and are skipped if present, so a retry after a render crash does
 *      not re-buy ~20 Imagen images. `--force` overrides.
 *   2. The paid steps are gated. `--yes` is passed only when the run is inside
 *      an approved spend budget (ILHAM plan 3.2); otherwise the stage stops and
 *      records an intervention rather than silently spending.
 *
 * Command order and flags follow EXPLAINER-VIDEO-PIPELINE-SPEC.md section 6.
 * The deliverable is <slug>_final.mp4 -- never the bare render (LAW 1).
 */

const fs = require('fs');
const path = require('path');
const { videoDir, PATHS } = require('../paths');
const shell = require('../shell');
const state = require('../state');
const { BlockedError, RejectedError } = require('../spine-errors');
const { validateBeats } = require('../validate-beats');

// Unit costs, kept in step with templates/lib/config.js COST. If that file
// changes these must change with it -- an understated estimate would let a run
// slip past a budget that was meant to stop it.
const COST = { imagePerImage: 0.04, ttsPerClip: 0.002 };

/**
 * Price this specific video from its own beats, not a flat guess.
 * `info` beats are CSS/SVG infographics and buy no art; every beat buys one
 * TTS clip. Art already on disk is not re-bought, so it is excluded too.
 */
function estimateSpend(beats, dir) {
  const artNeeded = (beats || []).filter((b) => b.mode !== 'info' && b.art);
  const artAlreadyBought = hasOutput(path.join(dir, 'art'), '.png');
  const ttsAlreadyBought = hasOutput(path.join(dir, 'audio'), '.wav');
  const images = artAlreadyBought ? 0 : artNeeded.length;
  const clips = ttsAlreadyBought ? 0 : (beats || []).length;
  return {
    images,
    clips,
    artUsd: Number((images * COST.imagePerImage).toFixed(2)),
    ttsUsd: Number((clips * COST.ttsPerClip).toFixed(3)),
    totalUsd: Number((images * COST.imagePerImage + clips * COST.ttsPerClip).toFixed(2)),
  };
}

/**
 * Is `target` newer than every input the render consumes?
 *
 * Inputs are beats.js, the art/ and audio/ folders, and the animation/ sources.
 * If any is newer, the mp4 is stale and must be rebuilt -- this is the check that
 * makes skipping the render safe rather than a way to ship yesterday's video.
 */
function isFresherThanInputs(target, dir) {
  let targetMs;
  try { targetMs = fs.statSync(target).mtimeMs; } catch { return false; }

  const inputs = [];
  const add = (p) => {
    try {
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        for (const f of fs.readdirSync(p)) add(path.join(p, f));
      } else inputs.push(st.mtimeMs);
    } catch { /* absent input cannot invalidate */ }
  };
  add(path.join(dir, 'beats.js'));
  add(path.join(dir, 'art'));
  add(path.join(dir, 'audio'));
  add(path.join(dir, 'animation'));

  return inputs.length > 0 && inputs.every((ms) => ms <= targetMs);
}

/** A directory that exists and has at least one file in it. */
function hasOutput(dir, ext) {
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((f) => (ext ? f.endsWith(ext) : true));
}

/**
 * Which beats are still missing their generated file.
 *
 * "At least one file exists" is NOT the same as "the work is done". One Imagen
 * call returned no bytes, the stage retried, and the retry skipped art generation
 * entirely because art/ held 14 of the 15 PNGs -- so the run carried on toward a
 * 45-minute render with a beat that had no picture. Completeness must be checked
 * per beat, never in aggregate.
 *
 * @returns {string[]} ids of beats whose file is absent or empty
 */
function missingPerBeat(beats, dir, subdir, name) {
  const wanted = subdir === 'art'
    ? (beats || []).filter((b) => b.mode !== 'info' && b.art)
    : (beats || []);
  return wanted
    .filter((b) => {
      const p = path.join(dir, subdir, name(b.id));
      try { return !fs.existsSync(p) || fs.statSync(p).size === 0; } catch { return true; }
    })
    .map((b) => b.id);
}

/**
 * Copy the skill templates into a new video folder.
 *
 * Never overwrites: beats.js is written by the script stage before this runs,
 * and art/ may already hold images that cost real money. Skipping existing
 * files is what makes scaffolding safe to re-enter after a crash.
 */
function copyTemplates(src, dest, log) {
  fs.mkdirSync(dest, { recursive: true });
  let copied = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copied += copyTemplates(from, to, null);
    } else if (!fs.existsSync(to)) {
      fs.copyFileSync(from, to);
      copied++;
    }
  }
  if (log) log(`copied ${copied} template file(s)`);
  return copied;
}

// Exported for the regression tests; not part of the stage contract.
module.exports._internals = { estimateSpend, isFresherThanInputs, copyTemplates, COST };

module.exports = Object.assign(module.exports, {
  name: 'produce',
  // Renders fail transiently (stale frames, puppeteer timeouts) often enough to
  // be worth one automatic retry -- but not more, because each attempt is slow.
  maxAttempts: 2,

  async run(ctx) {
    const { item, state: st, artifacts, opts, log } = ctx;
    const dir = videoDir(item.series, item.slug);

    // A dry run deliberately writes nothing, so the script stage never created
    // beats.js and the folder may not exist. Asserting on those here would
    // report a blocker the real run wouldn't hit -- a false negative that makes
    // the dry run useless for exercising the rest of the chain.
    if (opts.dryRun) {
      log('dry run -- skipping filesystem preconditions and every pipeline command');
    } else {
      // Scaffold from the skill templates if this folder is new. Mechanical and
      // safe: copy only files that are missing, so a re-run never clobbers a
      // beats.js the script stage just wrote or art already paid for.
      if (!fs.existsSync(path.join(dir, 'compile-lesson.js'))) {
        log('scaffolding video folder from skill templates');
        copyTemplates(PATHS.videoTemplates, dir, log);
      }
      if (!fs.existsSync(path.join(dir, 'beats.js'))) {
        throw new BlockedError(
          `No beats.js in ${dir}. The script stage must write beats.js before produce runs.`,
          { blocker: 'beats.js missing' }
        );
      }

      // Preflight the script against what the renderer can actually draw. This
      // runs before the spend gate on purpose: a beat that renders blank should
      // cost nothing to discover.
      const { errors, warnings } = validateBeats(artifacts.script && artifacts.script.beats, dir);
      for (const w of warnings) log(`warning: ${w}`);
      if (errors.length) {
        throw new RejectedError(
          `beats.js will not render correctly:\n  - ${errors.join('\n  - ')}`,
          { verdict: 'INVALID_BEATS', details: errors }
        );
      }
      log(`beats validated: ${artifacts.script.beats.length} beat(s), no blocking problems`);
    }

    // --- spend gate (ILHAM plan 3.2) -------------------------------------
    // Priced from this video's own beats, and from what is already on disk, so
    // a retry after a crash is correctly costed at $0 rather than blocked again.
    const est = estimateSpend(artifacts.script && artifacts.script.beats, dir);
    const budget = opts.budgetUsd;
    const spendApproved = est.totalUsd === 0
      || (budget !== null && budget !== undefined && (st.spend.usd + est.totalUsd) <= budget);

    log(`estimated spend: ${est.images} image(s) x $${COST.imagePerImage} = $${est.artUsd}` +
        ` + ${est.clips} TTS clip(s) x $${COST.ttsPerClip} = $${est.ttsUsd}` +
        `  ->  $${est.totalUsd}`);

    if (!spendApproved && !opts.dryRun) {
      state.recordIntervention(st, {
        stage: 'produce',
        kind: 'spend_approval_required',
        detail: `Needs $${est.totalUsd} for art+TTS; budget is ` +
                `${budget === null || budget === undefined ? 'unset' : '$' + budget}`,
      });
      throw new BlockedError(
        `Paid art/TTS not approved: this video costs ~$${est.totalUsd} and the budget is ` +
        `${budget === null || budget === undefined ? 'unset' : '$' + budget}. ` +
        `Re-run with --budget <usd> (plan item 3.2 makes this automatic).`,
        { blocker: 'no pre-approved spend budget', planItem: '3.2' }
      );
    }

    const run = (cmd, args, extra = {}) => shell.run(cmd, args, {
      cwd: dir,
      dryRun: opts.dryRun,
      onLine: (line) => log(line.slice(0, 160)),
      ...extra,
    });

    // 1. deps
    if (!fs.existsSync(path.join(dir, 'node_modules'))) {
      log('npm i');
      await run('npm', ['i']);
    }

    // 2. art -- paid, skipped only when EVERY art beat has its file. Checking
    // "the folder is non-empty" once let a failed image slip through to render.
    const beatsForArt = (artifacts.script && artifacts.script.beats) || [];
    const missingArt = missingPerBeat(beatsForArt, dir, 'art', (id) => `${id}.png`);
    if (beatsForArt.length && missingArt.length === 0) {
      log(`art/ complete (${beatsForArt.filter((b) => b.mode !== 'info' && b.art).length} image(s)) -- skipping generate-lesson-art (no re-spend)`);
    } else if (beatsForArt.length && missingArt.length && hasOutput(path.join(dir, 'art'), '.png')) {
      // Regenerate ONLY the gaps. generate-lesson-art.js takes ART_IDS for this.
      log(`art/ incomplete -- missing beat(s) ${missingArt.join(',')}; regenerating just those`);
      await run('node', ['generate-lesson-art.js', '--yes'], {
        env: { ...process.env, ART_IDS: missingArt.join(',') },
        timeoutMs: 30 * 60 * 1000,
      });
      const stillMissing = missingPerBeat(beatsForArt, dir, 'art', (id) => `${id}.png`);
      if (stillMissing.length) {
        throw new Error(
          `art still missing for beat(s) ${stillMissing.join(',')} after regeneration -- ` +
          `refusing to render a video with a blank beat.`
        );
      }
      state.recordSpend(st, {
        stage: 'produce', usd: Number((missingArt.length * COST.imagePerImage).toFixed(2)),
        detail: `imagen: ${missingArt.length} retried image(s)`,
      });
      log(`art/ now complete`);
    } else {
      log('generating art (paid)');
      await run('node', ['generate-lesson-art.js', '--yes'], { timeoutMs: 45 * 60 * 1000 });
      // Only record spend that actually happened -- a dry run that logged spend
      // would inflate the cost totals `run.js metrics` reports.
      if (!opts.dryRun) {
        state.recordSpend(st, {
          stage: 'produce', usd: est.artUsd, detail: `imagen: ${est.images} image(s)`,
        });
      }
    }

    // 3. cutout
    log('segmenting cutouts');
    await run('python', ['segment-all.py']);

    // 4. voiceover -- paid, skipped if audio/ already populated
    if (hasOutput(path.join(dir, 'audio'), '.wav')) {
      log('audio/ already populated -- skipping tts-lesson (no re-spend)');
    } else {
      log('generating voiceover (paid)');
      await run('node', ['tts-lesson.js', '--yes'], { timeoutMs: 30 * 60 * 1000 });
      if (!opts.dryRun) {
        state.recordSpend(st, {
          stage: 'produce', usd: est.ttsUsd, detail: `gemini tts: ${est.clips} clip(s)`,
        });
      }
    }

    // 5. render. compile-lesson.js always writes out/lesson.mp4 -- that name is
    // its contract with stitch-brand.js, and is NOT the slug.
    const bare = path.join('out', 'lesson.mp4');
    const barePath = path.join(dir, bare);

    // The render is the single most expensive step (~1h for a 75s lesson), so
    // skip it when the existing mp4 is newer than every input that feeds it.
    // Same reasoning as not re-buying art: a retry after a later step failed
    // should not redo an hour of work that is already correct.
    if (!opts.dryRun && fs.existsSync(barePath) && isFresherThanInputs(barePath, dir)) {
      log(`compile skipped -- ${bare} is newer than beats.js, art/ and audio/`);
    } else {
      // compile-lesson.js wipes frames unless --reuse (LAW 3) -- a stale frame
      // cache once made edits silently not appear, so never --reuse here.
      log('compiling lesson');
      await run('node', ['compile-lesson.js'], { timeoutMs: 90 * 60 * 1000 });
    }

    if (!opts.dryRun && !fs.existsSync(barePath)) {
      throw new Error(`compile-lesson.js reported success but ${bare} is missing`);
    }

    // 6. brand bumpers -- the deliverable (LAW 1)
    const title = artifacts.script && artifacts.script.title ? artifacts.script.title : item.topic;
    const final = path.join('out', `${item.slug}_final.mp4`);
    const finalAbs = path.join(dir, final);

    // Bumper rendering + concat is several minutes. Skip it when the deliverable is
    // already newer than the bare lesson it wraps -- otherwise re-running just to
    // reach a later stage (e.g. upload) redoes work that is already correct.
    if (!opts.dryRun && fs.existsSync(finalAbs)
        && fs.statSync(finalAbs).mtimeMs >= fs.statSync(barePath).mtimeMs) {
      log(`bumpers skipped -- ${final} is newer than the bare lesson`);
    } else {
      log('wrapping in brand bumpers');
      await run('node', [
        'stitch-brand.js', '--title', title, '--lesson', bare, '--out', final,
      ], { timeoutMs: 30 * 60 * 1000 });
    }

    // 7. acceptance checks (audio integrity + duration).
    // verify.js defaults to out/lesson_final.mp4; our deliverable is slug-named so
    // that many lessons can share a library, so it must be told where to look --
    // otherwise it reports "deliverable missing" for a video that is right there.
    log('verify.js');
    const verifyRes = await run('node', ['verify.js', '--final', final]);

    // Keep verify's findings as structured evidence. The QA stage cannot watch an
    // MP4 -- it only ever sees text -- so without these it was scoring production
    // quality from nothing and failing videos for being unobservable. These are
    // the production facts that ARE measurable.
    const verifyChecks = String(verifyRes.stdout || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^[✅❌]/.test(l))
      .map((l) => ({ ok: l.startsWith('✅'), what: l.slice(1).trim() }));

    const finalPath = path.join(dir, final);
    if (!opts.dryRun && !fs.existsSync(finalPath)) {
      throw new Error(`verify.js passed but ${final} is missing -- refusing to report success`);
    }

    return { dir, finalPath, title, bare: path.join(dir, bare), verifyChecks };
  },
});
