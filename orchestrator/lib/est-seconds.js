'use strict';
/**
 * est-seconds -- how long each beat will run, estimated BEFORE any voice is bought.
 *
 * Contract 1.4: the LMS shows a script to an instructor at the approval gate and
 * wants a running time next to it. The real figure only exists after tts-lesson.js
 * has synthesised every line (durations.json); this is the same arithmetic that
 * script's silence fallback and pause rules use, applied to the words instead.
 *
 *   speech  = max(1.2, words * 0.42)        tts-lesson.js's own fallback rate (~143 wpm)
 *   pause   = 0.7 if the next beat changes mode, else 0.4   (tts-lesson.js pass 2a)
 *   hold    = beat.holdAfter
 *   checkpoint beats are 0: never spoken, never drawn, no duration of their own.
 *
 * Pure. Never reads a file, never throws on a malformed beat (it reports 0 for it).
 */

const SECONDS_PER_WORD = 0.42;
const MIN_SPEECH_SECONDS = 1.2;
const PAUSE_SAME_MODE = 0.4;
const PAUSE_MODE_CHANGE = 0.7;

function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

/**
 * @param {Array<{id:string, mode:string, vo?:string, holdAfter?:number}>} beats
 * @returns {{ perBeat: Object<string, number>, totalSeconds: number }}
 */
function estimateSeconds(beats) {
  const perBeat = {};
  let total = 0;
  if (!Array.isArray(beats)) return { perBeat, totalSeconds: 0 };
  const spoken = beats.filter((b) => b && b.id && b.mode !== 'checkpoint');
  for (const b of beats) {
    if (!b || !b.id) continue;
    if (b.mode === 'checkpoint') { perBeat[b.id] = 0; continue; }
    const i = spoken.indexOf(b);
    const next = spoken[i + 1];
    const speech = Math.max(MIN_SPEECH_SECONDS, words(b.vo) * SECONDS_PER_WORD);
    const pause = (!next || next.mode !== b.mode) ? PAUSE_MODE_CHANGE : PAUSE_SAME_MODE;
    const hold = Number(b.holdAfter) > 0 ? Number(b.holdAfter) : 0;
    const secs = +(speech + pause + hold).toFixed(1);
    perBeat[b.id] = secs;
    total += secs;
  }
  return { perBeat, totalSeconds: +total.toFixed(1) };
}

module.exports = { estimateSeconds, SECONDS_PER_WORD, MIN_SPEECH_SECONDS };
