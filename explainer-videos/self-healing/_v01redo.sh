#!/bin/bash
set -u
dir=self-healing-01-fixes-its-own-mistakes
cd "$dir" || exit 1
echo "======== VO ========"
node tts-lesson.js --yes 2>&1 | grep -E "^\[tts\] wrote|FAIL|Error" | tail -2
node -e "
const fs=require('fs'),b=require('./beats.js');let bad=[];
for(const x of b){const p='audio/vo_'+x.id+'.txt';if(!fs.existsSync(p)||fs.readFileSync(p,'utf8').trim()!==x.vo.trim())bad.push(x.id);}
console.log(bad.length?'SIDECAR MISMATCH ['+bad.join(',')+']':'all '+b.length+' sidecars match');
"
echo "======== i2v (3 story beats) ========"
ART_IDS=08,15,28 node generate-lesson-video-omni.js --yes 2>&1 | grep -E "^\[i2v\] [0-9]"
FF=$(node -p "require('ffmpeg-static')")
for id in 08 15 28; do
  [ -f "clips/$id.mp4" ] || continue
  a=$("$FF" -loglevel info -i art/$id.png -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 | grep -o "YAVG=[0-9.]*" | head -1 | cut -d= -f2)
  k=$("$FF" -loglevel info -ss 2 -i clips/$id.mp4 -frames:v 1 -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 | grep -o "YAVG=[0-9.]*" | head -1 | cut -d= -f2)
  node -e "const a=$a,k=$k,d=((a-k)/a)*100;console.log('  drift beat $id: art '+a.toFixed(0)+' clip '+k.toFixed(0)+' '+(-d).toFixed(1)+'% '+(d>15?'DRIFT':'ok'))"
done
echo "======== RENDER ========"
for attempt in 1 2 3; do
  rm -rf frames; rm -f out/lesson.mp4; touch .build_marker
  node compile-lesson.js > .compile.log 2>&1; rc=$?
  grep -E "^\[compile\] [0-9]+ beats" .compile.log | tail -1
  if [ $rc -eq 0 ] && [ -f out/lesson.mp4 ] && [ out/lesson.mp4 -nt .build_marker ]; then echo "[ok] fresh lesson.mp4 (attempt $attempt)"; break; fi
  echo "!!! COMPILE FAILED (attempt $attempt) — $(tail -c 3000 .compile.log | tr '\r' '\n' | grep -oE '(sidecar[^\"]*|ProtocolError|detached Frame|Target closed)' | head -1)"
  [ $attempt -eq 3 ] && { echo "!!! GIVING UP"; exit 1; }
done
rm -f .build_marker
node stitch-brand.js --title "The Room That Fixes Its Own Mistakes" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "DELIVERABLE|Error" | tail -1
node verify.js --final "out/${dir}_final.mp4" 2>&1 | tail -11
node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
echo "V01 REDO FINISHED"
