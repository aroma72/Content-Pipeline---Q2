'use strict';
/*
 * beats.js — "Write Down What Good Means" (evals series, video 05). Camera-pan build.
 * Same locked Ali (Gemini-seeded). His assistant is a second lead (described consistently).
 * ONE move: write the rubric, then test it on a second person. Varied graphics: an error
 * SCREENSHOT, a rubric checklist, side-by-side SCORE SHEETS that build, and a BAR GRAPH.
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
  { id: '01', mode: 'info',
    vo: 'Write down what good means, then check it on someone else.',
    cap: 'The one move',
    info: { tpl: 'statement', data: { text: 'Write down what good means.', hi: 'what good means', sub: 'Then check it on someone else.' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali’s signup works now, but one thing still bothers him.',
    cap: 'One thing nags him',
    art: `${ALI} ${DESK}, looking at the screen with a slightly bothered, unsatisfied expression, ${STYLE}` },

  { id: '03', mode: 'info',
    vo: 'Invalid input.',
    cap: 'the message that refused her password',
    info: { tpl: 'browser', data: { url: 'signup · error', text: '“Invalid input.”' } } },

  { id: '04', mode: 'ali',
    vo: 'It is true, it is polite, and it is useless.',
    cap: 'True, polite, useless',
    art: `${ALI}, standing and holding one hand palm-up with a flat unimpressed expression, ${HERO}` },

  { id: '05', mode: 'scene',
    vo: 'So he asks Claude for ten better messages.',
    cap: 'Ask for ten better',
    art: `${ALI} ${DESK}, typing a request with a hopeful expression, ${STYLE}` },

  { id: '06', mode: 'ali',
    vo: 'Ali reads them and thinks they are good.',
    cap: 'Looks good to him',
    art: `${ALI}, standing and reading a single blank sheet of paper in his hands with a satisfied nod, ${HERO}` },

  { id: '07', mode: 'scene',
    vo: 'He shows his assistant, and she thinks half are still confusing.',
    cap: 'She is not convinced',
    art: `${ALI} showing a tablet to ${ASSISTANT}, she looks at it with a doubtful, slightly frowning expression, two clearly different people, warm light, ${STYLE}` },

  { id: '08', mode: 'info',
    vo: 'Same ten messages, two different answers.',
    cap: 'Two different answers',
    info: { tpl: 'twocard', data: {
      left: { title: 'Ali', items: ['All ten look good'] },
      right: { title: 'Assistant', items: ['Half are confusing'] } } } },

  { id: '09', mode: 'info',
    vo: 'Neither can prove the other one wrong, because nothing is written down.',
    cap: 'Nothing written down',
    info: { tpl: 'statement', data: { text: 'Nothing is written down.', hi: 'written down', sub: 'So nobody can prove anything.' } } },

  { id: '10', mode: 'info',
    vo: 'Two teachers marking the same ten papers with no marking scheme.',
    cap: 'No marking scheme',
    info: { tpl: 'statement', data: { text: 'Two teachers, ten papers,', hi: 'no marking scheme', sub: 'no marking scheme.' } } },

  { id: '11', mode: 'scene',
    vo: 'So before they score anything, they write down what a good message must do.',
    cap: 'Write it down first',
    art: `${ALI} and ${ASSISTANT} together at a table writing on a notepad, focused and collaborating, two clearly different people, ${STYLE}` },

  { id: '12', mode: 'info',
    vo: 'Says what went wrong, says how to fix it, no jargon, does not blame the user, under fifteen words.',
    cap: 'the rubric',
    info: { tpl: 'checks', data: { items: [
      'Says what went wrong', 'Says how to fix it', 'No jargon', 'Does not blame the user', 'Under fifteen words'] } } },

  { id: '13', mode: 'ali',
    vo: 'Five lines, and each one is a plain yes or no.',
    cap: 'Five yes-or-no lines',
    art: `${ALI}, standing and holding up an open hand showing five fingers, clear and friendly, ${HERO}` },

  { id: '14', mode: 'scene',
    vo: 'Then Ali scores all ten on his own, and she scores all ten on hers.',
    cap: 'Score separately',
    art: `${ALI} and ${ASSISTANT} sitting apart at the same table, each marking their own score sheet with a pencil, two clearly different people, ${STYLE}` },

  { id: '15', mode: 'info',
    vo: 'Two score sheets, ten rows each.',
    cap: 'Two score sheets',
    info: { tpl: 'scoresheet', data: {
      a: { title: 'Ali', rows: [
        { mark: '✓' }, { mark: '✓' }, { mark: '✓' }, { mark: '✓' }, { mark: '✓' },
        { mark: '✓' }, { mark: '✓' }, { mark: '✓' }, { mark: '✓' }, { mark: '✓' } ] },
      b: { title: 'Assistant', rows: [
        { mark: '✓' }, { mark: '✗' }, { mark: '✓' }, { mark: '✓' }, { mark: '✗' },
        { mark: '✓' }, { mark: '✓' }, { mark: '✗' }, { mark: '✓' }, { mark: '✓' } ] },
      diff: [1, 4, 7] } } },

  { id: '16', mode: 'scene',
    vo: 'They agree on seven and disagree on three.',
    cap: 'Agree 7, disagree 3',
    art: `${ALI} and ${ASSISTANT} leaning together comparing their two score sheets, pointing at a row, two clearly different people, ${STYLE}` },

  { id: '17', mode: 'ali',
    vo: 'Ali thinks she has marked them wrong.',
    cap: 'He assumes she is wrong',
    art: `${ALI}, standing with arms lightly crossed and a slightly doubtful, defensive expression, ${HERO}` },

  { id: '18', mode: 'scene',
    vo: 'They read the three out loud, and the problem is line three.',
    cap: 'The problem is line three',
    art: `${ALI} and ${ASSISTANT} reading from a sheet together, a moment of realisation, two clearly different people, ${STYLE}` },

  { id: '19', mode: 'info',
    vo: 'No jargon. Ali counted verification code as plain English. She did not.',
    cap: 'One vague line',
    info: { tpl: 'statement', data: { text: '“verification code”', hi: 'verification code', sub: 'Ali: plain English. Her: jargon.' } } },

  { id: '20', mode: 'scene',
    vo: 'So they rewrite that line until it can only mean one thing.',
    cap: 'Rewrite the line',
    art: `${ALI} and ${ASSISTANT} together crossing out and rewriting a line on the notepad, focused and agreeing, two clearly different people, ${STYLE}` },

  { id: '21', mode: 'info',
    vo: 'No jargon: a new customer understands every word without asking.',
    cap: 'The sharpened line',
    info: { tpl: 'statement', data: { text: 'No jargon:', hi: 'every word', sub: 'a new customer understands every word without asking.' } } },

  { id: '22', mode: 'info',
    vo: 'They score the same ten again, and now they agree on nine.',
    cap: 'Now they agree on nine',
    info: { tpl: 'scoresheet', data: {
      a: { title: 'Ali', rows: [
        { mark: '✓' }, { mark: '✗' }, { mark: '✓' }, { mark: '✓' }, { mark: '✓' },
        { mark: '✓' }, { mark: '✓' }, { mark: '✓' }, { mark: '✓' }, { mark: '✓' } ] },
      b: { title: 'Assistant', rows: [
        { mark: '✓' }, { mark: '✗' }, { mark: '✓' }, { mark: '✓' }, { mark: '✓' },
        { mark: '✓' }, { mark: '✓' }, { mark: '✗' }, { mark: '✓' }, { mark: '✓' } ] },
      diff: [7], note: 'Agree 9 · Disagree 1' } } },

  { id: '23', mode: 'info',
    vo: 'Nine out of ten. The rubric is sharp enough to hand over.',
    cap: 'Sharp enough to hand over',
    info: { tpl: 'bars', data: { max: 10, suffix: '/ 10', items: [
      { label: 'First pass', value: 7 },
      { label: 'After the rewrite', value: 9, tone: 'big' } ] } } },

  { id: '24', mode: 'ali',
    vo: 'When two people disagree, the writing is vague, not the person.',
    cap: 'Vague writing, not people',
    art: `${ALI}, facing the viewer with a calm, reassuring teaching gesture, both hands open, ${HERO}` },

  { id: '25', mode: 'ali',
    vo: 'Your turn: take one thing your app says to users and give it five yes-or-no lines.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand on his chest and the other open in a sincere encouraging gesture, ${HERO}` },

  { id: '26', mode: 'info',
    vo: 'Then say this to Claude: score these ten against my five lines, yes or no, and show me the ones you were unsure about.',
    cap: 'Say this to Claude',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'Score these ten against my five lines, yes or no, and show me the ones you were unsure about.' } } },

  { id: '27', mode: 'ali',
    vo: 'Get two people to the same answer, and the score means something.',
    cap: 'Then the score means something',
    art: `${ALI}, facing the viewer with a warm confident smile and a small nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
