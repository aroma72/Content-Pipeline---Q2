#!/bin/bash
# Stop hook — publish any video question that changed this session.
#
# Taleemabad University draws the in-video question popup from our checkpoint
# API, which serves beats.js out of the deployed container. So a question only
# reaches learners once its video is committed, pushed and rebuilt. Left to a
# human that step gets forgotten, and the failure is silent: the video ships,
# the popup simply never appears.
#
# Runs async (see .claude/settings.json) because a deploy takes minutes and must
# not hold up the end of a session. Output goes to the log below.

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG="$REPO/.claude/logs/publish-checkpoints.log"
mkdir -p "$(dirname "$LOG")"

# Nothing to do unless a video's script or timings actually moved. Checked here
# as well as in the script so the common case costs no node startup at all.
cd "$REPO" || exit 0
CHANGED=$(git status --porcelain -- 'explainer-videos/*/*/beats.js' 'explainer-videos/*/*/durations.json' 2>/dev/null)
UNPUSHED=$(git diff --name-only origin/main -- 'explainer-videos/*/*/beats.js' 'explainer-videos/*/*/durations.json' 2>/dev/null)
if [ -z "$CHANGED" ] && [ -z "$UNPUSHED" ]; then
  exit 0
fi

{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="
  node scripts/publish-checkpoint.js
  echo "exit=$?"
} >> "$LOG" 2>&1

# A failure here means a video shipped without its question reaching the LMS —
# worth saying out loud rather than leaving in a log nobody opens.
if tail -20 "$LOG" | grep -qE '^\[publish-checkpoint\] (REFUSED|FAILED|ERROR)'; then
  printf '{"systemMessage":"Quiz checkpoint NOT published — see .claude/logs/publish-checkpoints.log"}\n'
  exit 2
fi

exit 0
