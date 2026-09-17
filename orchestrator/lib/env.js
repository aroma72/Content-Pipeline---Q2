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

/**
 * @param {{from?: string, force?: boolean}} [opts]
 *   from  - directory to start walking up from. Defaults to this file's own,
 *           which is the only behaviour production uses.
 *   force - load again even if it has already run. The memo exists so twenty
 *           requires do not re-read the file; a test proving the parser needs to
 *           bypass it, and had no way to.
 *
 * Both default to the previous behaviour exactly, so the two existing callers
 * (server/index.js and orchestrator/run.js) pass nothing and are unaffected.
 */
function loadDotenv(opts = {}) {
  const { from = __dirname, force = false } = opts;
  if (loaded && !force) return;
  loaded = true;

  let dir = from;
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
