---
type: reference
last_verified: 2026-05-07
owner: aroma
---

> **Migrated 2026-09-21** from `memory/` into the warm tier, verbatim — no content was
> summarised or dropped. It has **not** been re-verified against the codebase since
> 2026-05-07, and much of it describes the originally-planned pipeline rather than the
> explainer-video pipeline that now ships. Treat it per the decay schedule in
> `.claude/standards/MEMORY_TIERS.md` §2: over 180 days, re-verify before acting.

Confirmed patterns, anti-patterns and non-negotiable gates. Append new entries; never overwrite one in place.

## Rule: Start Simple, Add Complexity Only When Needed

**What this means:**
- Week 1-2: Single orchestrator + skill modules (no separate worker agents yet)
- Week 2: Inline video processing with ffmpeg; no complex transcoding pipelines
- Week 3: Only if video processing becomes a bottleneck (multi-hour turns) → consider async workers
- Never add: feature flags, backwards compatibility shims, "we might need this later" abstractions

**Why:** Anthropic's agent best practice — simplicity is faster to debug, easier to measure, and clearer to improve. Complexity should be added only after you've proven the simple version works and identified its specific constraints.

**How to apply:**
- Before proposing a new agent or module, ask: "Can the orchestrator handle this with an added skill?"
- Before adding async processing, ask: "Is the current bottleneck documented and quantified?"
- Before adding a feature, ask: "Does it improve quality or speed materially (>10%)?"

---

## Rule: Measure Weekly, Then Decide

**What this means:**
- Run full weekly cycles (Perceive→Plan→Act→Observe→Reflect)
- At end of each week, generate content_health_table.md with keep/rebuild/kill decisions
- Use explicit metrics: assignment pass rate, video completion rate, teacher confidence, cost per unit
- Do NOT ship changes without measuring their effect on prior cycle outcomes

**Why:** Without measurement, iteration is guessing. Weekly cycles give fast feedback loops (1 week = clear signal).

**How to apply:**
- ContentReflectSkill runs every Friday and fills content_health_table.md
- If a rebuilt unit's pass rate improves <5%, revisit the rebuild strategy
- If cost per session exceeds $50, implement throttling (reduce video quality or clip count)
- Carry unresolved units forward with priority labels; don't abandon

---

## Rule: Specialize Only If Quality or Speed Improves Materially

**What this means:**
- Keep planning, drafting, and assignment logic in orchestrator
- Move to a separate agent only if:
  - It reduces delivery time by >20% (e.g., parallel video processing)
  - Quality for that task is consistently <70% (needs a specialized model)
  - Failure in that task cascades to others (isolation needed)
- Do NOT specialize for cleanliness or "separation of concerns" alone

**Why:** Orchestrator state management is simpler than distributed agents. Multi-agent systems introduce async bugs, coordination overhead, and harder debugging. Specialize only when single-agent hits a real wall.

**How to apply:**
- Video processing (transcode, segment, edit) → likely needs workers (parallelizable, compute-heavy)
- Planning and content generation → stay in orchestrator (interdependent, low compute)
- If orchestrator call latency hits 5+ minutes → add async workers to video pipeline

---

## Rule: No Half-Finished Implementations

**What this means:**
- Code shipping to production must be measurable and complete for its scope
- If assignment evaluation is <70% accurate, don't ship it; rebuild or defer to next cycle
- If video QA pipeline flags >20% false positives, don't publish those flags; improve or disable gate
- Incomplete = risky (silent failures, misleading metrics, rework down the line)

**Why:** Half-finished features hide problems. Better to defer a feature than ship something that looks ready but isn't.

**How to apply:**
- Before Week 2 ships, verify all agents meet their pass criteria on eval dataset
- Before Week 3 ships, run on 2 live sessions; don't publish results from 1
- Before Week 4 ships, run reflect cycle and validate keep/rebuild/kill logic on real outcomes

---

## Rule: Gates Are Non-Negotiable

**What this means:**
The weekly loop has 5 gates. If a gate misses deadline:
- Mark `loop_blocked`
- Publish minimum viable learner package (essential edit only, no clips)
- Escalate to Aroma + course lead for decision: extend week or defer feature
- Carry unresolved units to next cycle with high priority

**Why:** Predictable, transparent failure is better than silent breakage. Gates force conversations about tradeoffs.

**How to apply:**
- Perceive gate (Monday): New signals or explicit "no new signals" log → failure = no plan
- Plan gate (Monday EOD): Content units mapped to signals → failure = no act target
- Act gate (Wednesday): Learner + instructor packs exist → failure = no review
- Observe gate (after session): Learner publishing bundle complete → failure = no publish
- Reflect gate (Friday): Each unit tagged keep/rebuild/kill → failure = loop stalls

---

## Rule: Log All Decisions

**What this means:**
- Every keep/rebuild/kill decision includes rationale (logged in ContentHealthRecord.decision_rationale)
- Every gate success or failure is logged with timestamp
- Every instructor debrief and signal is timestamped and attributed
- No decision is made in a Slack message or verbal only — it goes in the logs

**Why:** Aroma needs to audit and learn. Undocumented decisions = impossible to improve.

**How to apply:**
- ContentReflectSkill emits decision logs: `decision_log/week-W-YYYY.md` with each unit's rationale
- Aroma's approval on flagged assets goes in decision_log with her name + timestamp
- Rebuilds reference prior cycle's decision; include improvement hypothesis


---

# Quality Gates & SLA Targets

<!-- migrated verbatim from memory/feedback_quality_gates.md on 2026-09-21 -->

## Weekly Loop Gates (Non-Negotiable)

### Perceive Gate — Monday 6am
**Requirement:** New signals in backlog OR explicit "no-new-signal" log
- Signal sources: learner forum posts, instructor confusion notes, assignment failures, office hours debrief
- Confidence threshold: ≥0.6 (logged in ContentSignal.confidence)
- **Failure mode:** No signals collected → loop stalls, carry forward to Tuesday with escalation

### Plan Gate — Monday 6pm
**Requirement:** Content units mapped 1:1 to signals (no signal left unmapped)
- Each ContentUnit must reference ≥1 signal_id
- Each unit has defined outcome, evidence method, and target publish date
- Instructor + Aroma review planned units; flag unclear outcomes for replanning
- **Failure mode:** Plan is ambiguous → gate extended to Tuesday; hold Act until Plan is clear

### Act Gate — Wednesday 6pm
**Requirement:** Learner pack + instructor pack both exist and reviewed by Aroma
- Learner pack: session summary, glossary, watch order (markdown templates filled)
- Instructor pack: teaching brief, example bank, time boxes (ready to use in class)
- Aroma spot-checks 20% of generated content (first 5 units + random sampling after)
- **Failure mode:** Content quality <70% (clarity/relevance) → rebuild with feedback, reschedule publish

### Observe Gate — End of Session (same day)
**Requirement:** Learner publishing bundle complete (essential edit + ≥5 concept clips)
- Essential edit: 30-60 mins, chapter markers, burned captions
- Concept clips: 2-4 mins each, one concept per clip, ready to publish
- Session summary: populated with key takeaways
- **Failure mode:** Video processing >8 hrs → flag for cost review; publish essential edit only, defer clips to next day

### Reflect Gate — Friday 6pm
**Requirement:** Each content unit tagged keep/rebuild/kill with rationale logged
- Compare: expected outcome (from plan) vs observed outcome (assignment pass rate, video completion, teacher feedback)
- Minimum metrics: assignment_attempt_rate, assignment_pass_rate_first_attempt, decision_rationale (required field)
- Aroma signs off on reflect decisions; escalates to course lead if rebuild ratio >30%
- **Failure mode:** Reflect missing deadline → hold weekly cycle status; publish incomplete health table as-is with "pending" marker

---

## Human Review Checkpoints (Aroma's Authority)

### Content Review (Wed)
**Trigger:** ContentProductionSkill outputs learner pack (draft)
**SLA:** Aroma reviews within 24 hours
**Decision:**
- ✅ Approve: Move to QA gate
- ❌ Reject: Return to skill with feedback for rebuild
- 🔄 Revise: Skill makes specific changes, Aroma re-reviews (max 2 rounds)

**Metrics checked:**
- Concept clarity (learner can understand without live explanation)
- Example relevance (examples match learner level, not course level)
- Tone consistency (matches course voice)

### Video QA Review (Thu-Fri)
**Trigger:** VideoQualityGateAgent flags `needs_review` (audio quality, concept gaps, duration non-compliance)
**SLA:** Aroma approves/rejects flagged clips within 24 hours
**Decision:**
- ✅ Approve: Flagged clip is actually publish-ready; override gate to publish
- ❌ Reject: Clip must be re-cut or re-transcribed; return to agent
- 🔄 Request Changes: Re-cut with specific feedback (e.g., "start at 2:15, end at 4:50")

**Metrics checked:**
- Audio quality: No dropouts, clear speech, acceptable background noise
- Concept completeness: Clip stands alone without prior context
- Duration: Exactly 2-4 minutes (or approved variation)
- Captions: Accurate, no drops, readable timing

### Reflect Review (Fri evening)
**Trigger:** ContentReflectSkill outputs health table with keep/rebuild/kill decisions
**SLA:** Aroma reviews and signs off by Friday 6pm
**Decision:**
- ✅ Approve: Decisions are sound; publish health table
- ❌ Override: Aroma disagrees with a decision; logs rationale and reclassifies unit
- 🔄 Escalate: Rebuild ratio >30% or cost overrun → involve course lead before finalizing

**Metrics checked:**
- Decision alignment: Does decision match metrics? (e.g., low pass rate = rebuild, not keep)
- Rebuild priority: Are highest-impact units prioritized first?
- Cost-benefit: Is rework justified by expected improvement?

---

## SLA Targets (Per 2-Hour Session Recording)

| Stage | Input | Output | Target | Buffer |
|-------|-------|--------|--------|--------|
| **Perceive** | — | signal_backlog.md | Weekly (Mon 6am) | — |
| **Plan** | signals | weekly_content_map.md | 12 hrs (Mon 6pm) | — |
| **Act** | units | learner + instructor packs | 24 hrs | — |
| **Observe** | recording | essential_edit.mp4 + 5+ clips | 8 hrs same-day | 4 hrs (next morning ok) |
| **Reflect** | outcomes | content_health_table.md | Weekly (Fri 6pm) | — |
| **Publish** | bundle | live on platform | Same-day after Aroma approval | — |

---

## Failure Escalation Path

### Perceive/Plan Gate Misses (by Tuesday 6am)
1. Log `loop_blocked` + reason in decision_log
2. Notify Aroma: what's blocking? (no signals? ambiguous plan?)
3. Decision: extend deadline 1 day OR trim plan scope
4. Carry forward unresolved signals to next week

### Act Gate Misses (by Thu)
1. Log content quality issues; specify which units failed review
2. Notify Aroma with feedback; assign to skill for rebuild
3. Parallel decision: publish only passing units Friday, defer rest to next week

### Observe Gate Misses (by EOD Thursday)
1. Log video processing error + duration
2. If >8 hrs: publish essential edit only; defer concept clips to Friday+
3. Cost review: if recurring, lower video resolution or reduce clip count

### Reflect Gate Misses (by Saturday morning)
1. Publish partial health table with `pending` status
2. Carry decisions forward to next week's plan
3. Aroma reviews and logs decisions early Monday

### Cost Overrun (>$75/week)
1. Log cost event with breakdown (API, storage, compute)
2. Notify Aroma + course lead immediately
3. Decision: throttle to 1 session/week, OR reduce video quality, OR reduce clip count
4. Adjust Week 4+ build plan if trend continues

---

## Metrics for Assessing Gate Health

- **Perceive on-time rate**: % weeks signal gate fires by Mon 6am target
- **Plan clarity**: % units that pass Act gate on first submission (no rework)
- **Act velocity**: Average hours from plan → learner pack ready
- **Observe throughput**: % sessions with publish bundle <8 hrs
- **Reflect completeness**: % units with decision + rationale logged
- **Overall loop reliability**: % weeks with zero blocked gates

**Target:** >90% on-time gate fires; <10% first-try rejections on Act; 0 silent failures.


---

# Harness & Environment Lessons

<!-- migrated 2026-09-21 from ~/.claude/projects/e--Content-Pipeline---Q2/memory/,
     where they were written and verified on 2026-09-20. Kept verbatim in substance. -->

These were verified against this machine and this repo on **2026-09-20** — more recently than
anything above them in this file.

### H1. `python3` on this machine is a Store stub, not Python
**Added:** 2026-09-20 | **Applies to:** any script or hook that shells out to Python
**Invalidate if:** a real `python3` is installed on PATH ahead of the alias

`python3` resolves to the Microsoft Store App Execution Alias
(`~/AppData/Local/Microsoft/WindowsApps/python3`) and prints *"Python was not found"* instead of
running. The real interpreters are `py` and `python` (3.13.6).

The failure is nasty because the stub **exits non-zero and writes to stdout**, so
`if ! python3 ...` looks exactly like a genuine compile failure.
`validate-after-write.sh` was calling `python3 -m py_compile` and flagged every valid `.py` file
as a syntax error.

**Do:** probe by running `"$cand" -c ""` and taking the first that works — `py`, then `python`,
then `python3`. Never take `command -v python3` as proof. Set `PYTHONPYCACHEPREFIX` so
`py_compile` does not scatter `__pycache__` through the repo.

### H2. Hooks get JSON on stdin; exit 2 blocks; the reason goes to stderr
**Added:** 2026-09-20 | **Applies to:** every file in `.claude/hooks/`

The scripts here take positional args (`$1`, `$2`) and signal refusal with `exit 1` on stdout.
Claude Code's contract is different on all three points: hooks receive a JSON payload on
**stdin**, **exit 2** is the blocking code, and the reason must go to **stderr** to surface.

`.claude/settings.json` therefore *wraps* each script: `jq` pulls the field out of stdin, passes
it as `$1`/`$2`, and translates a non-zero exit into `exit 2` with the message re-routed. Keep
that shape — it is why the scripts stay simple and testable.

Use command substitution (`c=$(jq -r ...)`), **never** `jq ... | read -r c`: `read` stops at the
first newline, so a multi-line Bash command hides a force-push from the guard.

**Why it matters:** shape-valid hook config that silently does nothing is worse than no hook.
The PreToolUse guard sat unloaded and force-push was unguarded until this was found.
**Do:** after editing a hook, pipe a synthetic payload into the exact command string from
settings.json (`jq -r '.hooks.<event>[0].hooks[0].command'`) and assert the **exit code** — not
merely that the JSON parses.

### H3. Verify a command before writing it into config
**Added:** 2026-09-20 | **Applies to:** any proposed fix, especially one-liners

Do not implement a plausible-looking command on first instinct. Aroma asked for this directly:
*"research before implementing this, make sure this is the most efficient and cost effective,
reliable method."* It was warranted — the `jq ... | read -r c` form initially proposed truncated
multi-line commands and would have let a force-push through a guard that looked installed.

**Do:** pipe-test the literal command against synthetic payloads and assert exit codes; confirm
documented semantics (exit codes, field names) rather than recalling them; and report what was
*proven* separately from what is still *assumed*.

### H4. Verify against production, not against code defaults
**Added:** 2026-09-20 | **Applies to:** any diagnosis or fix touching deployed behaviour

Read the **live** Railway values (`railway variables`, `railway ssh 'printenv X'`) before
reasoning from defaults in `server/lib/config.js`. On 2026-09-20 three code defaults disagreed
with production: `PIPELINE_STOP_AFTER` was `upload` not `qa`, `PIPELINE_BUDGET_USD` was `50`, and
YouTube was authorised despite a comment saying no container had the grant.

A fix designed against the default silently removed publishing that already worked. Aroma's
words: *"I want to fix this problem in a way that it improved the system not regress."* A change
that is correct against the source can still be a regression against the running service.

**Do:** state every change against what production does today. If a behaviour works live, the
change must keep it — additive, or not at all. Write the guard as a test that fails in *both*
directions (a course stop stage must reach `review` so it can pause **and** `upload` so it can
publish), and say so in the plan before asking for approval.
**Note:** `railway ssh '<read-only command>'` reaches the volume; `railway run` does not — it
runs locally with the remote environment.

### H5. Another session is editing this repo right now
**Added:** 2026-09-20 | **Applies to:** every `git add`, every gate run

Files appear modified mid-session that were clean at session start. They are someone else's
finished work waiting to be committed.

`git add orchestrator/test-regressions.js` once staged three of their tests along with ours.
Their tests were committed; their implementation (`server/lib/config.js`) was not — so main went
red. Committed tests against an uncommitted implementation pass locally and fail everywhere else.
Unpicking it took three more commits.

**Do:** before staging, `git status` and compare against the session-start snapshot. Stage only
what you changed — `git add -p`, or check `git diff <file>` and only add files you touched end to
end. When removing someone's test, remove the fixtures it owns too. Verify against the
**committed** state, not the working tree: back the other files up, `git checkout --` them, run
the gate, restore.
**Note:** `git worktree` does not work here — a committed `.chrome-profile` under
`explainer-videos/` exceeds the Windows path limit.

### H6. A hook wrapper may read stdin only once
**Added:** 2026-09-21 | **Applies to:** any `.claude/settings.json` hook command needing 2+ fields
**Invalidate if:** the harness starts passing the payload as an argument rather than on stdin

stdin is a stream, not a file. A wrapper that calls `jq` twice —

```
n=$(jq -r '.tool_name');  r=$(jq -r '.tool_response')     # WRONG
```

— has the first call consume the entire payload, so the second reads EOF and returns empty. The
hook is then invoked with a missing argument, takes its `[ -n "$x" ] || exit 0` guard, and **exits
0 having done nothing**. It is indistinguishable from a hook that ran and had nothing to do.

Read the payload once, then query the variable:

```
p=$(cat)
n=$(printf '%s' "$p" | jq -r '.tool_name // empty')
r=$(printf '%s' "$p" | jq -r '.tool_response // empty')
```

`$(cat)`, not `read -r` — `read` stops at the first newline and would truncate multi-line tool
output (same trap as §H2).

**How it was caught:** the wrapper exited 0 on every synthetic payload, and only asserting that the
row actually appeared in `mistakes.md` exposed it. Test the effect, never the exit code alone —
this is §H3 applied to hooks.

### H7. A bare `bash` from Python subprocess is not Git Bash
**Added:** 2026-09-21 | **Applies to:** any test or script that shells out to bash from Python
**Invalidate if:** the broken `bash.exe` earlier on PATH is removed

`subprocess.run(["bash", ...])` on this machine resolves to a stub that fails with a **UTF-16**
`"The system cannot find the file specified."` — unreadable in a normal terminal, and nothing to do
with the file you passed. Meanwhile `shutil.which("bash")` happily reports Git Bash, so the name
looks fine right up until you run it.

Both of these work: `C:\Program Files\Git\bin\bash.exe` and `C:\Program Files\Git\usr\bin\bash.exe`.

**Do:** probe candidates with `--version` and require `GNU bash` in the output before using one —
`tests/test_memory_system.py::bash_cmd` does exactly this. Also convert the paths you pass: Git
Bash needs `/c/x`, not `C:\x`, or CreateProcess receives the Windows path verbatim and produces the
same opaque error.

**Why it belongs beside §H1:** identical shape. A name being on PATH is not evidence that running
it works, and on Windows the shim that shadows it fails in a way that looks like *your* mistake.

### H8. `pytest tests/` leaks `RAILWAY_ENVIRONMENT=production` into the process
**Added:** 2026-09-21 | **Applies to:** any test that shells out, or reads env, under `tests/`
**Invalidate if:** `tests/test_signal_intake.py` stops loading `.env` at import

Importing `tests/test_signal_intake.py` loads `.env`, which sets **`RAILWAY_ENVIRONMENT=production`**
into `os.environ` for the whole pytest process. Anything spawned afterwards inherits it.

That variable is the memory hooks' kill switch, so the rotation tests passed when run alone and
failed under `pytest tests/` — same code, different collection order. The failure mode is the worst
kind: the hook exits **0, silently**, having done nothing.

**Do:** a test that spawns a hook must `env.pop("RAILWAY_ENVIRONMENT", None)` and set the switch
deliberately when it means to (`tests/test_memory_system.py` does both).
**Worth fixing at the source:** a test module that mutates process env at *import* time makes every
other test's result depend on collection order. It also means a developer running `pytest tests/`
has a shell process that believes it is production.

### H9. Test the effect, not the exit code
**Added:** 2026-09-21 | **Applies to:** hooks, guards, gates, anything whose job is a side effect

Three separate bugs in one afternoon all presented as **exit 0 and no output**: a wrapper whose
second `jq` read an already-consumed stdin (§H6), a `bash` that was the wrong binary (§H7), and a
kill switch inherited from a leaked env var (§H8). In every case the exit code said success.

A hook's contract is the row it writes, the file it moves, the push it blocks — never its status.
**Assert on the artifact.** If a test can pass while the mechanism does nothing, it is not testing
the mechanism.

## Rule: A course-lesson test must never take the happy path through approve/requeue

**What this means:**
- `course-worker.approve()`, `.requeue()` and anything else that ends in `kick()` start `drain()`,
  and `drain()` runs the **real spine** — `server/lib/course-worker.js` does not go through the
  injected `oneVideo` fake that `orchestrator/test-server.js` passes to `withServer()`.
- In `orchestrator/test-server.js` (HTTP tests, real app), assert only on the **refusals**: 409s,
  guard messages, and that the item did not move. Never assert on a successful approve/requeue.
- In `orchestrator/test-regressions.js` the spine IS stubbed (`lastSpineOpts`), so the happy path is
  safe there. Test queue-level semantics against `queue.requeue()` directly.

**Why:** a first draft of the requeue test asserted `queue.get(id).status === 'queued'` after a 202.
The 202 had already kicked the worker, which claimed the item and ran research → script → gate →
produce for ~7 minutes of **real Opus and Gemini calls inside `npm test`**. It also wrote a junk
`explainer-videos/testing/broke/` folder, which `listVideos()` picked up as a real catalogue row
served to the LMS — the exact hazard the fixture-cleanup block at the end of the course-worker suite
already existed to prevent. The test "passed money", not just time.

**How to apply:** before asserting on post-action state in a course test, grep the worker function
for `kick(`. If it is there, the assertion is a spend. Check `git status` for a stray
`explainer-videos/<fixture-series>/` after any course test run, and remove only the untracked
folder — `rm -rf explainer-videos/testing` also deletes the **committed** `testing/ai-in-2030`
fixture (recover with `git checkout -- explainer-videos/testing/ai-in-2030`).


---

### H10. Scripted edits to this repo must preserve CRLF

**Added:** 2026-09-21 | **Applies to:** any node/python script that rewrites a tracked source file
**Invalidate if:** the repo gains a `.gitattributes` that normalises line endings on checkout

Source files here are checked out **CRLF** (`file orchestrator/lib/spine-errors.js` →
"with CRLF line terminators"). A script that reads a file and matches a multi-line anchor written
with `\n` finds nothing, and one that writes back a `\n`-joined string silently converts the whole
file — which shows up as a diff touching every line, in a repo where another session may be editing
the same file (see [[H5]]).

**How to apply:** read, detect, strip, edit, restore:

```js
const raw = fs.readFileSync(f, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');
// ... edits against \n ...
fs.writeFileSync(f, crlf ? s.replace(/\n/g, '\r\n') : s);
```

Also assert the anchor is **unique** (`s.split(a).length !== 2`), not merely present — `includes`
plus `replace` silently edits the first of several matches.

---

### H11. Don't nest regex or escapes inside a heredoc-written JS template literal

**Added:** 2026-09-21 | **Applies to:** writing test/patch code via `cat > file <<'EOF'` from Bash
**Invalidate if:** you stop generating code with nested template literals

A quoted heredoc (`<<'EOF'`) passes text through literally, but a JS **template literal** inside it
still processes escapes. `\s` written inside one collapses to `s`, so `/\bcode:\s*'...'/` was
written to disk as `/code:s*'...'/` — a regex that matches nothing, and
`/blockedBy:s*[\w.]*s*||s*'review'/`, an alternation containing an empty branch that matches
everything. Both produced **tests that passed or failed for the wrong reason**, which is worse than
no test.

**How to apply:** when generated code contains regexes or backslashes, write those lines to their
own literal file with a quoted heredoc and splice them in by line number — do not interpolate them
through a template literal. And after generating a test, confirm it **fails when it should**: the
"found no blockedBy codes at all -- the scan is broken, not the code" assertion is what caught this.

---

### H12. `/tmp` in Bash is not `/tmp` to node on this machine

**Added:** 2026-09-21 | **Applies to:** any node script given a POSIX path from the Bash tool
**Invalidate if:** the shell stops being Git Bash

`node /tmp/x.js` works (Bash resolves the path), but `fs.readFileSync('/tmp/x.txt')` **inside** that
script resolves against the current drive — it tried `E:\tmp\x.txt` and threw ENOENT. Git Bash's
`/tmp` is really `C:/Users/<user>/AppData/Local/Temp`.

**How to apply:** `SP="$(cygpath -m /tmp)"` and pass it in as an argument, or use the session
scratchpad's real Windows path. Never hand a bare POSIX temp path to node's `fs`.

---

### H13. A green test you have never seen fail is not evidence

**Added:** 2026-09-21 | **Applies to:** every test added to `orchestrator/test-*.js`
**Invalidate if:** never — this is the point of a test

Three tests were written for the references stage and all three passed immediately. Two of them
could not have failed:

1. **Async test, sync harness.** `check()` is synchronous; `checkAsync()` awaits. An `async` function
   passed to `check()` has its assertions run as unhandled rejections after the harness has already
   recorded a pass. **The tell is in the output:** the note column prints `[object Promise]` instead
   of the string the test returned.
2. **Destructured import defeats the stub.** `references.js` had
   `const { askWithSearch } = require('../llm')`, which binds the function at import. Tests that
   monkeypatched `llm.askWithSearch` changed nothing, and the stage instead fell through its real
   no-credential path — which returns the same empty list the test was asserting on. Fixed by
   keeping the module (`llm.askWithSearch(...)`), not the function.

**How to apply:** after writing a test, break the thing it guards and watch it go red, then restore.
For the guard that discards an unsearched answer, that was `if (!found.searches)` → `if (false)`:
FAIL, restore, PASS. Also: if a stage needs to be stubbable, require the **module** and call through
it — a destructured import is untestable by design. Related: [[H11]], where two regexes were silently
mangled into patterns that matched nothing and everything, with the same symptom.

---

### H14. Puppeteer reads PUPPETEER_EXECUTABLE_PATH, never CHROME_PATH

**Added:** 2026-09-22 | **Applies to:** any script in this repo that launches a browser
**Invalidate if:** the Dockerfile stops installing system chromium

`CHROME_PATH` is a Lighthouse/Playwright convention. Puppeteer has never read it. The Dockerfile set
`CHROME_PATH=/usr/bin/chromium` plus `PUPPETEER_SKIP_DOWNLOAD=1`, which left Puppeteer with nowhere
to look, so it resolved a `chrome-headless-shell` the image deliberately does not ship and exited 1.

`compile-lesson.js` worked only because it reads `CHROME_PATH` **by hand** and sets `executablePath`
itself. `qa-frames.js` did not. So the renderer ran and the check on the renderer did not — which is
the shape that made this look like a content problem rather than a broken deploy.

**Cost: every course lesson on production rendered in full, spent ~$0.60 of art and speech, and then
blocked.** For days. It is why no course lesson ever reached `done`.

**How to apply:** set `PUPPETEER_EXECUTABLE_PATH` in the Dockerfile — it fixes every launch site at
once, including ones not yet written. In a gate, still pass `executablePath` explicitly as
belt-and-braces, because these files are copied standalone into video folders and run elsewhere. Use
`headless: 'new'`, never `'shell'` (that mode needs the separate binary), and always pass
`--disable-dev-shm-usage`: a container's `/dev/shm` is small and Chrome crashes writing screenshots
into it.

---

### H15. A tool that dies before main() is not a verdict

**Added:** 2026-09-22 | **Applies to:** every gate/sensor invoked by `produce.js`
**Invalidate if:** gates gain a reliable structured failure channel

Our gates signal "I could not reach a verdict" with **exit 3**. A tool that fails to *start* — no
browser, no interpreter, missing module, ENOENT — cannot honour that: Node exits 1 on an uncaught
throw and its stderr is a stack trace. `produce.js` read that as a finding and raised
`post-render-check`, which parks the lesson for a human.

**No human can rule on a missing binary.** So a paid, rendered, bumper-wrapped video sat waiting for
a decision nobody could make, and the block looked like a quality problem to everyone downstream
including the LMS.

`isEnvironmentFailure()` (`produce.js`) now matches the runtime's own words and routes these to the
exit-3 path. Deliberately narrow — every pattern is a failure to START something.

**How to apply:** when classifying a subprocess failure, ask *did it run?* before asking *what did it
say?* And test both directions: swallowing real findings would be the worse bug, because it publishes
videos nobody judged. Mutation-tested with the exact production stderr, which is the only reason we
know the matcher catches the case that caused the outage. See [[H13]].

---

### H16. Prove a gate's verdict against a known-good fixture before calling it wrong

**Added:** 2026-09-22 | **Applies to:** any time a gate/sensor blocks and the instinct is "bad gate"
**Invalidate if:** never

qa-frames blocked a course lesson with "14 beats render NO visible text — a blank frame". I read
`animation/lesson.html`, saw that `ali`/`scene` beats build only `<img>` elements, and concluded from
the source that the rule false-positived on every illustration beat. It was a careful argument from
real code. **It was wrong.**

Running the gate against a shipped video took minutes and cost nothing:
`evals-03-what-an-eval-is` **PASSED, 27 beats**. What I had missed was `lesson.html:65` — `beat.cap`
draws a caption — and **all 13** of its text-free beats have one. Across the corpus, 909 of 1276
beats do.

The real defect was upstream: the COURSE script schema had no `cap` field, so course videos could not
emit captions while hand-made ones always had. The gate was correct on its first ever successful run.

**How to apply:** before "fixing" a gate, run it against something known good. If it passes, the gate
is fine and the input is the defect. Reading the source is not the same as running it — a source
argument can be internally valid and still miss a field. See [[H13]].

---

### H17. A render gate can only be tested against a real video in a real container

**Added:** 2026-09-22 | **Applies to:** qa-frames, qa-clips, qa-cutouts, qa-info, verify, eval-text
**Invalidate if:** the gates stop depending on a browser and generated assets

These gates read a video folder and measure a rendered DOM, so they cannot be unit-tested. Until
`scripts/pipeline-harness.sh` existed the only way to run one was to **buy a lesson**: $2.81 a render,
one failure surfaced per render, stop. Five bugs would have cost five renders.

And the environment that broke was never the one under test — a laptop has Chrome, so the missing
browser in the container was invisible locally and only appeared after production had spent money.

**How to apply:** `bash scripts/pipeline-harness.sh` — real committed videos, deploy image, flat
stand-in art from `scripts/make-fixture-assets.js`, nothing bought. Always at least two fixtures of
opposite shape (illustration-led and text-heavy): a rule written against one and never run against
the other is the defect this catches. It runs in CI on every push because Docker does not work on
the author's machine (WSL broken), which is the argument for never relying on a local-only check.

**Corollary on measuring exit codes:** `node gate.js | head` reports `head`'s status, not the gate's.
Two separate diagnoses this week were wrong because a pipe swallowed a non-zero exit. Check without a
pipe, or use `${PIPESTATUS[0]}`.

---

### H18. A guard that reports "unknown" for the case it was built for has not shipped

**Added:** 2026-09-22 | **Applies to:** any pre-flight, health check or sensor
**Invalidate if:** never

`preflight.js` was written to catch one specific failure: Puppeteer unable to resolve a browser,
which had twice cost a paid render. It shipped, ran on production, and printed:

```
??  browser -- puppeteer is not resolvable from the orchestrator
```

Every other check passed, the overall verdict was **YES, this container can render**, and the one
thing it existed to verify had quietly not been verified. A third outcome (`ok: null`) is the right
design — a check that could not measure must never read as a pass — but it is only honest if
somebody reads it. An `??` on the load-bearing check is a red build wearing green.

**The tempting shortcut was also wrong.** "Just check the binary exists" would not have caught the
original bug: `/usr/bin/chromium` WAS installed. What was missing was Puppeteer's ability to resolve
it, because Puppeteer reads `PUPPETEER_EXECUTABLE_PATH` and the image set `CHROME_PATH` (see
[[H14]]). Only doing the real thing — `puppeteer.launch()` — proves the real thing.

**How to apply:** after writing a guard, run it in the environment it defends and confirm the
specific check it exists for returns a definite pass or fail. If it returns unknown, the dependency
it needs is part of the guard, not optional. And verify the guard fires on the real fault: this one
now fails with "Could not find Chrome" on any machine without `PUPPETEER_EXECUTABLE_PATH`, which is
the production bug reproduced for free. Related: [[H13]], [[H16]].

---

## H7. On Railway, a flat multi-GB RAM plateau with near-zero CPU is page cache

**Added:** 2026-09-22 | **Applies to:** reading the Railway RAM graph or cost panel
**Invalidate if:** Railway switches its RAM metric from cgroup `memory.current` to process RSS

Railway's RAM metric is the container's cgroup usage, which counts file-backed
pages. A process that writes thousands of files shows those writes as "memory"
until the kernel reclaims them. So a plateau that is flat for minutes while CPU
sits near zero is almost never a leak — find what the process wrote.

The concrete instance: `compile-lesson.js` writes ~10,800 PNGs per 6-minute lesson
and never deletes them after `encode()` (only at the start of the *next* render),
so the frames sit in cache and on the billed volume. Peak 7.13 GB where two Chromes
account for ~2.4 GB.

**How to apply:** before tuning heap flags, check whether the workload writes large
files, and whether it cleans them up. Memory was 91% of this project's Railway bill
and most of the excess was scratch frames, not objects.

---

### H19. When a measurement is wrong for one case, exclude the case — do not change the instrument

**Added:** 2026-09-22 | **Applies to:** any gate or sensor that measures a rendered page
**Invalidate if:** never

`qa-frames` flagged a working Ken Burns push-in as "1 element spills by 94px". `getBoundingClientRect`
includes transforms, and `lesson.html` deliberately ramps `scale(1.04 → 1.11)` on the full-bleed art
while `body{overflow:hidden}` crops it.

**The wrong fix — which I shipped first —** was to swap the instrument: accumulate `offsetLeft`/
`offsetWidth` instead, because those are pre-transform. But `offsetParent` skips non-positioned
ancestors and an inline `<span>` reports its box differently, so it **invented a 201px spill on a
text-heavy fixture that had always passed.** Trading one false positive for another.

**The right fix** kept `getBoundingClientRect` and skipped elements a transform is moving. The rule
was always "something is POSITIONED wrong", and an animated element is not that.

**How to apply:** when a check misfires on one legitimate case, first ask whether the case can be
excluded by naming what makes it legitimate. Changing how everything is measured to accommodate one
exception changes the result for every case you were not thinking about. Caught in CI by the gate
harness for $0 — see [[H17]].

---

### H20. Git Bash rewrites absolute POSIX paths passed to external commands

**Added:** 2026-09-22 | **Applies to:** `railway ssh`, docker, any exe taking a `/abs/path` argument
**Invalidate if:** the shell stops being Git Bash / MSYS

`railway ssh ls /data/cq-jobs` failed with
`ls: cannot access 'C:/Program Files/Git/data/cq-jobs'`. MSYS rewrites an argument that looks like a
POSIX absolute path into a Windows one before the program sees it — and the container's `/data` is
not this machine's `/data`.

**How to apply:** prefix the command with `MSYS_NO_PATHCONV=1`, or double the leading slash
(`//data/...`). This is the same family as [[H12]] (`/tmp` differs between Bash and node) — an
absolute POSIX path crossing a process boundary on Windows is never safe to assume.

Worth knowing what it unlocked: `MSYS_NO_PATHCONV=1 railway ssh cat /data/cq-jobs/deliverables/...`
reads the volume directly, which is how a blocked run's `beats.js` was diagnosed for $0 instead of
for another paid render.

---

### H21. A fail-soft stage with a hard credential requirement is an outage that reports success

**Added:** 2026-09-22 | **Applies to:** any optional stage that degrades instead of failing
**Invalidate if:** the stage starts surfacing its skip reason on the API response

`references` returned `[]` on **every lesson this deployment ever built**. The stage is deliberately
fail-soft — a reading list must never fail a $1.50 render — and `askWithSearch` hard-required
`ANTHROPIC_API_KEY`, which production does not hold. So the credential check threw, the stage
swallowed it, and the result was indistinguishable from "we looked and found nothing good".

It was shipped, announced to the LMS, and never once worked. Nobody noticed because the failure
mode was designed to be quiet.

**How to apply:** fail-soft is about not *stopping the run*; it is not a licence to be silent. When
a stage degrades, the reason must reach somewhere a human reads — the run log at minimum, and the
API response where a consumer might otherwise infer a result. `NONE('search unavailable')` already
carried the reason internally; nothing surfaced it. Also: whenever a feature is enabled by a flag
the caller sets, exercise the flag **once, for real**, before telling the caller it exists.

Related: [[H16]] (diagnosed from source and was wrong — run the thing).

---

### H22. `--allowedTools` permits a tool; `--tools` decides whether it is offered at all

**Added:** 2026-09-22 | **Applies to:** every `claude -p` invocation in this repo
**Invalidate if:** the CLI merges the two flags

Two separate mechanisms, and confusing them fails *silently in the worst possible direction*. With
`--allowedTools WebSearch` alone the tool is permitted but never offered, so the model cannot call
it — and instead of erroring it answers from memory, emits fluent, plausible, **invented** URLs, and
reports `subtype: success` with `permission_denials: []`. Verified on CLI 2.1.278.

`llm-cli.js` already records the mirror-image of this for the no-tools path: `--allowed-tools ''`
governs permission, not availability, so the model still emitted a `tool_use` and burned a turn.
Same root cause, opposite symptom.

**The proof-of-search corollary:** `usage.server_tool_use.web_search_requests` counts the *Messages
API's* server-side search tool and stays **0** for Claude Code's client-side `WebSearch`. It cannot
be used to prove a search happened on the CLI path. Use `--output-format stream-json --verbose` and
count `tool_use` blocks — evidence rather than inference.

**How to apply:** when giving the CLI a tool, pass both flags and assert both in a test. When a
guarantee depends on a tool having *run*, prove it from the streamed events, never from a usage
counter you have not measured on that exact path.

---

### H23. Permitting a tool makes `claude -p` demand a trusted workspace; run it outside the repo

**Added:** 2026-09-22 | **Applies to:** any `claude -p` call in this repo that permits a tool
**Invalidate if:** the CLI stops reading the cwd's `.claude/settings.json` when tools are allowed

Every stage works from `/app` in the container because `askJson` passes
`--allowed-tools ''` — no tools permitted, so no settings are consulted. The moment a call
*permits* a tool, Claude Code reads the working directory's `.claude/settings.json` and refuses:

```
Ignoring 9 permissions.allow entries from .claude/settings.json:
this workspace has not been trusted.
```

Exit 1, before any model call. The references stage then fail-softed and returned no references —
the same silent outage as [[H21]], in a new costume.

**It passes locally either way**, because a developer machine has accepted the trust dialog. This
is only observable in the container, which is why it survived a green suite, a green CI run
including the deploy-image gates, and a successful deploy.

**How to apply:** spawn `claude` with `cwd: os.tmpdir()` for anything that permits a tool. It needs
no image change, requires trusting nothing, and drops the whole inherited-settings-and-hooks
surface. The alternative — seeding `hasTrustDialogAccepted` into the image's `.claude.json`, as
`E:\Nazim` does — trusts a workspace in order to run a call that never reads it.

**The wider rule this is the third instance of:** a green local run says almost nothing about a
`claude -p` code path. Root refusal of `bypassPermissions`, the trust dialog, and argv length limits
are all container-only. Run it in the container before believing it.

Related: [[H21]] (fail-soft + hard requirement = silent outage), [[H22]] (`--tools` vs
`--allowedTools`).

---

### H24. Persist an artefact the moment it exists, never after the next thing that can throw

**Added:** 2026-09-22 | **Applies to:** every durable copy in the pipeline
**Invalidate if:** the spine gains a finally-block that persists on the way out

The mp4 copy to the volume sat *after* the `eval-text` sensor. That sensor blocks by **throwing**,
so a lesson blocked there jumped straight past the copy: the only copy of a finished, paid render
stayed in a directory `.dockerignore` excludes, one redeploy from gone.

That is precisely the loss `deliverables.js` was written to prevent, reproduced by the module
itself. The beats copy two hundred lines earlier already had the rule right — *"keep what makes this
lesson diagnosable before anything can block on it"* — and the second call site did not follow it.

**How to apply:** a persist belongs immediately after the artefact exists, never after the next
check. Ask "what throws between here and the copy?" — if anything does, the copy is in the wrong
place. Ordering IS the guarantee, and there is no observable difference until a gate happens to fail
in production, which is why an assertion on the ordering is the only thing that holds it.

Related: [[H21]] (a silent skip is how someone believes a video is safe when it is not).

---

### H25. Two facts that usually travel together will eventually diverge — publish the one that is asked about

**Added:** 2026-09-22 | **Applies to:** any status/enum we publish to a consumer
**Invalidate if:** every `post-render-check` block comes to mean a render exists

Our API reference tabulated `blockedBy` against "money spent?", and the LMS reasonably read that as
"a video exists, so `/file` should serve it". But art, speech and animation are bought *before* the
render, and `post-render-check` is raised by three sensors — `qa-clips` and `qa-frames` run before
`compile-lesson.js`, `eval-text` after it. Same value, opposite answers. They spent a day probing a
gate that does not exist, then asked us to relax it.

The internal version of the same error: `finalRendered: true` was hardcoded into every blocking
sensor, including the two that cannot have a render.

**How to apply:** when a consumer needs to know X and we publish Y because Y usually implies X,
publish X. Here that is `deliverableAvailable` — a boolean meaning "a fetch will succeed right now",
computed from what is on the volume. Any *rule* mapping `blockedBy` to fetchability is wrong for
some value of `blockedBy`; a fact cannot drift. Prefer answering the question over documenting how
to infer the answer.

Related: [[H22]] (prove it from evidence, not from a counter you have not measured on that path).

---

### H26. A skill with an unparseable description is not a broken skill, it is an absent one

**Added:** 2026-09-23 | **Applies to:** every `.claude/skills/*/SKILL.md`
**Invalidate if:** the loader starts reporting frontmatter errors instead of falling back silently

Claude chooses a skill from its `name` and `description` alone. Two ways that field can be absent,
both silent:

1. **It was never written.** `audio-mux`, `git-workflow`, `video-render` and `pipeline-review` each
   carried only `type: reference`. They sat on disk, in the right directory, for months, and could
   not be invoked by any question.
2. **It was written and does not parse.** A YAML scalar cannot contain a colon followed by a space
   unless it is quoted. `description: Produces a lesson MP4 ... Stack: beats.js ...` is invalid, and
   the skill loads with its H1 heading as its description instead. This had silently disabled
   `creating-explainer-videos`, the DEFAULT video pipeline.

Neither raises an error. The tell is the skill listing echoing the skill NAME where the description
should be.

`smoke-test.sh` had a frontmatter test the whole time. It checked that frontmatter *existed*. That
is the recurring shape: a guard that asserts presence rather than content passes forever.

Now enforced by `evals/skills/run.js` (Layer 1), in `smoke-test.sh` and in the PostToolUse hook.
Contract: `.claude/standards/SKILL_AUTHORING.md`.

Related: [[H9]] (the artefact is the evidence, not the exit code), [[H13]] (a green check you have
never seen fail is not a check).

---

### H27. A pause that is only a `break` is invisible, and only a paid action will end it

**Added:** 2026-09-23 | **Applies to:** any worker loop that stops for a human
**Invalidate if:** the course worker persists an explicit paused state (it does not; see §3.6)

`drain()` stopped on the first non-`done` lesson by breaking out of its loop. Nothing recorded
that it had stopped, the status endpoint showed `building: null` for parked exactly as for idle,
and the only callers of `kick()` were build, approve and requeue — so the free action a tenant
would reach for (`reject`) accepted the request, logged it, and released nothing. One course's
failure parked every course for a day.

The shape to recognise: a loop that stops for a person must (1) make the stop **derivable** from
durable state (`needsResume = !running && eligible().length > 0`), (2) expose it on the same
endpoint a consumer already polls, (3) have at least one **free** way to restart, and (4) scope
the stop to the unit that failed (the course), not the process. If any of the four is missing,
the first tenant to hit it will pay to find out.

A corollary on fixes: "just add `kick()` to reject" would have built the next lesson of the
course a person had just refused, because the rejected lesson was `failed` and its sibling was
now first in line. Scope (4) has to exist before the restart (3) is safe.

Related: [[H9]] (the artefact is the evidence), [[H13]] (a guard that asserts presence rather
than content passes forever — `building` asserted presence of work, not its state).

---

### H28. Never redeploy while the worker is building — read `/health` first, not the log you remember

**Added:** 2026-09-23 | **Applies to:** every `railway redeploy` / push-to-main of this service
**Invalidate if:** builds move off the web container onto a worker that survives a redeploy

A redeploy restarts the one container the course worker runs in. A lesson mid-build is parked as
`interrupted`, its render directory is gone, and its model spend of the last minutes is never
settled. On 2026-09-23 the LMS's authorised lesson started at 06:08Z and a redeploy landed at 06:11Z
with `/health.courses.worker.building: true` visible the whole time. The doc had warned "a redeploy
costs at most the lesson in flight" — and that is exactly the lesson it cost, somebody else's.

Rule: `node scripts/predeploy-check.js` before every push-to-main; `--wait` if you would rather
queue behind the build than skip the deploy. It is in the CLAUDE.md deploy line. Corollary for the
LMS side, already in their memo: a repo says what was committed, `/health` says what is running.

Related: [[H4]] (verify against production, not defaults), [[H27]] (a pause that is only a `break`).
