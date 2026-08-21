#!/bin/bash
set -u
dir=self-healing-06-prove-it-got-better
cd "$dir" || exit 1
echo "################ $dir ################"
echo "[clips] $(ls clips/*.mp4 2>/dev/null | wc -l) i2v clip(s)"
for attempt in 1 2 3 4; do
  rm -rf frames; rm -f out/lesson.mp4; touch .build_marker
  node compile-lesson.js > .compile.log 2>&1; rc=$?
  grep -E "^\[compile\] [0-9]+ beats" .compile.log | tail -1
  if [ $rc -eq 0 ] && [ -f out/lesson.mp4 ] && [ out/lesson.mp4 -nt .build_marker ]; then
    echo "[ok] fresh lesson.mp4 (attempt $attempt)"; break
  fi
  reason=$(tail -c 3000 .compile.log | tr '\r' '\n' | grep -oE "(sidecar[^\"]*|ProtocolError|detached Frame|Target closed|Navigation timeout|Error: [^ ]+ .{0,60})" | head -1)
  echo "!!! COMPILE FAILED (attempt $attempt, rc=$rc) — ${reason:-see .compile.log}"
  [ $attempt -eq 4 ] && { echo "!!! GIVING UP"; rm -f .build_marker; exit 1; }
  echo "[retry] cleaning orphaned chrome, re-running …"
  node -e "
    const {execSync}=require('child_process');
    try{const o=execSync('wmic process where \"name=\'chrome.exe\'\" get ProcessId,ExecutablePath /format:csv',{encoding:'utf8'});
    const p=o.split(/\r?\n/).filter(l=>l.toLowerCase().includes('puppeteer')).map(r=>r.trim().split(',').pop()).filter(x=>/^[0-9]+\$/.test(x));
    if(p.length)execSync('taskkill /F '+p.map(x=>'/PID '+x).join(' '),{stdio:'ignore'});}catch(e){}
  " 2>/dev/null
done
rm -f .build_marker
node stitch-brand.js --title "Prove It Got Better" --lesson out/lesson.mp4 --out "out/${dir}_final.mp4" 2>&1 | grep -E "DELIVERABLE|Error" | tail -1
node verify.js --final "out/${dir}_final.mp4" 2>&1 | tail -11
node eval-text.js 2>&1 | grep -E "^\[eval-text\]" | tail -1
echo "V06 FINISHED"
