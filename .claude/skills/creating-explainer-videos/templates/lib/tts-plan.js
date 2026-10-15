'use strict';
/*
 * tts-plan.js — pass-2 of tts-lesson.js as a pure function, with PINNING.
 *
 * Pass 2 normalises every clip's tempo toward the lesson's median speaking rate
 * (±10%). Computed over the whole lesson, that meant changing ONE line moved the
 * median and re-timed every other clip by a few percent — every durations.json
 * entry shifted, and a partial redo (contract 1.3) could not splice the untouched
 * scenes back in because none of them were untouched any more.
 *
 * A PINNED beat is one whose take is a cache hit (same text, same voice, same
 * directive) AND whose final wav and duration already exist: it keeps its bytes
 * and its measured seconds verbatim, factor 1, no ffmpeg pass. The median is
 * still taken over every beat, so an unpinned line is normalised toward the
 * lesson it sits in, not toward the handful of lines that changed.
 *
 * @param {Array<{id:string, secs:number, voLen:number, pinned?:boolean, pinnedSecs?:number}>} items
 *   secs: the RAW take's length; voLen: characters of spoken text; pinnedSecs: the
 *   previously measured final duration (required when pinned).
 * @returns {Array<{id:string, pinned:boolean, factor:number, secs:number|null}>}
 */
function plan(items, { clamp = 0.1 } = {}) {
  const list = Array.isArray(items) ? items : [];
  const rates = list.map((it) => it.secs / Math.max(8, Number(it.voLen) || 0)); // sec per char
  const sorted = [...rates].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 1;

  return list.map((it, i) => {
    const pinned = Boolean(it.pinned) && Number.isFinite(it.pinnedSecs);
    if (pinned) return { id: it.id, pinned: true, factor: 1, secs: it.pinnedSecs };
    let factor = median > 0 ? rates[i] / median : 1;   // >1 => slower than median => speed up
    if (!Number.isFinite(factor)) factor = 1;
    factor = Math.min(1 + clamp, Math.max(1 - clamp, factor));
    return { id: it.id, pinned: false, factor: Number(factor.toFixed(4)), secs: null };
  });
}

module.exports = { plan };
