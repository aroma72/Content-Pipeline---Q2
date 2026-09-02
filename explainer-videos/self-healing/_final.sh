#!/bin/bash
# FINAL PASS. Single job, nothing else running. For each of 02-06:
#   regenerate any monitor art still bearing a logo -> vision judge (2 self-correcting rounds)
#   -> render (duration+frame guarded) -> brand -> verify -> grammar
set -u
DIRS="self-healing-02-who-checks-the-work self-healing-03-remembering-the-fix self-healing-04-changing-the-brain self-healing-05-fix-the-system-first self-healing-06-prove-it-got-better"
title_for () { case "$1" in
  *02-who*) echo "Who Checks The Work";; *03-remember*) echo "Remembering The Fix";;
  *04-changing*) echo "Changing The Brain Itself";; *05-fix*) echo "Fix The System Before The Brain";;
  *06-prove*) echo "Prove It Got Better";; esac; }

for d in $DIRS; do
  t=$(title_for "$d")
  echo "######## $d ########"
  cd "$d" || continue
  # --- art: judge first, only regenerate what fails ---
  for round in 1 2 3; do
    out=$(node qa-art.js 2>&1)
    echo "$out" | grep -E "^\[qa-art\] (✅|FAIL)" | tail -1
    bad=$(echo "$out" | grep -oE "ART_IDS=[0-9,]+" | head -1 | cut -d= -f2)
    [ -z "$bad" ] && break
    echo "[art] round $round regenerating $bad"
    ART_IDS="$bad" node generate-lesson-art-gemini.js --yes >/dev/null 2>&1
    [ $round -eq 3 ] && echo "[art] NOTE: still flagged after 3 rounds — proceeding, see qa-art-results.md"
  done
  # --- render ---
  want=$(node -e "const j=require('./durations.json');console.log(Object.values(j).filter(x=>typeof x==='number').reduce((a,c)=>a+c,0).toFixed(0))")
  ok=no
  for attempt in 1 2 3; do
    rm -rf frames; rm -f out/lesson.mp4
    node compile-lesson.js > .compile.log 2>&1; rc=$?
    got=$(node -e "
      const {execFileSync}=require('child_process');const f=require('ffmpeg-static');
      try{execFileSync(f,['-hide_banner','-i','out/lesson.mp4'],{stdio:['pipe','pipe','pipe']});console.log(0);}
      catch(e){const m=String(e.stderr||'').match(/Duration: (\d+):(\d+):(\d+)/);console.log(m?(+m[1]*3600 + +m[2]*60 + +m[3]):0);}
    " 2>/dev/null || echo 0)
    if [ "$rc" -eq 0 ] && [ "${got:-0}" -ge $(( want * 95 / 100 )) ]; then
      echo "[ok] render ${got}s/${want}s"; ok=yes; break
    fi
    echo "!!! render bad ($attempt): ${got:-0}s of ${want}s"
  done
  if [ "$ok" = yes ]; then
    node stitch-brand.js --title "$t" --lesson out/lesson.mp4 --out "out/${d}_final.mp4" >/dev/null 2>&1
    node verify.js --final "out/${d}_final.mp4" 2>&1 | grep -E "VERIFY:" | tail -1
    node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
  else
    echo "VERIFY: SKIPPED (render failed)"
  fi
  cd ..
  echo "######## DONE $d ########"
done
echo "ALL FIVE DONE"
