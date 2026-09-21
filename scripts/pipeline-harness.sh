#!/usr/bin/env bash
# Run the render gates against committed videos, inside the deploy image, for $0.
#
# WHY THIS EXISTS
#
# The gates could previously only be tested by buying a lesson. One render cost
# $2.81, surfaced exactly ONE failure, and stopped -- so finding five bugs meant
# five renders and half a day. Worse, the environment that broke was never the
# one being tested: a laptop has Chrome, so a missing-browser failure in the
# container was invisible until real money had been spent on a real lesson.
#
# So: same image as production, real committed videos, stand-in art, no paid
# calls. It runs EVERY gate against EVERY fixture and reports all failures at the
# end rather than stopping at the first, because the point is to find the whole
# list in one pass.
#
#   bash scripts/pipeline-harness.sh                 # every fixture
#   bash scripts/pipeline-harness.sh <video-dir> ...  # just these
#
# Exits non-zero if any gate fails on any fixture.

set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"

BASE_TAG=content-queen:base
HARNESS_TAG=content-queen:harness

# Two shapes, deliberately. A gate written against one and never run against the
# other is the exact fault that cost $2.81: qa-frames' "every beat must show
# text" rule was reasonable for the text-heavy shape and wrong for the
# illustration-led one, and nothing ever ran it against the second.
# Fixtures are videos that SHOULD pass every gate, so a red harness means a gate
# or the pipeline regressed -- not that an old video predates a newer rule.
# evals-03 was the first choice and was wrong for exactly that reason: it was made
# 2026-08-20, before checkpoints were required, so qa-checkpoint failed it
# correctly and told us nothing about the code under test.
DEFAULT_FIXTURES=(
  "explainer-videos/notion-slack/notion-slack-01-locked-out" # illustration-led: 15 of 24 beats are art, all captioned
  "explainer-videos/notion-slack/ns-01-why-a-chat-window"    # text-heavy: 17 of 23 beats are info
)

# Gates that read a video folder and judge it. These are the ones that have
# barely run: they were wired to block in a7311a8 and the first of them to
# execute anywhere did so two days later, in production, after the spend.
GATES=(qa-frames.js qa-info.js qa-cutouts.js qa-checkpoint.js)

FIXTURES=("$@")
[ ${#FIXTURES[@]} -eq 0 ] && FIXTURES=("${DEFAULT_FIXTURES[@]}")

command -v docker >/dev/null 2>&1 || { echo "docker is required"; exit 2; }

echo "==> building the deploy image (cached after the first run)"
docker build -q -t "$BASE_TAG" "$REPO" >/dev/null || { echo "base image build FAILED"; exit 2; }
docker build -q -t "$HARNESS_TAG" -f "$REPO/scripts/harness/Dockerfile" "$REPO" >/dev/null \
  || { echo "harness image build FAILED"; exit 2; }

TEMPLATES=.claude/skills/creating-explainer-videos/templates
FAILURES=()
SKIPS=()
PASSES=0

for fx in "${FIXTURES[@]}"; do
  [ -f "$REPO/$fx/beats.js" ] || { echo "!! no beats.js in $fx -- skipping"; continue; }

  echo
  echo "=============================================================="
  echo "  $fx"
  echo "=============================================================="

  node scripts/make-fixture-assets.js "$fx" || { FAILURES+=("$fx: fixture assets"); continue; }

  for gate in "${GATES[@]}"; do
    [ -f "$REPO/$TEMPLATES/$gate" ] || continue
    printf '  %-20s ' "$gate"

    # The gate is copied in beside the fixture, as produce.js does, so it sees the
    # folder layout it expects. --shm-size because a container's default /dev/shm
    # is 64MB and Chrome dies writing into it -- the same trap the gates hit in
    # production, reproduced here rather than discovered there.
    out=$(docker run --rm \
      -v "$REPO:/work" \
      -w "/work/$fx" \
      --shm-size=1g \
      "$HARNESS_TAG" \
      sh -c "cp /work/$TEMPLATES/$gate ./__gate.js 2>/dev/null; node ./__gate.js; rc=\$?; rm -f ./__gate.js; exit \$rc" 2>&1)
    rc=$?

    if [ $rc -eq 0 ]; then
      if echo "$out" | grep -q '⏭'; then
        echo "SKIP"
        SKIPS+=("$fx / $gate: $(echo "$out" | grep '⏭' | head -1 | cut -c1-90)")
      else
        echo "PASS"
        PASSES=$((PASSES + 1))
      fi
    else
      echo "FAIL (exit $rc)"
      echo "$out" | sed 's/^/      /' | head -25
      FAILURES+=("$fx / $gate (exit $rc)")
    fi
  done
done

echo
echo "=============================================================="
echo "  $PASSES passed, ${#FAILURES[@]} failed, ${#SKIPS[@]} skipped"
echo "=============================================================="

# A skip is reported, never counted as success. A harness that quietly stops
# testing looks exactly like a harness that passes.
for s in "${SKIPS[@]:-}"; do [ -n "$s" ] && echo "  SKIP  $s"; done
for f in "${FAILURES[@]:-}"; do [ -n "$f" ] && echo "  FAIL  $f"; done

[ ${#FAILURES[@]} -eq 0 ] || exit 1
echo
echo "All gates green on every fixture. This is the state a paid render should start from."
