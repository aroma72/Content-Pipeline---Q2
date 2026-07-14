'use strict';
/*
 * make-music.js — synthesize a calm, warm, contemplative piano-style bed
 * (in the reflective vein of School-of-Life explainers) when no licensed track
 * is supplied. Drop a real track at brand/music.mp3 to override this entirely.
 *
 *   node make-music.js --dur 71.2 --out _music.wav
 *
 * Method: each note is a struck-then-decaying enveloped tone (fundamental + a
 * soft octave), placed on a slow arpeggio in C major over a gentle bass; the
 * one-bar pattern is looped to length, softened (lowpass), given room (aecho),
 * and loudness-normalized to a subtle level. Not a real piano, but musical and
 * unobtrusive — no drone.
 */
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

function arg(n, d) { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : d; }
const DUR = parseFloat(arg('dur', '30'));
const OUT = path.resolve(arg('out', '_music.wav'));

const BAR = 6.8;                       // seconds per pattern
const SR = 48000;
const BAR_SAMPLES = Math.round(BAR * SR);

// [freq, startSec, noteDur, volume] — slow C-major arpeggio up/down + soft bass
const NOTES = [
  [261.63, 0.00, 1.6, 0.34], // C4
  [329.63, 0.85, 1.6, 0.32], // E4
  [392.00, 1.70, 1.6, 0.32], // G4
  [493.88, 2.55, 1.6, 0.30], // B4
  [523.25, 3.40, 1.8, 0.30], // C5
  [392.00, 4.25, 1.6, 0.32], // G4
  [329.63, 5.10, 1.6, 0.32], // E4
  [261.63, 5.95, 1.6, 0.34], // C4
  [130.81, 0.00, 3.4, 0.26], // C3 bass
  [196.00, 3.40, 3.4, 0.26], // G3 bass
];

const inputs = [];
const filters = [];
const labels = [];
NOTES.forEach(([f, start, ndur, vol], i) => {
  // fundamental + soft octave, struck envelope (fast attack, long decay)
  inputs.push('-f', 'lavfi', '-i', `sine=frequency=${f}:sample_rate=${SR}:duration=${ndur}`);
  inputs.push('-f', 'lavfi', '-i', `sine=frequency=${f * 2}:sample_rate=${SR}:duration=${ndur}`);
  const a = i * 2, b = i * 2 + 1;
  const ms = Math.round(start * 1000);
  const out0 = Math.max(0.12, ndur - 1.25).toFixed(2);
  filters.push(
    `[${a}:a]afade=t=in:d=0.006,afade=t=out:st=${out0}:d=1.2,volume=${vol}[f${i}]`,
    `[${b}:a]afade=t=in:d=0.006,afade=t=out:st=${out0}:d=1.0,volume=${(vol * 0.28).toFixed(3)}[o${i}]`,
    `[f${i}][o${i}]amix=inputs=2:normalize=0,adelay=${ms}|${ms},apad=whole_dur=${BAR}[n${i}]`
  );
  labels.push(`[n${i}]`);
});

const fadeOut = Math.max(0, DUR - 2.5).toFixed(2);
filters.push(
  `${labels.join('')}amix=inputs=${labels.length}:normalize=0[bar]`,
  `[bar]aloop=loop=-1:size=${BAR_SAMPLES},atrim=0:${DUR.toFixed(2)},` +
  `lowpass=f=2600,aecho=0.85:0.9:70|150:0.28|0.18,` +
  `loudnorm=I=-23:TP=-3.0,` +
  `afade=t=in:st=0:d=1.6,afade=t=out:st=${fadeOut}:d=2.5,` +
  `aformat=channel_layouts=stereo[m]`
);

console.log(`[music] synthesizing calm piano bed — ${DUR.toFixed(1)}s`);
execFileSync(ffmpeg, ['-y', ...inputs, '-filter_complex', filters.join(';'),
  '-map', '[m]', '-t', DUR.toFixed(2), OUT], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`[music] -> ${OUT}`);
