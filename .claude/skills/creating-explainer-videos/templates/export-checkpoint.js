#!/usr/bin/env node
'use strict';
/**
 * export-checkpoint.js — write the LMS handoff for this video's question.
 *
 *     node export-checkpoint.js          # after tts-lesson.js (needs durations.json) and stitch-brand
 *
 * The quiz is never put in the video (guardrail, Aroma 2026-10-06). It travels to the repo for the LMS
 * developer instead: this writes `checkpoint.json` next to beats.js — the exact payload the server
 * serves (server/lib/checkpoints.js forPath), so the committed file and the live API cannot disagree.
 * Commit it with beats.js and durations.json.
 *
 * Refuses (exit 2) when the timing is untrusted or the pause is unsafe: a handoff the LMS cannot fire
 * is worse than none, because it looks finished.
 */
const fs = require('fs');
const path = require('path');

// The video folder lives at <repo>/explainer-videos/<series>/<slug>; climb to the repo root.
let root = process.cwd();
while (root !== path.dirname(root) && !fs.existsSync(path.join(root, 'server', 'lib', 'checkpoints.js'))) {
  root = path.dirname(root);
}
const lib = path.join(root, 'server', 'lib', 'checkpoints.js');
if (!fs.existsSync(lib)) { console.error('[export-checkpoint] cannot find server/lib/checkpoints.js above this folder'); process.exit(1); }

const { forPath } = require(lib);
const rel = path.relative(path.join(root, 'explainer-videos'), process.cwd()).split(path.sep).join('/');
const payload = forPath(rel);
if (!payload) { console.error(`[export-checkpoint] no beats.js for ${rel}`); process.exit(1); }

const cps = payload.checkpoints || [];
const problems = [];
if (!cps.length) problems.push('no checkpoint in this video');
if (payload.timing && payload.timing.trusted === false) problems.push('timing is untrusted — run tts-lesson.js first (durations.json)');
for (const c of cps) {
  if (c.rendersInVideo) problems.push(`${c.id}: the question is drawn in the video — that breaks the no-quiz-in-video guardrail`);
  if (c.pause && c.pause.safe === false) problems.push(`${c.id}: the pause has no whole sentence on one side`);
}
if (problems.length) {
  problems.forEach((p) => console.error(`  ❌ ${p}`));
  console.error('[export-checkpoint] FAIL — nothing written.');
  process.exit(2);
}

const out = path.join(process.cwd(), 'checkpoint.json');
fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
for (const c of cps) {
  console.log(`  · ${c.id}: pause at ${c.atSeconds}s of the final video, ${c.options.length} options, answer ${'ABCD'[c.correctIndex]}`);
}
console.log(`[export-checkpoint] ✅ wrote ${path.relative(root, out)} — commit it with beats.js for the LMS developer.`);
