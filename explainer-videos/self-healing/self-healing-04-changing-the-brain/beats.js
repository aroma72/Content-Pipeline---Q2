'use strict';
/*
 * beats.js — "Changing The Brain Itself" (Self-Healing & Self-Improving series, video 04).
 * V2 REBUILD to the EVALS-GRADE VISUAL STANDARD (§3d) — verified by `node qa-visuals.js`.
 * Same shop, same ledger, same LAPTOP helper. ONE concept: FINE-TUNING — the seventh place to store a
 * lesson, the only one that changes the model, and the five conditions that must ALL hold first.
 * Real stakes: Ali's year of 1,400 corrected slips in a box (a real dataset), one narrow task done
 * 900 times a month, a score he can measure — and the 5-of-5 test his other ideas fail.
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
    vo: 'You can change the brain itself, and five things must be true before you do.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Five things must be true before you change the brain.', hi: 'Five things' } } },

  { id: '02', mode: 'scene',
    vo: 'Every fix so far has lived in Ali\'s ledger, never in the model.',
    cap: 'All of it in the ledger',
    art: `${ALI} standing behind the counter resting both hands on the open ledger, its pages filled with many neat handwritten lines, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'Then he pulls out a box he has been filling for a year.',
    cap: 'A year in a box',
    art: `${ALI} standing behind the counter lifting a plain wooden box packed tightly with cream paper slips up onto the polished counter, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '04', mode: 'info',
    vo: 'Fourteen hundred corrected slips, every one a real right answer.',
    cap: 'A real dataset',
    info: { tpl: 'bignum', data: {
      left: { big: '1400', lab: 'corrected slips' }, sep: 'over',
      right: { big: '12', lab: 'months' },
      note: 'Not opinions — actual good and bad examples.' } } },

  { id: '05', mode: 'info',
    vo: 'Fine-tuning means feeding it those slips until its instincts shift.',
    cap: 'What it means',
    info: { tpl: 'twocard', data: { title: 'Where the lesson goes',
      left: { title: 'The ledger (1-6)', items: ['A line you can read', 'Edit it any time', 'Undo in seconds'] },
      right: { title: 'The model (7)', items: ['Baked into the weights', 'Cannot be read', 'Only another training undoes it'] } } } },

  { id: '06', mode: 'scene',
    vo: 'This is the one kind of learning you cannot undo by editing a page.',
    cap: 'You cannot just erase it',
    art: `${ALI} standing behind the counter with a serious careful expression, one hand raised in a measured cautionary gesture above the open ledger, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '07', mode: 'info',
    vo: 'So before he reaches for it, he checks five conditions in order.',
    cap: 'Five conditions',
    info: { tpl: 'checks', data: { title: 'All five, or not yet', items: [
      'Narrow — one well-defined, repeating task',
      'High volume — enough that a small gain matters',
      'Real dataset — actual good and bad examples',
      'Measurable — you can prove the new one is better',
      'Stable — the task is not moving' ] } } },

  { id: '08', mode: 'scene',
    vo: 'His task is narrow: sorting slips into four trays, nothing more.',
    cap: 'One — narrow',
    art: `${ALI} standing behind the counter placing a cream slip into one of four small shallow wooden trays lined up along the polished counter, ${LAPTOP} beside them, ${SHOP}, ${STYLE}` },

  { id: '09', mode: 'info',
    vo: 'And the volume is high: nine hundred slips pass through every month.',
    cap: 'Two — high volume',
    info: { tpl: 'bignum', data: {
      left: { big: '900', lab: 'slips a month' }, sep: 'so',
      right: { big: '2', lab: 'percent is worth it' },
      note: 'A small gain, repeated 900 times, pays.' } } },

  { id: '10', mode: 'scene',
    vo: 'The box on the counter is condition three, already satisfied.',
    cap: 'Three — a real dataset',
    art: `A plain wooden box packed tightly with cream paper slips standing open on the polished counter beside ${LAPTOP}, the brass lamp lit above it, ${SHOP}, ${STYLE}` },

  { id: '11', mode: 'info',
    vo: 'Condition four is a score, so he can prove the new brain beats the old.',
    cap: 'Four — measurable',
    info: { tpl: 'bars', data: { title: 'Slips sorted correctly, out of 100', max: 100, suffix: '/100', items: [
      { label: 'Today', value: 84 }, { label: 'Needs to beat', value: 84, tone: 'big' } ] } } },

  { id: '12', mode: 'ali',
    vo: 'Without a score, you have swapped a brain and simply hoped.',
    cap: 'Without a score, you hoped',
    art: `${ALI}, standing with a skeptical unconvinced expression, one eyebrow raised, arms lightly folded, ${HERO}` },

  { id: '13', mode: 'info',
    vo: 'Condition five is stability, because training cannot chase a moving task.',
    cap: 'Five — stable',
    info: { tpl: 'gauge', data: { label: 'Months this task has held still', value: 12, max: 12, good: 'Stable enough to train on' } } },

  { id: '14', mode: 'scene',
    vo: 'All five true, and fine-tuning an open model starts to make real sense.',
    cap: 'All five true',
    art: `${ALI} standing behind the counter with a considered confident expression, one hand resting on the open box of cream slips, four small wooden trays lined up beside ${LAPTOP}, ${SHOP}, ${STYLE}` },

  { id: '15', mode: 'scene',
    vo: 'But then Ali is standing in a completely different kind of workshop.',
    cap: 'A different workshop',
    art: `${ALI} standing behind the counter looking around with a slightly overwhelmed but curious expression, ${LAPTOP} open beside the box of slips and the ledger, ${SHOP}, ${STYLE}` },

  { id: '16', mode: 'info',
    vo: 'Now he owns the data, the training, the serving, the versions, and the drift.',
    cap: 'The new job he just took',
    info: { tpl: 'screen', data: { title: 'What fine-tuning makes you own', lines: [
      { k: 'Data', v: 'clean it, label it, keep it' }, { k: 'Training', v: 'pipelines and hardware' },
      { k: 'Serving', v: 'run it, pay for it monthly' }, { k: 'Versions', v: 'which brain is live?' },
      { k: 'Drift', v: 'the world moves, it does not' } ] } } },

  { id: '17', mode: 'ali',
    vo: 'That is not a reason to never do it; it is a reason to be sure first.',
    cap: 'Be sure first',
    art: `${ALI}, standing calm and steady with a balanced reassuring expression, hands open, ${HERO}` },

  { id: '18', mode: 'info', holdAfter: 6,
    vo: 'Quick question: the replies are weak and the task changes every few weeks — fine-tune?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'Weak replies, and the task changes every few weeks. Fine-tune?',
      options: ['Yes — weak output means a weak model', 'No — the task is not stable, so training cannot keep up', 'Yes, if you can afford the hardware', 'Only with a bigger model'],
      note: 'Write your answer down.' } } },

  { id: '19', mode: 'info',
    vo: 'No, because a task that keeps moving will always outrun the training.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Fine-tune a task that changes every few weeks?',
      options: ['Yes — weak output means a weak model', 'No — the task is not stable, so training cannot keep up', 'Yes, if you can afford the hardware', 'Only with a bigger model'],
      answer: 1, note: 'Fine-tuning needs a task that holds still.' } } },

  { id: '20', mode: 'ali',
    vo: 'Your turn: take the task you would train for and check it against all five.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '21', mode: 'info',
    vo: 'Ask yourself: is it narrow, high volume, measurable, stable, and do I have the data?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'Narrow? High volume? Real data? Measurable? Stable? All five, or not yet.' } } },

  { id: '22', mode: 'ali',
    vo: 'Change the brain last, and only when the room has run out of answers.',
    cap: 'Change the brain last',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["14","03","08"]; // i2v story beats — physical actions, retuned for THIS video
