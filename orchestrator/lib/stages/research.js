'use strict';
/**
 * research -- turn a queue topic into a grounded brief for the script stage.
 *
 * Cheap and idempotent, so it retries freely: nothing downstream has run yet
 * and a transient API error here costs nothing but a few seconds.
 */

const { askJson } = require('../llm-router');

const SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    // What this brief narrowed the typed topic to, and why, addressed to whoever
    // typed it. A wrong narrowing is then one visible line rather than two minutes
    // of finished video nobody asked for.
    interpretation: {
      type: 'string',
      description: 'one sentence to the person who typed the topic: what you narrowed to, and why',
    },
    slo: { type: 'string', description: 'the single learning outcome this video serves' },
    audience: { type: 'string' },
    key_points: { type: 'array', items: { type: 'string' } },
    ali_scenario: {
      type: 'string',
      description: "the ONE running scenario the protagonist Ali is followed through",
    },
    friction: { type: 'string' },
    fix: { type: 'string' },
    failure_mode: { type: 'string' },
    payoff: { type: 'string' },
    misconceptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['topic', 'interpretation', 'slo', 'audience', 'key_points', 'ali_scenario',
             'friction', 'fix', 'failure_mode', 'payoff'],
  additionalProperties: false,
};

module.exports = {
  name: 'research',
  maxAttempts: 3,

  async run({ item, state: st, opts, log }) {
    log(`researching "${item.topic}"`);
    const brief = await askJson({
      log,
      // So the tokens this costs land on the run rather than nowhere.
      state: st,
      stage: 'research',
      promptName: 'video_research',
      input: [
        `Topic: ${item.topic}`,
        item.notes ? `Notes from the requester: ${item.notes}` : null,
        `Series: ${item.series}`,
      ].filter(Boolean).join('\n'),
      schema: SCHEMA,
      maxTokens: 8000,
      dryRun: opts.dryRun,
      dryRunValue: {
        topic: item.topic,
        interpretation: '(dry run)',
        slo: '(dry run)',
        audience: '(dry run)',
        key_points: ['(dry run)'],
        ali_scenario: '(dry run)',
        friction: '(dry run)', fix: '(dry run)',
        failure_mode: '(dry run)', payoff: '(dry run)',
      },
    });
    log(`brief ready: ${brief.key_points.length} key points`);
    return brief;
  },
};
