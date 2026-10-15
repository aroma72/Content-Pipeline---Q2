'use strict';
/*
 * splice-lesson.js — put re-rendered scenes back into the bare lesson render.
 *
 * Contract 1.3: a reviewer flagged a scene; compile-lesson.js --range rendered
 * only those frames into out/seg_<a>_<b>.mp4. This cuts the unflagged runs out
 * of the OLD out/lesson.mp4 (by old seconds), drops the new segments in at their
 * new positions, re-mixes the full narration from audio/ with the NEW
 * durations.json, and writes the result over out/lesson.mp4 (the previous one
 * kept as out/lesson.prev.mp4 until verify has passed).
 *
 *   node splice-lesson.js --plan out/splice-plan.json [--old out/lesson.mp4] [--out out/lesson.mp4]
 *
 * The plan is lib/splice-plan.js's output plus `segmentFiles`:
 * { "<startFrame>_<endFrame>": "out/seg_<a>_<b>.mp4" }.
 *
 * ONE re-encode, deliberately. `-c copy` cuts only on keyframes and the old
 * render may predate forced keyframes at beat starts, so a stream-copy splice
 * is not frame-accurate; decoding through `trim` is. One x264 pass over a
 * two-minute lesson is a minute or two of CPU, against an hour of Chrome.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { mixAudio } = require('./mix-audio');
const { renderable } = require('./lib/beats-util');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const CWD = process.cwd();
const planPath = path.resolve(CWD, arg('plan', 'out/splice-plan.json'));
const oldPath = path.resolve(CWD, arg('old', 'out/lesson.mp4'));
const outPath = path.resolve(CWD, arg('out', 'out/lesson.mp4'));

const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (!plan.ok || !Array.isArray(plan.segments) || !plan.segments.length) {
  console.error(`[splice] the plan is not usable: ${plan.why || 'no segments'}`); process.exit(1);
}
if (!fs.existsSync(oldPath)) { console.error(`[splice] old render not found: ${oldPath}`); process.exit(1); }
const fps = Number(plan.fps) || 30;

const beats = renderable(require(path.join(CWD, 'beats.js')));
const durations = JSON.parse(fs.readFileSync(path.join(CWD, 'durations.json'), 'utf8'));
for (const b of beats) {
  if (typeof durations[b.id] !== 'number') { console.error(`[splice] no duration for beat ${b.id}`); process.exit(1); }
}

// --- video: keep runs from the old render, new runs from their segment files ---
const inputs = [oldPath];
const filters = [];
const labels = [];
plan.segments.forEach((s, i) => {
  const label = `v${i}`;
  if (s.kind === 'keep') {
    filters.push(`[0:v]trim=start=${s.oldStartSec}:end=${s.oldEndSec},setpts=PTS-STARTPTS[${label}]`);
  } else {
    const key = `${s.startFrame}_${s.endFrame}`;
    const file = plan.segmentFiles && plan.segmentFiles[key];
    if (!file) { console.error(`[splice] no segment file for ${key}`); process.exit(1); }
    const abs = path.resolve(CWD, file);
    if (!fs.existsSync(abs)) { console.error(`[splice] segment missing: ${abs}`); process.exit(1); }
    const idx = inputs.push(abs) - 1;
    filters.push(`[${idx}:v]setpts=PTS-STARTPTS[${label}]`);
  }
  labels.push(`[${label}]`);
});
filters.push(`${labels.join('')}concat=n=${labels.length}:v=1:a=0[v]`);

// --- audio: the whole narration again, at the NEW timing ---
const audioDir = path.join(CWD, 'audio');
const mix = path.join(audioDir, `_mix_${process.env.LESSON_NAME || 'lesson'}.wav`);
console.log('[splice] mixing audio at the new timing …');
mixAudio({ beats, durations, audioDir, outPath: mix });
const audioIdx = inputs.push(mix) - 1;

// Keyframes at the NEW beat starts, as compile-lesson.js does.
let t = 0;
const keyframes = beats.map((b) => { const s = t.toFixed(3); t += durations[b.id]; return s; }).join(',');

const tmpOut = path.join(path.dirname(outPath), `${path.basename(outPath, '.mp4')}.new.mp4`);
const args = ['-y'];
for (const f of inputs) args.push('-i', f);
args.push(
  '-filter_complex', filters.join(';'),
  '-map', '[v]', '-map', `${audioIdx}:a`,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-force_key_frames', keyframes,
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-shortest', tmpOut,
);
console.log(`[splice] ${plan.segments.filter((s) => s.kind === 'keep').length} kept run(s), `
  + `${plan.segments.filter((s) => s.kind === 'new').length} new -> ${path.relative(CWD, tmpOut)}`);
execFileSync(ffmpeg, args, { stdio: ['ignore', 'ignore', 'inherit'] });

// Keep the previous bare render beside the new one until verify.js has passed.
if (path.resolve(oldPath) === path.resolve(outPath)) {
  const prev = path.join(path.dirname(outPath), `${path.basename(outPath, '.mp4')}.prev.mp4`);
  try { fs.rmSync(prev, { force: true }); } catch { /* none */ }
  fs.renameSync(oldPath, prev);
}
fs.renameSync(tmpOut, outPath);
console.log(`[splice] BARE lesson -> ${path.relative(CWD, outPath)}  (previous kept as .prev.mp4; NOT the deliverable — run stitch-brand.js)`);
