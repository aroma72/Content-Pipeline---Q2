---
type: reference
last_verified: 2026-09-23
owner: aroma
---

# Claude Code hook contract

Contents: [1. stdin once](#1) · [2. Exit codes](#2) · [3. additionalContext nesting](#3) ·
[4. Event timing](#4) · [5. Testing a hook](#5)

Three hook bugs in this repo all presented identically: **exit 0, having done nothing.** A
shape-valid hook that silently does nothing is worse than no hook — the PreToolUse guard sat
unloaded and force-push to main was unguarded until someone checked.

## <a name="1"></a>1. stdin is a stream — read it exactly once

The payload arrives as JSON on stdin. A wrapper that calls `jq` twice has the **first call consume
the entire payload**; the second gets EOF and the hook exits 0 doing nothing.

```bash
PAYLOAD=$(cat)                                   # once
FILE=$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // empty')
CMD=$(printf '%s' "$PAYLOAD"  | jq -r '.tool_input.command  // empty')
```

**Never** `jq ... | read -r c`. `read` stops at the first newline, so a multi-line Bash command
hides a force-push from the guard.

## <a name="2"></a>2. Exit codes

| Code | Meaning |
|---|---|
| 0 | proceed (stdout may carry JSON the harness acts on) |
| 1 | non-blocking error — the action still happens |
| **2** | **block** — the reason must go to **stderr** to reach the model |

Only exit 2 blocks. A guard that exits 1 is advisory.

## <a name="3"></a>3. `additionalContext` must be nested

```json
{ "hookSpecificOutput": { "hookEventName": "UserPromptSubmit",
                          "additionalContext": "..." } }
```

At the top level it is **silently ignored** — no error, no context.

## <a name="4"></a>4. Event timing

- `Stop` is **per-turn**, not per-session.
- `SessionEnd` has a small shared time budget by default; give expensive work an explicit timeout
  and keep it off the critical path.
- `UserPromptSubmit` fires on **every** turn. Anything it injects is paid for every time.

## <a name="5"></a>5. Testing a hook

Do not test the script in isolation — test **the exact command string from `settings.json`**, which
is where the wrapper bugs live.

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"x.md"}}' \
  | bash -c '<paste the command from settings.json>'
echo "exit=$?"
```

Then assert on what it *did* — the row it wrote, the file it moved, the push it blocked. Not its
status. See the `verify-before-claiming` skill.
