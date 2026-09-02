'use strict';
/*
 * beats.js — "Remembering The Fix" (Self-Healing & Self-Improving series, video 03).
 * V2 REBUILD to the EVALS-GRADE VISUAL STANDARD (§3d) — verified by `node qa-visuals.js`.
 * Same shop, same ledger, same LAPTOP helper. ONE concept: SELF-IMPROVING = the fix is KEPT, and the
 * real question is WHERE THE LEARNING IS STORED (six places outside the model; a seventh inside it,
 * handed to v04). Real stakes: the same discount mistake caught 9 times in one month, 4 minutes each
 * — 36 minutes of healing that never got shorter, until the lesson went into the ledger.
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
    vo: 'Healing fixes today\'s mistake; improving makes sure there is no next time.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Healing fixes today. Improving removes next time.', hi: 'removes next time' } } },

  { id: '02', mode: 'scene',
    vo: 'A month after Ali added his checks, he counts the marks in his ledger.',
    cap: 'Counting the month',
    art: `${ALI} standing behind the counter looking down at the open ledger, one finger resting partway down a column of short handwritten tally marks, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '03', mode: 'info',
    vo: 'The same discount mistake was caught nine separate times.',
    cap: 'Nine times, one mistake',
    info: { tpl: 'tally', data: { rows: [
      { label: 'Discount mistake', count: 9, tone: 'bad' },
      { label: 'Everything else', count: 2 } ], caption: 'One fault, caught again and again' } } },

  { id: '04', mode: 'scene',
    vo: 'Every catch cost four minutes of retrying, and it never got quicker.',
    cap: 'Four minutes, nine times',
    art: `${ALI} standing behind the counter with one hand pressed to his forehead in tired frustration, the open ledger below him and ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '05', mode: 'info',
    vo: 'Thirty-six minutes of healing that taught the shop absolutely nothing.',
    cap: 'Thirty-six minutes',
    info: { tpl: 'bignum', data: {
      left: { big: '9', lab: 'times caught' }, sep: '×4 min =',
      right: { big: '36', lab: 'minutes lost', tone: 'bad' },
      note: 'Healing worked. Nothing was kept.' } } },

  { id: '06', mode: 'info',
    vo: 'Healing improves the execution; improving changes the future behaviour.',
    cap: 'The real difference',
    info: { tpl: 'twocard', data: { title: 'Healing vs improving',
      left: { title: 'Self-healing', items: ['Catches today\'s error', 'Retries and recovers', 'Same mistake tomorrow'] },
      right: { title: 'Self-improving', items: ['Keeps what it learned', 'Starts from better', 'Mistake does not return'] } } } },

  { id: '07', mode: 'scene',
    vo: 'Which raises the only question that really matters here.',
    cap: 'The real question',
    art: `${ALI} standing behind the counter leaning over the open ledger with a curious raised eyebrow, one hand resting on the page, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '08', mode: 'info',
    vo: 'Where does the learning actually get stored?',
    cap: 'Where is it stored?',
    info: { tpl: 'statement', data: { text: 'Where does the learning get stored?', hi: 'get stored' } } },

  { id: '09', mode: 'ali',
    vo: 'Most people assume it is inside the brain, and most of the time it is not.',
    cap: 'Not in the brain',
    art: `${ALI}, standing and shaking his head gently with a kind knowing smile, ${HERO}` },

  { id: '10', mode: 'scene',
    vo: 'So Ali writes the discount rule as one more line in his ledger.',
    cap: 'One more line',
    art: `${ALI} standing behind the counter writing a fresh line with a pen beneath existing handwritten lines in the open ledger, leaning in with a satisfied focused expression, ${LAPTOP} beside it, ${SHOP}, ${STYLE}` },

  { id: '11', mode: 'scene',
    vo: 'The helper reads that page before every answer it gives him.',
    cap: 'It reads it first',
    art: `${LAPTOP} open on the counter turned toward the large open ledger lying beside it, the lamp lit above both, the pages filled with neat handwritten lines, ${SHOP}, ${STYLE}` },

  { id: '12', mode: 'info',
    vo: 'Next month the same mistake happens once, then never again.',
    cap: 'Nine to one',
    info: { tpl: 'bars', data: { title: 'Times the discount mistake was caught', max: 9, items: [
      { label: 'Before the rule', value: 9, tone: 'bad' }, { label: 'After the rule', value: 1, tone: 'big' } ] } } },

  { id: '13', mode: 'info',
    vo: 'The ledger is one of six places a lesson can live.',
    cap: 'Six places',
    info: { tpl: 'screen', data: { title: 'Where the learning lives', lines: [
      { k: 'Memory', v: 'what happened before' }, { k: 'Retrieval', v: 'better sources, on time' },
      { k: 'Instructions', v: 'one more line in the ledger' }, { k: 'Tools', v: 'the thing it was missing' },
      { k: 'Workflow', v: 'a better order of steps' }, { k: 'Checks', v: 'a critic that now runs' } ] } } },

  { id: '14', mode: 'scene',
    vo: 'A missing tool is a lesson too: he gives it the calculator it kept improvising.',
    cap: 'Store it in the tools',
    art: `${ALI} standing behind the counter placing a small plain desk calculator onto the counter beside ${LAPTOP}, both hands setting it down, ${SHOP}, ${STYLE}` },

  { id: '15', mode: 'info',
    vo: 'Six places, and not one of them touches the model itself.',
    cap: 'None touch the model',
    info: { tpl: 'twocard', data: { title: 'What changed after a month',
      left: { title: 'The model', items: ['Same weights', 'Same knowledge', 'Never retrained'] },
      right: { title: 'The shop', items: ['A rule in the ledger', 'A calculator on the counter', '9 catches down to 1'] } } } },

  { id: '16', mode: 'scene',
    vo: 'So the system genuinely got better while the brain stayed exactly the same.',
    cap: 'Better, same brain',
    art: `${ALI} standing behind the counter with a pleased confident smile, one hand resting on the filled ledger and a small plain desk calculator beside ${LAPTOP}, ${SHOP}, ${STYLE}` },

  { id: '17', mode: 'info',
    vo: 'There is a seventh place: inside the model, and that one is different.',
    cap: 'The seventh place',
    info: { tpl: 'gauge', data: { label: 'Places to store a lesson', value: 6, max: 7, good: 'The seventh is the model itself' } } },

  { id: '18', mode: 'ali',
    vo: 'Changing the brain is real improvement too, and it is the next video.',
    cap: 'Next video',
    art: `${ALI}, standing and gesturing forward lightly with an open inviting expression, ${HERO}` },

  { id: '19', mode: 'info', holdAfter: 6,
    vo: 'Quick question: Ali added one line to his ledger and the mistake stopped — did the model change?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'A line was added to the ledger and the mistake stopped. Did the model change?',
      options: ['Yes, adding instructions retrains it', 'No — the learning is stored outside the brain', 'Only if you restart it', 'Yes, but only a little'],
      note: 'Write your answer down.' } } },

  { id: '20', mode: 'info',
    vo: 'No: the learning sits outside the brain, and that still counts as improving.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Did the model change?',
      options: ['Yes, adding instructions retrains it', 'No — the learning is stored outside the brain', 'Only if you restart it', 'Yes, but only a little'],
      answer: 1, note: 'Improving means the behaviour changes — not always the weights.' } } },

  { id: '21', mode: 'ali',
    vo: 'Your turn: take one mistake your AI keeps repeating and pick where the fix will live.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '22', mode: 'info',
    vo: 'Ask yourself: after it fails, what is different tomorrow, and where is that kept?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'After it fails, what is different tomorrow — and where is that kept?' } } },

  { id: '23', mode: 'ali',
    vo: 'A fix you keep is worth a hundred fixes you have to make again.',
    cap: 'Keep the fix',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["10","14","02"]; // i2v story beats — physical actions, retuned for THIS video
