'use strict';
/*
 * checkpoint-checks.js — the rules of qa-checkpoint.js as a pure function.
 *
 * qa-checkpoint.js is a CLI: it `require`s cwd/beats.js and exits. Contract 1.4 lets an
 * instructor edit a script frame by frame at $0 and needs the same verdict synchronously,
 * on an array, with no file and no process. So the rules live here, and the CLI calls this.
 * One list of rules, two callers — the same reason lf-limits.js exists.
 *
 *   checkpointChecks(beats, { required })  ->  { problems: string[], notes: string[] }
 *
 * `required` (default true): a video with no checkpoint is a problem. A purpose that does not
 * ask the learner a question (marketing, announcement — orchestrator/lib/purpose.js) passes
 * `required:false`; every OTHER rule still applies to any checkpoint that IS present.
 */

const isCheckpoint = (b) => b && b.mode === 'checkpoint';

function checkpointChecks(beats, { required = true } = {}) {
  const problems = [];
  const notes = [];
  if (!Array.isArray(beats)) return { problems: ['beats is not an array'], notes };

  const cps = beats.filter(isCheckpoint);

  // ---- 0. GUARDRAIL: the question is never in the video ---------------------
  // Aroma, 2026-10-06: the quiz is made, but it goes to the repo for the LMS developer — it is NOT
  // put into the video. Its only home is the checkpoint beat's data, which the LMS reads from the
  // repo (server/lib/checkpoints.js; export-checkpoint.js writes the handoff file). A QUESTION card,
  // a REVEAL card, or a drawn beat carrying `quiz` puts it on screen too, so the learner sees the
  // question (and usually the answer) before the LMS can ask it.
  beats.forEach((b) => {
    if (!b || isCheckpoint(b)) return;
    const tpl = (b.info && b.info.tpl) || (b.overlay && b.overlay.tpl) || (b.card && b.card.tpl);
    if (tpl === 'quiz') problems.push(`beat ${b.id}: draws a quiz card. The question lives ONLY in the checkpoint beat — delete this beat`);
    if (b.quiz) problems.push(`beat ${b.id}: carries a quiz on a drawn beat. Move it into a { mode: "checkpoint" } beat and delete this one`);
    if (b.revealsQuiz) problems.push(`beat ${b.id}: is a REVEAL card. The LMS gives the feedback — delete this beat`);
  });

  // ---- 1. it exists ---------------------------------------------------------
  if (!cps.length && required) {
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

  return { problems, notes, count: cps.length };
}

module.exports = { checkpointChecks };
