#!/usr/bin/env node
'use strict';
/**
 * Mint a tenant credential, and prove TENANTS_JSON is valid before it reaches Railway.
 *
 *   node scripts/mint-tenant.js --id taleemabad-u --name "Taleemabad University LMS" --monthly 50
 *   node scripts/mint-tenant.js --check                 # validate the current TENANTS_JSON
 *   node scripts/mint-tenant.js --check --file env.json # validate a file instead
 *
 * WHY THIS EXISTS
 * The loader in server/lib/tenants.js fails SOFT: a token under 24 characters, a
 * duplicate id, or malformed JSON drops the tenant and reports it on /health.
 * That is right for a running service -- one bad entry must not take the others
 * down -- but it means a typo pasted into Railway looks like it worked and is
 * only discovered when the other organisation cannot authenticate. This checks
 * the same rules on this side of the paste.
 *
 * THE TOKEN IS PRINTED ONCE, HERE.
 * It is never written to a file in the repository. The last credential was put
 * into a handoff document, committed, and rendered into a PDF -- send it through
 * something that is not chat and not git.
 */

const crypto = require('crypto');
const fs = require('fs');

const MIN_TOKEN_LENGTH = 24;
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
}

/** 32 characters of base64url from 24 random bytes. Comfortably over the floor. */
function mintToken() {
  return 'cq_' + crypto.randomBytes(24).toString('base64url');
}

/** The same rules tenants.js enforces, applied before the value is pasted. */
function validate(raw) {
  const errors = [];
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, errors: ['TENANTS_JSON is not valid JSON: ' + e.message], tenants: [] };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, errors: ['TENANTS_JSON must be a JSON array of tenant objects'], tenants: [] };
  }

  const ids = new Set();
  const tokens = new Map();
  const ok = [];
  for (const entry of parsed) {
    const id = String((entry && entry.id) || '').trim();
    const token = String((entry && entry.token) || '');
    if (!ID_RE.test(id)) { errors.push('unusable tenant id ' + JSON.stringify(id)); continue; }
    if (ids.has(id)) { errors.push("duplicate tenant id '" + id + "'"); continue; }
    if (token.length < MIN_TOKEN_LENGTH) {
      // Name the tenant, never the token.
      errors.push("tenant '" + id + "' has a token under " + MIN_TOKEN_LENGTH + ' characters');
      continue;
    }
    if (tokens.has(token)) {
      // Spend that cannot be attributed is not spend we accept, so the loader
      // refuses BOTH of them -- which is easy to miss when it happens in prod.
      errors.push("tenants '" + tokens.get(token) + "' and '" + id
        + "' share a token; the service will refuse BOTH");
      continue;
    }
    ids.add(id);
    tokens.set(token, id);
    const monthly = Number.isFinite(Number(entry.monthlyUsd)) ? Number(entry.monthlyUsd) : null;
    if (monthly === null) {
      errors.push("tenant '" + id + "' has no monthlyUsd, so it has NO monthly ceiling");
    }
    ok.push({ id, monthlyUsd: monthly, scopes: entry.scopes || ['produce', 'approve', 'catalogue'] });
  }
  return { ok: errors.length === 0, errors, tenants: ok };
}

function main() {
  if (process.argv.includes('--check')) {
    const file = arg('file');
    const raw = file ? fs.readFileSync(file, 'utf8') : String(process.env.TENANTS_JSON || '');
    if (!raw.trim()) {
      console.error('Nothing to check: set TENANTS_JSON, or pass --file <path>.');
      process.exitCode = 1;
      return;
    }
    const r = validate(raw);
    for (const t of r.tenants) {
      console.log('  ok   ' + t.id + '  ceiling: '
        + (t.monthlyUsd === null ? 'NONE' : '$' + t.monthlyUsd + '/month')
        + '  scopes: ' + [].concat(t.scopes).join(','));
    }
    for (const e of r.errors) console.error('  FAIL ' + e);
    if (!r.ok) process.exitCode = 1;
    else console.log('\n' + r.tenants.length + ' tenant(s), all usable.');
    return;
  }

  const id = arg('id');
  if (!id || !ID_RE.test(id)) {
    console.error('Usage: node scripts/mint-tenant.js --id <slug> [--name "..."] [--monthly 50]');
    process.exitCode = 1;
    return;
  }
  const monthly = Number(arg('monthly', '50'));
  const entry = {
    id,
    name: arg('name', id),
    token: mintToken(),
    monthlyUsd: Number.isFinite(monthly) ? monthly : null,
    limits: { producePerHour: 20, producePerDay: 60, approvePerHour: 60 },
    scopes: (arg('scopes', 'produce,approve,catalogue')).split(','),
    webhookSecret: null,
  };

  console.log('\nAdd this object to the TENANTS_JSON array in Railway:\n');
  console.log(JSON.stringify([entry], null, 2));
  console.log('\nTENANTS_JSON is ONE variable holding an array -- if other tenants already');
  console.log('exist, merge this entry into the existing array rather than replacing it.');
  console.log('\nThe token above is shown once and is not written anywhere. Send it to them');
  console.log('outside chat. Then: node scripts/mint-tenant.js --check --file <saved.json>\n');
}

main();
