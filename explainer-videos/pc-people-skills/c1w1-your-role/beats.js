'use strict';
/*
 * beats.js — P&C People Skills · Course 1 · Week 1
 * "Your Role as a P&C Buddy: Supporting People from Candidate to Alumni"
 *
 * FORMAT: LearnFree-style flat motion graphics (reference: GCF LearnFree "Hard Skills vs
 * Soft Skills"). Every beat is `mode:'info'` drawn by animation/info-lf.js: full-bleed colour
 * fields (cream / teal / mustard), a bold slab-serif title, simple geometric icons and flat
 * figures. No Imagen art, no cutouts, no i2v — the only paid step is Gemini TTS.
 *
 * VOICE: addressed to the viewer as "you", a P&C Buddy. Aroma dropped the Ali storyline for
 * the P&C courses on 2026-10-05 — this is a deliberate exception to the Ali rule, so a gate
 * that asks for a protagonist is expected to complain and must not be "fixed" back to Ali.
 *
 * LEARNING GOALS (one video, one concept — your role):
 *   1. Your role at each stage: candidate, onboarding, employee, alumni      → beats 02–06
 *   2. Care for the person while staying fair to the organisation           → beats 07–10
 *   3. Supporting someone is not rescuing them                               → beats 11–16 + LMS checkpoint
 *   4. Every interaction shapes how a person sees the whole company          → beats 18–20
 *
 * Beat 17 is the CHECKPOINT: never drawn, never spoken, and (Aroma, 2026-10-06) the question is
 * NEVER put in the video as a card either. The player stops on the boundary after beat 16, the LMS
 * shows the question from checkpoint.json, the learner must pick an option to continue, reads the
 * feedback, then playback resumes on beat 18. qa-checkpoint.js fails the build on any drawn quiz.
 */

const QUIZ = {
  stem: 'A new joiner tells you they feel lost in their team. Which response supports them rather than rescues them?',
  options: [
    'Ask to move them to a different team straight away',
    'Ask what feels hardest, then help them plan one first step',
    'Tell them everyone feels this way and it will pass',
    'Promise them their manager will sort it out by Friday',
  ],
  answer: 1,
  correctNote: 'Exactly right. Asking what feels hardest keeps the problem theirs and shows you '
    + 'are listening, and planning one first step together helps them act. Next time they will '
    + 'have done it once already.',
  explain: 'The supporting response is to ask what feels hardest and help them plan one first '
    + 'step. Moving them to a new team is rescuing: you solve the problem for them, and they '
    + 'learn nothing about settling in. Saying everyone feels this way dismisses what they told '
    + 'you, so they stop telling you things. Promising the manager will fix it by Friday is a '
    + 'promise you cannot keep, and it moves the problem onto someone who is not in the room.',
};

module.exports = [
  // ── open ──────────────────────────────────────────────────────────────────
  {
    id: '01',
    mode: 'info',
    tone: 'with a warm, welcoming smile in the voice',
    vo: 'You are a P&C Buddy, and that role is bigger than it first looks.',
    info: { tpl: 'lfTitle', data: { bg: 'mustard', text: 'Your Role', sub: 'as a P&C Buddy', shapes: 'squares' } },
  },

  // ── goal 1: the journey ───────────────────────────────────────────────────
  {
    id: '02',
    mode: 'info',
    tone: 'with quiet pride, painting the bigger picture',
    vo: 'You are with people from the day they apply until long after they leave.',
    info: { tpl: 'lfJourney', data: {
      stops: ['Candidate', 'Onboarding', 'Employee', 'Alumni'], active: -1 } },
  },
  {
    id: '03',
    mode: 'info',
    tone: 'brightly, as if greeting someone new',
    vo: 'When someone is a candidate, you are often the first person from the company they talk to.',
    info: { tpl: 'lfStage', data: {
      bg: 'cream', label: 'Candidate', icon: 'resume', figure: 'b', side: 'right',
      tag: 'First impression' } },
  },
  {
    id: '04',
    mode: 'info',
    tone: 'gently and reassuringly',
    vo: 'In onboarding, you help a nervous new joiner find their feet and feel they belong.',
    info: { tpl: 'lfStage', data: {
      bg: 'teal', label: 'Onboarding', icon: 'badge', figure: 'a', side: 'right',
      tag: 'Belonging' } },
  },
  {
    id: '05',
    mode: 'info',
    tone: 'with steady, caring seriousness',
    vo: 'While they work here, you are the person they come to when something is not right.',
    info: { tpl: 'lfStage', data: {
      bg: 'cream', label: 'Employee', icon: 'chat', figure: 'c', side: 'right',
      tag: 'Someone to talk to' } },
  },
  {
    id: '06',
    mode: 'info',
    tone: 'with soft respect and a touch of warmth',
    vo: 'And when they leave, you help them go with respect, because alumni still talk about us.',
    info: { tpl: 'lfStage', data: {
      bg: 'teal', label: 'Alumni', icon: 'door', figure: 'b', side: 'right',
      tag: 'Leaving well' } },
  },

  // ── goal 2: care and stay fair ────────────────────────────────────────────
  {
    id: '07',
    mode: 'info',
    tone: 'thoughtfully, with curiosity',
    vo: 'So what is the thinking behind all of this work?',
    info: { tpl: 'lfTitle', data: { bg: 'teal', text: 'The Thinking', sub: 'behind the role', italic: true, shapes: 'dots' } },
  },
  {
    id: '08',
    mode: 'info',
    tone: 'calmly and with conviction',
    vo: 'You care for the person, and you stay fair to the organisation, both at the same time.',
    info: { tpl: 'lfScale', data: { left: 'The person', right: 'The organisation', tilt: 0 } },
  },
  {
    id: '09',
    mode: 'info',
    tone: 'with a gentle note of caution',
    vo: 'Lean only toward the person, and you end up taking sides.',
    info: { tpl: 'lfScale', data: { left: 'The person', right: 'The organisation', tilt: -1,
      tag: 'Taking sides' } },
  },
  {
    id: '10',
    mode: 'info',
    tone: 'with quiet concern',
    vo: 'Lean only toward the company, and people stop telling you the truth.',
    info: { tpl: 'lfScale', data: { left: 'The person', right: 'The organisation', tilt: 1,
      tag: 'Lost trust' } },
  },

  // ── goal 3: support, not rescue ───────────────────────────────────────────
  {
    id: '11',
    mode: 'info',
    tone: 'clearly and deliberately, drawing an important line',
    vo: 'There is one more line to hold: supporting someone is not the same as rescuing them.',
    info: { tpl: 'lfVersus', data: { left: 'Rescue', right: 'Support' } },
  },
  {
    id: '12',
    mode: 'info',
    tone: 'matter-of-factly, with a hint of wry recognition',
    vo: 'Rescuing means you fix the problem for them, so next time they need you again.',
    info: { tpl: 'lfLoop', data: { title: 'Rescue', bg: 'cream',
      steps: ['They bring a problem', 'You fix it for them', 'They come back next time'] } },
  },
  {
    id: '13',
    mode: 'info',
    tone: 'encouragingly, with lift and energy',
    vo: 'Supporting means you help them see their options, and they choose the next step.',
    info: { tpl: 'lfOptions', data: { title: 'Support', bg: 'teal',
      options: ['Option A', 'Option B', 'Option C'], chosen: 1 } },
  },
  {
    id: '14',
    mode: 'info',
    tone: 'with empathy, as if you have heard this many times',
    vo: 'Say an employee tells you their manager never gives them any feedback.',
    info: { tpl: 'lfTalk', data: { bg: 'teal', speaker: 'a',
      bubble: 'My manager never gives me any feedback.' } },
  },
  {
    id: '15',
    mode: 'info',
    tone: 'lightly, with a knowing tone',
    vo: 'A rescuer marches off to talk to the manager on their behalf.',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'Rescue', bg: 'cream', bubble: 'Leave it with me. I will talk to them.' },
      right: { title: 'Support', bg: 'teal', bubble: '', dim: true },
      focus: 'left' } },
  },
  {
    id: '16',
    mode: 'info',
    tone: 'warmly and confidently',
    vo: 'A supporter asks what they have tried, and helps them plan that conversation themselves.',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'Rescue', bg: 'cream', bubble: 'Leave it with me. I will talk to them.', dim: true },
      right: { title: 'Support', bg: 'teal', bubble: 'What have you tried so far? Let us plan it.' },
      focus: 'right' } },
  },

  // ── the checkpoint: NOT in the video. The LMS pauses here and asks (see checkpoint.json) ──
  {
    id: '17',
    mode: 'checkpoint',
    quiz: { ...QUIZ },
  },
  // ── goal 4: every moment adds up ──────────────────────────────────────────
  {
    id: '18',
    mode: 'info',
    tone: 'reflectively, slowing down slightly',
    vo: 'Every one of these small moments adds up to one big picture.',
    info: { tpl: 'lfDots', data: { n: 24, label: 'Small moments' } },
  },
  {
    id: '19',
    mode: 'info',
    tone: 'sincerely, with heart',
    vo: 'People rarely remember the policy, but they always remember how you treated them.',
    info: { tpl: 'lfSplit', data: {
      left: { title: 'The policy', bg: 'cream', icon: 'policy', dim: true },
      right: { title: 'How you treated them', bg: 'teal', icon: 'heart' },
      focus: 'right' } },
  },
  {
    id: '20',
    mode: 'info',
    tone: 'with uplifting conviction',
    vo: 'That is how one P&C Buddy shapes how someone sees the whole company.',
    info: { tpl: 'lfJourney', data: {
      stops: ['Candidate', 'Onboarding', 'Employee', 'Alumni'], active: 4, glow: true } },
  },

  // ── close ─────────────────────────────────────────────────────────────────
  {
    id: '21',
    mode: 'info',
    tone: 'warmly and with energy, like a confident close',
    vo: 'So know the journey, care and stay fair, and support rather than rescue.',
    info: { tpl: 'lfRecap', data: { items: ['Know the journey', 'Care and stay fair', 'Support, do not rescue'] } },
  },
];

// Pure HTML motion graphics: nothing to animate with an image-to-video model.
module.exports.animateIds = [];
