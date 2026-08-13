#!/usr/bin/env node
'use strict';
/**
 * One-time YouTube authorisation -- ILHAM plan 2.1.
 *
 *   node orchestrator/youtube-auth.js            authorise (or report existing)
 *   node orchestrator/youtube-auth.js --force    re-authorise, replacing the token
 *   node orchestrator/youtube-auth.js --check    just say whether it works
 *
 * Run this ONCE, by a human, in a terminal with a browser available. It stores a
 * refresh token so every later run publishes with no human present.
 *
 * Uses a loopback redirect (127.0.0.1 on an ephemeral port), which is what Google
 * requires for "Desktop app" clients -- no public callback URL needed.
 */

require('./lib/env').loadDotenv();

const fs = require('fs');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const path = require('path');
const yt = require('./lib/youtube');
const { PATHS } = require('./lib/paths');

function rel(p) { return path.relative(PATHS.repoRoot, p); }

async function check() {
  if (!yt.isAuthorised()) {
    console.log('not authorised — run: node orchestrator/youtube-auth.js');
    return 1;
  }
  try {
    await yt.accessToken();
    const t = yt.loadToken();
    console.log(`authorised — token at ${rel(yt.TOKEN_PATH)} (obtained ${t.obtained_at})`);
    console.log('a fresh access token was just minted successfully, so uploads will work');
    return 0;
  } catch (e) {
    console.log(`token exists but is not usable: ${e.message}`);
    console.log('re-run with --force to authorise again');
    return 1;
  }
}

async function authorise() {
  yt.clientCredentials(); // fail fast and loudly if the OAuth client isn't configured

  // `state` defends against a stray request to the loopback port being treated
  // as our callback.
  const state = crypto.randomBytes(16).toString('hex');

  const savedPath = await new Promise((resolve, reject) => {
    // Captured once at listen time. Asking server.address() inside the handler is
    // a trap: after server.close() it returns null, and reading .port off null
    // threw away a successful authorisation once already.
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

      // Exchange and SAVE before telling the browser it worked. Previously the page
      // said "Authorised" first, so a later failure left the operator believing they
      // were done while no token existed. The page must not claim more than is true.
      try {
        const tokenPath = await yt.exchangeCode(gotCode, redirectUri);
        reply('Authorised. YouTube uploads are now enabled.');
        server.close();
        resolve(tokenPath);
      } catch (e) {
        reply(`Authorisation failed: ${e.message}`);
        server.close();
        reject(e);
      }
    });

    server.on('error', reject);
    // Port 0 = let the OS pick a free one. Add http://127.0.0.1 to the client's
    // authorised redirect URIs; Google accepts any port for loopback clients.
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
      const url = yt.consentUrl(redirectUri, state);

      // Hand the URL to the browser via a LOCAL HTML FILE, never as a command-line
      // argument or something to copy out of a terminal.
      //
      // This URL is hostile to every text channel it passes through:
      //   - cmd.exe expands %...% as variables, eating %3A%2F%2F in the scope
      //     (Google then reports invalid_scope with invalid=[https])
      //   - cmd.exe treats & as a command separator, truncating at redirect_uri
      //     (Google then reports "Required parameter is missing: response_type")
      //   - copy/paste out of a wrapped terminal line loses characters
      // Both failures look like a broken OAuth client and are really a mangled
      // string. A file:// page with the URL in an href sidesteps all of it: the
      // browser reads the attribute verbatim.
      const htmlPath = path.join(path.dirname(yt.TOKEN_PATH), 'authorize.html');
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
      fs.writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8">
<title>Authorise YouTube upload</title>
<meta http-equiv="refresh" content="1;url=${esc(url)}">
<body style="font:16px/1.6 system-ui;max-width:36rem;margin:4rem auto;color:#2b2b2b">
<h2>Redirecting you to Google…</h2>
<p>If nothing happens, click here:</p>
<p><a href="${esc(url)}">Approve YouTube upload access</a></p>
<p style="color:#777">Pick the Google account that manages your YouTube channel. If you see
&ldquo;Google hasn&rsquo;t verified this app&rdquo;, choose <b>Advanced</b> &rarr;
<b>Go to &hellip; (unsafe)</b> &mdash; it is your own app.</p>
</body>`);

      // A plain-text copy too, for the case where the file has to be opened by hand.
      fs.writeFileSync(path.join(path.dirname(htmlPath), 'authorize-url.txt'), url + '\n');

      console.log(`\nOpening your browser via:\n  ${htmlPath}\n`);
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

    // 15 minutes, not 5: the first time through, the operator is often still
    // finishing the consent screen or hunting for the right Google account when
    // the window opens. A premature timeout just means doing it all again.
    const WAIT_MS = 15 * 60 * 1000;
    setTimeout(() => {
      server.close();
      reject(new Error(
        'timed out after 15 minutes waiting for consent.\n' +
        '  Nothing was saved. Re-run when you are ready to click through the browser.'
      ));
    }, WAIT_MS);
  });

  console.log(`\nrefresh token saved to ${rel(savedPath)}`);
  console.log('This file is a long-lived credential. It is gitignored — keep it that way.');
  return check();
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--check')) { process.exitCode = await check(); return; }
  if (yt.isAuthorised() && !args.includes('--force')) {
    console.log('already authorised; use --force to replace the stored token\n');
    process.exitCode = await check();
    return;
  }
  process.exitCode = await authorise();
})().catch((e) => {
  console.error(`\n${e.message}\n`);
  process.exitCode = 1;
});
