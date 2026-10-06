#!/usr/bin/env node
'use strict';
/*
 * make-music-people.js — a warm, hopeful, human background bed for the P&C people-skills series.
 *
 *   node make-music-people.js --dur 140 --out music/people-warm.wav
 *   MUSIC_FILE=music/people-warm.wav node stitch-brand.js ...
 *
 * Aroma (2026-10-06) asked for music that suits the topic more than the generic contemplative
 * piano loop. The topic is caring for people, so the brief is: warm, gently optimistic, quietly
 * moving forward — never melancholic, never corporate-upbeat.
 *
 * Built entirely in code (no licensed audio): D major, 72 bpm, the I–V–vi–IV progression
 * (D – A – Bm – G) that reads as hopeful; a soft electric-piano voicing (fundamental + decaying
 * upper partials with a slow tremolo), a slow-attack warm pad, a round sine bass on each bar,
 * and a simple four-note motif that answers itself every other bar. A feedback-delay "room"
 * and a fade in/out finish it. stitch-brand.js ducks it under the narration.
 */
const fs = require('fs');
const path = require('path');

function arg(n, d) { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : d; }
const DUR = parseFloat(arg('dur', '140'));
const OUT = path.resolve(arg('out', 'music/people-warm.wav'));
const SR = 44100;
const N = Math.ceil(DUR * SR);
const L = new Float32Array(N), R = new Float32Array(N);

const BPM = 72, BEAT = 60 / BPM, BAR = BEAT * 4;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
// D – A – Bm – G, voiced close and warm around middle C
const CHORDS = [
  { root: 38, notes: [62, 66, 69, 73] },   // Dmaj7-ish: D F# A C#
  { root: 45, notes: [61, 64, 69, 71] },   // A(add9): C# E A B
  { root: 47, notes: [62, 66, 69, 71] },   // Bm7: D F# A B
  { root: 43, notes: [62, 67, 71, 74] },   // G(add): D G B D
];
// a gentle motif per bar (beat offset, midi) — rises, then answers by falling
const MOTIF = [
  [[0.5, 78], [1.5, 76], [2.5, 74], [3.25, 76]],
  [[0.5, 76], [1.5, 73], [2.5, 71], [3.25, 69]],
  [[0.5, 74], [1.5, 78], [2.5, 81], [3.25, 78]],
  [[0.5, 79], [1.5, 78], [2.5, 76], [3.25, 74]],
];

function add(start, dur, fn, pan = 0) {
  const s0 = Math.max(0, Math.floor(start * SR)), s1 = Math.min(N, Math.floor((start + dur) * SR));
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    const v = fn(t);
    L[i] += v * gl; R[i] += v * gr;
  }
}
// soft electric piano: quick attack, long exponential decay, upper partials fade faster
const keys = (f, vel) => (t) => {
  const a = Math.min(1, t / 0.012);
  const trem = 1 + 0.06 * Math.sin(2 * Math.PI * 4.2 * t);
  return vel * a * trem * (
    Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 1.1)
    + 0.35 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t * 2.6)
    + 0.12 * Math.sin(2 * Math.PI * 3 * f * t) * Math.exp(-t * 4.5));
};
// warm pad: two detuned sines, slow swell in and out over the bar
const pad = (f, vel, len) => (t) => {
  const env = Math.sin(Math.PI * Math.min(1, t / len));
  return vel * env * (Math.sin(2 * Math.PI * f * 0.997 * t) + Math.sin(2 * Math.PI * f * 1.003 * t)) * 0.5;
};
const bass = (f, vel) => (t) => vel * Math.min(1, t / 0.02) * Math.exp(-t * 0.9)
  * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * 2 * f * t));
const pluck = (f, vel) => (t) => vel * Math.min(1, t / 0.006) * Math.exp(-t * 3.2)
  * (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(2 * Math.PI * 3 * f * t));

const bars = Math.ceil(DUR / BAR);
for (let b = 0; b < bars; b++) {
  const t0 = b * BAR;
  const ch = CHORDS[b % 4];
  // pad under the whole bar (enters after the first two bars so the intro breathes)
  if (b >= 1) ch.notes.forEach((m, k) => add(t0, BAR + 0.4, pad(hz(m - 12), 0.035, BAR + 0.4), k % 2 ? 0.4 : -0.4));
  // keys: gently broken chord on beats 1 and 3
  ch.notes.forEach((m, k) => add(t0 + k * 0.09, BAR, keys(hz(m), 0.075), -0.2 + k * 0.13));
  ch.notes.slice(1).forEach((m, k) => add(t0 + 2 * BEAT + k * 0.07, BAR / 2 + 1, keys(hz(m), 0.05), 0.2 - k * 0.1));
  // bass on 1, softer on 3
  if (b >= 2) { add(t0, BAR, bass(hz(ch.root), 0.08)); add(t0 + 2 * BEAT, BEAT * 2, bass(hz(ch.root), 0.04)); }
  // motif from bar 4, every other phrase, so it feels like a theme rather than a loop
  if (b >= 4 && Math.floor(b / 4) % 2 === 1) {
    MOTIF[b % 4].forEach(([o, m]) => add(t0 + o * BEAT, 2.4, pluck(hz(m), 0.07), 0.3));
  }
}

// room: two feedback delays, then gentle low-pass smoothing
function room(buf, delaySec, fb, mix) {
  const d = Math.floor(delaySec * SR), out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    const wet = i >= d ? out[i - d] : 0;
    out[i] = buf[i] + wet * fb;
  }
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * (1 - mix) + out[i] * mix;
}
for (const [buf, d1, d2] of [[L, 0.137, 0.211], [R, 0.149, 0.229]]) {
  room(buf, d1, 0.42, 0.35); room(buf, d2, 0.3, 0.25);
  let y = 0; for (let i = 0; i < buf.length; i++) { y += 0.35 * (buf[i] - y); buf[i] = y; }
  // low cut at ~80 Hz: keeps the bed out of the voice's chest register and kills sub/DC build-up
  const a = 1 / (1 + 2 * Math.PI * 80 / SR); let px = 0, py = 0;
  for (let i = 0; i < buf.length; i++) { const x = buf[i]; py = a * (py + x - px); px = x; buf[i] = py; }
}
// fades and normalise to a calm level (peak -6 dBFS; stitch-brand ducks it further under VO)
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.5 / (peak || 1), fadeIn = 2.5 * SR, fadeOut = 4 * SR;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const f = Math.min(1, i / fadeIn, (N - i) / fadeOut);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * f)) * 32767), i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g * f)) * 32767), i * 4 + 2);
}
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([h, pcm]));
console.log(`[music] wrote ${OUT} — ${DUR.toFixed(1)}s, D major I–V–vi–IV at ${BPM} bpm`);
