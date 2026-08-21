#!/bin/bash
# Remaining three: 01 and 02 need re-render (their VO was regenerated for the new terminology),
# 06 was never rendered. Same no-false-pass guard + both mandatory gates.
set -u
build () {
  local dir="$1" title="$2" attempt rc
  echo "################ $dir ################"
  cd "$dir" || return 1
  echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l) i2v clip(s)"
  for attempt in 1 2 3; do
    rm -rf frames; rm -f out/lesson.mp4
    touch .build_marker
    node compile-lesson.js > .compile.log 2>&1; rc=$?
    grep -E "^\[compile\] [0-9]+ beats" .compile.log | tail -1
    if [ $rc -eq 0 ] && [ -f out/lesson.mp4 ] && [ out/lesson.mp4 -nt .build_marker ]; then
      echo "[ok] fresh lesson.mp4 (attempt $attempt)"; break
    fi
    echo "!!! COMPILE FAILED (attempt $attempt, rc=$rc) — $(grep -oE 'Error: .*' .compile.log | head -1)"
    if [ $attempt -eq 3 ]; then echo "!!! GIVING UP: $dir"; rm -f .build_marker; cd ..; return 1; fi
    echo "[retry] re-running compile …"
  done
  rm -f .build_marker
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "DELIVERABLE|Error" | tail -1
  node verify.js --final "out/${dir}_final.mp4" 2>&1 | tail -11
  node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
  cd ..
  echo "################ DONE $dir ################"
}
build self-healing-06-prove-it-got-better    "Prove It Got Better"
build self-healing-01-fixes-its-own-mistakes "The Room That Fixes Its Own Mistakes"
build self-healing-02-who-checks-the-work    "Who Checks The Work"
echo "MODULE BUILD FINISHED"
