#!/bin/bash
# Generate the remaining i2v clips, then AUDIT each for palette drift (clip vs source art).
set -u
FF=$(node -p "require('ffmpeg-static')")
yavg () { "$FF" -loglevel info ${2:+-ss 2} -i "$1" -frames:v 1 -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 | grep -o "YAVG=[0-9.]*" | head -1 | cut -d= -f2; }
gen () {
  local dir="$1" ids="$2"
  echo "---- i2v $dir  [$ids]"
  ( cd "$dir" && ART_IDS="$ids" node generate-lesson-video-omni.js --yes 2>&1 | grep -E "^\[i2v\] [0-9]" )
}
gen self-healing-02-who-checks-the-work    11,25
gen self-healing-03-remembering-the-fix    03,11,25
gen self-healing-04-changing-the-brain     04,11,24
gen self-healing-05-fix-the-system-first   06,16,25

echo "======== PALETTE DRIFT AUDIT ========"
for d in self-healing-0*; do
  for c in "$d"/clips/*.mp4; do
    [ -e "$c" ] || continue
    id=$(basename "$c" .mp4)
    a=$(yavg "$d/art/$id.png"); k=$(yavg "$c" ss)
    drop=$(node -e "const a=$a,k=$k;console.log((((a-k)/a)*100).toFixed(1))")
    flag=$(node -e "console.log($drop>15?'DRIFT':'ok')")
    printf "%-42s %-3s art %-7s clip %-7s  %+6s%%  %s\n" "$d" "$id" "$a" "$k" "-$drop" "$flag"
  done
done
echo "======== CLIPS DONE ========"
