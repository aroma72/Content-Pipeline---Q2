'use strict';
/*
 * beats.js — "Prove It Got Better" (Self-Healing & Self-Improving series, video 06, finale).
 * V2 REBUILD to the EVALS-GRADE VISUAL STANDARD (§3d) — verified by `node qa-visuals.js`.
 * Same shop, same ledger, same LAPTOP helper. ONE concept: the loop is only real if it is MEASURED,
 * and the failure log is where the measurement comes from. Closes the two gaps Aroma flagged:
 * the LEARNING-FROM-FAILURE DISCIPLINE (four columns, root cause not symptom, every lesson becomes a
 * permanent check) and EVAL DRIVEN improvement (the log becomes 20 test cases; 12/20 -> 18/20).
 * De-duplicated vs the evals series — evals appear only as the scoreboard for the healing loop.
 * No baked text in any art prompt.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const SHOP = 'in Ali\'s small tidy shop, tall wooden shelves of neatly stacked paper parcels and ' +
  'tins behind him, a polished wooden counter in front with a large open paper ledger whose pages ' +
  'show only abstract wavy pen strokes and ruled lines with no readable words or letters, and a small ' +
  'brass desk lamp, a wooden filing drawer at one end of the counter';
const LAPTOP = 'a simple boxy cream-coloured desktop computer monitor sitting on the counter on a ' +
  'small square stand, its screen a blank pale rectangle, a plain old-fashioned unbranded monitor with ' +
  'a smooth empty casing and no logo, badge, sticker or marking anywhere on it';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'Self-improving only counts when it is eval driven — measured, never just felt.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Self-improving has to be eval driven.', hi: 'eval driven' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali tells everyone his helper has got much better this month.',
    cap: 'It got better',
    art: `${ALI} standing behind the counter with a proud pleased smile, one hand resting on ${LAPTOP} and the other open toward the shop doorway, ${SHOP}, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'Then someone asks him how much better, and he has no answer at all.',
    cap: 'How much better?',
    art: `${ALI} standing behind the counter with an uncertain caught-out expression, mouth slightly open, one hand paused mid-gesture above the closed ledger, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '04', mode: 'info',
    vo: 'He believes it improved, but belief is not the same as evidence.',
    cap: 'Belief is not evidence',
    info: { tpl: 'twocard', data: { title: 'What he actually has',
      left: { title: 'A feeling', items: ['It seems better', 'Fewer complaints lately', 'I think it learned'] },
      right: { title: 'Evidence', items: ['A number before', 'A number after', 'The same test both times'] } } } },

  { id: '05', mode: 'scene',
    vo: 'So he starts the one habit that fixes this: a failure log at the back of the ledger.',
    cap: 'Start a failure log',
    art: `${ALI} standing behind the counter opening the ledger to a fresh ruled page at the back and drawing four vertical column lines down it with a pen and ruler, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '06', mode: 'scene',
    vo: 'Every time the helper gets something wrong, he writes down four things.',
    cap: 'Four things, every time',
    art: `${ALI} standing behind the counter writing with a pen across four ruled columns on the open ledger page, leaning in with a careful focused expression, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '07', mode: 'info',
    vo: 'What broke, why it broke, what fixed it, and the lesson it leaves behind.',
    cap: 'The four columns',
    info: { tpl: 'screen', data: { title: 'One line per failure', lines: [
      { k: 'What broke', v: 'the thing that went wrong' }, { k: 'Why', v: 'the root cause, not the symptom' },
      { k: 'The fix', v: 'what you actually changed' }, { k: 'The lesson', v: 'what stops it returning' } ] } } },

  { id: '08', mode: 'ali',
    vo: 'The second column is the one everybody skips, and it is the valuable one.',
    cap: 'Nobody writes the why',
    art: `${ALI}, standing and holding up two fingers with a pointed knowing expression, ${HERO}` },

  { id: '09', mode: 'info',
    vo: 'The symptom is a wrong answer; the cause is that nobody ever told it.',
    cap: 'Symptom versus cause',
    info: { tpl: 'twocard', data: { title: 'The same failure, written two ways',
      left: { title: 'Symptom (useless)', items: ['It hallucinated', 'The answer was bad', 'It got confused'] },
      right: { title: 'Cause (fixable)', items: ['Offered a stopped discount', 'Nobody wrote the rule down', 'Add it to the ledger'] } } } },

  { id: '10', mode: 'scene',
    vo: 'A month of that, and the back of his ledger holds twenty real failures.',
    cap: 'Twenty real failures',
    art: `${ALI} standing behind the counter with both hands resting on a ledger page densely filled with twenty short handwritten rows across four columns, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '11', mode: 'info',
    vo: 'That is the learning-from-failure discipline: a failure you only fix comes back.',
    cap: 'Learning-from-failure discipline',
    info: { tpl: 'tally', data: { rows: [
      { label: 'Only fixed', count: 9, tone: 'bad' },
      { label: 'Fixed and logged', count: 1 } ], caption: 'A fix you do not write down returns' } } },

  { id: '12', mode: 'scene',
    vo: 'Each lesson becomes a test he can run again, written on its own slip.',
    cap: 'Each lesson becomes a test',
    art: `Twenty cream paper slips laid out in four neat rows across the polished counter, ${ALI} behind them placing the last one down, ${LAPTOP} at one end, ${SHOP}, ${STYLE}` },

  { id: '13', mode: 'info',
    vo: 'Twenty cases, and not one invented — every one is a failure that really happened.',
    cap: 'All from real failures',
    info: { tpl: 'grid', data: { title: 'Twenty cases, all from real failures', n: 20, tone: 'good' } } },

  { id: '14', mode: 'scene',
    vo: 'He runs all twenty on the old setup, then all twenty on the new one.',
    cap: 'Same test, both times',
    art: `${ALI} standing behind the counter holding one cream slip up toward ${LAPTOP} while the remaining slips sit in two sorted stacks on the counter, ${SHOP}, ${STYLE}` },

  { id: '15', mode: 'info',
    vo: 'Twelve out of twenty before, eighteen out of twenty after.',
    cap: 'The number',
    info: { tpl: 'bars', data: { title: 'Cases passed, out of twenty', max: 20, suffix: '/20', items: [
      { label: 'Before', value: 12 }, { label: 'After', value: 18, tone: 'big' } ] } } },

  { id: '16', mode: 'ali',
    vo: 'Better is now a number he can show, not a feeling he has to defend.',
    cap: 'A number, not a feeling',
    art: `${ALI}, standing with a confident satisfied smile and a small assured nod, ${HERO}` },

  { id: '17', mode: 'info',
    vo: 'And the two that still fail are not a disappointment; they are the next task.',
    cap: 'The failures are the list',
    info: { tpl: 'gauge', data: { label: 'Cases still failing', value: 2, max: 20, good: 'That is next month\'s to-do list' } } },

  { id: '18', mode: 'info',
    vo: 'That is what eval driven means: fail, log, fix, check, and measure.',
    cap: 'Eval-driven improvement',
    info: { tpl: 'screen', data: { title: 'Eval-driven improvement', lines: [
      { k: 'Fail', v: 'it goes wrong' }, { k: 'Log', v: 'what, why, fix, lesson' },
      { k: 'Fix', v: 'store it where it lives' }, { k: 'Check', v: 'the lesson becomes a case' },
      { k: 'Measure', v: 'run them all, before and after' } ] } } },

  { id: '19', mode: 'info', holdAfter: 6,
    vo: 'Quick question: he says it improved but kept no log — what does he actually have?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'He says it improved, but kept no log. What does he have?',
      options: ['Proof it improved', 'A story he cannot check', 'A self-improving system', 'An eval set'],
      note: 'Write your answer down.' } } },

  { id: '20', mode: 'info',
    vo: 'A story he cannot check, because nothing was written down to compare against.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'What does he have?',
      options: ['Proof it improved', 'A story he cannot check', 'A self-improving system', 'An eval set'],
      answer: 1, note: 'No log, no baseline, no proof.' } } },

  { id: '21', mode: 'ali',
    vo: 'Scoring those cases well is its own craft, and the evals series covers it.',
    cap: 'More on scoring',
    art: `${ALI}, standing and gesturing lightly to one side with an open informative expression, ${HERO}` },

  { id: '22', mode: 'ali',
    vo: 'Your turn: open a failure log today and write the last thing that went wrong.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '23', mode: 'info',
    vo: 'Ask yourself: what broke, why, what fixed it, and what stops it coming back?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'What broke? Why? What fixed it? What stops it coming back?' } } },

  { id: '24', mode: 'ali',
    vo: 'A system that cannot show its score is not improving; it is only hoping.',
    cap: 'Show the score',
    art: `${ALI}, facing the viewer with a warm confident smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["12","14","05"]; // i2v story beats — physical actions, retuned for THIS video
