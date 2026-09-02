#!/bin/bash
# ONE continuous job: fix art (logo-free laptop, corrected hand) -> vision-judge -> render -> gates.
# Videos 02-06. Video 01 skipped per Aroma.
set -u
DIRS="self-healing-02-who-checks-the-work self-healing-03-remembering-the-fix self-healing-04-changing-the-brain self-healing-05-fix-the-system-first self-healing-06-prove-it-got-better"
title_for () { case "$1" in
  *02-who*) echo "Who Checks The Work";; *03-remember*) echo "Remembering The Fix";;
  *04-changing*) echo "Changing The Brain Itself";; *05-fix*) echo "Fix The System Before The Brain";;
  *06-prove*) echo "Prove It Got Better";; esac; }

# --- pass 1: art, with up to 2 regeneration rounds driven by the vision judge ---
for d in $DIRS; do
  echo "######## ART $d ########"
  cd "$d" || continue
  ids=$(node -e "const b=require('./beats.js');console.log(b.filter(x=>x.art&&/laptop|monitor/i.test(x.art)).map(x=>x.id).join(','))")
  [ -n "$ids" ] && ART_IDS="$ids" node generate-lesson-art-gemini.js --yes 2>&1 | grep -cE "^\[gart\] [0-9]+ .* ok" | xargs -I{} echo "[art] {} regenerated"
  for round in 1 2; do
    out=$(node qa-art.js 2>&1); echo "$out" | grep -E "^\[qa-art\] (✅|FAIL)" | tail -1
    bad=$(echo "$out" | grep -oE "ART_IDS=[0-9,]+" | head -1 | cut -d= -f2)
    [ -z "$bad" ] && break
    echo "[art] round $round regenerating $bad"
    ART_IDS="$bad" node generate-lesson-art-gemini.js --yes >/dev/null 2>&1
  done
  cd ..
done

# --- pass 2: render ---
for d in $DIRS; do
  t=$(title_for "$d")
  echo "######## RENDER $d ########"
  cd "$d" || continue
  want=$(node -e "const j=require('./durations.json');console.log(Object.values(j).filter(x=>typeof x==='number').reduce((a,c)=>a+c,0).toFixed(0))")
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
    [ $attempt -eq 3 ] && { echo "!!! GIVING UP: $d"; }
  done
  node stitch-brand.js --title "$t" --lesson out/lesson.mp4 --out "out/${d}_final.mp4" >/dev/null 2>&1
  node verify.js --final "out/${d}_final.mp4" 2>&1 | grep -E "VERIFY:" | tail -1
  node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
  cd ..
  echo "######## DONE $d ########"
done
echo "ALL FIVE DONE"
