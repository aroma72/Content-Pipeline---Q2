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

    if (!b.vo || !String(b.vo).trim()) errors.push(`${at}: empty vo`);
    else {
      const sentences = String(b.vo).split(/(?<=[.!?])\s+/).filter(Boolean);
      if (sentences.length > 1) {
        warnings.push(`${at}: ${sentences.length} sentences in one beat (house rule is one)`);
      }
    }

    if (!['ali', 'scene', 'info'].includes(b.mode)) {
      errors.push(`${at}: mode must be ali|scene|info, got ${JSON.stringify(b.mode)}`);
      continue;
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

  return { errors, warnings };
}

module.exports = { validateBeats, knownTemplates };
