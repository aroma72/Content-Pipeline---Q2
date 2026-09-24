'use strict';
/**
 * Google Drive v3 client -- the offload destination for finished lessons.
 *
 * Deliberately dependency-free (plain fetch + https), for the same reason
 * `youtube.js` is: a ~50MB SDK for three HTTP calls is another moving part, and
 * this pipeline has already been broken once by how a dependency was spawned on
 * Windows.
 *
 * WHY THIS EXISTS
 *
 * `deliverables.js` copies every finished `<slug>_final.mp4` onto the Railway
 * volume and nothing ever removes it -- the only exit is a human calling
 * `DELETE .../file`, which in practice nobody does. A 50GB volume therefore fills
 * monotonically, and a full Railway volume forces an offline resize that restarts
 * the service, possibly mid-render. Drive is where the bytes go so the volume can
 * be reclaimed without ever being the only copy.
 *
 * AUTH: A SECOND TOKEN, NOT A WIDER ONE
 *
 * A Google refresh token is bound to the scopes it was consented with. The
 * existing YOUTUBE_REFRESH_TOKEN is scoped to `youtube.upload` and nothing else,
 * so it cannot write to Drive -- verified against Google, not assumed.
 *
 * This reuses the same OAuth *client* (YOUTUBE_CLIENT_ID / _SECRET: same Google
 * Cloud project, same Taleemabad University account) but mints its own
 * GDRIVE_REFRESH_TOKEN scoped to `drive.file` alone. Re-consenting a single token
 * for both scopes was the alternative and was rejected: it would put publishing
 * and Drive in one failure domain, so a botched Drive consent would take YouTube
 * uploads down with it, and that path already works.
 *
 * The ~40 lines of token-refresh below are knowingly near-duplicated from
 * `youtube.js`. Refactoring shared OAuth out from under a working, paid publish
 * path to save 40 lines is the wrong trade. If you change one, read the other.
 *
 * SCOPE: `drive.file` grants access ONLY to files this client itself creates. It
 * is structurally incapable of reading, moving or deleting anything else on the
 * Drive, which is what makes an automated deleter safe to run against a shared
 * company Drive at all.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL, URLSearchParams } = require('url');
const { PATHS } = require('./paths');

const TOKEN_PATH = path.join(PATHS.orchestrator, '.credentials', 'gdrive-token.json');
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// Per-file access. Cannot enumerate or touch files it did not create.
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

// What we ask Drive to return about a file. `md5Checksum` is the one that matters:
// it is how we prove the upload is byte-identical before deleting a local copy.
const FILE_FIELDS = 'id,name,size,md5Checksum,webViewLink,mimeType,createdTime,parents';

class GDriveAuthError extends Error {}

// --- credential storage ------------------------------------------------------

/**
 * The OAuth client. Falls back to the YouTube pair on purpose -- they are the
 * same Google Cloud project and the same account, so requiring a second copy of
 * the same two values would just be two more things to keep in sync.
 */
function clientCredentials() {
  const id = process.env.GDRIVE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;
  const secret = process.env.GDRIVE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new GDriveAuthError(
      'No OAuth client for Drive.\n' +
      '  Set GDRIVE_CLIENT_ID / GDRIVE_CLIENT_SECRET, or rely on the existing\n' +
      '  YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET (same project, same account).'
    );
  }
  return { id, secret };
}

function loadToken() {
  // The deploy container has no .credentials directory -- that path is gitignored
  // and excluded from the image -- so on Railway the env var is the only route.
  const fromEnv = (process.env.GDRIVE_REFRESH_TOKEN || '').trim();
  if (fromEnv) return { refresh_token: fromEnv, obtained_at: 'env:GDRIVE_REFRESH_TOKEN' };

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new GDriveAuthError(
      `Drive is not authorised -- no token at ${path.relative(PATHS.repoRoot, TOKEN_PATH)}, ` +
      'and GDRIVE_REFRESH_TOKEN is not set.\n' +
      '  Run once, signed in as the Taleemabad University account:\n' +
      '      node orchestrator/gdrive-auth.js\n' +
      '  On a server, set GDRIVE_REFRESH_TOKEN instead.'
    );
  }
  const t = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  if (!t.refresh_token) {
    throw new GDriveAuthError(
      'Stored Drive token has no refresh_token, so it cannot be renewed unattended.\n' +
      '  Re-run:  node orchestrator/gdrive-auth.js --force'
    );
  }
  return t;
}

function saveToken(tok) {
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  // A refresh token is a long-lived credential; keep it owner-readable only.
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tok, null, 2), { mode: 0o600 });
  return TOKEN_PATH;
}

function isAuthorised() {
  try { loadToken(); clientCredentials(); return true; } catch { return false; }
}

/** The target folder, or null. Kept here so every caller reads the same variable. */
function folderId() {
  return (process.env.GDRIVE_FOLDER_ID || '').trim() || null;
}

/** Everything needed to actually offload: credentials AND somewhere to put it. */
function isConfigured() {
  return Boolean(isAuthorised() && folderId());
}

// --- OAuth2 ------------------------------------------------------------------

function consentUrl(redirectUri, state) {
  const { id } = clientCredentials();
  const u = new URL(OAUTH_AUTH_URL);
  u.searchParams.set('client_id', id);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPE);
  // Required to be given a refresh_token at all; without it the grant expires in
  // an hour and unattended operation is impossible.
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  if (state) u.searchParams.set('state', state);
  return u.toString();
}

async function postForm(url, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GDriveAuthError(
      `Google rejected the token request (HTTP ${res.status}): ` +
      `${body.error || '?'} ${body.error_description || ''}`.trim()
    );
  }
  return body;
}

async function exchangeCode(code, redirectUri) {
  const { id, secret } = clientCredentials();
  const tok = await postForm(OAUTH_TOKEN_URL, {
    code, client_id: id, client_secret: secret,
    redirect_uri: redirectUri, grant_type: 'authorization_code',
  });
  if (!tok.refresh_token) {
    throw new GDriveAuthError(
      'Google returned no refresh_token. Revoke prior access for this app at\n' +
      '  https://myaccount.google.com/permissions  and authorise again.'
    );
  }
  return {
    path: saveToken({
      refresh_token: tok.refresh_token,
      scope: tok.scope,
      obtained_at: new Date().toISOString(),
    }),
    refresh_token: tok.refresh_token,
    scope: tok.scope,
  };
}

/**
 * Mint a short-lived access token. No human involved.
 *
 * Returns the granted scope alongside it because a token that refreshes happily
 * but lacks `drive.file` is the single most likely misconfiguration here -- that
 * is exactly the state the YouTube token is in -- and it would otherwise only
 * surface as a confusing 403 partway through an upload.
 */
async function accessToken() {
  const { id, secret } = clientCredentials();
  const { refresh_token } = loadToken();
  const tok = await postForm(OAUTH_TOKEN_URL, {
    refresh_token, client_id: id, client_secret: secret, grant_type: 'refresh_token',
  });
  if (!tok.access_token) throw new GDriveAuthError('Refresh succeeded but returned no access_token');
  if (tok.scope && !String(tok.scope).split(/\s+/).includes(SCOPE)) {
    throw new GDriveAuthError(
      `This refresh token is not scoped for Drive.\n` +
      `  granted: ${tok.scope}\n  needed:  ${SCOPE}\n` +
      '  A refresh token is bound to the scopes it was consented with, so this one\n' +
      '  can never write to Drive. Re-run: node orchestrator/gdrive-auth.js'
    );
  }
  return tok.access_token;
}

// --- helpers -----------------------------------------------------------------

/**
 * Every Drive call carries supportsAllDrives=true.
 *
 * The target folder lives on a Shared Drive, and without this flag the API
 * pretends Shared Drive items do not exist -- a 404 on a folder that is plainly
 * there, which is a genuinely baffling half-hour if you have not met it before.
 */
function url(base, params = {}) {
  const u = new URL(base);
  u.searchParams.set('supportsAllDrives', 'true');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

async function apiGet(pathname, params) {
  const token = await accessToken();
  const res = await fetch(url(`${API}${pathname}`, params), {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (body.error && body.error.message) || `HTTP ${res.status}`;
    const e = new Error(`Drive GET ${pathname} failed: ${err}`);
    e.status = res.status;
    throw e;
  }
  return body;
}

/** Metadata for a file we created. Used to verify an upload landed intact. */
function getFile(fileId, fields = FILE_FIELDS) {
  return apiGet(`/files/${encodeURIComponent(fileId)}`, { fields });
}

/**
 * Confirm the configured folder is writable by this token, without writing.
 *
 * Under `drive.file` a pre-existing folder is normally invisible, so a 404 here
 * is NOT proof that the folder is missing or that access is wrong -- it is the
 * expected answer for a folder this client did not create. Said plainly in the
 * return value rather than left for the caller to misread.
 */
async function probeFolder(id = folderId()) {
  if (!id) return { ok: false, why: 'GDRIVE_FOLDER_ID is not set' };
  try {
    const f = await getFile(id, 'id,name,mimeType,driveId,capabilities/canAddChildren');
    return {
      ok: Boolean(f.capabilities && f.capabilities.canAddChildren),
      visible: true,
      name: f.name,
      sharedDrive: Boolean(f.driveId),
      why: (f.capabilities && f.capabilities.canAddChildren)
        ? null : 'this account cannot add children to that folder',
    };
  } catch (e) {
    if (e.status === 404) {
      return {
        ok: null,
        visible: false,
        why: 'the folder is not visible under the drive.file scope, which is normal for a '
          + 'folder this client did not create. Only a real upload can settle it.',
      };
    }
    return { ok: false, visible: false, why: e.message };
  }
}

// --- upload ------------------------------------------------------------------

/**
 * PUT the file bytes to a resumable session, retrying from the byte the server
 * confirms rather than from zero.
 */
function putBytes(sessionUrl, filePath, size, offset, onProgress) {
  return new Promise((resolve, reject) => {
    const u = new URL(sessionUrl);
    const req = https.request({
      method: 'PUT',
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'content-length': String(size - offset),
        'content-range': `bytes ${offset}-${size - 1}/${size}`,
      },
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);

    let sent = offset;
    const stream = fs.createReadStream(filePath, { start: offset });
    stream.on('data', (chunk) => {
      sent += chunk.length;
      if (onProgress) onProgress(sent, size);
    });
    stream.on('error', reject);
    stream.pipe(req);
  });
}

/** Ask the server how many bytes it actually has, so a retry resumes correctly. */
async function committedOffset(sessionUrl, size) {
  const res = await fetch(sessionUrl, {
    method: 'PUT',
    headers: { 'content-length': '0', 'content-range': `bytes */${size}` },
  });
  if (res.status === 200 || res.status === 201) return size;   // already complete
  const range = res.headers.get('range');                      // e.g. "bytes=0-1234"
  if (!range) return 0;
  const end = Number(range.split('-')[1]);
  return Number.isFinite(end) ? end + 1 : 0;
}

/**
 * Upload a file into the target folder and return what Drive says about it.
 *
 * The returned `md5Checksum` is the whole point: it is Drive's own hash of the
 * bytes it stored, and comparing it to a hash of the local file is the only
 * honest basis on which the local copy may then be deleted.
 *
 * @returns {Promise<{fileId,name,bytes,md5,webViewLink}>}
 */
async function uploadFile({
  filePath,
  name,
  parentId = folderId(),
  mimeType = 'video/mp4',
  log = () => {},
  maxAttempts = 4,
}) {
  if (!fs.existsSync(filePath)) throw new Error(`No such file to upload: ${filePath}`);
  if (!parentId) throw new GDriveAuthError('GDRIVE_FOLDER_ID is not set, so there is nowhere to upload to');

  const size = fs.statSync(filePath).size;
  if (size === 0) throw new Error(`Refusing to upload an empty file: ${filePath}`);

  const token = await accessToken();
  const safeName = String(name || path.basename(filePath));

  log(`opening resumable session (${(size / 1048576).toFixed(1)} MB -> ${safeName})`);
  const init = await fetch(
    url(UPLOAD_API, { uploadType: 'resumable', fields: FILE_FIELDS }),
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-upload-content-length': String(size),
        'x-upload-content-type': mimeType,
      },
      body: JSON.stringify({ name: safeName, parents: [parentId], mimeType }),
    }
  );
  if (!init.ok) {
    const body = await init.text();
    throw new Error(`Could not open Drive upload session (HTTP ${init.status}): ${body.slice(0, 400)}`);
  }
  const sessionUrl = init.headers.get('location');
  if (!sessionUrl) throw new Error('Drive upload session opened but returned no Location header');

  let offset = 0;
  let lastPct = -1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await putBytes(sessionUrl, filePath, size, offset, (sent) => {
      const pct = Math.floor((sent / size) * 100);
      if (pct >= lastPct + 25) { lastPct = pct; log(`  ${pct}% uploaded`); }
    });

    if (res.status === 200 || res.status === 201) {
      let parsed;
      try { parsed = JSON.parse(res.body); } catch {
        throw new Error(`Drive accepted the upload but returned unparseable JSON: ${String(res.body).slice(0, 200)}`);
      }
      log(`upload complete -- drive file ${parsed.id}`);
      return {
        fileId: parsed.id,
        name: parsed.name,
        // Drive reports size as a string; the caller compares numbers.
        bytes: Number(parsed.size != null ? parsed.size : size),
        md5: parsed.md5Checksum || null,
        webViewLink: parsed.webViewLink
          || `https://drive.google.com/file/d/${parsed.id}/view`,
      };
    }

    // 5xx and 308 are resumable; 4xx is not (bad parent, quota, revoked token).
    const resumable = res.status === 308 || (res.status >= 500 && res.status < 600);
    if (!resumable) {
      throw new Error(`Drive upload failed (HTTP ${res.status}): ${String(res.body).slice(0, 400)}`);
    }
    if (attempt === maxAttempts) {
      throw new Error(`Drive upload still incomplete after ${maxAttempts} attempts (last HTTP ${res.status})`);
    }

    offset = await committedOffset(sessionUrl, size);
    log(`interrupted (HTTP ${res.status}); resuming from byte ${offset} of ${size}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }

  throw new Error('unreachable');
}

/**
 * Stream a file back down from Drive.
 *
 * Needed because the YouTube `upload` stage runs AFTER the human review gate, by
 * which time the local mp4 has been reclaimed. Without this, offloading would
 * quietly break publishing for every course lesson.
 *
 * Writes to a temp path and renames on success, so an interrupted download can
 * never be mistaken for a complete file.
 */
async function downloadFile({ fileId, toPath, log = () => {} }) {
  const token = await accessToken();
  const res = await fetch(url(`${API}/files/${encodeURIComponent(fileId)}`, { alt: 'media' }), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive download of ${fileId} failed (HTTP ${res.status}): ${body.slice(0, 300)}`);
  }

  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  const tmp = `${toPath}.part`;
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(tmp);
    out.on('error', reject);
    out.on('finish', resolve);
    // Node's fetch gives a web ReadableStream; Readable.fromWeb bridges it.
    require('stream').Readable.fromWeb(res.body).on('error', reject).pipe(out);
  });
  fs.renameSync(tmp, toPath);

  const bytes = fs.statSync(toPath).size;
  log(`downloaded ${fileId} (${(bytes / 1048576).toFixed(1)} MB)`);
  return { path: toPath, bytes };
}

module.exports = {
  uploadFile,
  downloadFile,
  getFile,
  probeFolder,
  accessToken,
  consentUrl,
  exchangeCode,
  isAuthorised,
  isConfigured,
  folderId,
  loadToken,
  saveToken,
  clientCredentials,
  GDriveAuthError,
  SCOPE,
  TOKEN_PATH,
  FILE_FIELDS,
};
