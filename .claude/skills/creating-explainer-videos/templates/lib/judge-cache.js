'use strict';
/*
 * judge-cache.js — remember what a judge already decided about THIS exact input.
 *
 * WHY THIS EXISTS
 * eval-text.js runs twice over the same beats.js: once before the spend, where a
 * finding is a redraft brief, and once after the render. On 2026-09-19 it PASSED a
 * line the first time and FAILED it the second — same text, same run, same model,
 * temperature 0 — and destroyed a finished lesson (25 minutes, $0.598) over a
 * question mark in narration.
 *
 * Temperature 0 is not determinism. "Necessary but Not Sufficient" (arXiv 2606.26185)
 * measures non-zero flip rates at t=0 from API-level nondeterminism alone; "Rating
 * Roulette" (arXiv 2510.27106) finds the same instability across repeated runs. You
 * cannot prompt your way out of it. What you CAN do is refuse to ask twice.
 *
 * So: a verdict is keyed by the exact thing that was judged, and the second ask
 * returns the first answer. Unchanged input cannot produce two different verdicts,
 * and the run costs one judge call instead of two.
 *
 * THE KEY MUST COVER EVERYTHING THAT COULD CHANGE THE ANSWER — the input, the model,
 * and the prompt. Keying on the input alone would serve a verdict from an older
 * rubric after the prompt was rewritten, which is worse than no cache: it would look
 * like the new rubric agreed.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = '.judge-cache.json';

/** Stable across key order, so re-serialising the same object cannot miss a hit. */
function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}

/**
 * @param {string} judge        model id, e.g. 'gemini-2.5-flash'
 * @param {string|number} promptVersion  bump when the rubric or prompt changes
 * @param {*} payload           exactly what was handed to the judge
 */
function key({ sensor, judge, promptVersion, payload }) {
  return crypto.createHash('sha256')
    .update(canonical({ sensor, judge, promptVersion, payload }))
    .digest('hex');
}

function cachePath(dir) { return path.join(dir || process.cwd(), FILE); }

function readAll(dir) {
  try { return JSON.parse(fs.readFileSync(cachePath(dir), 'utf8')); } catch { return {}; }
}

/**
 * The stored verdict, or undefined. A corrupt cache is a miss, never a crash.
 *
 * JUDGE_CACHE_OFF exists for scripts/calibrate-judges.js: measuring how often a judge
 * disagrees with ITSELF requires actually asking it again. The cache is the fix for
 * that in production and would silently report a perfect flip rate of zero.
 */
function get(dir, k) {
  if (process.env.JUDGE_CACHE_OFF === '1') return undefined;
  const hit = readAll(dir)[k];
  return hit && 'verdict' in hit ? hit.verdict : undefined;
}

function put(dir, k, verdict, meta = {}) {
  const all = readAll(dir);
  all[k] = { at: new Date().toISOString(), ...meta, verdict };
  try {
    fs.writeFileSync(cachePath(dir), JSON.stringify(all, null, 2));
  } catch { /* a cache that cannot be written is a cache miss next time, not a failure */ }
  return verdict;
}

module.exports = { key, get, put, cachePath, FILE };
