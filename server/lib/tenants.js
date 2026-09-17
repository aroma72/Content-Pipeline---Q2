'use strict';
/**
 * tenants -- who is calling, and what they are allowed to spend.
 *
 * WHY THIS EXISTS
 * There was one credential, CONTENT_API_TOKEN, and it meant "you are us". That
 * was fine while the only caller was Aroma. It stopped being fine when a second
 * organisation started driving the creation API: every video they approve is
 * recorded under Aroma's name, billed against one global budget nobody can
 * apportion, and published to a channel they do not control. You cannot meter,
 * attribute or revoke what you cannot tell apart.
 *
 * So a caller is now a tenant: a stable id, a display name, a monthly ceiling
 * and its own rate limits. The token stops being an identity and becomes a
 * lookup key for one.
 *
 * ONE ENV VAR, NOT FOUR PER TENANT
 * Railway's variable editor is a flat list with no atomic multi-variable save.
 * With TENANT_<ID>_TOKEN / _BUDGET / _LIMITS you can save the token before the
 * budget, which leaves a live credential with no ceiling -- a window where a new
 * tenant is unmetered. One variable is one save, one parse, one failure point,
 * and it copies verbatim into a staging environment.
 *
 * THE LEGACY TOKEN IS LOADED SEPARATELY, ON PURPOSE
 * CONTENT_API_TOKEN is read from its own variable and synthesised into a tenant.
 * A malformed TENANTS_JSON -- the obvious failure of JSON typed into a textarea
 * -- therefore fails the NEW tenants closed without taking the integration that
 * already works in production down with it.
 */

const crypto = require('crypto');

/** Tokens shorter than this are rejected: a guessable credential is not one. */
const MIN_TOKEN_LENGTH = 24;

/** Bounds the work an unauthenticated caller can make us do per request. */
const MAX_TOKEN_LENGTH = 512;

const DEFAULTS = { producePerHour: 20, producePerDay: 60, approvePerHour: 60 };

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * A per-process pepper for the token lookup table.
 *
 * Tokens are never stored, compared or logged in the clear: each is hashed to a
 * lookup key and the raw value dropped. The pepper means an attacker who somehow
 * read this process's memory still cannot precompute lookup keys for guessed
 * tokens, and it never needs configuring -- it is regenerated per boot because
 * the table is rebuilt in memory anyway.
 */
let PEPPER = null;
function pepper() {
  if (!PEPPER) {
    PEPPER = process.env.TENANT_TOKEN_PEPPER
      ? Buffer.from(String(process.env.TENANT_TOKEN_PEPPER))
      : crypto.randomBytes(32);
  }
  return PEPPER;
}

function lookupKey(token) {
  return crypto.createHmac('sha256', pepper()).update(String(token)).digest('hex');
}

function normaliseLimits(raw) {
  const l = raw && typeof raw === 'object' ? raw : {};
  return {
    producePerHour: num(l.producePerHour, num(process.env.TENANT_PRODUCE_PER_HOUR, DEFAULTS.producePerHour)),
    producePerDay: num(l.producePerDay, num(process.env.TENANT_PRODUCE_PER_DAY, DEFAULTS.producePerDay)),
    approvePerHour: num(l.approvePerHour, num(process.env.TENANT_APPROVE_PER_HOUR, DEFAULTS.approvePerHour)),
  };
}

/**
 * Build the tenant list from the environment.
 *
 * Never throws. A bad entry is dropped and named in `errors`, which /health
 * surfaces -- a tenant that silently failed to load looks exactly like a tenant
 * whose token is wrong, and those need different fixes.
 */
function loadTenants(env = process.env) {
  const tenants = [];
  const errors = [];
  const seenIds = new Set();
  const byKey = new Map();
  const duplicateKeys = new Set();

  const add = (t, rawToken) => {
    const key = lookupKey(rawToken);
    if (byKey.has(key)) {
      // Two tenants sharing a token means spend cannot be attributed. Refuse
      // BOTH rather than silently letting one shadow the other.
      duplicateKeys.add(key);
      errors.push(`tenants '${byKey.get(key).id}' and '${t.id}' share a token; both refused`);
      return;
    }
    byKey.set(key, t);
    tenants.push(t);
  };

  const raw = String(env.TENANTS_JSON || '').trim();
  if (raw) {
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      errors.push(`TENANTS_JSON is not valid JSON (${e.message}); no configured tenants loaded`);
    }
    if (parsed && !Array.isArray(parsed)) {
      errors.push('TENANTS_JSON must be a JSON array of tenant objects');
      parsed = null;
    }
    for (const entry of parsed || []) {
      const id = String((entry && entry.id) || '').trim();
      const token = String((entry && entry.token) || '');
      if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(id)) {
        errors.push(`a tenant has an unusable id ${JSON.stringify(id)}; skipped`);
        continue;
      }
      if (seenIds.has(id)) {
        errors.push(`duplicate tenant id '${id}'; only the first is used`);
        continue;
      }
      if (token.length < MIN_TOKEN_LENGTH) {
        // Name the tenant, never the token.
        errors.push(`tenant '${id}' has a token under ${MIN_TOKEN_LENGTH} characters; skipped`);
        continue;
      }
      seenIds.add(id);
      add({
        id,
        name: String((entry && entry.name) || id),
        monthlyUsd: Number.isFinite(Number(entry.monthlyUsd)) ? Number(entry.monthlyUsd) : null,
        maxRunUsd: Number.isFinite(Number(entry.maxRunUsd)) ? Number(entry.maxRunUsd) : null,
        limits: normaliseLimits(entry.limits),
        scopes: new Set(Array.isArray(entry.scopes) && entry.scopes.length
          ? entry.scopes.map(String)
          : ['produce', 'approve', 'catalogue']),
        webhookSecret: String((entry && entry.webhookSecret) || '') || null,
        legacy: false,
      }, token);
    }
  }

  // The credential that already works in production. Loaded last so an explicit
  // entry in TENANTS_JSON carrying the same token wins and this synth is skipped.
  const legacyToken = String(env.CONTENT_API_TOKEN || '');
  if (legacyToken) {
    const key = lookupKey(legacyToken);
    if (!byKey.has(key) && !seenIds.has('default')) {
      add({
        id: 'default',
        name: 'Content Queen (CONTENT_API_TOKEN)',
        // Deliberately unmetered unless asked for. Imposing a new silent ceiling
        // on the one credential already in production is how this change breaks
        // something at 2am; the per-run hard wall still applies to it.
        monthlyUsd: Number.isFinite(Number(env.DEFAULT_TENANT_MONTHLY_USD))
          ? Number(env.DEFAULT_TENANT_MONTHLY_USD)
          : null,
        maxRunUsd: null,
        limits: normaliseLimits(null),
        scopes: new Set(['produce', 'approve', 'catalogue']),
        webhookSecret: null,
        legacy: true,
      }, legacyToken);
    }
  }

  // Drop every tenant caught in a token collision, from the lookup table AND
  // from the list. Removing only the lookup entry would leave `count` and
  // /health claiming a tenant that can never authenticate, which is exactly the
  // kind of half-truth that sends someone debugging the wrong end.
  for (const key of duplicateKeys) {
    const casualty = byKey.get(key);
    byKey.delete(key);
    const i = tenants.indexOf(casualty);
    if (i >= 0) tenants.splice(i, 1);
  }

  return { tenants, errors, byKey };
}

/** What may safely be shown: never a token, never a lookup key. */
function publicView(t) {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    monthlyUsd: t.monthlyUsd,
    limits: t.limits,
    legacy: t.legacy,
    scopes: [...t.scopes],
  };
}

function buildRegistry(env = process.env) {
  const { tenants, errors, byKey } = loadTenants(env);

  return {
    /**
     * The tenant holding this token, or null.
     *
     * One HMAC and one hash-table lookup, whatever the tenant count. Looping
     * timingSafeEqual over the list would leak how many tenants exist through
     * timing and which matched through the early return; an attacker cannot
     * craft near-miss lookup keys here because they do not hold the pepper.
     */
    match(supplied) {
      const s = String(supplied || '');
      if (!s || s.length > MAX_TOKEN_LENGTH) return null;
      return byKey.get(lookupKey(s)) || null;
    },
    byId(id) { return tenants.find((t) => t.id === id) || null; },
    /** Is there any credential at all? Distinguishes "wrong token" from "off". */
    configured: tenants.length > 0,
    count: tenants.length,
    errors,
    list() { return tenants.map(publicView); },
    health() {
      return {
        configured: tenants.length > 0,
        count: tenants.length,
        ids: tenants.map((t) => t.id),
        errors,
      };
    },
  };
}

/**
 * The live registry, rebuilt when the variables it reads change.
 *
 * Memoised on a fingerprint rather than forever, so a test can patch the
 * environment and see the effect without reaching into module internals.
 */
let cached = null;
let cachedFingerprint = null;

function registry(env = process.env) {
  const fp = [
    env.TENANTS_JSON, env.CONTENT_API_TOKEN, env.DEFAULT_TENANT_MONTHLY_USD,
    env.TENANT_PRODUCE_PER_HOUR, env.TENANT_PRODUCE_PER_DAY, env.TENANT_APPROVE_PER_HOUR,
  ].map((v) => v || '').join('|');
  if (!cached || fp !== cachedFingerprint) {
    cached = buildRegistry(env);
    cachedFingerprint = fp;
  }
  return cached;
}

module.exports = {
  registry, buildRegistry, loadTenants, publicView,
  MIN_TOKEN_LENGTH, MAX_TOKEN_LENGTH,
};
