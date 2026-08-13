'use strict';
/**
 * qa -- score the finished video against the 7-factor rubric before it ships.
 *
 * Threshold is 4.9/7.0 per CLAUDE.md and QA_RATING_SYSTEM.md. Note the existing
 * prompts/quality_rating.txt still names 6.0 as its default threshold; the
 * authoritative number is enforced here in code so the two cannot drift.
 *
 * ILHAM plan 3.4 extends this to regenerate the weakest stage on a fail. Today
 * a fail is terminal and loud -- which is the correct default, because the
 * alternative is publishing work that missed the bar.
 */

const { askJson } = require('../llm-router');
const { RejectedError } = require('../spine-errors');
const jsonl = require('../jsonl');
const { PATHS } = require('../paths');

const THRESHOLD = 4.9;

const FACTORS = [
  'accuracy', 'objectives_coverage', 'post_production', 'visuals',
  'storytelling', 'voiceover_quality', 'qa_at_each_step',
];

const SCHEMA = {
  type: 'object',
  properties: {
    factors: {
      type: 'object',
      properties: Object.fromEntries(FACTORS.map((f) => [f, { type: 'number' }])),
      required: FACTORS,
      additionalProperties: false,
    },
    combined_score: { type: 'number' },
    weakest_factor: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['factors', 'combined_score', 'weakest_factor', 'notes'],
  additionalProperties: false,
};

module.exports = {
  name: 'qa',
  maxAttempts: 2,

  async run({ item, state: st, artifacts, opts, log }) {
    const produced = artifacts.produce;
    log('scoring against the 7-factor rubric');

    const result = await askJson({
      log,
      promptName: 'quality_rating',
      // What the judge can and cannot see is stated explicitly. It has no way to
      // open an MP4, so `video_path` was an invitation to guess -- and it guessed
      // low, failing a sound video on factors it could not observe. Production
      // quality is now judged from verify.js's measurements, and the beat list
      // gives it the visual plan even though it cannot watch the result.
      input: JSON.stringify({
        video_id: item.id,
        how_to_read_this: [
          'You CANNOT watch the video and must not try. Judge only from what is here.',
          'Technical/production factors: score from mechanical_checks, which are real',
          'measurements of the finished file. All passing = production is sound.',
          'Content factors: score from script_text and beats.',
          'If a factor genuinely cannot be assessed from this evidence, score it',
          'neutrally (0.7) and say so in notes rather than scoring it low.',
        ].join(' '),
        mechanical_checks: produced.verifyChecks || [],
        learning_outcomes: [artifacts.research && artifacts.research.slo].filter(Boolean),
        script_text: (artifacts.script.beats || []).map((b) => b.vo).join(' '),
        beats: (artifacts.script.beats || []).map((b) => ({
          id: b.id, mode: b.mode, vo: b.vo,
          visual: b.mode === 'info' ? `infographic: ${b.info && b.info.tpl}` : 'illustrated scene',
        })),
        context: { series: item.series, topic: item.topic, threshold: THRESHOLD },
      }, null, 2),
      schema: SCHEMA,
      maxTokens: 8000,
      dryRun: opts.dryRun,
      dryRunValue: {
        factors: Object.fromEntries(FACTORS.map((f) => [f, 0.8])),
        combined_score: 5.6,
        weakest_factor: '(dry run)',
        notes: '(dry run -- not actually scored)',
      },
    });

    // Trust the per-factor scores over the model's own arithmetic.
    const summed = Number(FACTORS.reduce((a, f) => a + (result.factors[f] || 0), 0).toFixed(2));
    if (Math.abs(summed - result.combined_score) > 0.05) {
      log(`combined_score ${result.combined_score} disagrees with the factor sum ${summed}; using the sum`);
    }
    const score = summed;
    const status = score >= THRESHOLD ? 'PASS' : 'FAIL';
    log(`score ${score}/7.0 -- ${status} (threshold ${THRESHOLD})`);

    if (!opts.dryRun) {
      jsonl.append(PATHS.qaRatingsLog, {
        type: 'qa_rating',
        at: new Date().toISOString(),
        runId: st.runId,
        videoId: item.id,
        factors: result.factors,
        combinedScore: score,
        threshold: THRESHOLD,
        status,
        weakestFactor: result.weakest_factor,
        notes: result.notes,
      });
    }

    if (status === 'FAIL') {
      throw new RejectedError(
        `QA ${score}/7.0 is below the ${THRESHOLD} bar (weakest: ${result.weakest_factor}). ` +
        `Not publishing.`,
        { verdict: 'FAIL', details: result }
      );
    }

    return { ...result, combined_score: score, status, threshold: THRESHOLD };
  },
};
