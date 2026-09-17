'use strict';
/**
 * webhook -- tell the caller when a job moves, instead of making them poll.
 *
 * Polling was the only way to learn anything had changed, and the job TTL
 * bounded how long anyone could poll. A callback deletes a self-chaining poller
 * and a sweeper from the caller's side.
 *
 * SSRF: AN ALLOWLIST, BECAUSE A DENYLIST LOSES
 * A callback URL is a request this server makes on a stranger's instruction --
 * the textbook server-side request forgery primitive. Blocking "private
 * addresses" is a game you lose: IPv4-mapped IPv6 (::ffff:10.0.0.1), decimal and
 * octal literals, 0.0.0.0, link-local metadata at 169.254.169.254, CGNAT,
 * DNS rebinding between the check and the connection, and 3xx redirects to any
 * of the above. So the host must be named in WEBHOOK_ALLOWED_HOSTS. Unset means
 * webhooks are off and a callbackUrl is refused, naming the variable.
 *
 * Even then the resolved address is checked and pinned, because an allowlisted
 * hostname whose DNS answer changes between the check and the socket is exactly
 * the rebinding case an allowlist alone does not cover.
 */

const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function allowedHosts() {
  return String(process.env.WEBHOOK_ALLOWED_HOSTS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function enabled() {
  return allowedHosts().length > 0;
}

function hostAllowed(hostname) {
  const h = String(hostname || '').toLowerCase();
  for (const pattern of allowedHosts()) {
    if (pattern.startsWith('.')) {
      if (h === pattern.slice(1) || h.endsWith(pattern)) return true;
    } else if (h === pattern) return true;
  }
  return false;
}

/**
 * Is this address one we are willing to open a socket to?
 * Covers loopback, RFC1918, link-local (including cloud metadata), CGNAT,
 * unique-local IPv6 and the IPv4-mapped forms of all of them.
 */
function isPublicAddress(ip) {
  const a = String(ip || '');
  const v = net.isIP(a);
  if (!v) return false;

  if (v === 6) {
    const low = a.toLowerCase();
    if (low === '::1' || low === '::') return false;
    if (low.startsWith('fe80')) return false;               // link-local
    if (/^f[cd]/.test(low)) return false;                   // unique-local
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(a);
    if (mapped) return isPublicAddress(mapped[1]);          // the mapped-v4 trick
    return true;
  }

  const p = a.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [x, y] = p;
  if (x === 0 || x === 10 || x === 127) return false;
  if (x === 169 && y === 254) return false;                 // 169.254.169.254 lives here
  if (x === 172 && y >= 16 && y <= 31) return false;
  if (x === 192 && y === 168) return false;
  if (x === 100 && y >= 64 && y <= 127) return false;       // CGNAT
  if (x >= 224) return false;                               // multicast + reserved
  return true;
}

/**
 * Validate a caller-supplied callback URL.
 * @returns {{ok:true, url:URL}|{ok:false, why:string}}
 */
function validateCallbackUrl(raw) {
  if (!enabled()) {
    return { ok: false, why: 'callbacks are disabled on this server; WEBHOOK_ALLOWED_HOSTS is not set' };
  }
  let url;
  try { url = new URL(String(raw)); } catch { return { ok: false, why: 'not a valid URL' }; }

  const allowHttp = process.env.WEBHOOK_ALLOW_HTTP === '1';
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
    return { ok: false, why: 'callbacks must be https' };
  }
  if (url.username || url.password) return { ok: false, why: 'credentials in the URL are not accepted' };
  if (url.hash) return { ok: false, why: 'a fragment in a callback URL is meaningless' };

  const ports = String(process.env.WEBHOOK_ALLOWED_PORTS || '443,80')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  if (!ports.includes(port)) return { ok: false, why: `port ${port} is not allowed` };

  if (!hostAllowed(url.hostname)) {
    return { ok: false, why: `host '${url.hostname}' is not in WEBHOOK_ALLOWED_HOSTS` };
  }
  // A literal private address never reaches DNS, so check it here too.
  if (net.isIP(url.hostname) && !isPublicAddress(url.hostname)) {
    return { ok: false, why: 'that address is not routable from here' };
  }
  return { ok: true, url };
}

/**
 * The signature, with the timestamp inside the signed material.
 *
 * Signing only the body would let a captured delivery be replayed forever.
 * Receivers should reject a timestamp more than five minutes from their own.
 */
function signBody(bodyString, secret, tsSec) {
  return `v1=${crypto.createHmac('sha256', String(secret)).update(`${tsSec}.${bodyString}`).digest('hex')}`;
}

/**
 * Deliver once. Resolves the host, refuses every private answer, then connects to
 * the resolved address with the original hostname kept for TLS and Host, so the
 * value checked and the value connected to cannot differ.
 */
async function deliver({ url, event, secret, timeoutMs }) {
  const check = validateCallbackUrl(url);
  if (!check.ok) return { ok: false, error: check.why };

  let addrs = [];
  try {
    addrs = await dns.lookup(check.url.hostname, { all: true });
  } catch (e) {
    return { ok: false, error: `dns: ${e.message}` };
  }
  if (!addrs.length) return { ok: false, error: 'dns returned nothing' };
  for (const a of addrs) {
    if (!isPublicAddress(a.address)) {
      return { ok: false, error: `'${check.url.hostname}' resolves to a non-routable address` };
    }
  }

  const body = JSON.stringify(event);
  const ts = Math.floor(Date.now() / 1000);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), num(timeoutMs || process.env.WEBHOOK_TIMEOUT_MS, 5000));
  const started = Date.now();
  try {
    const res = await fetch(check.url.toString(), {
      method: 'POST',
      // A 3xx is a delivery failure, never something to follow: following one is
      // how an allowlisted host walks you to an address that is not.
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-cq-event': 'job.status_changed',
        'x-cq-delivery': crypto.randomUUID(),
        'x-cq-timestamp': String(ts),
        'x-cq-signature': signBody(body, secret || process.env.WEBHOOK_SIGNING_SECRET || '', ts),
      },
      body,
    });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'timed out' : e.message, ms: Date.now() - started };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fire and forget, with a bounded retry.
 *
 * Deliberately not awaited by the route: a job transition must not be slowed
 * down, or made to fail, by someone else's endpoint being down.
 */
function send({ url, event, secret, store, jobId }) {
  const max = num(process.env.WEBHOOK_MAX_ATTEMPTS, 3);
  const backoff = [1000, 10000, 60000];
  let attempt = 0;
  const go = () => {
    attempt++;
    deliver({ url, event, secret }).then((r) => {
      if (r.ok) return;
      if (attempt >= max) {
        console.warn(`[webhook] giving up on job ${jobId} after ${attempt} attempts: ${r.error || r.status}`);
        if (store && store.canRecordSpend()) {
          try {
            require('fs').appendFileSync(
              require('path').join(store.dir, 'webhooks-dead.jsonl'),
              `${JSON.stringify({ at: new Date().toISOString(), jobId, url, event, last: r })}\n`
            );
          } catch { /* the log is best effort */ }
        }
        return;
      }
      setTimeout(go, backoff[Math.min(attempt - 1, backoff.length - 1)]).unref();
    }).catch(() => { /* deliver never throws, but never let this escape */ });
  };
  go();
}

function health() {
  return {
    enabled: enabled(),
    allowedHosts: allowedHosts(),
    note: enabled()
      ? 'A callbackUrl on an allowlisted host will be called on every status change.'
      : 'Disabled. Set WEBHOOK_ALLOWED_HOSTS to the callback host to turn this on.',
  };
}

module.exports = { validateCallbackUrl, isPublicAddress, hostAllowed, signBody, deliver, send, enabled, health };
