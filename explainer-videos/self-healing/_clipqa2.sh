#!/bin/bash
# Motion check done properly: SSIM between an early frame and a late frame of the same clip.
#   SSIM ~1.000 = the frames are identical -> the clip is frozen (pointless)
#   SSIM very low (<0.55) = the scene changed drastically -> likely morphed/blobbed
#   in between = real, contained motion (what we want)
set -u
SP="C:/Users/AROMAT~1/AppData/Local/Temp/claude/c--Users-Aroma-Tahir-Downloads-Content-Queen/d01bb709-8c60-4df6-a3a5-53dfc8960103/scratchpad"
for d in self-healing-0*; do
  cd "$d" || continue
  FF=$(node -p "require('ffmpeg-static')")
  for c in clips/*.mp4; do
    [ -e "$c" ] || continue
    id=$(basename "$c" .mp4)
    "$FF" -y -loglevel error -ss 0.4 -i "$c" -frames:v 1 "$SP/_a.png" 2>/dev/null
    "$FF" -y -loglevel error -ss 4.0 -i "$c" -frames:v 1 "$SP/_b.png" 2>/dev/null
    s=$("$FF" -loglevel info -i "$SP/_a.png" -i "$SP/_b.png" -lavfi ssim -f null - 2>&1 | grep -oE "All:[0-9.]+" | head -1 | cut -d: -f2)
    node -e "
      const s=parseFloat('${s:-1}');
      let verdict;
      if (isNaN(s)) verdict='?';
      else if (s>0.985) verdict='FROZEN — no real motion';
      else if (s<0.55) verdict='MORPHED — scene changed too much';
      else verdict='moves ✓';
      console.log('  ${d#self-healing-} $id   ssim '+(isNaN(s)?'--':s.toFixed(3))+'   '+verdict);
    "
  done
  cd ..
done
echo "MOTION QA DONE"
