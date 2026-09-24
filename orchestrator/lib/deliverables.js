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
const crypto = require('crypto');

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

    // Nothing here is required, because persist() is called TWICE: once before the
    // blocking gates, when only beats.js and durations.json exist, and again once
    // the branded deliverable does. The early call is what lets a lesson that
    // blocked after the spend be understood without paying for another render --
    // on 2026-09-21 the findings named beats nobody could go and look at.
    const wanted = [
      { from: finalPath, to: finalPath ? path.basename(finalPath) : null },
      { from: videoDir && path.join(videoDir, 'beats.js'), to: 'beats.js' },
      { from: videoDir && path.join(videoDir, 'durations.json'), to: 'durations.json' },
      // Written by the script-approval stage: the research brief, the gate verdict
      // and the sha of the script a person was shown. Run state is deliberately
      // NOT on the volume (paths.js:36-39), so without this a redeploy during the
      // approval pause loses the brief -- and script.js:328 feeds that brief into
      // every rewrite, which one-video.js:127 says the writer is much worse without.
      { from: videoDir && path.join(videoDir, 'run-context.json'), to: 'run-context.json' },
    ];

    for (const w of wanted) {
      if (!w.from || !w.to || !fs.existsSync(w.from)) continue;
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
 * The persisted SCRIPT for a lesson, or null.
 *
 * Separate from find() because find() returns null without an mp4 -- it answers
 * "can I serve the video". This answers "can I serve the script", which is the
 * normal state of a lesson parked at the script-approval gate: beats.js and
 * run-context.json are on the volume and no video exists or ever will until
 * somebody approves it.
 */
function findScript(series, slug) {
  const dest = dirFor(series, slug);
  if (!dest || !fs.existsSync(dest)) return null;
  let files;
  try { files = fs.readdirSync(dest); } catch { return null; }
  if (!files.includes('beats.js')) return null;
  const ctxPath = files.includes('run-context.json') ? path.join(dest, 'run-context.json') : null;
  let context = null;
  if (ctxPath) {
    try { context = JSON.parse(fs.readFileSync(ctxPath, 'utf8')); } catch { context = null; }
  }
  return {
    dir: dest,
    beats: path.join(dest, 'beats.js'),
    durations: files.includes('durations.json') ? path.join(dest, 'durations.json') : null,
    context,
  };
}

/**
 * A stable name for the exact bytes of a script.
 *
 * Bytes, not a re-serialisation of the beats artifact: bytes are what produce
 * actually reads and what persist() actually copies, so this is the only thing
 * that can honestly answer "is the script about to be rendered the one that was
 * approved". Truncated because it is read by people in error messages, and 16
 * hex characters is far past collision territory for one lesson's drafts.
 */
function fingerprint(beatsPath) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(beatsPath)).digest('hex').slice(0, 16);
  } catch { return null; }
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

/**
 * Drop only the VIDEO, keeping everything that describes it.
 *
 * This is what the Drive offload calls, and the distinction from forget() is the
 * whole safety story. beats.js and durations.json are not a backup of the video --
 * `server/lib/checkpoints.js` recomputes the checkpoint payload and the catalogue
 * row from them live, on every request. Remove them and the video still plays but
 * can no longer be answered, and its row leaves the catalogue. They are a few KB;
 * the mp4 is tens of megabytes. Deleting the expensive half and keeping the
 * load-bearing half is the entire point.
 *
 * Refuses unless the caller can name where the other copy is, because "delete the
 * video" with no second copy is the failure this module was built to prevent.
 */
function forgetVideoOnly(series, slug, { because } = {}) {
  if (!because) return { ok: false, why: 'refusing to delete a video without being told where the other copy is' };
  const found = find(series, slug);
  if (!found) return { ok: false, why: 'no video held' };
  try {
    const bytes = fs.statSync(found.file).size;
    fs.unlinkSync(found.file);
    return { ok: true, bytes, because };
  } catch (e) {
    return { ok: false, why: e.message };
  }
}

/** The Drive record for a lesson, or null. Read here so callers need one import. */
function driveRecord(series, slug) {
  const dest = dirFor(series, slug);
  if (!dest) return null;
  const f = path.join(dest, 'drive.json');
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

/** The measured attributes of a lesson's video, captured before any offload. */
function videoMeta(series, slug) {
  const dest = dirFor(series, slug);
  if (!dest) return null;
  const f = path.join(dest, 'video-meta.json');
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

/**
 * Everything currently held, so the volume can be watched rather than discovered full.
 *
 * Reports `videoLocal` and `saved2drive` per item because the total byte count
 * alone stopped being a useful capacity signal once offloading existed: a store
 * holding 200 lessons at 4KB each and one holding 200 at 30MB each are very
 * different situations and used to look similar until the volume filled.
 */
function list() {
  const r = root();
  if (!r || !r.dir || !fs.existsSync(r.dir)) return { durable: Boolean(r && r.dir), items: [], bytes: 0 };
  const items = [];
  let bytes = 0;
  let videoBytes = 0;
  let offloaded = 0;
  for (const series of fs.readdirSync(r.dir)) {
    const sdir = path.join(r.dir, series);
    if (!fs.statSync(sdir).isDirectory()) continue;
    for (const slug of fs.readdirSync(sdir)) {
      const d = path.join(sdir, slug);
      let size = 0;
      let mp4Bytes = 0;
      try {
        for (const f of fs.readdirSync(d)) {
          const s = fs.statSync(path.join(d, f)).size;
          size += s;
          if (/\.mp4$/i.test(f)) mp4Bytes += s;
        }
      } catch { /* mid-write, skip */ }
      const drive = driveRecord(series, slug);
      bytes += size;
      videoBytes += mp4Bytes;
      if (drive && drive.saved2drive) offloaded += 1;
      items.push({
        id: `${series}/${slug}`,
        bytes: size,
        videoLocal: mp4Bytes > 0,
        videoBytes: mp4Bytes,
        saved2drive: Boolean(drive && drive.saved2drive),
        ...(drive && drive.driveUrl ? { driveUrl: drive.driveUrl } : {}),
      });
    }
  }
  return { durable: true, items, bytes, videoBytes, offloadedCount: offloaded };
}

module.exports = {
  persist, find, findScript, fingerprint, forget, forgetVideoOnly,
  driveRecord, videoMeta, list, dirFor,
};
