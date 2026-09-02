'use strict';
/*
 * beats.js — "Fix The System Before The Brain" (Self-Healing & Self-Improving series, video 05).
 * V2 REBUILD to the EVALS-GRADE VISUAL STANDARD (§3d) — verified by `node qa-visuals.js`.
 * Same shop, same ledger, same LAPTOP helper. ONE concept: the DIAGNOSIS LADDER — six questions about
 * the SYSTEM before you ever touch the model — closing on which parts may improve themselves and which
 * always need a person. Real stakes: 20 bad answers taken apart — 17 of them were the system, 1 the
 * model; 5 of the 6 rungs cost an afternoon, not a training run.
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
    vo: 'When the AI gets it wrong, the model is usually the last thing that is broken.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'The model is usually the last thing that is broken.', hi: 'the last thing' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali\'s helper gives a bad answer, and his first instinct is to blame the brain.',
    cap: 'The first instinct',
    art: `${ALI} standing behind the counter with a frustrated expression, one hand raised in exasperation toward ${LAPTOP}, a cream slip lying on the open ledger, ${SHOP}, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'So he does something patient instead: he lays twenty bad answers on the counter.',
    cap: 'Twenty bad answers',
    art: `Twenty cream paper slips laid out in neat rows across the polished wooden counter, ${ALI} behind them looking down with a calm methodical expression, ${LAPTOP} at one end, ${SHOP}, ${STYLE}` },

  { id: '04', mode: 'info',
    vo: 'Seventeen were the system around it; only one was really the model.',
    cap: 'Seventeen versus one',
    info: { tpl: 'piles', data: { showCounts: true, items: [
      { label: 'The ask was unclear', count: 6, tone: 'big' }, { label: 'Context was missing', count: 5 },
      { label: 'No tool for it', count: 4 }, { label: 'Workflow too big', count: 2 },
      { label: 'Actually the model', count: 1 } ] } } },

  { id: '05', mode: 'scene',
    vo: 'So he pins six questions above the counter and climbs them in order.',
    cap: 'Six questions, in order',
    art: `${ALI} standing behind the counter pinning a small plain card onto the front edge of a wooden shelf above the counter, five similar blank cards already pinned in a vertical row, ${LAPTOP} below, ${SHOP}, ${STYLE}` },

  { id: '06', mode: 'info',
    vo: 'One: was the ask itself unclear, vague, or missing what good looks like?',
    cap: 'One — the ask',
    info: { tpl: 'gauge', data: { label: 'Bad answers caused by a vague ask', value: 6, max: 20, good: 'The most common cause of all' } } },

  { id: '07', mode: 'scene',
    vo: 'Half his bad answers were simply bad questions coming back at him.',
    cap: 'Bad questions, bad answers',
    art: `${ALI} standing behind the counter holding one cream slip up in each hand and comparing them side by side with a wry understanding expression, ${LAPTOP} beside him, ${SHOP}, ${STYLE}` },

  { id: '08', mode: 'info',
    vo: 'Two: was the context missing, so it guessed at something it never saw?',
    cap: 'Two — the context',
    info: { tpl: 'twocard', data: { title: 'What it could see',
      left: { title: 'What it had', items: ['Last month only', 'No supplier terms', 'No discount history'] },
      right: { title: 'What it needed', items: ['The whole year', 'The agreed terms', 'What changed in March'] } } } },

  { id: '09', mode: 'scene',
    vo: 'Three: did it even have the right tool, or was it improvising without one?',
    cap: 'Three — the tools',
    art: `${ALI} standing behind the counter pulling open the wooden filing drawer to show it is empty inside, ${LAPTOP} beside it with a small plain calculator lying unplugged on the counter, ${SHOP}, ${STYLE}` },

  { id: '10', mode: 'ali',
    vo: 'A helper with no key will always invent a story about the locked door.',
    cap: 'No key, invented story',
    art: `${ALI}, standing with a wry understanding half smile and a small shrug, ${HERO}` },

  { id: '11', mode: 'info',
    vo: 'Four: was the workflow wrong, asking for everything in one impossible step?',
    cap: 'Four — the workflow',
    info: { tpl: 'bars', data: { title: 'Correct answers out of 20', max: 20, items: [
      { label: 'All in one step', value: 11, tone: 'bad' }, { label: 'Split into three', value: 18, tone: 'big' } ] } } },

  { id: '12', mode: 'info',
    vo: 'Five: was a check simply missing, the critic that should have caught this?',
    cap: 'Five — the missing check',
    info: { tpl: 'checks', data: { title: 'Rungs one to five cost an afternoon', items: [
      'Rewrite the ask', 'Add the missing context', 'Give it the tool',
      'Split the workflow', 'Add the check that was missing' ] } } },

  { id: '13', mode: 'info',
    vo: 'Six, and only six: is this a job the model is genuinely not good at?',
    cap: 'Six — the wrong job',
    info: { tpl: 'screen', data: { title: 'Before you blame the model', lines: [
      { k: '1 · The ask', v: 'unclear or vague?' }, { k: '2 · The context', v: 'missing what it needed?' },
      { k: '3 · The tools', v: 'improvising without one?' }, { k: '4 · The workflow', v: 'too much in one step?' },
      { k: '5 · The check', v: 'no critic to catch it?' }, { k: '6 · The job', v: 'wrong task for a model?' } ] } } },

  { id: '14', mode: 'ali',
    vo: 'Five of those six are fixed by an afternoon of work, not a training run.',
    cap: 'Five of six are cheap',
    art: `${ALI}, standing with a relieved encouraged smile, both hands open in a light gesture, ${HERO}` },

  { id: '15', mode: 'scene',
    vo: 'A capable model, good tools, a ledger, a check, a retry, and a person at the risky end.',
    cap: 'The whole shape',
    art: `${ALI} standing behind the counter with ${LAPTOP}, the open ledger, a small calculator and the pulled-open records drawer all arranged neatly along the polished counter, the brass lamp lit, ${SHOP}, ${STYLE}` },

  { id: '16', mode: 'info', holdAfter: 6,
    vo: 'Quick question: it keeps missing a discount rule nobody ever wrote down — fix what first?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'It keeps missing a rule nobody ever wrote down. Fix what first?',
      options: ['Fine-tune it on past discounts', 'Write the rule into its instructions', 'Switch to a bigger model', 'Have a person check every order'],
      note: 'Write your answer down.' } } },

  { id: '17', mode: 'info',
    vo: 'Write the rule down, because it was never told, not badly trained.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Fix what first?',
      options: ['Fine-tune it on past discounts', 'Write the rule into its instructions', 'Switch to a bigger model', 'Have a person check every order'],
      answer: 1, note: 'It was never told. Rung one of the ladder.' } } },

  { id: '18', mode: 'ali',
    vo: 'And that leaves the question Ali finds genuinely hard, and worth sitting with.',
    cap: 'The hard question',
    art: `${ALI}, standing quietly with a reflective serious expression, hands at his sides, ${HERO}` },

  { id: '19', mode: 'scene',
    vo: 'Which parts of the shop may improve themselves without asking him first?',
    cap: 'Allowed to change itself?',
    art: `${ALI} standing behind the counter drawing a single clear line down the middle of a fresh ledger page with a pen and a ruler, ${LAPTOP} beside him, ${SHOP}, ${STYLE}` },

  { id: '20', mode: 'info',
    vo: 'Its own notes, freely; the rules, the money, and the brain, never alone.',
    cap: 'Who may change what',
    info: { tpl: 'twocard', data: { title: 'Who is allowed to change what',
      left: { title: 'It may change alone', items: ['Its own notes', 'What it looks up', 'How it retries'] },
      right: { title: 'Only with Ali', items: ['The rules', 'Anything about money', 'The model itself'] } } } },

  { id: '21', mode: 'ali',
    vo: 'Your turn: draw that line for your own tool, and write both sides down.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '22', mode: 'info',
    vo: 'Ask yourself: what may my system change on its own, and what always needs me?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'What may it change on its own — and what always needs me?' } } },

  { id: '23', mode: 'ali',
    vo: 'Recovering from a mistake is practical today; learning from one is the harder art.',
    cap: 'Recover, then learn',
    art: `${ALI}, facing the viewer with a warm confident smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["03","05","09"]; // i2v story beats — physical actions, retuned for THIS video
