#!/bin/bash
set -u
dir=self-healing-01-fixes-its-own-mistakes
cd "$dir" || exit 1
echo "======== retune motion for the laptop beat ========"
node -e "
const fs=require('fs');const p='generate-lesson-video-omni.js';const s=fs.readFileSync(p,'utf8');
const a=s.indexOf('// per-beat motion direction'),b=s.indexOf('const DEFAULT_MOTION');
const m={
 '08':'a thick untidy stack of cream paper bills settles and slumps slightly on the wooden shop counter as if just dropped, the young man behind it lifts his hands in dismay and his shoulders sag, calm dismayed motion',
 '15':'an open laptop sits on a shop counter beside a pulled-open wooden filing drawer, a fresh blank card lifts gently out of the drawer and a soft curved arrow sweeps around from the laptop back toward the drawer, calm purposeful motion',
 '28':'the young man faces forward with a warm confident smile and gives a small sure nod, a slow settled breath, gentle natural motion',
};
const body=Object.entries(m).map(([k,v])=>\"  '\"+k+\"': '\"+v+\"',\").join('\n');
fs.writeFileSync(p,s.slice(0,a)+'// per-beat motion direction. Tuned for VIDEO 01 V3 (laptop helper).\n'+
 '// RETUNE FOR EVERY NEW VIDEO — beat ids repeat across videos.\n'+
 'const MOTION = {\n'+body+'\n};\n'+s.slice(b));
console.log('motion retuned (15 now describes the laptop, not an orb)');
"
echo "======== re-segment ========"
rm -rf layers && py segment-all.py 2>&1 | grep -cE "^\[seg\].*ok" | xargs -I{} echo "  {} layers ok"
echo "======== re-clip beat 15 ========"
rm -f clips/15.mp4
ART_IDS=15 node generate-lesson-video-omni.js --yes 2>&1 | grep -E "^\[i2v\] [0-9]"
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
echo "V01 LAPTOP FINISHED"
