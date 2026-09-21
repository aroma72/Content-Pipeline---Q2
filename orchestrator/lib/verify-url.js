'use strict';
/**
 * Does this URL actually resolve to something a learner can open?
 *
 * This exists because of one sentence in the LMS's 2026-09-21 memo: "a model
 * asked for URLs will invent them ... every consumer inherits a list of
 * plausible dead links." They said they would not render an unverified list, and
 * they were right to. So a reference is not a reference until it has been
 * fetched.
 *
 * The guards here are NOT about the reference being hostile -- they are about the
 * URL being attacker-CHOSEN. A model's output is untrusted input, and a URL we
 * fetch on our own server from untrusted input is the textbook SSRF shape: ask
 * for http://169.254.169.254/ and a cloud credential comes back. So: https only,
 * public addresses only, every redirect hop re-checked, and a hard timeout.
 *
 * `isPublicAddress` is borrowed from server/lib/webhook.js rather than copied.
 * Its sibling `validateCallbackUrl` is deliberately NOT used: that one requires
 * the host to be in WEBHOOK_ALLOWED_HOSTS, which is correct for a callback we
 * deliver to and useless for a documentation page we have never seen before.
 */

const dns = require('dns').promises;
const net = require('net');
const { isPublicAddress } = require('../../server/lib/webhook');

/** A fetch that hangs is a run that hangs. */
const TIMEOUT_MS = Number(process.env.REFERENCE_VERIFY_TIMEOUT_MS) || 6000;

/**
 * How many hops to follow. Documentation URLs redirect constantly -- version
 * shuffles, http->https, trailing slashes -- so refusing to follow would fail
 * most real references. Three is enough for those and short enough that a
 * redirect loop cannot become a spend.
 */
const MAX_REDIRECTS = 3;

/**
 * Types that are not a thing a person reads. Everything else passes, including a
 * missing content-type: plenty of real servers omit it on a HEAD, and rejecting
 * on absence would drop good references to punish bad manners.
 */
const NOT_A_DOCUMENT = /^(image|video|audio|font)\//i;

/** Shape and scheme. No DNS yet -- this is the free half. */
function validateReferenceUrl(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { return { ok: false, why: 'not a valid URL' }; }

  // https only. http would be followed to a plaintext page we then vouch for,
  // and every source worth citing has TLS.
  if (url.protocol !== 'https:') return { ok: false, why: 'not https' };

  // user:pass@host is never a real citation and is a classic parser-confusion
  // trick -- some parsers read the host as the part before the @.
  if (url.username || url.password) return { ok: false, why: 'credentials in the URL' };

  // Anything other than 443 on a public doc page is a port scan wearing a hat.
  if (url.port && url.port !== '443') return { ok: false, why: `port ${url.port}` };

  // A literal address never reaches the DNS check below, so screen it here.
  if (net.isIP(url.hostname) && !isPublicAddress(url.hostname)) {
    return { ok: false, why: 'address is not routable from here' };
  }
  return { ok: true, url };
}

/**
 * Every address this host resolves to must be public.
 *
 * ALL of them, not the first: a name that returns one public and one loopback
 * address would otherwise pass here and connect to the loopback one.
 */
async function hostIsPublic(hostname) {
  if (net.isIP(hostname)) {
    return isPublicAddress(hostname) ? { ok: true } : { ok: false, why: 'non-routable address' };
  }
  let addrs;
  try {
    addrs = await dns.lookup(hostname, { all: true });
  } catch (e) {
    return { ok: false, why: `dns: ${e.code || e.message}` };
  }
  if (!addrs.length) return { ok: false, why: 'dns returned nothing' };
  for (const a of addrs) {
    if (!isPublicAddress(a.address)) return { ok: false, why: 'resolves to a non-routable address' };
  }
  return { ok: true };
}

/** One request, no redirect following, with a timeout that actually fires. */
async function once(url, method, signal) {
  return fetch(url.toString(), {
    method,
    // Manual, because the point of following a redirect by hand is to re-run the
    // address check on each hop. `redirect: 'follow'` would let a public host
    // hand us a 302 to 127.0.0.1 and fetch it before we could look.
    redirect: 'manual',
    signal,
    headers: {
      // Some documentation hosts 403 a bare client. This is not a disguise --
      // it says what we are and why, which is what a well-behaved crawler does.
      'user-agent': 'content-queen-reference-check/1.0 (+link verification)',
      accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
    },
  });
}

/**
 * Fetch a URL and say whether it resolves to something readable.
 *
 * HEAD first because it is cheap, then GET if the server does not support it --
 * a 405 or 501 on HEAD is common and means nothing about whether the page
 * exists. A 403 gets the same treatment: some hosts refuse HEAD specifically.
 *
 * Returns {ok, status, finalUrl, why}. `ok` false is never an error to a caller:
 * an unverifiable reference is simply dropped.
 */
async function verifyUrl(raw, { timeoutMs = TIMEOUT_MS, maxRedirects = MAX_REDIRECTS } = {}) {
  const shape = validateReferenceUrl(raw);
  if (!shape.ok) return { ok: false, why: shape.why };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let url = shape.url;
    let method = 'HEAD';

    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const pub = await hostIsPublic(url.hostname);
      if (!pub.ok) return { ok: false, why: pub.why };

      let res;
      try {
        res = await once(url, method, controller.signal);
      } catch (e) {
        if (e.name === 'AbortError') return { ok: false, why: 'timed out' };
        return { ok: false, why: e.message };
      }

      // A server that will not do HEAD tells us nothing about the page. Retry
      // the SAME url with GET, once, without spending a redirect hop on it.
      if (method === 'HEAD' && (res.status === 405 || res.status === 501 || res.status === 403)) {
        method = 'GET';
        hop -= 1;
        continue;
      }

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return { ok: false, why: `${res.status} with no location` };
        let next;
        try { next = new URL(loc, url); } catch { return { ok: false, why: 'unfollowable redirect' }; }
        // Re-run the full shape check on the hop, not just the address one: a
        // redirect to http:// or to a credentialed URL must fail the same way a
        // model proposing it directly would.
        const hopShape = validateReferenceUrl(next.toString());
        if (!hopShape.ok) return { ok: false, why: `redirect to ${hopShape.why}` };
        url = hopShape.url;
        continue;
      }

      if (res.status < 200 || res.status >= 300) return { ok: false, why: `http ${res.status}` };

      const type = (res.headers.get('content-type') || '').split(';')[0].trim();
      if (type && NOT_A_DOCUMENT.test(type)) return { ok: false, why: `content-type ${type}` };

      return { ok: true, status: res.status, finalUrl: url.toString() };
    }

    return { ok: false, why: `more than ${maxRedirects} redirects` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verify many, keeping only what resolves.
 *
 * Small concurrency on purpose. This runs inside a build and the answer is worth
 * a couple of seconds, not a thundering herd against someone's docs site.
 */
async function verifyAll(urls, { concurrency = 4, ...opts } = {}) {
  const results = new Array(urls.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= urls.length) return;
      results[i] = await verifyUrl(urls[i], opts);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return results;
}

module.exports = { verifyUrl, verifyAll, validateReferenceUrl, hostIsPublic, TIMEOUT_MS, MAX_REDIRECTS };
