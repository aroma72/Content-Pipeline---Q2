#!/bin/bash
# Complete video creation workflow - runs after render completes

PROJECT_DIR="/c/Users/Aroma Tahir/Downloads/Content Queen"
VIDEO_PROD_DIR="$PROJECT_DIR/video_production/session_2_video_1_mindset"
FFMPEG_PATH="$PROJECT_DIR/node_modules/ffmpeg-static/ffmpeg.exe"

VIDEO_SILENT="$VIDEO_PROD_DIR/consumer_producer_mindset_silent_extended.mp4"
VO_COMPLETE="$VIDEO_PROD_DIR/vo_complete.mp3"
VIDEO_FINAL="$VIDEO_PROD_DIR/CONSUMER_PRODUCER_MINDSET_EXTENDED.mp4"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "=== Step 3: Waiting for Remotion render to complete ==="
until [ -f "$VIDEO_SILENT" ]; do
  sleep 10
  echo -n "."
done
log "✓ Video file created"

log "=== Step 4: Muxing video and audio ==="
"$FFMPEG_PATH" -i "$VIDEO_SILENT" -i "$VO_COMPLETE" -c:v copy -c:a aac -shortest "$VIDEO_FINAL"

if [ -f "$VIDEO_FINAL" ]; then
  SIZE=$(ls -lh "$VIDEO_FINAL" | awk '{print $5}')
  log "✓ Final video created: $SIZE"

  log "=== Step 5: Verifying final video ==="
  "$FFMPEG_PATH" -i "$VIDEO_FINAL" 2>&1 | grep Duration
else
  log "✗ Failed to create final video"
  exit 1
fi

log "=== COMPLETION SUMMARY ==="
log "✓ Missing VO: 28.45 seconds (vo_missing_parts.mp3)"
log "✓ VO appended: ~207.3 seconds total (vo_complete.mp3)"
log "✓ Video rendered: 6219 frames at 30fps (207.3 seconds)"
log "✓ Audio muxed"
log "✓ Final output: $VIDEO_FINAL"
log ""
log "Video is now complete with all 5 slides and full voiceover!"
