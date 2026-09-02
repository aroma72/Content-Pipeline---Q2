#!/bin/bash
# Rebuild 02-06 to the Evals-Grade Visual Standard, NO i2v (kie queue is ~60min/clip).
# Storytelling + visuals unchanged; motion comes from Ken Burns / cutout-puppet / evolving infographics.
# Video 02's 3 clips already exist and are kept — compile uses them automatically.
set -u
one () {
  local dir="$1" title="$2" attempt rc
  echo "################ $dir ################"
  cd "$dir" || return 1
  node qa-visuals.js >/dev/null 2>&1 || { echo "!!! qa-visuals FAILED — not spending"; cd ..; return 1; }
  echo "[gates] pass · $(ls clips/*.mp4 2>/dev/null | wc -l) existing clip(s) kept"
  if [ ! -f durations.json ] || [ beats.js -nt durations.json ]; then
    rm -f art/[0-9]*.png; rm -rf layers
    node generate-lesson-art-gemini.js --yes 2>&1 | grep -cE "^\[gart\] [0-9]+ .* ok" | xargs -I{} echo "[art] {} images"
    py segment-all.py 2>&1 | grep -cE "^\[seg\].*ok" | xargs -I{} echo "[seg] {} layers"
    node tts-lesson.js --yes 2>&1 | grep -E "^\[tts\] wrote" | tail -1
  else
    echo "[skip] art/seg/vo already current for this script"
  fi
  node -e "
    const fs=require('fs'),b=require('./beats.js');let bad=[];
    for(const x of b){const p='audio/vo_'+x.id+'.txt';if(!fs.existsSync(p)||fs.readFileSync(p,'utf8').trim()!==x.vo.trim())bad.push(x.id);}
    if(bad.length){console.log('[vo] SIDECAR MISMATCH '+bad.join(','));process.exit(1);}
    console.log('[vo] all '+b.length+' sidecars match');
  " || { echo "!!! stale VO"; cd ..; return 1; }
  for attempt in 1 2 3; do
    rm -rf frames; rm -f out/lesson.mp4; touch .build_marker
    node compile-lesson.js > .compile.log 2>&1; rc=$?
    if [ $rc -eq 0 ] && [ -f out/lesson.mp4 ] && [ out/lesson.mp4 -nt .build_marker ]; then echo "[ok] fresh lesson.mp4"; break; fi
    echo "!!! COMPILE FAILED ($attempt) — $(tail -c 3000 .compile.log | tr '\r' '\n' | grep -oE '(sidecar[^"]*|ProtocolError|detached Frame|Target closed)' | head -1)"
    [ $attempt -eq 3 ] && { echo "!!! GIVING UP: $dir"; rm -f .build_marker; cd ..; return 1; }
  done
  rm -f .build_marker
  node stitch-brand.js --title "$title" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -cE "DELIVERABLE" | xargs -I{} echo "[brand] deliverable written"
  node verify.js --final "out/${dir}_final.mp4" 2>&1 | grep -E "VERIFY:|❌" | tail -3
  node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
  cd ..
  echo "################ DONE $dir ################"
}
one self-healing-02-who-checks-the-work    "Who Checks The Work"
one self-healing-03-remembering-the-fix    "Remembering The Fix"
one self-healing-04-changing-the-brain     "Changing The Brain Itself"
one self-healing-05-fix-the-system-first   "Fix The System Before The Brain"
one self-healing-06-prove-it-got-better    "Prove It Got Better"
echo "ALL FIVE REBUILT"
