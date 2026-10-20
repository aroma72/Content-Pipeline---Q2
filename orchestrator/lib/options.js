'use strict';
/**
 * options -- what an instructor chooses about a single video on create.
 *
 * Contract 1.4:
 *
 *   options: { style, lengthMinutes, voiceover, purpose }
 *
 * Every field is optional and a missing one keeps today's behaviour: the default
 * style, the 16-20 beat house length, a spoken voiceover, a lesson. A value we
 * cannot build is refused here (400 bad_options), before a job exists, for the same
 * reason styles.parseStyle refuses: the instructor would only find out from the
 * finished video, after the spend.
 *
 * `style` is also accepted at the top level of the body, as it has been since 1.2.
 */

const styles = require('./styles');
const purpose = require('./purpose');

/** Spoken-beat pacing the script prompt has always assumed: one sentence ~6.2s. */
const SECONDS_PER_BEAT = 6.2;
/** Schema floor; the writer is never asked for fewer. */
const MIN_BEATS = 10;
/** Raised from 22 for contract 1.4: lengthMinutes above ~2.3 needs more beats. */
const MAX_BEATS = 40;
const LENGTH_MINUTES = { min: 1, max: 6 };
/** Today's house length, kept as the default band. */
const DEFAULT_BAND = { beats_min: 16, beats_max: 20 };

/**
 * @param {object} body  the request body (reads body.options and body.style)
 * @returns {{ok:true, options:{style, lengthMinutes, voiceover, purpose}} | {ok:false, field, message}}
 */
function parseOptions(body) {
  const o = (body && body.options) || {};
  if (o && (typeof o !== 'object' || Array.isArray(o))) {
    return { ok: false, field: 'options', message: '`options` must be an object.' };
  }
  const styleValue = o.style !== undefined ? o.style : (body && body.style);
  const st = styles.parseStyle(styleValue);
  if (!st.ok) return { ok: false, field: 'style', message: st.message };

  let lengthMinutes = null;
  if (o.lengthMinutes !== undefined && o.lengthMinutes !== null) {
    const n = Number(o.lengthMinutes);
    if (!Number.isFinite(n) || n < LENGTH_MINUTES.min || n > LENGTH_MINUTES.max) {
      return {
        ok: false, field: 'lengthMinutes',
        message: `\`lengthMinutes\` must be a number from ${LENGTH_MINUTES.min} to ${LENGTH_MINUTES.max} (got ${JSON.stringify(o.lengthMinutes)}).`,
      };
    }
    lengthMinutes = Math.round(n * 2) / 2; // half-minute steps are the finest a beat count can honour
  }

  let voiceover = true;
  if (o.voiceover !== undefined && o.voiceover !== null) {
    if (typeof o.voiceover !== 'boolean') {
      return { ok: false, field: 'voiceover', message: '`voiceover` must be true or false.' };
    }
    voiceover = o.voiceover;
  }

  const p = purpose.parsePurpose(o.purpose);
  if (!p.ok) return { ok: false, field: 'purpose', message: p.message };

  return { ok: true, options: { style: st.style, lengthMinutes, voiceover, purpose: p.purpose } };
}

/**
 * The beat band the writer is asked for. Null lengthMinutes = the house band.
 * ±2 around the target, clamped to what the schema will accept.
 */
function beatBand(lengthMinutes) {
  if (!(Number(lengthMinutes) > 0)) return { ...DEFAULT_BAND };
  const target = Math.round((Number(lengthMinutes) * 60) / SECONDS_PER_BEAT);
  const clamp = (n) => Math.max(MIN_BEATS, Math.min(MAX_BEATS, n));
  return { beats_min: clamp(target - 2), beats_max: clamp(target + 2) };
}

/** What the capabilities block advertises. */
function publicOptions() {
  return {
    styles: styles.STYLE_VALUES,
    lengthMinutes: { ...LENGTH_MINUTES, default: null, note: `about ${SECONDS_PER_BEAT}s per spoken beat; unset = ${DEFAULT_BAND.beats_min}-${DEFAULT_BAND.beats_max} beats` },
    voiceover: [true, false],
    purposes: purpose.publicPurposes(),
  };
}

module.exports = { parseOptions, beatBand, publicOptions, SECONDS_PER_BEAT, MIN_BEATS, MAX_BEATS, LENGTH_MINUTES, DEFAULT_BAND };
