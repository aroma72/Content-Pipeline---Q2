---
type: reference
last_verified: 2026-09-01
owner: Aroma Tahir
---

# Content Queen inside Taleemabad University — design

**Goal.** Content Queen becomes a module of Taleemabad University: a tab where Aroma sees every
video the pipeline has made and talks to the agent to make more. Not a content export — a product
surface rented inside their app.

**Non-goal.** Learner-facing delivery. No learner watches anything through this console, and no
assessment, grading or gradebook is in scope. Those remain AUTONOMY_PLAN items 2.2 / 4.2.

---

## 1. Why this is small

The worker already exists. `server/lib/tick.js` (597 lines) turns a human sentence into a queue
item, dispatches it through the orchestrator spine, handles spend approval, handles review
verdicts, and reports back. Slack is a *transport* on top of that worker; Notion is the ticket
store.

So the console is **a third front door on a server that is already deployed**, not a new system.

```
Taleemabad University (their app)
  └─ iframe: /console  ──┐
                         ├──→ Railway `content-queen` ──→ tick.js ──→ spine
Slack #aromas-content-queen ─┘                              research→script→gate→produce→qa→upload
```

## 2. Components

| Component | Responsibility | Depends on |
|---|---|---|
| `server/lib/channel.js` | The `{ say(text), attach(file) }` reply interface, with `slackChannel` and `consoleChannel` implementations | nothing |
| `server/lib/console/session.js` | Auth: standalone mode and embed mode, both resolving to one session cookie | `config` |
| `server/lib/console/stream.js` | SSE fan-out per conversation; reconnect via `Last-Event-ID` | `channel` |
| `server/lib/console/library.js` | Reads `.beads/runs.jsonl` → video cards | `paths` |
| `server/lib/console/ui.js` | The single chrome-less HTML page | nothing |
| Routes in `server/index.js` | `GET /console`, `POST /console/messages`, `GET /console/stream` | all of the above |

Each is separately testable, and none reaches into `tick.js` internals — `tick.js` changes only
by receiving a `channel` instead of calling `slack.say` directly.

### The one real refactor

`tick.js` hardcodes Slack as the reply path. Extracting `channel.js` is the difference between
the console sharing the worker and the console duplicating 600 lines of it. Both surfaces then
drive the identical code path, so a run started in the console can be approved from Slack and
vice versa.

**Constraint:** the 61 regression tests in `orchestrator/test-regressions.js` and
`tick._internals` tests must stay green through this refactor. It is a pure extraction; behaviour
changes are out of scope.

## 3. Conversation identity

The console creates the **same Notion ticket** a Slack mention creates, and keys its thread on the
ticket page-id — already the context key in the existing design. One audit trail; no second source
of truth.

The existing ticket dedupe key must be reused, not reinvented. Without it, one request arriving on
two surfaces becomes two paid renders — the same failure class already documented for Slack's
`search.messages` having no `since`.

## 4. Data flow

```
type in the iframe
  → POST /console/messages   → parseRequest() → Notion ticket → 202 in milliseconds
  → GET  /console/stream     ← consoleChannel.say() pushes as each stage lands
       tick.js dispatch()    → spine: research → script → gate → produce → qa → upload
  → "show me my videos"      → library.js reads runs.jsonl → cards
```

A run takes ~30 minutes and never sits on an HTTP request. Same acknowledge-fast / report-later
contract Slack already uses. **The SSE stream is a convenience, never the record** — replies also
land on the Notion ticket, so a dropped connection loses nothing.

## 5. Embedding, and why it dodges the blocker

The whole ask to Taleemabad's engineering team:

> Add a "Content Queen" nav item for admin users that renders an iframe pointing at
> `https://content-queen-production.up.railway.app/console?t=<token>`, where `token` is
> base64url of `HMAC-SHA256(JSON({sub, role, exp}), SHARED_SECRET)` with `exp` five minutes out.
> We supply the shared secret. We need your exact origin for our CSP. No API, no schema, no data
> exchange.

The console verifies the token, sets a `SameSite=None; Secure` session cookie, and sends
`Content-Security-Policy: frame-ancestors <their-origin>`.

This needs **no** content-write API from them, so AUTONOMY_PLAN **1.2** and **2.2** stay blocked
and this still ships. It needs **no** push access to `Orenda-Project/Intelligence-Platform`,
which we do not have (1.1 is pull-only).

### Standalone mode

Until they act, `/console` runs at its own URL. Auth is a single pre-shared secret in
`CONSOLE_ACCESS_TOKEN`, supplied once as `/console?k=<secret>` and then held in the same session
cookie the embed path sets. No email, no password store, no user table — there is one user.

Both modes therefore converge on one code path after the first request: *establish a session
cookie, or render 401 in place.* `session.js` differs only in which credential it accepts, chosen
by whether `CONSOLE_EMBED_SECRET` is configured.

## 6. Storage: YouTube unlisted

Decided 2026-09-01. Finished videos live as **unlisted YouTube videos**; the console stores the
returned URL in the run log and embeds the player.

Rationale: `orchestrator/lib/stages/upload.js` is already complete and returns a live URL;
`orchestrator/youtube-auth.js` already implements the one-time consent; thumbnails are derivable
as `https://i.ytimg.com/vi/<id>/hqdefault.jpg` with no API call; and it is the same rail the
learner-facing path (2.2) will eventually use.

**Why storage is in scope at all.** Before this decision there was nowhere durable a video lived:
`*.mp4` and `published/` are gitignored, Railway wipes the container filesystem on redeploy (the
Dockerfile says so, and points at a `docs/DEPLOYMENT_PREREQS.md` that does not exist), and
`upload` fails closed. A console for seeing your videos had nothing to show.

### Three consequences that must be implemented

1. **The refresh token cannot live on disk in production.** `youtube.js:24` writes
   `orchestrator/.credentials/youtube-token.json`, inside the ephemeral filesystem. Authorising
   locally grants nothing to Railway, and the first redeploy silently de-authorises uploads. Carry
   it as a `YOUTUBE_REFRESH_TOKEN` env var, with the file as local-dev fallback.
2. **`PIPELINE_STOP_AFTER` flips from `qa` to `upload`** (`config.js:50`), or runs stop before the
   video is ever uploaded.
3. **The upload scope is write-only** and cannot list videos. The console reads URLs from
   `runs.jsonl`; YouTube is never queried.

## 7. The library, inside the chat

"Show me all the videos" is a chat message, answered with cards — no separate library page.
Sourced from `.beads/runs.jsonl`, whose rows carry `topic`, `slug`, `status`, `stageMs`,
`spendUsd`, `interventions` and `artifacts.*`. Per card:

| Field | Source |
|---|---|
| Title / topic | `artifacts.script.title` ?? `topic` |
| Series | queue item |
| QA score | `artifacts.qa.combined_score` (**not** `.total` — that field never existed) |
| Status | `status`, plus the blocking `intervention.detail` when blocked |
| Cost | `spendUsd` |
| Player + thumbnail | `artifacts.upload.url` → video id |

Rows with no upload artifact render as cards without a player, stating why they are blocked. That
is the honest display, and it is also most of the current log.

## 8. Failure modes

| Failure | Handling |
|---|---|
| Bad / expired embed token | 401 rendered *inside* the frame. Never a redirect — a redirect in an iframe is invisible. |
| Another origin frames it | `frame-ancestors` naming their origin only. Never a wildcard. |
| SSE drops mid-run | Reconnect with `Last-Event-ID`; Notion ticket remains the durable record. |
| Same request on two surfaces | Existing ticket dedupe key, reused. |
| Spend above cap | Existing `Blocked` + `[approval:<usd>]` flow, surfaced as an approve button. **Silence is never consent.** |
| YouTube grant revoked | `upload` already raises `BlockedError` naming the fix; surface that text in the chat verbatim. |
| Anthropic path down | `llm-router` defaults to the `cli` backend on the Claude Code subscription and falls back to the API key. Report the router's own note rather than inventing a diagnosis. |

## 9. Build order

| Slice | Work | Outcome |
|---|---|---|
| **0** | YouTube client id/secret, one-time `youtube-auth.js`, refresh token into Railway env, flip `STOP_AFTER` | Videos durable and addressable. **Human action, not code.** |
| **1** | Delete the §11 scaffolds; extract `channel.js` from `tick.js` | Invisible. Unlocks everything. Regression tests stay green. |
| **2** | `/console` + messages + SSE + chat UI + standalone auth | A working console at its own URL. |
| **3** | `library.js` + cards | The library, in the chat. |
| **4** | Embed mode: HMAC verify, cookie, CSP | Drops into their iframe when they add it. |

Slices 1–4 are independently shippable. Slice 0 gates only the player in slice 3.

## 10. Testing

- `channel.js`, `session.js`, `library.js` are pure and unit-tested with no HTTP.
- Token verification is tested for: valid, expired, wrong secret, tampered payload, missing.
- `library.js` is tested against real `runs.jsonl` rows, including blocked runs with no upload
  artifact and the `combined_score` / absent-`total` case.
- `orchestrator/test-regressions.js` (61 tests) must pass unchanged after slice 1.
- A dry run does **not** exercise the spend-approval gate (`produce.js` skips it under `dryRun`),
  so console spend approval is unit-tested via `tick._internals.report_result`, never demonstrated
  by a green dry run.

## 11. Scaffolds to delete first

Three places already claim to integrate with an LMS, all against a **guessed** endpoint
(`LMS_BASE_URL=https://api.taleemabad.com`, `LMS_API_KEY`) that AUTONOMY_PLAN 2.2 says is wrong:

| Location | What it does |
|---|---|
| `agents/distribution_agent.py:164-174` | Validates a payload and `POST`s videos to `LMS_BASE_URL` |
| `agents/learner_pack_publisher_agent.py:9` | Imports the same credentials; writes "metadata JSON for LMS ingestion" |
| `.env.example` | Advertises both variables as if the contract were known |

They are inert only because the variables are unset — `distribution_agent` guards on
`if self.lms_api_key and self.lms_base_url`. **This is a trap for exactly this project:** setting
`LMS_API_KEY` while wiring up the console would arm an untested push to an endpoint nobody has
confirmed exists, from a code path nobody is watching.

Delete all three before slice 1, so there is exactly one LMS integration path and it is the one in
this document. If any of that Python is still wanted for a future learner-facing push (2.2), it
should be rewritten against a real spec, not resurrected.

## 12. Open questions

1. **Their exact origin** for `frame-ancestors`. Blocks slice 4 only.
2. **Who else may open the console.** Assumed: admin role only, single user. If other staff get
   access, `role` in the token becomes meaningful and needs a permission model.
3. **`docs/DEPLOYMENT_PREREQS.md` is referenced by the Dockerfile and does not exist.** Either
   write it or drop the reference; not this build's job, but it is why the persistence trap in §6
   was undocumented.
