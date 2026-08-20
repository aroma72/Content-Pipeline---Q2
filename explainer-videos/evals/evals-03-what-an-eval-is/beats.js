'use strict';
/*
 * beats.js — "What An Eval Actually Is" (evals series, video 03).
 * The series moves from the mango stall to Ali's PRODUCT (a signup page). Same locked Ali
 * (art/_ref.png, seeded by omni). ONE move: give the checking a name so Claude can do it.
 * CAMERA-PAN build: stills + Ken Burns / cutout-puppet only — NO i2v clips.
 *
 * Modes: scene = in-place art (Ken Burns) · ali = clean-hero cutout puppet (+optional overlay) ·
 *        info = crisp HTML (numbers, screens, prompt cards). No baked text in any image.
 */

const ALI = 'Ali, a friendly South Asian man in his mid-20s, warm medium-brown skin, ' +
  'short neat black hair, clean-shaven, gentle rounded face, wearing a teal collared shirt ' +
  'with the sleeves rolled to the elbow and dark brown trousers';
const STYLE = 'flat 2D vector editorial illustration, clean rounded shapes, warm cream and honey ' +
  'palette, soft friendly storybook style, gentle depth, absolutely no text, no words, no letters, ' +
  'no numbers, no labels';
const DESK = 'sitting at a tidy small wooden desk with an open laptop showing a plain blank interface';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  { id: '01', mode: 'info',
    vo: 'Give the checking a name, and Claude can do it for you.',
    cap: 'The one move',
    info: { tpl: 'statement', data: { text: 'Give the checking a name.', hi: 'a name', sub: 'Then Claude can do it for you.' } } },

  { id: '02', mode: 'scene',
    vo: 'Ali’s app needs a way in, so Claude builds him a signup page.',
    cap: 'Claude builds the signup',
    art: `${ALI} ${DESK}, looking pleased as a simple clean blank signup form appears on the laptop screen, warm light, ${STYLE}` },

  { id: '03', mode: 'ali',
    vo: 'Ali types his own name and number, picks a password, and gets in.',
    cap: 'Tested as himself',
    art: `${ALI}, standing and giving a confident thumbs up with a warm smile, ${HERO}`,
    overlay: { tpl: 'screen', data: { title: 'Sign up ✓', lines: [
      { k: 'Name', v: 'Ali' }, { k: 'Phone', v: '0300 1234567' }, { k: 'Password', v: '••••••' } ] } } },

  { id: '04', mode: 'scene',
    vo: 'It works, so he sends the link to his two shop assistants.',
    cap: 'Shares the link',
    art: `${ALI} ${DESK}, cheerfully holding up his phone having just shared a link, relaxed and confident, ${STYLE}` },

  { id: '05', mode: 'scene',
    vo: 'On Friday they both ring him, and neither one can get in.',
    cap: 'The Friday call',
    art: `${ALI} standing holding a phone to his ear with a worried, puzzled expression, a small anxious frown, plain warm room, ${STYLE}` },

  { id: '06', mode: 'info',
    vo: 'One typed her number with a space, the other’s password was refused with no reason.',
    cap: 'Two people, locked out',
    info: { tpl: 'twocard', data: {
      left: { title: 'Assistant one', items: ['Number: 03 00 1234', 'Rejected — the space'] },
      right: { title: 'Assistant two', items: ['Password refused', 'No reason given'] } } } },

  { id: '07', mode: 'ali',
    vo: 'Ali had only ever tried it one way, his own way.',
    cap: 'Only ever one way',
    art: `${ALI}, standing with a small sheepish shrug, one hand open, a rueful expression, ${HERO}` },

  { id: '08', mode: 'info',
    vo: 'One person signing up once is the same as tasting one mango.',
    cap: 'One signup = one mango',
    info: { tpl: 'twocard', data: {
      left: { title: 'One signup', items: ['Ali, his own way', 'Worked for him'] },
      right: { title: 'One mango', items: ['One taste, off the top', 'Told him nothing'] } } } },

  { id: '09', mode: 'scene',
    vo: 'So he opens his laptop and types, check my signup works.',
    cap: 'A vague ask',
    art: `${ALI} ${DESK}, leaning in and typing a short message, focused, warm light, ${STYLE}` },

  { id: '10', mode: 'info',
    vo: 'Claude asks him back: works for who, and how would we know?',
    cap: 'Claude asks back',
    info: { tpl: 'statement', data: { text: 'Works for who?', hi: 'who', sub: 'And how would we know?' } } },

  { id: '11', mode: 'ali',
    vo: 'Ali stops, because he cannot finish the sentence.',
    cap: 'He cannot answer',
    art: `${ALI}, standing still with a hand resting thoughtfully on his chin, quiet and stuck, ${HERO}` },

  { id: '12', mode: 'scene',
    vo: 'Then he looks down at the two bits of paper by his scale.',
    cap: 'The two papers',
    art: `${ALI} at his mango stall counter looking down thoughtfully at two small blank cream handwritten paper notes lying beside an old-fashioned two-pan balance scale with empty pans and no dial, a few ripe orange-yellow mangoes and a wooden crate around him, warm light, absolutely no numbers, letters, logos or markings anywhere, ${STYLE}` },

  { id: '13', mode: 'info',
    vo: 'Seven out of ten. Bruised, nineteen.',
    cap: 'His own two numbers',
    info: { tpl: 'bignum', data: {
      left: { big: '7', lab: 'out of ten, sweet', tone: 'good' }, sep: '·',
      right: { big: '19', lab: 'bruised', tone: 'bad' } } } },

  { id: '14', mode: 'ali',
    vo: 'He has been checking things for two weeks already.',
    cap: 'He already does this',
    art: `${ALI}, standing with a small dawning smile of recognition, a gentle nod, ${HERO}` },

  { id: '15', mode: 'info',
    vo: 'A number for how many worked, and a name for what went wrong.',
    cap: 'A number and a name',
    info: { tpl: 'twocard', data: {
      left: { title: 'A number', items: ['How many worked'] },
      right: { title: 'A name', items: ['What went wrong'] } } } },

  { id: '16', mode: 'scene',
    vo: 'So he types it again, in his own words.',
    cap: 'Asks it properly',
    art: `${ALI} ${DESK}, typing again with clear purpose and a small confident set to his jaw, ${STYLE}` },

  { id: '17', mode: 'info',
    vo: 'Try signing up ten different ways. Tell me how many get in, and name what stopped the rest.',
    cap: 'The prompt',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'Try signing up ten different ways. Tell me how many get in, and name what stopped the rest.' } } },

  { id: '18', mode: 'info',
    vo: 'Claude writes the checks, runs them, and comes back with six out of ten.',
    cap: 'Six out of ten',
    info: { tpl: 'gauge', data: { label: 'Signups that got in', value: 6, max: 10, good: 'six out of ten' } } },

  { id: '19', mode: 'info',
    vo: 'Four failures, each one named, and both of his assistants are on the list.',
    cap: 'Four named failures',
    info: { tpl: 'screen', data: { title: '4 failures named', lines: [
      { k: 'Number with a space', v: '✗' }, { k: 'Password refused, no reason', v: '✗' },
      { k: 'Blank name field', v: '✗' }, { k: 'Email already used', v: '✗' } ] } } },

  { id: '20', mode: 'info',
    vo: 'This has a name.',
    cap: 'eval, short for evaluation',
    info: { tpl: 'statement', data: { text: 'This has a name: eval.', hi: 'eval', sub: 'short for evaluation' } } },

  { id: '21', mode: 'ali',
    vo: 'Ali did not learn a new skill; he learned what to call the old one.',
    cap: 'Naming the old habit',
    art: `${ALI}, standing with a calm, knowing smile, a small relaxed nod, ${HERO}` },

  { id: '22', mode: 'info',
    vo: 'One way: code walks the whole flow like a customer.',
    cap: 'end-to-end',
    info: { tpl: 'statement', data: { text: 'End-to-end', hi: 'End-to-end', sub: 'code walks the whole flow like a customer' } } },

  { id: '23', mode: 'info',
    vo: 'The other way: a model reads the work and scores it.',
    cap: 'LLM as a judge',
    info: { tpl: 'statement', data: { text: 'LLM as a judge', hi: 'judge', sub: 'a model reads the work and scores it' } } },

  { id: '24', mode: 'ali',
    vo: 'Next video, we watch a browser do it and take screenshots.',
    cap: 'Next: watch it happen',
    art: `${ALI}, facing the viewer with a warm inviting smile and an open-handed gesture, ${HERO}` },

  { id: '25', mode: 'ali',
    vo: 'Your turn: pick the one flow your users cannot lose.',
    cap: 'Your turn',
    art: `${ALI}, facing the viewer, one hand on his chest and the other open in a sincere encouraging gesture, ${HERO}` },

  { id: '26', mode: 'info',
    vo: 'Then say this to Claude: try it ten different ways, tell me how many pass, and name what stopped the rest.',
    cap: 'Say this to Claude',
    info: { tpl: 'promptcard', data: { app: 'Claude',
      text: 'Try it ten different ways, tell me how many pass, and name what stopped the rest.' } } },

  { id: '27', mode: 'ali',
    vo: 'A number, and a name. That is an eval.',
    cap: 'A number and a name',
    art: `${ALI}, facing the viewer with a confident warm smile and a small thumbs up, ${HERO}` },
];

module.exports.character = ALI;
module.exports.refPrompt =
  `${ALI}, calm friendly character reference portrait from the waist up, facing forward, ` +
  `arms relaxed, neutral pleasant expression, ${HERO}`;
