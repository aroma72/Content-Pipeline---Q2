'use strict';
/*
 * beats.js — "Eval Types & End-to-End Testing in Depth" (Video 2, Phase 5 evals).
 * ONE protagonist (Ali). Broadens the eval family, then goes deep on E2E.
 * Flat 2D vector; no baked-in text; whole solid cutouts; movement every beat.
 */
const ALI = 'Ali, a young South Asian man with short neat black hair, clean-shaven, ' +
  'wearing a teal collared shirt and dark trousers';
const STYLE = 'flat 2D vector editorial illustration, clean simple rounded shapes, warm cream ' +
  'palette, soft friendly style, absolutely no text, no words, no letters, no numbers, no labels';
const HERO = `${STYLE}, single subject centered and standing, plain flat cream background`;

module.exports = [
  { id: '01', mode: 'ali', vo: 'Evals come in several types — today we go deep on end-to-end testing.', cap: 'Types + deep on E2E',
    art: `${ALI}, smiling and gesturing toward a row of floating blank rounded cards beside him, ${HERO}` },
  { id: '02', mode: 'scene', vo: 'Ali just built a login feature and wants to be sure it really works.', cap: 'A feature to check',
    art: `${ALI} sitting at a tidy desk looking at a login screen on his laptop, bright modern office, gentle depth, ${STYLE}` },
  { id: '03', mode: 'info', vo: 'First, a quick map of the common eval types.', cap: 'The eval family',
    info: { tpl: 'checks', data: { title: 'Common eval types', items: ['Code tests', 'End-to-end tests', 'Human review', 'LLM as a judge', 'Regression tests'] } } },
  { id: '04', mode: 'ali', vo: 'Each type answers a different question about quality.', cap: 'Different questions',
    art: `${ALI}, standing thoughtfully beside a few floating rounded cards each showing a small question mark, ${HERO}` },
  { id: '05', mode: 'info', vo: 'Code tests check tiny pieces; regression tests catch what a change broke.', cap: 'Two quick ones',
    info: { tpl: 'twocard', data: { title: 'Two quick ones', left: { title: 'Code tests', items: ['tiny pieces'] }, right: { title: 'Regression', items: ['did a change break it?'] } } } },
  { id: '06', mode: 'ali', vo: 'Today Ali zooms into end-to-end testing, the big-picture check.', cap: 'Zoom into E2E',
    art: `${ALI}, holding a large magnifying glass up to a single floating rounded card, curious, ${HERO}` },
  { id: '07', mode: 'info', vo: 'End-to-end means testing the whole journey, like a real user.', cap: 'What E2E is',
    info: { tpl: 'statement', data: { text: 'Test the whole journey, like a real user.', hi: 'whole journey' } } },
  { id: '08', mode: 'ali', vo: 'For login, that runs from typing a password to landing inside.', cap: 'The full flow',
    art: `${ALI}, gesturing along a floating path from a small password box to a small dashboard screen, ${HERO}` },
  { id: '09', mode: 'info', vo: 'Setting it up takes four simple steps.', cap: 'Set up E2E in 4 steps',
    info: { tpl: 'fourparts', data: { title: 'Set up E2E in 4 steps', parts: ['Pick a key user flow', 'Write the exact steps', 'Automate it with a tool', 'Check the real result'] } } },
  { id: '10', mode: 'ali', vo: 'Step one: pick the flow that would hurt most if it broke.', cap: '1 — Pick a key flow',
    art: `${ALI}, choosing one from several floating rounded flow cards, decisive, ${HERO}` },
  { id: '11', mode: 'ali', vo: 'Step two: write the exact steps a real user would take.', cap: '2 — Write the steps',
    art: `${ALI}, writing on a floating card with blank horizontal lines, focused, ${HERO}` },
  { id: '12', mode: 'ali', vo: 'Step three: let a tool run those steps automatically in the app.', cap: '3 — Automate it',
    art: `${ALI}, gesturing to a floating app window with an automated cursor arrow moving over it, ${HERO}` },
  { id: '13', mode: 'ali', vo: 'Step four: check the real result, not just that it ran.', cap: '4 — Check the result',
    art: `${ALI}, confirming a floating screen showing a large green check mark, ${HERO}` },
  { id: '14', mode: 'scene', vo: 'If this feels like a lot, relax — you start with just one flow.', cap: 'Start with one flow',
    art: `${ALI} at his desk looking calm and reassured, one flow gently highlighted on his laptop, warm office, ${STYLE}` },
  { id: '15', mode: 'info', vo: 'Then cover the scenarios that really matter.', cap: 'Scenarios to consider',
    info: { tpl: 'checks', data: { title: 'Scenarios to consider', items: ['Happy path', 'Wrong password', 'Empty fields', 'Different user roles', 'Slow or no network', 'Phone and desktop'] } } },
  { id: '16', mode: 'ali', vo: 'The happy path is when everything goes right.', cap: 'The happy path',
    art: `${ALI}, smiling beside a smooth flowing green path, ${HERO}` },
  { id: '17', mode: 'ali', vo: 'But real users mistype, lose signal, and use phones.', cap: 'Real users are messy',
    art: `${ALI}, gesturing to a floating phone and a weak-signal icon beside him, ${HERO}` },
  { id: '18', mode: 'ali', vo: 'So Ali also tests wrong passwords and clear error messages.', cap: 'Test the failures too',
    art: `${ALI}, pointing at a floating screen showing a friendly warning symbol, ${HERO}` },
  { id: '19', mode: 'ali', vo: 'He checks different roles, like an admin versus a normal user.', cap: 'Different roles',
    art: `${ALI}, holding two floating rounded user badges, one marked with a star, ${HERO}` },
  { id: '20', mode: 'info', vo: 'Run E2E before you ship, and again after every change.', cap: 'When to run it',
    info: { tpl: 'statement', data: { text: 'Run it before shipping, and after every change.', hi: 'every change' } } },
  { id: '21', mode: 'ali', vo: 'Now Ali ships knowing the whole journey truly works.', cap: 'Ship with confidence',
    art: `${ALI}, relaxed and confident, a large floating green check over a small flow diagram, ${HERO}` },
  { id: '22', mode: 'ali', vo: 'Which flow in your app would hurt most if it silently broke?', cap: 'Your turn',
    art: `${ALI}, turning to face the viewer with a warm inviting expression and an open hand, ${HERO}` },
];
