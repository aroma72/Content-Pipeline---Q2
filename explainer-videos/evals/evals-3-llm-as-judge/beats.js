'use strict';
/*
 * beats.js — "LLM-as-a-Judge, In Depth" (Video 3, Phase 5 evals).
 * ONE protagonist (Ali). From fuzzy outputs to technical uses (reviewing code, classifying, comparing).
 * Flat 2D vector; no baked-in text; whole solid cutouts; movement every beat.
 */
const ALI = 'Ali, a young South Asian man with short neat black hair, clean-shaven, ' +
  'wearing a teal collared shirt and dark trousers';
const STYLE = 'flat 2D vector editorial illustration, clean simple rounded shapes, warm cream ' +
  'palette, soft friendly style, absolutely no text, no words, no letters, no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  { id: '01', mode: 'ali', vo: 'An LLM-as-a-judge is a model that scores work against your rules.', cap: 'What it is',
    art: `${ALI}, handing a floating document to a small floating friendly robot holding a scorecard, ${HERO}` },
  { id: '02', mode: 'scene', vo: 'Some outputs have no simple right answer, like a summary.', cap: 'Fuzzy outputs',
    art: `${ALI} sitting at a desk reading a paragraph of text on his laptop, bright modern office, gentle depth, ${STYLE}` },
  { id: '03', mode: 'ali', vo: 'You cannot unit-test whether a summary is clear and fair.', cap: 'Hard to test normally',
    art: `${ALI}, holding a broken ruler up against a floating block of paragraph text, unsure, ${HERO}` },
  { id: '04', mode: 'info', vo: 'So a second model reads it and scores it against criteria.', cap: 'How it works',
    info: { tpl: 'statement', data: { text: 'A second model scores the output against criteria.', hi: 'criteria' } } },
  { id: '05', mode: 'ali', vo: 'The secret is giving the judge clear, written criteria.', cap: 'Clear criteria first',
    art: `${ALI}, writing on a floating rubric card with blank rows, focused, ${HERO}` },
  { id: '06', mode: 'info', vo: 'Ali scores each summary on accuracy, clarity, and completeness.', cap: 'A simple rubric',
    info: { tpl: 'checks', data: { title: 'A simple rubric', items: ['Accuracy', 'Clarity', 'Completeness'] } } },
  { id: '07', mode: 'ali', vo: 'He gives the judge the input, the output, and the rubric.', cap: 'Feed it everything',
    art: `${ALI}, directing three floating rounded cards toward a small floating judge robot, ${HERO}` },
  { id: '08', mode: 'ali', vo: 'And he asks for a score plus the reason behind it.', cap: 'Score + reason',
    art: `${ALI}, receiving a floating scorecard showing a mark and a short note, ${HERO}` },
  { id: '09', mode: 'scene', vo: 'The reason matters as much as the number — it tells you why.', cap: 'Reasons build trust',
    art: `${ALI} at his desk reading an explanation on his laptop and nodding, warm office, ${STYLE}` },
  { id: '10', mode: 'info', vo: 'A few habits make the judge far more reliable.', cap: 'Make it reliable',
    info: { tpl: 'checks', data: { title: 'Make it reliable', items: ['Use a strong model', 'Give it an example answer', 'Ask for structured output', 'Check it against human scores'] } } },
  { id: '11', mode: 'ali', vo: 'Watch for bias: judges can favour longer or first answers.', cap: 'Watch for bias',
    art: `${ALI}, pointing warily at a floating balance scale tilting toward a bigger card, ${HERO}` },
  { id: '12', mode: 'ali', vo: 'And never let a model be the only judge of its own work.', cap: 'Don’t self-judge blindly',
    art: `${ALI}, raising a gentle cautioning hand beside a small floating robot marking its own paper, ${HERO}` },
  { id: '13', mode: 'scene', vo: 'If bias worries you, that caution is exactly right.', cap: 'Being careful is good',
    art: `${ALI} at his desk looking reassured and calm, warm friendly office, ${STYLE}` },
  { id: '14', mode: 'scene', vo: 'Now for the powerful part: judging technical work.', cap: 'Going technical',
    art: `${ALI} turning toward a code editor open on his laptop, bright modern office, gentle depth, ${STYLE}` },
  { id: '15', mode: 'ali', vo: 'Ali points the judge at his code, not just his text.', cap: 'Judge your code',
    art: `${ALI}, gesturing to a small floating judge robot reading a floating panel of code, ${HERO}` },
  { id: '16', mode: 'info', vo: 'It can review code for spec, safety, readability, and bugs.', cap: 'What it checks in code',
    info: { tpl: 'fourparts', data: { title: 'What it checks in code', parts: ['Matches the spec?', 'Is it safe?', 'Is it readable?', 'Any obvious bugs?'] } } },
  { id: '17', mode: 'ali', vo: 'He asks, does this function actually do what the spec says?', cap: 'Match the spec',
    art: `${ALI}, comparing a floating code block to a floating spec card side by side, ${HERO}` },
  { id: '18', mode: 'ali', vo: 'He also uses it to sort messages, like a task versus a chat.', cap: 'Classify too',
    art: `${ALI}, sorting floating message bubbles into two separate floating bins, ${HERO}` },
  { id: '19', mode: 'ali', vo: 'For big jobs, it compares two versions and picks the better one.', cap: 'Compare two answers',
    art: `${ALI}, beside a floating balance scale weighing card A against card B, ${HERO}` },
  { id: '20', mode: 'scene', vo: 'Start small: one rubric, a few outputs, checked against your own judgement.', cap: 'Start small',
    art: `${ALI} at his desk holding a single rubric card, calm and focused, warm office, ${STYLE}` },
  { id: '21', mode: 'ali', vo: 'Used well, a judge scales your good taste across thousands of outputs.', cap: 'Scale your judgement',
    art: `${ALI}, calm and confident as a floating stream of small cards each gain a green check, ${HERO}` },
  { id: '22', mode: 'ali', vo: 'What fuzzy output in your work could a judge start scoring today?', cap: 'Your turn',
    art: `${ALI}, turning to face the viewer with a warm inviting expression and an open hand, ${HERO}` },
];
