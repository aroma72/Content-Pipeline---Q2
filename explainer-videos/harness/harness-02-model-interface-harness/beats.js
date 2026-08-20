'use strict';
/*
 * beats.js — "Harness vs Model vs Interface" (The Harness series, video 02).
 * CONTINUES V1 (harness-01): same locked Ali (art/_ref.png), same shop + AI helper, same
 * glowing honey ORB = the brain, same "room of objects" = the harness. ONE concept: three
 * parts get confused — brain (model), window (interface), room (harness) — and only the room
 * decides what gets done. ONE move: two controlled swaps (swap the window; swap the brain).
 *
 * Teaching spine (research.md): hold everything constant, change ONE part at a time. Swap the
 * window -> work unchanged (window != worker). Swap the brain into a bare room -> still nothing
 * (brain alone != worker). What's left as the cause is the room = the harness.
 * CAMERA-PAN build: stills + Ken Burns / cutout-puppet only — NO i2v clips. No baked text.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const DESK = 'sitting at a tidy small wooden desk with an open laptop';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const ORB = 'a soft glowing rounded orb of warm honey light representing the AI brain, friendly and simple';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'The harness, not the brain or the app, decides what actually gets done.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'The harness decides what gets done.', hi: 'harness', sub: 'Not the brain, not the app.' } } },

  { id: '02', mode: 'ali',
    vo: 'Ali now knows his helper is a clever brain living inside a room.',
    cap: 'Brain in a room',
    art: `${ALI}, standing with a calm confident nod and a small knowing smile, ${HERO}` },

  { id: '03', mode: 'ali',
    vo: 'But he keeps mixing up three parts, so let us name them clearly.',
    cap: 'Three parts',
    art: `${ALI}, standing and clearly holding up exactly THREE fingers to count to three — index, middle and ring fingers fully extended and spread, thumb and little finger folded down into the palm, palm facing the viewer at shoulder height, friendly explaining gesture, ${HERO}` },

  { id: '04', mode: 'info',
    vo: 'One: the brain, the clever part that thinks in words.',
    cap: 'The brain = the model',
    info: { tpl: 'statement', data: { text: 'The brain: the part that thinks.', hi: 'brain', sub: 'People also call it the model.' } } },

  { id: '05', mode: 'info',
    vo: 'Two: the window, the screen or app you talk through.',
    cap: 'The window = the interface',
    info: { tpl: 'statement', data: { text: 'The window: what you talk through.', hi: 'window', sub: 'A chat box, an app, a screen.' } } },

  { id: '06', mode: 'info',
    vo: 'Three: the room, everything that actually does the work.',
    cap: 'The room = the harness',
    info: { tpl: 'statement', data: { text: 'The room: what does the work.', hi: 'room', sub: 'This one is the harness.' } } },

  { id: '07', mode: 'ali',
    vo: 'Mixing these three up is easy, and almost everyone does it.',
    cap: 'Easy to mix up',
    art: `${ALI}, facing the viewer with a reassuring open-handed shrug and a warm gentle smile, ${HERO}` },

  { id: '08', mode: 'scene',
    vo: 'Today Ali talks to his helper through a chat box on his laptop.',
    cap: 'A chat box',
    art: `${ALI} ${DESK}, typing to ${ORB} shown beside a plain empty rounded chat bubble on the screen, warm light, ${STYLE}` },

  { id: '09', mode: 'scene',
    vo: 'Tomorrow he uses a phone app instead, but it is the same helper.',
    cap: 'A phone app',
    art: `${ALI} standing and holding up a smartphone showing the same soft glowing honey orb on its screen, calm and relaxed, plain warm room, ${STYLE}` },

  { id: '10', mode: 'info',
    vo: 'Different window, yet the work it does is exactly the same.',
    cap: 'Same work either way',
    info: { tpl: 'screen', data: { title: 'Same helper, same result', lines: [
      { k: 'Laptop chat box', v: 'same work' }, { k: 'Phone app', v: 'same work' } ] } } },

  { id: '11', mode: 'ali',
    vo: 'Swapping the window never changes what the helper can actually do.',
    cap: 'Window ≠ the worker',
    art: `${ALI}, standing with a small knowing smile and a gentle dismissive wave of one hand, ${HERO}` },

  { id: '12', mode: 'info',
    vo: 'So a prettier app does not make a smarter helper.',
    cap: 'Prettier ≠ smarter',
    info: { tpl: 'statement', data: { text: 'A prettier app is not a smarter helper.', hi: 'not' } } },

  { id: '26', mode: 'info', holdAfter: 6,
    vo: 'Quick question: you swap the chat app for a phone app, so what changes?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'Swap the chat app for a phone app. What changes about what the helper can do?',
      options: ['It gets smarter', 'It gets faster', 'Nothing — the window only changes how you reach it', 'It forgets everything'],
      note: 'Write your answer down.' } } },

  { id: '27', mode: 'info',
    vo: 'Nothing changes; the window is only how you reach the room.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'What changes when you swap the window?',
      options: ['It gets smarter', 'It gets faster', 'Nothing — the window only changes how you reach it', 'It forgets everything'],
      answer: 2, note: 'The window is presentation; the room does the work.' } } },

  { id: '13', mode: 'scene',
    vo: 'Now Ali tries the opposite: a cleverer brain, but the same bare room.',
    cap: 'A cleverer brain',
    art: `${ALI} ${DESK}, watching a bigger brighter honey orb glowing above an otherwise empty bare desk with no telephone, keys or notebook, ${STYLE}` },

  { id: '14', mode: 'info',
    vo: 'The cleverer brain writes an even better plan, and still nothing happens.',
    cap: 'Better plan, no action',
    info: { tpl: 'statement', data: { text: 'A better plan, still nothing done.', hi: 'nothing' } } },

  { id: '15', mode: 'ali',
    vo: 'A smarter brain in a bare room is still completely stuck.',
    cap: 'Brain alone ≠ the worker',
    art: `${ALI}, standing and gesturing to an empty space with a rueful shrug, one eyebrow raised, ${HERO}` },

  { id: '16', mode: 'info',
    vo: 'The brain thinks, the window shows, but only the room does the work.',
    cap: 'Three parts, three jobs',
    info: { tpl: 'screen', data: { title: 'Three parts, three jobs', lines: [
      { k: 'Brain', v: 'thinks' }, { k: 'Window', v: 'shows' }, { k: 'Room', v: 'does the work' } ] } } },

  { id: '17', mode: 'info',
    vo: 'That room, the one that does the work, is the harness.',
    cap: 'The room is the harness',
    info: { tpl: 'statement', data: { text: 'The room that works is the harness.', hi: 'harness' } } },

  { id: '18', mode: 'info',
    vo: 'And the room is more than its tools; it decides when to use each one.',
    cap: 'More than a toolbox',
    info: { tpl: 'statement', data: { text: 'The room decides when to use each tool.', hi: 'when' } } },

  { id: '19', mode: 'ali',
    vo: 'So when the helper feels weak, Ali fixes the room, not the screen.',
    cap: 'Fix the room',
    art: `${ALI}, standing and rolling up his sleeves with a purposeful, determined look, ${HERO}` },

  { id: '20', mode: 'info',
    vo: 'That is freeing, because you can improve the part that truly matters.',
    cap: 'You can fix what matters',
    info: { tpl: 'statement', data: { text: 'You can fix the part that matters.', hi: 'matters' } } },

  { id: '21', mode: 'info',
    vo: 'Brain plus room is the helper; the window is just how you reach it.',
    cap: 'How it all fits',
    info: { tpl: 'statement', data: { text: 'Brain + room = the helper.', hi: 'room', sub: 'The window is just how you reach it.' } } },

  { id: '22', mode: 'ali',
    vo: 'So Ali stops shopping for prettier apps and starts building better rooms.',
    cap: 'Build better rooms',
    art: `${ALI}, standing with a satisfied confident smile and a small decisive nod, ${HERO}` },

  { id: '23', mode: 'ali',
    vo: 'Your turn: name the brain, window, and room in a tool you use.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '24', mode: 'info',
    vo: 'And ask yourself this: am I fixing the window, or the room?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'Am I fixing the window, or the room that does the work?' } } },

  { id: '25', mode: 'ali',
    vo: 'Change the window all you like; the harness is what gets things done.',
    cap: 'The harness gets it done',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["09","13","25"]; // i2v story beats (house rule: use-animations)
