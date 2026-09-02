'use strict';
/*
 * beats.js — "The Room That Fixes Its Own Mistakes" (Self-Healing & Self-Improving series, video 01).
 * V2 VISUAL REBUILD (2026-08-21) — Aroma: v1's visuals were thin. Rebuilt on the EVALS-SERIES pattern:
 *   - a PERSISTENT CONCRETE SETTING repeated in every scene prompt (Ali's shop: shelves, counter,
 *     paper ledger, brass lamp, filing drawer) instead of an abstract "room with soft rounded walls";
 *   - SPECIFIC PHYSICAL ACTIONS per beat (holding a blank sheet, a supplier dropping bills on the
 *     counter) instead of floating symbols;
 *   - REAL DATA on screen — 14 unpaid orders, 62,400 rupees, 3 weeks late, 0 -> 14 found — via
 *     bignum / screen / bars count-ups, NOT plain text cards. v1 had 7 `statement` beats; this has 2.
 *   - scene:info ratio flipped toward `scene` (11 scenes vs v1's 5), as in evals-01.
 * Series continuity kept: same locked Ali (art/_ref.png). The AI helper is a REAL LAPTOP with a
 * blank screen (the evals-series convention, DESK/LAPTOP) — NOT a glowing orb; Aroma: the orb read as
 * a vague blob. All AI output is crisp HTML (screen/bignum/bars), never baked into art. The harness
 * "room" is now literally Ali's back room. ONE concept: SELF-HEALING = detect + recover; the brain
 * never changed, the room did. Names "debugging in a loop" (Aroma's request).
 * `ali` beats stay clean-hero SINGLE SUBJECT with no held props (cutout law); anything held = `scene`.
 * No baked text in any art prompt.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
// the persistent concrete setting — repeated in EVERY scene prompt (the evals-series trick)
const SHOP = 'in Ali\'s small tidy shop, tall wooden shelves of neatly stacked paper parcels and ' +
  'tins behind him, a polished wooden counter in front with a large open paper ledger whose pages ' +
  'show only abstract wavy pen strokes and ruled lines with no readable words or letters, and a small ' +
  'brass desk lamp, a wooden filing drawer at one end of the counter';
const LAPTOP = 'a simple boxy cream-coloured desktop computer monitor sitting on the counter on a ' +
  'small square stand, its screen a blank pale rectangle, a plain old-fashioned unbranded monitor with ' +
  'a smooth empty casing and no logo, badge, sticker or marking anywhere on it';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'Self-healing is not a smarter brain; it is a room that catches its own mistakes.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Not a smarter brain — a room that catches mistakes.', hi: 'catches mistakes' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali keeps every order in one paper ledger on his shop counter.',
    cap: 'One ledger, every order',
    art: `${ALI} standing behind the counter with both hands resting on the large open ledger, looking down at its ruled pages, ${SHOP}, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'He asks his AI helper which orders from last month were never paid.',
    cap: 'A simple question',
    art: `${ALI} standing behind the counter beside ${LAPTOP}, speaking toward its screen with one hand raised in a light asking gesture, the open ledger below, ${SHOP}, ${STYLE}` },

  { id: '04', mode: 'scene',
    vo: 'The helper pulls open the records drawer and writes itself a request.',
    cap: 'It goes to the records',
    art: `The wooden filing drawer pulled open on the counter with neat rows of upright record cards inside, ${LAPTOP} right beside the open drawer, a single blank card lifted halfway out of the drawer, ${SHOP}, ${STYLE}` },

  { id: '05', mode: 'scene',
    vo: 'One date in that request is wrong, so the answer comes back completely blank.',
    cap: 'A blank answer',
    art: `${ALI} standing behind the counter holding up a single completely blank cream sheet of paper in both hands, looking at it with a puzzled frown, ${LAPTOP} open on the counter beside him, ${SHOP}, ${STYLE}` },

  { id: '06', mode: 'info',
    vo: 'It reports nothing unpaid, when fourteen orders were actually still open.',
    cap: 'Nothing versus fourteen',
    info: { tpl: 'bignum', data: {
      left: { big: '0', lab: 'what it reported', tone: 'bad' }, sep: 'vs',
      right: { big: '14', lab: 'actually unpaid' },
      note: 'A blank answer looked like good news.' } } },

  { id: '07', mode: 'scene',
    vo: 'Believing it, Ali tells his supplier that everything is settled.',
    cap: 'He passes it on',
    art: `${ALI} standing behind the counter giving a relaxed reassuring wave toward the shop doorway, the blank sheet set down on the ledger, ${SHOP}, ${STYLE}` },

  { id: '08', mode: 'scene',
    vo: 'Three weeks later the supplier arrives and drops the unpaid bills on his counter.',
    cap: 'Three weeks later',
    art: `A thick untidy stack of cream paper bills dropped in a heap on the polished wooden counter beside the open ledger, ${ALI} behind it with a dismayed shocked expression, hands lifted slightly, ${SHOP}, ${STYLE}` },

  { id: '09', mode: 'info',
    vo: 'Fourteen orders, sixty-two thousand rupees, found three weeks too late.',
    cap: 'What it cost',
    info: { tpl: 'screen', data: { title: 'The cost of one blank answer', lines: [
      { k: 'Orders missed', v: '14' }, { k: 'Money owed', v: '62,400 rupees' },
      { k: 'Found', v: '3 weeks late' }, { k: 'Who caught it', v: 'the supplier, not Ali' } ] } } },

  { id: '10', mode: 'ali',
    vo: 'The helper was not stupid; nothing simply ever checked its answer.',
    cap: 'Nothing checked it',
    art: `${ALI}, standing with a thoughtful realising expression, one hand open at his side, ${HERO}` },

  { id: '11', mode: 'scene',
    vo: 'So Ali writes one small rule in the margin of his ledger.',
    cap: 'One rule in the margin',
    art: `${ALI} standing behind the counter writing with a pen in the wide margin of the open ledger, leaning in with a focused expression, ${LAPTOP} open on the counter beside the ledger, ${SHOP}, ${STYLE}` },

  { id: '12', mode: 'info',
    vo: 'If a month had sales, then an empty unpaid list must be wrong.',
    cap: 'The rule',
    info: { tpl: 'screen', data: { title: 'The rule Ali wrote', lines: [
      { k: 'If', v: 'the month had sales' }, { k: 'And', v: 'the unpaid list comes back empty' },
      { k: 'Then', v: 'the answer is wrong — stop it' } ] } } },

  { id: '13', mode: 'scene',
    vo: 'Next month the blank sheet comes back, and the rule stops it at the counter.',
    cap: 'Stopped at the counter',
    art: `A single blank cream sheet held flat against a simple upright wooden board standing on the counter, not passing beyond it, ${LAPTOP} open on the far side of the board, ${ALI} watching attentively from the side, ${SHOP}, ${STYLE}` },

  { id: '14', mode: 'info',
    vo: 'The error goes back to the helper instead of forward to Ali.',
    cap: 'Back, not forward',
    info: { tpl: 'twocard', data: { title: 'Where the mistake travels',
      left: { title: 'Before', items: ['Blank answer → Ali', 'Ali → the supplier', 'Found 3 weeks late'] },
      right: { title: 'Now', items: ['Blank answer → the rule', 'The reason → the helper', 'Fixed in seconds'] } } } },

  { id: '15', mode: 'scene',
    vo: 'It reads what went wrong, corrects the date, and asks the drawer again.',
    cap: 'It fixes its own request',
    art: `${LAPTOP} open on the counter next to the pulled-open filing drawer, a fresh blank card lifting from the drawer and a soft curved arrow looping from the laptop back around to the drawer, ${SHOP}, ${STYLE}` },

  { id: '16', mode: 'scene',
    vo: 'This time the sheet comes back with fourteen rows written on it.',
    cap: 'Fourteen rows',
    art: `${ALI} standing behind the counter holding up a cream sheet filled with neat ruled horizontal lines of handwriting, smiling with clear relief, ${LAPTOP} open on the counter beside him, ${SHOP}, ${STYLE}` },

  { id: '17', mode: 'info',
    vo: 'Zero found before, fourteen found now, and nobody waited three weeks.',
    cap: 'Zero to fourteen',
    info: { tpl: 'bars', data: { title: 'Unpaid orders found', max: 14, items: [
      { label: 'Without a check', value: 0, tone: 'bad' }, { label: 'With a check', value: 14, tone: 'big' } ] } } },

  { id: '18', mode: 'info',
    vo: 'That rescue has a name: debugging in a loop — act, check, try again.',
    cap: 'Debugging in a loop',
    info: { tpl: 'screen', data: { title: 'Debugging in a loop', lines: [
      { k: 'Act', v: 'the helper answers' }, { k: 'Check', v: 'the rule inspects it' },
      { k: 'Retry', v: 'the reason goes back, it fixes itself' } ] } } },

  { id: '19', mode: 'ali',
    vo: 'Now notice what did not happen anywhere in that story.',
    cap: 'What did not happen',
    art: `${ALI}, standing with a thoughtful raised eyebrow and a small knowing half smile, ${HERO}` },

  { id: '20', mode: 'info',
    vo: 'Nobody trained a new model, and nobody bought a bigger one.',
    cap: 'Same brain, new room',
    info: { tpl: 'twocard', data: { title: 'What actually changed',
      left: { title: 'The brain', items: ['Same model', 'Same weights', 'Same knowledge'] },
      right: { title: 'The room', items: ['One rule added', 'One retry wired', 'Now it recovers'] } } } },

  { id: '21', mode: 'ali',
    vo: 'That is self-healing: the system notices a failure and recovers from it.',
    cap: 'That is self-healing',
    art: `${ALI}, standing calm and confident with a warm assured smile, hands loose at his sides, ${HERO}` },

  { id: '22', mode: 'info', holdAfter: 6,
    vo: 'Quick question: the answer was blank, then correct — so what actually changed?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'The answer was blank, then correct. What changed?',
      options: ['The model got smarter', 'The model was retrained overnight', 'A rule checked it and sent the error back', 'Ali counted the orders himself'],
      note: 'Write your answer down.' } } },

  { id: '23', mode: 'info',
    vo: 'A rule checked it and sent the error back; the brain never moved.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'What changed?',
      options: ['The model got smarter', 'The model was retrained overnight', 'A rule checked it and sent the error back', 'Ali counted the orders himself'],
      answer: 2, note: 'Self-healing changes the system, not the model.' } } },

  { id: '24', mode: 'info',
    vo: 'One warning: a helper that retries forever is a helper that never stops.',
    cap: 'One warning',
    info: { tpl: 'gauge', data: { label: 'Tries before it comes to Ali', value: 3, max: 3, good: 'Then a person decides' } } },

  { id: '25', mode: 'ali',
    vo: 'So Ali caps it at three tries, and after that it comes to him.',
    cap: 'Cap the tries',
    art: `${ALI}, standing and holding up three fingers in a clear calm gesture, gentle instructive expression, ${HERO}` },

  { id: '26', mode: 'ali',
    vo: 'Your turn: pick one AI tool you use and find where its answer gets checked.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '27', mode: 'info',
    vo: 'Ask it plainly: what happens when your answer is wrong, and who catches it?',
    cap: 'Ask it plainly',
    info: { tpl: 'promptcard', data: { app: 'Ask your AI tool',
      text: 'When your answer is wrong, what catches it — and what happens next?' } } },

  { id: '28', mode: 'ali',
    vo: 'A room that catches its own mistakes is worth more than a brain that never makes one.',
    cap: 'A room that catches mistakes',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["13","15","08"]; // i2v story beats — physical actions, retuned for THIS video
