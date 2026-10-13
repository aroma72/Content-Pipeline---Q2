'use strict';
/*
 * beats.js — P&C People Skills · Course 1 · Week 3
 * "Listen First, Then Ask: How to Really Hear People"
 *
 * FORMAT: LearnFree-style flat motion graphics (animation/info-lf.*), addressed to "you", a P&C
 * Buddy — no Ali (Aroma's exception). Named models + step-by-step walk-throughs (Aroma, 2026-10-07).
 *
 * Aligned to Aroma's approved outline (2026-10-08):
 *   SLOs 1.4 (active listening), 1.5 (open, probing and clarifying questions).
 *   MODELS: RASA (Julian Treasure, TEDGlobal 2011) — Receive, Appreciate, Summarise, Ask — for
 *           listening; OARS (Motivational Interviewing, Miller & Rollnick) — Open questions,
 *           Affirmations, Reflections, Summaries — for responding; the Question Funnel
 *           (open → probe → close) for the order of questions.
 *   WALK-THROUGHS: (1) "Can we have a quick chat?" — the real issue surfaces after three questions;
 *           (2) the same exit interview run twice: once with leading questions, once with OARS.
 *
 * Beat 15 is the CHECKPOINT: never drawn, never spoken (guardrail: the quiz is never in the video).
 */

const QUIZ = {
  stem: 'A content designer is leaving after two years. In the exit interview, which question will teach you the most?',
  options: [
    'You\'re leaving for a better salary, right?',
    'What made you start looking?',
    'Why didn\'t you raise this with us earlier?',
    'The team was supportive though, wasn\'t it?',
  ],
  answer: 1,
  correctNote: 'Exactly. It is open, so they choose what matters, and it carries no assumption, so '
    + 'you hear the real reason instead of the one you expected.',
  explain: '"What made you start looking?" is open, so the person decides what matters and you hear the '
    + 'real reason. "You\'re leaving for a better salary, right?" and "The team was supportive, wasn\'t '
    + 'it?" are leading questions: they hand over the answer you expect, so you mostly get a polite yes '
    + 'and learn nothing. "Why didn\'t you raise this earlier?" sounds like blame, so people get defensive '
    + 'and say less. If you need the why, ask "what led you to…" instead.',
};

const OARS = ['O', 'A', 'R', 'S'];
const OARS_WORDS = ['Open questions', 'Affirm', 'Reflect', 'Summarise'];

module.exports = [
  { id: '01', mode: 'info', tone: 'calmly, with quiet confidence',
    vo: 'The fastest way to the real problem is to listen before you ask.',
    info: { tpl: 'lfTitle', data: { bg: 'mustard', text: 'Listen First', sub: 'then ask', shapes: 'squares' } } },

  { id: '02', mode: 'info', tone: 'knowingly, with a small smile',
    vo: 'When someone asks for a quick chat, the first thing they say is rarely everything.',
    info: { tpl: 'lfIceberg', data: { tip: '"Can we have a quick chat?"', below: ['The real issue'], reveal: true } } },
  { id: '03', mode: 'info', tone: 'honestly, admitting a common habit',
    vo: 'Our instinct is to fix things fast, and that is exactly what stops them talking.',
    info: { tpl: 'lfVersus', data: { left: 'Fix fast', right: 'Listen first' } } },

  // ── model 1: RASA, for listening ──────────────────────────────────────────
  { id: '04', mode: 'info', tone: 'clearly, introducing a simple tool',
    vo: 'For listening, Julian Treasure\'s RASA gives you four steps: receive, appreciate, summarise, ask.',
    info: { tpl: 'lfModel', data: { title: 'RASA', letters: ['R', 'A', 'S', 'A'],
      words: ['Receive', 'Appreciate', 'Summarise', 'Ask'], active: -1, credit: 'Julian Treasure, 2011' } } },
  { id: '05', mode: 'info', tone: 'gently and slowly',
    vo: 'Receive: put your phone face down, turn towards them, and simply take it in.',
    info: { tpl: 'lfModel', data: { title: 'RASA', letters: ['R', 'A', 'S', 'A'],
      words: ['Receive', 'Appreciate', 'Summarise', 'Ask'], active: 0, note: 'Phone down. Face them.' } } },
  { id: '06', mode: 'info', tone: 'warmly, almost conversational',
    vo: 'Appreciate: small sounds like "hmm" and "go on" show you are with them.',
    info: { tpl: 'lfModel', data: { title: 'RASA', letters: ['R', 'A', 'S', 'A'],
      words: ['Receive', 'Appreciate', 'Summarise', 'Ask'], active: 1, note: '"Hmm… go on."' } } },
  { id: '07', mode: 'info', tone: 'with gentle emphasis on the word so',
    vo: 'Summarise: start with "so", and say back what you heard.',
    info: { tpl: 'lfModel', data: { title: 'RASA', letters: ['R', 'A', 'S', 'A'],
      words: ['Receive', 'Appreciate', 'Summarise', 'Ask'], active: 2, note: '"So what I\'m hearing is…"' } } },
  { id: '08', mode: 'info', tone: 'clearly, setting up the next idea',
    vo: 'Ask comes last, and the question funnel tells you the order.',
    info: { tpl: 'lfModel', data: { title: 'RASA', letters: ['R', 'A', 'S', 'A'],
      words: ['Receive', 'Appreciate', 'Summarise', 'Ask'], active: 3, note: 'Questions come last.' } } },
  { id: '09', mode: 'info', tone: 'steadily, one step at a time',
    vo: 'Start open, then probe what came up, then close to confirm.',
    info: { tpl: 'lfFunnel', data: { steps: ['Open', 'Probe', 'Close'], questions: [] } } },

  // ── walk-through 1: the quick chat ────────────────────────────────────────
  { id: '10', mode: 'info', tone: 'lightly, setting an everyday scene',
    vo: 'Say a field coordinator stops you at the chai station about a confusing travel form.',
    info: { tpl: 'lfTalk', data: { bg: 'teal', speaker: 'a', bubble: 'This new travel form is so confusing.' } } },
  { id: '11', mode: 'info', tone: 'with a wry note, showing the trap',
    vo: 'The fixer explains section B in thirty seconds, and the conversation ends there.',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'The fixer', bg: 'cream', bubble: 'Easy, just fill section B!' },
      right: { title: 'The listener', bg: 'teal', bubble: '', dim: true },
      focus: 'left' } } },
  { id: '12', mode: 'info', tone: 'softly, letting the truth come out',
    vo: 'Instead you receive and appreciate, and they add that their claims are three months late.',
    info: { tpl: 'lfTalk', data: { bg: 'teal', speaker: 'a', bubble: 'It\'s not just the form. My claims are three months late.' } } },
  { id: '13', mode: 'info', tone: 'warmly, with understanding',
    vo: 'You summarise: "So it is not only the form, it is the late payments."',
    info: { tpl: 'lfTalk', data: { bg: 'cream', speaker: 'b', bubble: 'So it\'s not only the form. It\'s the late payments?' } } },
  { id: '14', mode: 'info', tone: 'practically, with momentum',
    vo: 'Then you funnel: what happened, which months, and shall I chase Finance by Thursday?',
    info: { tpl: 'lfFunnel', data: { steps: ['Open', 'Probe', 'Close'],
      questions: ['What\'s been happening with your claims?', 'Which months are pending?', 'Shall I check with Finance by Thursday?'] } } },
  { id: '15', mode: 'checkpoint', quiz: { ...QUIZ } },

  // ── model 2: OARS, for responding ─────────────────────────────────────────
  { id: '16', mode: 'info', tone: 'clearly, introducing the second tool',
    vo: 'For your replies, OARS from Motivational Interviewing gives four moves: open questions, affirmations, reflections and summaries.',
    info: { tpl: 'lfModel', data: { title: 'OARS', letters: OARS, words: OARS_WORDS, active: -1, credit: 'Motivational Interviewing' } } },

  // ── walk-through 2: the exit interview, twice ─────────────────────────────
  { id: '17', mode: 'info', tone: 'with gentle irony',
    vo: 'Run an exit interview with leading questions, and you only get the yes you expected.',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'Leading', bg: 'cream', bubble: 'You\'re leaving for a better salary, right?' },
      right: { title: 'OARS', bg: 'teal', bubble: '', dim: true },
      focus: 'left' } } },
  { id: '18', mode: 'info', tone: 'warmly, starting again',
    vo: 'Run it again with OARS, starting with an open question: what made you start looking?',
    info: { tpl: 'lfModel', data: { title: 'OARS', letters: OARS, words: OARS_WORDS, active: 0, note: '"What made you start looking?"' } } },
  { id: '19', mode: 'info', tone: 'sincerely, as the honest answer arrives',
    vo: 'Now you get the truth: they stopped growing after their lead left.',
    info: { tpl: 'lfTalk', data: { bg: 'teal', speaker: 'c', bubble: 'Honestly, I stopped growing after my lead left.' } } },
  { id: '20', mode: 'info', tone: 'warmly and thoughtfully',
    vo: 'Affirm their honesty, then reflect it back: so growth mattered more than pay.',
    info: { tpl: 'lfModel', data: { title: 'OARS', letters: OARS, words: OARS_WORDS, active: [1, 2],
      note: '"Thank you for being honest. So growth mattered more than pay."' } } },
  { id: '21', mode: 'info', tone: 'steadily, bringing it together',
    vo: 'Summarise what you heard, then ask what would have made them stay.',
    info: { tpl: 'lfModel', data: { title: 'OARS', letters: OARS, words: OARS_WORDS, active: 3,
      note: '"So: growth, a new lead, no plan. What would have made you stay?"' } } },
  { id: '22', mode: 'info', tone: 'as a helpful tip',
    vo: 'And swap "why did you" for "what led you to", so it never sounds like blame.',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'Sounds like blame', bg: 'cream', bubble: 'Why did you do that?', dim: true },
      right: { title: 'Sounds curious', bg: 'teal', bubble: 'What led you to that?' },
      focus: 'right' } } },

  { id: '23', mode: 'info', tone: 'warmly and with energy, a confident close',
    vo: 'So listen with RASA, ask from open to closed, and reply with OARS.',
    info: { tpl: 'lfRecap', data: { items: ['Listen with RASA', 'Open → Probe → Close', 'Reply with OARS'] } } },
];

module.exports.animateIds = [];
