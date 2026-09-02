'use strict';
/*
 * qa-visuals.js — DETERMINISTIC SENSOR for the Evals-Grade Visual Standard
 * (SCRIPTING_STANDARDS §3d). Run it on beats.js BEFORE spending on art:
 *
 *     node qa-visuals.js            # exits 2 on any violation
 *
 * Established 2026-08-21 after Aroma rejected self-healing v01's visuals ("not great",
 * "why is the helper a blob of glow"). The evals series had already solved this; the rules
 * below are that solution, made enforceable so no future video quietly regresses.
 *
 * Six rules, all mechanical:
 *   1. PERSISTENT SETTING  — one concrete place repeated across scene prompts
 *   2. REAL DEVICE         — the AI is a laptop/phone/tablet with a BLANK screen, never a glowing orb
 *   3. SCENE-LED           — enough full-illustration `scene` beats (not floating heroes)
 *   4. FEW TEXT CARDS      — at most 2 plain `statement` infographics
 *   5. REAL DATA           — 3+ distinct data templates, and actual numbers on screen
 *   6. PHYSICAL ACTIONS    — scene prompts describe doing, not just feeling
 *
 * Exempt: IDE-screencast assignment/assessment videos (mode `ide`/`card`, no character art).
 */
const path = require('path');
const beats = require(path.join(process.cwd(), 'beats.js'));

const problems = [];
const notes = [];
const fail = (rule, msg) => problems.push(`${rule}: ${msg}`);

const isScreencast = beats.some((b) => b.mode === 'ide');
if (isScreencast) {
  console.log('[qa-visuals] ⏭  IDE-screencast format — visual standard N/A (no character art).');
  process.exit(0);
}

const scenes = beats.filter((b) => b.mode === 'scene' && b.art);
const alis = beats.filter((b) => b.mode === 'ali' && b.art);
const infos = beats.filter((b) => b.mode === 'info' && b.info);
const arts = scenes.concat(alis);

// ---- 1. PERSISTENT CONCRETE SETTING ---------------------------------------
// The evals trick: one physical place, defined once, repeated in every scene prompt.
// Detect by finding the longest phrase (>=40 chars) shared by most scene prompts.
function longestSharedPhrase(strings) {
  if (strings.length < 2) return '';
  const first = strings[0];
  let best = '';
  for (let i = 0; i < first.length; i++) {
    for (let j = i + 40; j <= first.length; j++) {
      const cand = first.slice(i, j);
      if (cand.length <= best.length) continue;
      const hits = strings.filter((s) => s.includes(cand)).length;
      if (hits >= Math.ceil(strings.length * 0.6)) best = cand;
    }
  }
  return best;
}
if (scenes.length >= 2) {
  const shared = longestSharedPhrase(scenes.map((b) => b.art));
  if (shared.length < 40) {
    fail('SETTING', 'scene prompts share no common concrete setting — define one const (e.g. ' +
      'SHOP/STALL/DESK: "in Ali\'s small tidy shop, wooden shelves of…") and repeat it in EVERY scene');
  } else {
    notes.push(`persistent setting found (${shared.trim().slice(0, 52)}…) in ${scenes.filter(b => b.art.includes(shared)).length}/${scenes.length} scenes`);
  }
}
const ABSTRACT_SETTING = /(cosy |cozy )?(warm )?room with soft rounded walls|abstract (room|space|background)|featureless (room|space)|floating in (a )?void/i;
arts.forEach((b) => {
  if (ABSTRACT_SETTING.test(b.art)) {
    fail('SETTING', `beat ${b.id} uses an abstract room instead of a real place — replace with the concrete setting`);
  }
});

// ---- 2. THE AI IS A REAL DEVICE, NOT A GLOWING BLOB -----------------------
const BLOB = /glowing (ball|orb|sphere|blob)|ball of (warm )?(honey )?light|honey orb|\borb\b|glowing blob/i;
arts.forEach((b) => {
  if (BLOB.test(b.art)) {
    fail('DEVICE', `beat ${b.id} draws the AI as a glowing orb/blob — use a real device instead ` +
      '(an open laptop with a plain BLANK screen; the AI\'s output is crisp HTML, never baked in)');
  }
});
const DEVICE = /\b(laptop|phone|tablet|screen|monitor)\b/i;
const aiScenes = arts.filter((b) => DEVICE.test(b.art));
if (aiScenes.length) {
  aiScenes.forEach((b) => {
    if (!/blank|empty|plain pale|no text|no words/i.test(b.art)) {
      fail('DEVICE', `beat ${b.id} shows a device but does not force a BLANK screen — art must say ` +
        '"a plain blank interface with no text, no words, no letters" (LAW 6: no baked-in text)');
    }
  });
  notes.push(`AI drawn as a real device in ${aiScenes.length} beat(s)`);
}

// ---- 3. SCENE-LED, NOT FLOATING HEROES -----------------------------------
const sceneShare = beats.length ? scenes.length / beats.length : 0;
if (sceneShare < 0.28) {
  fail('SCENE-LED', `only ${scenes.length}/${beats.length} beats (${Math.round(sceneShare * 100)}%) are ` +
    '`scene`; the evals bar is ≥28% — turn narrative `ali` beats into full illustrated scenes');
} else {
  notes.push(`${scenes.length}/${beats.length} beats are full scenes (${Math.round(sceneShare * 100)}%)`);
}

// ---- 4. FEW PLAIN TEXT CARDS --------------------------------------------
const statements = infos.filter((b) => b.info.tpl === 'statement');
if (statements.length > 2) {
  fail('TEXT-CARDS', `${statements.length} plain \`statement\` cards (beats ${statements.map(b => b.id).join(', ')}) ` +
    '— max 2. Replace the rest with real-data visuals (bignum/bars/tally/screen/twocard/gauge/grid)');
} else {
  notes.push(`${statements.length} plain statement card(s) — within the limit of 2`);
}

// ---- 5. REAL DATA ON SCREEN ---------------------------------------------
const DATA_TPLS = new Set(['bignum', 'bars', 'tally', 'piles', 'gauge', 'grid', 'scoresheet',
  'answers', 'screen', 'twocard', 'spectrum', 'checks', 'fourparts', 'browser']);
const used = new Set(infos.map((b) => b.info.tpl).filter((t) => DATA_TPLS.has(t)));
if (used.size < 3) {
  fail('REAL-DATA', `only ${used.size} distinct data template(s) used (${[...used].join(', ') || 'none'}) ` +
    '— use at least 3 different ones so the visuals carry information, not just words');
} else {
  notes.push(`${used.size} distinct data templates: ${[...used].join(', ')}`);
}
const NUM = /\d/;
const hasNumbers = infos.some((b) => NUM.test(JSON.stringify(b.info.data || {})));
if (!hasNumbers) {
  fail('REAL-DATA', 'no numbers anywhere on screen — the story needs countable stakes ' +
    '(quantities, money, time, a before/after) shown via count-up templates');
}

// ---- 6. PHYSICAL ACTIONS IN SCENES --------------------------------------
// present + past forms, and "doing something to an object" phrasings — a scene must SHOW an act
const ACTION = new RegExp('\\b(' + [
  'hold(ing|s)?', 'held', 'writ(ing|es)', 'wrote', 'lift(ing|s|ed)', 'pull(ing|s|ed)',
  'drop(ping|s|ped)', 'plac(ing|es|ed)', 'pour(ing|s|ed)', 'tip(ping|s|ped)', 'stack(ing|s|ed)',
  'hand(ing|s|ed)', 'reach(ing|es|ed)', 'rest(ing|s|ed)', 'lean(ing|s|ed)', 'tast(ing|es|ed)',
  'mark(ing|s|ed)', 'set(ting)?', 'open(ing|s|ed)', 'fill(ing|s|ed)', 'clos(ing|es|ed)',
  'point(ing|s|ed)', 'wav(ing|es|e)', 'carry(ing)?', 'carried', 'slid(ing|es)?',
  'speaking toward', 'gesturing toward', 'looking (down )?at', 'watching',
].join('|') + ')\\b', 'i');
const staticScenes = scenes.filter((b) => !ACTION.test(b.art));
if (staticScenes.length > Math.max(1, Math.floor(scenes.length * 0.35))) {
  fail('ACTION', `scenes ${staticScenes.map(b => b.id).join(', ')} describe no physical action — ` +
    'a scene should show something being done (held, written, dropped, lifted), not only an expression');
}

// ---- report -------------------------------------------------------------
notes.forEach((n) => console.log(`  · ${n}`));
if (!problems.length) {
  console.log('[qa-visuals] ✅ PASS — meets the Evals-Grade Visual Standard (§3d).');
  process.exit(0);
}
console.log('');
problems.forEach((p) => console.log(`  ❌ ${p}`));
console.log(`\n[qa-visuals] FAIL — ${problems.length} violation(s) of the Evals-Grade Visual Standard (§3d).`);
process.exit(2);
