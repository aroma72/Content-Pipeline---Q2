'use strict';
/**
 * styles -- the closed set of VIDEO STYLES a course (or a single video) can be built in.
 *
 * Chosen once, at the very start of course creation, and carried on every queue item
 * (`item.style`) the same way `wantReferences` is. Every stage that behaves differently
 * per style asks this module rather than testing the string itself, so adding a third
 * style is one entry here plus its prompts and renderer.
 *
 *   character-arc    the original house style: ONE illustrated protagonist (Ali) followed
 *                    through a single scenario -- Imagen/Gemini art, cutout animation and
 *                    i2v motion on the story beats.
 *   motion-graphics  flat, colourful motion graphics in the LearnFree manner (first used for
 *                    the P&C People Skills course, 2026-10): every beat is an HTML template
 *                    (animation/info-lf.js) -- bold slab titles, icons, simple figures, named
 *                    models walked through step by step -- spoken straight to the learner as
 *                    "you". No art is bought; only the voice costs anything.
 *
 * The list is SERVED (GET /api/v1/styles and the `styles` field of GET /api/v1), not
 * documented, for the same reason `blockedBy` is: a consumer can pin a test against a
 * value it fetched, and cannot against a comment.
 */

const path = require('path');
const { PATHS } = require('./paths');

const BRAND = path.join(PATHS.brandBumpers, 'brand');

const STYLES = [
  {
    id: 'character-arc',
    label: 'Character Arc',
    default: true,
    summary: 'A story-led explainer: one illustrated character, Ali, is followed through a single '
      + 'real scenario, with painted scenes and animated story moments.',
    bestFor: 'Concepts that land best as a story: tools, workflows, before-and-after change.',
    // How the script SOUNDS, so an instructor can judge it before choosing. The sample lines are
    // the opening of a shipped video in this style (self-healing-01), not invented copy.
    writingStyle: {
      narrator: 'A warm mentor tells the story of Ali, an invented character, in the third person.',
      voice: 'Warm, friendly mentor (Gemini "Aoede"), one steady read throughout.',
      rules: [
        'Leads with the answer, then follows Ali through ONE real scenario in depth.',
        'Story arc: the problem, the fix, why it works, the common mistake, the payoff.',
        'One short spoken sentence per scene, with real numbers on screen.',
      ],
      sample: [
        { line: 'Self-healing is not a smarter brain; it is a room that catches its own mistakes.' },
        { line: 'Ali keeps every order in one paper ledger on his shop counter.' },
        { line: 'He asks his AI helper which orders from last month were never paid.' },
        { line: 'One date in that request is wrong, so the answer comes back completely blank.' },
        { line: 'Three weeks later the supplier arrives and drops the unpaid bills on his counter.' },
      ],
    },
    previewFile: path.join(BRAND, 'style-previews', 'character-arc.mp4'),
    previewSeconds: 12,
    costPerLessonUsd: 1.5,
    prompts: { script: 'video_script', gate: 'script_gate' },
    // Nothing overridden: the templates' defaults ARE this style.
    render: {},
  },
  {
    id: 'motion-graphics',
    label: 'Flat Motion Graphics',
    default: false,
    summary: 'Flat, colourful motion graphics: bold titles, icons and simple figures, with each '
      + 'skill taught through a named model and walked through on real situations, spoken '
      + 'directly to the learner as "you".',
    bestFor: 'People skills, soft skills, frameworks and models, and step-by-step how-tos.',
    // Sample lines from the P&C People Skills Course 1 Week 1 video, with the read cue each
    // line was voiced with.
    writingStyle: {
      narrator: 'A calm, composed woman speaks straight to the learner as "you". No named character.',
      voice: 'Calm and collected with steady energy (Gemini "Sulafat"); each line carries its own emotional cue.',
      rules: [
        'Every skill is taught through a named model, credited to its author (e.g. SCARF, RASA, GROW).',
        'At least two real workplace situations are walked through step by step, with the exact words to say.',
        'Shape: hook, the model, walk-throughs, the common mistake, a three-line recap.',
      ],
      sample: [
        { line: 'You are a P&C Buddy, and that role is bigger than it first looks.', read: 'with a warm, welcoming smile' },
        { line: 'You care for the person, and you stay fair to the organisation, both at the same time.', read: 'calmly and with conviction' },
        { line: 'Lean only toward the person, and you end up taking sides.', read: 'with a gentle note of caution' },
        { line: 'Say an employee tells you their manager never gives them any feedback.', read: 'with empathy' },
        { line: 'A supporter asks what they have tried, and helps them plan that conversation themselves.', read: 'warmly and confidently' },
      ],
    },
    previewFile: path.join(BRAND, 'style-previews', 'motion-graphics.mp4'),
    previewSeconds: 12,
    // No illustration is bought -- the voice is the only paid call.
    costPerLessonUsd: 0.5,
    prompts: { script: 'video_script_motion', gate: 'script_gate_motion' },
    render: {
      // The LearnFree renderer, shipped in the skill templates and copied into every video.
      LESSON_HTML: 'animation/lesson-lf.html',
      // A calmer, collected woman's voice with emotional range (Aroma, 2026-10-06). Each
      // beat may add a short `tone` cue that tts-lesson.js appends to this directive.
      TTS_VOICE: 'Sulafat',
      TTS_STYLE: 'You are a calm, composed woman who coaches people-care professionals. Your voice '
        + 'is warm, grounded and steady, with quiet energy that never drops — engaged and present, '
        + 'never sleepy, never salesy. Let real feeling show where the line calls for it, with '
        + 'natural intonation, light emphasis on the key words and an unhurried pace. ',
      // "Finally See The Light" (Bryan Teoh, FreePD, CC0 public domain), levelled to -21 dBFS
      // mean so it ducks to ~-29 dB under the narration -- the level Aroma approved.
      MUSIC_FILE: path.join(BRAND, 'music-motion-graphics.mp3'),
    },
  },
];

const BY_ID = new Map(STYLES.map((s) => [s.id, s]));
const DEFAULT_STYLE = STYLES.find((s) => s.default).id;
const STYLE_VALUES = STYLES.map((s) => s.id);

/** True when `id` names a style this service can build. */
function isStyle(id) { return BY_ID.has(id); }

/** The style record for an id, or the default for a missing one. Unknown ids throw. */
function get(id) {
  if (id === undefined || id === null || id === '') return BY_ID.get(DEFAULT_STYLE);
  const s = BY_ID.get(id);
  if (!s) throw new Error(`unknown video style '${id}' -- expected one of ${STYLE_VALUES.join(', ')}`);
  return s;
}

/**
 * The style a queue item is built in. Items enqueued before styles existed have none,
 * and those were all built in the original style -- so a missing value means the default,
 * never "pick one now".
 */
function styleOf(item) { return get(item && item.style); }

/** Environment overrides for every pipeline command run for this item. */
function renderEnv(item) { return { ...styleOf(item).render }; }

/**
 * Validate a caller-supplied style. Returns { ok:true, style } with the default filled in,
 * or { ok:false, message } -- a request naming a style we cannot build must be refused, not
 * quietly built in the default (the instructor would get the wrong video after the spend).
 */
function parseStyle(value) {
  if (value === undefined || value === null || value === '') return { ok: true, style: DEFAULT_STYLE };
  if (typeof value === 'string' && isStyle(value)) return { ok: true, style: value };
  return {
    ok: false,
    message: `Unknown \`style\` ${JSON.stringify(value)}. Choose one of: ${STYLE_VALUES.join(', ')} `
      + '(GET /api/v1/styles lists them with a preview video for each).',
  };
}

/** The public description of every style, with absolute preview URLs. */
function publicStyles(baseUrl) {
  return STYLES.map((s) => ({
    id: s.id,
    label: s.label,
    default: s.default,
    summary: s.summary,
    bestFor: s.bestFor,
    previewUrl: `${baseUrl}/api/v1/styles/${s.id}/preview.mp4`,
    previewSeconds: s.previewSeconds,
    estimatedCostPerLessonUsd: s.costPerLessonUsd,
    writingStyle: s.writingStyle,
  }));
}

module.exports = { STYLES, STYLE_VALUES, DEFAULT_STYLE, isStyle, get, styleOf, renderEnv, parseStyle, publicStyles };
