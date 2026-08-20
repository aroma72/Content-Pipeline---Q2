'use strict';
/*
 * beats.js — "Fix The System Before The Brain" (Self-Healing & Self-Improving series, video 05, finale).
 * CONTINUES V01–V04: same locked Ali (art/_ref.png), shop + AI helper, honey ORB = the brain,
 * room = harness. ONE concept: the DIAGNOSIS LADDER you climb after any AI mistake — six questions
 * about the SYSTEM before you ever touch the model — closing on the real design question: which parts
 * of the system are allowed to improve themselves, and which always stay under human control.
 * De-duplicated vs autonomy (how much rope) — this is about who is allowed to CHANGE, not to ACT.
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
    vo: 'When the AI gets it wrong, the model is usually the last thing that is broken.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'The model is usually the last thing that is broken.', hi: 'the last thing' } } },

  { id: '02', mode: 'ali',
    vo: 'Ali’s helper gives a bad answer, and his first instinct is to blame the brain.',
    cap: 'The first instinct',
    art: `${ALI}, standing with a disappointed frustrated expression, one hand raised in exasperation, ${HERO}` },

  { id: '03', mode: 'info',
    vo: 'That instinct jumps straight from a mistake to buying a bigger model.',
    cap: 'The jump we all make',
    info: { tpl: 'twocard', data: { title: 'The jump we all make',
      left: { title: 'What we say', items: ['The AI got it wrong', 'The model is not smart enough', 'We need to train one'] },
      right: { title: 'What is usually true', items: ['The ask was unclear', 'The context was missing', 'The room was not built'] } } } },

  { id: '04', mode: 'ali',
    vo: 'So Ali makes himself climb six questions before he touches the model.',
    cap: 'Six questions first',
    art: `${ALI}, standing with a calm methodical expression, one finger raised beginning to count, ${HERO}` },

  { id: '05', mode: 'info',
    vo: 'One: was the ask itself unclear, vague, or missing what good looks like?',
    cap: 'One — the ask',
    info: { tpl: 'statement', data: { text: 'One: was the ask unclear?', hi: 'the ask' } } },

  { id: '06', mode: 'scene',
    vo: 'Half the bad answers in his shop were simply bad questions coming back at him.',
    cap: 'Bad questions, bad answers',
    art: `${ALI} standing beside ${ROOM}, holding one plain blank card up toward ${ORB} while a second identical blank card floats back toward him, ${STYLE}` },

  { id: '07', mode: 'info',
    vo: 'Two: was the context missing, so it was guessing at something it never saw?',
    cap: 'Two — the context',
    info: { tpl: 'statement', data: { text: 'Two: was it guessing at something it never saw?', hi: 'never saw' } } },

  { id: '08', mode: 'info',
    vo: 'Three: did it even have the right tool, or was it improvising without one?',
    cap: 'Three — the tools',
    info: { tpl: 'statement', data: { text: 'Three: did it have the right tool at all?', hi: 'the right tool' } } },

  { id: '09', mode: 'ali',
    vo: 'A helper with no key will always invent a story about the locked door.',
    cap: 'No key, invented story',
    art: `${ALI}, standing with a wry understanding half smile and a small shrug, ${HERO}` },

  { id: '10', mode: 'info',
    vo: 'Four: was the workflow wrong, asking for everything in one impossible step?',
    cap: 'Four — the workflow',
    info: { tpl: 'statement', data: { text: 'Four: was it all asked in one impossible step?', hi: 'one impossible step' } } },

  { id: '11', mode: 'info',
    vo: 'Five: was there a check missing, the critic that should have caught this?',
    cap: 'Five — the missing check',
    info: { tpl: 'statement', data: { text: 'Five: was the check simply missing?', hi: 'missing' } } },

  { id: '12', mode: 'info',
    vo: 'Six: is this just a job the model is genuinely not good at?',
    cap: 'Six — the wrong job',
    info: { tpl: 'statement', data: { text: 'Six: is this simply the wrong job for it?', hi: 'the wrong job' } } },

  { id: '13', mode: 'ali',
    vo: 'Five of those six are fixed by an afternoon of work, not by a training run.',
    cap: 'Five of six are free',
    art: `${ALI}, standing with a relieved encouraged smile, both hands open in a light gesture, ${HERO}` },

  { id: '14', mode: 'info',
    vo: 'The ladder, in order, and you only reach the brain at the very top.',
    cap: 'The ladder',
    info: { tpl: 'screen', data: { title: 'Before you blame the model', lines: [
      { k: '1 · The ask', v: 'unclear or vague?' }, { k: '2 · The context', v: 'missing what it needed?' },
      { k: '3 · The tools', v: 'improvising without one?' }, { k: '4 · The workflow', v: 'too much in one step?' },
      { k: '5 · The check', v: 'no critic to catch it?' }, { k: '6 · The job', v: 'wrong task for a model?' } ] } } },

  { id: '15', mode: 'info',
    vo: 'So the whole series lands on one sentence you can build tomorrow.',
    cap: 'One sentence',
    info: { tpl: 'statement', data: { text: 'Build the room. Measure. Then decide about the brain.', hi: 'Build the room' } } },

  { id: '16', mode: 'scene',
    vo: 'A capable model, good tools, real memory, a check, a retry, and a human at the risky end.',
    cap: 'The whole shape',
    art: `${ALI} standing beside ${ROOM} with ${ORB} glowing warmly at its centre, a few simple tool shapes and a shelf floating around it, a soft open doorway on one side, ${STYLE}` },

  { id: '17', mode: 'info', holdAfter: 6,
    vo: 'Quick question: your AI keeps missing a discount rule nobody ever wrote down — what do you fix first?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'It keeps missing a rule nobody ever wrote down. Fix what first?',
      options: ['Fine-tune it on past discounts', 'Write the rule into its instructions', 'Switch to a bigger model', 'Have a person check every order'],
      note: 'Write your answer down.' } } },

  { id: '18', mode: 'info',
    vo: 'Write the rule down, because it was never told, not badly trained.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Fix what first?',
      options: ['Fine-tune it on past discounts', 'Write the rule into its instructions', 'Switch to a bigger model', 'Have a person check every order'],
      answer: 1, note: 'It was never told. Rung one of the ladder.' } } },

  { id: '19', mode: 'ali',
    vo: 'And that leaves the question Ali finds genuinely hard, and worth sitting with.',
    cap: 'The hard question',
    art: `${ALI}, standing quietly with a reflective serious expression, hands at his sides, ${HERO}` },

  { id: '20', mode: 'info',
    vo: 'Which parts of the system are allowed to improve themselves without asking?',
    cap: 'Allowed to change itself?',
    info: { tpl: 'statement', data: { text: 'Which parts may improve themselves without asking?', hi: 'without asking' } } },

  { id: '21', mode: 'ali',
    vo: 'Ali lets it update its own memory freely, because he can read every line.',
    cap: 'Memory — freely',
    art: `${ALI}, standing relaxed with an easy comfortable smile, one hand loosely open, ${HERO}, nothing else in the frame at all, no floating props, no speech bubbles, no cups, no leaves, no decorative shapes` },

  { id: '22', mode: 'info',
    vo: 'But the rules, the money, and the brain itself only change when a person says so.',
    cap: 'Rules and money — never alone',
    info: { tpl: 'twocard', data: { title: 'Who is allowed to change what',
      left: { title: 'It may change alone', items: ['Its own memory', 'What it retrieves', 'How it retries'] },
      right: { title: 'Only with a person', items: ['The rules', 'Anything about money', 'The model itself'] } } } },

  { id: '23', mode: 'ali',
    vo: 'Your turn: draw that line for your own tool, and write both sides down.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '24', mode: 'info',
    vo: 'Ask yourself: what may my system change on its own, and what always needs me?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'What may it change on its own — and what always needs me?' } } },

  { id: '25', mode: 'ali',
    vo: 'Recovering from a mistake is practical today; learning from one is the harder art.',
    cap: 'Recover, then learn',
    art: `${ALI}, facing the viewer with a warm confident smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["06", "16", "25"]; // i2v story beats (house rule: use-animations)
