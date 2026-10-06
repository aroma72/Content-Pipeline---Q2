#!/usr/bin/env node
'use strict';
/*
 * make-music-sol.js — a quiet, through-composed piano-and-strings bed in the School of Life manner.
 *
 *   node make-music-sol.js --dur 127 --out music/sol-bed.wav [--seed 11]
 *   MUSIC_FILE=music/sol-bed.wav node stitch-brand.js ...
 *
 * Why it replaced make-music-people.js (Aroma, 2026-10-06): that bed was too loud and was a
 * one-bar pattern repeated, which the ear hears as a loop within seconds. The School of Life films
 * (sound and music: Tom Drew) sit on sparse, slow, reflective solo piano with soft strings, mixed
 * far under the voice, and they never audibly repeat. So this one:
 *   · never repeats: chords come from a seeded walk over a diatonic progression graph, each chord
 *     lasts a different length, the broken-chord figure, its timing and its velocities are drawn
 *     fresh every time, and a sparse melody wanders stepwise on top;
 *   · has an arc: solo piano → strings swell in under it → thins out → one last held chord;
 *   · sounds like instruments, not sine beeps: the piano has stretched (inharmonic) partials that
 *     decay faster the higher they are, two slightly detuned strings per note and a soft hammer
 *     click; the strings are band-limited saw voices with delayed vibrato and slow bowing swells;
 *     a small Schroeder reverb gives it a room;
 *   · is QUIET: normalised to about -33 dBFS RMS, roughly 15 dB under the narration before
 *     stitch-brand's ducking takes it further down while someone is speaking.
 */
const fs = require('fs');
const path = require('path');

function arg(n, d) { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : d; }
const DUR = parseFloat(arg('dur', '127'));
const OUT = path.resolve(arg('out', 'music/sol-bed.wav'));
let seed = parseInt(arg('seed', '11'), 10) || 11;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (a, b) => a + (b - a) * rnd();

const SR = 44100;
const N = Math.ceil(DUR * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ── harmony: F major, a walk over chords that move naturally into each other ──
const KEY = 53; // F3
const SCALE = [0, 2, 4, 5, 7, 9, 11];
const CH = { I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16], Isus: [0, 5, 7], IVadd9: [5, 9, 12, 19] };
const NEXT = {
  I: ['IV', 'vi', 'IVadd9', 'ii', 'iii'], Isus: ['I'], ii: ['V', 'IV', 'vi'], iii: ['vi', 'IV'],
  IV: ['I', 'ii', 'vi', 'V', 'Isus'], IVadd9: ['I', 'vi', 'ii'], V: ['vi', 'I', 'IV'], vi: ['IV', 'ii', 'iii', 'IVadd9'],
};

// ── voices ──────────────────────────────────────────────────────────────────
function addMono(start, len, fn, pan) {
  const s0 = Math.max(0, Math.floor(start * SR)), s1 = Math.min(N, Math.floor((start + len) * SR));
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = s0; i < s1; i++) { const v = fn((i - s0) / SR); L[i] += v * gl; R[i] += v * gr; }
}
// piano: stretched partials, faster decay up the series, two detuned strings, soft hammer
function piano(f, vel) {
  const B = 0.00035, parts = [];
  for (let n = 1; n <= 8; n++) {
    const fn = f * n * Math.sqrt(1 + B * n * n);
    if (fn > 9000) break;
    parts.push({ fn, a: Math.pow(n, -1.25) * (n === 1 ? 1 : (0.55 + 0.6 * vel)), d: 0.22 + 0.32 * n + f / 1600 });
  }
  const det = Math.pow(2, 0.7 / 1200);
  let hs = 1; // hammer noise source
  return (t) => {
    const atk = Math.min(1, t / 0.004);
    let v = 0;
    for (const p of parts) {
      const env = Math.exp(-t * p.d);
      v += p.a * env * (Math.sin(2 * Math.PI * p.fn * t) + Math.sin(2 * Math.PI * p.fn * det * t)) * 0.5;
    }
    hs = (hs * 16807) % 2147483647;
    const hammer = t < 0.02 ? ((hs / 2147483647) * 2 - 1) * 0.04 * (1 - t / 0.02) : 0;
    return vel * atk * (v + hammer) * 0.22;
  };
}
// strings: band-limited saw, slow bow swell, vibrato that arrives late
function strings(f, len, vel) {
  const H = Math.max(1, Math.min(12, Math.floor(6000 / f)));
  const att = Math.min(2.2, len * 0.4), rel = Math.min(2.0, len * 0.4);
  const ph = rnd() * 6.28;
  return (t) => {
    const env = Math.min(1, t / att) * Math.min(1, Math.max(0, (len - t) / rel));
    const vib = 1 + 0.0035 * Math.min(1, Math.max(0, (t - 0.8) / 1.2)) * Math.sin(2 * Math.PI * 5.1 * t + ph);
    let v = 0;
    for (let n = 1; n <= H; n++) v += Math.sin(2 * Math.PI * f * vib * n * t) / (n * n * 0.8 + 0.2 * n);
    return vel * env * v * 0.05;
  };
}

// ── compose ─────────────────────────────────────────────────────────────────
// arc: 0–18% solo piano, strings swell to 70%, thin out, last held chord
const stringsLevel = (t) => {
  const x = t / DUR;
  if (x < 0.16) return 0.22;
  if (x < 0.32) return 0.22 + 0.78 * (x - 0.16) / 0.16;
  if (x < 0.72) return 1;
  if (x < 0.86) return 1 - (x - 0.72) / 0.14 * 0.7;
  return 0.3;
};
let t = 1.2, chord = 'I', mel = KEY + 24 + 4; // melody starts on A4
const lastStart = DUR - 9;
while (t < lastStart) {
  const len = pick([4.2, 4.8, 5.4, 6.0, 6.6, 7.2]) + between(-0.25, 0.25);
  const tones = CH[chord];
  const root = KEY + tones[0] - 12;
  // bass, softly, sometimes delayed half a beat
  addMono(t + (rnd() < 0.25 ? 0.45 : 0), len + 3, piano(hz(root), between(0.35, 0.5)), -0.15);
  // broken chord: 2–5 notes, irregular gaps, never the same figure twice
  const count = 2 + Math.floor(rnd() * 4);
  let at = t + between(0.3, 0.9);
  for (let k = 0; k < count && at < t + len - 0.6; k++) {
    const m = KEY + pick(tones) + pick([0, 12, 12]);
    addMono(at, len + 3, piano(hz(m), between(0.22, 0.42)), between(-0.35, 0.35));
    at += (len - 1.0) / count + between(-0.15, 0.15);
  }
  // sparse melody: about half the chords get one or two notes, moving by step
  if (rnd() < 0.55 && t > DUR * 0.1) {
    const notes = rnd() < 0.4 ? 2 : 1;
    let mt = t + between(1.2, len * 0.5);
    for (let k = 0; k < notes; k++) {
      const deg = SCALE.indexOf(((mel - KEY) % 12 + 12) % 12);
      const step = pick([-1, -1, 1, 1, 2, -2, 0]);
      const nd = ((deg < 0 ? 0 : deg) + step + 7) % 7;
      const oct = Math.floor((mel - KEY) / 12) + ((deg + step) >= 7 ? 1 : (deg + step) < 0 ? -1 : 0);
      mel = Math.min(KEY + 36 + 2, Math.max(KEY + 19, KEY + 12 * oct + SCALE[nd]));
      addMono(mt, len + 3, piano(hz(mel), between(0.4, 0.55)), 0.2);
      mt += between(1.0, 1.8);
    }
  }
  // strings hold the chord underneath, voiced low and close
  const sl = stringsLevel(t);
  if (sl > 0) {
    tones.slice(0, 3).forEach((iv, k) => addMono(t - 0.3, len + 1.2,
      strings(hz(KEY + iv - (k === 0 ? 12 : 0)), len + 1.2, 0.9 * sl), k === 0 ? 0 : (k === 1 ? -0.5 : 0.5)));
  }
  t += len;
  chord = pick(NEXT[chord]);
}
// close on the home chord, held, piano and a last breath of strings
['I'].forEach(() => {
  const end = Math.min(t, lastStart);
  [KEY - 12, KEY + 7, KEY + 12, KEY + 16, KEY + 24].forEach((m, k) =>
    addMono(end + k * 0.35, 8, piano(hz(m), 0.35), -0.3 + k * 0.15));
  [KEY - 12, KEY + 4, KEY + 7].forEach((m, k) => addMono(end, 8.5, strings(hz(m), 8.5, 0.35), k - 1));
});

// ── room: Schroeder reverb (4 combs + 2 allpasses per side) ─────────────────
function reverb(buf, combs, aps, wet) {
  const out = new Float32Array(buf.length);
  for (const [d, g] of combs) {
    const dl = Math.floor(d * SR), line = new Float32Array(dl); let idx = 0, lp = 0;
    for (let i = 0; i < buf.length; i++) {
      const y = line[idx]; lp = y * 0.7 + lp * 0.3; line[idx] = buf[i] + lp * g; idx = (idx + 1) % dl; out[i] += y * 0.25;
    }
  }
  for (const [d, g] of aps) {
    const dl = Math.floor(d * SR), line = new Float32Array(dl); let idx = 0;
    for (let i = 0; i < out.length; i++) { const bv = line[idx], x = out[i]; const y = -g * x + bv; line[idx] = x + g * y; idx = (idx + 1) % dl; out[i] = y; }
  }
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * (1 - wet) + out[i] * wet * 1.6;
}
reverb(L, [[0.0297, 0.80], [0.0371, 0.79], [0.0411, 0.78], [0.0437, 0.77]], [[0.005, 0.7], [0.0017, 0.7]], 0.32);
reverb(R, [[0.0307, 0.80], [0.0383, 0.79], [0.0423, 0.78], [0.0449, 0.77]], [[0.0053, 0.7], [0.0019, 0.7]], 0.32);
// low cut ~70 Hz, keep it out of the voice's chest
for (const buf of [L, R]) {
  const a = 1 / (1 + 2 * Math.PI * 70 / SR); let px = 0, py = 0;
  for (let i = 0; i < buf.length; i++) { const x = buf[i]; py = a * (py + x - px); px = x; buf[i] = py; }
}

// ── level: quiet by design (~ -33 dBFS RMS), fades, peak-safe ──────────────
let sum = 0; for (let i = 0; i < N; i++) sum += L[i] * L[i] + R[i] * R[i];
const rms = Math.sqrt(sum / (2 * N)) || 1e-9;
const TARGET_RMS_DB = parseFloat(arg('rms', '-33'));
let g = Math.pow(10, TARGET_RMS_DB / 20) / rms;
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
g = Math.min(g, 0.5 / (peak || 1));
const fi = 3 * SR, fo = 6 * SR;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const f = Math.min(1, i / fi, (N - i) / fo);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * f)) * 32767), i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g * f)) * 32767), i * 4 + 2);
}
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([h, pcm]));
console.log(`[music] wrote ${OUT} — ${DUR.toFixed(1)}s through-composed piano + strings, ~${TARGET_RMS_DB} dBFS RMS`);
