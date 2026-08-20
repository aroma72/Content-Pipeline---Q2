'use strict';
/*
 * beats.js — "Why the Harness Is the Real Product" (The Harness series, video 03).
 * CONTINUES V1/V2: same locked Ali (art/_ref.png), shop + AI helper, glowing honey ORB = brain,
 * room of objects = harness. ONE concept: the ROOM, not a smarter brain, is the thing worth
 * building — because (1) same brain + better room → better results, (2) one room powers many
 * windows, (3) all your rules live in one place. Does NOT overlap evals or autonomy.
 *
 * Teaching spine (research.md): controlled swap (same brain, better room → leaps) + reuse (one
 * room, many windows). Centerpiece proof: a real team changed only the room and jumped 30th→5th.
 * CAMERA-PAN build: stills + Ken Burns / cutout-puppet only — NO i2v clips. No baked text.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const DESK = 'sitting at a tidy small wooden desk with an open laptop';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const ORB = 'a soft glowing rounded orb of warm honey light representing the AI brain, friendly and simple';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'The thing worth building is not a smarter brain; it is a better room.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Build the room, not a smarter brain.', hi: 'room' } } },

  { id: '02', mode: 'ali',
    vo: 'Ali keeps hearing there is always a newer, smarter model out there.',
    cap: 'A newer model',
    art: `${ALI}, standing with a slightly overwhelmed thoughtful look, hand near his chin, ${HERO}` },

  { id: '03', mode: 'ali',
    vo: 'So he wonders if a better helper really means a smarter brain.',
    cap: 'A better brain?',
    art: `${ALI}, standing with a curious wondering expression, one eyebrow raised, ${HERO}` },

  { id: '04', mode: 'info',
    vo: 'But he tries something else first: same brain, better room.',
    cap: 'Same brain, better room',
    info: { tpl: 'statement', data: { text: 'Same brain. Better room.', hi: 'Better room' } } },

  { id: '05', mode: 'scene',
    vo: 'He keeps the very same helper and only improves the room around it.',
    cap: 'He upgrades the room',
    art: `${ALI} ${DESK}, calmly arranging better notes, a small rulebook and one extra tool neatly around ${ORB}, focused and purposeful, ${STYLE}` },

  { id: '06', mode: 'info',
    vo: 'One real team did exactly this, and changed only the room, not the model.',
    cap: 'Only the room changed',
    info: { tpl: 'statement', data: { text: 'They changed only the room.', hi: 'only the room', sub: 'The model stayed the same.' } } },

  { id: '07', mode: 'info',
    vo: 'Their helper leapt from near the bottom of the pack to near the top.',
    cap: 'Bottom to top',
    info: { tpl: 'bignum', data: {
      left: { big: '30', lab: 'place before' }, sep: '→',
      right: { big: '5', lab: 'place after', tone: 'good' } } } },

  { id: '08', mode: 'ali',
    vo: 'Same model, and yet a completely different helper.',
    cap: 'Same model, new helper',
    art: `${ALI}, standing with a surprised delighted expression, eyebrows up, a small amazed smile, ${HERO}` },

  { id: '09', mode: 'info',
    vo: 'The brain sets the ceiling; the room decides how close you get to it.',
    cap: 'The room reaches the ceiling',
    info: { tpl: 'statement', data: { text: 'The brain sets the ceiling; the room reaches it.', hi: 'the room' } } },

  { id: '26', mode: 'info', holdAfter: 6,
    vo: 'Quick question: that team leapt from thirtieth to fifth, so what did they change?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'A team leapt from 30th to 5th place. What did they change?',
      options: ['They bought a smarter model', 'They changed only the room (the harness)', 'They hired more people', 'They made the app prettier'],
      note: 'Write your answer down.' } } },

  { id: '27', mode: 'info',
    vo: 'Only the room; the model stayed exactly the same.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'What did they change?',
      options: ['They bought a smarter model', 'They changed only the room (the harness)', 'They hired more people', 'They made the app prettier'],
      answer: 1, note: 'Same model — the harness did it.' } } },

  { id: '10', mode: 'ali',
    vo: 'So Ali stops shopping for brains and starts improving his room.',
    cap: 'He builds the room',
    art: `${ALI}, standing and rolling up his sleeves with a purposeful, determined look, ${HERO}` },

  { id: '11', mode: 'info',
    vo: 'There is a second reason the room is the real prize.',
    cap: 'One room, many windows',
    info: { tpl: 'statement', data: { text: 'One room, many windows.', hi: 'many windows' } } },

  { id: '12', mode: 'scene',
    vo: 'He built the one room once, and now reaches it three different ways.',
    cap: 'Built once',
    art: `${ALI} standing beside one warm glowing room containing ${ORB}, with three simple openings around it, a shop counter, a phone, and a laptop, ${STYLE}` },

  { id: '13', mode: 'ali',
    vo: 'From the shop counter, from his phone, and from his website.',
    cap: 'Three windows',
    art: `${ALI}, standing and gesturing openly to three imagined points with a pleased confident smile, ${HERO}` },

  { id: '14', mode: 'info',
    vo: 'Change the window anytime; the one room does the work behind them all.',
    cap: 'One room behind all',
    info: { tpl: 'statement', data: { text: 'One room behind every window.', hi: 'One room' } } },

  { id: '15', mode: 'info',
    vo: 'And a third reason: every rule he sets lives in that one room.',
    cap: 'Rules in one place',
    info: { tpl: 'statement', data: { text: 'Your rules live in one place.', hi: 'one place' } } },

  { id: '16', mode: 'ali',
    vo: 'So he fixes a rule once, and every window obeys it.',
    cap: 'Fix once, obeyed everywhere',
    art: `${ALI}, standing with a satisfied confident nod, one hand giving a small decisive gesture, ${HERO}` },

  { id: '17', mode: 'info',
    vo: 'And a room he can open up and change is a room he can keep improving.',
    cap: 'A room you can change',
    info: { tpl: 'statement', data: { text: 'A room you cannot change is not yours to build on.', hi: 'change' } } },

  { id: '18', mode: 'info',
    vo: 'The model is rented; the room is the part you own and grow.',
    cap: 'You own the room',
    info: { tpl: 'statement', data: { text: 'You own the room.', hi: 'own', sub: 'The model, you just rent.' } } },

  { id: '19', mode: 'ali',
    vo: 'That is good news: the most valuable part is the part you control.',
    cap: 'You control it',
    art: `${ALI}, facing the viewer with a warm reassured smile and a small confident nod, ${HERO}` },

  { id: '20', mode: 'info',
    vo: 'Better results, many windows, and one place for rules — all from the room.',
    cap: 'Why the room wins',
    info: { tpl: 'screen', data: { title: 'Why the room wins', lines: [
      { k: 'Better results', v: 'same brain' }, { k: 'Many windows', v: 'one room' },
      { k: 'One place for rules', v: 'fix once' } ] } } },

  { id: '21', mode: 'ali',
    vo: 'So when Ali wants a better helper, he asks a better question.',
    cap: 'A better question',
    art: `${ALI}, standing with a thoughtful knowing smile, a finger raised as if realising something, ${HERO}` },

  { id: '22', mode: 'info',
    vo: 'Not which brain is smartest, but how good is my room.',
    cap: 'How good is my room?',
    info: { tpl: 'statement', data: { text: 'How good is my room?', hi: 'my room' } } },

  { id: '23', mode: 'ali',
    vo: 'Your turn: name one thing in your room you could make better this week.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '24', mode: 'info',
    vo: 'Ask yourself this: what could I improve without changing the model at all?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'What could I improve in my setup without changing the model?' } } },

  { id: '25', mode: 'ali',
    vo: 'The brain sets the limit; the room is how you reach it.',
    cap: 'The room reaches it',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["05","12","25"]; // i2v story beats (house rule: use-animations)
