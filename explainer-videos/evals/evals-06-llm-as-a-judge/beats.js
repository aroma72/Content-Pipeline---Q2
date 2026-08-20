'use strict';
/*
 * beats.js — "LLM As A Judge" (evals series, video 06). Camera-pan build.
 * Same locked Ali (Gemini-seeded); the assistant returns (described consistently).
 * ONE move: give your rubric to a model and make it explain every score. Varied graphics:
 * a big number, a three-input card, a pass/fail BAR GRAPH, a wrong-judgement card, a
 * 19/20 gauge, and a guardrails checklist.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const ASSISTANT = 'his shop assistant, a friendly South Asian woman in her mid-20s, warm brown skin, ' +
  'dark hair tied back in a low bun, wearing a deep plum-maroon kurta, clearly a different person';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const DESK = 'sitting at a tidy small wooden desk with an open laptop showing a plain blank interface';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  { id: '00', mode: 'info',
    vo: 'This video is about using an LLM as a judge.',
    cap: 'LLM as a judge',
    info: { tpl: 'statement', data: { text: 'LLM as a judge', hi: 'LLM as a judge', sub: 'What this whole video is about.' } } },

  { id: '01', mode: 'info',
    vo: 'Give your rubric to a model, and make it explain every score.',
    cap: 'The one move',
    info: { tpl: 'statement', data: { text: 'Give your rubric to a model.', hi: 'explain every score', sub: 'Make it explain every score.' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali and his assistant now agree on what a good message looks like.',
    cap: 'They agree now',
    art: `${ALI} and ${ASSISTANT} standing together nodding in agreement over a notepad, warm and collaborative, two clearly different people, ${STYLE}` },

  { id: '03', mode: 'scene',
    vo: 'Then Ali counts every message his app can show a customer.',
    cap: 'Count them all',
    art: `${ALI} ${DESK}, scrolling and counting items on the laptop with a focused expression, ${STYLE}` },

  { id: '04', mode: 'info',
    vo: 'Two hundred and six.',
    cap: 'The whole job',
    info: { tpl: 'statement', data: { text: '206 messages', hi: '206', sub: 'the whole job' } } },

  { id: '05', mode: 'ali',
    vo: 'Ten messages took them a whole morning; two hundred would take two weeks.',
    cap: 'Two weeks by hand',
    art: `${ALI}, standing with a slightly daunted, tired expression, rubbing the back of his neck, ${HERO}` },

  { id: '06', mode: 'scene',
    vo: 'And in two weeks, Claude will have changed half of them again.',
    cap: 'They keep changing',
    art: `${ALI} ${DESK}, watching the screen as messages change, a resigned expression, ${STYLE}` },

  { id: '07', mode: 'info',
    vo: 'A rubric that works, and no way to run it on the real job.',
    cap: 'The real bottleneck',
    info: { tpl: 'twocard', data: {
      left: { title: 'Rubric that works', items: ['Two people agree'] },
      right: { title: 'No way to run it', items: ['206 by hand = 2 weeks'] } } } },

  { id: '08', mode: 'ali',
    vo: 'Then Ali thinks about how his assistant learned to mark.',
    cap: 'How did she learn?',
    art: `${ALI}, standing with a thoughtful expression, one hand on his chin, an idea forming, ${HERO}` },

  { id: '09', mode: 'scene',
    vo: 'He never taught her his opinion; he handed her the five written lines.',
    cap: 'He handed over the lines',
    art: `${ALI} handing a single written sheet of paper to ${ASSISTANT}, who takes it, two clearly different people, warm light, ${STYLE}` },

  { id: '10', mode: 'scene',
    vo: 'Once she had the lines, she could mark without him.',
    cap: 'She marks on her own',
    art: `${ASSISTANT} sitting and confidently marking a score sheet on her own with a pencil, focused, ${STYLE}` },

  { id: '11', mode: 'scene',
    vo: 'So Ali gives the same five lines to a model.',
    cap: 'Hand them to a model',
    art: `${ALI} ${DESK}, placing a written sheet beside the laptop as if handing it to the computer, purposeful, ${STYLE}` },

  { id: '12', mode: 'info',
    vo: 'This is an LLM as a judge, and it needs three things.',
    cap: 'LLM as a judge',
    info: { tpl: 'fourparts', data: { parts: ['The message', 'What the customer wanted', 'Your five lines'] } } },

  { id: '13', mode: 'ali',
    vo: 'And one more rule, which matters more than the score.',
    cap: 'One more rule',
    art: `${ALI}, standing with one finger raised, a clear emphatic teaching expression, ${HERO}` },

  { id: '14', mode: 'info',
    vo: 'For each line, answer yes or no, and say why in one sentence.',
    cap: 'the rule that matters',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'For each line, answer yes or no, and say why in one sentence.' } } },

  { id: '15', mode: 'ali',
    vo: 'The reason is the part Ali reads, because a score on its own tells him nothing.',
    cap: 'Read the reason',
    art: `${ALI}, standing and reading a sheet closely with genuine interest, ${HERO}` },

  { id: '16', mode: 'info',
    vo: 'Four minutes later it is done: a hundred and forty pass, sixty-six fail.',
    cap: 'Four minutes, 206 scored',
    info: { tpl: 'bars', data: { max: 206, items: [
      { label: 'Pass', value: 140, tone: 'big' },
      { label: 'Fail', value: 66, tone: 'bad' } ] } } },

  { id: '17', mode: 'ali',
    vo: 'Ali reads twenty of the reasons and agrees with nineteen.',
    cap: 'He checks the judge',
    art: `${ALI}, standing and reading down a list, nodding along, ${HERO}` },

  { id: '18', mode: 'info',
    vo: 'The twentieth calls a message jargon, and it is not.',
    cap: 'The judge gets one wrong',
    info: { tpl: 'twocard', data: {
      left: { title: 'Judge says', items: ['“This is jargon” ✗'] },
      right: { title: 'Really', items: ['Plain English', 'Judge is wrong'] } } } },

  { id: '19', mode: 'info',
    vo: 'So the judge gets nineteen out of twenty right, and now Ali knows that.',
    cap: 'Nineteen out of twenty',
    info: { tpl: 'gauge', data: { label: 'Judge agreed with Ali', value: 19, max: 20, good: 'and now Ali knows the number' } } },

  { id: '20', mode: 'scene',
    vo: 'He points the same five lines at his code and asks one question.',
    cap: 'Point it at the code',
    art: `${ALI} ${DESK}, turning to the laptop with the written sheet in hand, a curious expression, ${STYLE}` },

  { id: '21', mode: 'info',
    vo: 'Does this code still do what these five lines say?',
    cap: 'the judge can read code too',
    info: { tpl: 'screen', data: { title: 'claude · code review', lines: [
      { k: 'Does the code still do', v: '' }, { k: 'what these five lines say?', v: '?' } ] } } },

  { id: '22', mode: 'ali',
    vo: 'Three habits keep a judge honest, and Ali writes them above his desk.',
    cap: 'Keep the judge honest',
    art: `${ALI}, standing and gesturing up toward an imagined note on the wall, clear and purposeful, ${HERO}` },

  { id: '23', mode: 'info',
    vo: 'One line per judge. Watch it pick the longest answer. Never let it mark its own work.',
    cap: 'three guardrails',
    info: { tpl: 'checks', data: { items: [
      'One line per judge', 'Watch it favour the longest answer', 'Never let it mark its own work'] } } },

  { id: '24', mode: 'ali',
    vo: 'Two weeks of marking becomes four minutes and twenty reasons to read.',
    cap: 'Two weeks to four minutes',
    art: `${ALI}, standing with a relieved, satisfied smile, shoulders relaxed, ${HERO}` },

  { id: '25', mode: 'ali',
    vo: 'Your turn: take the five lines you wrote and hand them to a model.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand on his chest and the other open in a sincere encouraging gesture, ${HERO}` },

  { id: '26', mode: 'info',
    vo: 'Then say this to Claude: score these against my five lines, yes or no, with one sentence of why, and show me the twenty you were least sure about.',
    cap: 'Say this to Claude',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'Score these against my five lines, yes or no, with one sentence of why. Show me the twenty you were least sure about.' } } },

  { id: '27', mode: 'ali',
    vo: 'Always check your judge before you trust it.',
    cap: 'Check your judge first',
    art: `${ALI}, facing the viewer with a warm but firm, sincere expression, a small nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
