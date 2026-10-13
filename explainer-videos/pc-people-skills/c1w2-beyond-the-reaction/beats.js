'use strict';
/*
 * beats.js — P&C People Skills · Course 1 · Week 2
 * "Look Beyond the Reaction: Understanding Why People Behave the Way They Do"
 *
 * FORMAT: LearnFree-style flat motion graphics (animation/info-lf.*), addressed to "you", a P&C
 * Buddy — no Ali (Aroma's exception for this series). Every skill is taught through a named model
 * AND walked through step by step on real situations (Aroma, 2026-10-07). Facts trace to research.md.
 *
 * Aligned to Aroma's approved outline (2026-10-08):
 *   SLO 1.3 — Interpret a reaction as a signal of an underlying need, without taking it personally.
 *   MODELS: the Iceberg (behaviour above; needs, fears, beliefs below — NOT "Freud's iceberg") ·
 *           SCARF (David Rock, 2008), taught as a practical lens with "as if" wording ·
 *           in the moment: Pause → Probe → Pin → Respond.
 *   WALK-THROUGHS: (1) Certainty — a new joiner snaps at you over a laptop delay ("Am I set up to
 *           succeed?"); (2) Status — a senior employee goes quiet after a restructure announcement
 *           (the issue is status, not the change itself).
 *
 * Beat 16 is the CHECKPOINT: never drawn, never spoken (the quiz is never in the video — guardrail).
 */

const QUIZ = {
  stem: 'A senior employee has gone quiet since a restructure moved their team under a newer manager. What do you do first?',
  options: [
    'Explain the business reasons for the restructure to them again',
    'Ask them privately how the change lands, and ask for their read on the new setup',
    'Leave it for now; they will adjust in a few weeks',
    'Tell them in the team meeting that their role matters as much as ever',
  ],
  answer: 1,
  correctNote: 'Exactly. The quiet is the tip of the iceberg; underneath is status. Asking privately, and '
    + 'asking for their expert read, gives back the standing the change took away.',
  explain: 'The need underneath is status, so you respond to that: ask privately how it lands, and ask for '
    + 'their read on the new setup, which shows their experience still counts. Explaining the business '
    + 'reasons again answers certainty, not status, and can feel like a lecture. Leaving it lets the '
    + 'silence harden into disengagement. Reassuring them in the team meeting puts them on the spot in '
    + 'front of others, which can make the status threat worse, and it tells rather than shows.',
};

module.exports = [
  // ── lead with the answer ──────────────────────────────────────────────────
  { id: '01', mode: 'info', tone: 'calmly, with a knowing warmth',
    vo: 'When someone snaps at you, the reaction is rarely the real story.',
    info: { tpl: 'lfTitle', data: { bg: 'mustard', text: 'Beyond the Reaction', sub: 'why people react the way they do', shapes: 'squares' } } },

  // ── model 1: the iceberg ──────────────────────────────────────────────────
  { id: '02', mode: 'info', tone: 'thoughtfully, painting a picture',
    vo: 'Think of an iceberg: the reaction is only the small tip you can see.',
    info: { tpl: 'lfIceberg', data: { tip: 'The reaction', below: [], reveal: false } } },
  { id: '03', mode: 'info', tone: 'slowly, with gentle insight',
    vo: 'Below the waterline sit the needs, fears and beliefs that really drive it.',
    info: { tpl: 'lfIceberg', data: { tip: 'The reaction', below: ['Needs', 'Fears', 'Beliefs'], reveal: true } } },

  // ── model 2: SCARF ────────────────────────────────────────────────────────
  { id: '04', mode: 'info', tone: 'clearly, introducing a useful tool',
    vo: 'A model called SCARF, from David Rock, helps you name what is underneath.',
    info: { tpl: 'lfModel', data: { title: 'SCARF', letters: ['S', 'C', 'A', 'R', 'F'], words: [], active: -1, credit: 'David Rock, 2008' } } },
  { id: '05', mode: 'info', tone: 'steadily, one idea at a time',
    vo: 'It names five things people protect at work: status, certainty, autonomy, relatedness and fairness.',
    info: { tpl: 'lfModel', data: { title: 'SCARF', letters: ['S', 'C', 'A', 'R', 'F'],
      words: ['Status', 'Certainty', 'Autonomy', 'Relatedness', 'Fairness'], active: -1 } } },
  { id: '06', mode: 'info', tone: 'with recognition, as if naming familiar moments',
    vo: 'Being sidelined hits status, uncertainty hits certainty, and being left out hits relatedness.',
    info: { tpl: 'lfModel', data: { title: 'SCARF', letters: ['S', 'C', 'A', 'R', 'F'],
      words: ['Sidelined', 'Uncertainty', '', 'Left out', ''], active: [0, 1, 3] } } },
  { id: '07', mode: 'info', tone: 'gently, with a note of caution',
    vo: 'When one feels threatened, we react as if under attack, and clear thinking drops.',
    info: { tpl: 'lfIceberg', data: { tip: 'Snap · go quiet · push back', below: ['Threatened need'], reveal: true, alarm: true } } },

  // ── the method ────────────────────────────────────────────────────────────
  { id: '08', mode: 'info', tone: 'confidently, giving a simple plan',
    vo: 'So in the moment, you use four steps: pause, probe, pin and respond.',
    info: { tpl: 'lfModel', data: { title: 'In the moment', letters: ['1', '2', '3', '4'],
      words: ['Pause', 'Probe', 'Pin', 'Respond'], active: -1 } } },

  // ── walk-through 1: the laptop delay (Certainty) ──────────────────────────
  { id: '09', mode: 'info', tone: 'setting the scene, lightly',
    vo: 'Say a new joiner snaps at you because their laptop still has not arrived.',
    info: { tpl: 'lfTalk', data: { bg: 'teal', speaker: 'a', bubble: 'Day three and still no laptop. Brilliant.' } } },
  { id: '10', mode: 'info', tone: 'calmly, steadying the moment',
    vo: 'First, pause, and do not argue with the tip of the iceberg.',
    info: { tpl: 'lfModel', data: { title: 'In the moment', letters: ['1', '2', '3', '4'],
      words: ['Pause', 'Probe', 'Pin', 'Respond'], active: 0 } } },
  { id: '11', mode: 'info', tone: 'curious and kind',
    vo: 'Then probe, gently: what worries you most about the delay?',
    info: { tpl: 'lfTalk', data: { bg: 'cream', speaker: 'b', bubble: 'What worries you most about the delay?' } } },
  { id: '12', mode: 'info', tone: 'quietly, letting the real answer land',
    vo: 'They admit everyone else is working, and they worry they look useless.',
    info: { tpl: 'lfTalk', data: { bg: 'teal', speaker: 'a', bubble: 'Everyone is working. I look like I can\'t do the job.' } } },
  { id: '13', mode: 'info', tone: 'with the satisfaction of a puzzle solved',
    vo: 'Pin it: this is certainty, the question am I set up to succeed?',
    info: { tpl: 'lfModel', data: { title: 'SCARF', letters: ['S', 'C', 'A', 'R', 'F'],
      words: ['', 'Certainty', '', '', ''], active: [1], note: '"Am I set up to succeed?"' } } },
  { id: '14', mode: 'info', tone: 'warmly and practically',
    vo: 'So you respond to that need, with a firm date and a useful plan for today.',
    info: { tpl: 'lfTalk', data: { bg: 'cream', speaker: 'b', bubble: 'It arrives Thursday. Today, you shadow the team lead.' } } },

  // ── walk-through 2: the restructure (Status) ──────────────────────────────
  { id: '15', mode: 'info', tone: 'more seriously, raising the stakes',
    vo: 'Now a senior employee goes quiet after a restructure is announced.',
    info: { tpl: 'lfIceberg', data: { tip: 'Goes quiet in meetings', below: [], reveal: false } } },
  { id: '16', mode: 'checkpoint', quiz: { ...QUIZ } },
  { id: '17', mode: 'info', tone: 'with clarity, naming the need',
    vo: 'Pin it: the change itself is not the issue; their status is.',
    info: { tpl: 'lfModel', data: { title: 'SCARF', letters: ['S', 'C', 'A', 'R', 'F'],
      words: ['Status', '', '', '', ''], active: [0], note: '"Where do I stand now?"' } } },
  { id: '18', mode: 'info', tone: 'warmly, with respect',
    vo: 'So you ask for their read privately, and give their experience a real role.',
    info: { tpl: 'lfTalk', data: { bg: 'cream', speaker: 'b', bubble: 'You know this team best. What would you change in the new setup?' } } },
  { id: '19', mode: 'info', tone: 'firmly but gently',
    vo: 'Understanding the need does not excuse the behaviour; you handle both, the need first.',
    info: { tpl: 'lfVersus', data: { left: 'Excuse', right: 'Understand' } } },
  { id: '20', mode: 'info', tone: 'as quiet, practical advice',
    vo: 'And keep SCARF as your private lens; never tell someone they have a status threat.',
    info: { tpl: 'lfModel', data: { title: 'Your private lens', letters: ['S', 'C', 'A', 'R', 'F'],
      words: ['Status', 'Certainty', 'Autonomy', 'Relatedness', 'Fairness'], active: -1 } } },

  // ── close ─────────────────────────────────────────────────────────────────
  { id: '21', mode: 'info', tone: 'warmly and with energy, a confident close',
    vo: 'So look below the waterline, name the need, and respond to that.',
    info: { tpl: 'lfRecap', data: { items: ['See the iceberg', 'Name the need with SCARF', 'Pause, probe, pin, respond'] } } },
];

module.exports.animateIds = [];
