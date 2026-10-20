'use strict';
/**
 * purpose -- what a video is FOR, and which house rules follow from that.
 *
 * Contract 1.4 (decided 2026-10-20): "Make a video" serves more than lessons. An
 * instructor may want a one-off explainer, a marketing piece, or an announcement,
 * and two house rules that are right for a lesson are wrong for those:
 *
 *   - the single named protagonist (Ali) carrying the teaching, and
 *   - the mandatory CHECKPOINT question the LMS pops over the player.
 *
 * Each purpose says which of those it keeps. Every stage that behaves differently
 * asks this module rather than testing the string, same as lib/styles.js. The
 * default is `lesson`, which is exactly today's behaviour -- a request that sends
 * no purpose builds the video it always did.
 *
 * Bumpers are NOT a purpose decision: every deliverable is still wrapped in the
 * Taleemabad bumpers (LAW 1), whatever it is for.
 */

const { loadPrompt } = require('./paths');

const PURPOSES = [
  {
    id: 'lesson',
    default: true,
    label: 'Lesson',
    summary: 'Teaches one concept through Ali, and asks the learner one question the LMS pops over the player.',
    needsProtagonist: true,
    needsCheckpoint: true,
    allowsCheckpoint: true,
    needsSlo: true,
    prompt: null,
  },
  {
    id: 'explainer',
    default: false,
    label: 'Explainer',
    summary: 'Explains one thing through Ali. A checkpoint question is allowed but not required.',
    needsProtagonist: true,
    needsCheckpoint: false,
    allowsCheckpoint: true,
    needsSlo: true,
    prompt: 'video_purpose_explainer',
  },
  {
    id: 'marketing',
    default: false,
    label: 'Marketing',
    summary: 'One message, one call to action. No protagonist rule, no quiz.',
    needsProtagonist: false,
    needsCheckpoint: false,
    allowsCheckpoint: false,
    needsSlo: false,
    prompt: 'video_purpose_marketing',
  },
  {
    id: 'announcement',
    default: false,
    label: 'Announcement',
    summary: 'Tells people what is happening, when, and what to do. No protagonist rule, no quiz.',
    needsProtagonist: false,
    needsCheckpoint: false,
    allowsCheckpoint: false,
    needsSlo: false,
    prompt: 'video_purpose_announcement',
  },
];

const BY_ID = new Map(PURPOSES.map((p) => [p.id, p]));
const DEFAULT_PURPOSE = PURPOSES.find((p) => p.default).id;
const PURPOSE_VALUES = PURPOSES.map((p) => p.id);

function get(id) {
  if (id === undefined || id === null || id === '') return BY_ID.get(DEFAULT_PURPOSE);
  const p = BY_ID.get(id);
  if (!p) throw new Error(`unknown video purpose '${id}' -- expected one of ${PURPOSE_VALUES.join(', ')}`);
  return p;
}

/** The purpose a queue item is built for. Missing = lesson, never "pick one now". */
function purposeOf(item) { return get(item && item.purpose); }

function parsePurpose(value) {
  if (value === undefined || value === null || value === '') return { ok: true, purpose: DEFAULT_PURPOSE };
  if (typeof value === 'string' && BY_ID.has(value)) return { ok: true, purpose: value };
  return { ok: false, message: `Unknown \`purpose\` ${JSON.stringify(value)}. Choose one of: ${PURPOSE_VALUES.join(', ')}.` };
}

/**
 * The paragraph the research and script prompts carry for a non-lesson purpose.
 * Lives in prompts/<name>.txt (never inline -- CLAUDE.md), loaded on demand.
 */
function promptBlock(item) {
  const p = purposeOf(item);
  if (!p.prompt) return null;
  return loadPrompt(p.prompt);
}

function publicPurposes() {
  return PURPOSES.map((p) => ({
    id: p.id, label: p.label, default: p.default, summary: p.summary,
    protagonist: p.needsProtagonist, checkpoint: p.needsCheckpoint ? 'required' : (p.allowsCheckpoint ? 'optional' : 'none'),
  }));
}

module.exports = { PURPOSES, PURPOSE_VALUES, DEFAULT_PURPOSE, get, purposeOf, parsePurpose, promptBlock, publicPurposes };
