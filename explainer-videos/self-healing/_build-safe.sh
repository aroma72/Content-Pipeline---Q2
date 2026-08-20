#!/bin/bash
# Render with NO false-pass path:
#   - delete out/lesson.mp4 BEFORE compiling, so a crashed compile cannot be papered over
#     by a stale file from an earlier run (this exact bug reported VERIFY: PASS on a crashed v03)
#   - capture the compile exit code explicitly
#   - require the new lesson.mp4 to be newer than a marker touched at compile start
#   - retry a crashed compile once (puppeteer frame detachment is usually transient)
#   - run eval-text.js too, so both mandatory gates clear
set -u
build () {
  local dir="$1" title="$2" html="${3:-}" attempt rc
  echo "################ $dir ################"
  cd "$dir" || return 1
  echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l) i2v clip(s)"
  for attempt in 1 2; do
    rm -rf frames; rm -f out/lesson.mp4          # <-- no stale fallback possible
    touch .build_marker
    if [ -n "$html" ]; then LESSON_HTML="$html" node compile-lesson.js > .compile.log 2>&1; rc=$?
    else node compile-lesson.js > .compile.log 2>&1; rc=$?; fi
    grep -E "^\[compile\]" .compile.log | tail -3
    if [ $rc -eq 0 ] && [ -f out/lesson.mp4 ] && [ out/lesson.mp4 -nt .build_marker ]; then
      echo "[ok] compile produced a FRESH lesson.mp4 (attempt $attempt)"; break
    fi
    echo "!!! COMPILE FAILED (attempt $attempt, rc=$rc) — $(grep -oE 'Error: .*' .compile.log | head -1)"
    if [ $attempt -eq 2 ]; then echo "!!! GIVING UP: $dir"; rm -f .build_marker; cd ..; return 1; fi
    echo "[retry] re-running compile …"
  done
  rm -f .build_marker
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "DELIVERABLE|Error" | tail -2
  node verify.js --final "out/${dir}_final.mp4" 2>&1 | tail -12
  node eval-text.js 2>&1 | tail -3
  cd ..
  echo "################ DONE $dir ################"
}
build self-healing-03-remembering-the-fix    "Remembering The Fix"
build self-healing-04-changing-the-brain     "Changing The Brain Itself"
build self-healing-05-fix-the-system-first   "Fix The System Before The Brain"
build self-healing-06-prove-it-got-better    "Prove It Got Better"
build self-healing-assignment                "Self-Healing & Self-Improving — Assignment" "animation/assessment.html"
echo "MODULE BUILD FINISHED"
