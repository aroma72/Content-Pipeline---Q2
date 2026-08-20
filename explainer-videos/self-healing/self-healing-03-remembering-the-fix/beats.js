'use strict';
/*
 * beats.js — "Remembering The Fix" (Self-Healing & Self-Improving series, video 03).
 * CONTINUES V01–V02: same locked Ali (art/_ref.png), shop + AI helper, honey ORB = the brain,
 * room = harness. ONE concept: SELF-IMPROVING = the fix is KEPT, so the same mistake does not happen
 * a second time — and the key question is WHERE THE LEARNING IS STORED. Six places to store it, all
 * outside the brain (memory, retrieval, instructions, tools, workflow, evals). Fine-tuning is named
 * once and deliberately handed to V04. De-duplicated vs V01 (healing) and V02 (the critic).
 * CAMERA-PAN build: stills + Ken Burns / cutout-puppet, plus i2v on the 3 story-critical beats.
 * No baked text in any art prompt.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const ORB = 'a smooth simple glowing ball of warm honey light representing the AI, a plain featureless round orb with one soft highlight, no brain shape, no folds, no face, absolutely no text, no letters, no words on it';
const ROOM = 'a cosy warm room with soft rounded walls around it';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'Healing fixes today’s mistake; improving makes sure there is no next time.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Healing fixes today. Improving removes next time.', hi: 'removes next time' } } },

  { id: '02', mode: 'ali',
    vo: 'Ali’s helper has been healing beautifully for a month, and he notices something.',
    cap: 'A month later',
    art: `${ALI}, standing with a thoughtful observant expression, arms lightly folded, ${HERO}` },

  { id: '03', mode: 'scene',
    vo: 'It keeps making the same mistake, catching it, and fixing it, over and over.',
    cap: 'The same mistake, again',
    art: `${ALI} standing beside ${ROOM} where ${ORB} floats inside a soft circular loop of three identical plain cards going round, ${STYLE}` },

  { id: '04', mode: 'ali',
    vo: 'Healing works, but nothing is being kept, so the loop never gets shorter.',
    cap: 'Nothing is kept',
    art: `${ALI}, standing with a mildly frustrated puzzled expression, one hand turned palm up, ${HERO}` },

  { id: '05', mode: 'info',
    vo: 'A self-improving system keeps the fix, so the next attempt starts better.',
    cap: 'Keep the fix',
    info: { tpl: 'statement', data: { text: 'A self-improving system keeps the fix.', hi: 'keeps the fix' } } },

  { id: '06', mode: 'info',
    vo: 'Healing improves the execution; improving changes the future behaviour.',
    cap: 'The real difference',
    info: { tpl: 'twocard', data: { title: 'Healing vs improving',
      left: { title: 'Self-healing', items: ['Catches today’s error', 'Retries and recovers', 'Same mistake tomorrow'] },
      right: { title: 'Self-improving', items: ['Keeps what it learned', 'Starts from better', 'Mistake does not return'] } } } },

  { id: '07', mode: 'ali',
    vo: 'Which raises the only question that really matters here.',
    cap: 'The real question',
    art: `${ALI}, standing with a curious raised eyebrow and a small forward lean, ${HERO}` },

  { id: '08', mode: 'info',
    vo: 'Where does the learning get stored?',
    cap: 'Where is it stored?',
    info: { tpl: 'statement', data: { text: 'Where does the learning get stored?', hi: 'get stored' } } },

  { id: '09', mode: 'ali',
    vo: 'Most people assume the answer is inside the brain, and most of the time it is not.',
    cap: 'Not in the brain',
    art: `${ALI}, standing and shaking his head gently with a kind knowing smile, ${HERO}` },

  { id: '10', mode: 'info',
    vo: 'You can store it in memory: what happened, what was tried, what this customer prefers.',
    cap: 'One — memory',
    info: { tpl: 'statement', data: { text: 'Store it in memory: what was tried before.', hi: 'in memory' } } },

  { id: '11', mode: 'scene',
    vo: 'The helper writes the fix into a shelf it will read again tomorrow morning.',
    cap: 'It writes it down',
    art: `${ALI} standing beside ${ROOM} where ${ORB} places a plain blank card onto a simple wooden shelf on the wall, ${STYLE}` },

  { id: '12', mode: 'info',
    vo: 'You can store it in retrieval: better sources reaching the helper at the right moment.',
    cap: 'Two — retrieval',
    info: { tpl: 'statement', data: { text: 'Store it in retrieval: better sources, right moment.', hi: 'better sources' } } },

  { id: '13', mode: 'info',
    vo: 'You can store it in the instructions: the playbook gains one more line.',
    cap: 'Three — instructions',
    info: { tpl: 'statement', data: { text: 'Store it in the instructions: one more line.', hi: 'one more line' } } },

  { id: '14', mode: 'scene',
    vo: 'Ali adds the rule the mistake taught him, and the helper reads it every time.',
    cap: 'A rule the mistake taught',
    art: `${ALI} standing beside ${ROOM}, adding one plain blank card to a small neat stack of cards floating near ${ORB}, ${STYLE}` },

  { id: '15', mode: 'info',
    vo: 'You can store it in the tools: give it the thing it kept trying to improvise.',
    cap: 'Four — tools',
    info: { tpl: 'statement', data: { text: 'Store it in the tools it was missing.', hi: 'the tools' } } },

  { id: '16', mode: 'info',
    vo: 'You can store it in the workflow, or in the checks that now run every time.',
    cap: 'Five and six',
    info: { tpl: 'statement', data: { text: 'Store it in the workflow, or in the checks.', hi: 'the workflow' } } },

  { id: '17', mode: 'info',
    vo: 'Six places to keep a lesson, and not one of them touches the model.',
    cap: 'Six places',
    info: { tpl: 'screen', data: { title: 'Where the learning lives', lines: [
      { k: 'Memory', v: 'what happened before' }, { k: 'Retrieval', v: 'better sources, on time' },
      { k: 'Instructions', v: 'one more line in the playbook' }, { k: 'Tools', v: 'the thing it was missing' },
      { k: 'Workflow', v: 'a better order of steps' }, { k: 'Checks', v: 'a critic that now runs' } ] } } },

  { id: '18', mode: 'ali',
    vo: 'So the system genuinely got better, while the brain stayed exactly the same.',
    cap: 'Better, same brain',
    art: `${ALI}, standing with a pleased confident smile and a small approving nod, ${HERO}` },

  { id: '19', mode: 'info',
    vo: 'There is a seventh place: inside the model itself, and that one is different.',
    cap: 'The seventh place',
    info: { tpl: 'statement', data: { text: 'There is a seventh place: inside the model.', hi: 'inside the model' } } },

  { id: '20', mode: 'ali',
    vo: 'Changing the brain is real improvement too, and it is the next video.',
    cap: 'Next video',
    art: `${ALI}, standing and gesturing forward lightly with an open inviting expression, ${HERO}` },

  { id: '21', mode: 'info', holdAfter: 6,
    vo: 'Quick question: Ali added one line to the playbook and the mistake stopped — did the model change?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'A line was added to the playbook and the mistake stopped. Did the model change?',
      options: ['Yes, adding instructions retrains it', 'No — the learning is stored outside the brain', 'Only if you restart it', 'Yes, but only a little'],
      note: 'Write your answer down.' } } },

  { id: '22', mode: 'info',
    vo: 'No: the learning sits outside the brain, and that still counts as improving.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Did the model change?',
      options: ['Yes, adding instructions retrains it', 'No — the learning is stored outside the brain', 'Only if you restart it', 'Yes, but only a little'],
      answer: 1, note: 'Improving means the behaviour changes — not always the weights.' } } },

  { id: '23', mode: 'ali',
    vo: 'Your turn: take one mistake your AI keeps repeating and pick where the fix will live.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '24', mode: 'info',
    vo: 'Ask yourself: after it fails, what is different tomorrow, and where is that kept?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'After it fails, what is different tomorrow — and where is that kept?' } } },

  { id: '25', mode: 'ali',
    vo: 'A fix you keep is worth a hundred fixes you have to make again.',
    cap: 'Keep the fix',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["03", "11", "25"]; // i2v story beats (house rule: use-animations)
