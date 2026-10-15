'use strict';
/**
 * Keep a lesson's paid inputs so a redo rebuilds only the flagged scenes.
 *
 * WHY THIS EXISTS
 *
 * A reviewer at `review` who dislikes ONE scene had two choices: publish it or
 * reject the lesson -- and a rebuild re-bought every image and voice clip and
 * sat in Chrome for an hour, because `drive-offload.js` reclaimed art/, audio/,
 * clips/, layers/ and out/ the moment the branded final verified on Drive. The
 * per-beat staleness checks in produce.js (`missingPerBeat`, `staleVo`) already
 * know how to re-buy only what changed; they just never had anything left to
 * compare against. This module gives them that: the keep-set below, as ONE tar
 * per lesson, on the volume as a hot cache and on Drive as the durable copy.
 *
 * WHAT IS KEPT, AND WHY EACH
 *
 *   beats.js, durations.json         the script and its timing (never deleted anyway)
 *   art/<id>.png + .txt              $0.04 each; the .txt is what missingPerBeat keys on
 *   layers/<id>/                     cutouts; free but minutes of Pillow
 *   audio/vo_<id>.wav + .txt         the voice take and its text, what staleVo keys on
 *   audio/raw_<id>.wav + .sig        the un-retimed take; the cache key tts-lesson needs
 *   clips/<id>.mp4 + .txt            $0.05/s of motion; the .txt keys staleness
 *   out/lesson.mp4                   the bare render -- the splice base for a partial redo
 *   out/_bumpers/intro|outro.mp4     a Chrome render each, unchanged on a redo
 *
 * NOT kept: frames/ (regenerable, ~10,800 PNGs), node_modules/, the mixed audio
 * and concat intermediates (seconds of ffmpeg), and the branded _final.mp4, which
 * has its own offload and its own record (drive.json).
 *
 * THE SAME RULE AS THE VIDEO
 *
 * Nothing on disk is deleted by this module, ever. It only ADDS copies, and it
 * reports `ok` only when a copy is proven: the tar's md5 must equal what Drive
 * says it stored before the manifest records a Drive copy, and a restore from
 * Drive refuses a download whose md5 differs from the manifest. The caller
 * (spine.execute) is what decides whether RECLAIMABLE may run, and it decides
 * that on this module's verified result -- so with Drive misbehaving the paid
 * inputs simply stay on the container, exactly as before this module existed.
 *
 * One flat Drive folder (GDRIVE_RESIDUE_FOLDER_ID), one file per lesson per
 * round, named `<series>__<slug>_residue.r<round>.tar`. Uncompressed: PNG, MP4
 * and WAV do not compress, and a plain tar streams through the system binary
 * with no Node buffering of a 150 MB archive.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const gdrive = require('./gdrive');
const deliverables = require('./deliverables');
const shell = require('./shell');

/** Named so a caller can say why nothing happened, rather than guess. */
const SKIPPED = (why) => ({ ok: false, skipped: why });

const TAR_NAME = 'residue.tar';
const MANIFEST_NAME = 'residue.json';

/** Off unless asked for: a deploy with this code must change nothing by itself. */
function enabled() {
  const v = String(process.env.RESIDUE_KEEP || '').toLowerCase();
  return v === '1' || v === 'true';
}

function residueFolderId() {
  return process.env.GDRIVE_RESIDUE_FOLDER_ID || null;
}

/**
 * Whether one path, relative to the render dir with forward slashes, is kept.
 *
 * An allow-list of exact shapes, never "everything but scratch": a new directory
 * that produce starts writing tomorrow must be argued into the keep-set, not
 * silently shipped to Drive at 150 MB a lesson.
 */
function isKept(rel) {
  if (rel === 'beats.js' || rel === 'durations.json') return true;
  if (/^(art|layers|clips)\//.test(rel)) return true;
  if (/^audio\/(vo|raw)_[^/]+\.(wav|txt|sig)$/.test(rel)) return true;
  if (rel === 'out/lesson.mp4') return true;
  if (rel === 'out/_bumpers/intro.mp4' || rel === 'out/_bumpers/outro.mp4') return true;
  return false;
}

/** Every kept file under a render dir, as sorted relative posix paths. */
function keepList(videoDir) {
  const out = [];
  const walk = (dir, relBase) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const rel = relBase ? `${relBase}/${e.name}` : e.name;
      if (e.isDirectory()) {
        // Only descend where something kept can live; frames/ and node_modules/
        // are large and nothing in them is ever kept.
        if (/^(art|layers|clips|audio|out)(\/|$)/.test(rel)) walk(path.join(dir, e.name), rel);
      } else if (isKept(rel)) {
        out.push(rel);
      }
    }
  };
  walk(videoDir, '');
  return out.sort();
}

function sha256File(file) {
  const h = crypto.createHash('sha256');
  const buf = Buffer.alloc(1 << 20);
  const fd = fs.openSync(file, 'r');
  try {
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  } finally { fs.closeSync(fd); }
  return h.digest('hex');
}

function md5File(file) {
  const h = crypto.createHash('md5');
  const buf = Buffer.alloc(1 << 20);
  const fd = fs.openSync(file, 'r');
  try {
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  } finally { fs.closeSync(fd); }
  return h.digest('hex');
}

/** The per-file record the manifest carries; the thing restore() checks against. */
function manifestFiles(videoDir, rels) {
  return rels.map((rel) => {
    const p = path.join(videoDir, rel);
    return { path: rel, bytes: fs.statSync(p).size, sha256: sha256File(p) };
  });
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function paths(series, slug) {
  const dest = deliverables.dirFor(series, slug);
  if (!dest) return null;
  return { dest, tar: path.join(dest, TAR_NAME), manifest: path.join(dest, MANIFEST_NAME) };
}

/** The manifest on the volume, or null. */
function manifest(series, slug) {
  const p = paths(series, slug);
  return p ? readJson(p.manifest) : null;
}

async function tar(args, cwd) {
  // The system binary: Debian's essential `tar` in the image, bsdtar on Windows.
  // Through shell.run so the project path (which contains a space) is never
  // re-split by a shell.
  let r;
  try {
    r = await shell.run('tar', args, { cwd, timeoutMs: 20 * 60 * 1000 });
  } catch (e) {
    throw new Error(`tar failed: ${e.message}`);
  }
  if (r && typeof r.code === 'number' && r.code !== 0) {
    throw new Error(`tar exited ${r.code}: ${String(r.stderr || '').slice(0, 300)}`);
  }
  return r;
}

/**
 * Pack the keep-set of a render dir into residue.tar on the volume.
 *
 * Idempotent on content: if every kept file's sha is what the manifest already
 * records, nothing is rewritten and the manifest -- including its Drive record --
 * is left alone. Never throws; returns { ok, unchanged?, skipped?, files, bytes }.
 */
async function pack({ series, slug, videoDir, round = null, log = () => {} }) {
  if (!series || !slug) return SKIPPED('no series/slug');
  if (!videoDir || !fs.existsSync(videoDir)) return SKIPPED('no render dir');
  const p = paths(series, slug);
  if (!p) return SKIPPED('no durable store, so there is nowhere to keep it');

  let rels;
  let files;
  try {
    rels = keepList(videoDir);
    if (!rels.length) return SKIPPED('nothing to keep');
    files = manifestFiles(videoDir, rels);
  } catch (e) {
    return SKIPPED(`could not read the render dir: ${e.message}`);
  }

  const existing = readJson(p.manifest);
  const same = existing && Array.isArray(existing.files)
    && existing.files.length === files.length
    && existing.files.every((f, i) => f.path === files[i].path && f.sha256 === files[i].sha256)
    && fs.existsSync(p.tar);
  if (same) {
    log(`residue unchanged (${files.length} files) -- not re-packed`);
    return { ok: true, unchanged: true, files: files.length, bytes: existing.tarBytes || 0, dir: p.dest };
  }

  try {
    fs.mkdirSync(p.dest, { recursive: true });
    // A list file, not argv: ~60 paths is fine either way, but a list cannot hit
    // an argv length limit as the keep-set grows.
    const listFile = path.join(p.dest, 'residue.list');
    fs.writeFileSync(listFile, rels.join('\n') + '\n');
    const part = `${p.tar}.part`;
    await tar(['-cf', part, '-C', videoDir, '-T', listFile], videoDir);
    fs.renameSync(part, p.tar);
    try { fs.unlinkSync(listFile); } catch { /* cosmetic */ }

    const tarBytes = fs.statSync(p.tar).size;
    const tarMd5 = md5File(p.tar);
    let durations = null;
    try { durations = JSON.parse(fs.readFileSync(path.join(videoDir, 'durations.json'), 'utf8')); } catch { durations = null; }
    const record = {
      series,
      slug,
      round: round == null ? (existing && existing.round) || 0 : round,
      beatsSha: deliverables.fingerprint(path.join(videoDir, 'beats.js')),
      durations,
      beatOrder: durations ? Object.keys(durations) : null,
      files,
      packedAt: new Date().toISOString(),
      tarBytes,
      tarMd5,
      // The content changed, so whatever Drive holds is the previous version.
      // Kept under `previous` so offload() can trash it once the new one verifies.
      drive: null,
      previous: existing && existing.drive ? existing.drive : (existing && existing.previous) || null,
    };
    fs.writeFileSync(p.manifest, JSON.stringify(record, null, 2));
    log(`residue packed: ${files.length} files, ${(tarBytes / 1e6).toFixed(1)}MB on the volume`);
    return { ok: true, unchanged: false, files: files.length, bytes: tarBytes, dir: p.dest };
  } catch (e) {
    log(`residue NOT packed: ${e.message}`);
    try { fs.unlinkSync(`${p.tar}.part`); } catch { /* nothing to clean */ }
    return SKIPPED(e.message);
  }
}

/**
 * Upload the volume tar to the residue folder and record it, once verified.
 *
 * Never throws. Returns { ok, skipped?, drive?, already? }. Trashes the previous
 * round's tar only AFTER the new one verified -- a lesson must always have at
 * least one proven copy of its residue, or none and a manifest that says so.
 */
async function offload({ series, slug, log = () => {} }) {
  if (!series || !slug) return SKIPPED('no series/slug');
  if (!gdrive.isConfigured()) return SKIPPED('Drive is not configured');
  const folder = residueFolderId();
  if (!folder) return SKIPPED('GDRIVE_RESIDUE_FOLDER_ID is not set, so there is nowhere to keep residue');
  const p = paths(series, slug);
  if (!p) return SKIPPED('no durable store');
  const m = readJson(p.manifest);
  if (!m) return SKIPPED('no residue manifest');
  if (!fs.existsSync(p.tar)) return SKIPPED('no residue.tar on the volume');

  // Content-aware idempotence: the record names the md5 of the tar it holds.
  if (m.drive && m.drive.fileId && m.drive.md5 === m.tarMd5) {
    return { ok: true, already: true, drive: m.drive };
  }

  const name = `${series}__${slug}_residue.r${m.round || 0}.tar`;
  let up;
  try {
    up = await gdrive.uploadFile({
      filePath: p.tar, name, parentId: folder, mimeType: 'application/x-tar', log,
    });
  } catch (e) {
    log(`residue upload failed, nothing recorded: ${e.message}`);
    return SKIPPED(`upload failed: ${e.message}`);
  }

  if (up.md5 && up.md5 !== m.tarMd5) {
    log(`REFUSING to record residue: Drive md5 ${up.md5} != local ${m.tarMd5}`);
    return SKIPPED('md5 mismatch between the local tar and Drive');
  }
  if (up.bytes && up.bytes !== m.tarBytes) {
    log(`REFUSING to record residue: Drive size ${up.bytes} != local ${m.tarBytes}`);
    return SKIPPED('size mismatch between the local tar and Drive');
  }
  if (!up.md5) log('warning: Drive returned no md5Checksum for the residue; verified on byte count alone');

  const previous = m.drive && m.drive.fileId ? m.drive : m.previous;
  m.drive = {
    fileId: up.fileId,
    name: up.name || name,
    folderId: folder,
    bytes: up.bytes || m.tarBytes,
    md5: up.md5 || m.tarMd5,
    verified: Boolean(up.md5 && up.md5 === m.tarMd5),
    savedAt: new Date().toISOString(),
  };
  m.previous = null;
  try {
    fs.writeFileSync(p.manifest, JSON.stringify(m, null, 2));
  } catch (e) {
    log(`residue uploaded but could not record it: ${e.message}`);
    return SKIPPED(`could not record the Drive copy: ${e.message}`);
  }
  log(`residue saved to Drive as ${m.drive.name}`);

  // Only now, and only ours, and only in the residue folder.
  if (previous && previous.fileId && previous.fileId !== m.drive.fileId) {
    try {
      await gdrive.trashFile(previous.fileId, { folder });
      log(`trashed the previous residue (${previous.name || previous.fileId})`);
    } catch (e) {
      log(`previous residue not trashed (${e.message}) -- harmless, it is just a spare copy`);
    }
  }
  return { ok: true, drive: m.drive };
}

/** True when every manifest file is present in the render dir with the same bytes. */
function renderDirMatches(videoDir, m) {
  if (!videoDir || !m || !Array.isArray(m.files) || !m.files.length) return false;
  try {
    for (const f of m.files) {
      const p = path.join(videoDir, f.path);
      if (!fs.existsSync(p)) return false;
      if (fs.statSync(p).size !== f.bytes) return false;
      if (sha256File(p) !== f.sha256) return false;
    }
    return true;
  } catch { return false; }
}

/**
 * Put the keep-set back into a render dir before a redo.
 *
 * Cheapest proven source first: the render dir itself (a redo minutes after the
 * review, on the same container), then the volume tar, then Drive. A tar from
 * either store is untarred only if its md5 matches the manifest. Never throws.
 *
 * @returns {Promise<{from: 'render-dir'|'volume'|'drive'|null, why?: string}>}
 */
async function restore({ series, slug, videoDir, log = () => {} }) {
  if (!series || !slug || !videoDir) return { from: null, why: 'no series/slug/videoDir' };
  const p = paths(series, slug);
  if (!p) return { from: null, why: 'no durable store' };
  const m = readJson(p.manifest);
  if (!m) return { from: null, why: 'no residue manifest' };

  if (renderDirMatches(videoDir, m)) {
    log('residue already in the render dir');
    return { from: 'render-dir' };
  }

  const untar = async (from) => {
    fs.mkdirSync(videoDir, { recursive: true });
    await tar(['-xf', p.tar, '-C', videoDir], videoDir);
    if (!renderDirMatches(videoDir, m)) {
      return { from: null, why: `untarred from ${from} but the files do not match the manifest` };
    }
    log(`residue restored from the ${from} (${m.files.length} files)`);
    return { from };
  };

  if (fs.existsSync(p.tar)) {
    let md5 = null;
    try { md5 = md5File(p.tar); } catch { md5 = null; }
    if (md5 && md5 === m.tarMd5) {
      try { return await untar('volume'); } catch (e) { log(`volume tar unusable: ${e.message}`); }
    } else {
      log('volume residue.tar does not match its manifest md5 -- ignoring it');
    }
  }

  if (m.drive && m.drive.fileId) {
    if (!gdrive.isConfigured()) return { from: null, why: 'residue is on Drive but Drive is not configured' };
    try {
      await gdrive.downloadFile({ fileId: m.drive.fileId, toPath: p.tar, log });
    } catch (e) {
      return { from: null, why: `Drive download failed: ${e.message}` };
    }
    let md5 = null;
    try { md5 = md5File(p.tar); } catch { md5 = null; }
    if (md5 !== m.tarMd5) {
      // Do not leave a wrong tar where the next restore would trust it.
      try { fs.unlinkSync(p.tar); } catch { /* ignore */ }
      return { from: null, why: `Drive copy md5 ${md5} does not match the manifest ${m.tarMd5}` };
    }
    try { return await untar('drive'); } catch (e) { return { from: null, why: `untar failed: ${e.message}` }; }
  }

  return { from: null, why: 'no residue on the volume or on Drive' };
}

/** Where the residue is, from the volume alone -- no Drive call. */
function isAvailable(series, slug) {
  const p = paths(series, slug);
  if (!p) return { volume: false, drive: false };
  const m = readJson(p.manifest);
  return {
    volume: Boolean(m && fs.existsSync(p.tar)),
    drive: Boolean(m && m.drive && m.drive.fileId),
  };
}

/**
 * Drop volume tars that have a Drive copy and belong to a lesson nobody can
 * send back any more (`done` or `failed` on the queue). The hot cache exists for
 * lessons a human may still redo; everything else is one download away.
 * Never throws. Returns { removed, freedBytes }.
 */
function evictCold(log = () => {}) {
  const r = deliverables.list();
  let freed = 0;
  const removed = [];
  if (!r || !r.items) return { removed, freedBytes: 0 };
  let queue = null;
  try { queue = require('./queue'); } catch { queue = null; }
  for (const it of r.items) {
    const [series, slug] = String(it.id).split('/');
    const p = paths(series, slug);
    if (!p || !fs.existsSync(p.tar)) continue;
    const m = readJson(p.manifest);
    if (!m || !m.drive || !m.drive.fileId) continue;
    const item = queue ? queue.get(it.id) : null;
    if (!item || !['done', 'failed'].includes(item.status)) continue;
    try {
      const size = fs.statSync(p.tar).size;
      fs.unlinkSync(p.tar);
      freed += size;
      removed.push(it.id);
    } catch (e) {
      log(`could not evict ${it.id}: ${e.message}`);
    }
  }
  if (removed.length) log(`evicted ${removed.length} cold residue tar(s), ${(freed / 1e6).toFixed(1)}MB`);
  return { removed, freedBytes: freed };
}

module.exports = {
  enabled,
  residueFolderId,
  isKept,
  keepList,
  manifest,
  pack,
  offload,
  restore,
  isAvailable,
  evictCold,
  TAR_NAME,
  MANIFEST_NAME,
};
