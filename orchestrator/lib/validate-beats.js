'use strict';
/**
 * Structural validation of beats.js, run BEFORE anything is bought or rendered.
 *
 * Exists because of a real hour lost: four `info` beats carried an `overlay`
 * but no `info: {tpl, data}`. animation/lesson.html renders an info beat only
 * when `beat.info && window.InfoTemplates[beat.info.tpl]` is truthy, so those
 * beats rendered as blank cream frames -- silently. Art and TTS were bought, the
 * render ran, and nothing failed; a third of the video was simply empty.
 *
 * Every check here is cheap and catches something that is otherwise invisible
 * until a human watches the finished video.
 */

const fs = require('fs');
const path = require('path');
const { ALI, mentionsAli, missingAliMarkers } = require('./characters');

/** Template names are read from animation/info.js so this can't drift from it. */
function knownTemplates(videoDir) {
  const file = path.join(videoDir, 'animation', 'info.js');
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, 'utf8');
  const names = [...src.matchAll(/\bT\.([A-Za-z0-9_]+)\s*=/g)].map((m) => m[1]);
  return names.length ? names : null;
}

/**
 * Mechanical repairs for the two illustration-beat faults that cost a run on
 * 2026-09-22: an overlay with no or an unknown `tpl` (renders nothing), and an
 * `ali`/`scene` beat left wordless by it. Both are fixable without a model --
 * drop the dead overlay, borrow a caption from the beat's own vo -- so they are
 * repaired here for $0 instead of spent on as a redraft, twice, then a lenient
 * third draft that a deterministic check fails identically.
 *
 * Pure: never mutates its input. `tpls` is the known template list, or null when
 * animation/info.js is not there yet (then only a MISSING tpl is a fault).
 *
 * @returns {{beats: object[], repairs: string[]}}
 */
function repairBeats(beats, tpls) {
  const repairs = [];
  if (!Array.isArray(beats)) return { beats, repairs };
  const out = beats.map((b) => {
    if (!b || (b.mode !== 'ali' && b.mode !== 'scene')) return b;
    const at = `beat ${b.id || '(no id)'}`;
    let fixed = b;
    const overlayDraws = Boolean(b.overlay && b.overlay.tpl
      && (!tpls || tpls.includes(b.overlay.tpl)));
    if (b.overlay && !overlayDraws) {
      const { overlay, ...rest } = fixed;
      fixed = rest;
      repairs.push(`${at}: dropped an overlay that would render nothing (${
        overlay.tpl ? `unknown template '${overlay.tpl}'` : 'no tpl'})`);
    }
    const draws = Boolean(fixed.overlay && fixed.overlay.tpl && (!tpls || tpls.includes(fixed.overlay.tpl)));
    if (!fixed.cap && !draws) {
      const cap = capFromVo(fixed.vo);
      if (cap) {
        fixed = { ...fixed, cap };
        repairs.push(`${at}: added cap "${cap}" from its own vo so the frame carries words`);
      }
    }
    return fixed;
  });
  return { beats: out, repairs };
}

/** The first eight words of a line, without trailing punctuation. */
function capFromVo(vo) {
  const words = String(vo || '').trim().split(/\s+/).filter(Boolean).slice(0, 8);
  const cap = words.join(' ').replace(/[\s.,;:!?]+$/, '');
  return cap || null;
}

/**
 * @returns {{errors: string[], warnings: string[]}}
 */
function validateBeats(beats, videoDir, opts = {}) {
  // strictCanon: true while authoring (a fix is free), false once art is bought.
  const strictCanon = opts.strictCanon === true;
  const errors = [];
  const warnings = [];

  if (!Array.isArray(beats) || beats.length === 0) {
    return { errors: ['beats.js did not export a non-empty array'], warnings };
  }

  const tpls = knownTemplates(videoDir);
  const seenIds = new Set();

  for (const b of beats) {
    const at = `beat ${b && b.id ? b.id : '(no id)'}`;

    if (!b || !b.id) { errors.push(`${at}: missing id`); continue; }
    if (seenIds.has(b.id)) errors.push(`${at}: duplicate id`);
    seenIds.add(b.id);

    // An illustration beat has to carry words of its own.
    //
    // animation/lesson.html draws an `ali` or `scene` beat as its art and NOTHING
    // else unless the beat has a `cap` or a WORKING `overlay`. The prompt asks for
    // one, and on the first run the model supplied 11 of 14 and skipped 3.
    //
    // "Working" is the whole subtlety, and it cost a paid render to find. The
    // renderer draws an overlay only `if (beat.overlay && InfoTemplates[tpl])`,
    // so an overlay naming a template that does not exist renders NOTHING while
    // still looking, to a validator checking only for presence, like words on
    // screen. That is the same trap this file's header records for `info` beats,
    // one layer over -- and it let a `scene` beat reach qa-frames wordless after
    // the art and voice were bought.
    //
    // strictCanon only: before art is bought a missing caption is a rewrite; after
    // it, throwing the render away over one would cost more than the fault.
    if (b.mode === 'ali' || b.mode === 'scene') {
      const overlayDraws = Boolean(b.overlay && b.overlay.tpl
        && (!tpls || tpls.includes(b.overlay.tpl)));
      if (b.overlay && !overlayDraws) {
        const why = !b.overlay.tpl
          ? `${at}: overlay has no 'tpl', so it renders nothing.`
          : `${at}: unknown overlay template '${b.overlay.tpl}' -- it renders NOTHING.`
            + (tpls ? ` Available: ${tpls.join(', ')}.` : '');
        if (strictCanon) errors.push(why); else warnings.push(why);
      }
      if (!b.cap && !overlayDraws) {
        const msg = `${at}: an ${b.mode} beat draws art and no text. Add a short 'cap' `
          + '(<= 8 words) or a working overlay, or the frame carries no words at all.';
        if (strictCanon) errors.push(msg); else warnings.push(msg);
      }
    }


    // A checkpoint is never spoken, so an empty vo is correct for it and a
    // FILLED one is the bug -- a voiced checkpoint reads the question aloud to a
    // learner who is about to be asked it in a popup.
    if (b.mode === 'checkpoint') {
      if (b.vo && String(b.vo).trim()) {
        errors.push(`${at}: a checkpoint beat must not have a vo -- it is never spoken.`);
      }
    } else if (!b.vo || !String(b.vo).trim()) errors.push(`${at}: empty vo`);
    else {
      const sentences = String(b.vo).split(/(?<=[.!?])\s+/).filter(Boolean);
      if (sentences.length > 1) {
        warnings.push(`${at}: ${sentences.length} sentences in one beat (house rule is one)`);
      }
    }

    if (!['ali', 'scene', 'info', 'checkpoint'].includes(b.mode)) {
      errors.push(`${at}: mode must be ali|scene|info|checkpoint, got ${JSON.stringify(b.mode)}`);
      continue;
    }

    // A `quiz` on a beat that IS drawn and IS spoken is the old card wearing the
    // new field: it puts the question and its answer on screen, which is the exact
    // thing the checkpoint replaced.
    if (b.mode !== 'checkpoint' && b.quiz) {
      errors.push(
        `${at}: a ${b.mode} beat carries a quiz payload. Only a checkpoint beat may ` +
        `have one -- this would draw the question and its answer on screen. Delete ` +
        `the quiz from this beat; the checkpoint already asks it.`
      );
    }

    if (b.mode === 'checkpoint') {
      checkQuiz(errors, at, b.quiz, {
        what: 'checkpoint',
        // The popup is the only feedback a learner who chose wrong ever sees, so
        // unlike the old on-screen card this one cannot go out without a reason.
        requireExplain: true,
      });
      continue;   // nothing else applies: it is not drawn and not spoken
    }

    if (b.mode === 'info') {
      // The blank-frame bug, caught before a single dollar is spent.
      if (!b.info || !b.info.tpl) {
        errors.push(
          `${at}: info beat has no info:{tpl,data} -- it will render as a BLANK frame. ` +
          `An 'overlay' alone is not enough.` +
          (tpls ? ` Available templates: ${tpls.join(', ')}.` : '')
        );
      } else if (tpls && !tpls.includes(b.info.tpl)) {
        errors.push(
          `${at}: unknown info template '${b.info.tpl}' -- renders blank. ` +
          `Available: ${tpls.join(', ')}.`
        );
      }
      if (b.art) warnings.push(`${at}: info beats ignore 'art' -- you are paying for an unused image`);
    } else {
      if (!b.art || !String(b.art).trim()) {
        errors.push(`${at}: ${b.mode} beat needs an 'art' prompt`);
      } else {
        // Art prompts must forbid baked-in text; teaching text is HTML.
        if (!/no text|without text|no letters/i.test(b.art)) {
          warnings.push(`${at}: art prompt does not forbid text -- risks baked-in lettering`);
        }
        if (b.mode === 'ali' && !/no ground|no shadow|plain (flat )?cream/i.test(b.art)) {
          warnings.push(`${at}: ali beat art should specify plain cream, no ground/shadow, or the cutout fails`);
        }
        // Ali must look the same in every video, not just within one. Three videos
        // produced three different men before this check existed.
        //
        // BLOCKING while the script is being written (fixing costs nothing), but
        // only a warning once the art exists: by then the images are paid for, and
        // an inconsistent Ali is a series-continuity flaw, not a broken video.
        // Blocking there would throw away real money to enforce a preference --
        // the same mistake as a reviewer that fails sound work over phrasing.
        if (mentionsAli(b.art)) {
          const missing = missingAliMarkers(b.art);
          if (missing.length) {
            const msg = `${at}: art depicts Ali but omits canonical detail(s) [${missing.join(', ')}] -- ` +
              `he must look identical across the whole series. Use: "${ALI}".`;
            if (strictCanon) errors.push(msg); else warnings.push(msg);
          }
        }

        // Imagen returns NO IMAGE BYTES for prompts depicting children -- silently,
        // with an empty response. Measured: the one beat in this video showing a
        // "young Pakistani schoolgirl" was the only art call that failed, and it
        // failed identically on every retry. For an education pipeline this is a
        // hard limit worth catching before the money and the retries.
        const child = String(b.art).match(
          /\b(schoolgirl|schoolboy|school ?child(?:ren)?|child|children|kid|kids|pupil|toddler|infant|teenager|young (?:girl|boy)|little (?:girl|boy))\b/i
        );
        if (child) {
          errors.push(
            `${at}: art depicts a child ("${child[0]}") -- Imagen's safety filter returns no ` +
            `image for these, so the beat would render blank. Show the student's WORK ` +
            `(blank exercise books, worksheets, an empty chair) instead of the student.`
          );
        }

        // An `ali` beat animates ONE cutout. A prop that moves independently gets
        // dropped or sliced by the segmenter -- and on these beats the prop is
        // usually the point of the sentence. The gate flagged this in EVERY run
        // today, so catch it before a round is spent on it.
        if (b.mode === 'ali') {
          const moving = String(b.art).match(
            /\b(fall(?:s|ing)?|drift(?:s|ing)?|float(?:s|ing)? (?:away|off|out)|separat\w*|scatter\w*|slid(?:e|es|ing)|tumbl\w*|spill\w*|pil(?:e|es|ing) up|peel\w*|lift(?:s|ing)? off|travel\w*|mov(?:e|es|ing) (?:across|apart))\b/i
          );
          if (moving) {
            warnings.push(
              `${at}: ali beat describes a prop that moves on its own ("${moving[0]}") -- ` +
              `a single-subject cutout cannot animate a separate prop. Use mode "scene".`
            );
          }
        }
      }
    }
  }

  // --- whole-script: the mandatory CHECKPOINT ---------------------------------
  // SCRIPTING_STANDARDS 3b, effective 2026-09-11: the question is never drawn and
  // never spoken. The player pauses on the beat boundary and the LMS shows it.
  //
  // This replaced the QUESTION -> REVEAL cards, and had the same history as every
  // other rule in this file: mandated in prose, enforced nowhere, so the
  // autonomous path kept emitting the superseded format -- and a lone quiz card
  // with its answer baked in produces NO checkpoint at all from the API, so those
  // videos reached the LMS with no question. Encode it in structure.
  const checkpoints = beats.filter((b) => b && b.mode === 'checkpoint');

  if (!checkpoints.length) {
    errors.push(
      `no CHECKPOINT beat: every video must ask the learner one question the LMS can ` +
      `pop over the player. Add { id, mode: 'checkpoint', quiz: { stem, options, answer, ` +
      `explain } } between two spoken beats, around the two-thirds mark. It is never ` +
      `drawn and never spoken, so it needs no vo, no art and no duration.`
    );
  }

  for (const c of checkpoints) {
    const i = beats.indexOf(c);
    const spokenBefore = beats.slice(0, i).some((b) => b && b.mode !== 'checkpoint');
    const spokenAfter = beats.slice(i + 1).some((b) => b && b.mode !== 'checkpoint');
    // With no sentence on one side there is no boundary to pause on, and the API
    // marks pause.safe false -- the LMS is told never to fire those, so the
    // question would simply never appear.
    if (!spokenBefore || !spokenAfter) {
      errors.push(
        `beat ${c.id}: a checkpoint cannot be the first or last beat -- it needs a spoken ` +
        `sentence either side to pause between.`
      );
    }
  }

  if (checkpoints.length > 1) {
    warnings.push(
      `${checkpoints.length} checkpoint beats -- the house format is ONE question per video ` +
      `(beats ${checkpoints.map((c) => c.id).join(', ')})`
    );
  }

  // A checkpoint AND an on-screen quiz card is the same question twice, once with
  // the answer visible. Whichever the LMS shows, the learner has already seen it.
  if (checkpoints.length) {
    for (const q of beats.filter((b) => b && b.mode === 'info' && b.info && b.info.tpl === 'quiz')) {
      errors.push(
        `beat ${q.id}: an on-screen quiz card alongside a checkpoint asks the same ` +
        `question twice, and this one shows the answer. The checkpoint replaced it -- ` +
        `delete this beat or make it teach something else.`
      );
    }
  }

  // --- whole-script: legacy QUESTION -> REVEAL cards ---------------------------
  // Non-negotiable for every lesson video (CLAUDE.md, SCRIPTING_STANDARDS §3b):
  // the viewer is asked something and answers before the reveal. It was mandated
  // in prose for months and enforced nowhere, so the autonomous path simply never
  // produced one -- the same lesson as the blank info beat above. Encode it in
  // structure, do not request it.
  const quizzes = beats.filter((b) => b && b.mode === 'info' && b.info && b.info.tpl === 'quiz');

  // Absence is now correct: the checkpoint replaced it. A card that IS present
  // still has to be well formed, because a recut of an older video keeps it.

  for (const q of quizzes) {
    const at = `beat ${q.id}`;
    const d = (q.info && q.info.data) || {};

    // Without a pause the question and its answer land back-to-back and the
    // viewer never gets to think -- which is the entire point of the beat.
    // holdAfter is real: tts-lesson.js adds it to that beat's trailing silence.
    if (!(Number(q.holdAfter) > 0)) {
      errors.push(
        `${at}: quiz beat has no holdAfter -- the viewer gets no pause to answer in. ` +
        `Add holdAfter: 2 (seconds of silence after the question).`
      );
    }

    // Same class as the blank info beat: a quiz card with no stem or no options
    // renders as an empty box and nothing errors.
    checkQuiz(errors, at, d, { what: 'quiz beat' });
  }

  if (quizzes.length > 1) {
    warnings.push(
      `${quizzes.length} quiz beats -- the house format is ONE question per video ` +
      `(beats ${quizzes.map((q) => q.id).join(', ')})`
    );
  }

  return { errors, warnings };
}

/**
 * The question itself: stem, options, a valid answer index, and (for a
 * checkpoint) the reason a learner who chose wrong needs to read.
 *
 * @param {string[]} errors   collected in place
 * @param {string}   at       "beat 14", for the message
 * @param {object}   q        { stem, options, answer, explain }
 * @param {{what:string, requireExplain?:boolean}} o
 */
function checkQuiz(errors, at, q, { what, requireExplain = false }) {
  if (!q || typeof q !== 'object') {
    errors.push(`${at}: ${what} beat has no quiz:{stem,options,answer,explain}.`);
    return;
  }
  if (!q.stem || !String(q.stem).trim()) {
    errors.push(`${at}: ${what} has no stem -- there would be no question to ask.`);
  }
  if (!Array.isArray(q.options) || q.options.length < 2) {
    errors.push(`${at}: ${what} needs at least 2 options to choose between.`);
  } else if (q.answer == null || !Number.isInteger(q.answer)
             || q.answer < 0 || q.answer >= q.options.length) {
    errors.push(
      `${at}: ${what} answer must be the index of the correct option ` +
      `(0..${q.options.length - 1}), got ${JSON.stringify(q.answer)}.`
    );
  }
  // The popup is the whole feedback loop. Without this the learner is told only
  // that they were wrong, which is the bug that made the old on-screen caption
  // unusable in the first place.
  if (requireExplain && (!q.explain || String(q.explain).trim().length < 40)) {
    errors.push(
      `${at}: ${what} needs an 'explain' written for the learner who just chose wrong -- ` +
      `why their tempting answer is wrong, not only what the right one is.`
    );
  }
}

module.exports = { validateBeats, knownTemplates, repairBeats };
