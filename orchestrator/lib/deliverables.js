'use strict';
/**
 * Put a finished lesson somewhere a redeploy cannot take it.
 *
 * WHY THIS EXISTS
 *
 * A render costs real money and about half an hour, and until now it existed only
 * on the container's own filesystem. `.dockerignore` excludes `out/` and every
 * `*.mp4`, so the next redeploy rebuilt the image without them and the file was
 * gone -- permanently, with no copy anywhere. The volume held jobs, the ledger,
 * idempotency records and the queue: metadata only, not one byte of video.
 *
 * That is not hypothetical. The LMS lost `what-a-harness-actually-is` exactly this
 * way on 2026-09-21: an instructor paid for it, a redeploy landed, and the video
 * and its questions went together. They asked for a way to fetch the bytes before
 * publication so they could archive it themselves, and they were right to -- but a
 * fetch endpoint alone would have left them racing a deploy they cannot see.
 *
 * WHAT IS COPIED, AND WHY EACH
 *
 *   <slug>_final.mp4  the deliverable itself
 *   beats.js          what puts the row in the catalogue (checkpoints.js walks for
 *                     it) and what carries the in-video questions. A video whose
 *                     beats.js died is playable and unanswerable, which is how a
 *                     catalogue row disappears rather than merely going stale.
 *   durations.json    the timing the checkpoints are anchored to; without it a
 *                     question fires at the wrong moment or not at all.
 *
 * WHAT THIS IS NOT
 *
 * Not a backup of the working directory. `art/`, `frames/`, `audio/` and `clips/`
 * are gigabytes per video and are inputs, not deliverables -- a lesson that has to
 * be rebuilt is rebuilt from beats.js, not resurrected from its frame dump.
 *
 * Fail-soft throughout. A lesson that rendered correctly must not be failed by a
 * copy: the worst case here is the status quo, which is the file living only on
 * the container.
 */

const fs = require('fs');
const path = require('path');

/** Named so a caller can say why nothing was copied, rather than guess. */
const SKIPPED = (why) => ({ ok: false, skipped: why, files: [] });

/**
 * Where durable things live.
 *
 * Reuses the job store's own resolution rather than reading
 * RAILWAY_VOLUME_MOUNT_PATH directly, so the deliverables land beside the queue
 * and the ledger and inherit the same answer about whether this machine has a
 * volume at all. One ladder, one truth -- two would eventually disagree about
 * what "durable" means, which is the bug this whole area already had once.
 */
function root() {
  try {
    const store = require('../../server/lib/job-store').shared();
    if (!store || !store.dir) return null;
    // `container`, `ephemeral` and `memory` are honest answers meaning "this
    // survives a crash, not a redeploy". Copying there would cost disk and buy
    // nothing, and would report success for a file no safer than where it began.
    //
    // `writable` as well as durability: the store reports a volume that is
    // mounted read-only as durable-but-unwritable, and a copy there fails per
    // file rather than up front. Better to decline once and say why.
    if (store.durability !== 'volume') return { dir: null, kind: store.durability || 'unknown' };
    if (store.writable === false) return { dir: null, kind: 'volume (not writable)' };
    return { dir: path.join(store.dir, 'deliverables'), kind: store.durability };
  } catch {
    return null;
  }
}
function dirFor(series, slug) {
  const r = root();
  if (!r || !r.dir) return null;
  return path.join(r.dir, String(series), String(slug));
}

/**
 * Copy a finished lesson's durable parts onto the volume.
 *
 * Returns { ok, dir, files, skipped } and never throws.
 */
function persist({ series, slug, finalPath, videoDir, log = () => {} }) {
  const r = root();
  if (!r) return SKIPPED('no job store');
  if (!r.dir) {
    // Said out loud rather than passed over: on a box with no volume this is the
    // difference between "kept" and "kept until the next deploy", and a silent
    // skip is how someone comes to believe a video is safe when it is not.
    log(`deliverable NOT persisted: the job store is '${r.kind}', not a volume`);
    return SKIPPED(`store is ${r.kind}`);
  }
  if (!series || !slug) return SKIPPED('no series/slug');

  const dest = dirFor(series, slug);
  const copied = [];
  try {
    fs.mkdirSync(dest, { recursive: true });

    const wanted = [
      { from: finalPath, to: path.basename(finalPath || ''), required: true },
      { from: videoDir && path.join(videoDir, 'beats.js'), to: 'beats.js' },
      { from: videoDir && path.join(videoDir, 'durations.json'), to: 'durations.json' },
    ];

    for (const w of wanted) {
      if (!w.from || !fs.existsSync(w.from)) {
        if (w.required) {
          log(`deliverable NOT persisted: ${w.from || '(no path)'} does not exist`);
          return SKIPPED('deliverable missing');
        }
        continue;
      }
      // copyFile, not rename: the render directory is still the working copy for
      // this run, and moving the file out from under a later stage would break
      // upload, which reads finalPath again.
      fs.copyFileSync(w.from, path.join(dest, w.to));
      copied.push(w.to);
    }

    fs.writeFileSync(path.join(dest, 'persisted.json'), JSON.stringify({
      series, slug, at: new Date().toISOString(), files: copied,
    }, null, 2));

    const bytes = copied.reduce((a, f) => {
      try { return a + fs.statSync(path.join(dest, f)).size; } catch { return a; }
    }, 0);
    log(`deliverable persisted to the volume (${copied.join(', ')}, ${(bytes / 1e6).toFixed(1)}MB)`);
    return { ok: true, dir: dest, files: copied, bytes };
  } catch (e) {
    // Never fatal. A lesson that rendered correctly is not failed by a copy.
    log(`deliverable NOT persisted: ${e.message}`);
    return SKIPPED(e.message);
  }
}

/** The persisted deliverable for a lesson, or null. Used to serve the bytes. */
function find(series, slug) {
  const dest = dirFor(series, slug);
  if (!dest || !fs.existsSync(dest)) return null;
  let files;
  try { files = fs.readdirSync(dest); } catch { return null; }
  const mp4 = files.find((f) => /_final\.mp4$/i.test(f)) || files.find((f) => /\.mp4$/i.test(f));
  if (!mp4) return null;
  return {
    dir: dest,
    file: path.join(dest, mp4),
    beats: files.includes('beats.js') ? path.join(dest, 'beats.js') : null,
    durations: files.includes('durations.json') ? path.join(dest, 'durations.json') : null,
  };
}

/**
 * Drop a lesson's persisted copy.
 *
 * Only ever on an explicit request -- the LMS calls this once their own copy is
 * stored. Never inferred from a download: a fetch that failed halfway would
 * otherwise destroy the only remaining copy, which is the failure this module
 * exists to prevent.
 */
function forget(series, slug) {
  const dest = dirFor(series, slug);
  if (!dest || !fs.existsSync(dest)) return { ok: false, why: 'nothing persisted' };
  try {
    fs.rmSync(dest, { recursive: true, force: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, why: e.message };
  }
}

/** Everything currently held, so the volume can be watched rather than discovered full. */
function list() {
  const r = root();
  if (!r || !r.dir || !fs.existsSync(r.dir)) return { durable: Boolean(r && r.dir), items: [], bytes: 0 };
  const items = [];
  let bytes = 0;
  for (const series of fs.readdirSync(r.dir)) {
    const sdir = path.join(r.dir, series);
    if (!fs.statSync(sdir).isDirectory()) continue;
    for (const slug of fs.readdirSync(sdir)) {
      const d = path.join(sdir, slug);
      let size = 0;
      try {
        for (const f of fs.readdirSync(d)) size += fs.statSync(path.join(d, f)).size;
      } catch { /* mid-write, skip */ }
      bytes += size;
      items.push({ id: `${series}/${slug}`, bytes: size });
    }
  }
  return { durable: true, items, bytes };
}

module.exports = { persist, find, forget, list, dirFor };
