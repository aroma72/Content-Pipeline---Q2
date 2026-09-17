'use strict';
/**
 * publish-log -- which catalogue rows have a playable YouTube URL.
 *
 * WHY THE CATALOGUE NEEDED THIS
 * The two APIs were islands. A finished job knew its YouTube URL but not the
 * slug its checkpoints are filed under; a catalogue entry knew its checkpoints
 * but carried no URL at all. A person bridged them by eye. Worse, once a job
 * expired the catalogue was the only conceivable route back to an asset that had
 * been paid for -- and it could not return one.
 *
 * THE JOIN KEY IS `path`, NOT `videoId`
 * Two fields are called videoId and they are not the same thing. The publish
 * record's videoId is a YouTube id; the catalogue row's is a folder basename.
 * The publish record's `itemId` is `<series>/<slug>`, which is exactly the
 * catalogue row's `path`. Joining on the wrong one would look like it worked and
 * break `GET /api/v1/videos/:videoId/checkpoints` for every published video, so
 * the YouTube id is nested under `youtube` and never overwrites anything.
 */

const fs = require('fs');
const path = require('path');

/**
 * Where a publish record might be.
 *
 * .beads is the pipeline's own log. The job store is the durable mirror written
 * when a volume exists -- .beads/*.jsonl was excluded from the image entirely
 * until this change, so on Railway the first source is usually empty.
 */
function sources() {
  const out = [];
  try {
    const { PATHS } = require('../../orchestrator/lib/paths');
    out.push(path.join(PATHS.beads, 'publish_review.jsonl'));
  } catch { /* no paths module, no beads log */ }
  try {
    const store = require('./job-store').shared();
    if (store && store.dir) out.push(path.join(store.dir, 'publish_review.jsonl'));
  } catch { /* no store */ }
  return out;
}

let cache = null;
let cacheKey = null;

/** Cheap staleness check: a growing JSONL must not be re-read per request. */
function fingerprint(files) {
  return files.map((f) => {
    try {
      const st = fs.statSync(f);
      return `${f}:${st.mtimeMs}:${st.size}`;
    } catch { return `${f}:-`; }
  }).join('|');
}

/**
 * @returns {Map<string, {url, videoId, privacyStatus, at, cleared, provisional}>}
 *   keyed on `<series>/<slug>`.
 */
function index() {
  const files = sources();
  const fp = fingerprint(files);
  if (cache && fp === cacheKey) return cache;

  const map = new Map();
  for (const file of files) {
    let raw = '';
    try { raw = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let rec = null;
      try { rec = JSON.parse(line); } catch { continue; }
      if (!rec || !rec.itemId || !rec.url) continue;
      // Later records win: a re-publish, or a `cleared` flag set after review.
      map.set(String(rec.itemId), {
        url: rec.url,
        videoId: rec.videoId || null,
        privacyStatus: rec.privacyStatus || null,
        publishedAt: rec.at || null,
        cleared: Boolean(rec.cleared),
        provisional: !rec.cleared,
        title: rec.title || null,
      });
    }
  }
  cache = map;
  cacheKey = fp;
  return map;
}

function forPath(relPath) {
  return index().get(String(relPath)) || null;
}

/** Mirror a publish into the durable store, so it survives a redeploy. */
function record(entry) {
  try {
    const store = require('./job-store').shared();
    if (!store || !store.canRecordSpend()) return false;
    fs.appendFileSync(path.join(store.dir, 'publish_review.jsonl'), `${JSON.stringify(entry)}\n`);
    invalidate();
    return true;
  } catch { return false; }
}

function invalidate() { cache = null; cacheKey = null; }

module.exports = { index, forPath, record, invalidate, sources };
