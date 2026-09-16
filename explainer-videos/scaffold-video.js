#!/usr/bin/env node
'use strict';
/**
 * scaffold-video — set up a new video folder with a pipeline that is actually current.
 *
 *   node explainer-videos/scaffold-video.js notion-slack/notion-slack-03-key-one-room
 *
 * WHY THIS EXISTS
 * New folders were being made by copying a sibling video. That copies whatever that video was built
 * with — including pipeline scripts written before a rule changed. It happened on 2026-09-15: a folder
 * copied from the self-healing series had a `compile-lesson.js` that did not know checkpoint beats
 * exist, so the build died on "no duration for beat 17" for a beat that is never meant to have one.
 * The skill templates ARE kept current, so copy from there.
 *
 * What it does NOT copy: beats.js (you write that), art/, audio/, out/, node_modules (junctioned from
 * a sibling so nothing is downloaded twice).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES = path.join(ROOT, '.claude/skills/creating-explainer-videos/templates');
const target = process.argv[2];
if (!target) {
  console.error('usage: node explainer-videos/scaffold-video.js <series>/<slug>');
  process.exit(1);
}
const dir = path.join(__dirname, ...target.split('/'));

// The pipeline, from the templates that the standards keep up to date.
const FILES = [
  'compile-lesson.js', 'tts-lesson.js', 'verify.js', 'eval-text.js', 'mix-audio.js', 'music.js',
  'stitch-brand.js', 'segment-all.py', 'package.json',
  // Imagen is dead on the current key; the Gemini generator is the working path.
  'generate-lesson-art-gemini.js', 'generate-lesson-video-omni.js',
  'qa-info.js', 'qa-visuals.js', 'qa-art.js', 'qa-clips.js', 'qa-cutouts.js',
];
const DIRS = ['animation', 'lib'];

fs.mkdirSync(dir, { recursive: true });
for (const d of DIRS) {
  fs.cpSync(path.join(TEMPLATES, d), path.join(dir, d), { recursive: true });
}
let copied = 0;
for (const f of FILES) {
  const src = path.join(TEMPLATES, f);
  if (!fs.existsSync(src)) { console.warn(`  (template missing: ${f})`); continue; }
  fs.copyFileSync(src, path.join(dir, f));
  copied++;
}

// Every pipeline script must skip checkpoint beats. The templates already do; assert it rather than
// assume, because this is exactly the failure this script exists to prevent.
for (const f of ['compile-lesson.js', 'tts-lesson.js', 'verify.js']) {
  const p = path.join(dir, f);
  if (fs.existsSync(p) && !fs.readFileSync(p, 'utf8').includes('beats-util')) {
    console.error(`  ✗ ${f} does not filter checkpoint beats — the template is stale, fix it first`);
    process.exit(1);
  }
}

// node_modules: junction to a sibling rather than a 135MB copy.
const nm = path.join(dir, 'node_modules');
if (!fs.existsSync(nm)) {
  const donor = [
    'self-healing/self-healing-01-fixes-its-own-mistakes',
    'autonomy/autonomy-01-spectrum',
  ].map((d) => path.join(__dirname, ...d.split('/'), 'node_modules')).find((d) => fs.existsSync(d));
  if (donor) {
    try {
      execFileSync('cmd', ['/c', 'mklink', '/J', nm, donor], { stdio: 'ignore' });
      console.log('  node_modules → junction to a sibling video');
    } catch { console.warn('  (could not junction node_modules — run npm install here)'); }
  }
}

// The locked character, so a new video does not invent a different Ali.
const ref = path.join(__dirname, 'self-healing/self-healing-01-fixes-its-own-mistakes/art/_ref.png');
if (fs.existsSync(ref)) {
  fs.mkdirSync(path.join(dir, 'art'), { recursive: true });
  fs.copyFileSync(ref, path.join(dir, 'art/_ref.png'));
  console.log('  art/_ref.png → the locked Ali, seeded for consistency');
}

console.log(`scaffolded ${target}: ${copied} scripts + ${DIRS.join(', ')}`);
console.log('next: write beats.js (with a checkpoint beat), then qa-visuals → art → tts → compile');
