#!/bin/bash
# Regenerate every laptop-bearing image (the Apple logo the vision judge caught) plus v02 beat 05
# (the flipped hand), then re-judge with qa-art.js. Skips video 01 per Aroma.
set -u
for d in self-healing-02-who-checks-the-work self-healing-03-remembering-the-fix \
         self-healing-04-changing-the-brain self-healing-05-fix-the-system-first \
         self-healing-06-prove-it-got-better; do
  echo "################ $d ################"
  cd "$d" || continue
  ids=$(node -e "
    const b=require('./beats.js');
    const hit=b.filter(x=>x.art && (/laptop/i.test(x.art) || x.id==='05' && '$d'.includes('02-who')));
    console.log(hit.map(x=>x.id).join(','));
  ")
  echo "[regen] beats: $ids"
  ART_IDS="$ids" node generate-lesson-art-gemini.js --yes 2>&1 | grep -cE "^\[gart\] [0-9]+ .* ok" | xargs -I{} echo "[art] {} regenerated"
  node qa-art.js 2>&1 | tail -20
  cd ..
done
echo "ART FIX PASS DONE"
