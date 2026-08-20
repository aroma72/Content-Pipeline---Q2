'use strict';
/*
 * beats.js — "Move The Dial By Evidence" (The Autonomy Dial series, video 04).
 * ONE protagonist (Ali), ONE scenario (a 1-10 dial on the shop wall), ONE move: put a
 * number on the task and raise it only on evidence. One spoken sentence per beat.
 *
 * The 1-10 slider is the module's hero artefact — rendered as the `dial` info template
 * (numbers are crisp HTML, never baked into art). It EVOLVES across beats: value 1 -> 10
 * (range), then 2 -> 6 (earned on 39/40), then 6 -> 4 (a bad week). 39/40 = `gauge`.
 * Interactive: id 12 QUESTION (holdAfter 6s to write), id 23 REVEAL.
 * i2v: 04 (tea with a friend) and 24 (the closing invite).
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const FRIEND = 'a friendly neighbour, an older man with a warm smile and a grey shawl, clearly different from the shopkeeper';
const TEA = 'a small table with two cups of steaming chai';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const DIAL = { 1: 'Asks first', 6: 'Acts, shows you', 10: 'Runs alone' };

module.exports = [
  { id: '01', mode: 'info', vo: 'Do not raise your trust in an AI by feeling. Move it by a number.',
    cap: 'Not by feeling', info: { tpl: 'statement', data: { text: 'Move it by a number.', hi: 'number' } } },
  { id: '02', mode: 'ali', vo: 'Ali knows his helper is doing well, but well is only a feeling.',
    cap: 'Well is only a feeling', art: `${ALI}, one hand wavering uncertainly, a thoughtful but unsure expression, ${HERO}` },
  { id: '03', mode: 'ali', vo: 'Some days he wants to hand it everything. Some days he takes it all back.',
    cap: 'All, then nothing', art: `${ALI}, caught mid-swing between a big open-handed give and a pulled-back guarded pose, torn, ${HERO}` },
  { id: '04', mode: 'scene', vo: 'A friend asks him a simple question over tea.',
    cap: 'A friend asks', art: `${ALI} sitting with ${FRIEND} at ${TEA}, a warm relaxed conversation, gentle afternoon light, ${STYLE}` },
  { id: '05', mode: 'ali', vo: 'How much do you trust it, on a one to ten?',
    cap: 'On a one to ten?', art: `${ALI}, caught off guard by a question, a blank thoughtful look, ${HERO}` },
  { id: '06', mode: 'ali', vo: 'Ali cannot answer, because he never put a number on it.',
    cap: 'He has no number', art: `${ALI}, shrugging with open hands, unable to answer, mildly sheepish, ${HERO}` },
  { id: '07', mode: 'info', vo: 'So he draws a dial from one to ten on the back wall.',
    cap: 'the Autonomy Slider', info: { tpl: 'dial', data: { value: 1, labels: DIAL } } },
  { id: '08', mode: 'info', vo: 'At one, the helper asks him before every single action.',
    cap: 'One · asks first', info: { tpl: 'dial', data: { value: 1, labels: DIAL } } },
  { id: '09', mode: 'ali', vo: 'At six, it acts alone inside the rule and shows him after.',
    cap: 'Six · acts, shows you', art: `${ALI}, gesturing to an imagined middle point with a steady explaining hand, ${HERO}` },
  { id: '10', mode: 'info', vo: 'At ten, it runs the whole task and he only watches.',
    cap: 'Ten · runs alone', info: { tpl: 'dial', data: { value: 10, labels: DIAL } } },
  { id: '11', mode: 'info', vo: 'His refund task sits at two today, so he marks it there.',
    cap: 'Refund task · 2', info: { tpl: 'dial', data: { value: 2, labels: DIAL } } },
  { id: '12', mode: 'info', holdAfter: 6, vo: 'After a strong week, where should Ali move the dial? Write your answer down.',
    cap: 'Your turn — write it down', info: { tpl: 'quiz', data: {
      stem: 'After a strong week, where should Ali move the dial?',
      options: ['All the way to 10', 'Up to 6', 'Keep it at 2', 'Down to 0'],
      note: 'Write your answer down.' } } },
  { id: '13', mode: 'ali', vo: 'Then he does the thing a feeling cannot do. He counts.',
    cap: 'He counts', art: `${ALI}, counting carefully on the fingers of one raised hand, focused and methodical, his whole upper body and both shoulders fully visible with nothing covering his body, ${HERO}` },
  { id: '14', mode: 'info', vo: 'Last week the helper handled forty refunds. Thirty nine were right.',
    cap: '39 of 40', info: { tpl: 'gauge', data: { label: 'Refunds correct last week', value: 39, max: 40, good: '39 of 40' } } },
  { id: '15', mode: 'ali', vo: 'One number, not a mood, and it earns the helper a notch.',
    cap: 'It earns a notch', art: `${ALI}, giving a small approving nod, earned quiet confidence, ${HERO}` },
  { id: '16', mode: 'info', vo: 'Ali slides the refund task from two up to six.',
    cap: 'Slides 2 up to 6', info: { tpl: 'dial', data: { value: 6, labels: DIAL } } },
  { id: '17', mode: 'ali', vo: 'Now it clears small refunds alone, and he reads the log each evening.',
    cap: 'Reads the log', art: `${ALI}, calmly reading a small completely blank sheet of paper held up in one hand out to the side well away from his torso, his whole body and both shoulders fully visible and not covered by the paper, the sheet blank with no lines no grid no writing, attentive, ${HERO}` },
  { id: '18', mode: 'ali', vo: 'A week later it misreads an order and refunds twice by mistake.',
    cap: 'A mistake', art: `${ALI}, noticing a mistake with a concerned frown, one eyebrow raised, ${HERO}` },
  { id: '19', mode: 'info', vo: 'So the dial moves the other way, back to four for a while.',
    cap: 'Back to 4', info: { tpl: 'dial', data: { value: 4, labels: DIAL } } },
  { id: '20', mode: 'info', vo: 'The number climbs on a good week and drops on a bad one.',
    cap: 'It moves both ways', info: { tpl: 'statement', data: { text: 'Up on a good week, down on a bad one.', hi: 'down' } } },
  { id: '21', mode: 'ali', vo: 'Six is as high as this task will ever go, and that is fine.',
    cap: 'Six is the ceiling', art: `${ALI}, a calm accepting expression, content and settled, ${HERO}` },
  { id: '22', mode: 'ali', vo: 'Higher was never the goal. The right level was.',
    cap: 'The right level', art: `${ALI}, a wise calm smile, at peace, ${HERO}` },
  { id: '23', mode: 'info', vo: 'The answer is up to six, never to the top, and only on evidence.',
    cap: 'The answer', info: { tpl: 'quiz', data: {
      stem: 'The answer',
      options: ['All the way to 10', 'Up to 6', 'Keep it at 2', 'Down to 0'],
      answer: 1, note: 'Raise it on evidence, never to the top.' } } },
  { id: '24', mode: 'ali', vo: 'Your turn. Put a number, one to ten, on one AI task today.',
    cap: 'Put a number on one task', art: `${ALI}, facing the viewer with a warm inviting open-handed gesture, encouraging, ${HERO}` },
  { id: '25', mode: 'info', vo: 'Then tell Claude, act alone on this only up to level six, and log every action.',
    cap: 'the prompt', info: { tpl: 'promptcard', data: { app: 'Claude', text: 'Act alone on this only up to level six, and log every action.' } } },
  { id: '26', mode: 'ali', vo: 'A number you can move beats a feeling you cannot.',
    cap: 'A number beats a feeling', art: `${ALI}, facing the viewer with a confident reassuring smile and a small nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ['04', '24']; // tea with a friend + the closing invite
