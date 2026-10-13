'use strict';
/*
 * beats.js — "How to Solve Complex Problems"  (TESTING video)
 *
 * FORMAT UNDER TEST: data-visual only. Every single beat is `mode:'info'` — a graph, a pie
 * chart, a hand-drawn sketch diagram or a counted tally. No character art, no Imagen, no
 * cutouts, no i2v. qa-visuals.js recognises this shape ("technical how-to format — no
 * character art") and skips the §3d character rules; the bar here is qa-info + qa-checkpoint
 * + qa-frames. Renderer is animation/lesson.html, which drives .seq / .io-late / [data-tick]
 * plus the two primitives added for this video: [data-draw] (stroke-drawn sketches and line
 * graphs) and [data-arc] (pie sweeps).
 *
 * Ali is still the one protagonist, carried in depth through ONE scenario (marking papers) —
 * he is spoken about and his numbers are on screen, he is simply never drawn.
 *
 * ONE CONCEPT: you do not solve a complex problem in one leap. You cut it into named parts,
 * measure them, and spend your one experiment on the part that is both biggest and least
 * certain. Then repeat.
 *
 * THE NUMBERS ARE CONSISTENT — check them before editing any card:
 *   9 hours/week by hand → the ask is 4 hours/week.
 *   One timed batch of 20 papers = 60 minutes, split 6 / 12 / 6 / 30 / 6.
 *   Three experiments, riskiest first, take that batch to 3 / 6 / 6 / 9 / 3 = 27 minutes.
 *   27/60 of 9 hours = 4 hours. That is where the 4 comes from.
 *
 * Beat 13 is the CHECKPOINT: never drawn, never spoken. The player stops on the boundary,
 * the LMS asks the question, the learner must click an option to continue, reads real
 * feedback, then playback resumes. Beat 14 is the reveal (`revealsQuiz: true`).
 */

/*
 * The question, defined ONCE. It is needed in three places — the card the viewer reads, the
 * payload the LMS pops over the player, and the checkpoint the player pauses on — and three
 * hand-kept copies is how a video ends up asking one question on screen and marking a
 * different one as correct.
 */
const QUIZ = {
  stem: 'You have cut a problem into five parts. Which part do you test first?',
  options: [
    'The quickest part, to get a win on the board',
    'The biggest part that you are least sure you can fix',
    'The parts in the order they happen',
    'All five at once, to save a week',
  ],
  answer: 1,
  correctNote: 'Exactly right. Biggest tells you the fix is worth having, and least-sure tells '
    + 'you it is the part that could sink the whole plan — so testing it first buys you the most '
    + 'information for one week of work.',
  explain: 'The answer is the biggest part you are least sure of. Size tells you a fix there is '
    + 'actually worth the effort, and your own uncertainty tells you it is the part most likely to '
    + 'fail — so you want to find that out in week one, not week four. The quickest part is '
    + 'tempting because a fast win feels like progress, but Ali could already fix collecting and '
    + 'recording, so testing them teaches him nothing he did not know and saves him 12 minutes out '
    + 'of 60. Working in step order is just the one-leap plan again, slower. And running all five '
    + 'at once means that when the number moves you cannot tell which change moved it.',
};

module.exports = [
  // ── the problem, as a number ───────────────────────────────────────────────
  {
    id: '01',
    mode: 'info',
    vo: 'Ali marks papers nine hours a week, and he has been asked to get it to four.',
    cap: 'The ask',
    info: { tpl: 'bignum', data: {
      left: { big: 9, lab: 'hours a week, by hand' },
      sep: '→',
      right: { big: 4, lab: 'hours a week, the ask' },
      note: 'One week to work out how.' } },
  },

  // ── the wrong move: one leap ───────────────────────────────────────────────
  {
    id: '02',
    mode: 'info',
    vo: 'His first instinct was one big leap: hand the whole job over and hope.',
    cap: 'One leap',
    info: { tpl: 'sketch', data: {
      title: 'The one-leap plan',
      nodes: [{ label: '9 hours\nof marking' }, { label: 'AI', tone: 'accent' }, { label: '4 hours' }],
      note: 'One arrow doing all the work.' } },
  },
  {
    id: '03',
    mode: 'info',
    vo: 'Three days of rewriting that one request moved the number almost nowhere.',
    cap: 'Three days · almost nothing',
    info: { tpl: 'line', data: {
      title: 'Hours per week, while prompting harder',
      suffix: 'h',
      max: 10,
      points: [{ x: 'Start', y: 9 }, { x: 'Day 1', y: 8.8 }, { x: 'Day 2', y: 8.7 }, { x: 'Day 3', y: 8.6 }],
      note: 'A better prompt is not a smaller problem.' } },
  },
  {
    id: '04',
    mode: 'info',
    vo: 'A complex problem has no single lever, because it is not one problem.',
    cap: 'Not one problem',
    info: { tpl: 'twocard', data: {
      title: 'What he was treating it as',
      left: { title: 'One problem', items: ['One request', 'One lever to pull', 'One result to hope for'] },
      right: { title: 'Actually', items: ['Five separate steps', 'Five different costs', 'Five different fixes'] } } },
  },

  // ── move 1: cut it into named parts ───────────────────────────────────────
  {
    id: '05',
    mode: 'info',
    vo: 'So Ali stopped guessing and sketched the job as the steps it actually involves.',
    cap: 'Step one · draw the parts',
    info: { tpl: 'sketch', data: {
      title: 'Marking one batch, drawn out',
      nodes: [{ label: 'Collect' }, { label: 'Read' }, { label: 'Score' }, { label: 'Comment' }, { label: 'Record' }],
      note: 'Five named parts beat one vague whole.' } },
  },

  // ── move 2: measure the parts ─────────────────────────────────────────────
  {
    id: '06',
    mode: 'info',
    vo: 'Then he timed a real batch of twenty papers instead of estimating.',
    cap: 'Step two · measure',
    // Was a `tally` with a second row reading "Batches guessed at — 0". A row whose whole
    // content is a zero renders as an empty line, which is indistinguishable from the
    // zeroed-card defect, and the tally's caption chip also collided with the card edge.
    // A 20-cell grid says the same thing by showing every paper he actually put a clock on.
    info: { tpl: 'grid', data: {
      title: 'One batch · 20 papers, every one timed',
      n: 20,
      tone: 'good' } },
  },
  {
    id: '07',
    mode: 'info',
    vo: 'Half of those sixty minutes went into a single step: writing comments.',
    cap: 'Where the minutes went',
    info: { tpl: 'pie', data: {
      title: 'One batch · 60 minutes',
      unit: 'min',
      slices: [
        { label: 'Collect', value: 6 },
        { label: 'Read', value: 12 },
        { label: 'Score', value: 6 },
        { label: 'Comment', value: 30, tone: 'big' },
        { label: 'Record', value: 6 },
      ],
      note: 'Comments alone: 30 of 60 minutes.' } },
  },
  {
    id: '08',
    mode: 'info',
    vo: 'That surprised him, which is the whole reason you measure before you fix.',
    cap: 'Measure, then believe',
    info: { tpl: 'bars', data: {
      title: 'Minutes he expected vs minutes it took — comments',
      suffix: ' min',
      max: 30,
      items: [
        { label: 'Ali\'s guess', value: 10 },
        { label: 'The stopwatch', value: 30, tone: 'big' },
      ] } },
  },

  // ── move 3: rank by size AND uncertainty ──────────────────────────────────
  {
    id: '09',
    mode: 'info',
    vo: 'But the biggest step is not automatically the one to start with.',
    cap: 'Big is not the same as first',
    info: { tpl: 'sketch', data: {
      title: 'Two questions per part',
      // parallel, not sequential — one question does not lead to the other
      arrows: false,
      nodes: [{ label: 'How much\ntime?' }, { label: 'How sure am I\nof a fix?', tone: 'accent' }],
      note: 'You need both answers to pick.' } },
  },
  {
    id: '10',
    mode: 'info',
    vo: 'So he scored every part on how unsure he was that he could fix it.',
    cap: 'Step three · rank by doubt',
    info: { tpl: 'bars', data: {
      title: 'How unsure Ali is that he can fix this part (out of 10)',
      suffix: '/10',
      max: 10,
      items: [
        { label: 'Comment', value: 8, tone: 'big' },
        { label: 'Score', value: 4 },
        { label: 'Read', value: 3 },
        { label: 'Record', value: 2 },
        { label: 'Collect', value: 1 },
      ] } },
  },
  {
    id: '11',
    mode: 'info',
    vo: 'Comments were both the most expensive part and the part he understood least.',
    cap: 'Biggest · and least understood',
    // The two sheets deliberately DISAGREE everywhere except row 0 — the argument of this
    // beat is the intersection, so a sheet that ticked the same rows twice would show nothing.
    info: { tpl: 'scoresheet', data: {
      a: { title: 'Costs the most time', rows: [
        { label: 'Comment', mark: '✓' }, { label: 'Read', mark: '✓' },
        { label: 'Score', mark: '✗' }, { label: 'Collect', mark: '✗' }, { label: 'Record', mark: '✗' }] },
      b: { title: 'Least sure he can fix', rows: [
        { label: 'Comment', mark: '✓' }, { label: 'Read', mark: '✗' },
        { label: 'Score', mark: '✓' }, { label: 'Collect', mark: '✗' }, { label: 'Record', mark: '✗' }] },
      diff: [0],
      note: 'One row is ticked on both sheets. That is the first experiment.' } },
  },

  // ── the interactive question ──────────────────────────────────────────────
  {
    id: '12',
    mode: 'info',
    holdAfter: 6,
    vo: 'Before you see what he did, decide which part you would test first.',
    cap: 'Your turn',
    info: { tpl: 'quiz', data: {
      stem: QUIZ.stem,
      options: QUIZ.options,
      note: 'Pick one before the reveal.' } },
    quiz: {
      stem: QUIZ.stem,
      options: QUIZ.options,
      answer: QUIZ.answer,
      correctNote: QUIZ.correctNote,
      explain: QUIZ.explain,
    },
  },
  {
    // the checkpoint: zero time, never drawn, never spoken. The player stops on the
    // boundary between beat 12 and beat 14, the LMS asks, the learner must answer to resume.
    id: '13',
    mode: 'checkpoint',
    quiz: {
      stem: QUIZ.stem,
      options: QUIZ.options,
      answer: QUIZ.answer,
      correctNote: QUIZ.correctNote,
      explain: QUIZ.explain,
    },
  },

  // ── the reveal, and the payoff ────────────────────────────────────────────
  {
    id: '14',
    mode: 'info',
    revealsQuiz: true,
    vo: 'It is the biggest, least certain part, and for Ali that was comments.',
    cap: 'Answer · biggest and least certain',
    info: { tpl: 'sketch', data: {
      title: 'One week, one experiment',
      nodes: [{ label: 'Comment\n30 min', tone: 'accent' }, { label: 'One test' }, { label: 'Comment\n9 min' }],
      note: 'Everything else left deliberately untouched.' } },
  },
  {
    id: '15',
    mode: 'info',
    vo: 'One experiment on that one part took thirty minutes down to nine.',
    cap: 'Step four · one experiment',
    info: { tpl: 'bars', data: {
      title: 'Comments per batch',
      suffix: ' min',
      max: 30,
      items: [
        { label: 'Before', value: 30, tone: 'bad' },
        { label: 'After', value: 9, tone: 'big' },
      ] } },
  },
  {
    id: '16',
    mode: 'info',
    vo: 'Then he ran the same four moves again on what was left.',
    cap: 'Then repeat',
    info: { tpl: 'checks', data: {
      title: 'The loop he ran three times',
      items: [
        'Draw the parts and name them',
        'Measure each part on real work',
        'Rank by size and by your own doubt',
        'Spend one experiment on the top part',
      ] } },
  },
  {
    id: '17',
    mode: 'info',
    vo: 'Three rounds later the same batch took twenty-seven minutes, not sixty.',
    cap: 'Same batch · 27 minutes',
    info: { tpl: 'pie', data: {
      title: 'The same batch, after three rounds · 27 minutes',
      unit: 'min',
      slices: [
        { label: 'Collect', value: 3 },
        { label: 'Read', value: 6 },
        { label: 'Score', value: 6 },
        { label: 'Comment', value: 9 },
        { label: 'Record', value: 3 },
      ],
      note: 'No single slice owns the clock any more.' } },
  },
  {
    id: '18',
    mode: 'info',
    vo: 'That is nine hours a week down to four, exactly what he was asked for.',
    cap: '9 hours → 4 hours',
    info: { tpl: 'line', data: {
      title: 'Hours per week, one experiment at a time',
      suffix: 'h',
      max: 10,
      points: [{ x: 'Start', y: 9 }, { x: 'Round 1', y: 6 }, { x: 'Round 2', y: 5 }, { x: 'Round 3', y: 4 }],
      // must agree with beat 03, which shows three days of prompting moving nothing
      note: 'Three days of prompting: nothing. Three experiments: five hours.' } },
  },
  {
    id: '19',
    mode: 'info',
    vo: 'You never solved the complex problem; you solved its most uncertain part, repeatedly.',
    cap: 'The whole method',
    info: { tpl: 'quote', data: {
      text: 'You do not solve a complex problem. You solve its biggest uncertain part, and then you do it again.',
      by: 'Draw it · measure it · rank it · test one part' } },
  },
];

// No art, no cutouts, no i2v: every beat is HTML data-visual, so there is nothing to animate
// with an image-to-video model and nothing to segment.
module.exports.animateIds = [];
