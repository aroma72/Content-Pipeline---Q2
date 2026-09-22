#!/bin/bash
# capture-active-session-changes.sh — keep what an edit removes from the hot file.
#
# active-session.md is rewritten constantly. Without this, an Edit that replaces a block destroys
# the only copy of it. Appending the removed text to today's archive first makes every edit of the
# hot tier reversible, which is what "lossless by construction" means in MEMORY_TIERS.md §6.
#
# $1 = file path being edited   $2 = the old_string being replaced

set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/_memory-lib.sh"

FILE="${1:-}"
OLD="${2:-}"
case "$FILE" in *active-session.md) ;; *) exit 0 ;; esac
[ -n "$OLD" ] || exit 0

ARCHIVE_FILE="$(dr_ensure_archive)"
{
  printf '\n<!-- removed from active-session.md at %s — kept so the edit is reversible -->\n' "$(date +%H:%M:%S)"
  printf '%s\n' "$OLD"
} >> "$ARCHIVE_FILE" 2>/dev/null

exit 0
