'use strict';
/*
 * Shared config + cost guard for the fashion-tech talking-avatar build.
 * Lifted from the explainer-video pipeline's lib/config.js (same env + spend rules).
 *  1. Resolve API keys from whatever the environment actually has.
 *  2. Enforce "ask before any paid call": kie omni image, kie infinitalk lip-sync,
 *     and Gemini TTS all cost money — nothing spends without CONFIRM_SPEND=1
 *     (env) or a --yes / --confirm-spend CLI flag.
 */

const fs = require('fs');
const path = require('path');

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
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
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
  if (!k) { console.error('\n[config] No Google API key (GEMINI_API_KEY / GOOGLE_STUDIO_API_KEY) in .env.\n'); process.exit(1); }
  return k;
}
function omniKey() {
  const k = process.env.GEMINI_OMNI_API_KEY || process.env.KIE_API_KEY || '';
  if (!k) { console.error('\n[config] No kie.ai key (GEMINI_OMNI_API_KEY / KIE_API_KEY) in .env.\n'); process.exit(1); }
  return k;
}

function spendApproved() {
  if (process.env.CONFIRM_SPEND === '1' || process.env.CONFIRM_SPEND === 'true') return true;
  const argv = process.argv.slice(2);
  return argv.includes('--yes') || argv.includes('--confirm-spend');
}
function guardSpend({ action, units, unitCost }) {
  const est = units * unitCost;
  if (spendApproved()) { console.log(`[spend] APPROVED — ${action}: ${units} × ~$${unitCost} ≈ ~$${est.toFixed(2)}`); return; }
  console.error(
    `\n[spend] BLOCKED (ask-before-calls policy).\n` +
    `  Would run: ${action}\n` +
    `  Estimated cost: ${units} × ~$${unitCost} ≈ ~$${est.toFixed(2)}\n` +
    `  To proceed, re-run with  --yes  (or set CONFIRM_SPEND=1).\n`);
  process.exit(2);
}

const MODELS = {
  omni: process.env.OMNI_MODEL || 'nano-banana-2',        // kie image (Nano Banana 2)
  lipsync: process.env.LIPSYNC_MODEL || 'infinitalk/from-audio', // kie audio-driven talking avatar
  tts: 'gemini-2.5-flash-preview-tts',
};
const KIE_BASE = 'https://api.kie.ai/api/v1';
const UPLOAD_HOST = 'https://kieai.redpandaai.co';        // kie's file host
const COST = { imagePerImage: 0.04, ttsPerClip: 0.002, lipsyncPerSec: 0.06 }; // 720p infinitalk ≈ $0.06/s

module.exports = { geminiKey, omniKey, guardSpend, spendApproved, MODELS, COST, KIE_BASE, UPLOAD_HOST };
