#!/bin/bash
# Waits for the art-fix pass, then renders 02-06 back to back. Video 01 skipped per Aroma.
set -u
LOG="C:/Users/AROMAT~1/AppData/Local/Temp/claude/c--Users-Aroma-Tahir-Downloads-Content-Queen/d01bb709-8c60-4df6-a3a5-53dfc8960103/tasks/b248mc52h.output"
for i in $(seq 1 400); do grep -q "ART FIX PASS DONE" "$LOG" 2>/dev/null && break; sleep 10; done
echo "[queue] art fixed — rendering"
one () {
  local dir="$1" title="$2" attempt rc want got
  echo "################ $dir ################"
  cd "$dir" || return 1
  want=$(node -e "const d=require('./durations.json');console.log(Object.values(d).filter(x=>typeof x==='number').reduce((a,c)=>a+c,0).toFixed(0))")
  for attempt in 1 2 3; do
    rm -rf frames; rm -f out/lesson.mp4
    node compile-lesson.js > .compile.log 2>&1; rc=$?
    got=$(node -e "
      const {execFileSync}=require('child_process');const f=require('ffmpeg-static');
      try{execFileSync(f,['-hide_banner','-i','out/lesson.mp4'],{stdio:['pipe','pipe','pipe']});console.log(0);}
      catch(e){const m=String(e.stderr||'').match(/Duration: (\d+):(\d+):(\d+)/);console.log(m?(+m[1]*3600 + +m[2]*60 + +m[3]):0);}
    " 2>/dev/null || echo 0)
    [ "$rc" -eq 0 ] && [ "${got:-0}" -ge $(( want * 95 / 100 )) ] && { echo "[ok] ${got}s/${want}s"; break; }
    echo "!!! BAD ($attempt) ${got:-0}s of ${want}s"
    [ $attempt -eq 3 ] && { echo "!!! GIVING UP: $dir"; cd ..; return 1; }
  done
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" >/dev/null 2>&1
  node verify.js --final "out/${dir}_final.mp4" 2>&1 | grep -E "VERIFY:" | tail -1
  node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
  cd ..
  echo "################ DONE $dir ################"
}
one self-healing-02-who-checks-the-work    "Who Checks The Work"
one self-healing-03-remembering-the-fix    "Remembering The Fix"
one self-healing-04-changing-the-brain     "Changing The Brain Itself"
one self-healing-05-fix-the-system-first   "Fix The System Before The Brain"
one self-healing-06-prove-it-got-better    "Prove It Got Better"
echo "ALL FIVE DONE"
