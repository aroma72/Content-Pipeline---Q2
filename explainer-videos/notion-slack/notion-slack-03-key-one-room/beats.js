'use strict';
/*
 * beats.js — "The Key Only Opens One Room" (Notion + Slack module, video 03).
 * Script: ../Scripts/notion-slack-03-key-one-room.md  ·  Facts: ../research.md (F4, F5)
 *
 * ONE concept: creating an integration grants nothing. A key is a hotel key card, and in Notion you
 * must walk the card to the room (Connections); in Slack you must add the scope AND invite the bot.
 *
 * This is the video learners come back to, so it is error-first: both real error strings appear on
 * `info` cards, exactly as they arrive, each paired with the one setting that causes it. Error text,
 * scope names and menu labels are ALWAYS HTML cards — never baked into art.
 * Same locked Ali and back room as videos 01–02. Beat 18 is the CHECKPOINT (Standard §3b).
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
const STAFF = 'two adult shop assistants of full adult height and adult proportions, ' +
  'waiting beyond the doorway on the shop floor, seen from behind';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'Your agent\'s key opens only the rooms you hand it to.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'A key opens only the rooms you hand it to.', hi: 'hand it to' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali creates his integration and copies the key into his project.',
    cap: 'The key is made',
    art: `${ALI} seated at the desk typing on the open laptop, an alert focused expression, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'He runs it, and his order table comes back completely empty.',
    cap: 'Nothing comes back',
    art: `${ALI} seated at the desk staring at the laptop with a puzzled frown, one hand frozen above the keys, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '04', mode: 'info',
    vo: 'Four hundred and four. Object not found.',
    cap: 'The first error',
    info: { tpl: 'screen', data: { title: '404', lines: [
      'object_not_found',
      '"…does not exist, or has not been shared with your integration."' ] } } },

  { id: '05', mode: 'scene',
    vo: 'He reads his four lines of code four times. The code is fine.',
    cap: 'The code is fine',
    art: `${ALI} leaning very close to the laptop screen, one finger tracing down it, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '06', mode: 'ali',
    vo: 'Then he reads the message properly, all the way to the end.',
    cap: 'Read it to the end',
    art: `${ALI}, a dawning realisation, eyebrows lifting, ${HERO}` },

  { id: '07', mode: 'info',
    vo: 'Everybody hits this one. It is not a bug in your code. It is a permission.',
    cap: 'Not a bug — a permission',
    info: { tpl: 'statement', data: { text: 'Not a bug in your code. A permission.', hi: 'A permission' } } },

  { id: '08', mode: 'info',
    vo: 'A key is a hotel key card, never a master key.',
    cap: 'One room, one stay',
    info: { tpl: 'twocard', data: {
      left: { title: 'Master key', body: 'opens everything — nobody hands one out' },
      right: { title: 'Key card', body: 'one room, one stay, cancellable', hi: true } } } },

  { id: '09', mode: 'ali',
    vo: 'The front desk gives you one room, for one stay, and can cancel it any time.',
    cap: 'And they can cancel it',
    art: `${ALI}, explaining calmly, one hand open in a small gesture, ${HERO}` },

  { id: '10', mode: 'scene',
    vo: 'In Notion you also have to walk the card to the room yourself.',
    cap: 'Walk the card to the room',
    art: `${ALI} standing at the desk with one hand on the laptop, opening a menu on its screen, an attentive expression, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '11', mode: 'info',
    vo: 'Open the page, the three dots, Connections, add your integration.',
    cap: 'Four steps, in order',
    info: { tpl: 'checks', data: { items: [
      'Open the page',
      'The three dots, top right',
      'Connections',
      'Add your integration' ] } } },

  { id: '12', mode: 'scene',
    vo: 'Ali shares his order table, runs it again, and the rows finally appear.',
    cap: 'Rows, at last',
    art: `${ALI} seated at the desk with both hands off the keys, sitting back with a relieved smile at the laptop, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '13', mode: 'info',
    vo: 'Parent pages count too. Sharing one child page is not enough.',
    cap: 'The parent counts',
    info: { tpl: 'twocard', data: {
      left: { title: 'Child page shared', body: 'still 404 — the parent was never added' },
      right: { title: 'Parent shared too', body: 'the rows come back', hi: true } } } },

  { id: '14', mode: 'scene',
    vo: 'Then he tries to post the summary in the shop channel, and Slack refuses.',
    cap: 'Refused again',
    art: `${ALI} seated at the desk with a dismayed expression looking at the laptop, ${STAFF} waiting in the doorway behind him, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '15', mode: 'info',
    vo: 'Not in channel.',
    cap: 'The second error',
    info: { tpl: 'screen', data: { title: 'Slack says', lines: [
      'not_in_channel',
      'the bot may write — but not here' ] } } },

  { id: '16', mode: 'ali',
    vo: 'His bot is allowed to write. It is simply not in that room.',
    cap: 'Allowed, but not present',
    art: `${ALI}, a wry understanding smile, shoulders relaxed, ${HERO}` },

  { id: '17', mode: 'info',
    vo: 'Two scopes, then one invite.',
    cap: 'Scopes, then membership',
    info: { tpl: 'checks', data: { items: [
      'chat:write',
      'chat:write.public',
      '/invite @your-bot' ] } } },

  // ── the checkpoint: nothing on screen; the player stops and the LMS asks ──
  { id: '18', mode: 'checkpoint',
    quiz: {
      stem: 'Your integration returns object_not_found for a database you can see in your own browser. What is wrong?',
      options: [
        'The token has expired',
        'The database was never shared with the integration',
        'Your connection dropped',
        'You need a paid Notion plan',
      ],
      answer: 1,
      correctNote: 'Yes. Creating an integration gives it zero access — you have to open the page, go to Connections, and add it. Seeing the database yourself proves nothing: you are signed in as you, not as the integration.',
      explain: 'The database was never shared with the integration. Creating one grants it no access at all; you must open the page, choose Connections, and add it — and share the parent page too. That you can see the database in your browser is not evidence: you are looking at it as yourself, not as the key. An expired token or a dropped connection would fail differently, and none of this needs a paid plan.',
    } },

  { id: '19', mode: 'info',
    vo: 'Every new scope needs the app reinstalled, or you get missing scope.',
    cap: 'Reinstall after a scope',
    info: { tpl: 'screen', data: { title: 'If you skip the reinstall', lines: [
      'missing_scope',
      'added the scope, never reinstalled' ] } } },

  { id: '20', mode: 'ali',
    vo: 'Ali hands the key one table and one channel, and nothing else.',
    cap: 'One table, one channel',
    art: `${ALI}, calm and deliberate, a steady confident expression, ${HERO}` },

  { id: '21', mode: 'ali',
    vo: 'Not the whole workspace, because a key that opens everything cannot be trusted with anything.',
    cap: 'Least privilege',
    art: `${ALI}, serious and clear-eyed, chin slightly lifted, ${HERO}` },

  { id: '22', mode: 'scene',
    vo: 'Two errors cost him forty minutes today. Tomorrow they cost him forty seconds.',
    cap: 'Forty minutes → forty seconds',
    art: `${ALI} standing at the desk pinning a small handwritten card to the wall above it, the writing on it abstract strokes with no readable letters, ${LAPTOP}, ${ROOM}, ${STYLE}` },

  { id: '23', mode: 'info',
    vo: 'Share the page. Add the scope. Reinstall. Invite the bot.',
    cap: 'The whole fix',
    info: { tpl: 'checks', data: { items: [
      'Share the page',
      'Add the scope',
      'Reinstall the app',
      'Invite the bot' ] } } },

  { id: '24', mode: 'ali',
    vo: 'Your turn. Open the one page your agent must read and look at its Connections.',
    cap: 'Your turn',
    art: `${ALI}, looking directly forward, warm and inviting, ${HERO}` },

  { id: '25', mode: 'ali',
    vo: 'If your integration is not listed there, that is your four-oh-four already waiting.',
    cap: 'That is your 404',
    art: `${ALI}, a knowing encouraging smile, ${HERO}` },
];

module.exports.title = 'The Key Only Opens One Room';
module.exports.character = ALI;
module.exports.refPrompt = `${ALI}, neutral friendly expression, arms relaxed at his sides, ${HERO}`;
// i2v story beats for THIS video: the empty result, walking the card to the room, rows appearing
module.exports.animateIds = ['03', '10', '12'];
