#!/bin/bash
# capture-tool-failures.sh — record a failed tool call as a mistake.
#
# Registered on PostToolUse (matcher "*") AND PostToolUseFailure. PostToolUse fires only on
# SUCCESS, so it is the second registration that actually carries failures — but the payload shape
# for PostToolUseFailure is not publicly documented, so this hook sniffs the text it is given
# rather than trusting a field name. Recording a success costs one skipped branch; missing every
# failure would make the whole mistakes tier silently empty.
#
# ALWAYS exits 0. It runs after every single tool call, and the settings.json wrapper turns a
# non-zero exit into a model-visible correction — so one transient SQLite lock would otherwise
# produce an error message after every tool call in the session.
#
# $1 = tool name   $2 = tool response / error text

set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_memory-lib.sh"

TOOL="${1:-unknown}"
BODY="${2:-}"
[ -n "$BODY" ] || exit 0

# The typed verdict we don't get from a field. Anchored so a Bash command that merely mentions
# the word "error" in a grep pattern isn't logged as a failure.
IS_ERROR=0
printf '%s' "$BODY" | grep -qE '^[[:space:]]*(Exit code [1-9]|<tool_use_error>|ERROR:|Error:|Exception:|Traceback \(most recent call last\)|fatal:|error: )' && IS_ERROR=1
printf '%s' "$BODY" | grep -qE '"(is_error|isError)"[[:space:]]*:[[:space:]]*true' && IS_ERROR=1
[ "$IS_ERROR" -eq 1 ] || exit 0

TS="$(date +%H:%M:%S)"
# `tr` on LF alone leaves CR behind, and tool output on Windows arrives CRLF — a one-record-per-line
# format must not embed a carriage return.
SNIPPET=$(printf '%s' "$BODY" | head -c 300 | tr -s '\r\n\t' '   ')

printf '[%s %s] TOOL=%s | IS_ERROR=true | %s\n' "$TODAY" "$TS" "$TOOL" "$SNIPPET" >> "$MEM/mistakes.md" 2>/dev/null

ARCHIVE_FILE="$(dr_ensure_archive)"
printf -- '  - [%s] TOOL FAILURE: %s — %s\n' "$TS" "$TOOL" "${SNIPPET:0:160}" >> "$ARCHIVE_FILE" 2>/dev/null

# Backgrounded: the retry counter is useful but never worth delaying a tool result for.
if [ -n "$PY" ] && [ -f "$MEM_PY" ]; then
  "$PY" "$MEM_PY" add-mistake --what "TOOL=$TOOL failed: ${SNIPPET:0:160}" --date "$TODAY" >/dev/null 2>&1 &
fi

exit 0
