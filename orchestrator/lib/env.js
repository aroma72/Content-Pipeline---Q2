'use strict';
/**
 * .env loader.
 *
 * The video pipeline's own scripts load .env via templates/lib/config.js, but
 * the orchestrator runs from a different cwd and never did -- which is why the
 * first real run failed with "Could not resolve authentication method" even
 * though ANTHROPIC_API_KEY was sitting in .env the whole time.
 *
 * Deliberately mirrors config.js: walk up from this file looking for .env, and
 * never overwrite a variable already set in the real environment (an exported
 * shell value should always beat a file).
 */

const fs = require('fs');
const path = require('path');

let loaded = false;

function loadDotenv() {
  if (loaded) return;
  loaded = true;

  let dir = __dirname;
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

  // The pipeline's scripts read GEMINI_API_KEY; this repo stores the key as
  // GOOGLE_STUDIO_API_KEY. Bridge it so a child process inherits a usable name.
  if (!process.env.GEMINI_API_KEY && process.env.GOOGLE_STUDIO_API_KEY) {
    process.env.GEMINI_API_KEY = process.env.GOOGLE_STUDIO_API_KEY;
  }
}

module.exports = { loadDotenv };
