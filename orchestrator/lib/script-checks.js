'use strict';
/**
 * script-checks -- every check on a script that needs no model and no file.
 *
 * Contract 1.4: an instructor edits a beat at the script gate and the LMS needs a
 * verdict NOW, in the same request, at $0. These are the deterministic rules the
 * pipeline already enforces, pulled together so one call answers:
 *
 *   validateBeats          structure, ids, modes, vo/art/info presence, quiz shape
 *   caption <= 8 words     asked for in the prompt and the schema, enforced nowhere
 *                          until this module (the renderer wraps a long one off-frame)
 *   lf-limits              motion-graphics on-screen text lengths (qa-info's table)
 *   checkpoint rules       qa-checkpoint's rules, as a function (templates/lib)
 *
 * Returns findings, never throws on content. Each finding names the check and the
 * beat so the LMS can put it next to the field the instructor just typed in.
 *
 * @typedef {{check:string, beatId:string|null, message:string}} Finding
 */

const path = require('path');
const { validateBeats } = require('./validate-beats');
const { PATHS } = require('./paths');
const purposeLib = require('./purpose');
const styles = require('./styles');

const MAX_CAP_WORDS = 8;

function tpl(name) { return require(path.join(PATHS.videoTemplates, 'lib', name)); }

function capWords(cap) {
  return String(cap || '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * @param {Array} beats
 * @param {{ item?:object, videoDir?:string }} o
 *   item: the queue item or job fields the purpose and style are read from
 *   videoDir: where animation/info*.js live, so unknown templates are caught;
 *             omit and the template-name check is skipped (validateBeats does that itself)
 * @returns {{ errors: Finding[], warnings: Finding[] }}
 */
function deterministicChecks(beats, { item = {}, videoDir = null } = {}) {
  const errors = [];
  const warnings = [];
  const purpose = purposeLib.purposeOf(item);
  const motion = styles.styleOf(item).id === 'motion-graphics';

  const v = validateBeats(beats, videoDir, { strictCanon: purpose.needsProtagonist, requireCheckpoint: purpose.needsCheckpoint });
  for (const e of v.errors) errors.push({ check: 'validate-beats', beatId: beatIdOf(e), message: e });
  for (const w of v.warnings) warnings.push({ check: 'validate-beats', beatId: beatIdOf(w), message: w });

  if (Array.isArray(beats)) {
    for (const b of beats) {
      if (!b || !b.id) continue;
      if (b.cap && capWords(b.cap) > MAX_CAP_WORDS) {
        errors.push({
          check: 'caption-length', beatId: String(b.id),
          message: `beat ${b.id}: caption is ${capWords(b.cap)} words; the limit is ${MAX_CAP_WORDS}. Shorten it to the sentence's point, not its paraphrase.`,
        });
      }
      if (b.mode === 'info' && b.info && /^lf/.test(String(b.info.tpl || ''))) {
        const over = tpl('lf-limits.js').overLimit(b.info.tpl, b.info.data);
        for (const o of over) {
          errors.push({
            check: 'lf-limits', beatId: String(b.id),
            message: o.count !== undefined
              ? `beat ${b.id}: ${b.info.tpl}.${o.field} has ${o.count} items; the frame fits ${o.limit}.`
              : `beat ${b.id}: ${b.info.tpl}.${o.field} is ${o.length} characters; the frame fits ${o.limit}.`,
          });
        }
      }
    }
    const cp = tpl('checkpoint-checks.js').checkpointChecks(beats, { required: purpose.needsCheckpoint });
    for (const p of cp.problems) errors.push({ check: 'checkpoint', beatId: beatIdOf(p), message: p });
    if (!purpose.allowsCheckpoint && cp.count) {
      errors.push({ check: 'checkpoint', beatId: null, message: `a ${purpose.id} video asks no question; remove the checkpoint beat.` });
    }
  }
  return { errors, warnings, motion };
}

function beatIdOf(message) {
  const m = String(message).match(/^beat (\S+?):/);
  return m ? m[1] : null;
}

/**
 * Findings that are new since `before`. An instructor's edit is judged on what it
 * changed: a script the pipeline already accepted with a warning-level oddity must
 * not become uneditable because the oddity predates the edit.
 */
function newFindings(before, after) {
  const seen = new Set(before.map((f) => `${f.check}|${f.beatId}|${f.message}`));
  return after.filter((f) => !seen.has(`${f.check}|${f.beatId}|${f.message}`));
}

module.exports = { deterministicChecks, newFindings, MAX_CAP_WORDS };
