#!/bin/bash
# QA every clip two ways:
#  (a) palette drift vs its source art  (b) MOTION check — does the clip actually change between
#      early and late frames? A frozen clip is pointless; a wildly different one has morphed.
set -u
for d in self-healing-0*; do
  cd "$d" || continue
  FF=$(node -p "require('ffmpeg-static')")
  for c in clips/*.mp4; do
    [ -e "$c" ] || continue
    id=$(basename "$c" .mp4)
    y () { "$FF" -loglevel info ${2:+-ss "$2"} -i "$1" -frames:v 1 -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 | grep -o "YAVG=[0-9.]*" | head -1 | cut -d= -f2; }
    a=$(y "art/$id.png"); e=$(y "$c" 0.5); l=$(y "$c" 4)
    # frame-difference between early and late as a motion proxy
    diff=$("$FF" -loglevel error -i "$c" -vf "select='eq(n\,15)+eq(n\,110)',tblend=all_mode=difference,blackframe=amount=0:threshold=24" -f null - 2>&1 | grep -oE "pblack:[0-9]+" | head -1 | cut -d: -f2)
    node -e "
      const a=$a, e=${e:-0}, l=${l:-0}, pb=${diff:-100};
      const dr=((a-e)/a)*100;
      const drift = Math.abs(dr)>15 ? 'DRIFT' : 'ok';
      const motion = pb>=99 ? 'FROZEN' : 'moves';
      console.log('  ${d#self-healing-} $id   drift '+(-dr).toFixed(1)+'% '+drift+'   '+motion+' (still '+pb+'%)');
    "
  done
  cd ..
done
echo "CLIP QA DONE"
