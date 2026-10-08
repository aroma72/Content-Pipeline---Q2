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
  }));
}

module.exports = { STYLES, STYLE_VALUES, DEFAULT_STYLE, isStyle, get, styleOf, renderEnv, parseStyle, publicStyles };
