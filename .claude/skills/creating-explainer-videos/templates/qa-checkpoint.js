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
 *
 * The rules themselves live in lib/checkpoint-checks.js (contract 1.4: the same verdict is needed
 * synchronously on an edited script, with no file). This file is the CLI around them.
 *
 * CHECKPOINT_REQUIRED=0 — set by produce for a purpose that asks no question (marketing,
 * announcement; orchestrator/lib/purpose.js). A missing checkpoint then passes; every other rule
 * still applies to one that is present.
 */
const path = require('path');
const { checkpointChecks } = require('./lib/checkpoint-checks');

const beats = require(path.join(process.cwd(), 'beats.js'));
const required = process.env.CHECKPOINT_REQUIRED !== '0';

const { problems, notes, count } = checkpointChecks(beats, { required });

// ---- report ---------------------------------------------------------------
notes.forEach((n) => console.log('  · ' + n));
if (!problems.length) {
  if (!count && !required) {
    console.log('[qa-checkpoint] ✅ PASS — no checkpoint, and this video\'s purpose asks no question.');
  } else {
    console.log(`[qa-checkpoint] ✅ PASS — ${count} checkpoint(s): never drawn, never spoken, `
      + 'answerable, and the wrong-answer feedback explains the mistake.');
  }
  process.exit(0);
}
console.log('');
problems.forEach((p) => console.log('  ❌ ' + p));
console.log(`\n[qa-checkpoint] FAIL — ${problems.length} problem(s).`);
console.log('The learner must PAUSE, CHOOSE an option, and READ a real correction before the video '
  + 'resumes. Nothing about this is visible in the MP4, so this gate is the only thing that catches it.');
process.exit(2);
