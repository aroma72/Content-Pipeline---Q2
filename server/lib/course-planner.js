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
  let draft = await askJson({ log, promptName: 'course_planner', input, schema: SCHEMA });

  // The model intermittently returns the plan wrapped in a one-element array,
  // which failed validation with "expected an object, got array" and lost a
  // whole paid call. The content was correct; only the wrapper was wrong, so
  // unwrap it rather than making the user pay for the same plan twice.
  if (Array.isArray(draft) && draft.length === 1 && draft[0] && draft[0].modules) {
    log('plan came back wrapped in an array -- unwrapping');
    draft = draft[0];
  }
  if (!draft || !Array.isArray(draft.modules)) {
    throw Object.assign(
      new Error('the planner did not return a course (no modules). Try again.'),
      { status: 502 }
    );
  }

  return {
    ...draft,
    request: { topic: req.topic, duration: req.duration || null,
      audience: req.audience || null, description: req.description || null },
    estimate: estimate(draft),
    plannedAt: new Date().toISOString(),
  };
}

/**
 * Check a plan a CALLER sends us against the schema the model is held to.
 *
 * The LMS edits the plan before building -- an instructor renames a lesson,
 * rewrites an SLO, drops one they do not want. That is the point of returning the
 * plan rather than persisting it. But it means the plan arriving at /build is no
 * longer the one we validated on the way out, and /build used to check only that
 * `modules` was an array. A plan whose lesson lost its `slo` in an editor would
 * queue a lesson with no objective, and nobody would find out until a person
 * watched a video that taught nothing in particular.
 *
 * SCOPED TO WHAT BUILD ACTUALLY CONSUMES, and no wider. The planner's SCHEMA is
 * what the MODEL is held to; holding a human editor to the same thing would refuse
 * a perfectly buildable plan because somebody deleted a module summary nothing
 * reads. So this refuses exactly the fields whose absence produces a broken
 * lesson -- the per-lesson title, objective and brief that become the topic and
 * the prompt -- and stays out of the way everywhere else. `question` and
 * `difficulty` are advisory at build time (the writer produces the checkpoint
 * itself), so a plan without them is trimmed, not invalid.
 *
 * Deliberately not a full JSON-schema engine: it reports every problem at once
 * with a path, because a caller fixing a form wants the whole list, not the first
 * error.
 *
 * @returns {{ok:true}|{ok:false, errors:Array<{path:string,message:string}>}}
 */
function validate(plan) {
  const errors = [];
  const bad = (p, m) => errors.push({ path: p, message: m });
  const str = (v) => typeof v === 'string' && v.trim().length > 0;

  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return { ok: false, errors: [{ path: 'plan', message: 'The plan must be an object.' }] };
  }
  if (!str(plan.title)) bad('title', 'The course needs a title.');
  if (!Array.isArray(plan.modules) || !plan.modules.length) {
    bad('modules', '`modules` is required and must hold at least one module.');
    return { ok: false, errors };
  }

  plan.modules.forEach((m, mi) => {
    const mp = `modules[${mi}]`;
    if (!m || typeof m !== 'object') { bad(mp, 'A module must be an object.'); return; }
    if (!str(m.title)) bad(`${mp}.title`, 'Every module needs a title -- it is filed under it.');
    if (!Array.isArray(m.lessons) || !m.lessons.length) {
      bad(`${mp}.lessons`, 'Every module needs at least one lesson.');
      return;
    }
    m.lessons.forEach((l, li) => {
      const lp = `${mp}.lessons[${li}]`;
      if (!l || typeof l !== 'object') { bad(lp, 'A lesson must be an object.'); return; }
      // These three are what a lesson is BUILT from: the title becomes the topic
      // and the slug, and the brief and the SLO are what the writer is given.
      if (!str(l.title)) bad(`${lp}.title`, 'Every lesson needs a title: it becomes the video\'s '
        + 'topic and its filename.');
      if (!str(l.slo)) bad(`${lp}.slo`, 'Every lesson needs an SLO. Without one the writer is '
        + 'asked for a video about nothing in particular, and nobody finds out until they watch it.');
      if (!str(l.brief)) bad(`${lp}.brief`, 'Every lesson needs a brief -- it is the prompt the '
        + 'script is written from.');
      if (l.difficulty !== undefined && !LESSON.properties.difficulty.enum.includes(l.difficulty)) {
        bad(`${lp}.difficulty`, `If given, \`difficulty\` must be one of: `
          + `${LESSON.properties.difficulty.enum.join(', ')}.`);
      }
    });
  });

  return errors.length ? { ok: false, errors } : { ok: true };
}

module.exports = { plan, lessonsOf, estimate, validate, SCHEMA, LESSON };
