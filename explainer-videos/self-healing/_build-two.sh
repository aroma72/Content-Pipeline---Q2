#!/bin/bash
set -u
build () {
  local dir="$1" title="$2"
  echo "################ $dir ################"
  cd "$dir" || return 1
  rm -rf frames
  node compile-lesson.js 2>&1 | grep -E "^\[compile\]|Error|error:" | tail -4
  if [ ! -f out/lesson.mp4 ]; then echo "!!! COMPILE FAILED: $dir"; cd ..; return 1; fi
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "^\[brand\]|Error" | tail -4
  node verify.js 2>&1 | tail -20
  cd ..
  echo "################ DONE $dir ################"
}
build self-healing-01-fixes-its-own-mistakes "The Room That Fixes Its Own Mistakes"
build self-healing-assignment                "Self-Healing & Self-Improving — Assignment"
echo "TWO BUILDS FINISHED"
