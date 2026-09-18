'use strict';
/*
 * qa-info.js — DETERMINISTIC SENSOR for `info` beat data shapes.
 *
 *     node qa-info.js            # exits 2 on any violation
 *
 * WHY THIS EXISTS
 * Established 2026-09-15, after Aroma watched notion-slack-01 and found a card reading "0 … 0"
 * where the voiceover said "twelve", and another card completely blank. Both were the same defect:
 * the beat passed data in a shape the template does not read. The templates in animation/info.js are
 * written defensively — `(d.items || []).forEach(...)`, `parseInt(c.big, 10) || 0` — so a wrong key
 * does not throw. It renders an empty card, or a zero, and the pipeline reports success all the way
 * to a finished MP4. Four beats shipped that way in one video.
 *
 * This reads the CONTRACT below, not the templates, so a template rename cannot silently weaken it.
 * When you add a template to animation/info.js, add it here in the same commit.
 */
const path = require('path');

const beats = require(path.join(process.cwd(), 'beats.js'));

/**
 * required: keys that must be present and non-empty.
 * shape:    per-key validator — returns an error string, or null when fine.
 * Anything not listed is allowed through (titles, tones, notes and so on).
 */
const arr = (v) => Array.isArray(v) && v.length > 0;
const str = (v) => typeof v === 'string' && v.trim() !== '';
const card = (v) => v && typeof v === 'object';

const CONTRACT = {
  statement: { required: ['text'], shape: { text: (v) => (str(v) ? null : 'must be a non-empty string') } },
  bignum: {
    required: ['left'],
    shape: {
      left: (v) => (card(v) && str(String(v.big ?? '')) ? null : 'needs { big, lab } — NOT { value, label }'),
      right: (v) => (v === undefined || (card(v) && str(String(v.big ?? '')))
        ? null : 'needs { big, lab }'),
    },
  },
  twocard: {
    required: ['left', 'right'],
    shape: {
      left: (v) => (card(v) && arr(v.items) ? null : 'needs { title, items: [...] } — NOT { title, body }'),
      right: (v) => (card(v) && arr(v.items) ? null : 'needs { title, items: [...] } — NOT { title, body }'),
    },
  },
  fourparts: {
    required: ['parts'],
    shape: { parts: (v) => (arr(v) && v.every(str) ? null : 'needs parts: [\'…\', \'…\'] of STRINGS — NOT items: [{title, body}]') },
  },
  checks: { required: ['items'], shape: { items: (v) => (arr(v) && v.every(str) ? null : 'needs items: [\'…\'] of strings') } },
  screen: {
    required: ['lines'],
    shape: { lines: (v) => (arr(v) && v.every((l) => l && typeof l === 'object' && 'k' in l)
      ? null : 'needs lines: [{ k, v }] — NOT an array of plain strings') },
  },
  promptcard: { required: ['text'], shape: { text: (v) => (str(v) ? null : 'needs { app, text } — NOT { title, lines }') } },
  quote: { required: ['text'], shape: { text: (v) => (str(v) ? null : 'must be a non-empty string') } },
  grid: { required: ['n'], shape: { n: (v) => (Number.isInteger(v) && v > 0 ? null : 'needs an integer n') } },
  bars: {
    required: ['items'],
    shape: { items: (v) => (arr(v) && v.every((i) => i && typeof i.value === 'number')
      ? null : 'needs items: [{ label, value }] with numeric values') },
  },
  tally: {
    required: ['rows'],
    shape: { rows: (v) => (arr(v) && v.every((r) => r && typeof r.count === 'number')
      ? null : 'needs rows: [{ label, count }] with numeric counts') },
  },
  gauge: { required: ['value'], shape: { value: (v) => (typeof v === 'number' ? null : 'needs a numeric value') } },
  quiz: {
    required: ['stem', 'options'],
    shape: {
      stem: (v) => (str(v) ? null : 'must be a non-empty string'),
      options: (v) => (arr(v) && v.length >= 3 ? null : 'needs 3+ options'),
    },
  },
};

const problems = [];
let checked = 0;

for (const b of beats) {
  if (!b || !b.info) continue;
  const { tpl, data } = b.info;
  checked++;

  if (!tpl) { problems.push(`beat ${b.id}: info has no \`tpl\``); continue; }
  const spec = CONTRACT[tpl];
  if (!spec) {
    problems.push(`beat ${b.id}: template '${tpl}' is not in qa-info's contract — add it here and in animation/info.js`);
    continue;
  }
  if (!data || typeof data !== 'object') { problems.push(`beat ${b.id} (${tpl}): info.data is missing`); continue; }

  for (const key of spec.required) {
    if (!(key in data)) {
      const hint = spec.shape[key] ? ' — ' + spec.shape[key](undefined) : '';
      problems.push(`beat ${b.id} (${tpl}): missing \`${key}\`${hint}`);
    }
  }
  for (const [key, check] of Object.entries(spec.shape || {})) {
    if (!(key in data)) continue; // absence already reported when required
    const err = check(data[key]);
    if (err) problems.push(`beat ${b.id} (${tpl}): \`${key}\` ${err}`);
  }
}

// A number spoken in the voiceover but absent from the card is the "VO says 12, screen shows 0" bug.
const WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
// Only cards whose entire job is displaying a figure. Elsewhere 'one line adds it' is prose,
// not data, and flagging it would train everyone to ignore this gate.
const NUMERIC_TPL = new Set(['bignum', 'bars', 'tally', 'gauge', 'grid']);
for (const b of beats) {
  if (!b || !b.info || !b.vo) continue;
  if (!NUMERIC_TPL.has(b.info.tpl)) continue;
  const said = [];
  for (const [w, n] of Object.entries(WORD)) {
    // Must not be the tail of a hyphenated compound: "twenty-four" is 24, not 4. Matching it
    // made this gate cry wolf on a card reading "24 of 100", which is exactly right.
    if (new RegExp(`(?<![\\w-])${w}\\b`, 'i').test(b.vo)) said.push(n);
  }
  (b.vo.match(/\b\d+\b/g) || []).forEach((d) => said.push(Number(d)));
  if (!said.length) continue;
  const shown = JSON.stringify(b.info.data || {});
  const missing = said.filter((n) => !new RegExp(`\\b${n}\\b`).test(shown));
  if (missing.length === said.length) {
    problems.push(`beat ${b.id} (${b.info.tpl}): the voiceover says ${said.join(', ')} but no such number appears in the card data — the viewer hears one thing and reads another`);
  }
}

if (!problems.length) {
  console.log(`[qa-info] ✅ PASS — ${checked} info beat(s), every data shape matches its template.`);
  process.exit(0);
}
console.log(`[qa-info] ❌ FAIL — ${problems.length} problem(s) in ${checked} info beat(s):\n`);
problems.forEach((p) => console.log('  · ' + p));
console.log('\nThese render as blank or zeroed cards rather than throwing, so they reach the MP4 silently.');
process.exit(2);
