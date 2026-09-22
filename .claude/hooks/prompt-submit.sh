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
exit 0
