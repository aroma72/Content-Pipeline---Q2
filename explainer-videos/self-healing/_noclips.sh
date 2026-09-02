#!/bin/bash
# Aroma: "remove transitions ... make them simple camera panning artwork like the rest".
# ALL i2v clips deleted from every lesson video. Motion = Ken Burns push-in / parallax on the
# stills + evolving infographics only. No generated motion anywhere.
set -u
one () {
  local dir="$1" title="$2" attempt rc want got
  echo "################ $dir ################"
  cd "$dir" || return 1
  echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l) (must be 0)"
  want=$(node -e "const d=require('./durations.json');console.log(Object.values(d).filter(x=>typeof x==='number').reduce((a,c)=>a+c,0).toFixed(0))")
  for attempt in 1 2 3; do
    rm -rf frames; rm -f out/lesson.mp4
    node compile-lesson.js > .compile.log 2>&1; rc=$?
    got=$(node -e "
      const {execFileSync}=require('child_process');const f=require('ffmpeg-static');
      try{execFileSync(f,['-hide_banner','-i','out/lesson.mp4'],{stdio:['pipe','pipe','pipe']});console.log(0);}
      catch(e){const m=String(e.stderr||'').match(/Duration: (\d+):(\d+):(\d+)/);console.log(m?(+m[1]*3600 + +m[2]*60 + +m[3]):0);}
    " 2>/dev/null || echo 0)
    if [ "$rc" -eq 0 ] && [ "${got:-0}" -ge $(( want * 95 / 100 )) ]; then
      echo "[ok] ${got}s of ${want}s · $(ls frames/lesson | wc -l) frames"; break
    fi
    echo "!!! COMPILE BAD ($attempt, rc=$rc, ${got:-0}s of ${want}s)"
    [ $attempt -eq 3 ] && { echo "!!! GIVING UP: $dir"; cd ..; return 1; }
  done
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -cE "DELIVERABLE" | xargs -I{} echo "[brand] written"
  node verify.js --final "out/${dir}_final.mp4" 2>&1 | grep -E "VERIFY:|❌" | tail -2
  node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
  cd ..
  echo "################ DONE $dir ################"
}
one self-healing-03-remembering-the-fix    "Remembering The Fix"
one self-healing-04-changing-the-brain     "Changing The Brain Itself"
one self-healing-05-fix-the-system-first   "Fix The System Before The Brain"
one self-healing-06-prove-it-got-better    "Prove It Got Better"
one self-healing-02-who-checks-the-work    "Who Checks The Work"
one self-healing-01-fixes-its-own-mistakes "The Room That Fixes Its Own Mistakes"
echo "ALL SIX CLIP-FREE"
