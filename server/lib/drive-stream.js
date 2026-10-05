'use strict';
/**
 * drive-stream -- serve a finished video whose bytes now live only on Drive.
 *
 * WHY THIS EXISTS
 * Once a lesson's mp4 is verified on TU's Drive we reclaim our copy. From then on
 * the course `/file` route and the single-video `/video` routes answered 200 with
 * a JSON record (`saved2drive`, `driveUrl`) instead of bytes. That broke the one
 * promise our contract made about those routes -- "GET will serve the mp4" --
 * and the LMS, which archives our bytes into its own store and plays them from
 * there, read the JSON body as a corrupt video and the course view's
 * `deliverableAvailable: false` as "never made". The instructor saw: "There is
 * no video to preview -- this lesson stopped before it was made." The video was
 * finished, paid for, and sitting on a private Shared Drive nobody could open.
 *
 * So: the bytes come back from Drive through us, with Range, as if they had
 * never left. The JSON record is still available to a caller that asks for it
 * (`Accept: application/json` or `?format=json`). Nothing is buffered: the Drive
 * response is piped to the client with backpressure, and a client that goes
 * away aborts the Drive fetch.
 *
 * One function, used by every route that can meet an offloaded video, so the
 * three routes cannot drift apart again.
 */

const { pipeline } = require('stream');

/** The caller wants the record, not the bytes. */
function wantsJson(req) {
  if (req.query && String(req.query.format || '').toLowerCase() === 'json') return true;
  const accept = String(req.headers.accept || '').toLowerCase();
  return accept.includes('application/json') && !accept.includes('video/');
}

/**
 * Only a single `bytes=a-b` range is forwarded. Drive would answer a multi-range
 * request with a multipart body, which the local path never produced; serving
 * the whole file is the conservative answer.
 */
function singleRange(header) {
  const h = String(header || '').trim();
  if (!h) return null;
  if (h.includes(',')) return null;
  return /^bytes=\d*-\d*$/.test(h) ? h : null;
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{copy:object, extra?:object, filename?:string, log?:Function}} o
 *   copy      the Drive record from deliverables.driveCopy()
 *   extra     fields added to the JSON forms (status, blockedBy)
 *   filename  for Content-Disposition
 */
async function serveDriveCopy(req, res, { copy, extra = {}, filename = 'video.mp4', log = () => {} }) {
  if (!copy || !copy.driveFileId) {
    return res.status(404).json({ error: 'no_deliverable', message: 'No Drive copy recorded for this video.', ...extra });
  }

  if (wantsJson(req)) {
    return res.status(200).json({ ...copy, ...extra });
  }

  // A HEAD must not pull the file from Drive only to discard it. Everything a
  // HEAD needs was measured before the local copy was removed.
  if (req.method === 'HEAD') {
    res.status(200);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    if (copy.bytes) res.setHeader('Content-Length', String(copy.bytes));
    res.setHeader('X-Served-From', 'drive');
    return res.end();
  }

  const range = singleRange(req.headers.range);
  const ac = new AbortController();
  const onClose = () => ac.abort();
  req.on('close', onClose);

  let up;
  try {
    // Lazy, so a test can replace the function on the shared module object.
    const gdrive = require('../../orchestrator/lib/gdrive');
    up = await gdrive.openFileStream({ fileId: copy.driveFileId, range, signal: ac.signal });
  } catch (e) {
    req.off('close', onClose);
    if (ac.signal.aborted) return res.destroy();
    log(`drive stream for ${copy.driveFileId} failed before headers: ${e.message}`);
    // 503, not 404: the video exists. The record rides along so a caller can
    // still show the link and the id to a person who can open Drive.
    const { message: recordMessage, ...record } = copy;
    return res.status(503).json({
      ...record,
      ...extra,
      error: 'drive_unavailable',
      driveStatus: Number.isFinite(e.status) ? e.status : null,
      message: `The video is on Drive but could not be fetched from there right now (${e.message.slice(0, 200)}). Retry later.`,
      ...(recordMessage ? { recordMessage } : {}),
    });
  }

  res.status(up.status);
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=0');
  res.setHeader('Content-Disposition', `inline; filename="${String(filename).replace(/"/g, '')}"`);
  res.setHeader('X-Served-From', 'drive');
  const len = up.headers['content-length'] || (up.status === 200 && copy.bytes ? String(copy.bytes) : null);
  if (len) res.setHeader('Content-Length', len);
  if (up.headers['content-range']) res.setHeader('Content-Range', up.headers['content-range']);

  if (up.status === 416 || !up.body) {
    req.off('close', onClose);
    return res.end();
  }

  return pipeline(up.body, res, (err) => {
    req.off('close', onClose);
    if (!err) return;
    if (ac.signal.aborted) return; // the client left; nothing to report
    log(`drive stream for ${copy.driveFileId} failed mid-body: ${err.message}`);
    // Headers are out. The only honest thing left is to cut the connection so
    // the client sees a short body, not a complete-looking wrong one.
    try { res.destroy(err); } catch { /* already gone */ }
  });
}

module.exports = { serveDriveCopy, wantsJson, singleRange };
