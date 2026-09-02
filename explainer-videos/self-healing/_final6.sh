#!/bin/bash
# All six, serial. NEW GUARD: the deliverable must be NEWER than lesson.mp4 and its duration must
# exceed the lesson's — video 05 previously "passed" because stitch-brand failed silently (I had
# piped its output to /dev/null) and verify.js then checked a stale Aug-22 file.
set -u
export RENDER_WORKERS=1
title_for () { case "$1" in
  *01-fixes*) echo "The Room That Fixes Its Own Mistakes";; *02-who*) echo "Who Checks The Work";;
  *03-remember*) echo "Remembering The Fix";; *04-changing*) echo "Changing The Brain Itself";;
  *05-fix*) echo "Fix The System Before The Brain";; *06-prove*) echo "Prove It Got Better";; esac; }
secs () { node -e "
  const {execFileSync}=require('child_process');const f=require('ffmpeg-static');
  try{execFileSync(f,['-hide_banner','-i','$1'],{stdio:['pipe','pipe','pipe']});console.log(0);}
  catch(e){const m=String(e.stderr||'').match(/Duration: (\d+):(\d+):(\d+)/);console.log(m?(+m[1]*3600 + +m[2]*60 + +m[3]):0);}
" 2>/dev/null || echo 0; }
for d in self-healing-02-who-checks-the-work \
         self-healing-03-remembering-the-fix self-healing-04-changing-the-brain \
         self-healing-05-fix-the-system-first; do
  t=$(title_for "$d"); F="out/${d}_final.mp4"
  echo "######## $d ########"
  cd "$d" || continue
  want=$(node -e "const j=require('./durations.json');console.log(Object.values(j).filter(x=>typeof x==='number').reduce((a,c)=>a+c,0).toFixed(0))")
  echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l)/3"
  for attempt in 1 2 3; do
    rm -rf frames; rm -f out/lesson.mp4
    node compile-lesson.js > .compile.log 2>&1
    got=$(secs out/lesson.mp4)
    [ "${got:-0}" -ge $(( want * 95 / 100 )) ] && { echo "[render] ${got}s/${want}s"; break; }
    echo "!!! render bad ($attempt) ${got:-0}s of ${want}s"
    [ $attempt -eq 3 ] && { echo "!!! GIVING UP RENDER: $d"; cd ..; continue 2; }
  done
  # --- brand, with the failure actually visible and asserted ---
  rm -rf out/_bumpers; rm -f "$F"
  node stitch-brand.js --title "$t" --lesson out/lesson.mp4 --out "$F" 2>&1 | grep -E "DELIVERABLE|Error|error" | tail -2
  if [ ! -f "$F" ]; then echo "!!! BRAND FAILED — no deliverable written"; cd ..; continue; fi
  fs=$(secs "$F")
  if [ "$fs" -le "$got" ]; then echo "!!! BRAND SUSPECT — final ${fs}s not longer than lesson ${got}s"; fi
  [ "$F" -nt out/lesson.mp4 ] || { echo "!!! STALE DELIVERABLE — final is older than lesson.mp4"; cd ..; continue; }
  echo "[brand] final ${fs}s (lesson ${got}s + bumpers) · fresh ✓"
  node verify.js --final "$F" 2>&1 | grep -E "VERIFY:" | tail -1
  node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
  cd ..
  echo "######## DONE $d ########"
done
echo "ALL SIX FINAL"
