#!/bin/bash
# Full rebuild of videos 02-06 to the Evals-Grade Visual Standard. Sequential (puppeteer needs the CPU).
set -u
TITLES_02="Who Checks The Work"; TITLES_03="Remembering The Fix"; TITLES_04="Changing The Brain Itself"
TITLES_05="Fix The System Before The Brain"; TITLES_06="Prove It Got Better"

one () {
  local dir="$1" title="$2" ids="$3" attempt rc
  echo "################ $dir ################"
  cd "$dir" || return 1
  node qa-visuals.js >/dev/null 2>&1 || { echo "!!! qa-visuals FAILED — not spending"; cd ..; return 1; }
  echo "[gates] qa-visuals + qa-cutouts pass"
  rm -f art/[0-9]*.png; rm -rf layers clips
  node generate-lesson-art-gemini.js --yes 2>&1 | grep -cE "^\[gart\] [0-9]+ .* ok" | xargs -I{} echo "[art] {} images"
  py segment-all.py 2>&1 | grep -cE "^\[seg\].*ok" | xargs -I{} echo "[seg] {} layers"
  node tts-lesson.js --yes 2>&1 | grep -E "^\[tts\] wrote" | tail -1
  node -e "
    const fs=require('fs'),b=require('./beats.js');let bad=[];
    for(const x of b){const p='audio/vo_'+x.id+'.txt';if(!fs.existsSync(p)||fs.readFileSync(p,'utf8').trim()!==x.vo.trim())bad.push(x.id);}
    if(bad.length){console.log('[vo] SIDECAR MISMATCH '+bad.join(','));process.exit(1);}
    console.log('[vo] all '+b.length+' sidecars match');
  " || { echo "!!! stale VO"; cd ..; return 1; }
  ART_IDS="$ids" node generate-lesson-video-omni.js --yes 2>&1 | grep -cE "^\[i2v\] [0-9]+ .* ok" | xargs -I{} echo "[i2v] {} clips"
  for attempt in 1 2 3; do
    rm -rf frames; rm -f out/lesson.mp4; touch .build_marker
    node compile-lesson.js > .compile.log 2>&1; rc=$?
    if [ $rc -eq 0 ] && [ -f out/lesson.mp4 ] && [ out/lesson.mp4 -nt .build_marker ]; then echo "[ok] fresh lesson.mp4"; break; fi
    echo "!!! COMPILE FAILED ($attempt) — $(tail -c 3000 .compile.log | tr '\r' '\n' | grep -oE '(sidecar[^\"]*|ProtocolError|detached Frame|Target closed)' | head -1)"
    [ $attempt -eq 3 ] && { echo "!!! GIVING UP: $dir"; rm -f .build_marker; cd ..; return 1; }
  done
  rm -f .build_marker
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -cE "DELIVERABLE" | xargs -I{} echo "[brand] deliverable written"
  node verify.js --final "out/${dir}_final.mp4" 2>&1 | grep -E "VERIFY:|❌" | tail -3
  node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
  cd ..
  echo "################ DONE $dir ################"
}
one self-healing-02-who-checks-the-work    "$TITLES_02" 09,13,25
one self-healing-03-remembering-the-fix    "$TITLES_03" 10,11,23
one self-healing-04-changing-the-brain     "$TITLES_04" 03,10,22
one self-healing-05-fix-the-system-first   "$TITLES_05" 03,15,23
one self-healing-06-prove-it-got-better    "$TITLES_06" 06,12,24
echo "ALL FIVE REBUILT"
