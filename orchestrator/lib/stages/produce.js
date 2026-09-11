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
const { BlockedError, RejectedError, RedraftError } = require('../spine-errors');
const { validateBeats } = require('../validate-beats');

// Unit costs, kept in step with templates/lib/config.js COST. If that file
// changes these must change with it -- an understated estimate would let a run
// slip past a budget that was meant to stop it.
const COST = { imagePerImage: 0.04, ttsPerClip: 0.002, i2vPerSecond: 0.05 };

// kie.ai clips come in fixed lengths; a beat is billed at the bucket above its
// voiceover, so pricing must round the same way generate-lesson-video-omni.js does
// or the estimate the budget is checked against is not the bill.
function i2vSeconds(secs) {
  const d = Math.ceil(Number(secs) || 5);
  return d > 11 ? 15 : (d > 6 ? 10 : 5);
}

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

  // Animation is priced per SECOND, so a handful of moving beats can cost more than
  // every still in the video put together. It must be inside the estimate the budget
  // gate checks, or the gate is guarding the cheap half of the bill.
  const animBeats = (beats || []).filter((b) => b.mode !== 'info' && b.art && b.motion);
  const animAlreadyBought = hasOutput(path.join(dir, 'clips'), '.mp4');
  const animSecs = animAlreadyBought
    ? 0
    : animBeats.reduce((a, b) => a + i2vSeconds(readDuration(dir, b.id)), 0);

  const artUsd = images * COST.imagePerImage;
  const ttsUsd = clips * COST.ttsPerClip;
  const animUsd = animSecs * COST.i2vPerSecond;
  return {
    images,
    clips,
    animBeats: animAlreadyBought ? 0 : animBeats.length,
    animSecs,
    artUsd: Number(artUsd.toFixed(2)),
    ttsUsd: Number(ttsUsd.toFixed(3)),
    animUsd: Number(animUsd.toFixed(2)),
    totalUsd: Number((artUsd + ttsUsd + animUsd).toFixed(2)),
  };
}

/**
 * This beat's measured voiceover length, if TTS has already run.
 *
 * Before TTS there is no durations.json, so animation is priced at the 5s floor and
 * re-priced accurately at the animate step -- which is also where it is re-checked
 * against the budget, so an under-estimate here cannot become an unapproved spend.
 */
function readDuration(dir, id) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(dir, 'durations.json'), 'utf8'));
    return d[id];
  } catch { return undefined; }
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

  // A redraft can reword a beat's art prompt while keeping its id, and the old PNG
  // still exists -- so "the file is there" would silently ship the picture for the
  // sentence that was replaced. Anything older than beats.js is stale, not done.
  let beatsMs = 0;
  try { beatsMs = fs.statSync(path.join(dir, 'beats.js')).mtimeMs; } catch { /* none yet */ }

  return wanted
    .filter((b) => {
      const p = path.join(dir, subdir, name(b.id));
      try {
        const st = fs.statSync(p);
        return st.size === 0 || (beatsMs > 0 && st.mtimeMs < beatsMs);
      } catch { return true; }
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
module.exports._internals = { estimateSpend, isFresherThanInputs, copyTemplates, i2vSeconds, COST };

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
      // Scaffold from the skill templates. Mechanical and safe: copy only files
      // that are MISSING, so a re-run never clobbers a beats.js the script stage
      // just wrote or art already paid for.
      //
      // Runs unconditionally, not just for a new folder. Gating it on
      // "compile-lesson.js is absent" meant a folder scaffolded before a template
      // was added never received it -- which is exactly how the four QA sensors
      // came to exist in templates/ and be absent from older video folders.
      log('syncing missing files from the skill templates');
      copyTemplates(PATHS.videoTemplates, dir, log);
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

    const run = (cmd, args, extra = {}) => shell.run(cmd, args, {
      cwd: dir,
      dryRun: opts.dryRun,
      onLine: (line) => log(line.slice(0, 160)),
      ...extra,
    });

    // --- quality sensors --------------------------------------------------
    // The skill ships four gates that a human running the pipeline by hand always
    // ran and this stage never did: the autonomous path shipped on verify.js
    // alone, which measures the container (fps, duration, audio) and nothing
    // about whether the video is any good. The QA stage cannot cover for them --
    // it is a text-only judge that is told, in writing, that it cannot watch the
    // MP4, so it scores visuals from the beat plan and passes pretty scripts with
    // bad pictures.
    //
    // Each sensor exits non-zero with its own findings on stdout/stderr. Those
    // findings are the whole value, so they are carried into the RejectedError
    // (the reviewer/redraft loop reads them) and into `sensorResults` (the QA
    // judge and the Slack report read them).
    const sensorResults = [];
    /**
     * Run qa-art; if it rejects specific images, regenerate just those and try
     * again. Silent no-op when it passes, which is the usual case.
     */
    const repairArt = async () => {
      if (opts.dryRun) return;
      if (!fs.existsSync(path.join(dir, 'qa-art.js'))) return; // sensor() reports it

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await run('node', ['qa-art.js'], { timeoutMs: 20 * 60 * 1000 });
          return;                                   // passed, nothing to repair
        } catch (e) {
          if (!(e instanceof shell.CommandError) || e.code === null) return; // infra: let sensor deal
          const out = `${e.stdout || ''}\n${e.stderr || ''}`;
          const m = out.match(/ART_IDS=([0-9,\s]+?)\s+node\s+(\S+\.js)/);
          if (!m) return;                           // not the shape we can fix
          const ids = m[1].replace(/\s+/g, '');
          const generator = m[2];
          if (!fs.existsSync(path.join(dir, generator))) return;

          log(`qa-art rejected art ${ids} -- regenerating just those (attempt ${attempt}/2)`);
          try {
            await run('node', [generator, '--yes'], {
              timeoutMs: 20 * 60 * 1000,
              env: { ...process.env, ART_IDS: ids },
            });
          } catch (regenErr) {
            log(`regenerating art ${ids} failed: ${regenErr.message}`);
            return;                                 // let sensor report the original verdict
          }
          state.recordIntervention(st, {
            stage: 'produce',
            kind: 'art_regenerated',
            detail: `qa-art rejected art ${ids}; regenerated and re-judged (attempt ${attempt}).`,
          });
        }
      }
      // Two repairs did not settle it. Fall through: sensor() runs qa-art once
      // more and reports the real verdict, so the failure is never swallowed.
    };

    const sensor = async (script, what, { redraftable = false } = {}) => {
      if (opts.dryRun) { log(`${script}: skipped (dry run)`); return; }

      // A gate that silently does not run is worse than no gate -- it reports
      // safety it never checked. If the file is missing after the template sync,
      // that is a defect in the scaffold, not a reason to continue.
      if (!fs.existsSync(path.join(dir, script))) {
        throw new Error(
          `${script} is missing from ${dir} -- the quality gate for ${what} cannot run. ` +
          `Check that it exists in ${PATHS.videoTemplates}.`
        );
      }

      try {
        const res = await run('node', [script], { timeoutMs: 20 * 60 * 1000 });
        const verdict = String(res.stdout || '').split(/\r?\n/)
          .map((l) => l.trim()).filter(Boolean).pop() || 'passed';
        sensorResults.push({ ok: true, sensor: script, what, detail: verdict.slice(0, 300) });
        return;
      } catch (e) {
        // A spawn failure or a timeout is an infrastructure problem, not a
        // verdict on the video -- rethrow so the stage's own retry handles it.
        if (!(e instanceof shell.CommandError) || e.code === null) throw e;

        const findings = `${e.stdout || ''}\n${e.stderr || ''}`
          .split(/\r?\n/).map((l) => l.trim())
          .filter((l) => l && !/^\[.*\] (Reviewed|Judge)/.test(l))
          .slice(-25).join('\n');

        sensorResults.push({ ok: false, sensor: script, what, detail: findings.slice(0, 800) });
        // A script-level sensor reads only beats.js, so its findings ARE a redraft
        // brief -- specific, line-level and addressable by rewriting the script.
        // Killing the run instead would mean the strictest gates could only ever
        // reject a video, never improve one, and the LLM reviewer that passed it
        // has no way to learn what the deterministic check saw.
        if (redraftable) {
          throw new RedraftError(
            `${what} FAILED (${script}):\n${findings}`,
            { fromStage: 'script', verdict: 'SENSOR_FAIL', feedback: findings }
          );
        }

        // RejectedError keeps only `verdict` and `details`, so the sensor's identity
        // goes INSIDE details -- passed as a sibling key it is silently dropped and
        // the Slack report cannot say which gate failed.
        throw new RejectedError(
          `${what} FAILED (${script}, exit ${e.code}):\n${findings}`,
          { verdict: 'SENSOR_FAIL', details: { sensor: script, what, findings } }
        );
      }
    };

    // Script-level sensors run BEFORE the spend gate: both read only beats.js, so
    // a script that would produce a bad video costs nothing to reject here.
    await sensor('qa-visuals.js', 'the Evals-Grade Visual Standard', { redraftable: true });
    await sensor('qa-cutouts.js', 'half-cut props on cutout beats', { redraftable: true });

    // --- spend gate (ILHAM plan 3.2) -------------------------------------
    // Priced from this video's own beats, and from what is already on disk, so
    // a retry after a crash is correctly costed at $0 rather than blocked again.
    const est = estimateSpend(artifacts.script && artifacts.script.beats, dir);
    const budget = opts.budgetUsd;
    const spendApproved = est.totalUsd === 0
      || (budget !== null && budget !== undefined && (st.spend.usd + est.totalUsd) <= budget);

    log(`estimated spend: ${est.images} image(s) x $${COST.imagePerImage} = $${est.artUsd}` +
        ` + ${est.clips} TTS clip(s) x $${COST.ttsPerClip} = $${est.ttsUsd}` +
        (est.animBeats ? ` + ${est.animBeats} animated beat(s) / ${est.animSecs}s x $${COST.i2vPerSecond} = $${est.animUsd}` : '') +
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

    // 2b. judge the PIXELS. qa-visuals read the script; this reads the images and
    // catches what no text gate can see -- flipped hands, melted faces, baked-in
    // lettering. Costs a few paise and runs before TTS and the ~1h render, so a
    // defective image is caught while regenerating it is still cheap.
    // A single bad image used to cost the whole lesson. The first real course
    // build died here: 12 of 13 images passed and one had a letter baked into a
    // prop, so a ~$1.50 render was thrown away over roughly three cents of art.
    //
    // qa-art already names the offending ids and the command that fixes them
    // ("regenerate these: ART_IDS=18 node generate-lesson-art-gemini.js --yes"),
    // so take it at its word: regenerate only those, then judge again. Bounded
    // at two attempts -- art that fails twice is a prompt problem, not a dice
    // roll, and looping on a paid generator is how a bug becomes an invoice.
    await repairArt();
    await sensor('qa-art.js', 'anatomy/rendering defects in the generated art');

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

    // 4b. animation -- real image-to-video motion on the beats that asked for it.
    // Runs AFTER TTS because it prices and trims each clip against that beat's
    // measured voiceover length from durations.json, and BEFORE the render because
    // compile-lesson.js picks up clips/<id>.mp4 in place of the still.
    //
    // Deliberately NOT fatal. A video with Ken Burns on every beat is the format we
    // shipped for months; a run that dies because kie is out of credits would trade a
    // good video for no video. The fallback is logged and carried into the QA
    // evidence, never silent.
    const motionBeats = ((artifacts.script && artifacts.script.beats) || [])
      .filter((b) => b.mode !== 'info' && b.art && b.motion);

    if (!motionBeats.length) {
      log('no beat asks for motion -- stills with the Ken Burns camera');
    } else if (hasOutput(path.join(dir, 'clips'), '.mp4')) {
      log(`clips/ already populated -- skipping animation (no re-spend)`);
      sensorResults.push({ ok: true, sensor: 'animate', what: 'i2v motion', detail: 'clips already on disk' });
    } else {
      // Re-price against the real durations now that TTS has measured them, and
      // re-check the budget: the pre-TTS estimate used the 5s floor.
      const animSecs = motionBeats.reduce((a, b) => a + i2vSeconds(readDuration(dir, b.id)), 0);
      const animUsd = Number((animSecs * COST.i2vPerSecond).toFixed(2));
      const room = budget === null || budget === undefined ? 0 : budget - (st.spend.usd + animUsd);

      if (opts.dryRun) {
        log(`animation: skipped (dry run) -- would animate ${motionBeats.length} beat(s), ~$${animUsd}`);
      } else if (room < 0) {
        // Not an error: the still version is a complete video.
        log(`animation SKIPPED -- ${motionBeats.length} beat(s) / ${animSecs}s would cost $${animUsd}, ` +
            `over the remaining budget. Falling back to stills.`);
        state.recordIntervention(st, {
          stage: 'produce',
          kind: 'animation_skipped_over_budget',
          detail: `i2v needs $${animUsd}; budget left $${(budget - st.spend.usd).toFixed(2)}`,
        });
        sensorResults.push({
          ok: true, sensor: 'animate', what: 'i2v motion',
          detail: `skipped: $${animUsd} over budget -- video uses stills`,
        });
      } else {
        log(`animating ${motionBeats.length} beat(s) / ${animSecs}s (paid, ~$${animUsd})`);
        try {
          await run('node', ['generate-lesson-video-omni.js', '--yes'], {
            env: { ...process.env, ART_IDS: motionBeats.map((b) => b.id).join(',') },
            timeoutMs: 45 * 60 * 1000,
          });
          // Count what actually arrived. generate-lesson-video-omni.js sets a non-zero
          // exit on a per-beat failure but still writes the clips that succeeded, and
          // partial motion is fine -- so trust the files, not the exit code.
          const got = missingPerBeat(motionBeats, dir, 'clips', (id) => `${id}.mp4`);
          const made = motionBeats.length - got.length;
          state.recordSpend(st, {
            stage: 'produce',
            usd: Number((made > 0 ? (animSecs * COST.i2vPerSecond * made / motionBeats.length) : 0).toFixed(2)),
            detail: `kie i2v: ${made} clip(s)`,
          });
          log(`animation: ${made}/${motionBeats.length} beat(s) moving` +
              (got.length ? ` (${got.join(',')} stayed still)` : ''));
          sensorResults.push({
            ok: true, sensor: 'animate', what: 'i2v motion',
            detail: `${made}/${motionBeats.length} beats animated`,
          });
        } catch (e) {
          log(`animation FAILED (${String(e.message).split('\n')[0].slice(0, 160)}) -- falling back to stills`);
          state.recordIntervention(st, {
            stage: 'produce', kind: 'animation_failed',
            detail: String(e.message).slice(0, 300),
          });
          sensorResults.push({
            ok: false, sensor: 'animate', what: 'i2v motion',
            detail: `failed, video uses stills: ${String(e.message).split('\n')[0].slice(0, 200)}`,
          });
        }
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
      // stitch-brand.js shells out to brand-intro-outro/render-bumpers.js, which
      // drives headless Chrome -- so that project needs its own dependencies.
      // Step 1 installs them for the VIDEO folder; nothing ever did it for the
      // brand folder, and .dockerignore excludes every node_modules, so on a
      // fresh container the very last step of the pipeline died with a bare
      // "Exit 1" after the whole video had already been rendered and paid for.
      if (!fs.existsSync(path.join(PATHS.brandBumpers, 'node_modules'))) {
        log('npm i (brand bumpers)');
        await run('npm', ['i'], { cwd: PATHS.brandBumpers, timeoutMs: 15 * 60 * 1000 });
      }

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

    // 8. grammar/clarity over every human-readable string -- narration and the
    // on-screen cards. Last because it reads beats.js, which nothing after the
    // render changes, and because its findings are line edits: cheap to act on,
    // and embarrassing to ship.
    // NOT redraftable: this runs after the render, and rewinding to script here
    // would discard a finished video over a comma. The findings go to a human.
    await sensor('eval-text.js', 'grammar and clarity of the spoken and on-screen text');

    const finalPath = path.join(dir, final);
    if (!opts.dryRun && !fs.existsSync(finalPath)) {
      throw new Error(`verify.js passed but ${final} is missing -- refusing to report success`);
    }

    return { dir, finalPath, title, bare: path.join(dir, bare), verifyChecks, sensorResults };
  },
});
