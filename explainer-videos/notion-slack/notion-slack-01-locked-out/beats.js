'use strict';
/*
 * beats.js — "Locked Out of the Room" (Connecting Your Agent to Notion and Slack, video 01).
 * Script: ../Scripts/notion-slack-01-locked-out.md  ·  Facts: ../research.md
 *
 * ONE concept: an agent becomes useful when it can READ where the team's memory lives and WRITE
 * where the team's attention is. No setup, no tokens, no endpoints — videos 02/03 own those.
 *
 * Evals-grade visual standard: ONE concrete setting (Ali's stationery shop back room) repeated
 * verbatim in every scene prompt; the AI is a REAL LAPTOP with a blank screen, never an orb; all
 * numbers are HTML (bignum/screen/tally), never baked into art; ≥28% scene beats; ≤2 plain
 * statement cards. `ali` beats are clean-hero single-subject with NO held props (cutout law) —
 * anything held or handled is a `scene`.
 *
 * Interactive question (Standard §3b, 2026-09-15): beat 17 draws the quiz card AND carries `quiz`,
 * the payload the LMS pops over the player for exactly as long as the card is on screen — it never
 * pauses. Beat 21 is the reveal and is marked `revealsQuiz: true`.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background, BOTH EYES OPEN and symmetrical, never winking, never one eye closed`;
// the persistent concrete setting — repeated in EVERY scene prompt
const ROOM = 'in the back room of Ali\'s small stationery shop, cream walls, a wooden desk against ' +
  'the wall, a fat paper order file with a worn cardboard cover lying on the desk, a chipped blue ' +
  'enamel mug, a round wall clock, stacked cardboard boxes of notebooks behind him, a doorway on ' +
  'the right opening onto the shop floor';
const LAPTOP = 'a simple boxy cream-coloured laptop open on the desk, its screen a blank pale ' +
  'rectangle, plain and unbranded with no logo, badge, sticker or marking anywhere on it';
const STAFF = 'two adult shop assistants of full adult height and adult proportions, ' +
  'standing beyond the doorway on the shop floor, seen from behind at a serving counter'

module.exports = [
  { id: '01', mode: 'info',
    vo: 'Your agent is only useful where your team already works.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'An agent is only useful where your team already works.', hi: 'already works' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali runs a stationery shop with three staff and one laptop in the back.',
    cap: 'One shop, one laptop',
    art: `${ALI} standing at the desk with one hand resting on its edge, ${LAPTOP}, ${STAFF}, ${ROOM}, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'Every evening his agent reads the day\'s orders and writes a clean summary.',
    cap: 'Every evening',
    art: `${ALI} seated at the desk leaning toward the open laptop, the fat paper order file open beside it, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '04', mode: 'scene',
    vo: 'The summary lands in a black terminal window on his laptop.',
    cap: 'Into a window nobody opens',
    art: `the desk seen straight on with nobody sitting at it, the chair pushed back and empty, ${LAPTOP} its screen a flat dark rectangle, the chipped blue mug beside it, ${STAFF} looking down at their hands, ${ROOM}, ${STYLE}` },

  { id: '05', mode: 'info',
    vo: 'Twelve summaries this month, and nobody but Ali opened one.',
    cap: 'Twelve written · one reader',
    info: { tpl: 'bignum', data: { left: { big: '12', lab: 'summaries written' }, sep: 'read by', right: { big: '1', lab: 'person — him' } } } },

  { id: '06', mode: 'ali',
    vo: 'If you have built something good that nobody uses, this is why.',
    cap: 'You are not alone here',
    art: `${ALI}, a rueful understanding half-smile, gently amused, ${HERO}` },

  { id: '07', mode: 'scene',
    vo: 'His staff keep asking the same questions in the shop group chat.',
    cap: 'The same questions',
    art: `${ALI} standing in the doorway with his arms folded, listening, ${STAFF} turned toward each other mid-conversation, ${LAPTOP} closed on the desk behind him, ${ROOM}, ${STYLE}` },

  { id: '08', mode: 'scene',
    vo: 'And the answers sit in a fat paper file on the corner of his desk.',
    cap: 'The answers are on paper',
    art: `${ALI} standing at the desk with both hands flipping through the thick paper order file, its pages showing only abstract wavy pen strokes and ruled lines with no readable words, ${ROOM}, ${STYLE}` },

  { id: '09', mode: 'info',
    vo: 'The agent cannot see the file, and cannot speak in the chat.',
    cap: 'Locked out of both',
    info: { tpl: 'grid', data: { title: 'Two doors, both shut', n: 2, tone: 'bad' } } },

  { id: '10', mode: 'info',
    vo: 'The team\'s memory lives in one place. Their attention lives in another.',
    cap: 'Two different places',
    info: { tpl: 'twocard', data: {
      left: { title: 'Memory', items: ['where decisions are kept'] },
      right: { title: 'Attention', items: ['where people are looking now'] } } } },

  { id: '11', mode: 'info',
    vo: 'Notion is memory. It stays, and you can search it.',
    cap: 'Notion · memory',
    info: { tpl: 'screen', data: { title: 'Where things live', lines: [
      { k: 'Notion', v: 'memory — it stays, and you can search it' } ] } } },

  { id: '12', mode: 'info',
    vo: 'Slack is attention. It is read now, then it scrolls away.',
    cap: 'Slack · attention',
    info: { tpl: 'screen', data: { title: 'Where things live', lines: [{ k: 'Notion', v: 'memory — it stays, and you can search it' }, { k: 'Slack', v: 'attention — read now, then it scrolls away' }] } } },

  { id: '13', mode: 'scene',
    vo: 'Ali types the paper file into a Notion table on the laptop screen.',
    cap: 'Paper becomes a table',
    art: `${ALI} seated at the desk typing on the open laptop with the thick paper order file propped open beside it, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '14', mode: 'ali',
    vo: 'Now his agent can read the exact records his staff read.',
    cap: 'Same records, both sides',
    art: `${ALI}, a small satisfied nod, calm and pleased, ${HERO}` },

  { id: '15', mode: 'info',
    vo: 'Reading and writing, across two tools, is four doors.',
    cap: 'Four doors',
    info: { tpl: 'fourparts', data: { title: 'Four doors', parts: ['Read Notion — the records it can look up', 'Write Notion — what it records for later', 'Read Slack — what the team is asking', 'Write Slack — what it says back'] } } },

  { id: '16', mode: 'ali',
    vo: 'Beginners open all four at once, and then trust none of them.',
    cap: 'All four at once',
    art: `${ALI}, a slightly overwhelmed expression, both eyebrows raised, ${HERO}` },

  // ── the checkpoint: nothing on screen; the player stops and the LMS asks ──
  // Zero time, so its position IS the boundary between beat 16 and beat 18 —
  // a whole-sentence gap. Pause, ask, give feedback on the answer, resume.
  { id: '17', mode: 'checkpoint',
    quiz: {
      stem: 'Your agent has just made a decision the team will need again in six months. Where should it put it?',
      options: ['Post it in the Slack channel', 'Write it as a row in the Notion table', 'Leave it in the terminal log', 'Keep it in the agent\'s memory'],
      answer: 1,
      correctNote: 'That is it. Notion is the team\'s memory — a row stays put and is still searchable in six months, which is exactly what "the team will need it again" asks for.',
      explain: 'It belongs in the Notion table. Notion is the team\'s memory: a row stays put and can still be found in six months. Slack is attention — read now, then it scrolls away, so a decision posted there is effectively gone by next week. The terminal log and the agent\'s own memory are worse again: nobody else on the team can reach either one.' } },

  { id: '18', mode: 'ali',
    vo: 'Ali opens one door first, and only one.',
    cap: 'One door first',
    art: `${ALI}, decisive, one calm confident expression, ${HERO}` },

  { id: '19', mode: 'ali',
    vo: 'The agent may read the orders table. Nothing else, not yet.',
    cap: 'Read the table. Nothing else.',
    art: `${ALI}, a firm steady look, chin slightly lifted, ${HERO}` },

  { id: '20', mode: 'scene',
    vo: 'A staff member asks about last Tuesday, and the answer arrives in the chat.',
    cap: 'Answered while the tea is still warm',
    art: `${ALI} seated alone at the desk, looking up from the laptop with a relieved open smile, both hands resting on the desk, the chipped blue mug beside him, the doorway beyond him empty, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '22', mode: 'ali',
    vo: 'Nothing about his agent changed today. Only what it could reach.',
    cap: 'Same agent. New reach.',
    art: `${ALI}, a quiet thoughtful smile, ${HERO}` },

  { id: '23', mode: 'info',
    vo: 'One thing to read. One thing to write. Start there.',
    cap: 'Start with two',
    info: { tpl: 'statement', data: { text: 'One thing to read. One thing to write.', hi: 'One thing' } } },

  { id: '24', mode: 'ali',
    vo: 'Your turn. Name the one question your team asks every single week.',
    cap: 'Your turn',
    art: `${ALI}, looking directly forward, warm and inviting, ${HERO}` },

  { id: '25', mode: 'ali',
    vo: 'That question tells you which door to open first.',
    cap: 'That is your first door',
    art: `${ALI}, a confident encouraging smile, ${HERO}` },
];

module.exports.title = 'Locked Out of the Room';
module.exports.character = ALI;
module.exports.refPrompt = `${ALI}, neutral friendly expression, arms relaxed at his sides, ${HERO}`;
// i2v story beats for THIS video: the unread terminal, the paper file being searched, the answer landing.
// Beat 13 was tried and dropped — its plain right-hand wall made the model invent a floating sheet.
module.exports.animateIds = ['04', '08', '20'];
