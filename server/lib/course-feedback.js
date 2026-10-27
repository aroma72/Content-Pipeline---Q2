'use strict';
/**
 * course-feedback -- what instructors think of the Course Builder, asked inside it.
 *
 * WHY THIS EXISTS (contract 1.6, 2026-10-27)
 * The first feedback round (2026-10-22/23) came from a Google Form filled in before anyone
 * had seen a finished video, and its one time question mixed days of preparation with
 * minutes in the builder. Three of the follow-ups it pointed to cannot be asked well from
 * outside the product: "rate the video you just watched", "did you know it was your turn",
 * "how long were you actually in here". So the questions ship with the service:
 *
 *   GET  /api/v1/feedback/questions                          the survey, as data (public)
 *   POST /api/v1/courses/:courseId/feedback                  one instructor's answers
 *   POST /api/v1/courses/:courseId/lessons/:lessonId/rating  one finished video, 1-10
 *   GET  /api/v1/feedback/export                             every row, for the rubric
 *
 * Rows are appended to feedback.jsonl beside the queue -- the same volume, so a redeploy
 * keeps them. Nothing is ever rewritten: a second answer from the same person is a new
 * row, and readers take the latest row per (person, course[, lesson]).
 *
 * The question ids line up with the Google Form so content/feedback/course_builder_feedback.py
 * can score both against the same baseline: `ease` = Q1, `improve` = Q2, `stuck` = Q3,
 * `prepMinutes` + `builderMinutes` = Q4 split in two, `liked` = Q5. The rest are the
 * follow-ups the first round asked for.
 */

const path = require('path');
const jsonl = require('../../orchestrator/lib/jsonl');

const SURVEY_VERSION = 'course-builder-2026-10-27';

const STUCK_AT = [
  { id: 'nowhere', label: 'I did not get stuck' },
  { id: 'starting', label: 'Knowing how to start' },
  { id: 'describing', label: 'Describing the course' },
  { id: 'plan', label: 'Reviewing the plan' },
  { id: 'script-review', label: 'Reading or approving a script' },
  { id: 'video-review', label: 'Watching or approving a video' },
  { id: 'waiting', label: 'Waiting, not sure what was happening' },
  { id: 'other', label: 'Somewhere else' },
];

const QUESTIONS = [
  { id: 'ease', type: 'scale', min: 1, max: 10, required: true, formQuestion: 'Q1',
    text: 'How easy was it to build your course?' },
  { id: 'startEase', type: 'scale', min: 1, max: 10, required: true,
    text: 'How easy was it to know where to start?' },
  { id: 'knewReview', type: 'choice', required: true,
    options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'not-sure', label: 'Not sure' }],
    text: 'Did you know when the course was waiting for your review?' },
  { id: 'stuck', type: 'choice', required: true, formQuestion: 'Q3', options: STUCK_AT,
    text: 'Did you get stuck anywhere?' },
  { id: 'stuckDetail', type: 'text', maxLength: 1000,
    text: 'If you got stuck, what happened?' },
  { id: 'prepMinutes', type: 'number', min: 0, max: 100000, formQuestion: 'Q4 (part 1)',
    text: 'Roughly how many minutes did you spend preparing before you started (outlines, notes, documents)?' },
  { id: 'builderMinutes', type: 'number', min: 0, max: 100000, required: true, formQuestion: 'Q4 (part 2)',
    text: 'Roughly how many minutes did you spend inside the Course Builder itself?' },
  { id: 'attachedDocuments', type: 'choice',
    options: [{ id: 'yes', label: 'Yes' }, { id: 'no-not-needed', label: 'No, I did not need to' },
      { id: 'no-did-not-know', label: 'No, I did not know I could' }],
    text: 'Did you attach your own documents for the course to be built from?' },
  { id: 'liked', type: 'text', maxLength: 1000, formQuestion: 'Q5',
    text: 'What did you like best?' },
  { id: 'improve', type: 'text', maxLength: 1000, formQuestion: 'Q2',
    text: 'What is one thing you would like us to improve?' },
  { id: 'useAgain', type: 'scale', min: 1, max: 10,
    text: 'How likely are you to build your next course with it?' },
];

const RATING = {
  score: { type: 'scale', min: 1, max: 10, required: true, text: 'How would you rate this video?' },
  textHardToRead: { type: 'boolean', text: 'Was any on-screen text hard to read?' },
  comment: { type: 'text', maxLength: 1000, text: 'Anything else about this video?' },
};

function feedbackFile() {
  return path.join(path.dirname(require('../../orchestrator/lib/queue').queueFile()), 'feedback.jsonl');
}

const isInt = (v) => typeof v === 'number' && Number.isInteger(v);

/** Check one answer against its question. Returns an error message, or null. */
function checkAnswer(q, v) {
  if (q.type === 'scale') {
    return isInt(v) && v >= q.min && v <= q.max ? null : `must be a whole number from ${q.min} to ${q.max}`;
  }
  if (q.type === 'number') {
    return typeof v === 'number' && Number.isFinite(v) && v >= q.min && v <= q.max
      ? null : `must be a number from ${q.min} to ${q.max}`;
  }
  if (q.type === 'choice') {
    return q.options.some((o) => o.id === v) ? null : `must be one of ${q.options.map((o) => o.id).join(', ')}`;
  }
  if (q.type === 'boolean') return typeof v === 'boolean' ? null : 'must be true or false';
  if (q.type === 'text') {
    return typeof v === 'string' && v.length <= q.maxLength ? null : `must be text of at most ${q.maxLength} characters`;
  }
  return 'is not a known question type';
}

/**
 * Validate a survey body. Unknown ids are refused rather than dropped: a renamed field
 * in the LMS form would otherwise be lost silently, round after round.
 * @returns {{ok:true, answers:object}|{ok:false, errors:Array<{field,message}>}}
 */
function parseSurvey(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, errors: [{ field: 'answers', message: 'send `answers` as an object keyed by question id' }] };
  }
  const errors = [];
  const out = {};
  for (const k of Object.keys(answers)) {
    if (!QUESTIONS.some((q) => q.id === k)) errors.push({ field: k, message: 'is not a question on this survey' });
  }
  for (const q of QUESTIONS) {
    const v = answers[q.id];
    if (v === undefined || v === null || v === '') {
      if (q.required) errors.push({ field: q.id, message: 'is required' });
      continue;
    }
    const bad = checkAnswer(q, typeof v === 'string' && q.type === 'text' ? v.trim() : v);
    if (bad) errors.push({ field: q.id, message: bad });
    else out[q.id] = typeof v === 'string' ? v.trim() : v;
  }
  return errors.length ? { ok: false, errors } : { ok: true, answers: out };
}

function parseRating(body) {
  const errors = [];
  const out = {};
  for (const [k, q] of Object.entries(RATING)) {
    const v = body[k];
    if (v === undefined || v === null || v === '') {
      if (q.required) errors.push({ field: k, message: 'is required' });
      continue;
    }
    const bad = checkAnswer(q, v);
    if (bad) errors.push({ field: k, message: bad });
    else out[k] = typeof v === 'string' ? v.trim() : v;
  }
  return errors.length ? { ok: false, errors } : { ok: true, rating: out };
}

/** Who is answering: the LMS's user id when sent, else the tenant. Never a name we invent. */
function raterOf(body, tenantId) {
  const by = body && typeof body.by === 'string' ? body.by.trim().slice(0, 120) : '';
  return by || String(tenantId || 'unknown');
}

function recordSurvey({ courseId, tenantId, by, answers }) {
  const row = { type: 'survey', version: SURVEY_VERSION, courseId, tenantId: tenantId || null, by, answers,
    at: new Date().toISOString() };
  jsonl.appendDurable(feedbackFile(), row);
  return row;
}

function recordRating({ courseId, lessonId, tenantId, by, rating }) {
  const row = { type: 'rating', courseId, lessonId, tenantId: tenantId || null, by, ...rating,
    at: new Date().toISOString() };
  jsonl.appendDurable(feedbackFile(), row);
  return row;
}

function rows() {
  return jsonl.readValid(feedbackFile()).filter((r) => r && (r.type === 'rating' || r.type === 'survey'));
}

/** The latest row per key, in first-seen order. */
function latest(list, keyOf) {
  const m = new Map();
  for (const r of list) m.set(keyOf(r), r);
  return [...m.values()];
}

const round1 = (n) => Math.round(n * 10) / 10;

function summariseRatings(list) {
  if (!list.length) return { count: 0, mean: null, textHardToRead: 0 };
  return {
    count: list.length,
    mean: round1(list.reduce((a, r) => a + r.score, 0) / list.length),
    textHardToRead: list.filter((r) => r.textHardToRead === true).length,
  };
}

/**
 * What GET /courses/:courseId shows: per lesson, and for the course.
 * @returns {{byLesson: Map<string,object>, course: object, responses: number}}
 */
function forCourse(courseId, all = rows()) {
  const mine = all.filter((r) => r.courseId === courseId);
  const ratings = latest(mine.filter((r) => r.type === 'rating'), (r) => `${r.lessonId}\u0000${r.by}`);
  const byLesson = new Map();
  for (const id of new Set(ratings.map((r) => r.lessonId))) {
    byLesson.set(id, summariseRatings(ratings.filter((r) => r.lessonId === id)));
  }
  const surveys = latest(mine.filter((r) => r.type === 'survey'), (r) => r.by);
  return { byLesson, course: summariseRatings(ratings), responses: surveys.length };
}

/** Every row a tenant may see (admin: all), oldest first, optionally after `since`. */
function exportRows({ tenantId = null, admin = false, since = null } = {}) {
  return rows()
    .filter((r) => admin || r.tenantId === tenantId)
    .filter((r) => !since || String(r.at) > String(since));
}

const PUBLIC = {
  version: SURVEY_VERSION,
  title: 'How was building this course?',
  when: 'Ask once per course, after the instructor has watched at least one finished video.',
  questions: QUESTIONS,
  rating: {
    when: 'Under every finished video (video review and published).',
    fields: RATING,
  },
};

module.exports = {
  SURVEY_VERSION, QUESTIONS, RATING, PUBLIC, STUCK_AT,
  parseSurvey, parseRating, raterOf, recordSurvey, recordRating, rows, forCourse, exportRows, feedbackFile,
};
