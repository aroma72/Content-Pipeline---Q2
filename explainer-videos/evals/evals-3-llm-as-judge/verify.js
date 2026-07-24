'use strict';
/*
 * verify.js — acceptance checks (Section 11). Run after stitch-brand.js.
 *   node verify.js [--final out/lesson_final.mp4]
 * Checks: deliverable exists; 1920x1080 / 30fps / h264 yuv420p / AAC;
 * clips == beats; every audio/vo_<id>.txt sidecar == its beat.vo.
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

// 1. deliverable + codec/container
if (!fs.existsSync(final)) { fail(`deliverable missing: ${final}`); }
else {
  let info = '';
  try { execFileSync(ffmpeg, ['-i', final], { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { info = (e.stderr || '').toString(); } // ffmpeg -i exits non-zero but prints to stderr
  const has = (re, label) => re.test(info) ? pass(label) : fail(`${label} — not detected`);
  has(/1920x1080/, '1920x1080');
  has(/h264|yuv420p/, 'h264 / yuv420p');
  has(/30(\.| )?fps|, 30 fps/, '30 fps');
  has(/aac/i, 'AAC audio');
}

// 2. clips == beats  + sidecars match
let clips = 0;
for (const b of beats) {
  const wav = path.join('audio', `vo_${b.id}.wav`);
  const txt = path.join('audio', `vo_${b.id}.txt`);
  if (fs.existsSync(wav)) clips++; else fail(`missing VO clip for beat ${b.id}`);
  if (fs.existsSync(txt)) {
    if (fs.readFileSync(txt, 'utf8') === b.vo) { /* ok */ } else fail(`sidecar != beat.vo for ${b.id}`);
  } else fail(`missing sidecar for beat ${b.id}`);
}
if (clips === beats.length) pass(`clips == beats (${clips})`); else fail(`clips(${clips}) != beats(${beats.length})`);

console.log(ok ? '\nVERIFY: PASS' : '\nVERIFY: FAIL');
process.exit(ok ? 0 : 1);
