'use strict';
/*
 * generate-lesson-art-gemini.js — art for every ali/scene beat via Google's own
 * Gemini image model (gemini-2.5-flash-image, "nano banana"), CHARACTER-CONSISTENT
 * by seeding the locked Ali reference sheet (art/_ref.png) as an input image on
 * EVERY beat. Uses the funded GOOGLE_STUDIO_API_KEY (kie.ai credits are exhausted).
 *
 * Same idea as the omni generator, but on Google's API:
 *   contents:[{ parts:[ {inline_data: <ref png>}, {text: prompt + identity-lock} ] }]
 *   generationConfig:{ responseModalities:['IMAGE'], imageConfig:{ aspectRatio:'16:9' } }
 *
 * Robust: if a ref-carrying request errors, retry the SAME prompt WITHOUT the ref so a
 * schema hiccup never loses a beat. Cost guarded — no spend without --yes / CONFIRM_SPEND=1.
 * Env: NO_REF=1 disables seeding · ART_IDS=03,07 regenerates only some beats.
 * Output: art/<id>.png  (16:9).
 */
const fs = require('fs');
const path = require('path');
const { geminiKey, guardSpend, COST } = require('./lib/config');

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const beats = require('./beats.js');
const OUT = path.join(process.cwd(), 'art');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const USE_REF = process.env.NO_REF !== '1';
const CLEAN_HERO_SUFFIX =
  ' — flat editorial illustration, single subject centered and standing, plain flat cream ' +
  'background (#F5F1E8) filling the whole frame, any props float detached and never touch the ' +
  'subject, NO desk, NO furniture, NO scenery, NO ground line, NO cast shadow, NO dark or navy ' +
  'fill anywhere, no border, no text.';
const IDENTITY_LOCK =
  ' Use the SAME person as the reference image: identical face, warm medium-brown skin tone, ' +
  'short neat black hair, clean-shaven, and the same teal collared shirt; keep the exact same ' +
  'flat 2D vector art style and warm cream palette as the reference. Wide 16:9 landscape composition.';

const artBeats = beats.filter((b) => (b.mode === 'ali' || b.mode === 'scene') && b.art);
const onlyIds = (process.env.ART_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const todo = onlyIds.length ? artBeats.filter((b) => onlyIds.includes(b.id)) : artBeats;

const refB64 = (USE_REF && fs.existsSync(path.join(OUT, '_ref.png')))
  ? fs.readFileSync(path.join(OUT, '_ref.png')).toString('base64') : null;

async function gen(prompt, key, useRef) {
  const parts = [];
  if (useRef && refB64) parts.push({ inline_data: { mime_type: 'image/png', data: refB64 } });
  parts.push({ text: prompt });
  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const j = await res.json();
      const part = (j?.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData || p.inline_data);
      const data = part && (part.inlineData || part.inline_data).data;
      if (!data) throw new Error('no image bytes: ' + JSON.stringify(j).slice(0, 200));
      return Buffer.from(data, 'base64');
    }
    const txt = await res.text();
    if (res.status >= 500 && attempt < 3) { await sleep(1500 * attempt); continue; }
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
}

async function genBeat(finalPrompt, key) {
  if (refB64) {
    try { return { buf: await gen(finalPrompt + IDENTITY_LOCK, key, true), seeded: true }; }
    catch (e) { process.stdout.write(`(ref failed: ${e.message.slice(0, 50)}; no-ref) `); }
  }
  return { buf: await gen(finalPrompt, key, false), seeded: false };
}

(async () => {
  if (!todo.length) { console.log('[gart] no ali/scene beats with `art`.'); return; }
  guardSpend({ action: `Gemini image (${MODEL}) ${todo.length} image(s)`, units: todo.length, unitCost: COST.imagePerImage });
  const key = geminiKey();
  console.log(`[gart] model=${MODEL}  ref=${refB64 ? 'on (seeded)' : 'off'}`);
  for (const b of todo) {
    const finalPrompt = (b.mode === 'ali') ? (b.art + CLEAN_HERO_SUFFIX) : b.art;
    process.stdout.write(`[gart] ${b.id} (${b.mode}) … `);
    try {
      const { buf, seeded } = await genBeat(finalPrompt, key);
      fs.writeFileSync(path.join(OUT, `${b.id}.png`), buf);
      console.log(`ok (${(buf.length / 1024).toFixed(0)} KB${seeded ? ', seeded' : ''}) -> art/${b.id}.png`);
    } catch (e) { console.log(`FAILED: ${e.message}`); process.exitCode = 1; }
    await sleep(500);
  }
  console.log('\n[gart] done. Run eval-consistency.js to score Ali consistency; regenerate drifts with ART_IDS=..');
})();
