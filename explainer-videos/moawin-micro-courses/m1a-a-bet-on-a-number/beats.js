'use strict';
/*
 * beats.js — Moawin micro-courses · Module 1 · Video 1A  (v3, 2026-10-16)
 * "A Hypothesis Is a Bet on a Number" (brief videos 1.1 + 1.2, merged)
 *
 * FORMAT (Aroma, 2026-10-16, after reviewing v1 A/B): flat motion graphics ONLY, scripted like the
 * P&C course — spoken to "you", the person watching. No Ali (Aroma's exception, as in P&C).
 * STRUCTURE: the general concept first, then a localized walk-through on the viewer's OWN Sprint 06
 * rows (MOA-8, MOA-9, MOA-7, MOA-5). Teachers and CCs only as roles; rows quoted exactly.
 * TENSE: today is before Thu 22 Oct — the retro and the week 2 reading are always in the FUTURE.
 * VOICE: P&C tts-lesson.js verbatim (Sulafat), every line voiced in one fresh run.
 *
 * Taleemabad's goal rule ("How we set a goal" page, research.md): the headline, task vs bet, the 8
 * short questions (this video = Q1 + Q7; 1B = Q2–Q5; 1C = Q6 + Q8), no pushing, small steps.
 *
 * SLO: tell a task from a hypothesis, and write the number line: RDF metric, from, to, by when.
 * The CHECKPOINT (id 18) is never drawn, never spoken.
 * Gate 3 (2026-10-16): NEEDS WORK, no hard-fails → 4 line fixes applied (19 names MOA-8 + by when,
 * 04 says "hypothesis", 23 "past its target", 10 ties the week 2 average to Thu 22 Oct).
 */

const NUMBER = { title: 'The number line', letters: ['1', '2', '3', '4'], words: ['Metric', 'From', 'To', 'By when'] };
const MOA8_LINE = 'IF we ask CCs to create weekly schedule for their school visits it will give us better engagement.';
const MOA7_LINE = 'IF we onboard teachers on HOTs and how their scores are calculated then we can see an improvemnt in Coaching score.';
// Taleemabad's 8 short questions, worded for Moawin = the brief's 8 fields of a hypothesis row (§6.3).
const EIGHT = [
  ['Which number?', 'The RDF number we want to move'],
  ['What do we see?', 'Where the number is low'],
  ['Why?', 'What teachers or CCs tell us is hard'],
  ['What will we change?', 'And when teachers get it'],
  ['Why would they want it?', 'A reason to use it, with no one pushing'],
  ['Our bet in one line', 'IF we do this, THEN this happens, BECAUSE …'],
  ['What do we expect?', 'From the starting number to the target, by when'],
  ['When were we wrong?', 'The number that tells us to stop'],
];

const QUIZ = {
  stem: 'Is "Remove duplicate teacher records" (MOA-5) a task or a hypothesis?',
  options: [
    'A hypothesis, because it will make the data more accurate',
    'A task, because it is work we do and names no RDF number that could prove it wrong',
    'A hypothesis, because it has a "null if" in its row',
    'A task, because roster work is not important',
  ],
  answer: 1,
  correctNote: 'Right. Cleaning the roster is useful enabler work that helps the numbers be read '
    + 'correctly, but it names no RDF number it should move and no result that could prove it wrong, '
    + 'so the retro will have nothing to call.',
  explain: 'It is a task: it says what we will do, but not whether it helped, and it names no RDF '
    + 'number that could prove it wrong. Accurate data is a good aim, but "more accurate" is not a '
    + 'share or a rate the retro can read. Having a "null if" cell is not enough either: MOA-5\'s '
    + 'null-if only restates the goal, so it can never happen. And it is not unimportant: it is an '
    + 'enabler that helps other hypotheses get read correctly.',
};

module.exports = [
  { id: '01', mode: 'info', tone: 'warmly, with quiet confidence',
    vo: 'Before the retro, let\'s make sure each row you write is a real bet.',
    info: { tpl: 'lfTitle', data: { bg: 'mustard', text: 'A Bet on a Number', sub: 'task or hypothesis?', shapes: 'squares' } } },

  // ── the concept, read off Taleemabad's own goal page ──────────────────────
  { id: '02', mode: 'info', tone: 'clearly, with a sense of the bigger picture',
    vo: 'Here is the one rule all of Taleemabad follows, on a single page.',
    info: { tpl: 'lfImage', data: { src: 'img/goal-page.png', size: [1158, 689], region: [0, 0, 1158, 689], tag: 'Same rule as all of Taleemabad' } } },
  { id: '03', mode: 'info', tone: 'slowly, letting the headline land',
    vo: 'A goal is a number we want to move; the work is our bet on how to move it.',
    info: { tpl: 'lfImage', data: { src: 'img/goal-page.png', size: [1158, 689], region: [56, 82, 708, 104], tag: 'A goal is a number we want to move' } } },
  { id: '04', mode: 'info', tone: 'plainly, a simple example',
    vo: 'A task, like building a new welcome page, says what we will do, not whether it helped.',
    info: { tpl: 'lfImage', data: { src: 'img/goal-page.png', size: [1158, 689], region: [60, 180, 1008, 134], mark: [68, 189, 490, 119], tag: 'A task: what we will do' } } },
  { id: '05', mode: 'info', tone: 'brighter, slowing on the key words',
    vo: 'A hypothesis is a goal with a bet: it names the number, the reason, and when we would admit we were wrong.',
    info: { tpl: 'lfImage', data: { src: 'img/goal-page.png', size: [1158, 689], region: [60, 180, 1008, 134], mark: [570, 189, 490, 119], tag: 'A hypothesis: a goal with a bet' } } },
  { id: '06', mode: 'info', tone: 'steadily, counting through them',
    vo: 'Then every bet answers eight short questions, from "which number?" to "when were we wrong?"',
    info: { tpl: 'lfImage', data: { src: 'img/goal-page.png', size: [1158, 689], region: [60, 326, 1008, 174], tag: 'Every bet answers 8 short questions' } } },
  { id: '07', mode: 'info', tone: 'pointing to two of them, focused',
    vo: 'This video covers two of them: which number, and from where to where, by when.',
    info: { tpl: 'lfQuestions', data: { title: 'Every bet answers 8 short questions', items: EIGHT, active: [0, 6] } } },
  { id: '08', mode: 'info', tone: 'clearly, defining a term',
    vo: 'First, the metric: a number already in the RDF, your region\'s data report.',
    info: { tpl: 'lfModel', data: { ...NUMBER, active: 0, note: 'A number already in the RDF' } } },
  { id: '09', mode: 'info', tone: 'firmly, a rule worth remembering',
    vo: 'It is always a share or a rate, never a raw count.',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'A raw count', bg: 'cream', bubble: 'Number of observations', dim: true },
      right: { title: 'A rate', bg: 'teal', bubble: 'Observations per CC per school day' },
      focus: 'right' } } },
  { id: '10', mode: 'info', tone: 'steadily, one piece at a time',
    vo: 'From is where the number starts on the Scoreboard; to is the target you aim for.',
    info: { tpl: 'lfModel', data: { ...NUMBER, active: [1, 2], note: 'From: where it starts · To: the target' } } },
  { id: '11', mode: 'info', tone: 'clearly, landing the date',
    vo: 'By when is the week 2 average, which will be read on Thursday the 22nd.',
    info: { tpl: 'lfModel', data: { ...NUMBER, active: 3, note: 'By when: the week 2 average' } } },
  { id: '12', mode: 'info', tone: 'warmly, a small relief',
    vo: 'Then small steps: one or two bets per number each sprint; a lost bet still teaches.',
    info: { tpl: 'lfImage', data: { src: 'img/goal-page.png', size: [1158, 689], region: [60, 505, 1008, 96], mark: [80, 541, 300, 24], tag: 'Small steps' } } },
  { id: '13', mode: 'info', tone: 'firmly but kindly, a line we never cross',
    vo: 'And no pushing: if a number rises, it should be because Rumi got more useful.',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'We never', bg: 'cream', bubble: 'Tell teachers to "give usage".', dim: true },
      right: { title: 'We always', bg: 'teal', bubble: 'Ask: what is your pain? What do you need?' },
      focus: 'right' } } },


  // ── your own rows ─────────────────────────────────────────────────────────
  { id: '14', mode: 'info', tone: 'turning to the viewer, with energy',
    vo: 'Now let\'s try it on your own Sprint 06 rows.',
    info: { tpl: 'lfTitle', data: { bg: 'teal', text: 'Your Rows', sub: 'Moawin · Sprint 06', shapes: 'dots' } } },
  { id: '15', mode: 'info', tone: 'looking ahead, matter-of-fact',
    vo: 'On Thursday the 22nd of October, your rows will get their first verdicts at the retro.',
    info: { tpl: 'lfModel', data: { title: 'Coming up: retro, Thu 22 Oct', letters: ['✓', '✗', '↪', '–'],
      words: ['Achieved', 'Null', 'Carry on', 'Dropped'], active: -1 } } },
  { id: '16', mode: 'info', tone: 'reading it out plainly, no judgement',
    vo: 'Take MOA-8: it asks CCs for a weekly visit schedule, to get better engagement.',
    info: { tpl: 'lfRow', data: { id: 'MOA-8', goal: 'Human observations', field: 'Hypothesis in one line', text: MOA8_LINE } } },
  { id: '17', mode: 'info', tone: 'clearly and kindly',
    vo: 'That is a task, so the retro will have no number to read it against.',
    info: { tpl: 'lfRow', data: { id: 'MOA-8', goal: 'Human observations', field: 'Hypothesis in one line', text: MOA8_LINE, stamp: 'TASK' } } },
  { id: '18', mode: 'checkpoint', quiz: { ...QUIZ } },
  { id: '19', mode: 'info', tone: 'reassuring, warm and unhurried',
    vo: 'If your rows read like this, that is normal; tasks still plan the work.',
    info: { tpl: 'lfTalk', data: { bg: 'cream', speaker: 'b', bubble: 'Keep the task. Add the bet.' } } },
  { id: '20', mode: 'info', tone: 'with satisfaction, the pieces clicking together',
    vo: 'MOA-8\'s real number: observations per CC per school day, 1.67 to 2.00 by the week 2 average.',
    info: { tpl: 'lfNumber', data: { metric: 'Observations per CC per school day', from: '1.67 (Scoreboard start)', to: '2.00', by: 'Thu 22 Oct' } } },
  { id: '21', mode: 'info', tone: 'honestly, without alarm',
    vo: 'Week 1 read 1.41, so you can already see how far it is from 2.00.',
    info: { tpl: 'lfNumber', data: { metric: 'Observations per CC per school day', to: '2.00', now: '1.41 (week 1)', gap: '0.59 to go' } } },
  { id: '22', mode: 'info', tone: 'brighter, showing a good example',
    vo: 'MOA-9 is already a real bet: it even names the result that would prove it wrong.',
    info: { tpl: 'lfRow', data: { id: 'MOA-9', goal: 'Human observations', field: 'Null if',
      text: 'They stay at or below their Sprint 05 rate.', stamp: 'A REAL BET' } } },
  { id: '23', mode: 'info', tone: 'gently pointing out the gap',
    vo: 'MOA-7 has 46.3% to 47.0% in its goal, but its one line only says "improvement".',
    info: { tpl: 'lfRow', data: { id: 'MOA-7', goal: 'Coaching score · 46.3% → 47.0%', field: 'Hypothesis in one line', text: MOA7_LINE } } },
  { id: '24', mode: 'info', tone: 'thoughtfully, a twist that sets up what comes next',
    vo: 'And week 1 already read 49.1%, past its target; without a reason and a test, nobody can tell why.',
    info: { tpl: 'lfNumber', data: { metric: 'Average HOTS coaching score', from: '46.3%', to: '47.0%', now: '49.1% (week 1)' } } },

  // ── close ─────────────────────────────────────────────────────────────────
  { id: '25', mode: 'info', tone: 'warmly and with energy, a confident close',
    vo: 'So: a goal is a number to move, and your work becomes a bet when it names that number.',
    info: { tpl: 'lfRecap', data: { items: ['A goal is a number to move', 'Work is a bet once it names its number', 'Metric · from · to · by when'] } } },
  { id: '26', mode: 'info', tone: 'inviting, a friendly nudge',
    vo: 'Now pick one task-shaped row in your section, and write its number line.',
    info: { tpl: 'lfTalk', data: { bg: 'mustard', speaker: 'b', bubble: 'Your turn: one row, one number line.' } } },
];

module.exports.animateIds = [];
