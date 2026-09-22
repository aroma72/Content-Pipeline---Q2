---
type: reference
last_verified: 2026-09-21
owner: aroma
---

Where the service runs, how it gets there, and the env it depends on.

**Scope:** the deployed Drawing Room service. Video-production mechanics live in
`pipeline-mechanics.md`; the durability contract lives in `docs/SERVICE_DURABILITY_AND_CONTRACTS.md`,
which is the source of truth for anything about the job store.

---

## 1. The deploy command, and the trap in it

```
git push origin <branch>:main
railway redeploy --from-source -y
```

`--from-source` pulls **main**. Any work not merged to main is **rolled back** by the redeploy.
Push first, then redeploy — never redeploy to "pick up" a local change.

## 2. Runtime

Verified 2026-09-21 from `railway.json` and `package.json`:

| | |
|---|---|
| Builder | `DOCKERFILE` (`Dockerfile` at repo root) |
| Start command | `node server/index.js` |
| Health check | `GET /health`, 120s timeout |
| Restart policy | `ON_FAILURE`, max 3 retries |
| Replicas | 1 |
| Node deps | `@anthropic-ai/sdk`, `express`, `dotenv`, `@slack/web-api`, `ffmpeg-static`, `@ffmpeg-installer/ffmpeg` |

`numReplicas: 1` is load-bearing for anything that assumes a single writer to the job-store volume.
Raising it needs the durability contract re-read first.

## 3. Environment

Names present in `.env` as of 2026-09-21 (values are never recorded here, and `.env` is gitignored):

- **Pipeline control** — `PIPELINE_STOP_AFTER`, `PIPELINE_BUDGET_USD`, `PIPELINE_MAX_APPROVABLE_USD`, `PIPELINE_DRY_RUN`, `LLM_BACKEND`, `TICK_INTERVAL_MS`, `TICK_SECRET`
- **Railway-injected** — `RAILWAY_ENVIRONMENT`, `RAILWAY_VOLUME_MOUNT_PATH`, `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_SERVICE_*`, `RAILWAY_PROJECT_*` (plus siblings)
- **Media & AI** — `GEMINI_API_KEY`, `GOOGLE_STUDIO_API_KEY`, `KIE_API_KEY`
- **Integrations** — `CONTENT_API_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_USER_TOKEN`, `SLACK_DEFAULT_CHANNEL`, `SLACK_BOT_USER_ID`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `NOTION_PARENT_PAGE_ID`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`
- **Harness** — `CLAUDE_CODE_OAUTH_TOKEN`

**There is no `ANTHROPIC_API_KEY` in this environment.** Anything that assumes one must degrade
gracefully rather than fail — `.claude/memory-db/mem.py` is written that way deliberately.

## 4. Read production, not the defaults

Before diagnosing anything deployed, read the live values:

```
railway variables
railway ssh 'printenv PIPELINE_STOP_AFTER'
```

On 2026-09-20, three defaults in `server/lib/config.js` disagreed with production and a fix
designed against the defaults removed publishing that already worked. `railway ssh '<read-only
command>'` reaches the volume; `railway run` does **not** — it runs locally against the remote
environment. Full account: `lessons.md` §H4.

## 5. Pre-push gate

```
bash .claude/scripts/smoke-test.sh
```

Installed as a git pre-push hook by `bash scripts/install-hooks.sh` (once per clone; also installs
pre-commit). `--no-verify` is the documented escape hatch and should be rare enough to explain.

---

## Invalidation triggers

Service rename or delete · public URL change · a new or removed env var · volume change ·
`railway.json` edit · replica count change · CI workflow redesign.
