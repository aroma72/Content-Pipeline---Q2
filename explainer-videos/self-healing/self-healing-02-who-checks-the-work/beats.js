'use strict';
/*
 * beats.js — "Who Checks The Work" (Self-Healing & Self-Improving series, video 02).
 * V2 REBUILD to the EVALS-GRADE VISUAL STANDARD (§3d) — verified by `node qa-visuals.js`.
 * Continues v01: same locked Ali, same shop (ledger, counter, shelves, filing drawer), the AI is the
 * same open LAPTOP with a blank screen. ONE concept: the CRITIC — a rule, a test, a second model, or a
 * person — and picking the cheapest one that catches YOUR failure. Real stakes: a 47,000-rupee refund
 * on an 8,400-rupee order, caught free by a rule in 0 seconds vs 40 rupees and 9 seconds for a model.
 * Names "debugging loop" (Aroma's request). No baked text in any art prompt.
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
    vo: 'A debugging loop is only as good as the thing that checks the work.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'The loop is only as good as the checker.', hi: 'the checker' } } },

  { id: '02', mode: 'scene',
    vo: 'Last month one rule in Ali\'s ledger caught a blank answer before it hurt him.',
    cap: 'The rule that saved him',
    art: `${ALI} standing behind the counter resting one finger on a short row of abstract wavy pen squiggles in the wide margin of the open ledger, the squiggles clearly not forming any readable letters or words, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'Today a bigger one arrives: the helper proposes a refund of forty-seven thousand rupees.',
    cap: 'A very large refund',
    art: `${ALI} standing behind the counter holding a single cream slip of paper up close with widening alarmed eyes, ${LAPTOP} open beside him, ${SHOP}, ${STYLE}` },

  { id: '04', mode: 'info',
    vo: 'The order it belongs to was worth eight thousand four hundred.',
    cap: 'Against an 8,400 order',
    info: { tpl: 'bignum', data: {
      left: { big: '47000', lab: 'refund proposed', tone: 'bad' }, sep: 'vs',
      right: { big: '8400', lab: 'what the order was worth' },
      note: 'Nearly six times the order — and nothing stopped it.' } } },

  { id: '05', mode: 'ali',
    vo: 'Something has to read that answer before it ever leaves the shop.',
    cap: 'Someone must read it',
    art: `${ALI}, standing calmly with a thoughtful determined expression (not angry, brows relaxed), both arms resting naturally at his sides, hands relaxed and anatomically correct with the thumb on the inner side of each hand, no raised palm, ${HERO}` },

  { id: '06', mode: 'info',
    vo: 'That something is the critic, and it comes in four flavours.',
    cap: 'Meet the critic',
    info: { tpl: 'screen', data: { title: 'Four kinds of critic', lines: [
      { k: 'A rule', v: 'free · instant · narrow' },
      { k: 'A test', v: 'cheap · exact · needs a right answer' },
      { k: 'A second model', v: 'catches the vague · costs a call' },
      { k: 'A person', v: 'catches anything · slowest' } ] } } },

  { id: '07', mode: 'scene',
    vo: 'The first is a plain rule, written once in the margin of the ledger.',
    cap: 'One — a plain rule',
    art: `${ALI} standing behind the counter writing a short line with a pen in the wide margin of the open ledger, leaning in with a focused expression, ${LAPTOP} beside the ledger, ${SHOP}, ${STYLE}` },

  { id: '08', mode: 'info',
    vo: 'No refund may ever exceed the order it belongs to.',
    cap: 'The rule',
    info: { tpl: 'screen', data: { title: 'The rule Ali wrote', lines: [
      { k: 'If', v: 'refund is greater than the order total' },
      { k: 'Then', v: 'stop it — never send' },
      { k: 'Cost to run', v: '0 rupees, 0 seconds' } ] } } },

  { id: '09', mode: 'scene',
    vo: 'The slip hits that rule and stops dead on the counter.',
    cap: 'Stopped dead',
    art: `A single cream paper slip lying stopped flat against a simple upright wooden block set on the polished counter, not passing it, ${LAPTOP} open on the far side, ${ALI} watching from the side, ${SHOP}, ${STYLE}` },

  { id: '10', mode: 'info',
    vo: 'A rule is free, instant, and never wrong about what it covers.',
    cap: 'Free and certain',
    info: { tpl: 'gauge', data: { label: 'Rupee cost to run a rule', value: 0, max: 40, good: 'Instant, and never wrong' } } },

  { id: '11', mode: 'scene',
    vo: 'The second is a test: run the answer against the records and see if it holds.',
    cap: 'Two — a test',
    art: `${ALI} standing behind the counter holding one cream slip beside an upright record card lifted from the pulled-open filing drawer, comparing the two, ${LAPTOP} beside him, ${SHOP}, ${STYLE}` },

  { id: '12', mode: 'ali',
    vo: 'A failing test is a gift, because it names exactly what broke.',
    cap: 'A failing test is a gift',
    art: `${ALI}, standing with a warm approving smile and a small satisfied nod, ${HERO}` },

  { id: '13', mode: 'scene',
    vo: 'The third is a second model, asked to read the answer and find the fault.',
    cap: 'Three — a second model',
    art: `Two open silver laptops standing side by side on the polished counter, both screens plain blank pale interfaces with no text or icons, one cream slip lying on the counter between them, ${SHOP}, ${STYLE}` },

  { id: '14', mode: 'info',
    vo: 'It catches the vague and the sloppy, but it costs a call and can be wrong.',
    cap: 'The trade',
    info: { tpl: 'twocard', data: { title: 'A second model',
      left: { title: 'What it costs', items: ['About 40 rupees', 'About 9 seconds', 'Can be confidently wrong'] },
      right: { title: 'What it catches', items: ['Vague wording', 'A wrong tone', 'What no rule can describe'] } } } },

  { id: '15', mode: 'scene',
    vo: 'The fourth is a person: Ali himself, reading it before anything leaves.',
    cap: 'Four — a person',
    art: `${ALI} standing behind the counter holding a cream slip in both hands and reading it closely with a focused careful expression, ${LAPTOP} open beside him, ${SHOP}, ${STYLE}` },

  { id: '16', mode: 'info',
    vo: 'Slowest and dearest, so he saves it for the moves he cannot take back.',
    cap: 'What each one costs',
    info: { tpl: 'bars', data: { title: 'Seconds to check one answer', max: 60, suffix: 's', items: [
      { label: 'A rule', value: 0 }, { label: 'A test', value: 2 },
      { label: 'A second model', value: 9 }, { label: 'A person', value: 60, tone: 'bad' } ] } } },

  { id: '17', mode: 'ali',
    vo: 'So the rule of thumb is simple: use the cheapest critic that catches your failure.',
    cap: 'Cheapest that catches it',
    art: `${ALI}, standing with a confident clear expression, one finger raised making a simple point, ${HERO}` },

  { id: '18', mode: 'info',
    vo: 'And you can stack them: a rule first, a test next, a person only at the end.',
    cap: 'Stack them',
    info: { tpl: 'checks', data: { title: 'Stack them in cost order', items: [
      'A rule catches the impossible', 'A test catches the wrong', 'A model catches the vague',
      'A person catches the rest' ] } } },

  { id: '19', mode: 'info', holdAfter: 6,
    vo: 'Quick question: which critic should catch a refund six times the order?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'Which critic should catch a 47,000 refund on an 8,400 order?',
      options: ['A second model, asked to review it', 'A plain rule on the amount — free and instant', 'Ali reading every refund himself', 'Nothing, it rarely gets this wrong'],
      note: 'Write your answer down.' } } },

  { id: '20', mode: 'info',
    vo: 'A plain rule, because the cheapest critic that catches it is the right one.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Which critic catches a 47,000 refund on an 8,400 order?',
      options: ['A second model, asked to review it', 'A plain rule on the amount — free and instant', 'Ali reading every refund himself', 'Nothing, it rarely gets this wrong'],
      answer: 1, note: 'Never pay 40 rupees where 0 will do.' } } },

  { id: '21', mode: 'info',
    vo: 'Now the debugging loop is whole: act, critic, retry, and remember.',
    cap: 'The debugging loop, whole',
    info: { tpl: 'screen', data: { title: 'Debugging in a loop, whole', lines: [
      { k: 'Act', v: 'the helper answers' }, { k: 'Critic', v: 'rule, test, model, or person' },
      { k: 'Retry', v: 'the reason goes back' }, { k: 'Remember', v: 'so it does not repeat' } ] } } },

  { id: '22', mode: 'ali',
    vo: 'That last word, remember, is where healing turns into something bigger.',
    cap: 'Remember',
    art: `${ALI}, standing with a thoughtful intrigued expression and a small forward lean, ${HERO}` },

  { id: '23', mode: 'ali',
    vo: 'Your turn: name the one mistake that would hurt most, and pick its critic.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '24', mode: 'info',
    vo: 'Ask yourself: what is my worst mistake, and what is the cheapest thing that catches it?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'What is my worst mistake — and what is the cheapest thing that catches it?' } } },

  { id: '25', mode: 'ali',
    vo: 'A loop without a critic is just a helper doing the wrong thing faster.',
    cap: 'No critic, no loop',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["07","11","15"]; // i2v story beats — physical actions, retuned for THIS video
