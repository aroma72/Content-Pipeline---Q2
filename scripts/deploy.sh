#!/usr/bin/env bash
# The ONLY supported way to deploy content-queen.
#
#   bash scripts/deploy.sh                 # deploy origin/main
#   bash scripts/deploy.sh --ref <ref>     # deploy another pushed ref
#   bash scripts/deploy.sh --no-wait       # refuse instead of waiting for in-flight work
#
# Why this exists (2026-09-25): `railway redeploy --from-source` is a NO-OP for
# code on this service (no GitHub source is connected) but it still restarts the
# container -- and two of those restarts landed on a job being written and took
# its script with them. Three earlier "deploys" changed nothing and reported
# success. So:
#
#   1. refuse while anything is running (predeploy-check reads /health)
#   2. upload a clean tree from the PUSHED commit (git archive: tracked files only,
#      so no .env, no orchestrator/.credentials/)
#   3. stamp the commit into build.json so /health can prove which build answers
#   4. wait until /health reports THAT commit -- "Triggered a deploy" is not proof
#   5. run verify-live.js
set -euo pipefail

REF="origin/main"
WAIT="--wait"
BASE="${BASE:-https://content-queen-production.up.railway.app}"
SERVICE="${RAILWAY_SERVICE:-content-queen}"
ENVIRONMENT="${RAILWAY_ENV:-production}"

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) REF="$2"; shift 2 ;;
    --no-wait) WAIT=""; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

echo "== 1/5 refusing to deploy onto running work"
BASE="$BASE" node scripts/predeploy-check.js $WAIT

echo "== 2/5 resolving $REF"
git fetch origin --quiet
COMMIT="$(git rev-parse "$REF")"
SHORT="$(git rev-parse --short "$REF")"
if ! git merge-base --is-ancestor "$COMMIT" origin/main 2>/dev/null; then
  echo "   note: $REF ($SHORT) is not on origin/main -- deploying it anyway because you asked"
fi
echo "   $REF = $COMMIT"

SCRATCH="$(mktemp -d)"
SRC="$SCRATCH/deploy-src"
mkdir -p "$SRC"
trap 'rm -rf "$SCRATCH"' EXIT

echo "== 3/5 exporting tracked files only"
git archive "$COMMIT" | tar -x -C "$SRC"
# Never deploy a tree that could carry a secret.
if [ -e "$SRC/.env" ] || [ -d "$SRC/orchestrator/.credentials" ]; then
  echo "   refusing: the export contains .env or orchestrator/.credentials" >&2
  exit 1
fi
printf '{ "commit": "%s", "builtAt": "%s", "by": "%s" }\n' \
  "$COMMIT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${USER:-${USERNAME:-unknown}}" > "$SRC/build.json"
echo "   $(find "$SRC" -type f | wc -l | tr -d ' ') files, build.json stamped $SHORT"

echo "== 4/5 uploading to railway ($SERVICE / $ENVIRONMENT)"
# A LOCAL path for a native Windows exe must be converted (C:/...), which is the
# opposite of the MSYS_NO_PATHCONV rule for remote paths like /data/cq-jobs.
# cygpath does it explicitly on Git Bash; elsewhere the path is already native.
SRC_NATIVE="$SRC"
if command -v cygpath >/dev/null 2>&1; then SRC_NATIVE="$(cygpath -m "$SRC")"; fi
railway up "$SRC_NATIVE" --path-as-root -s "$SERVICE" -e "$ENVIRONMENT" --detach -y

echo "== 5/5 waiting for /health to answer with $SHORT"
DEADLINE=$(( $(date +%s) + 600 ))
while :; do
  GOT="$(curl -s --max-time 10 "$BASE/health" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(String((j.build&&j.build.commit)||""))}catch(e){process.stdout.write("")}})' 2>/dev/null || true)"
  if [ "$GOT" = "$COMMIT" ]; then
    echo "   live: /health.build.commit = $SHORT"
    break
  fi
  if [ "$(date +%s)" -ge "$DEADLINE" ]; then
    echo "   TIMED OUT: /health still reports '${GOT:-<no build stamp>}' after 10 minutes. Check 'railway logs'." >&2
    exit 1
  fi
  sleep 15
done

node scripts/verify-live.js --base "$BASE"
echo "== deployed $SHORT"
