'use strict';
/**
 * one-video -- a topic in, one finished video out.
 *
 * The smallest useful thing this system can do, and the only path that works
 * end to end today with no human in the middle:
 *
 *     topic  ->  one model call  ->  the renderer  ->  an MP4 you can watch
 *
 * Everything larger has been tried and is slower and more fragile: a course is
 * nine of these plus a queue, an approval step and a build worker; a full
 * production lesson adds generated art, a paid voiceover, animation, brand
 * bumpers and an upload, which is eight external dependencies and about
 * $1.50 and half an hour per video.
 *
 * This is one model call and a render. Roughly ninety seconds, and nothing is
 * bought -- the renderer draws cards, so no image or audio is generated.
 */

const { askJson } = require('../../orchestrator/lib/llm-router');
const preview = require('./lesson-preview');

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'what the video teaches, plainly, under ~60 chars' },
    slo: { type: 'string', description: 'Given X, the learner can do Y -- observable' },
    scenario: { type: 'string', description: "the concrete situation Ali is in" },
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
  required: ['title', 'slo', 'scenario', 'question'],
  additionalProperties: false,
};

/**
 * Write one video from a topic, then render it.
 * @param {{topic:string}} req
 * @param {{log?:Function, onStage?:Function}} opts
 */
async function make(req, { log = () => {}, onStage = () => {} } = {}) {
  const topic = String((req && req.topic) || '').trim();
  if (!topic) throw Object.assign(new Error('a topic is required'), { status: 400 });

  onStage('writing');
  log(`writing: ${topic}`);
  const lesson = await askJson({
    log,
    promptName: 'one_video',
    input: `Topic: ${topic}`,
    schema: SCHEMA,
  });
  if (!lesson || !lesson.title) {
    throw Object.assign(new Error('the writer did not return a video'), { status: 502 });
  }

  onStage('rendering');
  log(`rendering: ${lesson.title}`);
  const rendered = await preview.render(lesson);

  return { lesson, video: rendered };
}

module.exports = { make, SCHEMA };
