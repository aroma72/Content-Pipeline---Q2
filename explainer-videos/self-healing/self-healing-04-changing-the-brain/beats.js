'use strict';
/*
 * beats.js — "Changing The Brain Itself" (Self-Healing & Self-Improving series, video 04).
 * CONTINUES V01–V03: same locked Ali (art/_ref.png), shop + AI helper, honey ORB = the brain,
 * room = harness. ONE concept: FINE-TUNING — the seventh place to store learning, the only one that
 * changes the brain, and the five conditions that have to be true before it is worth it (narrow task,
 * high volume, a real dataset, a measurable eval, a stable use case) plus the new world of work it
 * opens. Deliberately NOT a how-to-train video; it is a when-and-what-it-costs video.
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
    vo: 'You can change the brain itself, and five things should be true before you do.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Five things must be true before you change the brain.', hi: 'Five things' } } },

  { id: '02', mode: 'ali',
    vo: 'Every fix so far has lived in the room; now Ali looks at the brain.',
    cap: 'Now the brain',
    art: `${ALI}, standing with a considering thoughtful expression, hand near his chin, ${HERO}` },

  { id: '03', mode: 'info',
    vo: 'Fine-tuning means feeding it your own examples until its instincts shift.',
    cap: 'What it means',
    info: { tpl: 'statement', data: { text: 'Feed it your examples until its instincts shift.', hi: 'instincts shift' } } },

  { id: '04', mode: 'scene',
    vo: 'The orb itself changes colour, and that change stays after everyone goes home.',
    cap: 'The orb itself changes',
    art: `${ALI} standing beside ${ROOM} watching ${ORB} glowing in a noticeably deeper warmer amber than before, soft light spreading across the room walls, ${STYLE}` },

  { id: '05', mode: 'ali',
    vo: 'This is the one kind of learning you cannot undo by editing a document.',
    cap: 'You cannot undo it easily',
    art: `${ALI}, standing with a serious careful expression, one hand raised in a measured cautionary gesture, ${HERO}` },

  { id: '06', mode: 'info',
    vo: 'So before Ali reaches for it, he checks five conditions in order.',
    cap: 'Five conditions',
    info: { tpl: 'statement', data: { text: 'Five conditions, checked in order.', hi: 'in order' } } },

  { id: '07', mode: 'info',
    vo: 'One: the task is narrow, well defined, and the same shape every single time.',
    cap: 'One — a narrow task',
    info: { tpl: 'statement', data: { text: 'One: a narrow, well-defined, repeating task.', hi: 'narrow' } } },

  { id: '08', mode: 'ali',
    vo: 'Sorting messages into four buckets qualifies; running the whole shop does not.',
    cap: 'Narrow, not everything',
    art: `${ALI}, standing and gesturing with both hands close together showing a small width, clear explaining expression, ${HERO}` },

  { id: '09', mode: 'info',
    vo: 'Two: the volume is high, so a small improvement is worth the whole effort.',
    cap: 'Two — high volume',
    info: { tpl: 'statement', data: { text: 'Two: enough volume that a small gain matters.', hi: 'high' } } },

  { id: '10', mode: 'info',
    vo: 'Three: you have a real dataset of good answers and bad ones, not opinions.',
    cap: 'Three — a real dataset',
    info: { tpl: 'statement', data: { text: 'Three: real examples of good and bad — not opinions.', hi: 'real examples' } } },

  { id: '11', mode: 'scene',
    vo: 'Ali has kept every corrected order for a year, and that pile is the dataset.',
    cap: 'The pile is the dataset',
    art: `${ALI} standing beside a tall neat stack of plain blank cards on a simple crate, ${ORB} glowing softly nearby, ${STYLE}` },

  { id: '12', mode: 'info',
    vo: 'Four: you can measure it, so you can prove the new brain beats the old one.',
    cap: 'Four — measurable',
    info: { tpl: 'statement', data: { text: 'Four: you can prove the new one is better.', hi: 'prove' } } },

  { id: '13', mode: 'ali',
    vo: 'Without a score, you have swapped a brain and simply hoped.',
    cap: 'Without a score, you hoped',
    art: `${ALI}, standing with a skeptical unconvinced expression, one eyebrow raised, arms lightly folded, ${HERO}` },

  { id: '14', mode: 'info',
    vo: 'Five: the task is stable, because a task that changes monthly outruns your training.',
    cap: 'Five — stable',
    info: { tpl: 'statement', data: { text: 'Five: a stable task — training cannot chase a moving one.', hi: 'stable' } } },

  { id: '15', mode: 'info',
    vo: 'All five true, and fine-tuning your own open model starts to make real sense.',
    cap: 'All five true',
    info: { tpl: 'screen', data: { title: 'Before you fine-tune', lines: [
      { k: 'Narrow', v: 'one well-defined task' }, { k: 'High volume', v: 'the gain is worth it' },
      { k: 'Real data', v: 'good and bad examples' }, { k: 'Measurable', v: 'you can prove it improved' },
      { k: 'Stable', v: 'the task is not moving' } ] } } },

  { id: '16', mode: 'ali',
    vo: 'And then Ali is standing in a completely different kind of workshop.',
    cap: 'A different workshop',
    art: `${ALI}, standing and looking around with a slightly overwhelmed but curious expression, ${HERO}` },

  { id: '17', mode: 'info',
    vo: 'Now he owns data quality, training runs, serving the model, and its costs.',
    cap: 'What he now owns',
    info: { tpl: 'statement', data: { text: 'Data quality, training, serving, and the bills.', hi: 'the bills' } } },

  { id: '18', mode: 'info',
    vo: 'Plus versions, drift as the world moves, and maintenance that never ends.',
    cap: 'And it never ends',
    info: { tpl: 'screen', data: { title: 'The new job you just took', lines: [
      { k: 'Data', v: 'clean it, label it, keep it' }, { k: 'Training', v: 'pipelines and hardware' },
      { k: 'Serving', v: 'run it, pay for it' }, { k: 'Versions', v: 'which brain is live?' },
      { k: 'Drift', v: 'the world moves, it does not' } ] } } },

  { id: '19', mode: 'ali',
    vo: 'That is not a reason to never do it; it is a reason to be sure first.',
    cap: 'Be sure first',
    art: `${ALI}, standing calm and steady with a balanced reassuring expression, hands open, ${HERO}` },

  { id: '20', mode: 'info', holdAfter: 6,
    vo: 'Quick question: your AI writes weak replies and the task changes every few weeks — fine-tune?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'Weak replies, and the task changes every few weeks. Fine-tune?',
      options: ['Yes — weak output means a weak model', 'No — the task is not stable, so training cannot keep up', 'Yes, if you can afford the hardware', 'Only with a bigger model'],
      note: 'Write your answer down.' } } },

  { id: '21', mode: 'info',
    vo: 'No, because a task that keeps moving will always outrun the training.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Fine-tune a task that changes every few weeks?',
      options: ['Yes — weak output means a weak model', 'No — the task is not stable, so training cannot keep up', 'Yes, if you can afford the hardware', 'Only with a bigger model'],
      answer: 1, note: 'Fine-tuning needs a task that holds still.' } } },

  { id: '22', mode: 'ali',
    vo: 'Your turn: take the task you would train for and check it against all five.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '23', mode: 'info',
    vo: 'Ask yourself: is it narrow, high volume, measurable, stable, and do I have the data?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'Narrow? High volume? Real data? Measurable? Stable? All five, or not yet.' } } },

  { id: '24', mode: 'ali',
    vo: 'Change the brain last, and only when the room has run out of answers.',
    cap: 'Change the brain last',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["04", "11", "24"]; // i2v story beats (house rule: use-animations)
