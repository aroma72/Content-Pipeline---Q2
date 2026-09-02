#!/bin/bash
# Video 03 beat 09 narration was fixed (grammar gate caught a missing object), so its VO must be
# regenerated and the video re-rendered. Waits for the main pass to finish first — one job at a time.
set -u
echo "[v03] starting now, concurrent with the main pass (different folder, no shared state)"
cd self-healing-03-remembering-the-fix || exit 1
node tts-lesson.js --yes 2>&1 | grep -E "^\[tts\] wrote" | tail -1
node -e "
  const fs=require('fs'),b=require('./beats.js');let bad=[];
  for(const x of b){const p='audio/vo_'+x.id+'.txt';if(!fs.existsSync(p)||fs.readFileSync(p,'utf8').trim()!==x.vo.trim())bad.push(x.id);}
  if(bad.length){console.log('[vo] MISMATCH '+bad.join(','));process.exit(1);} console.log('[vo] all '+b.length+' sidecars match');
" || exit 1
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
node stitch-brand.js --title "Remembering The Fix" --lesson out/lesson.mp4 --out "out/self-healing-03-remembering-the-fix_final.mp4" >/dev/null 2>&1
node verify.js --final "out/self-healing-03-remembering-the-fix_final.mp4" 2>&1 | grep -E "VERIFY:" | tail -1
node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
echo "V03 REBUILT"
