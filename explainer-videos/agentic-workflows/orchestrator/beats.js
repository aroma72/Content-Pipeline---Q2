'use strict';
/*
 * beats.js — "One Lead, Many Hands" (Agentic Workflows: the orchestrator pattern).
 * ONE protagonist (Ali), ONE scenario (a festival order split by a lead helper among
 * worker helpers, then recombined), ONE concept (orchestrator: split -> delegate ->
 * synthesize/check). Woven emotional spine = the IDENTITY SHIFT: craftsman who does
 * every piece himself -> feels deskilled as a lead -> reframes to architect (a bigger,
 * more interesting role, not a lesser one).
 *
 * Modes: ali = Ali alone (cutout). scene = multi-subject / robots (lead + workers).
 * info = crisp HTML (orchestrator diagram, quiz, statements). Text lives ONLY on info.
 * Interactive: id 12 QUESTION (holdAfter 6s), id 20 REVEAL. Guardrail: the question
 * tests only the on-screen orchestrator example.
 * i2v (a few, multi-character): 10 (delegation), 11 (workers busy), 15 (order goes out).
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const SHOP = 'a small tidy sweet shop with a wooden front counter and shelves of colourful boxes behind';
const WORKER = 'a plain friendly white-and-teal worker robot with a gentle glowing screen face';
const LEAD = 'a lead robot, white and teal with a warm amber scarf band around its neck, a gentle glowing screen face';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const ORCH = { lead: 'Lead', workers: ['Sweets', 'Packing', 'Notes'] };

module.exports = [
  // ---- INTRO: the family of agentic workflows, then zoom into the orchestrator ----
  { id: 'w1', mode: 'info', holdAfter: 3.5, vo: 'Agentic work comes in a few shapes. Prompt chaining, routing, parallelization, the orchestrator, and an evaluator that checks the work.',
    cap: 'the workflow family', info: { tpl: 'menu', data: { items: [
      { name: 'Prompt chaining', brief: 'fixed steps, each feeds the next' },
      { name: 'Routing', brief: 'sort the request to the right path' },
      { name: 'Parallelization', brief: 'split into parts that run at once' },
      { name: 'Orchestrator', brief: 'a lead splits, delegates, and combines', hi: true },
      { name: 'Evaluator', brief: 'one makes, one checks, in a loop' },
    ] } } },
  { id: 'w2', mode: 'info', vo: 'Most of these run a fixed path. The orchestrator plans the split itself, so that is the one we go deep on.',
    cap: 'we go deeper on the orchestrator', info: { tpl: 'statement', data: { text: 'The orchestrator plans the split itself.', hi: 'plans the split' } } },

  { id: '01', mode: 'info', vo: 'A task too big for one helper needs a lead, not just more hands.',
    cap: 'A lead, not more hands', info: { tpl: 'statement', data: { text: 'A lead, not just more hands.', hi: 'lead' } } },
  { id: '02', mode: 'scene', vo: "A huge festival order lands on Ali's counter one morning.",
    cap: 'A huge order arrives', art: `A huge festive order sheet and a tall stack of empty gift boxes landing on the wooden counter of ${SHOP}, ${ALI} looking at the big pile with wide eyes, bright morning light, ${STYLE}` },
  { id: '03', mode: 'ali', vo: 'Ali has always been the craftsman who makes every piece himself.',
    cap: 'The craftsman', art: `${ALI}, proudly holding up a single beautifully made sweet he crafted, a satisfied maker's smile, ${HERO}` },
  { id: '04', mode: 'ali', vo: 'He gives the whole order to one helper and waits.',
    cap: 'Hand it all to one', art: `${ALI}, holding out a large order sheet in one hand as if handing it off, then waiting, ${HERO}` },
  { id: '05', mode: 'scene', vo: 'The helper works all day, falls behind, and starts mixing things up.',
    cap: 'One helper, overwhelmed', art: `A single ${WORKER} at the counter of ${SHOP} surrounded by a big messy pile of half-packed boxes and scattered sweets, looking overwhelmed and behind, ${STYLE}` },
  { id: '06', mode: 'info', vo: 'One helper doing everything becomes the bottleneck.',
    cap: 'the bottleneck', info: { tpl: 'statement', data: { text: 'One helper becomes the bottleneck.', hi: 'bottleneck' } } },
  { id: '07', mode: 'ali', vo: 'So Ali steps back from the bench and becomes the lead instead.',
    cap: 'He becomes the lead', art: `${ALI}, stepping back from a workbench with a thoughtful expression, hands open, taking on a new role, ${HERO}` },
  { id: '08', mode: 'ali', vo: 'At first this feels wrong, like he has stopped doing the real work.',
    cap: 'It feels like less', art: `${ALI}, looking uncertain and a little uneasy, glancing at his empty hands, self-doubt, ${HERO}` },
  { id: '09', mode: 'info', vo: 'The lead reads the whole order and splits it into parts.',
    cap: 'the lead splits the work', info: { tpl: 'orchestrator', data: { ...ORCH, dir: 'out' } } },
  { id: '10', mode: 'scene', vo: 'It hands each part to a worker who is good at that one thing.',
    cap: 'Delegate each part', art: `${LEAD} standing at the counter of ${SHOP} handing three separate work parcels to three ${WORKER}s lined up beside it, organised and coordinated, ${STYLE}` },
  { id: '11', mode: 'scene', vo: 'One makes the sweets, one packs the boxes, one writes the notes.',
    cap: 'Workers in parallel', art: `Three ${WORKER}s working in parallel at ${SHOP}: one arranging sweets, one packing a gift box, one writing on a note card, lively and busy, ${STYLE}` },
  { id: '12', mode: 'info', holdAfter: 6, vo: "The workers each finish their part. What is the lead's most important job now? Write your answer down.",
    cap: 'Your turn — write it down', info: { tpl: 'quiz', data: {
      stem: "The workers each finish. What is the lead's most important job now?",
      options: ['Combine the pieces and check they fit', 'Start a new order', 'Redo it all itself', 'Send the workers home'],
      note: 'Write your answer down.' } } },
  { id: '13', mode: 'info', vo: 'The lead gathers every finished piece back together.',
    cap: 'gather every piece back', info: { tpl: 'orchestrator', data: { ...ORCH, dir: 'in' } } },
  { id: '14', mode: 'scene', vo: 'It checks the pieces fit, sweets for a hundred and boxes for a hundred.',
    cap: 'Do the pieces fit?', art: `${LEAD} at the counter of ${SHOP} carefully bringing together three finished piles of sweets, boxes and notes, checking them side by side, focused, ${STYLE}` },
  { id: '15', mode: 'scene', vo: 'It catches that the boxes were only fifty, and sends that one part back.',
    cap: 'Catches the mismatch', art: `${LEAD} at ${SHOP} noticing a shortfall, a small short stack of boxes beside a tall stack of sweets, holding up the boxes with a concerned look and handing them back, ${STYLE}` },
  { id: '16', mode: 'info', vo: 'The part people forget is this fitting together, and that is where a lead matters most.',
    cap: 'synthesis', info: { tpl: 'statement', data: { text: 'The fitting together is where a lead matters most.', hi: 'fitting together' } } },
  { id: '17', mode: 'ali', vo: 'Ali sees it now, coordinating the whole order is a bigger job than making one sweet.',
    cap: 'A bigger job', art: `${ALI}, a look of dawning realization and quiet pride, gesturing to take in a whole coordinated operation, ${HERO}` },
  { id: '18', mode: 'info', vo: 'One helper alone was slow and mixed up, but a lead with workers is fast and fits.',
    cap: 'before → after', info: { tpl: 'twocard', data: {
      title: 'One helper vs a lead',
      left: { title: 'One helper', items: ['slow', 'mixed up'] },
      right: { title: 'Lead + workers', items: ['fast', 'it all fits'] } } } },
  { id: '19', mode: 'ali', vo: 'He is not less of a craftsman, he is the architect of the whole thing.',
    cap: 'Architect, not less', art: `${ALI}, standing tall and assured with a warm confident smile, arms lightly folded, a leader at ease, ${HERO}` },
  { id: '20', mode: 'info', vo: 'The answer is combine the pieces and check they fit.',
    cap: 'The answer', info: { tpl: 'quiz', data: {
      stem: 'The answer',
      options: ['Combine the pieces and check they fit', 'Start a new order', 'Redo it all itself', 'Send the workers home'],
      answer: 0, note: 'Combine, and check they fit.' } } },
  { id: '21', mode: 'ali', vo: 'Your turn. Take one task too big for a single AI request.',
    cap: 'Pick one big task', art: `${ALI}, facing the viewer with a warm inviting open-handed gesture, encouraging, ${HERO}` },
  { id: '22', mode: 'info', vo: 'Tell Claude to be the lead, split this into parts, do each, then combine and check them.',
    cap: 'the prompt', info: { tpl: 'promptcard', data: { app: 'Claude', text: 'Be the lead: split this into parts, do each, then combine and check them.' } } },
  { id: '23', mode: 'ali', vo: 'You are not doing less, you are orchestrating the whole thing.',
    cap: 'You orchestrate the whole', art: `${ALI}, facing the viewer with a confident reassuring smile and a small nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ['10', '11', '15']; // delegation + workers busy + order goes out
