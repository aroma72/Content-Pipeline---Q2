#!/bin/bash
# v03: all i2v clips removed (they morphed the laptop into a blob and made weird transitions).
#      Renders as simple artwork with Ken Burns only — no generated motion, no transitions.
# v02: re-render to pick up two corrected on-screen labels (narration unchanged, VO still valid).
set -u
one () {
  local dir="$1" title="$2" attempt rc want got
  echo "################ $dir ################"
  cd "$dir" || return 1
  echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l) i2v clip(s)"
  want=$(node -e "const d=require('./durations.json');console.log(Object.values(d).filter(x=>typeof x==='number').reduce((a,c)=>a+c,0).toFixed(0))")
  for attempt in 1 2 3; do
    rm -rf frames; rm -f out/lesson.mp4; touch .build_marker
    node compile-lesson.js > .compile.log 2>&1; rc=$?
    got=$(node -e "
      const {execFileSync}=require('child_process');const f=require('ffmpeg-static');
      try{execFileSync(f,['-hide_banner','-i','out/lesson.mp4'],{stdio:['pipe','pipe','pipe']});console.log(0);}
      catch(e){const m=String(e.stderr||'').match(/Duration: (\d+):(\d+):(\d+)/);console.log(m?(+m[1]*3600 + +m[2]*60 + +m[3]):0);}
    " 2>/dev/null || echo 0)
    if [ "$rc" -eq 0 ] && [ "${got:-0}" -ge $(( want * 95 / 100 )) ]; then
      echo "[ok] ${got}s vs ${want}s voiceover · $(ls frames/lesson | wc -l) frames"; break
    fi
    echo "!!! COMPILE BAD (attempt $attempt, rc=$rc, ${got:-0}s of ${want}s)"
    [ $attempt -eq 3 ] && { echo "!!! GIVING UP: $dir"; cd ..; return 1; }
  done
  rm -f .build_marker
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -cE "DELIVERABLE" | xargs -I{} echo "[brand] written"
  node verify.js --final "out/${dir}_final.mp4" 2>&1 | grep -E "VERIFY:|❌" | tail -3
  node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
  cd ..
  echo "################ DONE $dir ################"
}
one self-healing-03-remembering-the-fix "Remembering The Fix"
one self-healing-02-who-checks-the-work "Who Checks The Work"
echo "BOTH FIXED"
