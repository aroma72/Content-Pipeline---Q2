'use strict';
/*
 * beats.js — "Change Management" for a ~200-person ed-tech company (Pakistan).
 * House standard: ONE named, invented protagonist (Bilal, a team lead) carried
 * in depth through ONE scenario — the friction → insight → structure → the moves
 * → payoff. One concept (leading people through change). One metaphor: "the dip".
 * See .claude/standards/SCRIPTING_STANDARDS.md.
 */

const CREAM = 'warm flat editorial illustration, single subject centered and standing';

module.exports = [
  {
    id: '01',
    mode: 'scene',
    vo: 'Most change fails for one reason — we manage the plan, but forget the people.',
    cap: 'Change is about people',
    art: 'A warm editorial illustration of a modern ed-tech office in Pakistan, a team around a screen, soft depth, hopeful morning light',
  },
  {
    id: '02',
    mode: 'scene',
    vo: 'Meet Bilal, who leads a team at an ed-tech company.',
    cap: 'Bilal · team lead',
    art: 'A friendly South Asian team lead named Bilal standing confidently in a bright ed-tech office, colleagues softly blurred behind, editorial scene with depth',
  },
  {
    id: '03',
    mode: 'ali',
    vo: 'This month, he must get his whole team onto a new tool.',
    cap: 'A new tool for the team',
    art: `Bilal gesturing toward a floating simple app icon, hopeful, ${CREAM}`,
  },
  {
    id: '04',
    mode: 'ali',
    vo: 'He announced it in one email, then waited for everyone to adopt it.',
    cap: 'Announce ≠ adopt',
    art: `Bilal hitting send on a floating email envelope, waiting, slightly hopeful, ${CREAM}`,
  },
  {
    id: '05',
    mode: 'ali',
    vo: 'Weeks passed and almost nothing changed — if you have watched a rollout stall, you are not alone.',
    cap: 'Weeks later… nothing',
    art: `Bilal looking puzzled and a little deflated, a floating flat calendar beside him, ${CREAM}`,
  },
  {
    id: '06',
    mode: 'ali',
    vo: 'Here is the key… people do not resist change, they resist loss.',
    cap: 'People resist loss, not change',
    art: `Bilal having a thoughtful realization, a soft glowing lightbulb floating nearby, ${CREAM}`,
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
    art: `Bilal listening warmly to a colleague, leaning in, empathetic, ${CREAM}`,
  },
  {
    id: '10',
    mode: 'ali',
    vo: 'He trained them, and supported the new way until it felt normal.',
    cap: 'Support until it feels normal',
    art: `Bilal guiding a colleague through a floating simple checklist, encouraging, ${CREAM}`,
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
    art: 'A warm editorial scene: Bilal and his team confidently using the new tool together in a bright ed-tech office, sense of momentum and depth',
  },
];
