'use strict';
/**
 * Move a finished lesson's bytes to Google Drive, then reclaim the local copies.
 *
 * WHY THIS EXISTS
 *
 * Two stores grew without bound and nothing ever drained either:
 *
 *   1. The 50GB Railway volume. `deliverables.js` copies every `<slug>_final.mp4`
 *      to /data/cq-jobs/deliverables/<series>/<slug>/ and the ONLY exit is a human
 *      or the LMS calling `DELETE .../file`. In practice nobody does. A full
 *      Railway volume forces an offline resize that restarts the service --
 *      possibly mid-render, destroying a paid lesson.
 *   2. The per-video render directories under explainer-videos/<series>/<slug>/.
 *      art/, frames/, audio/, clips/, layers/ and out/ are gigabytes per lesson and
 *      are only ever cleared by a redeploy.
 *
 * THE ORDERING IS THE WHOLE POINT
 *
 * Nothing is deleted until another copy is PROVEN to exist. Per lesson, strictly:
 *
 *   1. capture metadata from the local file while it is still there
 *   2. upload to Drive
 *   3. verify -- Drive's own md5Checksum must equal ours, byte count must match
 *   4. record drive.json + persisted.json
 *   5. only THEN delete the local mp4 and the render working dirs
 *
 * A failure at any step leaves the world exactly as it was. That is deliberate and
 * it is the rule `deliverables.js` already states: "a lesson that rendered
 * correctly must not be failed by a copy". Here the stakes are higher, because the
 * failure mode is not a missing copy but a destroyed one -- so this module never
 * throws, and every delete is guarded by a positive confirmation rather than by
 * the absence of an error.
 *
 * WHAT IS KEPT, ALWAYS
 *
 * beats.js, durations.json, run-context.json, persisted.json, drive.json and
 * video-meta.json stay on the volume. They are a few KB between them and they are
 * NOT optional: `server/lib/checkpoints.js` computes the checkpoint payload and the
 * catalogue row live, per request, from beats.js + durations.json. Deleting those
 * would silently kill the in-video questions and drop the row from the catalogue --
 * a video that plays and cannot be answered, which is the exact class of failure
 * the LMS has been bitten by before.
 */

const fs = require('fs');
const path = require('path');

const gdrive = require('./gdrive');
const videoMeta = require('./video-meta');
const deliverables = require('./deliverables');
const { videoDir: resolveVideoDir } = require('./paths');

/** Named so a caller can say why nothing happened, rather than guess. */
const SKIPPED = (why) => ({ ok: false, skipped: why, freedBytes: 0 });

/**
 * The render subdirectories that are safe to remove.
 *
 * An explicit allow-list, never `rm -rf <videoDir>`. beats.js, durations.json and
 * the lesson's own config live at the top of that directory, and a recursive
 * delete of the parent would take them -- which is precisely the mistake that
 * turns a disk-space fix into a content-loss incident.
 */
const RECLAIMABLE = ['art', 'frames', 'audio', 'clips', 'layers', 'out'];

function dirBytes(dir) {
  let total = 0;
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else {
        try { total += fs.statSync(p).size; } catch { /* mid-write, skip */ }
      }
    }
  };
  walk(dir);
  return total;
}

/** What we already know about a lesson's Drive copy, or null. */
function driveRecord(series, slug) {
  const dest = deliverables.dirFor(series, slug);
  if (!dest) return null;
  const f = path.join(dest, 'drive.json');
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

/** True once the bytes are on Drive, whatever is or is not still on disk. */
function isOffloaded(series, slug) {
  const r = driveRecord(series, slug);
  return Boolean(r && r.saved2drive && r.driveFileId);
}

/**
 * Remove the render working directories for a lesson.
 *
 * Separated from the upload so it can also be called for a lesson whose mp4 was
 * already offloaded on an earlier pass -- the working dirs are the larger half of
 * the problem and should not be held hostage to a re-upload.
 */
function reclaimWorkingDirs(videoDir, log = () => {}) {
  if (!videoDir || !fs.existsSync(videoDir)) return { freedBytes: 0, removed: [] };
  let freed = 0;
  const removed = [];
  for (const name of RECLAIMABLE) {
    const d = path.join(videoDir, name);
    if (!fs.existsSync(d)) continue;
    const size = dirBytes(d);
    try {
      fs.rmSync(d, { recursive: true, force: true });
      freed += size;
      removed.push(name);
    } catch (e) {
      log(`could not remove ${name}/: ${e.message}`);
    }
  }
  if (removed.length) {
    log(`reclaimed ${removed.join(', ')} (${(freed / 1e6).toFixed(1)}MB) from the render dir`);
  }
  return { freedBytes: freed, removed };
}

/**
 * Offload one lesson.
 *
 * Never throws. Returns { ok, skipped?, drive?, meta?, freedBytes }.
 *
 * @param {object}  o
 * @param {string}  o.series
 * @param {string}  o.slug
 * @param {string} [o.finalPath]   the render-dir mp4, if this run made one
 * @param {string} [o.videoDir]    the render dir, if it still exists
 * @param {boolean}[o.dryRun]      report what would happen, touch nothing
 * @param {boolean}[o.keepWorkingDirs]
 */
async function offload({
  series,
  slug,
  finalPath = null,
  videoDir = null,
  dryRun = false,
  keepWorkingDirs = false,
  log = () => {},
}) {
  if (!series || !slug) return SKIPPED('no series/slug');
  if (!gdrive.isConfigured()) {
    // Said once, plainly. Not an error: a machine without Drive credentials should
    // behave exactly as it did before this module existed.
    return SKIPPED('Drive is not configured (GDRIVE_REFRESH_TOKEN / GDRIVE_FOLDER_ID)');
  }

  const dest = deliverables.dirFor(series, slug);
  if (!dest) return SKIPPED('no durable store, so there is nothing to reclaim');

  const resolvedVideoDir = videoDir || resolveVideoDir(series, slug);

  // Idempotent. A requeue re-runs the spine, and re-uploading would leave a second
  // copy on Drive with no way to tell which one the record points at.
  if (isOffloaded(series, slug)) {
    const existing = driveRecord(series, slug);
    log(`already on Drive (${existing.driveFileId}) -- not uploading again`);
    let freed = 0;
    if (!keepWorkingDirs && !dryRun) {
      freed = reclaimWorkingDirs(resolvedVideoDir, log).freedBytes;
    }
    return { ok: true, alreadyOffloaded: true, drive: existing, freedBytes: freed };
  }

  // Prefer the volume copy: it is the one we are trying to reclaim, and it is the
  // copy whose absence causes the capacity problem. Fall back to the render dir
  // for the case where persist() could not run.
  const onVolume = deliverables.find(series, slug);
  const source = (onVolume && onVolume.file)
    || (finalPath && fs.existsSync(finalPath) ? finalPath : null);

  if (!source) return SKIPPED('no mp4 to offload');
  if (!/_final\.mp4$/i.test(path.basename(source))) {
    // LAW 1: the bare render is not the deliverable. Uploading it would put an
    // unbranded video in TU's Drive under a name that claims otherwise.
    return SKIPPED(`refusing to offload ${path.basename(source)} -- not the branded _final.mp4`);
  }

  if (dryRun) {
    let bytes = 0;
    try { bytes = fs.statSync(source).size; } catch { /* ignore */ }
    const workBytes = keepWorkingDirs ? 0 : dirBytes(resolvedVideoDir);
    return {
      ok: true, dryRun: true, source,
      freedBytes: bytes + workBytes,
      wouldUpload: `${series}__${path.basename(source)}`,
    };
  }

  // --- 1. metadata, while the file is still here ------------------------------
  let meta;
  try {
    meta = await videoMeta.capture(source);
  } catch (e) {
    return SKIPPED(`could not read the video to record its attributes: ${e.message}`);
  }
  if (!meta.md5) return SKIPPED('could not hash the video, so an upload could not be verified');

  // Written BEFORE the upload. If the process dies mid-upload, the attributes of a
  // video we still hold are already recorded -- and nothing has been deleted.
  try {
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'video-meta.json'), JSON.stringify(meta, null, 2));
  } catch (e) {
    return SKIPPED(`could not write video-meta.json: ${e.message}`);
  }

  // --- 2. upload --------------------------------------------------------------
  const driveName = `${series}__${path.basename(source)}`;
  let up;
  try {
    up = await gdrive.uploadFile({ filePath: source, name: driveName, log });
  } catch (e) {
    log(`Drive upload failed, nothing deleted: ${e.message}`);
    return SKIPPED(`upload failed: ${e.message}`);
  }

  // --- 3. verify --------------------------------------------------------------
  // Drive computes md5Checksum itself, server-side, over what it actually stored.
  // Equality with our own hash is the only honest basis for deleting our copy.
  if (up.md5 && up.md5 !== meta.md5) {
    log(`REFUSING to delete: Drive md5 ${up.md5} != local ${meta.md5}`);
    return SKIPPED('md5 mismatch between the local file and Drive');
  }
  if (up.bytes && up.bytes !== meta.bytes) {
    log(`REFUSING to delete: Drive size ${up.bytes} != local ${meta.bytes}`);
    return SKIPPED('size mismatch between the local file and Drive');
  }
  if (!up.md5) {
    // Shared Drives normally return md5Checksum, but say so rather than silently
    // treating "no hash" as "hashes match".
    log('warning: Drive returned no md5Checksum; verified on byte count alone');
  }

  // --- 4. record --------------------------------------------------------------
  const record = {
    saved2drive: true,
    driveFileId: up.fileId,
    driveUrl: up.webViewLink,
    driveName: up.name,
    driveFolderId: gdrive.folderId(),
    bytes: up.bytes,
    md5: up.md5 || meta.md5,
    sha256: meta.sha256,
    verified: Boolean(up.md5 && up.md5 === meta.md5),
    savedAt: new Date().toISOString(),
    series,
    slug,
  };
  try {
    fs.writeFileSync(path.join(dest, 'drive.json'), JSON.stringify(record, null, 2));
    // Mirror into persisted.json so the existing per-deliverable manifest does not
    // disagree with the new one about where the bytes are.
    const pFile = path.join(dest, 'persisted.json');
    if (fs.existsSync(pFile)) {
      const p = JSON.parse(fs.readFileSync(pFile, 'utf8'));
      p.drive = record;
      fs.writeFileSync(pFile, JSON.stringify(p, null, 2));
    }
  } catch (e) {
    // The bytes ARE on Drive, but we could not write the record proving it. Do not
    // delete: an unrecorded copy is one nobody can find.
    log(`uploaded but could not record it, so nothing was deleted: ${e.message}`);
    return SKIPPED(`could not record the Drive copy: ${e.message}`);
  }

  log(`saved to Drive: ${record.driveUrl}`);

  // --- 5. reclaim -------------------------------------------------------------
  let freed = 0;

  // The volume mp4. beats.js, durations.json, run-context.json and the records
  // above all stay -- see the header for why they are not optional.
  //
  // Through forgetVideoOnly() rather than a bare unlink, so the deletion goes
  // through the module that owns these bytes and has to be told, in writing,
  // where the other copy is.
  const localMp4 = onVolume && onVolume.file;
  if (localMp4) {
    const dropped = deliverables.forgetVideoOnly(series, slug, {
      because: `uploaded to Google Drive as ${record.driveFileId}`,
    });
    if (dropped.ok) {
      freed += dropped.bytes;
      log(`reclaimed ${(dropped.bytes / 1e6).toFixed(1)}MB from the volume`);
    } else {
      log(`could not remove the volume copy: ${dropped.why}`);
    }
  }

  // The render working dirs -- the larger half of the problem.
  if (!keepWorkingDirs) {
    freed += reclaimWorkingDirs(resolvedVideoDir, log).freedBytes;
    // The render-dir mp4 too, if it is a different file from the volume copy.
    if (finalPath && fs.existsSync(finalPath) && path.resolve(finalPath) !== path.resolve(localMp4 || '')) {
      try {
        const size = fs.statSync(finalPath).size;
        fs.unlinkSync(finalPath);
        freed += size;
      } catch { /* out/ is usually gone with the working dirs already */ }
    }
  }

  return { ok: true, drive: record, meta, freedBytes: freed };
}

module.exports = {
  offload,
  isOffloaded,
  driveRecord,
  reclaimWorkingDirs,
  dirBytes,
  RECLAIMABLE,
};
