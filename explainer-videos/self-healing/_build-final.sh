#!/bin/bash
# Final render of the whole module. verify.js gets --final (it defaults to out/lesson_final.mp4,
# but stitch-brand writes out/<dir>_final.mp4 — that mismatch caused a false FAIL).
set -u
build () {
  local dir="$1" title="$2" html="${3:-}"
  echo "################ $dir ################"
  cd "$dir" || return 1
  echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l) i2v clip(s)"
  rm -rf frames
  if [ -n "$html" ]; then LESSON_HTML="$html" node compile-lesson.js 2>&1 | grep -E "^\[compile\]|Error|error:" | tail -4
  else node compile-lesson.js 2>&1 | grep -E "^\[compile\]|Error|error:" | tail -4; fi
  if [ ! -f out/lesson.mp4 ]; then echo "!!! COMPILE FAILED: $dir"; cd ..; return 1; fi
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "DELIVERABLE|Error" | tail -2
  node verify.js --final "out/${dir}_final.mp4" 2>&1 | tail -18
  cd ..
  echo "################ DONE $dir ################"
}
build self-healing-01-fixes-its-own-mistakes "The Room That Fixes Its Own Mistakes"
build self-healing-02-who-checks-the-work    "Who Checks The Work"
build self-healing-03-remembering-the-fix    "Remembering The Fix"
build self-healing-04-changing-the-brain     "Changing The Brain Itself"
build self-healing-05-fix-the-system-first   "Fix The System Before The Brain"
build self-healing-06-prove-it-got-better    "Prove It Got Better"
build self-healing-assignment                "Self-Healing & Self-Improving — Assignment" "animation/assessment.html"
echo "MODULE BUILD FINISHED"
