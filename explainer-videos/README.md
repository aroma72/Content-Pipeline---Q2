# explainer-videos/

The **default video pipeline** for the project — line-synced explainer/lesson videos where every
voiceover sentence has its own matching animated visual, wrapped in brand bumpers, for ~$0 render.

## Start here
- **Spec / why + LAWS:** [`EXPLAINER-VIDEO-PIPELINE-SPEC.md`](EXPLAINER-VIDEO-PIPELINE-SPEC.md)
- **How to run it:** the `creating-explainer-videos` skill (`.claude/skills/creating-explainer-videos/`)
  — its `templates/` are the source of truth you copy per video.
- **Draft a script:** `writing-explainer-scripts` · **gate it:** `reviewing-explainer-scripts`
  · **motion mechanics:** `animation-motion-design`

## One-time setup
1. `.env` at a repo parent has `GEMINI_API_KEY` **or** `GOOGLE_STUDIO_API_KEY` (this repo uses the latter).
2. `brand-intro-outro/` — drop your brand font/logo in `brand/`, edit `config.js`, then `npm i` inside it.
3. Python: `pip install pillow numpy`.

## Make a video
```bash
cp -r ../.claude/skills/creating-explainer-videos/templates <series>/<video>
cd <series>/<video> && npm i
# 0. gate the script (reviewing-explainer-scripts) — animate only READY
# 1. write beats.js
node generate-lesson-art.js --yes     # Imagen (cost-guarded)
python segment-all.py                  # cutouts + plates + anchors
node tts-lesson.js --yes               # Gemini TTS + durations.json (cost-guarded)
SAMPLE_IDS=01,05 node compile-lesson.js --sample   # confirm motion
node compile-lesson.js                 # bare lesson
node stitch-brand.js --title "My Lesson" --lesson out/lesson.mp4 --out out/lesson_final.mp4
node verify.js                         # acceptance checks
```

Deliverable: `out/<name>_final.mp4` (1920×1080 / 30fps / h264 yuv420p / AAC, brand-wrapped).
Generated folders (`art/ layers/ audio/ frames/ out/`) are git-ignored.

> Paid calls (Imagen, Gemini TTS) never fire without `--yes` / `CONFIRM_SPEND=1`.
> No paid AI video — motion is cutout-puppet animation.
