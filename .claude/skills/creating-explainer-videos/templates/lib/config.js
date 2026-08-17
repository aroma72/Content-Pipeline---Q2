'use strict';
/*
 * Shared config + cost guard for the explainer-video pipeline.
 *
 * TWO jobs:
 *  1. Resolve the Google API key from whatever the environment actually has.
 *     The spec's scripts read GEMINI_API_KEY, but this repo stores the key as
 *     GOOGLE_STUDIO_API_KEY. We accept either (GEMINI_API_KEY wins if both set).
 *  2. Enforce "ask before any paid call". Imagen (~$0.04/img) and Gemini TTS
 *     cost money, so no script may spend unless the operator explicitly opts in
 *     for THIS run via `CONFIRM_SPEND=1` (env) or a `--yes` / `--confirm-spend`
 *     CLI flag. Otherwise the script prints exactly what it WOULD spend and exits 2.
 */

const fs = require('fs');
const path = require('path');

// --- .env loader (walks up from cwd; no dependency on dotenv) ---------------
function loadDotenv() {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, '.env');
    if (fs.existsSync(p)) {
      for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const k = line.slice(0, eq).trim();
        let v = line.slice(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (!(k in process.env)) process.env[k] = v;
      }
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
}
loadDotenv();

function geminiKey() {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_STUDIO_API_KEY || '';
  if (!k) {
    console.error(
      '\n[config] No Google API key found.\n' +
      '  Set GEMINI_API_KEY (or GOOGLE_STUDIO_API_KEY) in a .env at a parent of this folder.\n'
    );
    process.exit(1);
  }
  return k;
}

// --- cost guard --------------------------------------------------------------
function spendApproved() {
  if (process.env.CONFIRM_SPEND === '1' || process.env.CONFIRM_SPEND === 'true') return true;
  const argv = process.argv.slice(2);
  return argv.includes('--yes') || argv.includes('--confirm-spend');
}

/**
 * Call at the top of any script that makes paid API calls.
 * @param {object} o
 * @param {string} o.action   e.g. "Generate 12 Imagen images"
 * @param {number} o.units    number of billable units
 * @param {number} o.unitCost approx USD per unit
 */
function guardSpend({ action, units, unitCost }) {
  const est = (units * unitCost);
  if (spendApproved()) {
    console.log(`[spend] APPROVED — ${action}: ${units} units × ~$${unitCost} ≈ ~$${est.toFixed(2)}`);
    return;
  }
  console.error(
    `\n[spend] BLOCKED (ask-before-calls policy).\n` +
    `  Would run: ${action}\n` +
    `  Estimated cost: ${units} units × ~$${unitCost} ≈ ~$${est.toFixed(2)}\n` +
    `  To proceed, re-run with  --yes  (or set CONFIRM_SPEND=1).\n`
  );
  process.exit(2);
}

// --- models (change here if they move) --------------------------------------
// Overridable by env so the next retirement is a Railway variable, not a code
// change and redeploy. imagen-4.0-* was retired from the Gemini API and now 404s
// with a pointer to gemini-*-image, which speaks generateContent rather than
// predict -- see generate-lesson-art.js.
const MODELS = {
  art: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
  tts: process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
};

const COST = { imagePerImage: 0.04, ttsPerClip: 0.002 };

module.exports = { geminiKey, guardSpend, spendApproved, MODELS, COST };
