---
type: status
last_verified: 2026-05-20
owner: Aroma Tahir
---

# Course Overview Video Rendering - IN PROGRESS 🎬

**Started:** 2026-05-20  
**Status:** Rendering all 16 segments  
**Estimated Completion:** ~3-4 hours from start  
**Final Output:** `course-overview-final-animated.mp4` (120 seconds, 1920×1080)

---

## RENDER SEQUENCE

Total Frames: 3,600 @ 30fps = 120 seconds

| Segment | Frames | Duration | Status |
|---------|--------|----------|--------|
| 1A - Entry & Discovery | 240 | 8s | ⏳ |
| 1B - The Question | 210 | 7s | ⏳ |
| 2A - Firefighting Chaos | 300 | 10s | ⏳ |
| 2B - Calm Systems | 300 | 10s | ⏳ |
| 3A - Mental Models | 150 | 5s | ⏳ |
| 3B - Memory Architecture | 150 | 5s | ⏳ |
| 3C - Skills & Superpowers | 150 | 5s | ⏳ |
| 3D - Real World Systems | 150 | 5s | ⏳ |
| 4A - Week 1 Foundation | 180 | 6s | ⏳ |
| 4B - Week 2-3 Building | 180 | 6s | ⏳ |
| 4C - Week 4-5 Integration | 180 | 6s | ⏳ |
| 4D - Week 6+ Mastery | 360 | 12s | ⏳ |
| 5A - The Rarity | 240 | 8s | ⏳ |
| 5B - The Value | 210 | 7s | ⏳ |
| 6A - Recognition | 300 | 10s | ⏳ |
| 6B - Invitation | 300 | 10s | ⏳ |

---

## MONITORING

**Output Directory:** `course-overview-video-output/`

**Individual segment files:**
- 1A_entry_discovery.mp4
- 1B_the_question.mp4
- ... (12 total)
- 6B_invitation.mp4

**Final Combined Video:** `course-overview-final-animated.mp4`

---

## NEXT STEPS AFTER RENDER

Once rendering completes:

1. **Add Voiceover** (when ready)
   ```bash
   ffmpeg -i course-overview-final-animated.mp4 \
           -i voiceover.aac \
           -c:v copy -c:a aac -shortest \
           course-overview-with-voiceover.mp4
   ```

2. **Quality Review**
   - Check animation smoothness
   - Verify timing and pacing
   - Review color consistency

3. **Publish to Taleemabad**
   - Upload final MP4
   - Add metadata and description
   - Create thumbnail

---

## TECHNICAL NOTES

**Render Settings:**
- Codec: H.264 (universal compatibility)
- Resolution: 1920×1080 Full HD
- Frame Rate: 30fps (smooth motion)
- Concurrency: 4x (parallel frame rendering)
- Output Format: MP4 (standard video format)

**Estimated Output Size:**
- Individual segments: ~300-500 KB each
- Final combined video: ~15-20 MB (before voiceover)

**Performance:**
- Expected ~8-10 minutes per segment average
- Total time: 2-3 hours for all 16 segments
- Ffmpeg concatenation: ~30 seconds
- Overall ETA: 3-4 hours from start

---

## TROUBLESHOOTING

If render stalls or fails:
1. Check disk space (need ~2 GB free)
2. Check system temperature (may throttle)
3. Check for errors in output log
4. Can resume from failed segment

**To check progress:**
```bash
ls -lh course-overview-video-output/ | wc -l  # Count rendered segments
ls -lh course-overview-final-animated.mp4      # Check if combined
```

---

**Status:** Rendering started ✅  
**Next update:** When segments begin appearing or render completes
