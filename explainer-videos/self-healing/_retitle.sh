#!/bin/bash
# render-bumpers.js builds its frames in ONE shared dir inside brand-intro-outro/ and wipes it each
# run, so two videos stitching concurrently swap title cards. (v06 got v03's title.) Re-stitch every
# video STRICTLY SEQUENTIALLY, then read the title card back out of each finished file.
set -u
declare -A T=(
  [self-healing-01-fixes-its-own-mistakes]="The Room That Fixes Its Own Mistakes"
  [self-healing-02-who-checks-the-work]="Who Checks The Work"
  [self-healing-03-remembering-the-fix]="Remembering The Fix"
  [self-healing-04-changing-the-brain]="Changing The Brain Itself"
  [self-healing-05-fix-the-system-first]="Fix The System Before The Brain"
  [self-healing-06-prove-it-got-better]="Prove It Got Better"
  [self-healing-assignment]="Self-Healing & Self-Improving — Assignment"
)
for d in "${!T[@]}"; do
  [ -f "$d/out/lesson.mp4" ] || { echo "skip $d (no lesson.mp4)"; continue; }
  echo "---- $d  ->  \"${T[$d]}\""
  ( cd "$d" && rm -rf out/_bumpers && \
    node stitch-brand.js --title "${T[$d]}" --lesson out/lesson.mp4 --out "out/${d}_final.mp4" 2>&1 | grep -cE "DELIVERABLE" | xargs -I{} echo "     restitched" && \
    node verify.js --final "out/${d}_final.mp4" 2>&1 | grep -E "VERIFY:" | tail -1 )
done
echo "RETITLE DONE"
