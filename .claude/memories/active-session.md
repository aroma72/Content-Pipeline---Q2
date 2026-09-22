# Active Session

The HOT tier. Current work and what the next session must pick up — nothing that would still be
true in three months (that belongs in a warm file; see `.claude/standards/MEMORY_TIERS.md` §1).

Kept under `DR_ACTIVE_SESSION_BUDGET` lines (default 300) by `rotate-active-session.sh`, which
moves whole dated `## YYYY-MM-DD` sections out to `session-archive/` at session end. The dated
heading is load-bearing structure — rotation matches on it and refuses to act without it.

No frontmatter: this file is machine-managed and exempt from the metadata contract.

---

## NEXT_STEPS

- Token rotation, then §7 held video. References stage built but never run with a real API key.

---

<!-- 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21, 2026-09-21 rotated to .claude/memories/session-archive/ -->
<!-- 2026-09-22, 2026-09-22, 2026-09-22, 2026-09-22 rotated to .claude/memories/session-archive/ -->
## 2026-09-22

### Railway memory (~250 MB steady) — what it actually is
Asked "what's taking this memory and how do I cut cost". Measured, not guessed:
loading the whole server graph locally (express + @slack/web-api + @anthropic-ai/sdk
+ puppeteer + createApp() + tick + course-worker) costs **72 MB RSS / 17 MB heap**.
So the app's own objects are ~1/3 of the plateau. The rest is (a) V8 old-space
headroom — nothing sets `--max-old-space-size`, and Node sizes old space from the
HOST's RAM, the same cgroup-blindness the Dockerfile already documents for
`RENDER_WORKERS`; (b) page cache — Railway reports cgroup memory, which counts
file-backed pages from `/data` (0.8 GB volume: job store, queue, renders).
The plateau is flat for 10+ min at idle, so there is **no leak**. The dip to 100 MB
is a redeploy, not a fix.

**Cost framing to reuse:** 0.25 GB at Railway's ~$10/GB-month is ~$2.50/month.
Memory is not the bill. The bill is CPU during renders (2 headless Chrome at
1920x1080 + ffmpeg) and the paid Gemini art/TTS budget (PIPELINE_BUDGET_USD=50).

**If capping the heap:** put the flag in the START COMMAND
(`node --max-old-space-size=... server/index.js`), NOT in `NODE_OPTIONS` —
NODE_OPTIONS is inherited by every spawned child, so it would also cap the render
workers and OOM a paid render.

Live service: project ContentQueen / service content-queen, US West, 1 replica,
volume 0.8 GB used of 48.8 GB, TICK_INTERVAL_MS=120000.
Nothing was changed on Railway — advice only, pending Aroma's call.

**Care:** `railway variables` with no filter prints every live token in full to the
transcript. Filter it (`| grep -Ei "TICK|RENDER|..."`) when you only need tuning vars.

### Correction + the real finding: frames are never deleted after encode
The billing panel (Project Cost) overturned the framing above. Memory is **91% of
the bill** ($4.4506 of $4.87), not a rounding error — because the average is
**0.445 GB**, not the 0.25 GB idle plateau (19226.67 GB-min ÷ 43200 min, if that
panel is a 30-day cycle). CPU is $0.34 on 729 vCPU-min ≈ 0.017 vCPU average: the
box holds memory almost entirely while doing nothing.

**Root cause of the multi-GB RAM plateaus (peak 7.13 GB):**
`compile-lesson.js` writes every frame as a PNG to `frames/<NAME>/f_%06d.png`,
ffmpeg reads them back with `-i .../f_%06d.png`, and **nothing ever deletes them
after `encode()`** — `rmrf(framesDir)` runs only at the START of the next
non-`--reuse` render (line ~177). A 6-min lesson is ~10,800 PNGs at 1920x1080.
Those writes and the ffmpeg read-back sit in the cgroup's page cache, which is
what Railway's RAM metric counts. That is the flat multi-GB block, not live
objects — 2 workers x ~1.2 GB per Chrome only accounts for ~2.4 GB of the 7.13 GB
peak. CORRECTION: the frames do NOT land on the volume — they are written under the repo
dir (/app), which is ephemeral. The Volume graph step is commit 3546491 copying the
finished MP4 + beats.js + durations.json onto /data. Page cache from /app writes is
counted by the cgroup just the same, so the diagnosis stands; only the location was
wrong.

Fixes, cheapest first: (1) `rmrf(framesDir)` after a successful `encode()`;
(2) pipe frames to ffmpeg via image2pipe so no PNG hits disk (breaks `--reuse`).
This also matters beyond cost: the volume is 48.8 GB and frame dirs accumulate
per video, so renders will eventually fail on a full disk.

**Lesson worth generalising:** on Railway, a flat multi-GB RAM plateau with near-zero
CPU is page cache from file I/O, not a leak. Look for what the process is writing.

### "Would Postgres be cheaper?" — no, ~45% more, and it misses the driver
Postgres would replace only what is on `/data`: job JSON, ledger, idempotency
records and the queue — metadata measured in MB, contributing ~nothing to the
$4.45 memory line. It would ADD a second always-on service holding ~0.1–0.25 GB
around the clock at the same $0.000231/GB/min, i.e. roughly +$2/month, plus its
own volume. It cannot hold the ~10,800 PNG frames that are the actual excess, and
MP4s as `bytea` would be worse (WAL amplification, and Postgres' buffer cache and
the page cache both count toward the cgroup).

Postgres is a correctness/scaling decision here, not a cost one — it earns its keep
only if numReplicas goes above 1 (a Railway volume cannot be shared, and
`job-store.js` documents single-writer-by-design) or catalogue queries get slow.
Either way it raises the bill.

### The 7.13 GB peak is NOT an OOM risk — and there is no live scaling problem
Two things checked before recommending anything:

1. **Page cache is reclaimable.** The kernel evicts it under pressure rather than
   invoking the OOM killer. The unreclaimable (anonymous) part of a render is
   ~2.4–3 GB: 2 Chromes at the ~1.2 GB `compile-lesson.js` measures, plus ffmpeg and
   Node. So the graph bills 7.13 GB but only ~3 GB can actually kill the process.
   Do not size the box off the RAM graph.
2. **Renders are already serialised.** `course-worker.js` guards with a module-level
   `running` flag (lines 44 / 155), so the peak is one render, never N. And at
   0.017 vCPU average the HTTP side is nowhere near saturated — extra replicas would
   add no render throughput, only webhook capacity nobody needs.

Recommended (in order, all zero-risk): (a) `rmrf(framesDir)` after a successful
`encode()`; (b) `node --max-old-space-size=256 server/index.js` in the START COMMAND
(measured heap is 17 MB, so ~15x headroom); (c) `TICK_INTERVAL_MS` 120000 -> 300000.
Held back: `RENDER_WORKERS=1` (buys OOM headroom, not money — doubles wall-clock so
GB-min is a wash) and image2pipe streaming (kills the page cache but breaks `--reuse`).
Rejected for now: splitting rendering into its own service — it is the right shape
eventually but on Railway it means a second always-on service, i.e. more cost for the
goal of less. Revisit when two lessons must render at once, or the bill passes ~$25/mo.

### NEXT (cost thread)
- Nothing has been changed yet — all of the above is advice pending Aroma's go-ahead.
- If implementing (a), it touches the skill template AND the per-video inlined copies
  under `explainer-videos/*/compile-lesson.js` (10+ files) — they were copied, not
  imported, so a template-only fix silently misses every existing video.
- Unknown worth checking in the Railway UI: the service's actual per-service memory
  limit (plan-dependent). Not knowable from the CLI.

## 2026-09-22 — The references feature was shipped switched off; LMS now has a contract

**`references` returned `[]` on every lesson ever built.** `llm.askWithSearch` hard-required
ANTHROPIC_API_KEY; production holds CLAUDE_CODE_OAUTH_TOKEN and no key; the stage is fail-soft. So
it failed **silently** and looked like "no good references found". A fail-soft stage with a hard
credential requirement is an outage that reports success.

**Fixed in `c4533cc`** (pushed to main; **redeploy still PENDING — the deploy step was refused by
the tooling and needs Aroma to run it**). Added `llm-cli.askWithSearch`; `llm.askWithSearch` falls
back to it when there is no API credential.

Three things that were measured, not assumed:

1. **`--allowedTools` is PERMISSION; `--tools` is whether the tool is OFFERED.** With only the
   former, the model answered from memory, emitted plausible URLs, reported success, and logged
   `web_search_requests: 0`. Both flags are required.
2. **`usage.server_tool_use.web_search_requests` stays 0 on the CLI path** — it counts the API's
   server-side tool, not Claude Code's WebSearch. It therefore CANNOT carry the proof-of-search
   guarantee. `--output-format stream-json --verbose` emits one `tool_use` block per call; count
   those instead.
3. **Search runs on Sonnet, not the pinned Opus.** Opus: 8 searches, ~$1.18 against the plan — about
   the cost of the video it decorates. Sonnet: 4 searches, ~$0.43, same 3 verified references.
   `SEARCH_MODEL` overrides.

Verified inside the Railway container, then end to end locally: 4 searches → 4 proposed → 3 verified
and kept; one dropped for a redirect loop, one for an essay-length `why`.

**E:\Nazim did NOT prove headless search works** — only the subscription-auth pattern. It has
playbook text telling the agent to search, a stale note saying the runner grants no WebSearch, and
an unbuilt plan item to add WebFetch. The probe was ours to run.

**New: `docs/integration-requests/2026-09-22-content-automation-api-reference.md`** — the API
contract the LMS never had. Checked against the LIVE service, not the source. It corrects three
stale beliefs in their client: approve no longer ignores `:courseId` (`notThisCourse`), `blockedBy`
is 10 values not 9, and `references` exists. It states what they could not infer: approve costs $0,
requeue re-spends ~$1.50, a duplicate build shows `queued: 0`, and `/demo/spend` cannot see course
spend.

**Live findings worth keeping:** webhooks are DISABLED in production (`WEBHOOK_ALLOWED_HOSTS`
unset), so any `callbackUrl` is refused 400. `reason` strings come back **mojibake** (UTF-8
double-encoded) and the LMS renders them to instructors.

**Then production refused it anyway — `661b995`.** Running the stage in the container (not trusting
a green local run) surfaced `this workspace has not been trusted`: permitting a tool makes the CLI
read the cwd's `.claude/settings.json` and exit 1 before any model call. Fail-soft swallowed it, so
references came back empty — the same silent outage, new costume. Fixed by spawning the search in
`os.tmpdir()`. See `lessons.md` H23. **Green suite + green CI + successful deploy all missed this.**

### NEXT
1. Confirm the redeploy of `661b995` is live, then **run the references stage in the container
   again** — that is the only proof that counts. Then tell the LMS the toggle is live, with one real
   lesson's `references` output behind it.
2. Aroma still to decide: approve run 4 (`030ebdae3d8c`) for unlisted YouTube.
3. Starred gaps disclosed in the doc and now owed: gate `/demo/course-builder/build`
   (unauthenticated, spends), enforce scopes on `/api/v1`, CORS `DELETE`, set
   `OWNER_COOKIE_SECRET`, fix the mojibake.

## 2026-09-22 — Read the Railway logs; found the diagnostics were switched off

### THE FINDING: production runs with its own diagnostics silenced
`server/lib/one-video.js` passes `quiet: true` (lines 61, 117, 178); `spine.js:156` discards every
stage-level line when set. So preflight, the art purchase, TTS, and EVERY sensor verdict never
reached Railway. Every diagnosis this week was reconstruction from the single `reason` field.

The code's own comment saw it coming and stopped one step short: *"that also silenced WHY a run
failed"* — they fixed the FAILURE case with `log.always` and left everything explaining HOW a run got
there on the silenced channel.

### What the logs showed once read (run 3, job 99eefe884ca1)
Five redrafts: gate ×2 in the write phase, produce ×2 + gate ×1 in produce, then
`"used all 2 of its redrafts -- accepting with a warning and carrying on"`, then BLOCKED at qa-frames.

**Two things no API field could show:**
1. **The script was rewritten five times.** The 20-beat script I inspected and declared verified
   before spending was replaced twice more DURING produce. My caption check was against a version
   that no longer existed — the real reason beat 14 slipped through, beyond the overlay hole.
2. `produce NEEDS WORK` fired **one second** after produce started → a PRE-SPEND sensor caused it.
   Which one was unknowable: that verdict was on the silenced channel.

### Shipped
- `7cb33a2` — stages now get BOTH channels (`stageLog.always`). Promoted to always: preflight, art
  bought, TTS, animation skipped, sensor-could-not-run, accepted-with-warning, volume persist, and
  **the cause named beside every redraft** (the sensor name was inside the error all along; the log
  line printed only the stage it rewound to). 11 always-lines vs 25 still quiet.
  Also ships the overlay fix (validate-beats accepted any truthy overlay).
- `9c8cc7b` — the beat projection now carries `cap`/`art`/`overlay.tpl`/`info.tpl`, and `script.md`
  prints what each beat puts ON SCREEN, or says **"NO WORDS ON SCREEN"**. Previously no surface
  anywhere showed a caption.

### Two testing lessons paid for again
- **A test that asserts a literal source line fails on a rename and passes on a regression.** The
  log-suppression test matched `log: (msg) => log(name, msg)` and broke when that closure was named
  so `.always` could hang off it — while the behaviour was unchanged. Rewritten to assert the
  property, plus the bound it never had: a BUDGET on always-lines in produce (<=20), mutation-tested
  by promoting all 36 and watching it go red.
- **`\b` inside a template literal is a backspace, not a word boundary.** Third time this escaping
  has bitten (see [[H11]]). A test asserting `new RegExp(\`\b\${field}:\`)` matched nothing and
  failed on a field that was present. Use `includes()` or splice by line number.

### NEXT
1. Diagnose 3b (`img.fill` spills 94px) and 3c (46px text on an info beat) using the now-visible beat
   data — **no spend required**. 3c hypothesis: qa-frames' hard-coded STRUCTURED list may not
   recognise that info template, misclassifying it as a bare sentence. UNCONFIRMED.
2. Phase 4: spend is bought before qa-frames but the ledger records $0 on a failed produce.
3. Phase 5: re-run (~$0.60) once 3b/3c are fixed.

### Read the blocked run's beats.js off the VOLUME — all three findings explained, two were the gate

`railway ssh` works. **Note: Git Bash mangles `/data/...` into a Windows path — prefix
`MSYS_NO_PATHCONV=1`.** The beats.js survived TWO redeploys on the volume, which is the durability
work earning its keep: the whole diagnosis cost $0.

| finding | verdict |
|---|---|
| beat 01 `img.fill` spills 94px | **FALSE POSITIVE** — `lesson.html:121` ramps `scale(1.04→1.11)` for the push-in and `body{overflow:hidden}` crops it. Working as designed. |
| beat 13 46px on a text-only slide | **FALSE POSITIVE** — gate bug. Its selector list says `.scoresheet`; the template renders `.scoresheets`. |
| beat 14 draws art but no words | **REAL** — and bigger than thought. |

**Overlay has NEVER worked for any generated video.** `script.js` declares
`overlay: { type: 'string' }` ("optional HTML overlay text") in all 3 schema blocks, and the writer
duly produced `"Per-slice mean · pass→fail count · worst drop"`. `lesson.html:43` asked that string
for `.tpl`, got undefined, drew nothing. A schema/renderer contract mismatch nobody could see until a
gate that measures the rendered frame could finally run.

### Fixed (`f6a011e`, `f2f2985`)
1. `renderOverlay()` in the renderer honours a string (the documented contract) and still accepts
   `{tpl,data}` for the hand-written library; `.overlay-text` styled at 38px.
2. Overflow rule **skips anything a transform is moving**, rather than measuring differently.
3. `hasWindow` derived from **the beat's own mode** (`info` + a tpl = has a picture) instead of a
   hand-maintained CSS selector list that silently drifts.

### The harness earned its keep again
My FIRST fix for #2 accumulated `offsetLeft` instead of using `getBoundingClientRect`. `offsetParent`
skips non-positioned ancestors and an inline `<span>` reports its box differently → it invented a
**201px spill on a fixture that had always passed**. CI caught it in the deploy image for $0. **Lesson:
when a measurement is wrong for one case, prefer excluding that case to changing the instrument.**

### NEXT
Run 4 in flight, job `030ebdae3d8c` (~$0.60). The logs should now name the sensor behind every
redraft. Expect: overlay renders, no bogus overflow, info beats judged as visuals.

### Run 4 (`030ebdae3d8c`): the logging works, and it caught a 3x cost surprise

Production logs now show, for the first time ever:
- the full **preflight** block (6 checks, all OK)
- **the sensor behind a redraft, by name**: `NEEDS WORK -> redrafting ... -- info-beat data shapes
  FAILED (qa-info.js)` — previously unattributable
- the **cost breakdown BEFORE the buy**, and the moment of purchase

```
estimated spend: 12 image(s) x $0.04 = $0.48 + 19 TTS clip(s) x $0.002 = $0.038
                 + 5 animated beat(s) / 25s x $0.05 = $1.25  ->  $1.77
generating art (paid)
```

**COST CORRECTION — I under-quoted again.** I told Aroma ~$0.60. This run estimates **$1.77**,
because the script asked for **5 animated beats** and i2v is **$0.05/SECOND** — $1.25 of the $1.77 is
animation alone. Previous runs were stills-heavy, so $0.60 was the stills number, not the number.
`SERVICE_DURABILITY_AND_CONTRACTS.md` §5.3 warned exactly this: "one 15-second animated beat is
$0.75". **Quote from the estimate line, which now exists — never from the last run.**

**Systemic gap this exposes:** the estimate is computed and logged but nothing enforces a ceiling
against it. `budgetUsd` was 50 (the reservation default), so a motion-heavy script could cost many
times a stills one with no gate. A per-run cap checked against the ESTIMATE, before the buy, is the
obvious fix and does not exist.

### NEXT
- Run 4 outcome + links + A/B vs youtu.be/t_xOWb8BRQ4.
- Add a pre-spend ceiling check against the estimate (Phase 4 territory, now clearly needed).
- Ledger still records $0 on a failed produce.

### RUN 4 SUCCEEDED — first video ever to clear produce + QA on Railway

Job `030ebdae3d8c`, series `made`, slug `when-the-score-lies-why-a-rising-eval-number-can-uhj3`.
Status **awaiting_review** (review blocks correctly: "the video is finished and has not been approved
for upload yet"). **QA 6.42 / 7** against a 4.9 threshold. Weakest factor voiceover_quality 0.85.
Runtime 2.42 min VO across 19 beats, 26.2MB mp4.

**Durability PROVEN end to end.** Two-phase persist fired exactly as designed:
`07:51:59 persisted (beats.js, durations.json, 0.0MB)` before the gates, then
`08:00:12 persisted (..._final.mp4, beats.js, durations.json, 26.2MB)`. After a redeploy destroyed
the render directory, `GET /demo/make-video/<job>/video` returned **HTTP 206, video/mp4** from the
volume.

**Spend $2.1557** — estimate line said $1.77 media. 5 animated beats at $0.05/SEC = $1.25 of it.

### Two gaps found by this run
1. **A finished video awaiting review was a 404.** `resolveFinalPath` read series/slug from
   `job.review`, written only when produce RETURNS — and a run that finishes the video then blocks at
   review THROWS. Plus it looked only in the render dir. Fixed (`f789b2a`): falls back to
   `job.script`, then to the durable volume.
2. **`OWNER_COOKIE_SECRET` is unset on production**, so every redeploy invalidates every browser
   session — the cookie-bound script.md/video links die. A bearer token still works. DEPLOYMENT_PREREQS
   already warns about this; it should just be set.

### A/B vs the published `youtu.be/t_xOWb8BRQ4` (evals-08), script level
| metric | OLD published | NEW |
|---|---|---|
| beats | 12 | 20 |
| VO words | 184 | 336 |
| captions | 0 | 12 |
| overlays | 1 | 0 |
| info templates | 4 | 7 |
| motion beats | 0 | 5 |
| checkpoint | 0 | 1 |

All differences are INTENDED (captions enforced, checkpoint required, house length moved 12→16-20,
motion now used). **No scripting regression visible.** Visual/audio A/B still needs a human to watch
both.

### NEXT
1. Aroma decides whether to approve → publishes unlisted → a YouTube link to set beside the old one.
2. Set `OWNER_COOKIE_SECRET` so shareable links survive a redeploy.
3. Add a pre-spend ceiling checked against the estimate (nothing enforces one; $50 reservation).
4. Ledger still reports $0 for a failed produce.
