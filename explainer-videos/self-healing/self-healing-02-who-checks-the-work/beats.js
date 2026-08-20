'use strict';
/*
 * beats.js — "Who Checks The Work" (Self-Healing & Self-Improving series, video 02).
 * CONTINUES V01: same locked Ali (art/_ref.png), shop + AI helper, honey ORB = the brain, room = harness.
 * ONE concept: the CRITIC. V01 said "something checks the answer" — this video is the four things that
 * something can be: a rule, a test, another model, or a human — and how to pick the cheapest one that
 * actually catches your failure. Closes the loop: Act -> Critic -> Retry -> Remember (Remember hands
 * off to V03). De-duplicated vs evals (scoring quality at scale) and autonomy (how much rope).
 * CAMERA-PAN build: stills + Ken Burns / cutout-puppet, plus i2v on the 3 story-critical beats.
 * No baked text in any art prompt.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;
const ORB = 'a smooth simple glowing ball of warm honey light representing the AI, a plain featureless round orb with one soft highlight, no brain shape, no folds, no face, absolutely no text, no letters, no words on it';
const ROOM = 'a cosy warm room with soft rounded walls around it';

module.exports = [
  { id: '01', mode: 'info',
    vo: 'A healing loop is only as good as the thing that checks the work.',
    cap: 'The one idea',
    info: { tpl: 'statement', data: { text: 'The loop is only as good as the checker.', hi: 'the checker' } } },

  { id: '02', mode: 'ali',
    vo: 'Last time, something caught the helper’s mistake, and Ali never asked what.',
    cap: 'What caught it?',
    art: `${ALI}, standing with a curious questioning expression, head slightly tilted, one hand open, ${HERO}` },

  { id: '03', mode: 'info',
    vo: 'That something has a name: the critic, and it comes in four flavours.',
    cap: 'Meet the critic',
    info: { tpl: 'statement', data: { text: 'That something is the critic.', hi: 'the critic' } } },

  { id: '04', mode: 'info',
    vo: 'The first is a plain rule: a line you write once that can never be crossed.',
    cap: 'One — a plain rule',
    info: { tpl: 'statement', data: { text: 'First: a plain rule you write once.', hi: 'a plain rule' } } },

  { id: '05', mode: 'scene',
    vo: 'Ali writes one: a refund over five thousand rupees never goes out on its own.',
    cap: 'Never on its own',
    art: `${ALI} standing beside ${ROOM}, a simple solid straight bar across the doorway of the room with ${ORB} glowing behind it, ${STYLE}` },

  { id: '06', mode: 'info',
    vo: 'A rule is instant, costs nothing, and is never wrong about what it covers.',
    cap: 'Instant and free',
    info: { tpl: 'statement', data: { text: 'A rule is instant, free, and never wrong.', hi: 'never wrong' } } },

  { id: '07', mode: 'info',
    vo: 'The second is a test: you run the work and see whether it actually holds up.',
    cap: 'Two — a test',
    info: { tpl: 'statement', data: { text: 'Second: run it and see if it holds up.', hi: 'run it' } } },

  { id: '08', mode: 'scene',
    vo: 'The helper’s request is run against the records first, and it fails loudly.',
    cap: 'It fails loudly',
    art: `${ALI} standing beside ${ROOM} watching a plain round dial beside ${ORB} tilt sharply to one side, a small soft alert glow around it, ${STYLE}` },

  { id: '09', mode: 'ali',
    vo: 'A failing test is a gift, because it tells the helper exactly what broke.',
    cap: 'A failing test is a gift',
    art: `${ALI}, standing with a warm approving smile and a small satisfied nod, ${HERO}` },

  { id: '10', mode: 'info',
    vo: 'The third is another model: a second opinion asked to find the fault.',
    cap: 'Three — another model',
    info: { tpl: 'statement', data: { text: 'Third: a second opinion, asked to find the fault.', hi: 'second opinion' } } },

  { id: '11', mode: 'scene',
    vo: 'A second orb reads the answer and marks the one line that does not add up.',
    cap: 'A second opinion',
    art: `${ALI} standing beside ${ROOM} with two separate glowing honey orbs floating side by side inside it, one slightly smaller and turned toward the other, plain blank card between them, ${STYLE}`},

  { id: '12', mode: 'info',
    vo: 'It catches the vague and the sloppy that no rule could ever describe.',
    cap: 'Catches the vague',
    info: { tpl: 'statement', data: { text: 'It catches what no rule could describe.', hi: 'no rule could describe' } } },

  { id: '13', mode: 'ali',
    vo: 'But it costs a call, adds a delay, and can be confidently wrong itself.',
    cap: 'It has a cost',
    art: `${ALI}, standing with a cautious careful expression, one hand raised in a gentle warning gesture, ${HERO}` },

  { id: '14', mode: 'info',
    vo: 'The fourth is a person: you, looking at it before anything leaves the shop.',
    cap: 'Four — a person',
    info: { tpl: 'statement', data: { text: 'Fourth: a person looks before it leaves.', hi: 'a person' } } },

  { id: '15', mode: 'ali',
    vo: 'Slow and expensive, so Ali saves it for the moves he cannot take back.',
    cap: 'Save it for the risky',
    art: `${ALI}, standing and reviewing something with a focused attentive expression, hands clasped, ${HERO}` },

  { id: '16', mode: 'info',
    vo: 'Four critics, and the honest trade is cost against what each one can catch.',
    cap: 'The four critics',
    info: { tpl: 'screen', data: { title: 'Who can check the work', lines: [
      { k: 'A rule', v: 'free, instant, narrow' },
      { k: 'A test', v: 'cheap, exact, needs a right answer' },
      { k: 'Another model', v: 'catches the vague, costs a call' },
      { k: 'A person', v: 'catches anything, slowest' } ] } } },

  { id: '17', mode: 'ali',
    vo: 'Ali’s rule of thumb: use the cheapest critic that catches your real failure.',
    cap: 'Cheapest that catches it',
    art: `${ALI}, standing with a confident clear expression, one finger raised making a simple point, ${HERO}` },

  { id: '18', mode: 'info',
    vo: 'And you can stack them: a rule first, a test next, a person only at the end.',
    cap: 'Stack them',
    info: { tpl: 'statement', data: { text: 'Stack them: rule, then test, then a person.', hi: 'Stack them' } } },

  { id: '19', mode: 'info', holdAfter: 6,
    vo: 'Quick question: which critic should catch a refund that is far too large?',
    cap: 'Your turn — write it down',
    info: { tpl: 'quiz', data: {
      stem: 'Which critic should catch a refund that is far too large?',
      options: ['Another model, asked politely to review it', 'A plain rule on the amount — free and instant', 'A person reading every refund', 'Nothing, the model rarely gets it wrong'],
      note: 'Write your answer down.' } } },

  { id: '20', mode: 'info',
    vo: 'A plain rule, because the cheapest critic that catches it is the right one.',
    cap: 'The answer',
    info: { tpl: 'quiz', data: {
      stem: 'Which critic catches a refund that is far too large?',
      options: ['Another model, asked politely to review it', 'A plain rule on the amount — free and instant', 'A person reading every refund', 'Nothing, the model rarely gets it wrong'],
      answer: 1, note: 'Never pay for a model where a rule will do.' } } },

  { id: '21', mode: 'info',
    vo: 'Now the debugging loop is whole: act, critic, retry, and remember.',
    cap: 'The debugging loop, whole',
    info: { tpl: 'screen', data: { title: 'Debugging in a loop, whole', lines: [
      { k: 'Act', v: 'the helper does the job' }, { k: 'Critic', v: 'rule, test, model, or person' },
      { k: 'Retry', v: 'the error goes back' }, { k: 'Remember', v: 'so it does not repeat' } ] } } },

  { id: '22', mode: 'ali',
    vo: 'That last word, remember, is where healing turns into something bigger.',
    cap: 'Remember',
    art: `${ALI}, standing with a thoughtful intrigued expression and a small forward lean, ${HERO}` },

  { id: '23', mode: 'ali',
    vo: 'Your turn: name the one mistake that would hurt most, and pick its critic.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand open in a sincere encouraging gesture, warm and inviting, ${HERO}` },

  { id: '24', mode: 'info',
    vo: 'Ask yourself: what is my worst mistake, and what is the cheapest thing that catches it?',
    cap: 'Ask yourself',
    info: { tpl: 'promptcard', data: { app: 'Ask yourself',
      text: 'What is my worst mistake — and what is the cheapest thing that catches it?' } } },

  { id: '25', mode: 'ali',
    vo: 'A loop without a critic is just a helper doing the wrong thing faster.',
    cap: 'No critic, no loop',
    art: `${ALI}, facing the viewer with a confident warm smile and a small sure nod, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
module.exports.animateIds = ["08", "11", "25"]; // i2v story beats (house rule: use-animations)
