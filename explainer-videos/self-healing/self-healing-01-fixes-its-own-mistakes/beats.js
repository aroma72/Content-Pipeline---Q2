'use strict';
/*
 * beats.js — "The Room That Fixes Its Own Mistakes" (Self-Healing & Self-Improving series, video 01).
 * CONTINUES THE HARNESS SERIES: same locked Ali (art/_ref.png), same shop + AI helper, glowing honey
 * ORB = the brain (the model), room = the harness around it.
 * ONE concept: SELF-HEALING = the system detects a failure and recovers from it. The brain never
 * changed; the room around it learned to catch and retry. No training, no GPUs — architecture.
 * De-duplicated vs the harness series (what the room is made of), vs evals (measuring), and vs
 * autonomy (how much rope). Video 02 covers WHO checks; 03 covers self-improving.
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
    vo: 'Self-healing is not a smarter brain; it is a room that catches its own mistakes.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Not a smarter brain — a room that catches mistakes.', hi: 'catches mistakes' } } },

  { id: '02', mode: 'ali',
    vo: 'Ali asks his helper for every unpaid order from last month.',
    cap: 'A simple ask',
    art: `${ALI}, standing and speaking with a friendly open expression, one hand raised in a light asking gesture, ${HERO}` },

  { id: '03', mode: 'scene',
    vo: 'The helper reaches into the shop records and writes a request for them.',
    cap: 'It writes a request',
    art: `${ALI} standing beside ${ROOM}, ${ORB} glowing inside it, a simple blank card and a plain filing drawer floating near the orb, ${STYLE}` },

  { id: '04', mode: 'scene',
    vo: 'The request has one small error in it, so the answer comes back empty.',
    cap: 'It comes back empty',
    art: `${ALI} standing beside ${ROOM} looking at a plain empty tray floating in front of ${ORB}, the orb dimmed slightly, a small soft grey cloud beside it, ${STYLE}` },

  { id: '05', mode: 'ali',
    vo: 'In an ordinary setup, Ali finds out days later, from an unhappy customer.',
    cap: 'He finds out too late',
    art: `${ALI}, standing with a worried concerned expression, brows drawn together, one hand at his temple, ${HERO}` },

  { id: '06', mode: 'info',
    vo: 'So we add one small step: something that checks the answer before it reaches him.',
    cap: 'Add a check',
    info: { tpl: 'statement', data: { text: 'Add one step: check it before it reaches him.', hi: 'check it' } } },

  { id: '07', mode: 'scene',
    vo: 'The checker looks at the empty answer and refuses to pass it on.',
    cap: 'The checker stops it',
    art: `${ALI} standing beside ${ROOM} with a serious attentive expression, watching a single smooth solid rounded upright panel standing like a barrier between ${ORB} and an open doorway, one plain empty tray stopped against the panel and not passing through, ${STYLE}` },

  { id: '08', mode: 'info',
    vo: 'Instead of the mistake reaching Ali, the error goes straight back to the helper.',
    cap: 'The error goes back',
    info: { tpl: 'statement', data: { text: 'The error goes back to the helper, not to Ali.', hi: 'back to the helper' } } },

  { id: '09', mode: 'scene',
    vo: 'The helper reads what went wrong, corrects the request, and tries once more.',
    cap: 'It corrects and retries',
    art: `${ALI} standing beside ${ROOM}, ${ORB} glowing brighter with a fresh blank card floating beside it and a soft curved arrow looping back around, ${STYLE}` },

  { id: '10', mode: 'ali',
    vo: 'This time the answer comes back full, and it is the answer Ali actually wanted.',
    cap: 'The right answer',
    art: `${ALI}, standing with a pleased relieved smile, shoulders relaxed, holding one hand open, ${HERO}` },

  { id: '11', mode: 'info',
    vo: 'That rescue has a name: debugging in a loop — act, check, try again.',
    cap: 'Debugging in a loop',
    info: { tpl: 'screen', data: { title: 'Debugging in a loop', lines: [
      { k: 'Act', v: 'the helper does the job' }, { k: 'Check', v: 'something inspects the result' },
      { k: 'Retry', v: 'the error goes back, it tries again' } ] } } },

  { id: '12', mode: 'ali',
    vo: 'Now notice what did not happen anywhere in that story.',
    cap: 'What did not happen',
    art: `${ALI}, standing with a thoughtful raised eyebrow and a small knowing half smile, ${HERO}` },

  { id: '13', mode: 'info',
    vo: 'Nobody trained a new model; the brain is exactly the brain it was a minute ago.',
    cap: 'Same brain',
    info: { tpl: 'statement', data: { text: 'The brain is exactly the brain it was a minute ago.', hi: 'exactly the brain' } } },

  { id: '14', mode: 'info',
    vo: 'What changed was the system around the brain.',
    cap: 'The system changed',
    info: { tpl: 'twocard', data: { title: 'What actually changed',
      left: { title: 'The brain', items: ['Same model', 'Same weights', 'Same knowledge'] },
      right: { title: 'The room', items: ['Now it checks', 'Now it retries', 'Now it recovers'] } } } },

  { id: '15', mode: 'ali',
    vo: 'That is self-healing: the system notices a failure and recovers from it.',
    cap: 'That is self-healing',
    art: `${ALI}, standing calm and confident with a warm assured smile, hands loose at his sides, ${HERO}` },

  { id: '16', mode: 'info',
    vo: 'Which means no new training, no expensive graphics cards, and no new model.',
    cap: 'None of that needed',
    info: { tpl: 'statement', data: { text: 'No new training. No graphics cards. No new model.', hi: 'No new training' } } },

  { id: '17', mode: 'info',
    vo: 'It needs a better room, and a room is something you can build today.',
    cap: 'Build the room',
    info: { tpl: 'statement', data: { text: 'It needs a better room — and you can build that today.', hi: 'a better room' } } },

  { id: '18', mode: 'info', holdAfter: 6,
    vo: 'Quick question: the answer was wrong, then right — so what actually changed?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'The answer was wrong, then right. What changed?',
      options: ['The model got smarter', 'The model was retrained overnight', 'The room checked the answer and handed the error back', 'Ali wrote the request himself'],
      note: 'Write your answer down.' } } },

  { id: '19', mode: 'info',
    vo: 'The room checked the answer and handed the error back; the brain never moved.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'What changed?',
      options: ['The model got smarter', 'The model was retrained overnight', 'The room checked the answer and handed the error back', 'Ali wrote the request himself'],
      answer: 2, note: 'Self-healing changes the system, not the model.' } } },

  { id: '20', mode: 'info',
    vo: 'One warning: a helper that retries forever is a helper that never stops.',
    cap: 'One warning',
    info: { tpl: 'statement', data: { text: 'A helper that retries forever never stops.', hi: 'retries forever' } } },

  { id: '21', mode: 'ali',
    vo: 'So Ali caps it at three tries, and after that it comes to him.',
    cap: 'Cap the tries',
    art: `${ALI}, standing and holding up three fingers in a clear calm gesture, gentle instructive expression, ${HERO}` },

  { id: '22', mode: 'ali',
    vo: 'Your turn: pick one AI tool you use and find where its answer gets checked.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '23', mode: 'info',
    vo: 'Ask it plainly: what happens when your answer is wrong, and who catches it?',
    cap: 'Ask it plainly',
    info: { tpl: 'promptcard', data: { app: 'Ask your AI tool',
      text: 'When your answer is wrong, what catches it — and what happens next?' } } },

  { id: '24', mode: 'ali',
    vo: 'A room that catches its own mistakes is worth more than a brain that never makes one.',
    cap: 'A room that catches mistakes',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["07", "09", "24"]; // i2v story beats (house rule: use-animations)
