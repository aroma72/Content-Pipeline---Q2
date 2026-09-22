#!/bin/bash
# Shared setup for the memory hooks. Sourced, never executed.
#
# Everything here exists because of a specific failure:
#   - the fingerprint, because a hook that stopped firing looked exactly like a quiet month
#   - the interpreter probe, because `python3` on this machine is a Store stub that exits
#     non-zero and writes to stdout, so it fails like a real error (lessons.md H1)
#   - the kill switch, because these hooks must be inert in the deployed container
#   - DR_REPO_ROOT, because a hook whose only test is "start a session and eyeball it" rots

# Kill switch: no memory bookkeeping inside the Railway container.
[ -n "${RAILWAY_ENVIRONMENT:-}" ] && exit 0

DR_REPO_ROOT="${DR_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
MEM="$DR_REPO_ROOT/.claude/memories"
ARCHIVE="$MEM/session-archive"
MEM_PY="$DR_REPO_ROOT/.claude/memory-db/mem.py"
ACTIVE="$MEM/active-session.md"
TODAY="$(date +%Y-%m-%d)"

# Single source of truth for the hot-file budget. Never restate this number anywhere else:
# Nazim ran 80 in one place and 300 in another for weeks, so its compaction directive fired on
# every single turn, which teaches the reader to skip hook output entirely.
BUDGET_LINES="${DR_ACTIVE_SESSION_BUDGET:-300}"

mkdir -p "$ARCHIVE" 2>/dev/null

# Hook output lands in Claude's context. Without this, Python writing to a pipe on Windows falls
# back to cp1252 and every em-dash in a directive arrives as a replacement character.
export PYTHONIOENCODING=utf-8
export PYTHONUTF8=1

# Liveness fingerprint. One line, so "has this hook fired lately?" is answerable.
printf '%s\t%s\n' "$(date +%s)" "${BASH_SOURCE[1]##*/}" >> "$MEM/hook-runs.log" 2>/dev/null || true

# Resolve a working interpreter by RUNNING each candidate, not by asking `command -v`:
# the Store stub is on PATH and answers `command -v` happily.
dr_python() {
  local c
  for c in py python python3; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c "" >/dev/null 2>&1; then echo "$c"; return 0; fi
  done
  return 1
}
PY="$(dr_python || echo "")"

# Make sure today's cold-tier file exists before anything appends to it.
dr_ensure_archive() {
  local f="$ARCHIVE/$TODAY.md"
  [ -f "$f" ] || printf '# Session Archive — %s\n\nWritten by the memory hooks at session close.\n\n---\n\n' "$TODAY" > "$f"
  echo "$f"
}

# mkdir is atomic create-or-fail on NTFS through Git Bash; flock is not reliable here.
# Two Claude sessions share this repo, so any read-modify-write of the hot file takes this.
dr_lock() {
  local lock="$MEM/.rotate.lock" waited=0
  while ! mkdir "$lock" 2>/dev/null; do
    # A lock older than 60s belonged to a process that died holding it.
    if [ -d "$lock" ] && [ -n "$(find "$lock" -maxdepth 0 -mmin +1 2>/dev/null)" ]; then
      rm -rf "$lock" 2>/dev/null; continue
    fi
    waited=$((waited + 1)); [ "$waited" -ge 10 ] && return 1
    sleep 0.5
  done
  echo $$ > "$lock/pid" 2>/dev/null
  return 0
}
dr_unlock() { rm -rf "$MEM/.rotate.lock" 2>/dev/null; }
