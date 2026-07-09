'use strict';
/*
 * stitch-brand.js — wrap the bare lesson in the shared brand bumpers (LAW 1).
 * Renders intro (with title) + outro for THIS lesson via the brand-intro-outro
 * project, then concats intro + lesson + outro -> out/<name>_final.mp4 (the deliverable).
 *
 *   node stitch-brand.js --title "My Lesson" --lesson out/lesson.mp4 --out out/lesson_final.mp4
 *
 * The brand project is found via BRAND_DIR env, else by walking up for a
 * `brand-intro-outro/` folder. All clips render at 1920x1080/30/yuv420p/AAC 48k
 * so the concat re-encodes cleanly (render invariants, Section 8).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
function findBrandDir() {
  if (process.env.BRAND_DIR && fs.existsSync(process.env.BRAND_DIR)) return process.env.BRAND_DIR;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'brand-intro-outro');
    if (fs.existsSync(c)) return c;
    const up = path.dirname(dir); if (up === dir) break; dir = up;
  }
  return null;
}

const title = arg('title', process.env.LESSON_TITLE || 'Lesson');
const lesson = path.resolve(arg('lesson', 'out/lesson.mp4'));
const out = path.resolve(arg('out', 'out/lesson_final.mp4'));

if (!fs.existsSync(lesson)) { console.error(`[brand] lesson not found: ${lesson} (run compile-lesson.js).`); process.exit(1); }
const brandDir = findBrandDir();
if (!brandDir) { console.error('[brand] brand-intro-outro/ not found. Set BRAND_DIR or place it in a parent folder.'); process.exit(1); }

const workDir = path.join(path.dirname(out), '_bumpers');
fs.mkdirSync(workDir, { recursive: true });
const intro = path.join(workDir, 'intro.mp4');
const outro = path.join(workDir, 'outro.mp4');

console.log(`[brand] rendering bumpers via ${brandDir} (title="${title}") …`);
execFileSync(process.execPath, [path.join(brandDir, 'render-bumpers.js'),
  '--title', title, '--intro', intro, '--outro', outro],
  { stdio: 'inherit', env: { ...process.env, LESSON_TITLE: title } });

for (const f of [intro, outro]) {
  if (!fs.existsSync(f)) { console.error(`[brand] bumper missing: ${f}`); process.exit(1); }
}

// concat with re-encode (all three share the render invariants)
const list = path.join(workDir, 'concat.txt');
fs.writeFileSync(list, [intro, lesson, outro].map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
console.log('[brand] concat intro + lesson + outro …');
execFileSync(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', list,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-s', '1920x1080',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', out], { stdio: ['ignore', 'ignore', 'inherit'] });

console.log(`\n[brand] DELIVERABLE -> ${out}`);
