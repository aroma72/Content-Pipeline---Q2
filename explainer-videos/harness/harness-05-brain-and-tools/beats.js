'use strict';
/*
 * beats.js — "Choosing a Brain & Using Tools" (The Harness series, video 05).
 * CONTINUES V1–V4: same locked Ali (art/_ref.png), shop + AI helper, glowing honey ORB = brain,
 * room = harness. ONE concept: a good room makes three "right" choices for the brain — the right
 * BRAIN (routing), the right TOOLS (execution, with a rule + checkable), and the right CONTEXT
 * (what it's shown now + a few lasting facts). Distinct from V4 (job-state) and autonomy (freedom).
 * CAMERA-PAN build: stills + Ken Burns / cutout-puppet only — NO i2v clips. No baked text.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const ORB = 'a smooth simple glowing ball of warm honey light representing the AI, a plain featureless round orb with one soft highlight, no brain shape, no folds, no face, absolutely no text, no letters, no words on it';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'A brain is as good as what the room hands it.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'A brain is as good as what it is handed.', hi: 'what it is handed' } } },

  { id: '02', mode: 'ali',
    vo: 'Ali’s helper is clever, but the room still makes three choices for it.',
    cap: 'Three choices',
    art: `${ALI}, standing and holding up three fingers, index, middle and ring extended with thumb and little finger folded, in a friendly explaining gesture, ${HERO}` },

  { id: '03', mode: 'info',
    vo: 'Choice one: which brain to use for this step.',
    cap: 'Which brain',
    info: { tpl: 'statement', data: { text: 'Choice one: which brain.', hi: 'which brain' } } },

  { id: '04', mode: 'scene',
    vo: 'A quick, cheap brain handles the small, easy jobs.',
    cap: 'A quick brain',
    art: `${ALI} standing beside a small smooth plain glowing honey orb, a featureless ball of light with no text and no brain shape, doing a tiny light task, relaxed, plain warm room, ${STYLE}` },

  { id: '05', mode: 'scene',
    vo: 'And a deeper, stronger brain is saved for the hard one.',
    cap: 'A stronger brain',
    art: `${ALI} standing beside a larger brighter smooth plain honey orb, a featureless ball of light with no text and no brain shape, glowing intensely for a serious task, focused, plain warm room, ${STYLE}` },

  { id: '06', mode: 'ali',
    vo: 'The room picks the right brain for the step, not one brain for everything.',
    cap: 'Right brain per step',
    art: `${ALI}, standing and gesturing thoughtfully between two imagined options with a considered look, ${HERO}` },

  { id: '07', mode: 'info',
    vo: 'Choice two: which tools to put in its hands.',
    cap: 'Which tools',
    info: { tpl: 'statement', data: { text: 'Choice two: which tools.', hi: 'which tools' } } },

  { id: '08', mode: 'scene',
    vo: 'A brain thinks, but a tool lets it act: a calculator, files, a phone.',
    cap: 'Tools let it act',
    art: `${ALI} standing beside ${ORB} with a few simple tool shapes floating detached nearby, a small calculator, a folder of files, and a telephone, ${STYLE}` },

  { id: '09', mode: 'info',
    vo: 'The room hands over each tool with a rule for using it right.',
    cap: 'Each tool, a rule',
    info: { tpl: 'statement', data: { text: 'Each tool comes with a rule.', hi: 'a rule' } } },

  { id: '10', mode: 'ali',
    vo: 'So the tool is used correctly, and the room can check what it did.',
    cap: 'Used right, checkable',
    art: `${ALI}, standing and watching with a calm attentive nod, one hand gesturing approval, ${HERO}` },

  { id: '11', mode: 'info',
    vo: 'Choice three: what to show the brain right now.',
    cap: 'What to show it',
    info: { tpl: 'statement', data: { text: 'Choice three: what to show it.', hi: 'what to show it' } } },

  { id: '12', mode: 'scene',
    vo: 'The room hands it the right notes and the right pages for this step.',
    cap: 'The right notes',
    art: `${ALI} standing beside ${ORB} as a few simple relevant pages and note cards float neatly toward it, ${STYLE}` },

  { id: '13', mode: 'info',
    vo: 'Not everything it ever knew, but what this one step needs.',
    cap: 'Just what this step needs',
    info: { tpl: 'statement', data: { text: 'Not everything at once — what this step needs.', hi: 'this step needs' } } },

  { id: '14', mode: 'ali',
    vo: 'Show it too much, it loses the thread; show the right thing, it flies.',
    cap: 'Too much loses the thread',
    art: `${ALI}, standing and miming a balancing gesture with both hands, a focused expression, ${HERO}` },

  { id: '15', mode: 'info',
    vo: 'It can also keep a few lasting facts, so it remembers you next time.',
    cap: 'A few lasting facts',
    info: { tpl: 'statement', data: { text: 'A few lasting facts, kept for next time.', hi: 'next time' } } },

  { id: '16', mode: 'info',
    vo: 'Right brain, right tools, right context — the room hands all three.',
    cap: 'The room hands three',
    info: { tpl: 'screen', data: { title: 'The room hands the brain…', lines: [
      { k: 'The right brain', v: 'per step' }, { k: 'The right tools', v: 'with a rule' },
      { k: 'The right context', v: 'enough' } ] } } },

  { id: '23', mode: 'info', holdAfter: 6,
    vo: 'Quick question: for an easy little step, which brain should the room pick?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'For an easy little step, which brain should the room use?',
      options: ['Always the biggest, strongest one', 'A quick, cheap one — save the strong brain for hard steps', 'No brain at all', 'A different brain every time'],
      note: 'Write your answer down.' } } },

  { id: '24', mode: 'info',
    vo: 'A quick, cheap brain; the strong one is saved for the hard steps.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Which brain for an easy step?',
      options: ['Always the biggest, strongest one', 'A quick, cheap one — save the strong brain for hard steps', 'No brain at all', 'A different brain every time'],
      answer: 1, note: 'The room routes each step to the right-sized brain.' } } },

  { id: '17', mode: 'ali',
    vo: 'This is why the same brain can feel brilliant in one room and lost in another.',
    cap: 'Same brain, different room',
    art: `${ALI}, standing with a thoughtful dawning expression, one finger raised as if realising, ${HERO}` },

  { id: '18', mode: 'info',
    vo: 'The brain does the thinking; the room decides what it thinks about.',
    cap: 'The room decides the input',
    info: { tpl: 'statement', data: { text: 'The room decides what it thinks about.', hi: 'what it thinks about' } } },

  { id: '19', mode: 'ali',
    vo: 'So a great helper is not a lucky brain; it is a well-stocked room.',
    cap: 'A well-stocked room',
    art: `${ALI}, facing the viewer with a warm confident reassured smile and a small nod, ${HERO}` },

  { id: '20', mode: 'ali',
    vo: 'Your turn: pick one task and name the brain, the tools, and the notes it needs.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '21', mode: 'info',
    vo: 'Ask yourself this: which brain, which tools, and which notes?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'For this task — which brain, which tools, and which notes?' } } },

  { id: '22', mode: 'ali',
    vo: 'Right brain, right tools, right notes — that is a room that thinks well.',
    cap: 'A room that thinks well',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["08","12","22"]; // i2v story beats (house rule: use-animations)
