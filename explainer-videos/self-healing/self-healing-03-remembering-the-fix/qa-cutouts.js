'use strict';
/*
 * qa-cutouts.js — QA GATE against half-cut objects (LAW 5).
 *
 * WHY: `ali` beats are cut out of their background (segment-all.py keeps Ali's silhouette).
 * If Ali HOLDS or OVERLAPS a prop (laptop, phone, a stack of papers, a mug…), the cutout slices
 * that prop in half — a mangled object that "makes no sense" on screen (e.g. a diagonally-sliced
 * laptop). Props may only *float detached* beside a clean-hero Ali; anything he holds/leans-on, or
 * any 2-object composition, MUST be `scene` (no cutout — the whole frame is shown with Ken Burns).
 *
 * This runs on beats.js BEFORE art/render and fails (exit 1) if any `ali` beat's art implies a
 * held/overlapping prop. Fix = change that beat to `mode:'scene'` (and reword art so the prop rests
 * in the scene rather than in Ali's hands). Run: `node qa-cutouts.js`
 *
 * Deterministic root-cause check. (A heavier post-render LLM frame-judge can be layered on top, but
 * this catches the class at the source, which is where the recurring "sliced object" bug came from.)
 */
const path = require('path');
const beats = require(path.join(process.cwd(), 'beats.js'));

// verbs/nouns that imply Ali is holding / carrying / leaning-on / receiving a prop (→ cutout slices it)
const HELD = /\b(hold(s|ing)?|carr(y|ies|ying)|clutch\w*|grip\w*|lift(s|ing)?|rais(e|es|ing) a|receiv\w*|hand(s|ing)? (over|back)?|closing a|opening a|reading a|writing on|typing on (a )?(laptop|phone)|under (one )?arm|in (his|her|their) (hand|hands|arms)|on (his|her|their) lap)\b/i;
const PROPS = /\b(laptop|phone|smartphone|tablet|notebook|note ?book|paper|papers|stack|sheet|clipboard|folder|book|mug|cup|crate|box|tray|sack|basket|bag|tool|calculator|remote|card|cards|log ?book|tally)\b/i;
// "three fingers", "thumbs up", a raised hand etc. are part of the body, not a prop → allowed
const BODY_ONLY = /\b(finger|fingers|thumbs?\b|thumbs up|palm|fist|hand open|open hand|open-handed|both hands|hands? (at|loose|on (his|her|their) (chest|hip|neck)))\b/i;

const flagged = [];
for (const b of beats) {
  if (b.mode !== 'ali' || !b.art) continue;
  const heldProp = HELD.test(b.art) && PROPS.test(b.art);
  if (heldProp && !BODY_ONLY.test(b.art)) {
    flagged.push(b);
  }
}

if (flagged.length) {
  console.error('\n[qa-cutouts] ❌ FAIL — ' + flagged.length + ' `ali` beat(s) hold/overlap a prop (the cutout will slice it). Make each `scene`:');
  for (const b of flagged) {
    const prop = (b.art.match(PROPS) || [''])[0];
    console.error(`  · beat ${b.id} [${b.cap || ''}] — holds/overlaps "${prop}". Change mode:'ali' -> 'scene' (prop rests in the scene, not in his hands).`);
  }
  console.error('');
  process.exit(1);
}
console.log('[qa-cutouts] ✅ PASS — no ali beat holds/overlaps a prop (nothing the cutout would slice).');
