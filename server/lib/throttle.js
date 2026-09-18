'use strict';
/**
 * throttle -- sliding-window rate limits, keyed on who is calling.
 *
 * WHAT WAS INVERTED
 * The free call was capped at 6/hour and the two calls that spend money and
 * publish to YouTube had no limit at all. A single loop could drain the art and
 * speech budget in seconds. This exists so the expensive calls are the ones with
 * a ceiling.
 *
 * WHY PER TENANT AND NOT PER IP
 * The old limit keyed on req.ip. A customer whose whole platform egresses from
 * one address therefore got "6 per hour" for their entire university, not 6 per
 * instructor -- a per-IP limit is a per-organisation limit for anyone behind a
 * single egress, which is most server-to-server callers. Identity comes from the
 * credential now. Per-IP survives only as a loose backstop on the anonymous
 * create route, where there is no credential to key on: it bounds abuse, it does
 * not identify anyone, and with `trust proxy` set it never could.
 */

const WINDOWS = new Map();

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function prune(hits, cutoff) {
  while (hits.length && hits[0] < cutoff) hits.shift();
  return hits;
}

/**
 * Would this request be allowed? Does not record it.
 * @returns {{ok:boolean, limit:number, remaining:number, resetAt:number, retryAfterSec:number}}
 */
function check({ bucket, limit, windowMs, nowMs = Date.now() }) {
  const hits = prune(WINDOWS.get(bucket) || [], nowMs - windowMs);
  WINDOWS.set(bucket, hits);
  const ok = hits.length < limit;
  const resetAt = hits.length ? hits[0] + windowMs : nowMs + windowMs;
  return {
    ok,
    limit,
    remaining: Math.max(0, limit - hits.length),
    resetAt,
    retryAfterSec: ok ? 0 : Math.max(1, Math.ceil((resetAt - nowMs) / 1000)),
  };
}

/** Check and, if allowed, record. */
function consume({ bucket, limit, windowMs, nowMs = Date.now() }) {
  const r = check({ bucket, limit, windowMs, nowMs });
  if (r.ok) {
    const hits = WINDOWS.get(bucket);
    hits.push(nowMs);
    r.remaining = Math.max(0, limit - hits.length);
  }
  return r;
}

/**
 * Tell the caller how to back off.
 *
 * The old 429 carried no headers at all, so a well-behaved client had nothing to
 * base a retry on and a badly-behaved one hammered. These are the standard names
 * every HTTP client already understands.
 */
function setHeaders(res, r) {
  res.set('X-RateLimit-Limit', String(r.limit));
  res.set('X-RateLimit-Remaining', String(r.remaining));
  res.set('X-RateLimit-Reset', String(Math.ceil(r.resetAt / 1000)));
  if (!r.ok) res.set('Retry-After', String(r.retryAfterSec));
}

/** Keep the map from growing without bound on a long-lived container. */
function gc(nowMs = Date.now(), maxAgeMs = 24 * 60 * 60 * 1000) {
  let dropped = 0;
  for (const [k, hits] of WINDOWS) {
    if (!hits.length || nowMs - hits[hits.length - 1] > maxAgeMs) { WINDOWS.delete(k); dropped++; }
  }
  return dropped;
}

function reset(bucket) {
  if (bucket) WINDOWS.delete(bucket);
  else WINDOWS.clear();
}

function snapshot() {
  const out = {};
  for (const [k, hits] of WINDOWS) out[k] = hits.length;
  return out;
}

/** The limits for one tenant, env defaults filled in by tenants.js. */
function limitsFor(tenant) {
  return tenant && tenant.limits
    ? tenant.limits
    : {
      producePerHour: num(process.env.TENANT_PRODUCE_PER_HOUR, 20),
      producePerDay: num(process.env.TENANT_PRODUCE_PER_DAY, 60),
      approvePerHour: num(process.env.TENANT_APPROVE_PER_HOUR, 60),
    };
}

module.exports = { check, consume, setHeaders, gc, reset, snapshot, limitsFor, HOUR: 3600_000, DAY: 86_400_000 };
