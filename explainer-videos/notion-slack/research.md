---
type: research-brief
last_verified: 2026-09-02
owner: Aroma Tahir
---

# Module 14 — Research Brief: connecting an agentic project to Notion and Slack

Scope: what a **beginner** must actually do, in order, for a Notion + Slack integration to go
smoothly — and the specific errors they will hit if they skip a step. Six videos.

---

## A. Verified facts to teach (each with source + date)

| # | Fact | Source | Date |
|---|------|--------|------|
| F1 | There are two ways in, not one: a **hosted MCP connector** (OAuth, no tokens to manage, tool schemas maintained by the vendor) or an **API token** (your own code, headless, event-driven). MCP is "the right default for nearly everyone" working *interactively* in a chat/IDE client; the API is required for anything that must run unattended or react to events, because MCP has no event-subscription surface. | [scalekit.com — Notion MCP vs Notion API](https://www.scalekit.com/blog/notion-mcp-vs-api) · [StackOne](https://www.stackone.com/blog/notion-mcp-deep-dive/) | 2026 |
| F2 | Notion's hosted MCP server is `https://mcp.notion.com/mcp`, OAuth-only, added in Claude Code with `claude mcp add --transport http notion https://mcp.notion.com/mcp` then `/mcp` to authorise. | [developers.notion.com — Connect to Notion MCP](https://developers.notion.com/guides/mcp/get-started-with-mcp) · [Notion blog](https://www.notion.com/blog/notions-hosted-mcp-server-an-inside-look) | 2026 |
| F3 | Slack ships an **official Slack-hosted MCP server** at `https://mcp.slack.com/mcp`, GA **17 Feb 2026**, user-token OAuth, inherits the authenticating user's permissions and **requires workspace-admin approval**. It replaced Anthropic's reference implementation (archived May 2025). | [docs.slack.dev — Connect to Claude](https://docs.slack.dev/ai/slack-mcp-server/connect-to-claude/) · [usecarly.com](https://www.usecarly.com/blog/slack-mcp/) | 2026-02-17 |
| F4 | **Creating a Notion integration grants it zero access.** You must open each page/database, then `...` → **Connections** → add the integration. Parent pages must be shared too — sharing only a child is not enough. Skipping this returns HTTP **404 `object_not_found`**: "The page, database, or block either does not exist or has not been shared with your integration." This is the single most common Notion API error. | [makenotion/notion-mcp-server #81](https://github.com/makenotion/notion-mcp-server/issues/81) · [SFAI Labs — Notion API key setup](https://sfailabs.com/guides/how-to-get-notion-api-key) | 2026 |
| F5 | Slack bot token (`xoxb-`) lives under **OAuth & Permissions**; posting needs `chat:write` (plus `chat:write.public` to post in public channels it has not joined). **Every new scope requires reinstalling the app.** Without `chat:write.public`, or in a private channel, posting fails with **`not_in_channel`** until you run `/invite @yourbot`. | [docs.slack.dev — Scopes](https://api.slack.com/scopes) · [Prismatic Slack component docs](https://prismatic.io/docs/components/slack/) | 2026 |
| F6 | Notion API version **2025-09-03** split databases from **data sources**: a database is now a *container* of one or more data sources. `POST /v1/databases/:id/query` becomes `POST /v1/data_sources/:id/query`; retrieving/updating a schema and creating pages also move to `data_source_id`. **Database IDs and data source IDs are not interchangeable.** The required discovery step: call `GET /v1/databases/:database_id` with `Notion-Version: 2025-09-03` and read the returned `data_sources` array, then persist that `data_source_id`. | [developers.notion.com — Upgrade guide 2025-09-03](https://developers.notion.com/docs/upgrade-guide-2025-09-03) · [Upgrade FAQs](https://developers.notion.com/docs/upgrade-faqs-2025-09-03) | 2025-09-03 |
| F7 | The `Notion-Version` header is **required** and versions are named for their release date; Notion has continued shipping versions through 2026 (2026-02-01, 2026-03-01, 2026-04-01 among them). Teachable rule: **pin a version you have tested and read the upgrade guide before bumping it** — do not teach "the latest version is X", it moves. | [developers.notion.com — Versioning](https://developers.notion.com/reference/versioning) | 2026 |
| F8 | Notion enforces an average of **3 requests per second per integration** (~2,700 per 15 min), on all plans, with no paid tier for more. Handle **429** by reading the **`Retry-After`** header (integer seconds) and pausing at least that long; queue and serialise calls rather than bursting. | [developers.notion.com — Request limits](https://developers.notion.com/reference/request-limits) | 2026 |
| F9 | Slack allows **no more than one message per second per channel** (whether via `chat.postMessage`, an incoming webhook, or anything else); short bursts tolerated. Web API methods sit in tiers (Tier 1 = 1+/min … Tier 4 = 100+/min) per method, per workspace, per app. Sustained overrun returns **HTTP 429** `rate_limited` with a **`Retry-After`** header. | [docs.slack.dev — Rate limits](https://docs.slack.dev/apis/web-api/rate-limits/) | 2026 |
| F10 | Slack Events API: your endpoint must return **HTTP 200 within 3 seconds**. If it does not, Slack **retries three times** over a few minutes — so if you do the real work (write to Notion, post a message) *before* acknowledging, you get **duplicate actions**. Fix: acknowledge first, then work; deduplicate on the stable **`event_id`**, not on the retry counter. | [docs.slack.dev — The Events API](https://docs.slack.dev/apis/events-api/) · [Question Base writeup](https://www.questionbase.com/resources/blog/slack-events-api-acknowledgement-requirements-what-every-developer-needs-to-know) | 2026 |
| F11 | **Socket Mode** delivers events over a persistent WebSocket instead of a public HTTP endpoint — the correct choice for local development, machines behind a firewall, or anywhere you cannot expose a URL. | [docs.slack.dev — The Events API](https://docs.slack.dev/apis/events-api/) | 2026 |
| F12 | Notion webhooks: on creating a subscription Notion POSTs a one-time **`verification_token`** to your URL, which you paste back into the integration's Webhooks tab to activate — and which then doubles as the **signing secret**. Every delivery carries **`X-Notion-Signature`** (HMAC-SHA256 of the body). Lose the token and you must delete and recreate the subscription. | [Hookdeck — securing Notion webhooks](https://hookdeck.com/webhooks/platforms/how-to-secure-and-verify-notion-webhooks-with-hookdeck) · [developers.notion.com — Webhooks](https://developers.notion.com/reference/webhooks) | 2026 |
| F13 | A token committed to a public GitHub repo is detected by **secret scanning** (200+ token formats, 100+ providers, including Slack tokens and webhooks) and **reported to the provider, who may revoke it immediately** — often before the developer sees the alert. Slack also proactively hunts for its own leaked tokens and disables them. Practice: env vars or a secrets manager, least privilege, rotate. | [GitHub Changelog — secret scanning validation for Slack](https://github.blog/changelog/2024-04-11-secret-scanning-changes-to-detection-and-validation-for-google-cloud-platform-slack/) · [GitGuardian — remediating Slack bot token leaks](https://www.gitguardian.com/remediation/slack-bot-token) | 2024-04-11 / 2026 |
| F14 | Human-in-the-loop means the agent **proposes and a human approves before the action happens** — "the key word is before". Put the human where an error is expensive, irreversible, legally significant or hard to detect; let the agent read freely, watch it on a dashboard, and stop it before the irreversible thing. Log the proposed action, approver, timestamp, edits and final state. | [Velt — AI agent approval layer](https://velt.dev/blog/why-ai-agents-need-approval-layer) · [Strata — 2026 guide to HITL](https://www.strata.io/blog/agentic-identity/practicing-the-human-in-the-loop/) | 2026 |

---

## B. Strongest analogies found

**USE — the hotel key card (for tokens + scopes).** "The front desk doesn't give you a master key. They
give you a keycard that opens only your room — and only for the length of your stay. Secure. Limited.
Revocable." Scopes are which doors the card opens.
([Okta](https://developer.okta.com/blog/2019/06/05/seven-ways-an-oauth-access-token-is-like-a-hotel-key-card), 2019 — the analogy is evergreen.)
It carries the Notion twist perfectly: in Notion you also have to **hand the card to the room** (share the
page), or the card opens nothing.

**USE — the doorbell vs the mailbox (for events vs polling).** "Polling is checking your mailbox every hour
for a package. A webhook is the delivery person ringing your doorbell when it arrives."
([Merge](https://www.merge.dev/blog/webhooks-vs-polling), 2026.)

**AVOID — "the agent joins your team like a new colleague."** Misleads on permissions: a colleague can ask
someone for access, an integration silently gets a 404 and stops. It also feeds the "it just knows our
workspace" misconception (M1 below).

**AVOID — plumbing / "wiring it up".** Beginners already believe the hard part is code. The hard part is
**permissions**, and pipe metaphors hide that.

---

## C. Top learner misconceptions → these become the failure-mode beats

- **M1. "I made the integration / installed the app, so it can see my workspace."** No. Notion access is
  granted page by page (F4) and Slack posting needs both a scope and channel membership (F5). This is the
  number-one beginner wall and owns **video 3**.
- **M2. "An ID from the browser URL is the ID the API wants."** Since 2025-09-03 the thing you query is a
  **data source**, discovered from the database (F6). Owns **video 4**.
- **M3. "My handler can do the work and then reply to Slack."** Three seconds, three retries, three copies
  of the same action (F10) — plus the bot that replies to its own message and loops. Owns **video 5**.
- **M4. "I should build with the API because that's the real way."** For interactive work the connector is
  faster and safer; the API earns its keep when the job runs unattended or reacts to events (F1). Owns
  **video 2**.
- **M5. "Secrets in the code are fine, it's a private repo."** F13. Owns **video 6**.

---

## D. Current names / numbers safe to put on an `info` card

`https://mcp.notion.com/mcp` · `https://mcp.slack.com/mcp` (GA 17 Feb 2026) ·
`claude mcp add --transport http notion https://mcp.notion.com/mcp` ·
`xoxb-` bot token · `chat:write`, `chat:write.public` · `/invite @yourbot` ·
404 `object_not_found` · `not_in_channel` · `missing_scope` ·
`Notion-Version: 2025-09-03` · `GET /v1/databases/:id` → `data_sources[]` →
`POST /v1/data_sources/:id/query` · Notion **3 requests/second** · Slack **1 message/second/channel** ·
**3 seconds** to acknowledge, **3** retries, dedupe on `event_id` · 429 + `Retry-After` ·
`.env` + `.gitignore` · `X-Notion-Signature`

**Do not put on a card:** "the latest Notion API version is …" (F7 — it moves). Say *pin your version*.

---

## E. Best teaching technique for this topic

**Error-first, contrast pair.** For integration work the durable teaching unit is
*"here is the exact error message → here is the one setting that causes it"*. Beginners do not fail at
concepts, they fail at four or five specific 404s and permission errors, and they cannot tell a permission
message from a code bug. So each video stages the real error on screen, names it, and hands over the single
fix — paired against the working version (before → after). Secondary technique: **one worked example run
in depth** (one Notion table, one Slack channel, one action) rather than a survey of possibilities.

Ordering follows the actual smooth path: *decide what crosses the boundary (1) → pick the door (2) →
get permission right (3) → write structured data (4) → speak without spamming (5) → make it safe (6)*.
