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

// ---------------------------------------------------------------------------
// The FLAT MOTION GRAPHICS style (orchestrator/lib/styles.js). Same plan, three additions
// Aroma asked for (2026-10-07) so every course in this style reads like the P&C outline:
//   slos           the course's numbered SLOs ("1.1 Interpret …"), stated once
//   sloIds         per lesson, which of those it delivers
//   models         per lesson, the named practical models it teaches (name, author, steps)
//   walkthroughs   per lesson, at least two situations the model is applied to step by step
// No protagonist: this style has no recurring character.
const MOTION_LESSON = JSON.parse(JSON.stringify(LESSON));
MOTION_LESSON.properties.brief.description = 'two or three sentences: the skill this lesson '
  + 'teaches, the moment it matters, and the change it makes. This becomes the script brief.';
MOTION_LESSON.properties.sloIds = {
  type: 'array', items: { type: 'string' }, minItems: 1,
  description: 'ids of the course SLOs this lesson delivers, e.g. ["1.1","1.2"]',
};
MOTION_LESSON.properties.models = {
  type: 'array', minItems: 1, maxItems: 3,
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'e.g. "SCARF"' },
      author: { type: 'string', description: 'who it is from, e.g. "David Rock"' },
      summary: { type: 'string', description: 'one line: its steps or parts' },
    },
    required: ['name', 'author', 'summary'],
    additionalProperties: false,
  },
};
MOTION_LESSON.properties.walkthroughs = {
  type: 'array', minItems: 2, maxItems: 3,
  items: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'the move, e.g. "Rescuer vs Coach"' },
      situation: { type: 'string', description: 'a concrete workplace moment and how the model is applied to it, step by step; people by role, never by name' },
    },
    required: ['title', 'situation'],
    additionalProperties: false,
  },
};
MOTION_LESSON.required = [...LESSON.required, 'sloIds', 'models', 'walkthroughs'];

const MOTION_SCHEMA = JSON.parse(JSON.stringify(SCHEMA));
MOTION_SCHEMA.properties.modules.items.properties.lessons.items = MOTION_LESSON;
MOTION_SCHEMA.properties.slos = {
  type: 'array', minItems: 1,
  items: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'module.number, e.g. "1.3"' },
      text: { type: 'string', description: 'an observable action, e.g. "Interpret a reaction as a signal of an underlying need"' },
    },
    required: ['id', 'text'],
    additionalProperties: false,
  },
};
MOTION_SCHEMA.properties.protagonist_scenario.description = 'leave empty: this style has no protagonist';
MOTION_SCHEMA.required = ['title', 'summary', 'audience', 'slos', 'modules'];

/**
 * What the script writer is told about one lesson, beyond its brief and SLO: the models to
 * teach and the situations to walk through. Rides in the queue item's `notes`, which the
 * research and script stages already read into every prompt.
 */
function lessonNotes(lesson) {
  const out = [];
  if (Array.isArray(lesson.sloIds) && lesson.sloIds.length) out.push(`SLO ids: ${lesson.sloIds.join(', ')}`);
  if (Array.isArray(lesson.models) && lesson.models.length) {
    out.push('Models to teach (name the author on first use):');
    for (const m of lesson.models) out.push(`- ${m.name}${m.author ? ` (${m.author})` : ''}: ${m.summary || ''}`.trim());
  }
  if (Array.isArray(lesson.walkthroughs) && lesson.walkthroughs.length) {
    out.push('Walk through these situations step by step with the model:');
    for (const w of lesson.walkthroughs) out.push(`- ${w.title}: ${w.situation}`);
  }
  return out;
}

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
  // A motion-graphics lesson buys no art, only the voice.
  let perLesson = PER_LESSON_USD;
  try { perLesson = require('../../orchestrator/lib/styles').get(plan && plan.style).costPerLessonUsd; } catch { /* unknown style: house rate */ }
  return {
    lessons: n,
    style: (plan && plan.style) || require('../../orchestrator/lib/styles').DEFAULT_STYLE,
    // Stated as a range because a retry on a failed stage is normal, not exceptional.
    estimatedCostUsd: Number((n * perLesson).toFixed(2)),
    estimatedBuildMinutes: n * PER_LESSON_MINUTES,
    estimatedWatchMinutes: Number((n * LESSON_VIDEO_MINUTES).toFixed(1)),
    note: 'Cost is art and text-to-speech per video at the pipeline\'s measured rate. '
      + 'Build time is wall-clock, one video at a time. Neither is spent until a build '
      + 'is explicitly started.',
  };
}

/**
 * Draft the teaching for a course an instructor has ALREADY outlined (Flat Motion Graphics).
 *
 * The LMS course builder does not call plan(): instructors write each lesson's title and SLO
 * themselves. In the motion-graphics style every lesson is built from named models and
 * walk-throughs, which an instructor should not have to type from nothing -- so this drafts them
 * for the instructor's own lessons, unchanged and in order, and the instructor edits the draft.
 * One model call; spends nothing else. Same shapes as the motion-graphics plan, so what comes back
 * can be dropped straight into a plan and built.
 *
 * @param {{topic?:string, audience?:string, lessons:Array<{title:string, slo:string}>}} req
 * @returns {{style:'motion-graphics', slos:Array<{id,text}>, lessons:Array<{index,title,sloIds,models,walkthroughs}>}}
 */
const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    slos: MOTION_SCHEMA.properties.slos,
    lessons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sloIds: MOTION_LESSON.properties.sloIds,
          models: MOTION_LESSON.properties.models,
          walkthroughs: MOTION_LESSON.properties.walkthroughs,
        },
        required: ['sloIds', 'models', 'walkthroughs'],
        additionalProperties: false,
      },
    },
  },
  required: ['slos', 'lessons'],
  additionalProperties: false,
};
const MAX_DRAFT_LESSONS = 30;
// Swappable so the HTTP tests can exercise the route without calling a model.
let draftAsk = askJson;
function _setDraftAsk(fn) { draftAsk = fn || askJson; }

async function draftTeaching(req, { log = () => {} } = {}) {
  const bad = (m) => Object.assign(new Error(m), { status: 400 });
  const str = (v) => typeof v === 'string' && v.trim().length > 0;
  const lessons = req && req.lessons;
  if (!Array.isArray(lessons) || !lessons.length) throw bad('Send lessons: [{ title, slo }, ...] in course order.');
  if (lessons.length > MAX_DRAFT_LESSONS) throw bad(`At most ${MAX_DRAFT_LESSONS} lessons per draft.`);
  lessons.forEach((l, i) => {
    if (!l || !str(l.title)) throw bad(`lessons[${i}].title is required.`);
    if (!str(l.slo)) throw bad(`lessons[${i}].slo is required -- the draft is built from it.`);
  });

  const input = [
    req.topic ? `Course topic: ${String(req.topic).trim()}` : null,
    req.audience ? `Audience: ${String(req.audience).trim()}` : null,
    'Lessons, in order:',
    ...lessons.map((l, i) => `${i + 1}. ${String(l.title).trim()} — SLO: ${String(l.slo).trim()}`),
  ].filter(Boolean).join('\n');

  log(`drafting models and walk-throughs for ${lessons.length} lesson(s)`);
  const out = await draftAsk({ log, promptName: 'course_teaching_draft', input, schema: DRAFT_SCHEMA });
  if (!out || !Array.isArray(out.lessons) || out.lessons.length !== lessons.length) {
    throw Object.assign(new Error('The draft did not cover every lesson. Try again.'), { status: 502 });
  }
  return {
    style: 'motion-graphics',
    slos: Array.isArray(out.slos) ? out.slos : [],
    lessons: out.lessons.map((d, i) => ({
      index: i,
      title: lessons[i].title,
      sloIds: d.sloIds || [],
      models: d.models || [],
      walkthroughs: d.walkthroughs || [],
    })),
    draftedAt: new Date().toISOString(),
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

  // The style is chosen first, before anything is planned: it decides the plan's shape.
  const styles = require('../../orchestrator/lib/styles');
  const parsed = styles.parseStyle(req.style);
  if (!parsed.ok) throw Object.assign(new Error(parsed.message), { status: 400 });
  const style = parsed.style;
  const motion = style === 'motion-graphics';

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
  let draft = await askJson({ log, promptName: motion ? 'course_planner_motion' : 'course_planner',
    input, schema: motion ? MOTION_SCHEMA : SCHEMA });

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

  draft.style = style;
  return {
    ...draft,
    style,
    request: { topic: req.topic, duration: req.duration || null,
      audience: req.audience || null, description: req.description || null, style },
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
function validate(plan, { style } = {}) {
  const errors = [];
  // A motion-graphics lesson is BUILT from its models and walk-throughs (they are the
  // script brief), so in that style they are refused when missing, like the SLO is.
  const motion = (style || (plan && plan.style)) === 'motion-graphics';
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
      if (motion) {
        if (!Array.isArray(l.models) || !l.models.some((m) => m && str(m.name))) {
          bad(`${lp}.models`, 'In the motion-graphics style every lesson names at least one model '
            + '(name, author, summary) -- the video teaches the skill through it.');
        }
        if (!Array.isArray(l.walkthroughs) || l.walkthroughs.filter((w) => w && str(w.situation)).length < 2) {
          bad(`${lp}.walkthroughs`, 'In the motion-graphics style every lesson walks through at least '
            + 'two situations ({title, situation}) step by step.');
        }
      }
      if (l.difficulty !== undefined && !LESSON.properties.difficulty.enum.includes(l.difficulty)) {
        bad(`${lp}.difficulty`, `If given, \`difficulty\` must be one of: `
          + `${LESSON.properties.difficulty.enum.join(', ')}.`);
      }
    });
  });

  return errors.length ? { ok: false, errors } : { ok: true };
}

module.exports = { plan, draftTeaching, _setDraftAsk, lessonsOf, estimate, validate, lessonNotes, SCHEMA, LESSON, MOTION_SCHEMA, MOTION_LESSON };
