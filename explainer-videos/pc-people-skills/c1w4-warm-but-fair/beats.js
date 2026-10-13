'use strict';
/*
 * beats.js — P&C People Skills · Course 1 · Week 4
 * "Warm but Fair: Responding with Empathy and Objectivity"
 *
 * FORMAT: LearnFree-style flat motion graphics (animation/info-lf.*), addressed to "you", a P&C
 * Buddy — no Ali (Aroma's exception). Named models + step-by-step walk-throughs (Aroma, 2026-10-07).
 *
 * MODELS (per research.md): empathy vs sympathy (Brené Brown, after Theresa Wiseman 1996 — "at
 * least…" is the sympathy tell); the Ladder of Inference (Chris Argyris; popularised in Senge et al.,
 * The Fifth Discipline Fieldbook, 1994) — shown as 4 rungs on screen: what happened → what it means →
 * conclusion → action; GROW (Alexander, Fine & Whitmore, late 1980s; Whitmore 1992) — Goal, Reality,
 * Options, Way forward.
 * WALK-THROUGHS: (1) "always late and doesn't care" climbed down to the facts; (2) an employee whose
 * parent is in hospital, supported with GROW and without over-promising.
 * SLO 1.6.
 *
 * Beat 14 is the CHECKPOINT: never drawn, never spoken (guardrail: the quiz is never in the video).
 */

const QUIZ = {
  stem: 'An employee whose parent is in hospital asks you to guarantee them two weeks off. What do you say?',
  options: [
    '"Done. I\'ll make sure you get the two weeks."',
    '"Leave isn\'t my department, you\'ll need to ask your manager."',
    '"Let\'s look at the options together, and I\'ll help you ask your manager today."',
    '"At least it\'s only two weeks you need."',
  ],
  answer: 2,
  correctNote: 'Exactly. You stay warm and on their side of the problem, while being honest that the '
    + 'decision sits with their manager. Helping them ask today is support you can actually deliver.',
  explain: 'The fair and warm answer is to explore the options together and help them ask their manager '
    + 'today. Promising the two weeks feels kind, but leave is the manager\'s decision, so it is a '
    + 'promise you may not be able to keep, and it is unfair to others who follow the process. Sending '
    + 'them off to their manager is accurate but cold: it leaves them alone at a hard moment. "At least…" '
    + 'is sympathy, not empathy; it shrinks what they are going through.',
};

module.exports = [
  { id: '01', mode: 'info', tone: 'calmly, with warm conviction',
    vo: 'You can be warm with someone and still be completely fair.',
    info: { tpl: 'lfTitle', data: { bg: 'mustard', text: 'Warm but Fair', sub: 'empathy that stays objective', shapes: 'squares' } } },

  // ── empathy vs sympathy ───────────────────────────────────────────────────
  { id: '02', mode: 'info', tone: 'clearly, drawing an important line',
    vo: 'Empathy means understanding their feelings; it does not mean agreeing with their version of events.',
    info: { tpl: 'lfVersus', data: { left: 'Agree', right: 'Understand' } } },
  { id: '03', mode: 'info', tone: 'gently, contrasting two replies',
    vo: 'Sympathy says "at least"; empathy says "that sounds really heavy".',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'Sympathy', bg: 'cream', bubble: 'At least it\'s not serious.', dim: true },
      right: { title: 'Empathy', bg: 'teal', bubble: 'That sounds really heavy.' },
      focus: 'right' } } },

  // ── model 1: the Ladder of Inference ──────────────────────────────────────
  { id: '04', mode: 'info', tone: 'introducing a useful tool, with curiosity',
    vo: 'To stay fair, use the Ladder of Inference, from Chris Argyris.',
    info: { tpl: 'lfLadder', data: { rungs: ['What happened', 'What it means', 'Conclusion', 'Action'], active: -1, credit: 'Chris Argyris' } } },
  { id: '05', mode: 'info', tone: 'a little faster, showing how quickly it happens',
    vo: 'We climb from what happened, to what it means, to a conclusion, to action, in seconds.',
    info: { tpl: 'lfLadder', data: { rungs: ['What happened', 'What it means', 'Conclusion', 'Action'], active: 'up' } } },

  // ── walk-through 1: "always late and doesn't care" ────────────────────────
  { id: '06', mode: 'info', tone: 'setting the scene, matter-of-factly',
    vo: 'Say a team lead tells you a new hire is always late and does not care.',
    info: { tpl: 'lfTalk', data: { bg: 'teal', speaker: 'c', bubble: 'The new hire is always late. They just don\'t care.' } } },
  { id: '07', mode: 'info', tone: 'thoughtfully, with a gentle pause',
    vo: '"Does not care" is the top of the ladder, not the bottom.',
    info: { tpl: 'lfLadder', data: { rungs: ['What happened', 'What it means', 'Conclusion', 'Action'], active: 2, label: '"Doesn\'t care"' } } },
  { id: '08', mode: 'info', tone: 'calmly and curiously',
    vo: 'So you climb down, and ask which days, and what times exactly.',
    info: { tpl: 'lfTalk', data: { bg: 'cream', speaker: 'b', bubble: 'Which days, and what times exactly?' } } },
  { id: '09', mode: 'info', tone: 'precisely, letting the facts speak',
    vo: 'The facts: late three times in two weeks, all Mondays, about twenty minutes.',
    info: { tpl: 'lfLadder', data: { rungs: ['What happened', 'What it means', 'Conclusion', 'Action'], active: 0,
      label: '3 times in 2 weeks · all Mondays · ~20 min' } } },
  { id: '10', mode: 'info', tone: 'warmly, with a small turn of discovery',
    vo: 'You ask the new hire openly, and learn their new van route runs late on Mondays.',
    info: { tpl: 'lfTalk', data: { bg: 'teal', speaker: 'a', bubble: 'My new van route from Rawalpindi runs late on Mondays.' } } },
  { id: '11', mode: 'info', tone: 'with quiet satisfaction',
    vo: 'Same facts, a very different story, and nobody was judged before being heard.',
    info: { tpl: 'lfScale', data: { left: 'The team lead', right: 'The new hire', tilt: 0 } } },

  // ── model 2: GROW ─────────────────────────────────────────────────────────
  { id: '12', mode: 'info', tone: 'introducing a tool, with care',
    vo: 'When someone is struggling, the GROW model helps you support them without rescuing.',
    info: { tpl: 'lfModel', data: { title: 'GROW', letters: ['G', 'R', 'O', 'W'],
      words: ['Goal', 'Reality', 'Options', 'Way forward'], active: -1, credit: 'Whitmore, 1992' } } },

  // ── walk-through 2: a personal crisis ─────────────────────────────────────
  { id: '13', mode: 'info', tone: 'softly, with real empathy',
    vo: 'Say an employee\'s parent is in hospital, and their deadlines are slipping.',
    info: { tpl: 'lfTalk', data: { bg: 'teal', speaker: 'c', bubble: 'My father is in hospital in Lahore. I keep missing deadlines.' } } },
  { id: '14', mode: 'checkpoint', quiz: { ...QUIZ } },
  { id: '15', mode: 'info', tone: 'gently, naming a kind mistake',
    vo: 'The tempting reply is a promise, but leave is their manager\'s decision, not yours.',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'The promise', bg: 'cream', bubble: 'Don\'t worry, I\'ll get you two weeks off.', dim: true },
      right: { title: 'The support', bg: 'teal', bubble: 'That sounds really heavy. Let\'s work out what would help.' },
      focus: 'right' } } },
  { id: '16', mode: 'info', tone: 'warmly and slowly',
    vo: 'Goal: you ask what matters most to them this month.',
    info: { tpl: 'lfModel', data: { title: 'GROW', letters: ['G', 'R', 'O', 'W'],
      words: ['Goal', 'Reality', 'Options', 'Way forward'], active: 0, note: '"What matters most to you this month?"' } } },
  { id: '17', mode: 'info', tone: 'steadily',
    vo: 'Reality: what is already in place at work, and what have they tried?',
    info: { tpl: 'lfModel', data: { title: 'GROW', letters: ['G', 'R', 'O', 'W'],
      words: ['Goal', 'Reality', 'Options', 'Way forward'], active: 1, note: '"What\'s already in place? What have you tried?"' } } },
  { id: '18', mode: 'info', tone: 'with gentle encouragement',
    vo: 'Options: compassionate leave, a short spell of working from home, or a moved deadline.',
    info: { tpl: 'lfOptions', data: { title: 'Options', bg: 'teal',
      options: ['Compassionate leave', 'Work from home', 'Move a deadline'], chosen: 1 } } },
  { id: '19', mode: 'info', tone: 'warmly and practically, with lift',
    vo: 'Way forward: "Shall we draft the message to your manager together, today?"',
    info: { tpl: 'lfModel', data: { title: 'GROW', letters: ['G', 'R', 'O', 'W'],
      words: ['Goal', 'Reality', 'Options', 'Way forward'], active: 3, note: '"Shall we draft it together, today?"' } } },
  { id: '20', mode: 'info', tone: 'with calm conviction',
    vo: 'Warm in your tone, fair in your process: that is the whole balance.',
    info: { tpl: 'lfScale', data: { left: 'Warm in tone', right: 'Fair in process', tilt: 0 } } },

  { id: '21', mode: 'info', tone: 'warmly and with energy, a confident close',
    vo: 'So show empathy, climb down to the facts, and use GROW instead of promises.',
    info: { tpl: 'lfRecap', data: { items: ['Empathy, not "at least"', 'Climb down to the facts', 'GROW, not promises'] } } },
];

module.exports.animateIds = [];
