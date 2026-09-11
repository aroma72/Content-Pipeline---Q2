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

const fs = require('fs');
const path = require('path');
const { PATHS } = require('../../orchestrator/lib/paths');
const { askJson } = require('../../orchestrator/lib/llm-router');
const preview = require('./lesson-preview');

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'what the video teaches, plainly, under ~60 chars. MUST contain the subject of the topic that was asked.' },
    interpretation: { type: 'string', description: 'one sentence to the person who typed the topic: what you narrowed to, and why' },
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
  required: ['title', 'interpretation', 'slo', 'scenario', 'question'],
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

  // Register it so Taleemabad University can pull it like any other video: its
  // own folder with beats.js and durations.json is exactly what the checkpoint
  // API reads, so GET /api/v1/videos lists it and the LMS can fetch its
  // question with the integration it already has.
  onStage('publishing');
  let slug = null;
  try { slug = register(lesson, rendered); log(`registered as ${slug}`); }
  catch (e) { log(`could not register for the LMS: ${e.message}`); }

  // Publish to YouTube, unlisted. Not fatal: a video you can watch is still a
  // result, and failing the whole request over the upload would throw away a
  // render that worked.
  let youtube = null;
  try {
    youtube = await publish(lesson, rendered, log);
  } catch (e) {
    log(`youtube upload failed: ${e.message}`);
    youtube = { error: e.message };
  }

  return { lesson, video: rendered, slug, youtube };
}

/** A filesystem-safe slug, stable enough to look up but not to collide. */
function slugify(title) {
  // Trim AFTER the length cut too -- slicing at 48 lands on a hyphen often
  // enough that ids came out with a double hyphen before the suffix.
  const base = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '') || 'video';
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

/**
 * Write the video into explainer-videos/made/<slug>/ in the shape the
 * checkpoint API already understands, so it appears in the LMS catalogue.
 *
 * Note the same limitation as everything else on this service: the container
 * has no volume, so a registered video survives until the next deploy. Its
 * YouTube link does not -- that is the durable artefact.
 */
function register(lesson, rendered) {
  const slug = slugify(lesson.title);
  const dir = path.join(PATHS.explainerVideos, 'made', slug);
  fs.mkdirSync(path.join(dir, 'out'), { recursive: true });

  fs.writeFileSync(path.join(dir, 'beats.js'), preview.beatsFor(lesson));
  fs.writeFileSync(path.join(dir, 'durations.json'),
    JSON.stringify(preview.durationsFor(), null, 2));
  fs.copyFileSync(rendered.file, path.join(dir, 'out', `${slug}_final.mp4`));
  return slug;
}

/** Upload unlisted and return the link. */
async function publish(lesson, rendered, log) {
  const yt = require('../../orchestrator/lib/youtube');
  if (!yt.isAuthorised()) {
    throw new Error('YouTube is not authorised on this service (no refresh token).');
  }
  const q = lesson.question || {};
  const description = [
    lesson.slo || '',
    '',
    lesson.scenario || '',
    '',
    q.stem ? `Question: ${q.stem}` : '',
    q.explanation ? `Answer: ${(q.options || [])[q.correctIndex] || ''} — ${q.explanation}` : '',
    '',
    'Made by the Drawing Room content pipeline for Taleemabad University.',
  ].filter(Boolean).join('\n').slice(0, 4900);

  log('uploading to youtube (unlisted)');
  const r = await yt.uploadVideo({
    filePath: rendered.file,
    title: lesson.title.slice(0, 95),
    description,
    tags: ['Taleemabad', 'explainer'],
    privacyStatus: 'unlisted',
    log: (m) => log(`  [yt] ${m}`),
  });
  return { videoId: r.videoId, url: r.url, privacyStatus: r.privacyStatus };
}

module.exports = { make, SCHEMA };
