'use strict';
/*
 * beats.js — "Prove It Got Better" (Self-Healing & Self-Improving series, video 06, finale).
 * CONTINUES V01–V05: same locked Ali (art/_ref.png), shop + AI helper, honey ORB = the brain,
 * room = harness. ONE concept: a healing/improving loop is only real if it is MEASURED — and the
 * failure log is where the measurement comes from. The discipline: every incident gets what broke,
 * WHY (root cause, not symptom), the fix, and the lesson; every lesson becomes a permanent test case;
 * the pile of test cases is your eval set; the before/after number is what makes "better" a fact.
 * Closes the two gaps in V01-V05: learn-from-failure DISCIPLINE + EVALS-DRIVEN improvement.
 * De-duplicated vs the evals series (what an eval is / rubrics / judging at scale) — here evals exist
 * only as the scoreboard for the healing loop; explicit one-line nod to that series.
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
    vo: 'Self-improving only counts when it is eval driven — measured, never just felt.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'Self-improving has to be eval driven.', hi: 'eval driven' } } },

  { id: '02', mode: 'ali',
    vo: 'Ali tells everyone his helper has got much better this month.',
    cap: 'It got better',
    art: `${ALI}, standing with a proud pleased smile, one hand gesturing outward warmly, ${HERO}` },

  { id: '03', mode: 'ali',
    vo: 'Then someone asks him how much better, and he has no answer at all.',
    cap: 'How much better?',
    art: `${ALI}, standing with an uncertain caught-out expression, mouth slightly open, one hand paused mid-gesture, ${HERO}` },

  { id: '04', mode: 'info',
    vo: 'He believes it improved, but belief is not the same as evidence.',
    cap: 'Belief is not evidence',
    info: { tpl: 'twocard', data: { title: 'What he actually has',
      left: { title: 'A feeling', items: ['It seems better', 'Fewer complaints lately', 'I think it learned'] },
      right: { title: 'Evidence', items: ['A number before', 'A number after', 'The same test both times'] } } } },

  { id: '05', mode: 'info',
    vo: 'So he starts the one habit that fixes this: a failure log.',
    cap: 'Start a failure log',
    info: { tpl: 'statement', data: { text: 'The one habit that fixes it: a failure log.', hi: 'a failure log' } } },

  { id: '06', mode: 'scene',
    vo: 'Every time the helper gets something wrong, he writes down four things.',
    cap: 'Four things, every time',
    art: `${ALI} standing beside ${ROOM}, writing on a simple open notebook that floats near ${ORB}, four small blank marks on the page, ${STYLE}` },

  { id: '07', mode: 'info',
    vo: 'What broke, why it broke, what fixed it, and the lesson it leaves behind.',
    cap: 'The four columns',
    info: { tpl: 'screen', data: { title: 'One line per failure', lines: [
      { k: 'What broke', v: 'the thing that went wrong' }, { k: 'Why', v: 'the root cause, not the symptom' },
      { k: 'The fix', v: 'what you actually changed' }, { k: 'The lesson', v: 'what stops it returning' } ] } } },

  { id: '08', mode: 'ali',
    vo: 'The second one is the one everybody skips, and it is the valuable one.',
    cap: 'Nobody writes the why',
    art: `${ALI}, standing and holding up two fingers with a pointed knowing expression, ${HERO}` },

  { id: '09', mode: 'info',
    vo: 'The symptom is a wrong answer; the cause is that nobody ever told it.',
    cap: 'Symptom versus cause',
    info: { tpl: 'statement', data: { text: 'Symptom: a wrong answer. Cause: nobody told it.', hi: 'nobody told it' } } },

  { id: '10', mode: 'scene',
    vo: 'One entry reads: it offered a discount that the shop had quietly stopped.',
    cap: 'One real entry',
    art: `${ALI} standing beside ${ROOM} looking at one plain card held apart from a small stack, ${ORB} dimmed slightly behind it, ${STYLE}` },

  { id: '11', mode: 'info',
    vo: 'The lesson does not stay in the notebook; it becomes a permanent check.',
    cap: 'The lesson becomes a check',
    info: { tpl: 'statement', data: { text: 'Every lesson becomes a permanent check.', hi: 'a permanent check' } } },

  { id: '12', mode: 'ali',
    vo: 'That is the learning-from-failure discipline: a failure you only fix comes back.',
    cap: 'Learning-from-failure discipline',
    art: `${ALI}, standing with a calm serious teaching expression, one hand open in a measured gesture, ${HERO}` },

  { id: '13', mode: 'scene',
    vo: 'After a month, his notebook has turned into a row of real test cases.',
    cap: 'The log becomes a test set',
    art: `${ALI} standing beside ${ROOM} where a neat row of plain blank cards floats in a line beside ${ORB}, evenly spaced, ${STYLE}` },

  { id: '14', mode: 'info',
    vo: 'Twenty cases, and not one of them invented — every one is a real failure.',
    cap: 'All from real failures',
    info: { tpl: 'grid', data: { title: 'Twenty cases, all from real failures', n: 20, tone: 'good' } } },

  { id: '15', mode: 'ali',
    vo: 'Now Ali can finally ask his question in a way that has an answer.',
    cap: 'A question with an answer',
    art: `${ALI}, standing with a focused determined expression, slight forward lean, ${HERO}` },

  { id: '16', mode: 'info',
    vo: 'He runs all twenty on the old setup, then all twenty on the new one.',
    cap: 'Same test, both times',
    info: { tpl: 'statement', data: { text: 'The same twenty, before and after.', hi: 'the same twenty' } } },

  { id: '17', mode: 'info',
    vo: 'Twelve out of twenty before, eighteen out of twenty after.',
    cap: 'The number',
    info: { tpl: 'bars', data: { title: 'Cases passed, out of twenty', max: 20, suffix: '/20', items: [
      { label: 'Before', value: 12 }, { label: 'After', value: 18, tone: 'big' } ] } } },

  { id: '18', mode: 'ali',
    vo: 'Better is now a number he can show, not a feeling he has to defend.',
    cap: 'A number, not a feeling',
    art: `${ALI}, standing with a confident satisfied smile and a small assured nod, ${HERO}` },

  { id: '19', mode: 'info',
    vo: 'And the two that still fail are not a disappointment; they are the next task.',
    cap: 'The failures are the list',
    info: { tpl: 'statement', data: { text: 'The ones still failing are your to-do list.', hi: 'your to-do list' } } },

  { id: '20', mode: 'info',
    vo: 'That is what eval driven means: fail, log, fix, check, and measure.',
    cap: 'Eval-driven improvement',
    info: { tpl: 'screen', data: { title: 'Eval-driven improvement', lines: [
      { k: 'Fail', v: 'it goes wrong' }, { k: 'Log', v: 'what, why, fix, lesson' },
      { k: 'Fix', v: 'store it where it lives' }, { k: 'Check', v: 'the lesson becomes a case' },
      { k: 'Measure', v: 'run them all, before and after' } ] } } },

  { id: '21', mode: 'info', holdAfter: 6,
    vo: 'Quick question: Ali says his helper improved but never kept a log — what does he actually have?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'He says it improved, but kept no log. What does he have?',
      options: ['Proof it improved', 'A story he cannot check', 'A self-improving system', 'An eval set'],
      note: 'Write your answer down.' } } },

  { id: '22', mode: 'info',
    vo: 'A story he cannot check, because nothing was written down to compare against.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'What does he have?',
      options: ['Proof it improved', 'A story he cannot check', 'A self-improving system', 'An eval set'],
      answer: 1, note: 'No log, no baseline, no proof.' } } },

  { id: '23', mode: 'info',
    vo: 'Scoring those cases well is its own craft, and the evals series covers it.',
    cap: 'More on scoring',
    info: { tpl: 'statement', data: { text: 'Scoring them well is its own craft.', hi: 'its own craft' } } },

  { id: '24', mode: 'ali',
    vo: 'Your turn: open a failure log today and write the last thing that went wrong.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '25', mode: 'info',
    vo: 'Ask yourself: what broke, why, what fixed it, and what stops it coming back?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'What broke? Why? What fixed it? What stops it coming back?' } } },

  { id: '26', mode: 'ali',
    vo: 'A system that cannot show its score is not improving; it is only hoping.',
    cap: 'Show the score',
    art: `${ALI}, facing the viewer with a warm confident smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["06", "13", "26"]; // i2v story beats (house rule: use-animations)
