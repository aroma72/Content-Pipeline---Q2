'use strict';
/*
 * eval-consistency.js — a CHARACTER-CONSISTENCY EVAL for the video's own art.
 * (Fittingly, this video is about evals.) For every ali/scene beat that shows Ali,
 * an LLM judge (gemini-2.5-flash) compares the beat image to the locked reference
 * sheet (art/_ref.png) and answers, per the rubric, whether it is the SAME man in the
 * SAME flat 2D vector style — yes/no with one sentence of why (LLM-as-a-judge, video 06's move).
 *
 * Rubric (each a plain yes/no):
 *   1. same_person  — same face, skin tone, hair, teal shirt as the reference
 *   2. same_style   — same flat 2D vector cream illustration, no photoreal
 *   3. no_text      — no baked-in words/letters/numbers
 *
 * Output: prints a table + a pass score, writes eval-results.md, and prints the beat
 * ids that FAIL so they can be regenerated (ART_IDS=.. node generate-lesson-art-gemini.js --yes).
 * Read-only on art; no image generation, so it is not spend-guarded (text calls are ~free).
 */
const fs = require('fs');
const path = require('path');
const { geminiKey } = require('./lib/config');

const JUDGE = process.env.JUDGE_MODEL || 'gemini-2.5-flash';
const beats = require('./beats.js');
const OUT = path.join(process.cwd(), 'art');
const refPath = path.join(OUT, '_ref.png');
const key = geminiKey();

const targets = beats.filter((b) => (b.mode === 'ali' || b.mode === 'scene') && b.art);
const b64 = (p) => fs.readFileSync(p).toString('base64');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RUBRIC =
  'You are checking one illustration frame against a locked character reference sheet. ' +
  'The reference shows "Ali": a South Asian man, warm medium-brown skin, short neat black hair, ' +
  'clean-shaven, wearing a teal collared shirt and dark brown trousers, drawn as a flat 2D vector ' +
  'illustration on a warm cream palette. Answer STRICT JSON only, no prose: ' +
  '{"same_person":true|false,"same_style":true|false,"no_text":true|false,"why":"one short sentence"}. ' +
  'same_person = the man in the frame is clearly the same Ali (face, skin tone, hair, teal shirt). ' +
  'same_style = same flat 2D vector cream illustration (not photoreal, not a different art style). ' +
  'no_text = there are no real baked-in words, letters or numbers in the image.';

async function judge(imgPath) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${JUDGE}:generateContent`;
  const body = { contents: [{ parts: [
    { text: 'REFERENCE SHEET:' }, { inline_data: { mime_type: 'image/png', data: b64(refPath) } },
    { text: 'FRAME TO CHECK:' }, { inline_data: { mime_type: 'image/png', data: b64(imgPath) } },
    { text: RUBRIC },
  ] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const j = await res.json();
  const txt = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  try { return JSON.parse(txt); } catch { return { same_person: null, same_style: null, no_text: null, why: 'unparseable: ' + txt.slice(0, 80) }; }
}

(async () => {
  if (!fs.existsSync(refPath)) { console.error('[eval] no art/_ref.png'); process.exit(1); }
  console.log(`[eval] character-consistency judge = ${JUDGE}, ${targets.length} frames vs _ref\n`);
  const rows = []; const fails = [];
  for (const b of targets) {
    const p = path.join(OUT, `${b.id}.png`);
    if (!fs.existsSync(p)) { console.log(`  ${b.id}  (no art yet — skip)`); continue; }
    let v; try { v = await judge(p); } catch (e) { v = { same_person: null, why: e.message.slice(0, 60) }; }
    const pass = v.same_person && v.same_style && v.no_text;
    if (!pass) fails.push(b.id);
    rows.push({ id: b.id, mode: b.mode, ...v, pass });
    console.log(`  ${b.id} ${b.mode.padEnd(5)} person=${String(v.same_person).padEnd(5)} style=${String(v.same_style).padEnd(5)} text=${String(v.no_text).padEnd(5)} ${pass ? 'PASS' : 'FAIL'}  ${v.why || ''}`);
    await sleep(300);
  }
  const scored = rows.length, passed = rows.filter((r) => r.pass).length;
  const md = ['# eval-results.md — character consistency (video 03)', '',
    `**Judge:** ${JUDGE} (LLM-as-a-judge, per video 06). **Rubric:** same_person · same_style · no_text (each yes/no).`, '',
    `**Score: ${passed} / ${scored} frames on-model.**`, '',
    '| beat | mode | same person | same style | no text | verdict | why |', '|--|--|--|--|--|--|--|',
    ...rows.map((r) => `| ${r.id} | ${r.mode} | ${r.same_person} | ${r.same_style} | ${r.no_text} | ${r.pass ? 'PASS' : 'FAIL'} | ${(r.why || '').replace(/\|/g, '/')} |`),
    '', fails.length ? `**Regenerate drifts:** \`ART_IDS=${fails.join(',')} node generate-lesson-art-gemini.js --yes\`` : '**All frames on-model.**', ''];
  fs.writeFileSync(path.join(process.cwd(), 'eval-results.md'), md.join('\n'));
  console.log(`\n[eval] SCORE ${passed}/${scored} on-model -> eval-results.md`);
  if (fails.length) console.log(`[eval] drifts: ${fails.join(',')}`);
})();
