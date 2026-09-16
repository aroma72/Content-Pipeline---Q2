'use strict';
/*
 * beats.js — "Two Doors In: Connector or Key" (Notion + Slack module, video 02).
 * Script: ../Scripts/notion-slack-02-two-doors.md  ·  Facts: ../research.md (F1, F2, F3)
 *
 * ONE concept: there are exactly two ways in — a hosted MCP connector or an API token — and one
 * question decides which: am I at the keyboard, or is it running without me?
 *
 * Same locked Ali, same back room as video 01 (art/_ref.png seeds every image). The AI is a real
 * laptop with a blank screen; every URL, command and number lives on an `info` card, never in art.
 * Beat 18 is the CHECKPOINT (Standard §3b): nothing drawn, nothing spoken — the player pauses there,
 * the LMS asks, gives feedback on the answer, and resumes.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background, BOTH EYES OPEN and symmetrical, never winking, never one eye closed`;
const ROOM = 'in the back room of Ali\'s small stationery shop, cream walls, a wooden desk against ' +
  'the wall, a fat paper order file with a worn cardboard cover lying on the desk, a chipped blue ' +
  'enamel mug, a round wall clock, stacked cardboard boxes of notebooks behind him, a doorway on ' +
  'the right opening onto the shop floor';
const LAPTOP = 'a simple boxy cream-coloured laptop open on the desk, its screen a blank pale ' +
  'rectangle, plain and unbranded with no logo, badge, sticker or marking anywhere on it';
const NIGHT = 'the same back room at night with the lights off, cool blue-grey shadows, the wall ' +
  'clock faintly lit, the desk chair empty and pushed back';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'If you are at the keyboard, use a connector. If it runs without you, use a token.',
    cap: 'The one rule',
    info: { tpl: 'statement', data: { text: 'At the keyboard → connector. Running without you → token.', hi: 'without you' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali wants two things from his agent this week.',
    cap: 'Two things this week',
    art: `${ALI} standing at the desk holding up two fingers, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'In the evening, he wants to ask his order records questions himself.',
    cap: 'Evening — he is there',
    art: `${ALI} seated at the desk in warm evening light, leaning toward the open laptop with the chipped blue mug beside him, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '04', mode: 'scene',
    vo: 'At six in the morning, he wants a digest already waiting in the shop chat.',
    cap: 'Six a.m. — he is not',
    art: `${ALI} asleep is not shown; instead the empty desk in early grey dawn light, the laptop closed, the wall clock showing early morning, ${ROOM}, ${STYLE}` },

  { id: '05', mode: 'info',
    vo: 'Same two tools. Two completely different doors.',
    cap: 'Two jobs, two doors',
    info: { tpl: 'twocard', data: {
      left: { title: 'Evening', body: 'he is at the keyboard, asking' },
      right: { title: 'Six a.m.', body: 'nobody is there at all' } } } },

  { id: '06', mode: 'ali',
    vo: 'He starts where most beginners start, writing his own code for both.',
    cap: 'The usual first move',
    art: `${ALI}, determined, sleeves rolled, a focused expression, ${HERO}` },

  { id: '07', mode: 'scene',
    vo: 'Three evenings later, he still has not asked a single question.',
    cap: 'Three evenings gone',
    art: `${ALI} slumped slightly at the desk with his chin on one hand, the chipped blue mug cold beside him, ${LAPTOP}, the wall clock showing late evening, ${ROOM}, ${STYLE}` },

  { id: '08', mode: 'ali',
    vo: 'That was not a coding failure. He picked the harder door for the easier job.',
    cap: 'Not a coding failure',
    art: `${ALI}, a kind reassuring expression, open and calm, ${HERO}` },

  { id: '09', mode: 'info',
    vo: 'Door one is a connector, already built and kept up to date for you.',
    cap: 'Door one — the connector',
    info: { tpl: 'twocard', data: {
      left: { title: 'Connector', body: 'built, maintained, sign in once', hi: true },
      right: { title: 'Token', body: 'your code, your keys' } } } },

  { id: '10', mode: 'info',
    vo: 'One line adds it.',
    cap: 'One line',
    info: { tpl: 'promptcard', data: { title: 'Add the Notion connector', lines: [
      'claude mcp add --transport http notion \\',
      '  https://mcp.notion.com/mcp' ] } } },

  { id: '11', mode: 'ali',
    vo: 'He signs in through the browser once, and there is no token to keep anywhere.',
    cap: 'Sign in once',
    art: `${ALI}, relieved and slightly surprised, both eyebrows up, ${HERO}` },

  { id: '12', mode: 'scene',
    vo: 'That same evening he asks his records a question and reads the answer aloud.',
    cap: 'Answered the same evening',
    art: `${ALI} seated at the desk leaning in toward the laptop with a pleased smile, one hand raised mid-gesture, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '13', mode: 'info',
    vo: 'Slack has an official one too.',
    cap: 'Slack has one as well',
    info: { tpl: 'screen', data: { title: 'The two hosted connectors', lines: [
      'mcp.notion.com/mcp',
      'mcp.slack.com/mcp   — generally available 17 Feb 2026' ] } } },

  { id: '14', mode: 'info',
    vo: 'A workspace admin must approve it, so ask on day one, not on day three.',
    cap: 'Ask your admin early',
    info: { tpl: 'statement', data: { text: 'An admin must approve it. Ask on day one.', hi: 'day one' } } },

  { id: '15', mode: 'ali',
    vo: 'But the six o\'clock digest has a problem the connector cannot solve.',
    cap: 'One job it cannot do',
    art: `${ALI}, thoughtful, a questioning look, ${HERO}` },

  { id: '16', mode: 'scene',
    vo: 'At six in the morning the back room is dark and the chair is empty.',
    cap: 'Nobody is there to sign in',
    art: `${NIGHT}, ${LAPTOP} closed, the fat paper order file on the desk, stacked cardboard boxes of notebooks behind, ${STYLE}` },

  { id: '17', mode: 'info',
    vo: 'A connector needs a person signed in. A token does not.',
    cap: 'The hinge',
    info: { tpl: 'twocard', data: {
      left: { title: 'Connector', body: 'needs a person signed in' },
      right: { title: 'Token', body: 'runs with nobody there', hi: true } } } },

  // ── the checkpoint: nothing on screen; the player stops and the LMS asks ──
  { id: '18', mode: 'checkpoint',
    quiz: {
      stem: 'Which of these needs an API token rather than a connector?',
      options: [
        'Asking your notes a question while you work',
        'Posting a digest at six a.m. with nobody watching',
        'Drafting a page you will review right now',
        'Searching the workspace during a call',
      ],
      answer: 1,
      correctNote: 'Exactly. At six in the morning nobody is there to sign in, and a connector needs a signed-in person. That is the whole test: am I at the keyboard, or is it running without me?',
      explain: 'It is the six a.m. digest. A connector works through your own signed-in session, so it can only act while you are there — and at six in the morning nobody is. The other three all happen while you are sitting at the keyboard, which is exactly when a connector is the faster, safer choice.',
    } },

  { id: '19', mode: 'ali',
    vo: 'So Ali keeps the connector for himself, and adds a token for the schedule.',
    cap: 'One project, two doors',
    art: `${ALI}, decisive and settled, a small confident smile, ${HERO}` },

  { id: '20', mode: 'info',
    vo: 'Tokens are also the only door for reacting the moment something changes.',
    cap: 'Token-only jobs',
    info: { tpl: 'checks', data: { items: [
      'Runs on a schedule',
      'Reacts to an event',
      'Runs on a server, with nobody watching' ] } } },

  { id: '21', mode: 'ali',
    vo: 'A connector waits to be asked. It cannot be woken up by a change.',
    cap: 'It waits to be asked',
    art: `${ALI}, patient, hands relaxed, a calm explaining expression, ${HERO}` },

  { id: '22', mode: 'scene',
    vo: 'One project, two doors, chosen job by job.',
    cap: 'Chosen job by job',
    art: `${ALI} standing at the desk writing on a small whiteboard propped against the wall, the marks on it abstract strokes with no readable letters, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '23', mode: 'info',
    vo: 'Ask one thing. Am I at the keyboard, or is it running without me?',
    cap: 'The question to ask',
    info: { tpl: 'quote', data: { text: 'Am I at the keyboard, or is it running without me?' } } },

  { id: '24', mode: 'ali',
    vo: 'Your turn. Name the one job of yours that runs while you sleep.',
    cap: 'Your turn',
    art: `${ALI}, looking directly forward, warm and inviting, ${HERO}` },

  { id: '25', mode: 'ali',
    vo: 'That job needs a token. Everything else can start tonight with a connector.',
    cap: 'Start tonight',
    art: `${ALI}, an encouraging confident smile, ${HERO}` },
];

module.exports.title = 'Two Doors In: Connector or Key';
module.exports.character = ALI;
module.exports.refPrompt = `${ALI}, neutral friendly expression, arms relaxed at his sides, ${HERO}`;
// i2v story beats for THIS video: the three lost evenings, the answer landing, the empty dawn room
module.exports.animateIds = ['07', '12', '16'];
