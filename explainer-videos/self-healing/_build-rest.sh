#!/bin/bash
# Waits for the 01+assignment job to finish, then renders 02-05 with whatever clips exist
# (compile falls back to Ken Burns on any beat without clips/<id>.mp4).
set -u
LOG="C:/Users/AROMAT~1/AppData/Local/Temp/claude/c--Users-Aroma-Tahir-Downloads-Content-Queen/d01bb709-8c60-4df6-a3a5-53dfc8960103/tasks/b7j4j194r.output"
echo "[queue] waiting for the 01+assignment job to finish …"
for i in $(seq 1 240); do grep -q "TWO BUILDS FINISHED" "$LOG" 2>/dev/null && break; sleep 15; done
echo "[queue] proceeding with 02-05"
build () {
  local dir="$1" title="$2"
  echo "################ $dir ################"
  cd "$dir" || return 1
  echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l) i2v clip(s) present; remaining beats use Ken Burns"
  rm -rf frames
  node compile-lesson.js 2>&1 | grep -E "^\[compile\]|Error|error:" | tail -4
  if [ ! -f out/lesson.mp4 ]; then echo "!!! COMPILE FAILED: $dir"; cd ..; return 1; fi
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "^\[brand\]|Error" | tail -4
  node verify.js 2>&1 | tail -20
  cd ..
  echo "################ DONE $dir ################"
}
build self-healing-02-who-checks-the-work    "Who Checks The Work"
build self-healing-03-remembering-the-fix    "Remembering The Fix"
build self-healing-04-changing-the-brain     "Changing The Brain Itself"
build self-healing-05-fix-the-system-first   "Fix The System Before The Brain"
echo "ALL REMAINING BUILDS FINISHED"
