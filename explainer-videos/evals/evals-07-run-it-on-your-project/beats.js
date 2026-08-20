'use strict';
/*
 * beats.js — "Run It On Your Project" (evals series, video 07). Camera-pan build.
 * Same locked Ali (Gemini-seeded). The tutorial: the whole series becomes one loop.
 * ONE move: get your number before you change anything. Varied graphics: a ten-task
 * checklist, a BAR GRAPH used three times as the building number (5 -> 8 / 10), and an
 * eval-harness card that assembles from four parts.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const DESK = 'sitting at a tidy small wooden desk with an open laptop showing a plain blank interface';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  { id: '01', mode: 'info',
    vo: 'Get your number before you change anything.',
    cap: 'The one move',
    info: { tpl: 'statement', data: { text: 'Get your number', hi: 'before', sub: 'before you change anything.' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali wants to make his signup easier, and he has a good idea.',
    cap: 'A good idea',
    art: `${ALI} ${DESK}, leaning back with a bright, inspired expression, an idea striking him, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'His hand is on the keyboard, ready to change the password rules.',
    cap: 'Hand on the keys',
    art: `A close view of ${ALI}'s hand poised just above a laptop keyboard, about to type but not yet touching the keys, tense anticipation, ${STYLE}` },

  { id: '04', mode: 'scene',
    vo: 'Then he stops, because he remembers the crate of mangoes.',
    cap: 'He remembers the crate',
    art: `${ALI} ${DESK} pausing with a thoughtful look, a small wooden crate of ripe orange-yellow mangoes softly visible as a memory beside him, ${STYLE}` },

  { id: '05', mode: 'ali',
    vo: 'He did not find the bad crate by changing supplier; he found it by counting.',
    cap: 'He found it by counting',
    art: `${ALI}, standing and making a small clear counting gesture on his fingers, calm and certain, ${HERO}` },

  { id: '06', mode: 'scene',
    vo: 'So first he writes down ten things a new customer must be able to do.',
    cap: 'Write the ten things',
    art: `${ALI} ${DESK}, writing a list in a notebook with focus and purpose, ${STYLE}` },

  { id: '07', mode: 'info',
    vo: 'A normal number, a number with a space, a used email, a short password, and six more.',
    cap: 'ten benchmark tasks',
    info: { tpl: 'checks', data: { items: [
      'A normal number', 'A number with a space', 'A used email', 'A short password',
      'A blank name', 'A very long name', 'A wrong code', 'An expired code',
      'A slow connection', 'Signing up twice'] } } },

  { id: '08', mode: 'scene',
    vo: 'He runs all ten on the app exactly as it is today.',
    cap: 'Run them on today’s app',
    art: `${ALI} ${DESK}, watching the laptop run a set of checks, attentive and calm, ${STYLE}` },

  { id: '09', mode: 'info',
    vo: 'Five out of ten.',
    cap: 'Today’s number',
    info: { tpl: 'bars', data: { max: 10, suffix: '/ 10', items: [ { label: 'Today', value: 5 } ] } } },

  { id: '10', mode: 'ali',
    vo: 'Now he has today’s real number, written down.',
    cap: 'Written down',
    art: `${ALI}, standing and holding up a small note with a steady, satisfied expression, ${HERO}` },

  { id: '11', mode: 'info',
    vo: 'Five out of ten, Tuesday.',
    cap: 'the baseline',
    info: { tpl: 'bars', data: { max: 10, suffix: '/ 10', items: [ { label: 'Baseline · Tuesday', value: 5 } ] } } },

  { id: '12', mode: 'scene',
    vo: 'Then he makes his change. One change, and nothing else.',
    cap: 'One change only',
    art: `${ALI} ${DESK}, making one deliberate edit with a single finger, careful and precise, ${STYLE}` },

  { id: '13', mode: 'ali',
    vo: 'He wants to fix three other things while he is in there, and he does not.',
    cap: 'Resist the extra fixes',
    art: `${ALI}, standing and holding himself back with a restrained, disciplined expression, one hand raised to stop himself, ${HERO}` },

  { id: '14', mode: 'scene',
    vo: 'He runs the same ten again on the same app.',
    cap: 'Run the same ten again',
    art: `${ALI} ${DESK}, running the checks a second time, calm and methodical, ${STYLE}` },

  { id: '15', mode: 'info',
    vo: 'Five out of ten becomes eight out of ten.',
    cap: 'Baseline → after',
    info: { tpl: 'bars', data: { max: 10, suffix: '/ 10', items: [
      { label: 'Baseline', value: 5 },
      { label: 'After the change', value: 8, tone: 'big' } ] } } },

  { id: '16', mode: 'ali',
    vo: 'Three more customers get in, and Ali knows which change did it.',
    cap: 'He knows which change',
    art: `${ALI}, standing with a confident, pleased smile and a small certain nod, ${HERO}` },

  { id: '17', mode: 'ali',
    vo: 'If he had changed four things, he would not know which one worked.',
    cap: 'Why one change matters',
    art: `${ALI}, standing and holding up four fingers with a cautioning expression, ${HERO}` },

  { id: '18', mode: 'info',
    vo: 'Ten checks. A number. One change. The same ten again.',
    cap: 'eval harness',
    info: { tpl: 'fourparts', data: { parts: ['Ten checks', 'A number', 'One change', 'The same ten again'] } } },

  { id: '19', mode: 'ali',
    vo: 'The two that still fail are named, so tomorrow’s job is already written.',
    cap: 'Tomorrow is written',
    art: `${ALI}, standing and pointing calmly at an imagined short list beside him, ${HERO}` },

  { id: '20', mode: 'scene',
    vo: 'From now on he runs the same ten every time Claude changes the app.',
    cap: 'Every time, the same ten',
    art: `${ALI} ${DESK}, relaxed and in a steady routine at the laptop, ${STYLE}` },

  { id: '21', mode: 'ali',
    vo: 'It takes four minutes, and it is why he sleeps on Friday.',
    cap: 'Four minutes, sound sleep',
    art: `${ALI}, standing calm and at ease with a peaceful, relaxed smile, ${HERO}` },

  { id: '22', mode: 'ali',
    vo: 'One warning, for the day everything passes.',
    cap: 'One warning',
    art: `${ALI}, standing and raising one finger with a gentle cautioning expression, ${HERO}` },

  { id: '23', mode: 'ali',
    vo: 'Ten out of ten does not mean the app is perfect; it means the checks got easy.',
    cap: 'Easy checks, not perfect',
    art: `${ALI}, standing with an open, honest explaining gesture, ${HERO}` },

  { id: '24', mode: 'scene',
    vo: 'So Ali adds the last three things customers complained about.',
    cap: 'Add the hard ones',
    art: `${ALI} ${DESK}, adding new lines to his checklist in the notebook, thoughtful, ${STYLE}` },

  { id: '25', mode: 'ali',
    vo: 'Your turn: write ten things a new user must be able to do.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand on his chest and the other open in a sincere encouraging gesture, ${HERO}` },

  { id: '26', mode: 'info',
    vo: 'Then say this to Claude: run these ten checks and save the score, I will make one change, then run them again and show me both numbers.',
    cap: 'Say this to Claude',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'Run these ten checks and save the score. I will make one change, then run them again and show me both numbers.' } } },

  { id: '27', mode: 'ali',
    vo: 'Two numbers and one change. That is how you know instead of hoping.',
    cap: 'Know instead of hoping',
    art: `${ALI}, facing the viewer with a warm confident smile and a small thumbs up, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
