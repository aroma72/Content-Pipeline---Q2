'use strict';
/**
 * course-planner -- turn a topic into a course plan the video pipeline can build.
 *
 * This is the only genuinely new step in the course builder. Everything after it
 * already exists: each lesson in the plan becomes one queue item, and the
 * orchestrator spine drives it through research -> script -> gate -> produce ->
 * qa -> upload exactly as it does for a topic typed into Slack.
 *
 * Planning is deliberately separated from building, and is free:
 *   plan()   costs one model call, takes seconds, spends nothing else
 *   build    costs ~$1.50 and ~30 minutes PER LESSON
 * A six-lesson course is therefore ~$9 and around three hours. Nobody should
 * discover that by clicking a button, so the plan carries its own estimate and
 * the build is a separate, explicit call.
 */

const { askJson } = require('../../orchestrator/lib/llm-router');

/** A lesson is one video, so the fields here are what the pipeline needs per video. */
const LESSON = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'what this lesson teaches, plainly' },
    slo: { type: 'string', description: 'Given X, the learner can do Y — observable' },
    difficulty: { type: 'string', enum: ['novice', 'intermediate', 'advanced', 'expert'] },
    brief: {
      type: 'string',
      description: 'two or three sentences: the step of Ali\'s story this lesson covers, '
        + 'the friction, and the fix. This becomes the script brief.',
    },
    question: {
      type: 'object',
      properties: {
        stem: { type: 'string' },
        options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
        correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
        explanation: {
          type: 'string',
          description: 'why the common wrong choices are wrong, not just the right answer',
        },
      },
      required: ['stem', 'options', 'correctIndex', 'explanation'],
      additionalProperties: false,
    },
  },
  required: ['title', 'slo', 'difficulty', 'brief', 'question'],
  additionalProperties: false,
};

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    summary: { type: 'string', description: 'one paragraph, for the course catalogue' },
    audience: { type: 'string' },
    protagonist_scenario: {
      type: 'string',
      description: 'the ONE running scenario Ali is followed through for the whole course',
    },
    modules: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          lessons: { type: 'array', minItems: 1, items: LESSON },
        },
        required: ['title', 'summary', 'lessons'],
        additionalProperties: false,
      },
    },
    assumptions: {
      type: 'array',
      items: { type: 'string' },
      description: 'what was assumed because the request did not say',
    },
  },
  required: ['title', 'summary', 'audience', 'protagonist_scenario', 'modules'],
  additionalProperties: false,
};

// What one lesson costs to build, from the real per-video figures the spine records:
// art + TTS is the paid part, and a render occupies the box for about half an hour.
const PER_LESSON_USD = 1.5;
const PER_LESSON_MINUTES = 30;
const LESSON_VIDEO_MINUTES = 2.5;

/** Flatten to the unit the pipeline actually works in: one lesson, one video. */
function lessonsOf(plan) {
  return plan.modules.flatMap((m, mi) =>
    m.lessons.map((l, li) => ({ ...l, module: mi + 1, moduleTitle: m.title, index: li + 1 })));
}

function estimate(plan) {
  const n = lessonsOf(plan).length;
  return {
    lessons: n,
    // Stated as a range because a retry on a failed stage is normal, not exceptional.
    estimatedCostUsd: Number((n * PER_LESSON_USD).toFixed(2)),
    estimatedBuildMinutes: n * PER_LESSON_MINUTES,
    estimatedWatchMinutes: Number((n * LESSON_VIDEO_MINUTES).toFixed(1)),
    note: 'Cost is art and text-to-speech per video at the pipeline\'s measured rate. '
      + 'Build time is wall-clock, one video at a time. Neither is spent until a build '
      + 'is explicitly started.',
  };
}

/**
 * Plan a course. One model call; spends nothing else.
 * @param {{topic:string, duration?:string, audience?:string, description?:string}} req
 */
async function plan(req, { log = () => {} } = {}) {
  if (!req || !req.topic || !String(req.topic).trim()) {
    throw Object.assign(new Error('a topic is required'), { status: 400 });
  }

  const input = [
    `Topic: ${String(req.topic).trim()}`,
    req.audience ? `Audience: ${req.audience}` : null,
    req.duration ? `Total duration wanted: ${req.duration}` : null,
    req.description ? `What it should cover: ${req.description}` : null,
    !req.audience && !req.duration && !req.description
      ? 'No further detail was given — choose sensible defaults and list them in assumptions.'
      : null,
  ].filter(Boolean).join('\n');

  log(`planning course: ${req.topic}`);
  const draft = await askJson({ log, promptName: 'course_planner', input, schema: SCHEMA });

  return {
    ...draft,
    request: { topic: req.topic, duration: req.duration || null,
      audience: req.audience || null, description: req.description || null },
    estimate: estimate(draft),
    plannedAt: new Date().toISOString(),
  };
}

module.exports = { plan, lessonsOf, estimate, SCHEMA };
