'use strict';
/*
 * lf-limits.js — how much text each motion-graphics (info-lf.js) field can carry.
 *
 * The flat motion-graphics templates place type at fixed positions. Hand-written P&C and Moawin
 * beats always fitted; the LMS course builder's script model writes ordinary sentences into the
 * same fields, and those ran off the frame and onto each other (2026-10-16). Two guards share
 * this table:
 *   - qa-info.js fails a script whose field is longer than its limit, BEFORE approval and spend,
 *     so the script is redrafted shorter (a free check);
 *   - the prompt (prompts/video_script_motion.txt) quotes the same numbers to the writer.
 * The renderer then wraps and shrinks anything that still crowds (LFFit), and qa-layout.js
 * measures the real frame — these limits are the cheap first line, not the last.
 *
 * Calibrated on every approved hand-made lf video (P&C C1 W1–W4, Moawin 1A): each limit sits at
 * about 1.3–1.5x the longest line those videos used, so all of them pass unchanged.
 * Characters, not words — the frame runs out of width, not vocabulary.
 *
 * Keys: `field` for a string, `field[]` for every string in an array, `a.b` for a nested field;
 * `field#` caps the number of items in an array.
 */
const LF_LIMITS = {
  lfTitle: { text: 40, sub: 70 },
  lfModel: { title: 36, credit: 40, 'letters[]': 3, 'letters#': 5, 'words[]': 18, note: 80 },
  lfIceberg: { tip: 40, 'below[]': 36, 'below#': 3 },
  lfFunnel: { title: 36, 'steps[]': 18, 'questions[]': 60 },
  lfLadder: { title: 36, credit: 30, 'rungs[]': 26, 'rungs#': 5, label: 60 },
  lfJourney: { title: 30, 'stops[]': 14, 'stops#': 5 },
  lfStage: { label: 20, tag: 26 },
  lfScale: { left: 28, right: 28, tag: 24 },
  lfVersus: { left: 18, right: 18, leftSub: 32, rightSub: 32 },
  lfLoop: { title: 30, 'steps[]': 36 },
  lfOptions: { title: 36, 'options[]': 28 },
  lfTalk: { bubble: 150 },
  lfSplit: { 'left.title': 24, 'right.title': 24, 'left.bubble': 120, 'right.bubble': 120, tag: 24 },
  lfDots: { label: 36 },
  lfRecap: { 'items[]': 32, 'items#': 4 },
  lfRow: { id: 12, goal: 40, field: 30, text: 180, stamp: 14 },
  lfNumber: { metric: 40, from: 26, to: 10, now: 18, by: 14, gap: 16 },
};

/** Every limit a beat's data breaks: [{ field, length, limit, count? }]. */
function overLimit(tpl, data) {
  const lim = LF_LIMITS[tpl];
  if (!lim || !data || typeof data !== 'object') return [];
  const get = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const out = [];
  for (const [key, limit] of Object.entries(lim)) {
    if (key.endsWith('#')) {
      const v = get(data, key.slice(0, -1));
      if (Array.isArray(v) && v.length > limit) out.push({ field: key.slice(0, -1), count: v.length, limit });
    } else if (key.endsWith('[]')) {
      const v = get(data, key.slice(0, -2));
      if (Array.isArray(v)) {
        v.forEach((s, i) => {
          if (typeof s === 'string' && s.length > limit) out.push({ field: `${key.slice(0, -2)}[${i}]`, length: s.length, limit, text: s });
        });
      }
    } else {
      const v = get(data, key);
      if (typeof v === 'string' && v.length > limit) out.push({ field: key, length: v.length, limit, text: v });
    }
  }
  return out;
}

module.exports = { LF_LIMITS, overLimit };
