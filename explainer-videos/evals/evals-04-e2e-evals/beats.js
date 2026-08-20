'use strict';
/*
 * beats.js — "End-To-End Evals" (evals series, video 04). Camera-pan build.
 * Same locked Ali (art/_ref.png, Gemini-seeded). ONE move: stop checking the parts,
 * walk the whole journey like a stranger. Varied graphics: gauge, green grids,
 * a terminal, journey-step checks, a before/after BAR GRAPH, and browser SCREENSHOTS.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const DESK = 'sitting at a tidy small wooden desk with an open laptop showing a plain blank interface';
const STALL = 'a sunny open-air fruit stall with wooden crates of ripe orange-yellow mangoes';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  { id: '01', mode: 'info',
    vo: 'Your app can pass every check and still lock people out.',
    cap: 'The one move',
    info: { tpl: 'statement', data: { text: 'Pass every check, still lock people out.', hi: 'lock people out' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali fixed the four failures Claude named, and ran his checks again.',
    cap: 'Fixed and re-ran',
    art: `${ALI} ${DESK}, looking satisfied and a little relieved as he reviews his work, warm light, ${STYLE}` },

  { id: '03', mode: 'info',
    vo: 'Ten out of ten. Every step of the signup passes on its own.',
    cap: 'Ten out of ten',
    info: { tpl: 'gauge', data: { label: 'Signup checks passing', value: 10, max: 10, good: 'every step passes on its own' } } },

  { id: '04', mode: 'scene',
    vo: 'He rings his assistant. She tries again, and she still cannot get in.',
    cap: 'Still locked out',
    art: `${ALI} standing holding a phone to his ear, his smile fading into a puzzled frown, plain warm room, ${STYLE}` },

  { id: '05', mode: 'info',
    vo: 'Ali cannot understand it. His screen is full of green ticks.',
    cap: 'All green — still locked out',
    info: { tpl: 'grid', data: { n: 10, tone: 'good' } } },

  { id: '06', mode: 'scene',
    vo: 'So he thinks about his stall for a moment.',
    cap: 'Back to the stall',
    art: `${ALI} standing thoughtfully at ${STALL}, one hand on his chin, a reflective look, ${STYLE}` },

  { id: '07', mode: 'scene',
    vo: 'The mangoes are good, the scale works, the bags are under the counter.',
    cap: 'Every part is fine',
    art: `A neat fruit stall counter with a pile of ripe mangoes, a simple two-pan balance scale, and a stack of paper bags tucked under the counter, everything tidy and ready, no people, ${STYLE}` },

  { id: '08', mode: 'scene',
    vo: 'But nobody is standing at the till, so nobody can buy anything.',
    cap: 'Nobody at the till',
    art: `A fruit stall with good mangoes and everything ready but the seller's spot behind the counter is empty, quiet and still, no people at all, ${STYLE}` },

  { id: '09', mode: 'info',
    vo: 'Everything works, and nobody goes home with fruit.',
    cap: 'Parts fine, journey broken',
    info: { tpl: 'statement', data: { text: 'Everything works.', hi: 'Everything', sub: 'Nobody goes home with fruit.' } } },

  { id: '10', mode: 'ali',
    vo: 'Nobody had done the signup the way a stranger does it, start to finish.',
    cap: 'Nobody walked it whole',
    art: `${ALI}, standing with a small dawning realisation, one finger raised as an idea lands, ${HERO}` },

  { id: '11', mode: 'scene',
    vo: 'So Ali asks Claude to be that stranger.',
    cap: 'Ask Claude to walk it',
    art: `${ALI} ${DESK}, leaning in and typing a request with clear purpose, ${STYLE}` },

  { id: '12', mode: 'info',
    vo: 'Write out every way someone could fail to sign up, then try each one in a real browser and screenshot every step.',
    cap: 'The prompt',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'Write out every way someone could fail to sign up. Then try each one in a real browser and screenshot every step.' } } },

  { id: '13', mode: 'info',
    vo: 'In the terminal, Claude writes the list: wrong password, used email, blank form.',
    cap: 'Claude writes the list',
    info: { tpl: 'screen', data: { title: 'claude · edge cases', lines: [
      { k: 'Wrong password', v: '→' }, { k: 'Used email', v: '→' }, { k: 'Blank form', v: '→' },
      { k: 'Number with a space', v: '→' } ] } } },

  { id: '14', mode: 'info',
    vo: 'Twelve journeys, each one a person and a mistake.',
    cap: 'edge cases',
    info: { tpl: 'statement', data: { text: 'Twelve journeys.', hi: 'Twelve', sub: 'Each one a person and a mistake.' } } },

  { id: '15', mode: 'scene',
    vo: 'Then a browser opens on its own and starts typing.',
    cap: 'The browser drives itself',
    art: `A laptop on a desk with a web browser window open showing a plain blank signup form with empty fields and a small cursor, seen over ${ALI}'s shoulder as he watches, ${STYLE}` },

  { id: '16', mode: 'info',
    vo: 'Type the email, wait for the code, enter the code, pick a password, get in.',
    cap: 'The whole journey',
    info: { tpl: 'checks', data: { items: ['Type the email', 'Wait for the code', 'Enter the code', 'Pick a password', 'Get in'] } } },

  { id: '17', mode: 'scene',
    vo: 'Claude takes a screenshot at every step.',
    cap: 'A shot at every step',
    art: `A web browser window on a laptop screen with a soft white camera-shutter flash across it, capturing a screenshot, ${ALI} watching with interest, ${STYLE}` },

  { id: '18', mode: 'info',
    vo: 'Eleven journeys reach the end. One stops dead.',
    cap: 'Eleven through, one stuck',
    info: { tpl: 'bars', data: { max: 12, items: [
      { label: 'Reached the end', value: 11, tone: 'big' },
      { label: 'Stopped dead', value: 1, tone: 'bad' } ] } } },

  { id: '19', mode: 'info',
    vo: 'The screenshot of step three is a blank white page.',
    cap: 'this is what she saw',
    info: { tpl: 'browser', data: { url: 'signup · step 3 of 5', blank: true } } },

  { id: '20', mode: 'ali',
    vo: 'The code email arrives ninety seconds late, and the page gives up waiting.',
    cap: 'A slow email',
    art: `${ALI}, standing and holding up one hand as if explaining a timing problem, a small knowing expression, ${HERO}` },

  { id: '21', mode: 'ali',
    vo: 'None of his checks ever waited, so none of them saw it.',
    cap: 'The gap between steps',
    art: `${ALI}, standing with an open-handed gesture of realisation, calm and clear, ${HERO}` },

  { id: '22', mode: 'scene',
    vo: 'He makes the page wait longer, runs it again, and all twelve get in.',
    cap: 'One fix, run again',
    art: `${ALI} ${DESK}, smiling with quiet satisfaction as he watches the run succeed, ${STYLE}` },

  { id: '23', mode: 'info',
    vo: 'Twelve green screenshots in a row.',
    cap: 'end-to-end eval',
    info: { tpl: 'grid', data: { n: 12, tone: 'good' } } },

  { id: '24', mode: 'ali',
    vo: 'Checking the parts tells you the parts work; only the whole walk tells you your customer gets in.',
    cap: 'The whole walk',
    art: `${ALI}, facing the viewer with a warm, clear teaching gesture, both hands open, ${HERO}` },

  { id: '25', mode: 'ali',
    vo: 'Your turn: pick the one journey your users have to finish.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand on his chest and the other open in a sincere encouraging gesture, ${HERO}` },

  { id: '26', mode: 'info',
    vo: 'Then say this to Claude: list every way this journey could fail, try each one in a real browser, and screenshot every step.',
    cap: 'Say this to Claude',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'List every way this journey could fail, try each one in a real browser, and screenshot every step.' } } },

  { id: '27', mode: 'ali',
    vo: 'Be the stranger, or your users will be.',
    cap: 'Be the stranger',
    art: `${ALI}, facing the viewer with a warm confident smile and a small nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
