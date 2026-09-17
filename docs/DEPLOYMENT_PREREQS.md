---
type: reference
last_verified: 2026-09-17
owner: Aroma Tahir
---

# Deployment prerequisites

What the Railway service needs before the creation API can be turned on for
another organisation. The Dockerfile has pointed at this file for months; it did
not exist until now.

`GET /health` reports every one of these, so the answer to "is this set up?" is a
request, not a guess.

---

## The one that changes behaviour: a volume

The container has no persistent disk. Jobs, the spend ledger and idempotency
records are written to a directory resolved in this order:

| Order | Source | Durability reported |
|---|---|---|
| 1 | `JOB_STORE_DIR` | `container`, or `volume` with `JOB_STORE_DURABLE=1` |
| 2 | `RAILWAY_VOLUME_MOUNT_PATH` + `/cq-jobs` | `volume` |
| 3 | repo root `/.jobstore` | `container` |
| 4 | OS temp | `ephemeral` |
| 5 | nothing writable | `memory` — **producing is refused** |

**Attach a Railway volume and nothing else needs doing.** Railway injects
`RAILWAY_VOLUME_MOUNT_PATH` automatically, the store relocates onto it, and
`/health` starts saying `volume`. No code change, no redeploy of config.

Until then `/health` says `container`: jobs survive a crash and a restart, not a
redeploy. That is the honest position, not a failure — but a 25-minute produce
run followed by an open-ended human review is exactly the window a redeploy
lands in, so this is the difference between losing a job and losing the money
that job spent.

`numReplicas` must stay `1`. A Railway volume cannot be shared, and the store
assumes a single writer.

---

## Environment variables

### Required for the creation API to work at all

| Variable | What happens without it |
|---|---|
| `CONTENT_API_TOKEN` | The whole API answers 503 `api_not_configured`. Fails closed rather than serving answer keys openly. |
| `PIPELINE_MAX_APPROVABLE_USD` | Every `/produce` answers 503 `no_budget`. |
| `OWNER_COOKIE_SECRET` | Anonymous demo sessions do not survive a restart — a visitor loses the job they just started. 32+ random bytes. |

### Required before another organisation can create videos

| Variable | Shape |
|---|---|
| `TENANTS_JSON` | A JSON **array**. One variable, not four per tenant, because Railway has no atomic multi-variable save — four would leave a window where a live token has no budget. |

```json
[
  {
    "id": "taleemabad-u",
    "name": "Taleemabad University LMS",
    "token": "<32+ random characters>",
    "monthlyUsd": 120,
    "limits": { "producePerHour": 20, "producePerDay": 60, "approvePerHour": 60 },
    "scopes": ["produce", "approve", "catalogue"],
    "webhookSecret": "<they generate this, we store it>"
  }
]
```

Rules the loader enforces, all reported on `/health`:

- A token under 24 characters is refused, and the **tenant** is named in the
  error — never the token.
- Two tenants sharing a token: **both** refused. Spend that cannot be attributed
  is not spend we will accept.
- Malformed JSON disables the new tenants and leaves `CONTENT_API_TOKEN`
  working. It is loaded independently for exactly this reason.

`CONTENT_API_TOKEN` becomes a tenant called `default`, unmetered unless
`DEFAULT_TENANT_MONTHLY_USD` is set.

### Optional

| Variable | Default | Effect |
|---|---|---|
| `WEBHOOK_ALLOWED_HOSTS` | *(unset)* | **Unset means callbacks are off** and a `callbackUrl` is refused. Comma-separated hosts; a leading dot matches subdomains. |
| `WEBHOOK_SIGNING_SECRET` | *(unset)* | Fallback when a tenant has no `webhookSecret`. |
| `JOB_STORE_TTL_DAYS` | `7` | How long a finished job is kept, measured from its **last transition**. |
| `JOB_STORE_STUCK_TTL_DAYS` | `30` | A job that has not moved for this long is removed; between the two it is reported as stuck. |
| `TENANT_PRODUCE_PER_HOUR` / `_PER_DAY` | `20` / `60` | Defaults when a tenant sets no limits. |
| `ANON_MAKE_PER_HOUR` | `6` | Scripts per anonymous session per hour. |
| `CONTENT_API_ORIGINS` | *(unset)* | CORS allowlist. Never a wildcard. |

---

## Who needs what

Writing a script buys nothing, so it stays open. The calls that spend money and
publish do not.

| Route | Credential |
|---|---|
| `POST /demo/make-video`, polling, `script.md`, `/video` | None — but bound to the caller's session |
| `POST /produce`, `POST /approve`, `/claim`, `/demo/jobs`, `/demo/spend`, `/demo/videos` | Tenant bearer token |
| `GET /api/v1/*` (except `/` and `/health`) | Tenant bearer token |

A caller who is not the owner of a job gets **404**, identical to a job that
never existed. A 403 would confirm the id is real.

---

## Token rotation

1. Generate the new value.
2. Set it in Railway. For the cookie secret, move the old value to
   `OWNER_COOKIE_SECRET_PREVIOUS` first — both are accepted, so nobody is logged
   out mid-job.
3. Send the new credential through something that is not chat. A token that
   reaches someone in a chat message is exposed regardless of how carefully it is
   handled afterwards.
4. Remove `OWNER_COOKIE_SECRET_PREVIOUS` once a month has passed.

---

## The catalogue manifest

`server/catalogue-manifest.json` records which videos are committed to git, so
the running service can tell a durable catalogue row from one that vanishes on
the next redeploy. It cannot be computed at runtime — `.dockerignore` excludes
`.git`, so git is absent from the image *and* from the build.

Rebuild it whenever a video is added or removed:

```bash
node scripts/build-catalogue-manifest.js
node scripts/build-catalogue-manifest.js --check   # CI: fails if stale
```

If the manifest is missing, rows report `durability: "unknown"` rather than
guessing. An LMS declining to link an `unknown` row costs a lookup; a row wrongly
called durable is a dead question inside a university course.

---

## Before pushing

```bash
npm run lint
npm test                                          # 3 suites
node scripts/build-catalogue-manifest.js --check
bash .claude/scripts/smoke-test.sh
```
