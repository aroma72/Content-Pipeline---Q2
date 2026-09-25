---
type: reference
last_verified: 2026-09-25
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

The container has no persistent disk. Jobs, the spend ledger, idempotency records
**and the course queue** are written to a directory resolved in this order:

| Order | Source | Durability reported |
|---|---|---|
| 1 | `JOB_STORE_DIR` | `container`, or `volume` with `JOB_STORE_DURABLE=1` |
| 2 | `RAILWAY_VOLUME_MOUNT_PATH` + `/cq-jobs` | `volume` |
| 3 | repo root `/.jobstore` | `container` |
| 4 | OS temp | `ephemeral` |
| 5 | nothing writable | `memory` — **producing is refused** |

**Attached on 2026-09-18** — `content-queen-volume`, 50 GB at `/data`, so `/health`
reports `volume`. Kept here because it has to be redone for any new environment.

**Attach a Railway volume and nothing else needs doing.** Railway injects
`RAILWAY_VOLUME_MOUNT_PATH` automatically, the store relocates onto it, and
`/health` starts saying `volume`. No code change, no redeploy of config.

Until then `/health` says `container`: jobs survive a crash and a restart, not a
redeploy. That is the honest position, not a failure — but a 25-minute produce
run followed by an open-ended human review is exactly the window a redeploy
lands in, so this is the difference between losing a job and losing the money
that job spent.

### What a redeploy still costs, once the volume is attached

The queue is durable, so the **course** survives. The lesson that was mid-build
does not, and cannot be made to: `orchestrator/.runs/` and the per-video working
directories (`art/`, `audio/`, `frames/`, `out/`) are excluded from the image and
do not come back. Resuming from saved run state would tell the spine to skip art
that no longer exists.

So the honest claim is bounded, not absolute: **a redeploy costs at most the one
lesson in flight (about $1.50 and 30 minutes), never the course.** That lesson is
parked as `blocked` with `interrupted: true` and waits for a person — approving it
rebuilds it, rather than publishing a video that was never rendered.

`orchestrator/queue.jsonl` and `orchestrator/.runs` are in `.dockerignore`. Without
those two lines a developer's local queue ships inside the image, and every
redeploy replaces production's course state with a snapshot of a laptop.

`numReplicas` must stay `1`. A Railway volume cannot be shared, and the store
assumes a single writer.

---

## Environment variables

### Required for the creation API to work at all

| Variable | What happens without it |
|---|---|
| `CONTENT_API_TOKEN` | The whole API answers 503 `api_not_configured`. Fails closed rather than serving answer keys openly. |
| `PIPELINE_MAX_APPROVABLE_USD` | Every `/produce` answers 503 `no_budget`. |
| `PIPELINE_BUDGET_USD` | **Every course lesson blocks at produce** with "Paid art/TTS not approved". Single videos are unaffected — they authorise against `PIPELINE_MAX_APPROVABLE_USD` instead, which is why a deployment can look correct and still build no courses. It was missing from this list until 2026-09-20, which is exactly how that happens. About $1.50 buys one lesson. |
| `OWNER_COOKIE_SECRET` | Anonymous demo sessions do not survive a restart — a visitor loses the job they just started. 32+ random bytes. |

### Required before another organisation can create videos

| Variable | Shape |
|---|---|
| `TENANTS_JSON` | A JSON **array**. One variable, not four per tenant, because Railway has no atomic multi-variable save — four would leave a window where a live token has no budget. Each entry may carry `maxRunUsd`, which since 2026-09-23 also caps a course lesson's media budget. |
| `PIPELINE_COURSE_LESSON_RESERVE_USD` | Optional, default `2.50`. What `POST /api/v1/courses/build` reserves per lesson on the tenant ledger before queueing; settled to the real cost when the lesson ends. Keep it at or above the LMS's own per-lesson hold. |

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

A variable set to an **empty string** counts as unset, not as zero. `Number('')` is
`0`, so a blank `PIPELINE_BUDGET_USD` used to read as "somebody authorised nothing"
and silently blocked every lesson while looking configured in the dashboard.

### Minting the LMS its own tenant (still open — Aroma's hands)

The LMS is on the shared `default` credential: no ceiling, its spend indistinguishable
from ours on `/demo/spend`, and the token is in git history. Once, from PowerShell:

```powershell
node scripts/mint-tenant.js --id cohort2-lms --name "Cohort 2 LMS" --monthly 10
# add "maxRunUsd": 4 to the entry by hand (the script has no flag for it), then:
node scripts/mint-tenant.js --check --file <the saved json>
# paste the array into TENANTS_JSON on Railway, rotate CONTENT_API_TOKEN, redeploy
curl -s https://content-queen-production.up.railway.app/health | jq .tenants.ids
```

`maxRunUsd 4` caps one lesson's media spend below the service ceiling; `monthly 10` buys
about four lessons at the $2.50 reservation. Hand the LMS the token out of band, never in a
document. After the redeploy, `POST /api/v1/courses/worker/resume` restarts the queue.

### The YouTube grant — whose channel the videos land on

| Variable | What it is |
|---|---|
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | A **Desktop app** OAuth client in the **`cohort2lp`** Google Cloud project. Desktop is required, not a preference: `youtube-auth.js` redirects to an ephemeral loopback port and only Desktop clients accept an arbitrary one. |
| `YOUTUBE_REFRESH_TOKEN` | Minted by `node orchestrator/youtube-auth.js`, consented as `taleemabad.university@taleemabad.com`. Carries the `youtube.upload` scope alone. |

Uploads land on **Taleemabad University** (`@TaleemabadUniversity`) — verified 2026-09-24
by publishing an unlisted video and reading `author_name` back from YouTube's public
oEmbed endpoint. That is the only available check: the upload-only scope cannot read the
channel, so a passing `youtube-auth.js --check` proves the credential mints and says
nothing about the destination. **Until 2026-09-24 this was a personal channel**, and no
document recorded which one — hence this table.

The consent screen is **Internal**. That is what stops the refresh token expiring every
7 days, which is what an External app left in *Testing* does.

Rotating this pair is not free elsewhere: `GDRIVE_CLIENT_ID` / `_SECRET` fall back to it,
and a Google refresh token is bound to the client that issued it. A Drive grant minted
against the old client stops working the moment these change. No Drive token existed when
they were last rotated, so nothing broke that time.

### Required for the Drive offload (otherwise the volume fills and never drains)

A finished video is uploaded to Taleemabad University's Google Drive and the local
copies are then reclaimed. **Unset these and nothing breaks** — the service behaves
exactly as it did before the offload existed, which also means the 50 GB volume
grows monotonically until a full-volume resize restarts the service mid-render.

| Variable | Default | Effect |
|---|---|---|
| `GDRIVE_REFRESH_TOKEN` | *(unset)* | OAuth refresh token scoped to `drive.file`. **The existing `YOUTUBE_REFRESH_TOKEN` will not work** — a Google refresh token is bound to the scopes it was consented with, and that one carries `youtube.upload` alone. Mint this one with `node orchestrator/gdrive-auth.js`, signed in as the Taleemabad University account. |
| `GDRIVE_FOLDER_ID` | *(unset)* | The target Drive folder. Currently `UnPublished-CQ-Videos`, which sits on a **Shared Drive** — so the files are owned by the Drive rather than by a person and survive anyone leaving. |
| `GDRIVE_CLIENT_ID` / `GDRIVE_CLIENT_SECRET` | falls back to the `YOUTUBE_` pair | Only needed if Drive should use a different OAuth client. The same Google Cloud project and account serve both, so normally leave these unset. |

Two separate tokens rather than one re-consented for both scopes, deliberately: it
keeps publishing and Drive in separate failure domains, so a botched Drive consent
cannot take YouTube uploads down with it.

Check it without uploading anything:

```bash
node orchestrator/gdrive-auth.js --check      # scopes + folder, prints no secret
node scripts/offload-deliverables-to-drive.js # DRY RUN by default; says what it would move
```

`--check` reporting that the folder is *not visible* is **expected, not an error**:
under `drive.file` a folder this client did not create is invisible by design. Only
a real upload settles it — `--yes --limit 1`.

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
| `PIPELINE_COURSE_STOP_AFTER` | `upload` | The last stage a **course** lesson runs. `review` comes first in the stage order regardless, so the lesson is built, pauses for a person, and only publishes once approved — unlisted and flagged for review. Setting this before `review` means no lesson ever pauses and none is ever published; setting it before `upload` means an approved lesson is never published and `youtubeVideoId` stays null. The service warns at boot in the first case. Courses deliberately do **not** read `PIPELINE_STOP_AFTER`, so a change to the single-video path cannot drag them behind `review`. |
| `PIPELINE_STOP_AFTER` | `qa` | The same, for everything that is not a course. The `qa` **default** is the cautious one for a container with no Google OAuth grant — the video is delivered as a file instead of failing at upload. **Production sets this to `upload`** and has the grant (`YOUTUBE_REFRESH_TOKEN`), so read the variable rather than reasoning from the default. |
| `PIPELINE_DRY_RUN` | *(unset)* | `1` runs the whole chain without spending or rendering. |

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

### Rotating a tenant token

`TENANTS_JSON` is one variable holding an array, so rotating one tenant means
editing that array, not replacing it.

1. `node scripts/mint-tenant.js --id <slug> --name "..." --monthly 50`
2. Merge the printed object into the existing array, replacing only that
   tenant's `token`. Keep the same `id` — spend is attributed by id, and changing
   it orphans the month's ledger.
3. `node scripts/mint-tenant.js --check --file <saved.json>` before pasting. The
   loader fails soft: a short token, a duplicate id or two tenants sharing a
   token are dropped and merely reported on `/health`, so a typo looks like it
   worked until the other organisation cannot authenticate.
4. Set it in Railway, then send the credential outside chat.

A credential that has ever been written into a document is compromised, including
after the document is edited — the value stays in git history and in any PDF
already rendered from it. Rotate it; do not just delete the line.

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

## Before deploying: is a lesson building?

A redeploy restarts the container. A lesson mid-build becomes `blocked / interrupted`, its working
files are gone, and its partial spend is unrecorded — the LMS's authorised lesson went this way on
2026-09-23 at 06:11Z, three minutes after we had started it for them, with `/health` saying
`building: true` the whole time.

```bash
node scripts/predeploy-check.js          # exit 1 while a lesson is building
node scripts/predeploy-check.js --wait   # poll every 30s until the worker is idle, then exit 0
```

Read-only, one GET. Put it in front of the push, never after.

## Before pushing

```bash
npm run lint
npm test                                          # 3 suites
node scripts/build-catalogue-manifest.js --check
bash .claude/scripts/smoke-test.sh
```
