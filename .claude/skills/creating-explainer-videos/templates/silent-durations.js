'use strict';
/*
 * silent-durations.js — durations.json for a video with NO voiceover.
 *
 *     node silent-durations.js        # writes durations.json; buys nothing
 *
 * Contract 1.4 lets an instructor ask for a video with no spoken track. Everything
 * downstream of TTS — compile-lesson, animation pricing, verify — reads each beat's
 * seconds from durations.json, which tts-lesson.js writes from the synthesised clip.
 * With no clip the seconds come from how long the on-screen words take to READ:
 *
 *   secs = clamp( max(3, words(cap + overlay + info text) * 0.42 + 1.0) + holdAfter, 3, 10 )
 *
 * 0.42 s/word is tts-lesson's own fallback rate; the extra second is the eye finding
 * the text. The floor keeps a wordless frame on screen long enough to register, the
 * ceiling stops a dense info card parking the video. Checkpoint beats are not shots
 * (lib/beats-util.js) and get no entry, same as tts-lesson.
 *
 * No audio/ clips are written. compile-lesson's mix (mix-audio.js) lays silence under
 * the frames when SILENT=1, and stitch-brand's music bed carries the sound.
 */
const fs = require('fs');
const path = require('path');
const { renderable } = require('./lib/beats-util');

const SECONDS_PER_WORD = 0.42;
const FIND_TEXT_SECONDS = 1.0;
const MIN = 3;
const MAX = 10;

function textOf(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(textOf).join(' ');
  if (typeof v === 'object') return Object.values(v).map(textOf).join(' ');
  return String(v);
}
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

function silentSeconds(b) {
  const onScreen = [b.cap, b.overlay && b.overlay.data, b.info && b.info.data].map(textOf).join(' ');
  const read = Math.max(MIN, words(onScreen) * SECONDS_PER_WORD + FIND_TEXT_SECONDS);
  const hold = Number(b.holdAfter) > 0 ? Number(b.holdAfter) : 0;
  return +Math.min(MAX, Math.max(MIN, read + hold)).toFixed(3);
}

if (require.main === module) {
  const beats = renderable(require(path.join(process.cwd(), 'beats.js')));
  const durations = {};
  for (const b of beats) {
    durations[b.id] = silentSeconds(b);
    console.log(`[silent] ${b.id} ${durations[b.id]}s`);
  }
  fs.writeFileSync(path.join(process.cwd(), 'durations.json'), JSON.stringify(durations, null, 2));
  const total = Object.values(durations).reduce((a, s) => a + s, 0);
  console.log(`[silent] durations.json written for ${beats.length} beat(s), ${total.toFixed(1)}s, no voice bought`);
}

module.exports = { silentSeconds, MIN, MAX };
