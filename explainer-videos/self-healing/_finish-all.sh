#!/bin/bash
# PHASE A: regenerate VO for the 3 videos whose narration now names the terms
# PHASE B: rebuild the assignment docx (harness-assignment format)
# PHASE C: render all 7 deliverables, with no false-pass path and both mandatory gates
set -u

echo "======== PHASE A · voiceover for edited narration ========"
for d in self-healing-01-fixes-its-own-mistakes self-healing-02-who-checks-the-work self-healing-06-prove-it-got-better; do
  echo "---- TTS $d"
  ( cd "$d" && node tts-lesson.js --yes 2>&1 | grep -E "^\[tts\] wrote|FAIL|Error" | tail -2 )
done

echo "======== PHASE B · assignment docx ========"
( cd self-healing-assignment && NODE_PATH="../../harness/harness-assignment-2/node_modules" node make-assignment-doc.js 2>&1 | tail -2 )

echo "======== PHASE C · render all seven ========"
build () {
  local dir="$1" title="$2" html="${3:-}" attempt rc
  echo "################ $dir ################"
  cd "$dir" || return 1
  echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l) i2v clip(s)"
  for attempt in 1 2; do
    rm -rf frames; rm -f out/lesson.mp4        # no stale fallback -> a crash cannot false-pass
    touch .build_marker
    if [ -n "$html" ]; then LESSON_HTML="$html" node compile-lesson.js > .compile.log 2>&1; rc=$?
    else node compile-lesson.js > .compile.log 2>&1; rc=$?; fi
    grep -E "^\[compile\] [0-9]+ beats" .compile.log | tail -1
    if [ $rc -eq 0 ] && [ -f out/lesson.mp4 ] && [ out/lesson.mp4 -nt .build_marker ]; then
      echo "[ok] fresh lesson.mp4 (attempt $attempt)"; break
    fi
    echo "!!! COMPILE FAILED (attempt $attempt, rc=$rc) — $(grep -oE 'Error: .*' .compile.log | head -1)"
    if [ $attempt -eq 2 ]; then echo "!!! GIVING UP: $dir"; rm -f .build_marker; cd ..; return 1; fi
    echo "[retry] re-running compile …"
  done
  rm -f .build_marker
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "DELIVERABLE|Error" | tail -1
  node verify.js --final "out/${dir}_final.mp4" 2>&1 | tail -11
  node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
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
