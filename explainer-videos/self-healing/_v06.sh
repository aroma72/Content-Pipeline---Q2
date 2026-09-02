#!/bin/bash
set -u
d=self-healing-06-prove-it-got-better
cd "$d" || exit 1
echo "[v06] clips: $(ls clips/*.mp4 2>/dev/null | wc -l) (must be 0 — no transitions)"
want=$(node -e "const j=require('./durations.json');console.log(Object.values(j).filter(x=>typeof x==='number').reduce((a,c)=>a+c,0).toFixed(0))")
for attempt in 1 2 3; do
  rm -rf frames; rm -f out/lesson.mp4
  node compile-lesson.js > .compile.log 2>&1; rc=$?
  got=$(node -e "
    const {execFileSync}=require('child_process');const f=require('ffmpeg-static');
    try{execFileSync(f,['-hide_banner','-i','out/lesson.mp4'],{stdio:['pipe','pipe','pipe']});console.log(0);}
    catch(e){const m=String(e.stderr||'').match(/Duration: (\d+):(\d+):(\d+)/);console.log(m?(+m[1]*3600 + +m[2]*60 + +m[3]):0);}
  " 2>/dev/null || echo 0)
  [ "$rc" -eq 0 ] && [ "${got:-0}" -ge $(( want * 95 / 100 )) ] && { echo "[ok] render ${got}s/${want}s"; break; }
  echo "!!! render bad ($attempt) ${got:-0}s of ${want}s"
done
node stitch-brand.js --title "Prove It Got Better" --lesson out/lesson.mp4 --out "out/${d}_final.mp4" >/dev/null 2>&1
node verify.js --final "out/${d}_final.mp4" 2>&1 | grep -E "VERIFY:" | tail -1
node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
echo "V06 CLIP-FREE DONE"
