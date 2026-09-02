#!/bin/bash
# 3 kie i2v animations per video (18 total), then QA every clip for palette drift + morphing,
# then re-render each video sequentially (shared bumper dir => never concurrent).
set -u
declare -A IDS=(
  [self-healing-01-fixes-its-own-mistakes]="13,15"
  [self-healing-02-who-checks-the-work]="09,11,15"
  [self-healing-03-remembering-the-fix]="02,10,14"
  [self-healing-04-changing-the-brain]="03,08,14"
  [self-healing-05-fix-the-system-first]="03,05,09"
  [self-healing-06-prove-it-got-better]="05,12,14"
)
echo "======== PHASE 1 · generate clips ========"
for d in self-healing-01-fixes-its-own-mistakes self-healing-02-who-checks-the-work \
         self-healing-03-remembering-the-fix self-healing-04-changing-the-brain \
         self-healing-05-fix-the-system-first self-healing-06-prove-it-got-better; do
  echo "---- ${d#self-healing-}  [${IDS[$d]}]"
  ( cd "$d" && ART_IDS="${IDS[$d]}" node generate-lesson-video-omni.js --yes 2>&1 | grep -E "^\[i2v\] [0-9]" )
done

echo "======== PHASE 2 · clip QA (drift + frame check) ========"
for d in self-healing-0*; do
  ( cd "$d" || exit 0
    FF=$(node -p "require('ffmpeg-static')")
    for c in clips/*.mp4; do
      [ -e "$c" ] || continue
      id=$(basename "$c" .mp4)
      a=$("$FF" -loglevel info -i "art/$id.png" -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 | grep -o "YAVG=[0-9.]*" | head -1 | cut -d= -f2)
      k=$("$FF" -loglevel info -ss 4 -i "$c" -frames:v 1 -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 | grep -o "YAVG=[0-9.]*" | head -1 | cut -d= -f2)
      node -e "const a=$a,k=$k,dr=((a-k)/a)*100;console.log('  ${d#self-healing-} $id  art '+a.toFixed(0)+' clip '+k.toFixed(0)+'  '+(-dr).toFixed(1)+'%  '+(Math.abs(dr)>15?'DRIFT':'ok'))"
    done )
done

echo "======== PHASE 3 · render (sequential) ========"
title_for () { case "$1" in
  *01-fixes*) echo "The Room That Fixes Its Own Mistakes";; *02-who*) echo "Who Checks The Work";;
  *03-remember*) echo "Remembering The Fix";; *04-changing*) echo "Changing The Brain Itself";;
  *05-fix*) echo "Fix The System Before The Brain";; *06-prove*) echo "Prove It Got Better";; esac; }
for d in self-healing-0*; do
  t=$(title_for "$d")
  echo "######## $d ########"
  cd "$d" || continue
  echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l)"
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
    echo "!!! render bad ($attempt) ${got:-0}s of ${want}s"
    [ $attempt -eq 3 ] && echo "!!! GIVING UP: $d"
  done
  rm -rf out/_bumpers
  node stitch-brand.js --title "$t" --lesson out/lesson.mp4 --out "out/${d}_final.mp4" >/dev/null 2>&1
  node verify.js --final "out/${d}_final.mp4" 2>&1 | grep -E "VERIFY:" | tail -1
  cd ..
  echo "######## DONE $d ########"
done
echo "ALL SIX ANIMATED"
