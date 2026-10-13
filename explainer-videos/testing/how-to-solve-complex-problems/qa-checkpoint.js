'use strict';
/*
 * qa-checkpoint.js — DETERMINISTIC SENSOR for the in-video question.
 *
 *     node qa-checkpoint.js        # exits 2 on any violation
 *
 * WHY THIS EXISTS
 * Aroma has now specified this behaviour three times (2026-09-11, 09-15, 09-16) and asked, plainly,
 * not to have to remind anyone again. So it is a gate rather than a habit. The rule:
 *
 *   The video PAUSES. The LMS shows the question. THE LEARNER MUST CLICK AN OPTION TO CONTINUE.
 *   A wrong answer gets feedback good enough to explain the mistake. Then playback resumes.
 *   The timing and the question travel to Railway so the LMS developer can wire it up.
 *
 * Nothing about the question is drawn or spoken, so a missing or weak checkpoint is invisible in the
 * finished MP4 — every other gate would pass a video whose question never reaches a learner. This one
 * would not.
 *
 * Checked here (authoring time, free); the live half — is it actually serving from Railway — is
 * checked by scripts/publish-checkpoint.js, which fetches the payload back before reporting success.
 */
const path = require('path');

const beats = require(path.join(process.cwd(), 'beats.js'));
const isCheckpoint = (b) => b && b.mode === 'checkpoint';

const problems = [];
const notes = [];

const cps = beats.filter(isCheckpoint);

// ---- 1. it exists ---------------------------------------------------------
if (!cps.length) {
  problems.push('NO CHECKPOINT: this video has no `{ mode: "checkpoint", quiz: {...} }` beat. '
    + 'Every video must stop once and make the learner answer. Add one at roughly the two-thirds mark.');
}

const spoken = beats.filter((b) => !isCheckpoint(b));

cps.forEach((c) => {
  const at = beats.indexOf(c);
  const before = beats.slice(0, at).filter((b) => !isCheckpoint(b)).pop();
  const after = beats.slice(at + 1).find((b) => !isCheckpoint(b));
  const q = c.quiz || {};
  const id = `beat ${c.id}`;

  // ---- 2. it can be drawn or spoken by accident --------------------------
  if (c.vo) problems.push(`${id}: a checkpoint must never be spoken — remove its \`vo\``);
  if (c.art || c.info || c.card) problems.push(`${id}: a checkpoint must never be drawn — remove its art/info/card`);

  // ---- 3. the pause has somewhere clean to land --------------------------
  if (!before || !after) {
    problems.push(`${id}: sits first or last, so the pause has no whole sentence on one side. `
      + 'Move it between two spoken beats.');
  }

  // ---- 4. the question is answerable ------------------------------------
  if (!q.stem || String(q.stem).trim().length < 15) {
    problems.push(`${id}: \`stem\` is missing or too short to be a real question`);
  }
  if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) {
    problems.push(`${id}: needs 3–4 \`options\` (got ${Array.isArray(q.options) ? q.options.length : 'none'}) `
      + '— two is a coin flip, five is a reading test');
  }
  if (!Number.isInteger(q.answer) || !Array.isArray(q.options)
      || q.answer < 0 || q.answer >= q.options.length) {
    problems.push(`${id}: \`answer\` must be a valid 0-based index into \`options\``);
  }
  if (Array.isArray(q.options) && new Set(q.options.map((o) => String(o).trim().toLowerCase())).size !== q.options.length) {
    problems.push(`${id}: two options are identical — one of the distractors is doing no work`);
  }

  // ---- 5. the feedback actually explains the mistake ---------------------
  // Aroma's words: "feedback for wrong answers should be good enough to explain the mistake."
  // A wrong answer is the moment the learner is most able to learn; a one-liner wastes it.
  const wrong = (q.explain || '').trim();
  if (!wrong) {
    problems.push(`${id}: no \`explain\` — the learner who gets it wrong would be told nothing. `
      + 'Write why the right answer is right AND why the tempting wrong one is wrong.');
  } else {
    if (wrong.length < 120) {
      problems.push(`${id}: \`explain\` is only ${wrong.length} characters — too thin to explain a `
        + 'mistake. Say what the right answer is, why, and why the option they picked looked right.');
    }
    const sentences = wrong.split(/[.!?]+\s/).filter((s) => s.trim().length > 10).length;
    if (sentences < 2) {
      problems.push(`${id}: \`explain\` is a single sentence — a correction needs at least the claim `
        + 'and the reason the wrong choice was tempting.');
    }
  }
  const right = (q.correctNote || '').trim();
  if (!right) {
    notes.push(`${id}: no \`correctNote\` — the API will synthesise one from \`explain\`, which is `
      + 'weaker than confirming their reasoning in your own words');
  } else if (right.length < 40) {
    problems.push(`${id}: \`correctNote\` is too short to confirm anything — say why they were right`);
  }

  if (before && after) {
    notes.push(`${id}: pauses between beat ${before.id} and beat ${after.id}, `
      + `${Array.isArray(q.options) ? q.options.length : '?'} options, `
      + `${wrong.length} chars of wrong-answer feedback`);
  }
});

// ---- 6. placement ---------------------------------------------------------
if (cps.length === 1 && spoken.length >= 8) {
  const pos = beats.indexOf(cps[0]) / beats.length;
  if (pos < 0.4) notes.push(`the checkpoint is ${Math.round(pos * 100)}% in — early; ~⅔ lets the video teach first`);
  if (pos > 0.9) problems.push(`the checkpoint is ${Math.round(pos * 100)}% in — too late to matter; move it to ~⅔`);
}

// ---- report ---------------------------------------------------------------
notes.forEach((n) => console.log('  · ' + n));
if (!problems.length) {
  console.log(`[qa-checkpoint] ✅ PASS — ${cps.length} checkpoint(s): never drawn, never spoken, `
    + 'answerable, and the wrong-answer feedback explains the mistake.');
  process.exit(0);
}
console.log('');
problems.forEach((p) => console.log('  ❌ ' + p));
console.log(`\n[qa-checkpoint] FAIL — ${problems.length} problem(s).`);
console.log('The learner must PAUSE, CHOOSE an option, and READ a real correction before the video '
  + 'resumes. Nothing about this is visible in the MP4, so this gate is the only thing that catches it.');
process.exit(2);
