#!/bin/bash
# Waits for the 01+02 job, then renders video 06 (its VO is now regenerated and sidecar-clean).
set -u
LOG="C:/Users/AROMAT~1/AppData/Local/Temp/claude/c--Users-Aroma-Tahir-Downloads-Content-Queen/d01bb709-8c60-4df6-a3a5-53dfc8960103/tasks/but0pg93m.output"
echo "[queue] waiting for the 01+02 renders to finish …"
for i in $(seq 1 300); do grep -q "MODULE BUILD FINISHED" "$LOG" 2>/dev/null && break; sleep 15; done
echo "[queue] rendering video 06"
dir=self-healing-06-prove-it-got-better
cd "$dir" || exit 1
echo "################ $dir ################"
echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l) i2v clip(s)"
for attempt in 1 2 3; do
  rm -rf frames; rm -f out/lesson.mp4
  touch .build_marker
  node compile-lesson.js > .compile.log 2>&1; rc=$?
  grep -E "^\[compile\] [0-9]+ beats" .compile.log | tail -1
  if [ $rc -eq 0 ] && [ -f out/lesson.mp4 ] && [ out/lesson.mp4 -nt .build_marker ]; then
    echo "[ok] fresh lesson.mp4 (attempt $attempt)"; break
  fi
  echo "!!! COMPILE FAILED (attempt $attempt, rc=$rc) — $(tail -c 400 .compile.log | tr '\r' '\n' | tail -1)"
  [ $attempt -eq 3 ] && { echo "!!! GIVING UP: $dir"; exit 1; }
  echo "[retry] re-running compile …"
done
rm -f .build_marker
node stitch-brand.js --title "Prove It Got Better" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "DELIVERABLE|Error" | tail -1
node verify.js --final "out/${dir}_final.mp4" 2>&1 | tail -11
node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
echo "################ DONE $dir ################"
echo "V06 FINISHED"
