// evals-08 — "When a good score lies"
// One concept: an eval set you never change stops measuring quality and starts
// measuring memorisation. One protagonist (Ali), one running task, in depth.
//
// Arc: friction (score up, quality down) -> fix (hold examples back) ->
//      structure (two piles) -> failure mode (the held-out set leaks too) ->
//      payoff (a score he can trust).
//
// Art rules applied throughout: flat 2D vector illustration, warm cream palette,
// NO text/letters/numbers anywhere in the image, props detached and floating,
// `ali` beats are a single subject on plain cream with no ground or shadow so the
// cutout can never slice an object in half.

const ALI = 'a young Pakistani man in his twenties, short black hair, warm brown skin, ' +
            'wearing a simple teal collared shirt and dark trousers';

const STYLE = 'flat 2D vector illustration, clean geometric shapes, warm cream background, ' +
              'soft muted palette of teal, terracotta and sand, no text, no letters, no numbers, ' +
              'no labels, no signage, no writing of any kind';

const HERO = `${STYLE}, single figure centred and fully visible head to toe, plain flat cream ` +
             `background, no ground line, no shadow, no floor, no desk, no scenery, ` +
             `props float detached in the air, nothing cropped at the frame edge`;

module.exports = [
  {
    id: '01',
    mode: 'scene',
    vo: 'Ali built a grading assistant for his school, and every week its score climbed higher.',
    art: `${STYLE}. ${ALI} sitting at a simple desk looking pleased at a laptop, ` +
         `a blank upward-trending arrow floating beside him made of pure shape, no numbers`,
  },
  {
    id: '02',
    mode: 'info',
    vo: 'By the fourth week the score had gone from good to almost perfect.',
    // `info` beats render via animation/info.js templates and need info:{tpl,data}.
    // An `overlay` alone renders NOTHING -- lesson.html requires beat.info.tpl.
    info: {
      tpl: 'gauge',
      data: { label: 'Eval score, week four', value: 96, max: 100, good: 'It looked like progress.' },
    },
  },
  {
    id: '03',
    mode: 'scene',
    vo: 'Then a teacher told him the grades it was giving her class were plainly wrong.',
    art: `${STYLE}. A woman teacher in a maroon shalwar kameez holding a stack of blank ` +
         `papers with a concerned expression, standing in a simple classroom of flat shapes, ` +
         `blank walls, no writing anywhere`,
  },
  {
    id: '04',
    mode: 'ali',
    vo: 'The number said the assistant was getting better while the actual work was getting worse.',
    art: `${HERO}. ${ALI} standing alone, arms slightly out, puzzled expression, ` +
         `one blank rectangular card floating on each side of him`,
    overlay: 'score ↑   quality ↓',
  },
  {
    id: '05',
    mode: 'scene',
    vo: 'So Ali opened the set of examples he had been scoring against every single week.',
    art: `${STYLE}. ${ALI} seen from behind at a desk, looking at a grid of twenty small ` +
         `identical blank cards arranged neatly in front of him, plain cream room, no writing`,
  },
  {
    id: '06',
    mode: 'info',
    vo: 'It was the same twenty examples it had always been, and he had been tuning against them the whole time.',
    info: {
      tpl: 'checks',
      data: {
        title: 'The same eval set, every single week',
        items: ['Twenty examples', 'Never once changed', 'Tuned against them twelve times'],
      },
    },
  },
  {
    id: '07',
    mode: 'ali',
    vo: 'His assistant had not learned to grade well, it had learned those twenty answers.',
    art: `${HERO}. ${ALI} standing alone with a flat expression of realisation, ` +
         `holding one blank card up in front of him, a small cluster of identical blank ` +
         `cards floating in a tight ring around his head`,
  },
  {
    id: '08',
    mode: 'scene',
    vo: 'The fix was simple: he split his examples into two piles and locked one of them away.',
    art: `${STYLE}. ${ALI} at a desk dividing a stack of blank cards into two distinct ` +
         `separate piles, one pile beside an open simple wooden box, calm and deliberate posture`,
  },
  {
    id: '09',
    mode: 'info',
    vo: 'He tunes on the first pile and only ever measures on the second.',
    info: {
      tpl: 'twocard',
      data: {
        title: 'Two piles, and they never swap',
        left: { title: 'Tune on these', items: ['Look as often as you like', 'Fix what they catch'] },
        right: { title: 'Measure on these', items: ['Never tuned against', 'Never even read'] },
      },
    },
  },
  {
    id: '10',
    mode: 'ali',
    vo: 'His score dropped immediately, and that drop was the first honest number he had seen.',
    art: `${HERO}. ${ALI} standing alone looking calm and relieved rather than upset, ` +
         `a blank downward arrow shape floating beside his shoulder`,
  },
  {
    id: '11',
    mode: 'info',
    vo: 'The catch is that a locked pile leaks the moment you start fixing things to please it.',
    info: {
      tpl: 'statement',
      data: {
        text: 'A held-out set you keep fixing against is just another tuning set.',
        hi: 'just another tuning set',
        sub: 'Retire it and cut a fresh one.',
      },
    },
  },
  {
    id: '12',
    mode: 'scene',
    vo: 'Now when Ali tells that teacher the assistant improved, the number behind it means something.',
    art: `${STYLE}. ${ALI} and the woman teacher in a maroon shalwar kameez standing together ` +
         `in a simple classroom, both looking satisfied, a blank clipboard held between them, ` +
         `warm cream walls, no writing anywhere`,
  },
];
