'use strict';
/**
 * YouTube Data API v3 client -- ILHAM plan 2.1.
 *
 * Deliberately dependency-free (plain fetch, no googleapis). The pipeline already
 * broke once on Windows because of how a dependency was spawned; a ~50MB SDK for
 * two HTTP calls is not worth another moving part.
 *
 * Auth model: an "installed app" OAuth2 client. A human does the consent ONCE via
 * `node orchestrator/youtube-auth.js`, which stores a refresh token. From then on
 * every run mints its own short-lived access token with no human present -- which
 * is what makes unattended operation (plan 6.1) possible.
 *
 * Uploads are RESUMABLE. A 15MB lesson over a flaky connection would otherwise
 * restart from zero, and a 90-minute render deserves better than that.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');
const { PATHS } = require('./paths');

const TOKEN_PATH = path.join(PATHS.orchestrator, '.credentials', 'youtube-token.json');
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// Upload-only. Narrowest scope that can publish a video -- it cannot read the
// channel's existing content, delete anything, or touch the account otherwise.
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

// '27' is YouTube's "Education" category.
const CATEGORY_EDUCATION = '27';

class YouTubeAuthError extends Error {}

// --- credential storage ------------------------------------------------------

function clientCredentials() {
  const id = process.env.YOUTUBE_CLIENT_ID;
  const secret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new YouTubeAuthError(
      'YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET are not set.\n' +
      '  Create an OAuth client (type: Desktop app) at\n' +
      '  https://console.cloud.google.com/apis/credentials with the YouTube Data\n' +
      '  API v3 enabled, then put both values in .env.'
    );
  }
  return { id, secret };
}

function loadToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new YouTubeAuthError(
      `Not authorised yet -- no token at ${path.relative(PATHS.repoRoot, TOKEN_PATH)}.\n` +
      '  Run once:  node orchestrator/youtube-auth.js'
    );
  }
  const t = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  if (!t.refresh_token) {
    throw new YouTubeAuthError(
      'Stored token has no refresh_token, so it cannot be renewed unattended.\n' +
      '  Re-run:  node orchestrator/youtube-auth.js --force'
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
  try { loadToken(); return true; } catch { return false; }
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
    throw new YouTubeAuthError(
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
    throw new YouTubeAuthError(
      'Google returned no refresh_token. Revoke prior access for this app at\n' +
      '  https://myaccount.google.com/permissions  and authorise again.'
    );
  }
  return saveToken({
    refresh_token: tok.refresh_token,
    scope: tok.scope,
    obtained_at: new Date().toISOString(),
  });
}

/** Mint a short-lived access token. No human involved. */
async function accessToken() {
  const { id, secret } = clientCredentials();
  const { refresh_token } = loadToken();
  const tok = await postForm(OAUTH_TOKEN_URL, {
    refresh_token, client_id: id, client_secret: secret, grant_type: 'refresh_token',
  });
  if (!tok.access_token) throw new YouTubeAuthError('Refresh succeeded but returned no access_token');
  return tok.access_token;
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
 * Upload a video file and return its live URL.
 *
 * Defaults to `unlisted` on purpose (plan 2.3): a video is born provisional and
 * a human promotes it later, so an automated run can never make something public
 * that nobody has watched.
 *
 * @returns {Promise<{videoId:string,url:string,privacyStatus:string,bytes:number}>}
 */
async function uploadVideo({
  filePath,
  title,
  description = '',
  tags = [],
  privacyStatus = 'unlisted',
  categoryId = CATEGORY_EDUCATION,
  madeForKids = false,
  log = () => {},
  maxAttempts = 4,
}) {
  if (!fs.existsSync(filePath)) throw new Error(`No such file to upload: ${filePath}`);
  if (!title || !String(title).trim()) throw new Error('A YouTube upload needs a title');
  if (!['unlisted', 'private', 'public'].includes(privacyStatus)) {
    throw new Error(`Invalid privacyStatus '${privacyStatus}'`);
  }

  const size = fs.statSync(filePath).size;
  const token = await accessToken();

  // YouTube truncates titles over 100 chars; do it here so the stored URL and
  // the reported title cannot disagree.
  const safeTitle = String(title).slice(0, 100);

  const metadata = {
    snippet: { title: safeTitle, description, tags, categoryId },
    status: { privacyStatus, selfDeclaredMadeForKids: madeForKids },
  };

  log(`opening resumable session (${(size / 1048576).toFixed(1)} MB, ${privacyStatus})`);
  const init = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-upload-content-length': String(size),
        'x-upload-content-type': 'video/mp4',
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!init.ok) {
    const body = await init.text();
    throw new Error(`Could not open upload session (HTTP ${init.status}): ${body.slice(0, 300)}`);
  }
  const sessionUrl = init.headers.get('location');
  if (!sessionUrl) throw new Error('Upload session opened but Google returned no Location header');

  let offset = 0;
  let lastPct = -1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await putBytes(sessionUrl, filePath, size, offset, (sent) => {
      const pct = Math.floor((sent / size) * 100);
      if (pct >= lastPct + 25) { lastPct = pct; log(`  ${pct}% uploaded`); }
    });

    if (res.status === 200 || res.status === 201) {
      const parsed = JSON.parse(res.body);
      log(`upload complete -- video id ${parsed.id}`);
      return {
        videoId: parsed.id,
        url: `https://youtu.be/${parsed.id}`,
        privacyStatus: (parsed.status && parsed.status.privacyStatus) || privacyStatus,
        bytes: size,
      };
    }

    // 5xx and 308 are resumable; 4xx is not (bad metadata, quota, revoked token).
    const resumable = res.status === 308 || (res.status >= 500 && res.status < 600);
    if (!resumable) {
      throw new Error(`Upload failed (HTTP ${res.status}): ${String(res.body).slice(0, 300)}`);
    }
    if (attempt === maxAttempts) {
      throw new Error(`Upload still incomplete after ${maxAttempts} attempts (last HTTP ${res.status})`);
    }

    offset = await committedOffset(sessionUrl, size);
    log(`interrupted (HTTP ${res.status}); resuming from byte ${offset} of ${size}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }

  throw new Error('unreachable');
}

module.exports = {
  uploadVideo,
  accessToken,
  consentUrl,
  exchangeCode,
  isAuthorised,
  loadToken,
  saveToken,
  clientCredentials,
  YouTubeAuthError,
  SCOPE,
  TOKEN_PATH,
  CATEGORY_EDUCATION,
};
