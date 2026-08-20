'use strict';
/*
 * beats.js — "A Safe Room You Can See Into & Grow" (The Harness series, video 06, finale).
 * CONTINUES V1–V5: same locked Ali (art/_ref.png), shop + AI helper, glowing honey ORB = brain,
 * room = harness. ONE concept: a room you can trust is WALLED (sandbox), WATCHED (observability +
 * replay), and able to GROW (extension surface). RESHAPED to avoid autonomy (rules/guardrails/when-
 * to-ask) and evals (measuring) — explicit one-line nod to the autonomy series for the rules.
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
    vo: 'A room you can trust is walled in, watched, and ready to grow.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Walled in, watched, and ready to grow.', hi: 'watched' } } },

  { id: '02', mode: 'ali',
    vo: 'Now his helper can act, Ali asks: can I trust this room?',
    cap: 'Can I trust it?',
    art: `${ALI}, standing with a thoughtful considering expression, hand near his chin, ${HERO}` },

  { id: '03', mode: 'info',
    vo: 'First, a safe place to run: a walled-off back room.',
    cap: 'A walled-off room',
    info: { tpl: 'statement', data: { text: 'First: a walled-off back room.', hi: 'walled-off' } } },

  { id: '04', mode: 'scene',
    vo: 'Inside it, if the helper knocks something over, nothing outside breaks.',
    cap: 'Mistakes stay inside',
    art: `${ALI} standing beside a cosy warm room with soft rounded walls around it, ${ORB} working inside, a small tipped cup contained safely within the walls, ${STYLE}` },

  { id: '05', mode: 'ali',
    vo: 'It is fair to hesitate here, so let the room prove itself first.',
    cap: 'Let it prove itself',
    art: `${ALI}, standing relaxed with an easy reassured smile, hands loose at his sides, ${HERO}` },

  { id: '06', mode: 'info',
    vo: 'That safe, walled place has a name: a sandbox.',
    cap: 'It is called a sandbox',
    info: { tpl: 'statement', data: { text: 'That safe place is a sandbox.', hi: 'sandbox' } } },

  { id: '07', mode: 'info',
    vo: 'Second, a window to watch: every action written down.',
    cap: 'A window to watch',
    info: { tpl: 'statement', data: { text: 'Second: a window to watch.', hi: 'window to watch' } } },

  { id: '08', mode: 'scene',
    vo: 'Ali can see each step it took, in order, like a logbook.',
    cap: 'Every step, in order',
    art: `${ALI} standing beside the room where a simple open logbook floats, its lines showing a neat ordered list of steps as gentle marks, ${STYLE}` },

  { id: '09', mode: 'ali',
    vo: 'And if something goes wrong, he can replay it and see exactly where.',
    cap: 'He can replay it',
    art: `${ALI}, standing and calmly reviewing something with an attentive focused look, ${HERO}` },

  { id: '10', mode: 'info',
    vo: 'Nothing the helper does happens in the dark.',
    cap: 'Nothing in the dark',
    info: { tpl: 'statement', data: { text: 'Nothing happens in the dark.', hi: 'in the dark' } } },

  { id: '11', mode: 'info',
    vo: 'Third, room to grow: the power to add new tools later.',
    cap: 'Room to grow',
    info: { tpl: 'statement', data: { text: 'Third: room to grow.', hi: 'room to grow' } } },

  { id: '12', mode: 'scene',
    vo: 'As the shop gets bigger, Ali snaps on a new tool without rebuilding.',
    cap: 'Add tools, no rebuild',
    art: `${ALI} standing beside the room, gently placing one new simple tool shape in among a few tools already floating near ${ORB}, ${STYLE}` },

  { id: '13', mode: 'ali',
    vo: 'The room he can extend is the room that lasts.',
    cap: 'A room that lasts',
    art: `${ALI}, standing with a confident satisfied smile and a small approving nod, ${HERO}` },

  { id: '14', mode: 'info',
    vo: 'New tools and new skills, snapped on as he needs them.',
    cap: 'Snapped on as needed',
    info: { tpl: 'statement', data: { text: 'New tools, snapped on as needed.', hi: 'snapped on' } } },

  { id: '15', mode: 'info',
    vo: 'A sandbox, a window, and room to grow — a room you can trust.',
    cap: 'A room you can trust',
    info: { tpl: 'screen', data: { title: 'A room you can trust', lines: [
      { k: 'A sandbox', v: 'safe to run' }, { k: 'A window', v: 'watch & replay' },
      { k: 'Room to grow', v: 'add new tools' } ] } } },

  { id: '23', mode: 'info', holdAfter: 6,
    vo: 'Quick question: why can Ali let the helper try things without risking the shop?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'Why can Ali let the helper try things without risking the shop?',
      options: ['He watches it every second', 'It runs in a sandbox — a walled room where mistakes stay inside', 'It never makes mistakes', 'He removed all its tools'],
      note: 'Write your answer down.' } } },

  { id: '24', mode: 'info',
    vo: 'It runs in a sandbox, so any mistake stays safely inside.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Why is it safe to let it try?',
      options: ['He watches it every second', 'It runs in a sandbox — a walled room where mistakes stay inside', 'It never makes mistakes', 'He removed all its tools'],
      answer: 1, note: 'The sandbox contains mistakes; the shop stays safe.' } } },

  { id: '16', mode: 'ali',
    vo: 'You do not have to trust it on faith; the room earns it.',
    cap: 'The room earns trust',
    art: `${ALI}, facing the viewer with a warm reassuring smile and a small confident nod, ${HERO}` },

  { id: '17', mode: 'info',
    vo: 'You already set the rules; this is the safe place they run in.',
    cap: 'Rules run here',
    info: { tpl: 'statement', data: { text: 'You set the rules; this is where they run.', hi: 'where they run' } } },

  { id: '18', mode: 'ali',
    vo: 'A walled room you can watch and grow is a room you can leave running.',
    cap: 'Safe to leave running',
    art: `${ALI}, standing calm and confident with a settled, at-ease expression, ${HERO}` },

  { id: '19', mode: 'ali',
    vo: 'You have now built the whole room, from the brain to the walls around it.',
    cap: 'The whole room',
    art: `${ALI}, facing the viewer with a proud warm smile and an open welcoming gesture, ${HERO}` },

  { id: '20', mode: 'ali',
    vo: 'Your turn: for one AI tool, find its sandbox, its log, and how it grows.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '21', mode: 'info',
    vo: 'Ask yourself: where is my sandbox, my log, and how do I add a tool?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'Where is my sandbox, where is my log, and how do I add a tool?' } } },

  { id: '22', mode: 'ali',
    vo: 'Walled, watched, and able to grow — that is a room you can trust.',
    cap: 'A room you can trust',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["04","12","22"]; // i2v story beats (house rule: use-animations)
