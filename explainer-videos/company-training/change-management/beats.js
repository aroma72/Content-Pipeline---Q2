'use strict';
/*
 * beats.js — "Change Management" for a ~200-person ed-tech company (Pakistan).
 * House standard: ONE named, invented protagonist (Bilal, a team lead) carried
 * in depth through ONE scenario — friction → insight → structure → moves → payoff.
 * One concept (leading people through change). One metaphor: "the dip".
 *
 * VISUAL STYLE (consistent throughout): flat 2D vector illustration everywhere —
 * same Bilal every beat, warm cream palette, NO baked-in text/letters/numbers.
 */

// Consistent protagonist + house illustration style, reused in every prompt.
const BILAL = 'Bilal, a young South Asian man with short neat black hair, clean-shaven, ' +
  'wearing a teal collared shirt and dark trousers';
const STYLE = 'flat 2D vector editorial illustration, clean simple rounded shapes, warm cream ' +
  'palette, soft friendly style, absolutely no text, no words, no letters, no numbers, no labels';
// clean-hero (for cutout ali beats): centered, standing, plain cream, detached props
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  {
    id: '01',
    mode: 'scene',
    vo: 'Most change fails for one reason — we manage the plan, but forget the people.',
    cap: 'Change is about people',
    art: `A modern ed-tech office, a small team gathered around a screen, soft depth, hopeful morning light, ${STYLE}`,
  },
  {
    id: '02',
    mode: 'scene',
    vo: 'Meet Bilal, who leads a team at an ed-tech company.',
    cap: 'Bilal · team lead',
    art: `${BILAL}, standing confidently in a bright ed-tech office with colleagues softly behind him, gentle depth, ${STYLE}`,
  },
  {
    id: '03',
    mode: 'ali',
    vo: 'This month, he must get his whole team onto a new tool.',
    cap: 'A new tool for the team',
    art: `${BILAL}, smiling and gesturing toward a floating plain blank app icon tile beside him, hopeful, ${HERO}`,
  },
  {
    id: '04',
    mode: 'ali',
    vo: 'He announced it in one email, then waited for everyone to adopt it.',
    cap: 'Announce ≠ adopt',
    art: `${BILAL}, tapping a single floating plain blank envelope icon, waiting, slightly hopeful, ${HERO}`,
  },
  {
    id: '05',
    mode: 'ali',
    vo: 'Weeks passed and almost nothing changed — if you have watched a rollout stall, you are not alone.',
    cap: 'Weeks later… nothing',
    art: `${BILAL}, looking puzzled and a little deflated, a floating plain blank calendar grid beside him, ${HERO}`,
  },
  {
    id: '06',
    mode: 'ali',
    vo: 'Here is the key… people do not resist change, they resist loss.',
    cap: 'People resist loss, not change',
    art: `${BILAL}, a thoughtful realization on his face, a soft glowing lightbulb floating near his head, ${HERO}`,
  },
  {
    id: '07',
    mode: 'info',
    vo: 'Every real change has a dip — things feel worse before they feel better.',
    cap: 'The transition dip',
    info: { tpl: 'checks', data: { title: 'The journey of any change', items: ['The old way — comfortable', 'The dip — hard, and normal', 'The new way — better'] } },
  },
  {
    id: '08',
    mode: 'info',
    vo: 'So Bilal led his team across the dip in four steps.',
    cap: 'Four steps across the dip',
    info: { tpl: 'fourparts', data: { title: 'Leading people through change', parts: ['Explain the real why', 'Hear their fears', 'Build the new skill', 'Reinforce it'] } },
  },
  {
    id: '09',
    mode: 'ali',
    vo: 'He explained the real reason, then asked what worried them.',
    cap: 'Why first · then listen',
    art: `${BILAL}, leaning in and listening warmly to a colleague standing beside him, empathetic, ${HERO}`,
  },
  {
    id: '10',
    mode: 'ali',
    vo: 'He trained them, and supported the new way until it felt normal.',
    cap: 'Support until it feels normal',
    art: `${BILAL}, encouraging a colleague who points at a floating plain blank checklist card, supportive, ${HERO}`,
  },
  {
    id: '11',
    mode: 'info',
    vo: 'Then he kept reinforcing it, and never declared victory too early.',
    cap: 'Reinforce · don’t stop early',
    info: { tpl: 'gauge', data: { label: 'Weeks of steady reinforcement', value: 6, max: 6, good: 'until it sticks' } },
  },
  {
    id: '12',
    mode: 'scene',
    vo: 'Change sticks when you carry people through the dip… not around it.',
    cap: 'Carry people through the dip',
    art: `${BILAL} and his team confidently using a new tool together in a bright ed-tech office, momentum and warmth, gentle depth, ${STYLE}`,
  },
];
