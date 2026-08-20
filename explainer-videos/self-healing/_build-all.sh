#!/bin/bash
# Renders every video in the module: compile -> brand-wrap -> verify. Free/local.
set -u
build () {
  local dir="$1" title="$2"
  echo "################ $dir ################"
  cd "$dir" || return 1
  rm -rf frames
  node compile-lesson.js 2>&1 | grep -E "^\[compile\]|Error|error:" | tail -6
  if [ ! -f out/lesson.mp4 ]; then echo "!!! COMPILE FAILED: $dir"; cd ..; return 1; fi
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "^\[brand\]|Error" | tail -5
  node verify.js 2>&1 | tail -18
  cd ..
  echo "################ DONE $dir ################"
}
build self-healing-01-fixes-its-own-mistakes "The Room That Fixes Its Own Mistakes"
build self-healing-02-who-checks-the-work    "Who Checks The Work"
build self-healing-03-remembering-the-fix    "Remembering The Fix"
build self-healing-04-changing-the-brain     "Changing The Brain Itself"
build self-healing-05-fix-the-system-first   "Fix The System Before The Brain"
build self-healing-assignment                "Self-Healing & Self-Improving — Assignment"
echo "ALL BUILDS FINISHED"
