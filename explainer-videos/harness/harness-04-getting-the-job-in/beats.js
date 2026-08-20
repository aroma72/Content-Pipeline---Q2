'use strict';
/*
 * beats.js — "Getting the Job In & Running It" (The Harness series, video 04).
 * CONTINUES V1–V3: same locked Ali (art/_ref.png), shop + AI helper, glowing honey ORB = brain,
 * room = harness. ONE concept: three parts of the room carry a job from typed to done — the DOOR
 * (ingress), the MEMORY (state + resume), and the LOOP (orchestration, the "brainstem"). Does NOT
 * overlap evals or autonomy. Traces ONE multi-step job through the room, over time.
 * CAMERA-PAN build: stills + Ken Burns / cutout-puppet only — NO i2v clips. No baked text.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const DESK = 'sitting at a tidy small wooden desk with an open laptop';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const ORB = 'a soft glowing rounded orb of warm honey light representing the AI brain, friendly and simple';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'A good room can finish a whole job on its own.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'The room finishes the whole job.', hi: 'whole job', sub: 'It takes it in, remembers, and keeps going.' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali hands his helper a real job with several steps.',
    cap: 'A multi-step job',
    art: `${ALI} ${DESK}, leaning in and handing over a task with a hopeful look toward ${ORB}, warm light, ${STYLE}` },

  { id: '03', mode: 'ali',
    vo: 'Handing over a whole job, not a single question, feels like a leap.',
    cap: 'It feels like a leap',
    art: `${ALI}, standing with a hopeful but slightly nervous expression, hand rubbing the back of his neck, ${HERO}` },

  { id: '04', mode: 'info',
    vo: 'Three quiet parts of the room carry it from typed to done.',
    cap: 'Three parts',
    info: { tpl: 'statement', data: { text: 'Typed to done: three parts.', hi: 'three parts' } } },

  { id: '05', mode: 'info',
    vo: 'Part one, the door: the way a job gets in.',
    cap: 'The door',
    info: { tpl: 'statement', data: { text: 'The door: how a job gets in.', hi: 'door' } } },

  { id: '06', mode: 'scene',
    vo: 'He can type it in himself, or let it arrive on a timer.',
    cap: 'Typed, or on a timer',
    art: `${ALI} ${DESK}, watching a small folded note slip through a simple doorway into a warm glowing room toward ${ORB}, a small round clock on the wall, ${STYLE}` },

  { id: '07', mode: 'info',
    vo: 'Part two, the memory: the room keeps a running note of where it is.',
    cap: 'The memory',
    info: { tpl: 'statement', data: { text: 'The memory: where the job is.', hi: 'memory' } } },

  { id: '08', mode: 'scene',
    vo: 'As each step finishes, that note quietly updates itself.',
    cap: 'A note that updates',
    art: `${ALI} standing beside the glowing room where a small simple checklist notepad sits next to ${ORB}, a few items gently ticked, ${STYLE}` },

  { id: '09', mode: 'scene',
    vo: 'So Ali closes his laptop and walks away in the middle of the job.',
    cap: 'He walks away',
    art: `${ALI} standing in a plain warm room, one hand resting on the lid of a closed laptop on the desk beside him as he turns to leave, relaxed and unworried, ${STYLE}` },

  { id: '10', mode: 'ali',
    vo: 'When he comes back, it did not start over; it picked up where it left off.',
    cap: 'It carried on',
    art: `${ALI}, standing with a pleased relieved smile, a small approving nod, ${HERO}` },

  { id: '11', mode: 'info',
    vo: 'That running memory is what lets it stop and pick right back up.',
    cap: 'Stop and resume',
    info: { tpl: 'statement', data: { text: 'The memory lets it stop and resume.', hi: 'resume' } } },

  { id: '24', mode: 'info', holdAfter: 6,
    vo: 'Quick question: Ali closes his laptop mid-job, so why does it not start over?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'Ali closes his laptop mid-job. Why does the helper not start over?',
      options: ['It memorised the whole internet', 'It kept a running note of where it was', 'It was already finished', 'It asked a colleague'],
      note: 'Write your answer down.' } } },

  { id: '25', mode: 'info',
    vo: 'It kept a running note of where it was, and carried on.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Why does it not start over?',
      options: ['It memorised the whole internet', 'It kept a running note of where it was', 'It was already finished', 'It asked a colleague'],
      answer: 1, note: 'The running memory — its state — lets it resume.' } } },

  { id: '12', mode: 'info',
    vo: 'Part three, the loop: the room keeps choosing the next step.',
    cap: 'The loop',
    info: { tpl: 'statement', data: { text: 'The loop: choose the next step.', hi: 'loop' } } },

  { id: '13', mode: 'info',
    vo: 'Each turn it decides: use a tool, take a step, or finish.',
    cap: 'Each turn, a choice',
    info: { tpl: 'statement', data: { text: 'Each turn: use a tool, step, or finish.', hi: 'Each turn' } } },

  { id: '14', mode: 'scene',
    vo: 'Round and round it goes, one small decision at a time.',
    cap: 'Round and round',
    art: `${ALI} standing beside the glowing room where soft rounded arrows circle gently around ${ORB} in a loop, ${STYLE}` },

  { id: '15', mode: 'ali',
    vo: 'If a step needs a tool, it reaches for one and keeps moving.',
    cap: 'It reaches for a tool',
    art: `${ALI}, standing and watching with a calm attentive nod, one hand gesturing forward, ${HERO}` },

  { id: '16', mode: 'info',
    vo: 'It repeats that loop until the job is actually done.',
    cap: 'Loops until done',
    info: { tpl: 'statement', data: { text: 'It loops until the job is done.', hi: 'done' } } },

  { id: '17', mode: 'scene',
    vo: 'Then it brings Ali the finished work, from start to end.',
    cap: 'Finished, start to end',
    art: `${ALI} standing in a plain warm room beside a tidy stack of finished papers resting on the desk, a satisfied happy smile, ${STYLE}` },

  { id: '18', mode: 'info',
    vo: 'Door in, memory of where, loop to the finish.',
    cap: 'From typed to done',
    info: { tpl: 'screen', data: { title: 'From typed to done', lines: [
      { k: 'The door', v: 'job gets in' }, { k: 'The memory', v: 'where it is' },
      { k: 'The loop', v: 'next step, until done' } ] } } },

  { id: '19', mode: 'info',
    vo: 'The memory and the loop are what make it an agent, not a chat.',
    cap: 'This makes it an agent',
    info: { tpl: 'statement', data: { text: 'This is what makes it an agent.', hi: 'agent', sub: 'Not a chat that forgets.' } } },

  { id: '20', mode: 'ali',
    vo: 'A chat answers once; this room works a job all the way through.',
    cap: 'Not just an answer',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },

  { id: '21', mode: 'ali',
    vo: 'Your turn: think of one job with several steps you could hand over.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '22', mode: 'info',
    vo: 'Then say this: take this multi-step job, keep notes as you go, and finish it.',
    cap: 'Say this to Claude',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'Take this multi-step job, keep notes as you go, and finish it.' } } },

  { id: '23', mode: 'ali',
    vo: 'A door in, a memory, and a loop — that is how a job gets done.',
    cap: 'How a job gets done',
    art: `${ALI}, facing the viewer with a warm confident smile and a small nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["06","14","23"]; // i2v story beats (house rule: use-animations)
