#!/bin/bash
# Generate the 13 remaining i2v clips. kie was intermittently returning "fetch failed" (network),
# so each beat is attempted up to 3 times with a pause. Only the MISSING clips are requested.
set -u
declare -A NEED=(
  [self-healing-02-who-checks-the-work]="09 11 15"
  [self-healing-03-remembering-the-fix]="14"
  [self-healing-04-changing-the-brain]="03 08 14"
  [self-healing-05-fix-the-system-first]="03 05 09"
  [self-healing-06-prove-it-got-better]="05 12 14"
)
for d in self-healing-02-who-checks-the-work self-healing-03-remembering-the-fix \
         self-healing-04-changing-the-brain self-healing-05-fix-the-system-first \
         self-healing-06-prove-it-got-better; do
  echo "---- ${d#self-healing-}"
  cd "$d" || continue
  for id in ${NEED[$d]}; do
    for try in 1 2 3; do
      [ -f "clips/$id.mp4" ] && break
      out=$(ART_IDS="$id" node generate-lesson-video-omni.js --yes 2>&1 | grep -E "^\[i2v\] $id" | tail -1)
      if [ -f "clips/$id.mp4" ]; then echo "  $id ok (try $try)"; break; fi
      echo "  $id failed (try $try): $(echo "$out" | grep -oE 'FAILED:.*' | head -1 | cut -c1-60)"
      [ $try -lt 3 ] && sleep 20
    done
    [ -f "clips/$id.mp4" ] || echo "  $id GAVE UP — beat will use Ken Burns"
  done
  cd ..
done
echo "======== CLIP INVENTORY ========"
for d in self-healing-0*; do echo "  ${d#self-healing-}: $(ls $d/clips/*.mp4 2>/dev/null | wc -l)/3  $(ls $d/clips/ 2>/dev/null | tr '\n' ' ')"; done
echo "CLIPS PHASE DONE"
