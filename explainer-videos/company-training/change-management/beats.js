'use strict';
/*
 * beats.js — "Change Management" for a ~200-person ed-tech company (Pakistan).
 * ONE protagonist (Ali), ONE metaphor ("the dip"), taught in depth.
 * Incorporates the M07 device set: typography STATEMENT card, the metaphor SHOWN
 * as a scene, a before/after TWOCARD contrast, and a closing QUOTE card.
 * All beats flat 2D vector illustration; no baked-in text; movement every beat.
 */

const ALI = 'Ali, a young South Asian man with short neat black hair, clean-shaven, ' +
  'wearing a teal collared shirt and dark trousers';
const STYLE = 'flat 2D vector editorial illustration, clean simple rounded shapes, warm cream ' +
  'palette, soft friendly style, absolutely no text, no words, no letters, no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  {
    id: '01', mode: 'scene',
    vo: 'Most change fails for one reason — we manage the plan, but forget the people.',
    cap: 'Change is about people',
    art: `A modern ed-tech office, a small team gathered around a screen, soft depth, hopeful morning light, ${STYLE}`,
  },
  {
    id: '02', mode: 'scene',
    vo: 'Meet Ali, who leads a team at an ed-tech company.',
    cap: 'Ali · team lead',
    art: `${ALI}, standing confidently in a bright ed-tech office with colleagues softly behind him, gentle depth, ${STYLE}`,
  },
  {
    id: '03', mode: 'ali',
    vo: 'This month, he must get his whole team onto a new tool.',
    cap: 'A new tool for the team',
    art: `${ALI}, smiling and gesturing toward a floating plain blank app icon tile beside him, hopeful, ${HERO}`,
  },
  {
    id: '04', mode: 'ali',
    vo: 'He announced it in one email, then waited for everyone to adopt it.',
    cap: 'Announce ≠ adopt',
    art: `${ALI}, tapping a single floating plain blank envelope icon, waiting, slightly hopeful, ${HERO}`,
  },
  {
    id: '05', mode: 'ali',
    vo: 'Weeks passed and almost nothing changed — if you have watched a rollout stall, you are not alone.',
    cap: 'Weeks later… nothing',
    art: `${ALI}, looking puzzled and a little deflated, a floating plain blank calendar grid beside him, ${HERO}`,
  },
  {
    id: '06', mode: 'info',
    vo: 'Here is the key… people do not resist change, they resist loss.',
    cap: 'People resist loss, not change',
    info: { tpl: 'statement', data: { text: 'People resist loss — not change.', hi: 'loss' } },
  },
  {
    id: '07', mode: 'scene',
    vo: 'Every real change dips — it feels worse before it gets better, and that dip is normal, not failure.',
    cap: 'The transition dip',
    art: `A wide side-view flat vector illustration of a smooth path that curves down into a gentle green valley and rises up the far side; ${ALI} walking along the path near the low point, a warm sunrise glow ahead, clear sense of a journey through a dip, ${STYLE}`,
  },
  {
    id: '07b', mode: 'info',
    vo: 'Left alone in the dip, people dig in… guided through it, they cross.',
    cap: 'Alone vs. guided',
    info: { tpl: 'twocard', data: {
      title: 'Same dip, two outcomes',
      left: { title: 'Left alone', items: ['Feels like loss', 'People dig in', 'Change stalls'] },
      right: { title: 'Guided through', items: ['Feels supported', 'They try the new way', 'Change sticks'] },
    } },
  },
  {
    id: '08', mode: 'info',
    vo: 'So Ali led his team across the dip in four steps.',
    cap: 'Four steps across the dip',
    info: { tpl: 'fourparts', data: { title: 'Leading people through change', parts: ['Explain the real why', 'Hear their fears', 'Build the new skill', 'Reinforce it'] } },
  },
  {
    id: '09', mode: 'scene',
    vo: 'He explained the real reason, then asked what worried them.',
    cap: 'Why first · then listen',
    art: `${ALI} sitting and listening warmly to a colleague across a small table, both fully in frame, empathetic conversation, bright ed-tech office, gentle depth, ${STYLE}`,
  },
  {
    id: '10', mode: 'scene',
    vo: 'He trained them, and supported the new way until it felt normal.',
    cap: 'Support until it feels normal',
    art: `${ALI} guiding two colleagues at a desk as they learn a new tool together, everyone fully in frame, supportive and warm, bright ed-tech office, gentle depth, ${STYLE}`,
  },
  {
    id: '11', mode: 'info',
    vo: 'Then he kept reinforcing it, and never declared victory too early.',
    cap: 'Reinforce · don’t stop early',
    info: { tpl: 'gauge', data: { label: 'Weeks of steady reinforcement', value: 6, max: 6, good: 'until it sticks' } },
  },
  {
    id: '12', mode: 'info',
    vo: 'Change sticks when you carry people through the dip… not around it.',
    cap: 'Carry people through the dip',
    info: { tpl: 'quote', data: { text: 'Carry people through the dip — not around it.' } },
  },
];
