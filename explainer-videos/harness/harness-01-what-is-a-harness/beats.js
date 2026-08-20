'use strict';
/*
 * beats.js — "What IS a Harness?" (The Harness series, video 01).
 * CONTINUES The Autonomy Dial series: same locked Ali (art/_ref.png), same shop + AI helper.
 * Autonomy taught Ali HOW MUCH his helper may act. This series goes deeper: WHAT actually
 * lets it act at all. ONE concept: the harness is the "room/body" around the AI "brain" that
 * turns talk into done work. ONE move: build a room around the brain.
 *
 * Teaching spine (from research.md): before -> after on ONE unchanged brain. The AI "brain" is
 * drawn as a soft glowing honey orb (consistent series visual); the harness is the room of
 * plain objects built around it (desk, phone, keys, notebook, small rulebook). No baked text.
 * CAMERA-PAN build: stills + Ken Burns / cutout-puppet only — NO i2v clips.
 *
 * Modes: scene = in-place art (Ken Burns) · ali = clean-hero cutout puppet (+optional overlay) ·
 *        info = crisp HTML (statements, lists, comparisons). No baked text in any image.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const DESK = 'sitting at a tidy small wooden desk with an open laptop';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const ORB = 'a soft glowing rounded orb of warm honey light on the laptop screen, friendly and simple, representing the AI';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'A clever AI on its own can only talk; a harness is what lets it act.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'A harness lets it act.', hi: 'act', sub: 'On its own, an AI can only talk.' } } },

  { id: '02', mode: 'ali',
    vo: 'Ali spent last month setting how much his helper may do.',
    cap: 'He set how much',
    art: `${ALI}, standing and gesturing calmly toward an imagined dial on the wall, settled and confident, ${HERO}` },

  { id: '03', mode: 'ali',
    vo: 'Today a simpler question stops him: what even is this helper?',
    cap: 'A simpler question',
    art: `${ALI}, standing with a curious thoughtful tilt of the head, one finger raised, wondering, ${HERO}` },

  { id: '04', mode: 'scene',
    vo: 'He looks closely, and the helper is really just words appearing on a screen.',
    cap: 'Just words on a screen',
    art: `${ALI} ${DESK}, leaning in and studying ${ORB}, warm light, ${STYLE}` },

  { id: '05', mode: 'info',
    vo: 'The clever part, the brain, only reads words and writes words.',
    cap: 'The brain, in words',
    info: { tpl: 'statement', data: { text: 'The brain only reads and writes words.', hi: 'words' } } },

  { id: '06', mode: 'scene',
    vo: 'So Ali types, please restock the low shelf, and waits.',
    cap: 'He asks it to act',
    art: `${ALI} ${DESK}, typing a short hopeful message with ${ORB}, a nearly empty shop shelf visible behind him, ${STYLE}` },

  { id: '07', mode: 'scene',
    vo: 'The helper writes a lovely, careful plan, and then stops.',
    cap: 'A plan, then nothing',
    art: `${ALI} ${DESK}, watching ${ORB} beside a small floating paper note shape, expectant, the shelf still empty behind him, ${STYLE}` },

  { id: '08', mode: 'ali',
    vo: 'Nothing on the shelf moves; the plan just sits there.',
    cap: 'Nothing moves',
    art: `${ALI}, standing and looking at an unchanged half-empty wooden shelf with mild puzzlement, ${HERO}` },

  { id: '09', mode: 'ali',
    vo: 'This is not a broken helper; every AI starts exactly like this.',
    cap: 'This is normal',
    art: `${ALI}, facing the viewer with a calm reassuring open-handed gesture and a gentle smile, ${HERO}` },

  { id: '10', mode: 'info',
    vo: 'A brain like this is a brilliant advisor locked in a bare room.',
    cap: 'The advisor in a room',
    info: { tpl: 'statement', data: { text: 'A brilliant advisor, locked in a bare room.', hi: 'locked' } } },

  { id: '11', mode: 'info',
    vo: 'No phone, no keys, no notebook, he can only pass advice through a hatch.',
    cap: 'Can advise, cannot act',
    info: { tpl: 'statement', data: { text: 'Brilliant answers, but no phone, keys, or notebook.', hi: 'no' } } },

  { id: '12', mode: 'ali',
    vo: 'Perfect answers, but he cannot do a single thing himself.',
    cap: 'Perfect, but stuck',
    art: `${ALI}, standing with a small helpless shrug and open hands, a rueful expression, ${HERO}` },

  { id: '13', mode: 'scene',
    vo: 'So Ali builds a room around the brain.',
    cap: 'He builds a room',
    art: `${ALI} placing simple objects around ${ORB} on the desk, a small telephone, a ring of keys, a notebook and a small closed rulebook, warm and purposeful, ${STYLE}` },

  { id: '14', mode: 'info',
    vo: 'That room around the brain has a name: the harness.',
    cap: 'This is the harness',
    info: { tpl: 'statement', data: { text: 'This room is the harness.', hi: 'harness' } } },

  { id: '15', mode: 'info',
    vo: 'The harness is simply everything around the AI that is not the brain.',
    cap: 'A plain definition',
    info: { tpl: 'statement', data: { text: 'Everything around the AI that is not the brain.', hi: 'not the brain' } } },

  { id: '16', mode: 'info',
    vo: 'It takes the task, uses tools, keeps notes, checks rules, and returns the result.',
    cap: 'What the harness does',
    info: { tpl: 'screen', data: { title: 'What the harness does', lines: [
      { k: 'Takes the task', v: '✓' }, { k: 'Uses tools', v: '✓' }, { k: 'Keeps notes', v: '✓' },
      { k: 'Checks the rules', v: '✓' }, { k: 'Brings back the result', v: '✓' } ] } } },

  { id: '17', mode: 'scene',
    vo: 'Now Ali types restock again, and this time the helper reaches for the phone.',
    cap: 'This time it acts',
    art: `${ALI} ${DESK}, smiling as ${ORB} lights up and a small telephone lifts beside it as if in use, warm light, ${STYLE}` },

  { id: '18', mode: 'ali',
    vo: 'The order goes out, and the shelf actually fills.',
    cap: 'The shelf fills',
    art: `${ALI}, standing beside a now-full wooden shop shelf with a pleased satisfied smile, ${HERO}` },

  { id: '19', mode: 'info',
    vo: 'Same brain both times; only the room around it changed.',
    cap: 'Same brain, new room',
    info: { tpl: 'twocard', data: {
      left: { title: 'Before', items: ['Just words', 'Nothing moved'] },
      right: { title: 'After', items: ['Same brain', 'The shelf filled'] } } } },

  { id: '20', mode: 'info',
    vo: 'A smarter brain in no room still does nothing at all.',
    cap: 'The common trap',
    info: { tpl: 'statement', data: { text: 'A smarter brain, no room, still does nothing.', hi: 'nothing' } } },

  { id: '28', mode: 'info', holdAfter: 6,
    vo: 'Quick question: the plan appeared but nothing happened, so what was missing?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'The helper wrote a plan, but nothing happened. What was missing?',
      options: ['A smarter model', 'A room around it: tools, memory, rules', 'A faster computer', 'A better question'],
      note: 'Write your answer down.' } } },

  { id: '21', mode: 'info',
    vo: 'Teams found the brain is only about a tenth of a working helper.',
    cap: 'Mostly the harness',
    info: { tpl: 'bignum', data: {
      left: { big: '1', lab: 'part is the brain' }, sep: '·',
      right: { big: '9', lab: 'parts are the harness', tone: 'good' } } } },

  { id: '29', mode: 'info',
    vo: 'The missing piece was the room around it: the harness.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'What was missing?',
      options: ['A smarter model', 'A room around it: tools, memory, rules', 'A faster computer', 'A better question'],
      answer: 1, note: 'The harness turns talk into action.' } } },

  { id: '22', mode: 'ali',
    vo: 'So the helper’s power was never only the brain, which is good news for Ali.',
    cap: 'Good news',
    art: `${ALI}, facing the viewer with a relieved knowing smile and a small reassured nod, ${HERO}` },

  { id: '23', mode: 'ali',
    vo: 'He had been building this room all along, without knowing its name.',
    cap: 'He knew it already',
    art: `${ALI}, standing with a dawning satisfied smile of recognition, a gentle nod, ${HERO}` },

  { id: '24', mode: 'info',
    vo: 'Brain plus room makes a helper that acts; model plus harness makes an agent.',
    cap: 'Model + harness = agent',
    info: { tpl: 'statement', data: { text: 'Model + harness = an agent.', hi: 'agent', sub: 'Brain plus room makes a helper that acts.' } } },

  { id: '25', mode: 'ali',
    vo: 'Your turn: look at one AI tool and name what its room lets it do.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '26', mode: 'info',
    vo: 'Ask your AI helper this: what tools, memory, and rules do you have around you?',
    cap: 'Ask this',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'What tools, memory, and rules do you have around you right now?' } } },

  { id: '27', mode: 'ali',
    vo: 'The brain thinks; the harness is what lets it act.',
    cap: 'Brain thinks, harness acts',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["13","17","27"]; // i2v story beats (house rule: use-animations)
