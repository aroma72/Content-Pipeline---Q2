'use strict';
/**
 * owner -- who a job belongs to, so a jobId stops being a credential.
 *
 * THE PROBLEM
 * /demo/* authenticated nobody, so the jobId in the URL was the only thing
 * standing between a stranger and two buttons: one that spends the art and
 * speech budget, and one that publishes to a YouTube channel. An identifier that
 * authorises spending is a bearer credential wearing a URL fragment as a
 * costume, and it leaks the way identifiers leak -- into browser history, the
 * Referer header, screenshots and logs.
 *
 * THE SPLIT
 * Writing a script buys nothing: research, draft and gate are model calls on our
 * own credential. So anonymous callers keep creating and reading, and the demo
 * page keeps working. Producing and approving spend money and publish, so those
 * need a tenant token. On top of that EVERY job is bound to whoever created it,
 * so even a leaked jobId in the right hands is not enough.
 *
 * WHY A COOKIE AND NOT A SECOND TOKEN IN THE BODY
 * Two routes cannot carry an Authorization header. The script download is a
 * top-level navigation (window.location.href) and the review player is a
 * <video src>. A secret passed to those would have to ride in the query string,
 * which puts it in history, the Referer header and every access log -- the exact
 * leak this is closing. The page is served same-origin and fetch defaults to
 * credentials:'same-origin', so the existing calls carry the cookie with no
 * client change at all.
 *
 * A tenant bearer token always wins over the cookie, so the LMS -- which calls
 * server-to-server and holds a real credential -- never touches this path.
 */

const crypto = require('crypto');

const COOKIE = 'cq_owner';
const MAX_AGE_SEC = 30 * 24 * 60 * 60;
const VERSION = 'v1';

let generatedSecret = null;

/**
 * The signing key, and a previous one so it can be rotated without logging every
 * anonymous visitor out mid-job.
 */
function secrets() {
  const out = [];
  if (process.env.OWNER_COOKIE_SECRET) out.push(Buffer.from(String(process.env.OWNER_COOKIE_SECRET)));
  if (process.env.OWNER_COOKIE_SECRET_PREVIOUS) out.push(Buffer.from(String(process.env.OWNER_COOKIE_SECRET_PREVIOUS)));
  if (!out.length) {
    // Keeps the demo working on a machine with nothing configured, and is said
    // out loud at boot rather than discovered when sessions vanish on restart.
    if (!generatedSecret) generatedSecret = crypto.randomBytes(32);
    out.push(generatedSecret);
  }
  return out;
}

/** True when OWNER_COOKIE_SECRET is absent and sessions will not survive a restart. */
function usingEphemeralSecret() {
  return !process.env.OWNER_COOKIE_SECRET;
}

function mintAnonOwnerId() {
  return `anon_${crypto.randomBytes(12).toString('base64url')}`;
}

function payloadOf(ownerId, iatSec) {
  return `${VERSION}.${ownerId}.${iatSec}`;
}

function sign(ownerId, secret, nowMs = Date.now()) {
  const iat = Math.floor(nowMs / 1000);
  const body = payloadOf(ownerId, iat);
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** Verify against every accepted secret, in constant time per candidate. */
function verify(value, secretList = secrets(), nowMs = Date.now()) {
  const s = String(value || '');
  const parts = s.split('.');
  if (parts.length !== 4) return { ok: false, why: 'malformed' };
  const [v, ownerId, iatRaw, sig] = parts;
  if (v !== VERSION) return { ok: false, why: 'wrong version' };
  if (!/^anon_[A-Za-z0-9_-]{8,64}$/.test(ownerId)) return { ok: false, why: 'bad owner id' };
  const iat = Number(iatRaw);
  if (!Number.isFinite(iat)) return { ok: false, why: 'bad timestamp' };
  if (Math.floor(nowMs / 1000) - iat > MAX_AGE_SEC) return { ok: false, why: 'expired' };

  const body = payloadOf(ownerId, iatRaw);
  const given = Buffer.from(sig);
  for (const secret of secretList) {
    const want = Buffer.from(crypto.createHmac('sha256', secret).update(body).digest('base64url'));
    if (want.length === given.length && crypto.timingSafeEqual(want, given)) {
      return { ok: true, ownerId };
    }
  }
  return { ok: false, why: 'bad signature' };
}

/** Hand-rolled, because one cookie does not justify a dependency. */
function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (!k) continue;
    out[k] = part.slice(eq + 1).trim();
  }
  return out;
}

function serializeCookie(name, value, { secure, maxAgeSec = MAX_AGE_SEC, path = '/demo' } = {}) {
  const bits = [
    `${name}=${value}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSec}`,
    'HttpOnly',
    // Lax rather than Strict: the script download is a top-level navigation from
    // the same page, and Strict would drop the cookie on exactly that request.
    'SameSite=Lax',
  ];
  if (secure) bits.push('Secure');
  return bits.join('; ');
}

/**
 * The anonymous session this request carries, regardless of any token.
 *
 * `resolveOwner` lets a tenant token win, which is right everywhere except the
 * claim step: there the caller is a tenant AND is holding the browser session
 * that created the job, and the session is the thing being proved. Without this
 * the claim route would ask a tenant to already own what it is asking to own.
 */
function cookieOwnerId(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return null;
  const v = verify(raw);
  return v.ok ? `anon:${v.ownerId}` : null;
}

/**
 * Resolve the caller. A tenant token beats a cookie, always.
 * @returns {{kind:'tenant'|'anon', id:string, tenant:object|null}|null}
 */
function resolveOwner(req, { registry, bearerOf }) {
  const tenant = registry && registry.configured ? registry.match(bearerOf(req)) : null;
  if (tenant) return { kind: 'tenant', id: `tenant:${tenant.id}`, tenant };
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (raw) {
    const v = verify(raw);
    if (v.ok) return { kind: 'anon', id: `anon:${v.ownerId}`, tenant: null };
  }
  return null;
}

/**
 * Put an owner on every /demo request, minting an anonymous one when needed.
 *
 * A cookie is only ever set for an anonymous caller. A tenant is already
 * identified and must not be handed a second, weaker credential.
 */
function attachOwner({ registry, bearerOf } = {}) {
  return (req, res, next) => {
    const reg = typeof registry === 'function' ? registry() : registry;
    const existing = resolveOwner(req, { registry: reg, bearerOf });
    if (existing) { req.owner = existing; return next(); }

    const ownerId = mintAnonOwnerId();
    const value = sign(ownerId, secrets()[0]);
    // `secure` only when the request actually arrived over TLS, so the same code
    // works on http://localhost without a special case.
    res.append('Set-Cookie', serializeCookie(COOKIE, value, { secure: req.protocol === 'https' }));
    req.owner = { kind: 'anon', id: `anon:${ownerId}`, tenant: null, fresh: true };
    return next();
  };
}

/** Routes that spend money or publish. Anonymous is refused with 401. */
function requireTenant(scope) {
  return (req, res, next) => {
    if (!req.owner || req.owner.kind !== 'tenant') {
      res.set('WWW-Authenticate', 'Bearer realm="content-queen"');
      return res.status(401).json({
        error: 'unauthorized',
        message: 'This call spends money or publishes a video, so it needs a credential. '
          + 'Send it as: Authorization: Bearer <token>. Writing and reading a script '
          + 'needs no token — those buy nothing.',
      });
    }
    if (scope && !req.owner.tenant.scopes.has(scope)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `This credential does not carry the '${scope}' scope.`,
        tenant: req.owner.tenant.id,
      });
    }
    return next();
  };
}

/**
 * Only the owner may see a job.
 *
 * A non-owner gets 404 with a body byte-identical to a genuinely missing job.
 * 403 would confirm the id exists, turning a twelve-character id space into an
 * enumeration oracle -- and confirming a job exists is most of what an attacker
 * wanted the id for.
 */
function notFound(res) {
  return res.status(404).json({ error: 'not_found', message: 'No such job (or it expired).' });
}

module.exports = {
  COOKIE, MAX_AGE_SEC,
  mintAnonOwnerId, sign, verify, parseCookies, serializeCookie,
  resolveOwner, cookieOwnerId, attachOwner, requireTenant, notFound,
  secrets, usingEphemeralSecret,
};
