'use strict';
/*
 * qa-art.js — VISION SENSOR for generated art. Catches the defects a text gate cannot see:
 * flipped/backwards hands, wrong finger counts, limbs that join wrongly, melted faces, duplicated
 * or floating body parts, baked-in text.
 *
 *     node qa-art.js                 # judge every art/*.png, exit 2 if any FAIL
 *     node qa-art.js --ids 05,11     # only these beats
 *     node qa-art.js --strict        # treat WARN as failure too
 *
 * Established 2026-08-21 after Aroma spotted an anatomically flipped hand in self-healing v02 beat 05
 * that shipped because nothing inspected the images. `qa-visuals.js` reads the SCRIPT; this reads the
 * PIXELS. Both run before spending on TTS/render.
 *
 * Writes qa-art-results.md. Judge: gemini-2.5-flash (vision), a few paise per image.
 */
const fs = require('fs');
const path = require('path');
const { geminiKey } = require('./lib/config');

const MODEL = process.env.ART_JUDGE_MODEL || 'gemini-2.5-flash';
const key = geminiKey();
const STRICT = process.argv.includes('--strict');
const idsArg = (() => { const i = process.argv.indexOf('--ids'); return i !== -1 ? (process.argv[i + 1] || '') : ''; })();
const only = idsArg.split(',').map((s) => s.trim()).filter(Boolean);

const beats = require(path.join(process.cwd(), 'beats.js'));
const artDir = path.join(process.cwd(), 'art');
if (!fs.existsSync(artDir)) { console.log('[qa-art] no art/ directory — nothing to judge.'); process.exit(0); }

const targets = beats
  .filter((b) => b.art && (b.mode === 'ali' || b.mode === 'scene'))
  .filter((b) => (only.length ? only.includes(b.id) : true))
  .filter((b) => fs.existsSync(path.join(artDir, b.id + '.png')));

if (!targets.length) { console.log('[qa-art] no art to judge.'); process.exit(0); }

const PROMPT = `You are a strict art-QA reviewer for a children's-educational flat 2D vector illustration.
Judge ONLY what is visibly wrong in the drawing. Be specific and literal.

Report a FAIL for any of these:
- a hand or foot that is anatomically impossible: thumb on the wrong side, palm and back of hand
  confused, a hand attached to the arm at an impossible angle, a wrist that does not connect
- wrong number of fingers or toes (a hand must read as 4 fingers + 1 thumb, or a clean mitten shape)
- limbs that merge, duplicate, float detached from the body, or bend the wrong way
- a face with misplaced, asymmetric or duplicated features; crossed or divergent eyes
- an object sliced in half or merging into the body INSIDE the picture. Do NOT flag furniture,
  shelves, counters or props that simply continue past the edge of the frame — that is normal framing
- ANY readable text, letters, numbers or logos anywhere in the image (this art must be textless)

Report a WARN (not a fail) for: an expression that reads clearly angrier or sadder than intended,
awkward-but-possible posture, or a prop that is hard to identify.

The intended beat is described as: "INTENT".

Reply as compact JSON only:
{"verdict":"PASS"|"WARN"|"FAIL","issues":["short specific issue", ...]}
If nothing is wrong, reply {"verdict":"PASS","issues":[]}`;

async function judge(b) {
  const file = path.join(artDir, b.id + '.png');
  const b64 = fs.readFileSync(file).toString('base64');
  const intent = String(b.vo || '') + ' — ' + String(b.art || '').replace(/flat 2D vector[\s\S]*$/i, '').slice(0, 240);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    contents: [{ parts: [
      { inline_data: { mime_type: 'image/png', data: b64 } },
      { text: PROMPT.replace('INTENT', intent.replace(/"/g, "'")) },
    ] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(res.status + ' ' + txt.slice(0, 120));
      const j = JSON.parse(txt);
      const out = j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(out);
      return { verdict: String(parsed.verdict || 'PASS').toUpperCase(), issues: parsed.issues || [] };
    } catch (e) {
      if (attempt === 3) return { verdict: 'ERROR', issues: ['judge failed: ' + String(e.message).slice(0, 90)] };
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

(async () => {
  console.log(`[qa-art] judging ${targets.length} image(s) with ${MODEL} …`);
  const rows = [];
  let fails = 0, warns = 0;
  for (const b of targets) {
    const r = await judge(b);
    rows.push({ id: b.id, mode: b.mode, ...r });
    const tag = r.verdict === 'PASS' ? '✅' : (r.verdict === 'WARN' ? '⚠️ ' : '❌');
    console.log(`  ${tag} ${b.id} (${b.mode}) ${r.verdict}${r.issues.length ? ' — ' + r.issues.join('; ') : ''}`);
    if (r.verdict === 'FAIL' || r.verdict === 'ERROR') fails++;
    if (r.verdict === 'WARN') warns++;
  }
  const md = ['# Art QA (vision judge)', '',
    `Judge: ${MODEL}. ${targets.length} image(s). ${fails} fail(s), ${warns} warn(s).`, '',
    '| beat | mode | verdict | issues |', '|---|---|---|---|',
    ...rows.map((r) => `| ${r.id} | ${r.mode} | ${r.verdict} | ${(r.issues || []).join('; ') || '—'} |`)].join('\n');
  fs.writeFileSync(path.join(process.cwd(), 'qa-art-results.md'), md + '\n');

  const bad = rows.filter((r) => r.verdict === 'FAIL' || r.verdict === 'ERROR').map((r) => r.id);
  const warned = rows.filter((r) => r.verdict === 'WARN').map((r) => r.id);
  console.log('');
  if (bad.length) {
    console.log(`[qa-art] FAIL — regenerate these: ART_IDS=${bad.join(',')} node generate-lesson-art-gemini.js --yes`);
    process.exit(2);
  }
  if (STRICT && warned.length) {
    console.log(`[qa-art] STRICT FAIL — warns: ART_IDS=${warned.join(',')}`);
    process.exit(2);
  }
  console.log(`[qa-art] ✅ PASS — no anatomy/rendering defects${warns ? ` (${warns} warn(s) noted, advisory)` : ''}.`);
})();
