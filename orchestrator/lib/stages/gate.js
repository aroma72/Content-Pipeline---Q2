'use strict';
/**
 * gate -- step 0 of the video pipeline: only a READY script gets animated.
 *
 * This gate exists because everything after it costs money and ~40 minutes.
 * A NEEDS WORK verdict currently stops the run (RejectedError); ILHAM plan 3.3
 * turns that into a re-draft loop capped at 3 attempts. The re-draft belongs
 * here, not in the spine, which is why the verdict shape already carries the
 * line-level fixes a redraft would need.
 */

const { askJson } = require('../llm-router');
const { RejectedError, RedraftError } = require('../spine-errors');
const state = require('../state');

const SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['READY', 'NEEDS WORK', 'NOT READY'] },
    reasons: { type: 'array', items: { type: 'string' } },
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          beat_id: { type: 'string' },
          // Required, so the gate cannot dodge the distinction between "this video
          // would be wrong" and "this wording could be better".
          severity: { type: 'string', enum: ['blocker', 'minor'] },
          problem: { type: 'string' },
          suggested: { type: 'string' },
        },
        required: ['beat_id', 'severity', 'problem', 'suggested'],
        additionalProperties: false,
      },
    },
  },
  required: ['verdict', 'reasons'],
  additionalProperties: false,
};

module.exports = {
  name: 'gate',
  maxAttempts: 2,

  async run(ctx) {
    const { artifacts, opts, log } = ctx;
    const script = artifacts.script;
    log(`gating ${script.beatCount} beats`);

    const result = await askJson({
      log,
      promptName: 'script_gate',
      input: JSON.stringify({ title: script.title, beats: script.beats }, null, 2),
      schema: SCHEMA,
      maxTokens: 8000,
      dryRun: opts.dryRun,
      dryRunValue: { verdict: 'READY', reasons: ['(dry run -- gate not actually evaluated)'] },
    });

    log(`verdict: ${result.verdict}`);

    const fixes = result.fixes || [];
    const blockers = fixes.filter((f) => f.severity === 'blocker');
    const minors = fixes.filter((f) => f.severity !== 'blocker');

    // A reviewer with a zero-defect bar never terminates. Measured: across 10 first
    // drafts and ~33 redrafts this gate returned READY exactly zero times, while
    // repeatedly opening with "the spine is sound" and then blocking on phrasing.
    // The pipeline's job is to ship sound videos, not perfect scripts -- so what
    // decides is whether anything BLOCKING remains, not whether anything remains.
    if (result.verdict === 'NEEDS WORK' && blockers.length === 0 && fixes.length > 0) {
      log(`verdict NEEDS WORK but no blocking fixes -- treating as READY ` +
          `(${minors.length} minor improvement(s) left unmade)`);
      state.recordIntervention(ctx.state, {
        stage: 'gate',
        kind: 'passed_with_minor_fixes',
        detail: `Gate listed ${minors.length} minor fix(es) and no blockers: ` +
                minors.map((f) => `${f.beat_id}: ${f.problem}`).join(' | ').slice(0, 500),
      });
      return { ...result, verdict: 'READY', passedWithMinors: minors };
    }

    // Never a silent pass either way: animating a rejected script spends real
    // money producing a video that fails QA later anyway.
    if (result.verdict === 'NEEDS WORK') {
      // Fixable -- send it back with the critique (ILHAM 3.3). The spine bounds
      // how many rounds this can take. Previously this critique was written to a
      // log and then thrown away, which was the single biggest waste in the chain:
      // a competent, specific review that nothing acted on.
      const critique = [
        ...(result.reasons || []),
        ...(result.fixes || []).map((f) => (typeof f === 'string' ? f : JSON.stringify(f))),
      ];
      throw new RedraftError(
        `Script gate returned NEEDS WORK: ${(result.reasons || []).join('; ')}`,
        { fromStage: 'script', verdict: result.verdict, feedback: critique }
      );
    }

    if (result.verdict !== 'READY') {
      // NOT READY means the premise itself is wrong (wrong topic, unteachable in
      // one video). Redrafting the same brief will not fix that, so it is terminal.
      throw new RejectedError(
        `Script gate returned ${result.verdict}: ${(result.reasons || []).join('; ')}`,
        { verdict: result.verdict, details: result.fixes || [] }
      );
    }
    return result;
  },
};
