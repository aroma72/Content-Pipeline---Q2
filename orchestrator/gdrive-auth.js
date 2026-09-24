#!/usr/bin/env node
'use strict';
/**
 * One-time Google Drive authorisation for the deliverable offload.
 *
 *   node orchestrator/gdrive-auth.js                 authorise (or report existing)
 *   node orchestrator/gdrive-auth.js --force         re-authorise, replacing the token
 *   node orchestrator/gdrive-auth.js --check         say whether it works, and probe the folder
 *   node orchestrator/gdrive-auth.js --print-token   reveal the refresh token for Railway
 *
 * Run ONCE, by a human, in a terminal with a browser available, and **sign in as
 * the Taleemabad University account** -- the same account the YouTube credentials
 * now belong to. Whichever account approves this owns the uploaded files.
 *
 * This deliberately does NOT reuse YOUTUBE_REFRESH_TOKEN. A Google refresh token
 * is bound to the scopes it was consented with, and that one carries
 * `youtube.upload` alone -- it can never write to Drive. Minting a separate token
 * also keeps publishing and Drive in separate failure domains.
 *
 * Mirrors youtube-auth.js, including its hard-won loopback and browser-launch
 * handling. If you fix a bug here, check whether it is a bug there too.
 */

require('./lib/env').loadDotenv();

const fs = require('fs');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const path = require('path');
const gd = require('./lib/gdrive');
const { PATHS } = require('./lib/paths');

function rel(p) { return path.relative(PATHS.repoRoot, p); }

/** Does the configured folder actually accept uploads from this account? */
async function reportFolder() {
  const id = gd.folderId();
  if (!id) {
    console.log('\nGDRIVE_FOLDER_ID is not set — there is nowhere to upload to yet.');
    return 1;
  }
  const probe = await gd.probeFolder(id);
  if (probe.ok === true) {
    console.log(`\nfolder OK — "${probe.name}"${probe.sharedDrive ? ' (on a Shared Drive)' : ''}, writable by this account`);
    return 0;
  }
  if (probe.ok === null) {
    // Not a failure. Under drive.file a folder this client did not create is
    // invisible by design, and saying "not found" here would send someone to
    // re-share a folder that is already shared correctly.
    console.log(`\nfolder not visible under the drive.file scope — this is EXPECTED and not an error.`);
    console.log('  Only a real upload can settle whether it is writable. Run:');
    console.log('      node scripts/offload-deliverables-to-drive.js --yes --limit 1');
    return 0;
  }
  console.log(`\nfolder NOT usable: ${probe.why}`);
  return 1;
}

async function check() {
  if (!gd.isAuthorised()) {
    console.log('not authorised — run: node orchestrator/gdrive-auth.js');
    return 1;
  }
  try {
    await gd.accessToken();   // throws with a precise message if the scope is wrong
    const t = gd.loadToken();
    console.log(`authorised — credential from ${t.obtained_at === 'env:GDRIVE_REFRESH_TOKEN'
      ? 'GDRIVE_REFRESH_TOKEN' : `${rel(gd.TOKEN_PATH)} (obtained ${t.obtained_at})`}`);
    console.log(`a fresh access token was just minted, and it carries ${gd.SCOPE}`);
    return reportFolder();
  } catch (e) {
    console.log(`token exists but is not usable:\n${e.message}`);
    console.log('\nre-run with --force to authorise again');
    return 1;
  }
}

async function authorise() {
  gd.clientCredentials(); // fail fast and loudly if the OAuth client isn't configured

  // `state` defends against a stray request to the loopback port being treated
  // as our callback.
  const state = crypto.randomBytes(16).toString('hex');

  const saved = await new Promise((resolve, reject) => {
    // Captured once at listen time. Asking server.address() inside the handler is
    // a trap: after server.close() it returns null, and reading .port off null
    // threw away a successful authorisation once already (see youtube-auth.js).
    let redirectUri = null;

    const server = http.createServer(async (req, res) => {
      if (!redirectUri) { res.writeHead(503).end('not listening yet'); return; }

      const u = new URL(req.url, redirectUri);
      if (u.pathname !== '/oauth2callback') { res.writeHead(404).end('not found'); return; }

      const err = u.searchParams.get('error');
      const gotCode = u.searchParams.get('code');
      const gotState = u.searchParams.get('state');

      const reply = (msg) => {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><meta charset="utf-8">
<body style="font:16px/1.6 system-ui;max-width:34rem;margin:4rem auto;color:#2b2b2b">
<h2>${msg}</h2><p>You can close this tab and return to the terminal.</p></body>`);
      };

      if (err) { reply(`Authorisation denied: ${err}`); server.close(); reject(new Error(`Google returned: ${err}`)); return; }
      if (gotState !== state) { reply('State mismatch — ignored.'); return; }
      if (!gotCode) { reply('No authorisation code received.'); return; }

      // Exchange and SAVE before telling the browser it worked. The page must not
      // claim more than is true.
      try {
        const out = await gd.exchangeCode(gotCode, redirectUri);
        reply('Authorised. Drive offload is now enabled.');
        server.close();
        resolve(out);
      } catch (e) {
        reply(`Authorisation failed: ${e.message}`);
        server.close();
        reject(e);
      }
    });

    server.on('error', reject);
    // Port 0 = let the OS pick a free one. Google accepts any port for loopback
    // clients, so http://127.0.0.1 in the client's redirect URIs covers this.
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
      const url = gd.consentUrl(redirectUri, state);

      // Hand the URL to the browser via a LOCAL HTML FILE, never as a command-line
      // argument or something to copy out of a terminal. On Windows, cmd.exe eats
      // %3A%2F%2F in the scope as variable expansion and truncates at the first &,
      // both of which look like a broken OAuth client and are really a mangled
      // string. A file:// page with the URL in an href sidesteps all of it.
      const htmlPath = path.join(path.dirname(gd.TOKEN_PATH), 'authorize-drive.html');
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
      fs.writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8">
<title>Authorise Drive upload</title>
<meta http-equiv="refresh" content="1;url=${esc(url)}">
<body style="font:16px/1.6 system-ui;max-width:36rem;margin:4rem auto;color:#2b2b2b">
<h2>Redirecting you to Google…</h2>
<p>If nothing happens, click here:</p>
<p><a href="${esc(url)}">Approve Drive upload access</a></p>
<p style="color:#b23"><b>Sign in as the Taleemabad University account</b> — not a personal one.
Whichever account you pick will own every uploaded video.</p>
<p style="color:#777">If you see &ldquo;Google hasn&rsquo;t verified this app&rdquo;, choose
<b>Advanced</b> &rarr; <b>Go to &hellip; (unsafe)</b> &mdash; it is your own app.</p>
</body>`);

      // A plain-text copy too, for the case where the file has to be opened by hand.
      fs.writeFileSync(path.join(path.dirname(htmlPath), 'authorize-drive-url.txt'), url + '\n');

      console.log(`\nOpening your browser via:\n  ${htmlPath}\n`);
      console.log('SIGN IN AS THE TALEEMABAD UNIVERSITY ACCOUNT — it will own the uploads.');
      console.log('If it does not open, open that .html file yourself and click the link.');
      console.log('(Do not retype the URL by hand — it contains % and & that shells mangle.)\n');
      console.log(`(waiting for the callback on 127.0.0.1:${port} — Ctrl+C to abort)`);

      // Opening a FILE PATH is safe: no % or & in it, so no shell can corrupt it.
      const { spawn } = require('child_process');
      try {
        if (process.platform === 'win32') {
          spawn('rundll32', ['url.dll,FileProtocolHandler', htmlPath], { detached: true, stdio: 'ignore', shell: false }).unref();
        } else if (process.platform === 'darwin') {
          spawn('open', [htmlPath], { detached: true, stdio: 'ignore', shell: false }).unref();
        } else {
          spawn('xdg-open', [htmlPath], { detached: true, stdio: 'ignore', shell: false }).unref();
        }
      } catch { /* the printed file path is the fallback */ }
    });

    // 15 minutes, not 5: the operator is often still hunting for the right Google
    // account when the window opens, and a premature timeout means doing it again.
    const WAIT_MS = 15 * 60 * 1000;
    setTimeout(() => {
      server.close();
      reject(new Error(
        'timed out after 15 minutes waiting for consent.\n' +
        '  Nothing was saved. Re-run when you are ready to click through the browser.'
      ));
    }, WAIT_MS);
  });

  console.log(`\nrefresh token saved to ${rel(saved.path)}`);
  console.log('This file is a long-lived credential. It is gitignored — keep it that way.');
  console.log('\nTo run this on Railway, set GDRIVE_REFRESH_TOKEN. Reveal the value with:');
  console.log('    node orchestrator/gdrive-auth.js --print-token');
  console.log('(not printed by default, so it does not end up in terminal scrollback or CI logs)');
  return check();
}

/**
 * Deliberately behind a flag. The token is needed once, to paste into Railway --
 * but printing it on every run would scatter a long-lived credential through
 * scrollback, screen shares and any CI log that ever runs --check.
 */
function printToken() {
  try {
    const t = gd.loadToken();
    if (t.obtained_at === 'env:GDRIVE_REFRESH_TOKEN') {
      console.log('GDRIVE_REFRESH_TOKEN is already set in this environment; nothing to reveal.');
      return 0;
    }
    console.log('\nPaste this into Railway as GDRIVE_REFRESH_TOKEN, then clear your terminal:\n');
    console.log(t.refresh_token);
    console.log('\nAlso set GDRIVE_FOLDER_ID to the target Drive folder id.');
    return 0;
  } catch (e) {
    console.log(e.message);
    return 1;
  }
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--print-token')) { process.exitCode = printToken(); return; }
  if (args.includes('--check')) { process.exitCode = await check(); return; }
  if (gd.isAuthorised() && !args.includes('--force')) {
    console.log('already authorised; use --force to replace the stored token\n');
    process.exitCode = await check();
    return;
  }
  process.exitCode = await authorise();
})().catch((e) => {
  console.error(`\n${e.message}\n`);
  process.exitCode = 1;
});
