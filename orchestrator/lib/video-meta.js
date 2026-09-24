'use strict';
/**
 * Everything worth knowing about a finished mp4, captured as NUMBERS.
 *
 * WHY THIS EXISTS
 *
 * Until now nothing in this repo persisted a video's own attributes. `verify.js`
 * checks 1920x1080 / h264 / yuv420p / 30fps / AAC and records the *result* --
 * `{ok: true, what: '1920x1080'}` -- but never the measured values, and there is
 * no checksum of an mp4 anywhere. That was survivable while the file itself was
 * always on disk to re-measure. It stops being survivable the moment we delete
 * the local copy: "what was this video, exactly?" would become unanswerable, and
 * "did the bytes on Drive arrive intact?" would have nothing to compare against.
 *
 * So this runs BEFORE any upload and its output is a precondition of any delete.
 * `md5` in particular is not decoration -- Drive returns its own md5Checksum for
 * an uploaded file, and the two matching is the entire basis on which the local
 * copy may be reclaimed.
 *
 * Reuses verify.js's `ffmpeg -i`-and-parse-stderr approach rather than adding an
 * ffprobe dependency: ffmpeg-static is already here and already trusted, and a
 * second probing mechanism would be a second thing that can disagree.
 */

const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

/**
 * ffmpeg-static is an optional-ish dependency in some contexts (the server image
 * has it; a bare test runner may not). Resolved lazily so requiring this module
 * can never be the thing that breaks a process that only wanted the hashes.
 */
function ffmpegPath() {
  try { return require('ffmpeg-static'); } catch { return null; }
}

/** `ffmpeg -i` exits non-zero and prints the stream summary to stderr. */
function ffInfo(file) {
  const bin = ffmpegPath();
  if (!bin) return '';
  try {
    execFileSync(bin, ['-i', file], { stdio: ['ignore', 'ignore', 'pipe'] });
    return '';
  } catch (e) {
    return ((e && e.stderr) || '').toString();
  }
}

/**
 * Hash the file once, streaming, producing both digests in a single pass.
 *
 * md5 because that is what Drive gives us back and comparison needs the same
 * function; sha256 alongside it because md5 is not something to rely on as the
 * long-term identity of an artefact, and this record outlives the upload check.
 */
function hashes(filePath) {
  return new Promise((resolve, reject) => {
    const md5 = crypto.createHash('md5');
    const sha256 = crypto.createHash('sha256');
    const s = fs.createReadStream(filePath);
    s.on('error', reject);
    s.on('data', (c) => { md5.update(c); sha256.update(c); });
    s.on('end', () => resolve({ md5: md5.digest('hex'), sha256: sha256.digest('hex') }));
  });
}

function parseDuration(info) {
  const m = info.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? +(+m[1] * 3600 + +m[2] * 60 + +m[3]).toFixed(3) : null;
}

function parseVideo(info) {
  const line = (info.match(/Stream #\d+:\d+.*: Video: .*/) || [])[0] || '';
  const dims = line.match(/(\d{2,5})x(\d{2,5})/);
  const fps = line.match(/([\d.]+) fps/);
  const codec = line.match(/Video:\s*([a-zA-Z0-9_]+)/);
  // The pixel format is a bare token in the comma list, e.g. "yuv420p(tv, bt709)".
  const pix = line.match(/\b(yuv[a-z0-9]+|gbrp[a-z0-9]*|rgb[a-z0-9]*)\b/);
  return {
    width: dims ? Number(dims[1]) : null,
    height: dims ? Number(dims[2]) : null,
    fps: fps ? Number(fps[1]) : null,
    videoCodec: codec ? codec[1] : null,
    pixelFormat: pix ? pix[1] : null,
  };
}

function parseAudio(info) {
  const line = (info.match(/Stream #\d+:\d+.*: Audio: .*/) || [])[0] || '';
  const codec = line.match(/Audio:\s*([a-zA-Z0-9_]+)/);
  const rate = line.match(/(\d{4,6}) Hz/);
  const channels = /\bstereo\b/.test(line) ? 2 : (/\bmono\b/.test(line) ? 1 : null);
  return {
    audioCodec: codec ? codec[1] : null,
    audioSampleRate: rate ? Number(rate[1]) : null,
    audioChannels: channels,
  };
}

/**
 * Capture a finished video's attributes.
 *
 * Throws only if the file is unreadable -- a probe that cannot parse the stream
 * summary returns nulls for those fields rather than failing, because a missing
 * fps reading is not a reason to refuse to record the checksum. `complete` says
 * which case you got, and the offload refuses to delete anything unless the
 * hashes are present.
 */
async function capture(filePath) {
  const stat = fs.statSync(filePath);           // throws if unreadable -- correct
  const { md5, sha256 } = await hashes(filePath);
  const info = ffInfo(filePath);
  const video = parseVideo(info);
  const audio = parseAudio(info);
  const durationSeconds = parseDuration(info);

  const meta = {
    file: require('path').basename(filePath),
    bytes: stat.size,
    md5,
    sha256,
    durationSeconds,
    ...video,
    ...audio,
    probed: Boolean(info),
    capturedAt: new Date().toISOString(),
  };
  // Honest about its own completeness, so a later reader never has to guess
  // whether `fps: null` means "not 30" or "we could not look".
  meta.complete = Boolean(md5 && sha256 && durationSeconds && video.width && video.height);
  return meta;
}

module.exports = { capture, hashes, ffInfo };
