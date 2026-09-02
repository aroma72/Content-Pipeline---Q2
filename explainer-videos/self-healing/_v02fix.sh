#!/bin/bash
# Beat 05's art was stale: I fixed its prompt but the regeneration pass only covered monitor-bearing
# beats, and 05 is a plain hero shot. Art now regenerated + judged. Re-cut its layer and re-render.
set -u
export RENDER_WORKERS=1
d=self-healing-02-who-checks-the-work
cd "$d" || exit 1
py segment-all.py 2>&1 | grep -E "^\[seg\] 05" | tail -1
want=$(node -e "const j=require('./durations.json');console.log(Object.values(j).filter(x=>typeof x==='number').reduce((a,c)=>a+c,0).toFixed(0))")
echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l)/3"
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
  [ $attempt -eq 3 ] && { echo "!!! GIVING UP"; exit 1; }
done
rm -rf out/_bumpers
node stitch-brand.js --title "Who Checks The Work" --lesson out/lesson.mp4 --out "out/${d}_final.mp4" >/dev/null 2>&1
node verify.js --final "out/${d}_final.mp4" 2>&1 | grep -E "VERIFY:" | tail -1
node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
echo "V02 HAND FIXED"
