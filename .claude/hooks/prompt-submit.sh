#!/bin/bash
# prompt-submit.sh — the standing protocol, injected on every prompt.
#
# This is the one mechanism that does not rely on anybody remembering. Everything else in the
# memory system is triggered by size or staleness; the habit of actually writing down what
# happened has no natural trigger, so it gets one here.
#
# Kept deliberately short. It is paid for on every single turn, and a long reminder is one the
# reader learns to skip.

set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_memory-lib.sh"

# stdin is a stream and it is readable exactly once. Capture the whole payload
# here, before anything downstream can swallow it.
PAYLOAD="$(cat 2>/dev/null || true)"

cat <<'TEXT'
MEMORY PROTOCOL — before this response ends:

1. Update .claude/memories/active-session.md with what changed, what was learned, and what the
   next session should pick up. Put it under a `## YYYY-MM-DD` heading — rotation needs that
   heading to find a safe cut point.
2. Durable rule (would still be true in three months)? It belongs in a warm file, not the hot one
   — see .claude/standards/MEMORY_TIERS.md §1.
3. Bug that took 3+ attempts, or a decision worth defending later? Record the root cause, not just
   the fix.

SECRETS: never write a live token, key, password, connection string, or a private UUID or URL into
any tracked file — memory files are tracked.
TEXT

# One short routing line when a skill clearly matches this prompt, nothing
# otherwise. Never blocks; failure here must never cost the user a turn.
if [ -n "$PAYLOAD" ] && command -v node >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
  PROMPT_TEXT="$(printf '%s' "$PAYLOAD" | jq -r '.prompt // .prompt_text // empty' 2>/dev/null || true)"
  ROUTER="$(dirname "${BASH_SOURCE[0]}")/../scripts/route-skill.js"
  if [ -n "$PROMPT_TEXT" ] && [ -f "$ROUTER" ]; then
    printf '%s' "$PROMPT_TEXT" | node "$ROUTER" 2>/dev/null || true
  fi
fi
exit 0
