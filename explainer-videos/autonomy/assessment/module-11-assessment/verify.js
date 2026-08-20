'use strict';
/*
 * verify.js — MANDATORY acceptance gate. Run after stitch-brand.js; must PASS before a
 * video is called done. Exits non-zero on any failure.
 *   node verify.js [--final out/<name>_final.mp4]
 *
 * Checks:
 *   1. deliverable exists; 1920x1080 / 30fps / h264 yuv420p / AAC
 *   2. clips == beats; every audio/vo_<id>.txt sidecar == its beat.vo
 *   3. AUDIO INTEGRITY (guards the v7 defect): every beat that should have speech
 *      (>=3 spoken words) has a NON-SILENT clip of sane length — no silent TTS fallbacks,
 *      no ~0.5s "just the pause" clips racing the visuals.
 *   4. DURATION SANITY (guards truncation): the final is never SHORTER than the voiceover,
 *      and not wildly longer than voiceover + bumpers.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const beats = require('./beats.js');

function arg(n, d) { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : d; }
const NAME = process.env.LESSON_NAME || 'lesson';
const final = arg('final', `out/${NAME}_final.mp4`);
let ok = true;
const pass = m => console.log(`  ✅ ${m}`);
const fail = m => { console.log(`  ❌ ${m}`); ok = false; };

function ffInfo(file) {
  let info = '';
  try { execFileSync(ffmpeg, ['-i', file], { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { info = (e.stderr || '').toString(); } // ffmpeg -i exits non-zero, prints to stderr
  return info;
}
function probeSeconds(file) {
  const m = ffInfo(file).match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) : null;
}
function meanVolumeDb(wav) {
  let info = '';
  try { execFileSync(ffmpeg, ['-i', wav, '-af', 'volumedetect', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { info = (e.stderr || '').toString(); }
  const m = info.match(/mean_volume:\s*(-?\d+(?:\.\d+)?) dB/);
  return m ? parseFloat(m[1]) : null;
}
const words = s => (s || '').trim().split(/\s+/).filter(Boolean).length;

// 1. deliverable + codec/container
if (!fs.existsSync(final)) { fail(`deliverable missing: ${final}`); }
else {
  const info = ffInfo(final);
  const has = (re, label) => re.test(info) ? pass(label) : fail(`${label} — not detected`);
  has(/1920x1080/, '1920x1080');
  has(/h264|yuv420p/, 'h264 / yuv420p');
  has(/30(\.| )?fps|, 30 fps/, '30 fps');
  has(/aac/i, 'AAC audio');
}

// 2. clips == beats + sidecars match
let clips = 0;
for (const b of beats) {
  const wav = path.join('audio', `vo_${b.id}.wav`);
  const txt = path.join('audio', `vo_${b.id}.txt`);
  if (fs.existsSync(wav)) clips++; else fail(`missing VO clip for beat ${b.id}`);
  if (fs.existsSync(txt)) { if (fs.readFileSync(txt, 'utf8') !== b.vo) fail(`sidecar != beat.vo for ${b.id}`); }
  else fail(`missing sidecar for beat ${b.id}`);
}
if (clips === beats.length) pass(`clips == beats (${clips})`); else fail(`clips(${clips}) != beats(${beats.length})`);

// 3. AUDIO INTEGRITY — no silent / racing beats (the v7 defect)
let silent = 0, checked = 0;
for (const b of beats) {
  const wav = path.join('audio', `vo_${b.id}.wav`);
  if (!fs.existsSync(wav)) continue;
  const w = words(b.vo);
  if (w < 3) continue; // very short lines (e.g. "Your turn.") legitimately brief — skip
  checked++;
  const dur = probeSeconds(wav) || 0;
  const mv = meanVolumeDb(wav);
  if (mv !== null && mv < -50) { fail(`beat ${b.id}: VO is SILENT (mean ${mv}dB) for ${w} spoken words — TTS fell back to silence`); silent++; }
  else if (dur < 1.0) { fail(`beat ${b.id}: VO clip only ${dur.toFixed(2)}s for ${w} words — silent/racing fallback`); silent++; }
}
if (checked && !silent) pass(`audio integrity — ${checked} spoken beats all have real, sane-length voiceover`);

// 4. DURATION SANITY — final never shorter than VO; not wildly longer than VO + bumpers
if (fs.existsSync('durations.json') && fs.existsSync(final)) {
  const durations = JSON.parse(fs.readFileSync('durations.json', 'utf8'));
  const voTotal = Object.values(durations).reduce((a, b) => a + b, 0);
  const fd = probeSeconds(final);
  if (fd == null) fail('could not read final duration');
  else if (fd < voTotal - 1) fail(`final ${fd.toFixed(1)}s is SHORTER than voiceover ${voTotal.toFixed(1)}s — video was truncated`);
  else if (fd > voTotal + 25) fail(`final ${fd.toFixed(1)}s much longer than voiceover ${voTotal.toFixed(1)}s + bumpers — check for a stall`);
  else pass(`duration sane (final ${fd.toFixed(1)}s ≈ voiceover ${voTotal.toFixed(1)}s + bumpers)`);
  // brand bumpers add intro+outro (~4-10s). A final only as long as the voiceover means the
  // deliverable is the BARE lesson — no branding/music. Guard it.
  if (fd != null && fd < voTotal + 3) fail(`final ${fd.toFixed(1)}s ≈ voiceover with NO bumper margin — brand intro/outro likely MISSING (did you ship the bare render?)`);
  else if (fd != null) pass('brand bumpers present (final is longer than the bare lesson)');
}

console.log(ok ? '\nVERIFY: PASS' : '\nVERIFY: FAIL');
process.exit(ok ? 0 : 1);
