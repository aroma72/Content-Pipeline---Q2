'use strict';
/*
 * beats.js — "Not All-Or-Nothing" (The Autonomy Dial series, video 01).
 * ONE protagonist (Ali), ONE running scenario (hiring a new AI helper at his shop),
 * ONE move: set autonomy per task by asking "if it goes wrong, can I undo it?"
 * One spoken sentence per beat.
 *
 * Modes (per the step-0 gate + pipeline laws):
 *   - Ali-alone beats  -> `ali`   (clean-hero cutout puppet, plain cream bg).
 *   - multi-subject beats (Ali + the robot helper, or a customer) -> `scene`
 *     (LAW 5: never cut a second person in half; use scene, not cutout).
 *   - text/number beats -> `info` (crisp HTML; NEVER baked into art).
 *
 * Interactive cards (script labels 8a / 20a -> ids 09 / 22 here): a QUESTION card
 * (quiz, no answer) and a REVEAL card (quiz, answer highlighted). Option/answer text
 * lives only on the [info] card — never baked into art.
 *
 * Motion policy: stills + Ken Burns pan + cutout-puppet by default. Beats 02 and 04
 * (shop / multi-character) are the i2v-animation candidates (generate-lesson-video-omni.js);
 * they fall back to cutout/pan automatically if kie credits are out.
 *
 * Consistency: identical detailed ALI descriptor on every beat (SAME Ali as the evals
 * series), seeded by omni from one locked reference sheet (art/_ref.png). No baked-in
 * text/letters/numbers in any image.
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
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  {
    id: '01', mode: 'info',
    vo: 'The first choice with any AI helper is a dial, not a switch.',
    cap: 'A dial, not a switch',
    info: { tpl: 'statement', data: { text: 'A dial, not a switch.', hi: 'dial' } },
  },
  {
    id: '02', mode: 'scene',
    vo: 'Ali hires a new helper for his shop this morning.',
    cap: 'Ali · a new helper',
    art: `${ALI} warmly greeting ${HELPER} across the counter of ${SHOP}, welcoming open-handed gesture, bright morning light, ${STYLE}`,
  },
  {
    id: '03', mode: 'ali',
    vo: 'His first thought is to hand over everything and go home.',
    cap: 'Hand over everything',
    art: `${ALI}, cheerfully waving goodbye with one hand while holding a folded jacket over the other arm, about to leave, relaxed and trusting, ${HERO}`,
  },
  {
    id: '04', mode: 'scene',
    vo: 'By noon it has refunded a customer who never paid.',
    cap: 'A refund that never should have happened',
    art: `${HELPER} behind the counter of ${SHOP} pushing a small refund slip across to a smug grinning customer who holds an empty shopping basket, no shopkeeper present, ${STYLE}`,
  },
  {
    id: '05', mode: 'ali',
    vo: 'So Ali swings back and lets it do nothing on its own.',
    cap: 'Swing all the way back',
    art: `${ALI}, standing with arms firmly crossed, cautious and protective expression, holding back, ${HERO}`,
  },
  {
    id: '06', mode: 'ali',
    vo: 'Now he approves every tiny thing himself, and nothing is faster.',
    cap: 'Approving every tiny thing',
    art: `${ALI}, looking tired and a little overwhelmed, tapping his finger on a small floating blank screen icon beside him, slight frown, ${HERO}`,
  },
  {
    id: '07', mode: 'info',
    vo: 'Both ways failed, because he treated it as on or off.',
    cap: 'Both ways failed',
    info: { tpl: 'statement', data: { text: 'It was never on or off.', hi: 'on or off' } },
  },
  {
    id: '08', mode: 'info',
    vo: 'Autonomy is really a dial, from asking first to running alone.',
    cap: 'the autonomy spectrum',
    info: { tpl: 'spectrum', data: { items: [
      { label: 'Asks first', tone: 'good' },
      { label: 'Checks in', tone: 'mid' },
      { label: 'Runs alone', tone: 'bad' },
    ] } },
  },
  {
    id: '09', mode: 'info', holdAfter: 6,
    vo: 'Which of these could the helper safely run alone? Write your answer down.',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'Which could the helper safely run alone?',
      options: ['Read an order back', 'Give a cash refund', 'Wire money from the till', 'Approve a supplier invoice'],
      note: 'Write your answer down.',
    } },
  },
  {
    id: '10', mode: 'scene',
    vo: 'At the low end the helper asks him before every action.',
    cap: 'Low end · asks first',
    art: `${HELPER} at the counter of ${SHOP} politely raising one arm to ask a question, ${ALI} standing beside it nodding kindly, ${STYLE}`,
  },
  {
    id: '11', mode: 'scene',
    vo: 'At the high end it runs the whole task while he watches.',
    cap: 'High end · runs alone',
    art: `${HELPER} busily working at the counter of ${SHOP}, ${ALI} standing a step back with arms relaxed, watching calmly, ${STYLE}`,
  },
  {
    id: '12', mode: 'ali',
    vo: 'Most tasks belong in the middle, not at either end.',
    cap: 'Most live in the middle',
    art: `${ALI}, thoughtful, both hands gesturing gently toward an imaginary middle point in front of him, ${HERO}`,
  },
  {
    id: '13', mode: 'ali',
    vo: 'So the real question is where to set the dial each time.',
    cap: 'Where to set it',
    art: `${ALI}, one finger raised in a gentle thinking gesture, curious and engaged expression, ${HERO}`,
  },
  {
    id: '14', mode: 'info',
    vo: 'One question sets it. If it goes wrong, can you undo it?',
    cap: 'can I undo it?',
    info: { tpl: 'statement', data: { text: 'Can I undo it?', hi: 'undo' } },
  },
  {
    id: '15', mode: 'ali',
    vo: 'Ali lists what the helper might do at his counter.',
    cap: 'List the tasks',
    art: `${ALI}, thoughtfully counting items off on the fingers of one hand, calm and methodical, ${HERO}`,
  },
  {
    id: '16', mode: 'ali',
    vo: 'Reading back an order is easy to undo, so that runs free.',
    cap: 'Easy to undo · runs free',
    art: `${ALI}, smiling and giving a relaxed easy thumbs up with one hand, light and reassured, ${HERO}`,
  },
  {
    id: '17', mode: 'ali',
    vo: 'Wiring money from the till cannot be undone, so that waits.',
    cap: "Can't undo · that waits",
    art: `${ALI}, holding one open palm up in a calm gentle stop gesture, composed and careful expression, ${HERO}`,
  },
  {
    id: '18', mode: 'info',
    vo: 'Easy to undo sits high on the dial. Hard to undo sits low.',
    cap: 'Sorted by the undo test',
    info: { tpl: 'twocard', data: {
      title: 'Set by one test',
      left: { title: 'Hard to undo', items: ['Wire money', 'sits low'] },
      right: { title: 'Easy to undo', items: ['Read an order back', 'sits high'] },
    } },
  },
  {
    id: '19', mode: 'ali',
    vo: 'He sets each task on its own, not the helper as a whole.',
    cap: 'Per task, not per helper',
    art: `${ALI}, calmly adjusting several small floating dial icons one at a time in the air before him, focused, ${HERO}`,
  },
  {
    id: '20', mode: 'ali',
    vo: 'Every new task starts low. It earns its way up later.',
    cap: 'Start low, earn it up',
    art: `${ALI}, one hand held low then gesturing gently upward, encouraging patient expression, ${HERO}`,
  },
  {
    id: '21', mode: 'ali',
    vo: "This morning's panic is gone, because nothing runs that he cannot catch.",
    cap: 'Panic gone',
    art: `${ALI}, relaxed and relieved, shoulders at ease, a calm gentle smile, ${HERO}`,
  },
  {
    id: '22', mode: 'info',
    vo: 'The answer is reading an order back, because it is easy to undo.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'The answer',
      options: ['Read an order back', 'Give a cash refund', 'Wire money from the till', 'Approve a supplier invoice'],
      answer: 0,
      note: 'Easy to undo, so it runs free.',
    } },
  },
  {
    id: '23', mode: 'ali',
    vo: 'Your turn. Pick one task you would give an AI helper.',
    cap: 'Pick one task',
    art: `${ALI}, facing the viewer with a warm inviting open-handed gesture, encouraging, ${HERO}`,
  },
  {
    id: '24', mode: 'info',
    vo: 'Ask one thing. If it goes wrong, can I undo it in time?',
    cap: 'the one question',
    info: { tpl: 'statement', data: { text: 'Can I undo it in time?', hi: 'undo' } },
  },
  {
    id: '25', mode: 'ali',
    vo: 'Answer that, and you have placed your first task on the dial.',
    cap: 'Your first task, placed',
    art: `${ALI}, facing the viewer with a confident reassuring smile and a small thumbs up, ${HERO}`,
  },
];

// Character-consistency anchor for the omni (Nano Banana) generator: one locked Ali
// reference sheet from `refPrompt`, seeded into every image so the SAME man appears
// throughout — and matches the Ali from the evals series (same descriptor).
module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;

// i2v animation candidates (shop / multi-character beats) — motion policy.
module.exports.animateIds = ['02', '04'];
