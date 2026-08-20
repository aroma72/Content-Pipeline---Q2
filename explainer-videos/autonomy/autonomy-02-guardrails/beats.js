'use strict';
/*
 * beats.js — "The Rule That Lets Go" (The Autonomy Dial series, video 02).
 * ONE protagonist (Ali), ONE scenario (his shop's refund rule), ONE move: write one
 * rule so the helper can act without asking every time. One spoken sentence per beat.
 *
 * Modes: ali = Ali alone (cutout). scene = multi-subject / place (mountain road, counter
 * with a customer + robot helper). info = crisp HTML card.
 * Interactive: id 07 QUESTION (quiz), id 21 REVEAL (quiz, answer highlighted).
 * Distinct customers (NOT Ali-lookalikes) in the counter scenes.
 * i2v (motion policy): 08 (van on the bend), 13 & 14 (counter payoff). Fallback to pan.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const SHOP = 'a small tidy neighbourhood general store with a wooden front counter, shelves of ' +
  'colourful goods behind, and a cash till on the counter';
const HELPER = 'a small friendly rounded robot assistant, white and teal, with a gentle glowing ' +
  'screen face and stubby arms';
const WOMAN = 'an older woman customer in a bright orange shawl, clearly different from the shopkeeper';
const MAN = 'a male customer with a short grey beard in a green kurta, clearly different from the shopkeeper';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  { id: '01', mode: 'info', vo: 'A good rule is not a cage. It is what lets you walk away.',
    cap: 'Not a cage', info: { tpl: 'statement', data: { text: 'A rule is not a cage.', hi: 'cage' } } },
  { id: '02', mode: 'ali', vo: 'Ali set his helper low, so it asks before every refund.',
    cap: 'Asks before everything', art: `${ALI}, tapping approve on a small floating screen icon beside him, mildly tethered and busy expression, ${HERO}` },
  { id: '03', mode: 'ali', vo: 'All morning he leaves the shelves to approve fifty here, two hundred there.',
    cap: 'Interrupted all morning', art: `${ALI}, turning back with a slightly weary look to tap a small floating approve icon, a little interrupted, ${HERO}` },
  { id: '04', mode: 'ali', vo: 'By lunch he has approved thirty refunds and done none of his own work.',
    cap: 'No work of his own done', art: `${ALI}, looking tired and unproductive with slightly slumped shoulders, a small floating stack of approval icons beside him, ${HERO}` },
  { id: '05', mode: 'ali', vo: 'He thinks any rule would just make the helper do less.',
    cap: 'A rule means less?', art: `${ALI}, looking doubtful and skeptical, one eyebrow raised, arms loosely crossed, ${HERO}` },
  { id: '06', mode: 'ali', vo: 'So he writes none, and stays chained to the counter.',
    cap: 'Chained to the counter', art: `${ALI}, looking stuck and resigned, standing in place with a slightly defeated posture, ${HERO}` },
  { id: '07', mode: 'info', holdAfter: 6, vo: 'Ali approves every refund himself all morning. What frees him? Write your answer down.',
    cap: 'Your turn — write it down', info: { tpl: 'quiz', data: {
      stem: 'Ali approves every refund himself. What would free him?',
      options: ['Write one rule the helper follows', 'Hire another person', 'Stop giving refunds', 'Check each one faster'],
      note: 'Write your answer down.' } } },
  { id: '08', mode: 'scene', vo: 'But a rule is like the barrier on a mountain road.',
    cap: 'Like a mountain-road barrier', art: `A winding mountain road with a sturdy roadside safety barrier on a bend, a small delivery van approaching the curve, warm daylight, distant hills, ${STYLE}` },
  { id: '09', mode: 'scene', vo: 'The barrier is the reason you can take the bend at speed.',
    cap: 'The rail lets you go fast', art: `A small delivery van confidently rounding a mountain bend beside a protective roadside barrier, sense of safe confidence, warm light, ${STYLE}` },
  { id: '10', mode: 'ali', vo: 'So Ali stops, and writes his helper one line instead.',
    cap: 'He writes one line', art: `${ALI}, determined and calm, writing a single line on a small card with a pen, focused and purposeful, ${HERO}` },
  { id: '11', mode: 'info', vo: 'Refunds under five hundred, go ahead. Five hundred or more, ask Ali.',
    cap: 'the rule', info: { tpl: 'statement', data: { text: 'Under 500, go ahead.', sub: '500 or more, ask Ali.', hi: '500' } } },
  { id: '12', mode: 'scene', vo: 'A customer wants two hundred back for a torn bag.',
    cap: 'A small refund', art: `${WOMAN} standing at the counter of ${SHOP} holding a torn cloth bag and asking for a refund, ${HELPER} attending politely, ${STYLE}` },
  { id: '13', mode: 'scene', vo: 'The helper checks the rule, refunds it, and logs it. Ali never looks up.',
    cap: 'Handled without him', art: `${HELPER} at the counter of ${SHOP} handing a small refund to ${WOMAN} and logging it, while ${ALI} restocks a shelf behind without looking up, ${STYLE}` },
  { id: '14', mode: 'scene', vo: 'Another wants three thousand, and the helper stops and asks him.',
    cap: 'Big one — it asks', art: `${MAN} at the counter of ${SHOP} asking for a large refund, ${HELPER} raising a hand to pause and turning to ask ${ALI} who stands nearby, ${STYLE}` },
  { id: '15', mode: 'scene', vo: 'For the first time all day, Ali is restocking while refunds still happen.',
    cap: 'Free to do his work', art: `${ALI} calmly restocking colourful goods on the shelves of ${SHOP}, ${HELPER} working at the counter behind him, relaxed and productive, ${STYLE}` },
  { id: '16', mode: 'info', vo: 'One rule turned ask me every time into go ahead.',
    cap: 'ask me → go ahead', info: { tpl: 'statement', data: { text: '"Ask me" became "go ahead".', hi: 'go ahead' } } },
  { id: '17', mode: 'ali', vo: 'The rule did not weaken the helper. It let Ali step back.',
    cap: 'It let him step back', art: `${ALI}, calmly taking a relaxed step back with an open posture and a gentle confident smile, ${HERO}` },
  { id: '18', mode: 'info', vo: 'Rules like this come in three kinds, so you cover each one.',
    cap: 'three kinds', info: { tpl: 'statement', data: { text: 'Three kinds of rule.', hi: 'Three' } } },
  { id: '19', mode: 'info', vo: 'What it may touch. When it must stop and ask. What it must refuse.',
    cap: 'permissions · checkpoint · input', info: { tpl: 'checks', data: {
      title: 'Cover each one', items: ['What it may touch', 'When it must stop and ask', 'What it must refuse'] } } },
  { id: '20', mode: 'ali', vo: 'Ali needed only the first two today, and that was enough.',
    cap: 'Two was enough', art: `${ALI}, giving a small satisfied nod, calm and assured, ${HERO}` },
  { id: '21', mode: 'info', vo: 'The answer is one rule, because a rule is what lets him step back.',
    cap: 'The answer', info: { tpl: 'quiz', data: {
      stem: 'The answer',
      options: ['Write one rule the helper follows', 'Hire another person', 'Stop giving refunds', 'Check each one faster'],
      answer: 0, note: 'One rule lets him step back.' } } },
  { id: '22', mode: 'ali', vo: 'Your turn. Take one thing your AI keeps asking you to approve.',
    cap: 'Pick one approval', art: `${ALI}, facing the viewer with a warm inviting open-handed gesture, encouraging, ${HERO}` },
  { id: '23', mode: 'info', vo: 'Write the line. Under this limit, go ahead. Over it, come to me.',
    cap: 'write the line', info: { tpl: 'statement', data: { text: 'Under this limit, go ahead.', sub: 'Over it, come to me.' } } },
  { id: '24', mode: 'ali', vo: 'One rule, and you get your afternoon back.',
    cap: 'Your afternoon back', art: `${ALI}, relaxed and happy with hands resting easily, a satisfied smile, at ease, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ['08', '13', '14']; // van on the bend + the two counter payoff beats
