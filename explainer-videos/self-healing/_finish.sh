#!/bin/bash
# Phase 1: the remaining i2v clips (kie funded).  Phase 2: compile -> brand -> verify all six.
set -u
echo "======== PHASE 1 · i2v clips ========"
clips () {
  local dir="$1" ids="$2"
  echo "---- i2v $dir  [$ids]"
  ( cd "$dir" && ART_IDS="$ids" node generate-lesson-video-omni.js --yes 2>&1 | grep -E "^\[i2v\]|^\[spend\]" | tail -6 )
}
clips self-healing-01-fixes-its-own-mistakes 09,24
clips self-healing-02-who-checks-the-work    08,11,25
clips self-healing-03-remembering-the-fix    03,11,25
clips self-healing-04-changing-the-brain     04,11,24
clips self-healing-05-fix-the-system-first   06,16,25
echo "======== CLIP INVENTORY ========"
for d in self-healing-0*; do echo "$d -> $(ls $d/clips/*.mp4 2>/dev/null | wc -l) clips"; done
echo "======== PHASE 2 · render ========"
bash _build-all.sh
