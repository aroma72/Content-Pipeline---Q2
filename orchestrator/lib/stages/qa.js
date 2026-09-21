'use strict';
/**
 * qa -- score the finished video against the 7-factor rubric before it ships.
 *
 * Threshold is 4.9/7.0 per CLAUDE.md and QA_RATING_SYSTEM.md, and THRESHOLD below
 * is the only copy that executes. It used to be the only copy that was RIGHT:
 * prompts/quality_rating.txt named 6.0 as its default and asked for a
 * CONDITIONAL_PASS band at 4.5, while this file handed the judge threshold: 4.9 in
 * the same breath (see the input payload). Enforcing the number here stopped the
 * GATE drifting; it did nothing about the judge being told two different bars
 * before it scored. The prompt now states this number and no other, and
 * test-regressions.js asserts the two agree, so the next edit to either fails loudly.
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
  // Exported so the regression suite can assert the prompt and the standards docs
  // state THIS number, rather than regex-matching a literal out of the source and
  // proving only that some 4.9 exists somewhere.
  THRESHOLD,
  FACTORS,
  SCHEMA,

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
          'VISUALS: score from quality_sensors, not from guesswork. qa-art is a vision',
          'judge that DID look at every generated image; qa-visuals and qa-cutouts',
          'checked the visual plan. All passing is real evidence the visuals are sound.',
          'If a factor genuinely cannot be assessed from this evidence, score it',
          'neutrally (0.7) and say so in notes rather than scoring it low.',
        ].join(' '),
        mechanical_checks: produced.verifyChecks || [],
        // Verdicts from the four quality sensors that ran during produce. Without
        // these the judge had no observation of the VISUALS at all and scored that
        // factor neutrally on every video -- a pretty script with bad pictures
        // passed. qa-art in particular is a vision judge that DID look at the
        // images, so its verdict is real evidence about what is on screen.
        quality_sensors: produced.sensorResults || [],
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
