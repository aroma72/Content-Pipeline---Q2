'use strict';
/*
 * generate-lesson-art.js — Imagen stills for every ali/scene beat that has `art`.
 *
 * LAW 4 (clean-hero): character centered, standing, on PLAIN CREAM; props float
 * detached; no desk/scenery/ground/shadow; no dark/navy fill. Merged or
 * dark-cornered art makes segmentation grab the whole frame. We append a
 * hard clean-hero suffix to every prompt as a backstop.
 *
 * Cost: ~$0.04/image. Guarded — will not spend without --yes / CONFIRM_SPEND=1.
 * Output: art/<id>.png  (16:9, ~1408x768; scaled to cover 1080p at compile time)
 */

const fs = require('fs');
const path = require('path');
const { geminiKey, guardSpend, MODELS, COST } = require('./lib/config');

const beats = require('./beats.js');
const OUT = path.join(process.cwd(), 'art');
fs.mkdirSync(OUT, { recursive: true });

const CLEAN_HERO_SUFFIX =
  ' — flat editorial illustration, single subject centered and standing, ' +
  'plain flat cream background (#F5F1E8) filling the whole frame, any props float ' +
  'detached and never touch the subject, NO desk, NO furniture, NO scenery, NO ground line, ' +
  'NO cast shadow, NO dark or navy fill anywhere, no border, no text.';

const artBeats = beats.filter(b => (b.mode === 'ali' || b.mode === 'scene') && b.art);
const onlyIds = (process.env.ART_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const todo = onlyIds.length ? artBeats.filter(b => onlyIds.includes(b.id)) : artBeats;

/**
 * Generate one image.
 *
 * The Imagen models this used to call (`imagen-4.0-*` via `:predict`) have been
 * retired from the Gemini API -- the service now answers that request with a 404
 * naming gemini-*-image as the replacement, and no imagen-* model is listed for
 * this key at all. The replacement family speaks a DIFFERENT protocol, so this is
 * not a model rename: `:generateContent` with the image returned as an inlineData
 * part, rather than `:predict` with predictions[0].bytesBase64Encoded.
 *
 * Aspect ratio moves into the prompt because generateContent has no equivalent of
 * Imagen's parameters block.
 */
async function imagen(prompt, key, mode) {
  // clean-hero cream suffix ONLY for ali beats (they get cut out); scene beats keep depth/setting.
  const finalPrompt = (mode === 'ali') ? (prompt + CLEAN_HERO_SUFFIX) : prompt;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.art}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: `${finalPrompt} 16:9 widescreen aspect ratio.` }] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = await res.json();
      const parts = json?.candidates?.[0]?.content?.parts || [];
      const img = parts.find((p) => p.inlineData && p.inlineData.data);
      if (!img) {
        // A refusal comes back as a text part with a 200, so report what it said
        // rather than a bare "no image" that sends someone hunting for a bug.
        const said = parts.map((p) => p.text).filter(Boolean).join(' ').slice(0, 200);
        throw new Error(`No image returned${said ? ` — model said: ${said}` : ''}: ${JSON.stringify(json).slice(0, 200)}`);
      }
      return Buffer.from(img.inlineData.data, 'base64');
    }
    const txt = await res.text();
    if (res.status >= 500 && attempt < 3) { await new Promise(r => setTimeout(r, 1500 * attempt)); continue; }
    throw new Error(`Image API HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
}

(async () => {
  if (!todo.length) { console.log('[art] no ali/scene beats with `art` — nothing to do.'); return; }
  guardSpend({ action: `Generate ${todo.length} Imagen image(s)`, units: todo.length, unitCost: COST.imagePerImage });
  const key = geminiKey();
  for (const b of todo) {
    const dst = path.join(OUT, `${b.id}.png`);
    process.stdout.write(`[art] ${b.id} (${b.mode}) … `);
    try {
      const png = await imagen(b.art, key, b.mode);
      fs.writeFileSync(dst, png);
      console.log(`ok (${(png.length / 1024).toFixed(0)} KB) -> art/${b.id}.png`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log('\n[art] done. Eyeball each PNG; regenerate any that will not cut clean (ART_IDS=03,07 npm run art -- --yes).');
})();
