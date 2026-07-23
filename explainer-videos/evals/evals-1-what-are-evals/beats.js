'use strict';
/*
 * beats.js — "What Are Evals?" (beginner). Phase 5 evals series.
 * ONE protagonist (Ali), one concept (evals = a way to check the AI's work is correct),
 * beginner-friendly, one spoken sentence per beat. Flat 2D vector; no baked-in text; movement every beat.
 * Cutout objects are kept WHOLE (segmentation fills interior holes — nothing cut within an object).
 */
const ALI = 'Ali, a young South Asian man with short neat black hair, clean-shaven, ' +
  'wearing a teal collared shirt and dark trousers';
const STYLE = 'flat 2D vector editorial illustration, clean simple rounded shapes, warm cream ' +
  'palette, soft friendly style, absolutely no text, no words, no letters, no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  {
    id: '01', mode: 'ali',
    vo: 'An eval is simply a way to check if your AI’s work is actually correct.',
    cap: 'What is an eval?',
    art: `${ALI}, smiling and holding a small clipboard checklist, a floating laptop screen icon beside him, hopeful, ${HERO}`,
  },
  {
    id: '02', mode: 'scene',
    vo: 'Ali asked his AI agent to build a small feature.',
    cap: 'The agent builds',
    art: `${ALI} sitting at a tidy desk watching a small friendly robot assistant build an app on his laptop, bright modern office, gentle depth, ${STYLE}`,
  },
  {
    id: '03', mode: 'ali',
    vo: 'It looked finished, but Ali could not tell if it truly worked.',
    cap: 'Looks done… but is it?',
    art: `${ALI}, looking puzzled and unsure, a floating laptop screen and a big question mark beside him, ${HERO}`,
  },
  {
    id: '04', mode: 'scene',
    vo: 'If you have ever just trusted that it works, you are not alone.',
    cap: 'We have all done this',
    art: `${ALI} at his desk shrugging with a gentle reassuring smile, colleagues softly working in a bright warm office behind him, ${STYLE}`,
  },
  {
    id: '05', mode: 'info',
    vo: 'The word eval is just short for evaluation — a quality check.',
    cap: 'Eval = evaluation',
    info: { tpl: 'statement', data: { text: 'Eval is short for evaluation.', hi: 'evaluation' } },
  },
  {
    id: '06', mode: 'ali',
    vo: 'Here is the trap: an AI can pass its own test without being right.',
    cap: 'The hidden trap',
    art: `${ALI}, pointing warily at a floating screen showing a big green check mark, while a small friendly red bug peeks out from behind the screen, ${HERO}`,
  },
  {
    id: '07', mode: 'info',
    vo: 'You cannot improve what you do not measure.',
    cap: 'Measure to improve',
    info: { tpl: 'statement', data: { text: 'You cannot improve what you do not measure.', hi: 'measure' } },
  },
  {
    id: '08', mode: 'ali',
    vo: 'So an eval gives the AI a clear target to be checked against.',
    cap: 'A clear target',
    art: `${ALI}, gesturing confidently toward a floating bullseye target with an arrow in the centre, ${HERO}`,
  },
  {
    id: '09', mode: 'scene',
    vo: 'Think of it like a teacher’s answer key for the agent’s homework.',
    cap: 'Like an answer key',
    art: `${ALI} holding a blank answer-key sheet beside a blank homework worksheet, comparing them thoughtfully, warm study setting, ${STYLE}`,
  },
  {
    id: '10', mode: 'info',
    vo: 'Every eval has two parts: what good looks like, and a score.',
    cap: 'Criteria + score',
    info: { tpl: 'twocard', data: {
      title: 'Every eval has two parts',
      left: { title: 'Criteria', items: ['what good looks like'] },
      right: { title: 'Score', items: ['how well it did'] },
    } },
  },
  {
    id: '11', mode: 'ali',
    vo: 'Without it Ali was only hoping; with it, he actually knows.',
    cap: 'Hoping vs. knowing',
    art: `${ALI}, smiling confidently with a thumbs up, a floating green check mark beside him, ${HERO}`,
  },
  {
    id: '12', mode: 'scene',
    vo: 'Evals matter even more as the AI does more on its own.',
    cap: 'More independence, more checking',
    art: `${ALI} calmly watching a small robot assistant work on its own at a laptop, a soft safety net illustrated beneath it, bright office, gentle depth, ${STYLE}`,
  },
  {
    id: '13', mode: 'ali',
    vo: 'So Ali now starts every task by asking, how will I check this?',
    cap: 'Ask this first',
    art: `${ALI}, thoughtful, writing on a small blank sticky note with a pen, a lightbulb glowing softly above him, ${HERO}`,
  },
  {
    id: '14', mode: 'info',
    vo: 'Next, we meet the two eval types every beginner should know.',
    cap: 'Two key types coming up',
    info: { tpl: 'twocard', data: {
      title: 'Two key types (coming up)',
      left: { title: 'E2E testing', items: ['did it work?'] },
      right: { title: 'LLM as a judge', items: ['was it good?'] },
    } },
  },
  {
    id: '15', mode: 'ali',
    vo: 'Which of your AI’s results are you trusting without checking?',
    cap: 'Your turn',
    art: `${ALI}, turning to face the viewer with a warm inviting expression and an open hand gesture, ${HERO}`,
  },
];
