#!/bin/bash
set -u
FF=$(node -p "require('ffmpeg-static')")
yavg () { "$FF" -loglevel info ${2:+-ss 2} -i "$1" -frames:v 1 -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 | grep -o "YAVG=[0-9.]*" | head -1 | cut -d= -f2; }
gen () { echo "---- $1 [$2]"; ( cd "$1" && ART_IDS="$2" node generate-lesson-video-omni.js --yes 2>&1 | grep -E "^\[i2v\] [0-9]" ); }
gen self-healing-02-who-checks-the-work    25
gen self-healing-03-remembering-the-fix    25
gen self-healing-04-changing-the-brain     11,24
gen self-healing-05-fix-the-system-first   06,16,25
echo "======== PALETTE DRIFT AUDIT (all clips) ========"
for d in self-healing-0*; do
  for c in "$d"/clips/*.mp4; do
    [ -e "$c" ] || continue
    id=$(basename "$c" .mp4); a=$(yavg "$d/art/$id.png"); k=$(yavg "$c" ss)
    node -e "const a=$a,k=$k,dr=((a-k)/a)*100;console.log('${d}'.padEnd(42)+' ${id}  art '+a.toFixed(0)+'  clip '+k.toFixed(0)+'  '+(-dr).toFixed(1)+'%  '+(dr>15?'DRIFT':'ok'))"
  done
done
echo "======== ALL CLIPS DONE ========"
