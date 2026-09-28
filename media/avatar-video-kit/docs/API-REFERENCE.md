---
title: API Reference
type: reference
last_verified: 2026-08-08
owner: aroma
---

# API Reference

The kit talks to exactly **two** providers. All kie.ai calls share one async pattern:
`POST /jobs/createTask` → poll `GET /jobs/recordInfo?taskId=…` → download the result URL.

Base URL (kie.ai): `https://api.kie.ai/api/v1`
File-upload host (kie.ai): `https://kieai.redpandaai.co`  ← note: `api.kie.ai` 404s for uploads.

---

## 1. Still image — kie.ai `nano-banana-2` (Gemini-class image model)

Generates the single character still that drives the whole video.

**createTask**
```json
POST https://api.kie.ai/api/v1/jobs/createTask
Authorization: Bearer <kie key>
{
  "model": "nano-banana-2",
  "input": { "prompt": "<look prompt>", "aspect_ratio": "16:9", "resolution": "2K", "output_format": "png" }
}
```
Response: `{ "code":200, "data": { "taskId": "..." } }`

**poll** `GET /jobs/recordInfo?taskId=<id>` → `data.state` is `waiting|generating|success|fail`.
On `success`, `data.resultJson` (a JSON string) has `resultUrls[0]` = the PNG URL.

- Cost: ~$0.04 / image. Override model with `OMNI_MODEL`.
- No text in output: put "no text, no letters, no watermark" in the prompt (image models love to add UI).

---

## 2. Voiceover — Google Gemini TTS `gemini-2.5-flash-preview-tts`

```json
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent
x-goog-api-key: <google key>
{
  "contents": [{ "parts": [{ "text": "<style directive> + <line>" }] }],
  "generationConfig": {
    "temperature": 0.85,
    "responseModalities": ["AUDIO"],
    "speechConfig": { "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Aoede" } } }
  }
}
```
Response audio is **base64 PCM** at `candidates[0].content.parts[].inlineData.data` — 24 kHz / 16-bit /
mono. The kit wraps it into a WAV header, trims silence, and loudness-normalizes (EBU R128).

- Voices: `Aoede` (warm female, default). Others: `Kore`, `Puck`, `Charon`, `Fenrir`, etc. Set via `TTS_VOICE`.
- Cost: pennies. One call per script chunk.
- Retries: transient 429/5xx and network blips are retried up to 6×.

---

## 3. Lip-sync — kie.ai `infinitalk/from-audio`  ★ the core model

Turns `still image + audio` into a talking video with real mouth sync.

**createTask**
```json
POST https://api.kie.ai/api/v1/jobs/createTask
Authorization: Bearer <kie key>
{
  "model": "infinitalk/from-audio",
  "input": {
    "image_url": "<public url of the still>",
    "audio_url": "<public url of one voice chunk>",
    "prompt":    "<motion/style description>",
    "resolution": "720p"        // "480p" | "720p"; seed optional (10000-1000000)
  }
}
```
Poll `recordInfo`; on `success`, `resultJson.resultUrls[0]` = the MP4 (audio baked in).

**Getting public URLs** (image_url / audio_url): upload the local file to kie's file host:
```json
POST https://kieai.redpandaai.co/api/file-base64-upload
Authorization: Bearer <kie key>
{ "base64Data": "data:image/jpeg;base64,…", "uploadPath": "images/xyz", "fileName": "girl.jpg" }
```
→ returns `data.downloadUrl`. (The kit downsizes the image to a 1280-wide JPEG and the audio to 128k MP3
before uploading, to keep payloads small.)

### ⚠️ Hard limits & operational notes (learned in production)
- **≤15s of audio per call.** InfiniteTalk is a chunked long-form model, not a one-shot. For a 60s video
  you split the script into ~5 chunks of ≤14.5s and lip-sync each against the **same** still, then concat.
- **Resolution / cost:** 720p ≈ $0.06/s, 480p ≈ $0.015/s.
- **kie can be flaky under load.** Three failure modes seen and how the kit handles each:
  1. Our poll deadline exceeded → configurable via `LIPSYNC_DEADLINE_MIN` (default 15; use 25–30 when kie is slow).
  2. Transient `fetch failed` mid-poll → the poll loop tolerates ~20 blips and retries the download 4×.
  3. Server-side `task failed: generate task timeout` at 720p → **re-run that one chunk at `RESOLUTION=480p`**;
     the assembler upscales it to a uniform 1280×720 and on flat 2D art it's indistinguishable.
- Re-do a single chunk: `CHUNK_IDS=03 node generate-lipsync.js --yes`.

### Alternatives on kie.ai (if you ever need single-call long-form, no concat seams)
| Model | Max audio | Notes | Slug confirmed? |
|---|---|---|---|
| `infinitalk/from-audio` | ~15s/call | what this kit uses; chunk + concat | ✅ yes |
| OmniHuman 1.5 | <60s (degrades >15s) | single call, quality drops on long audio | ⚠️ verify slug before spending |
| Kling AI Avatar 2.0 | up to 5 min | best for true single continuous shot | ⚠️ slug/duration not publicly confirmed 2026-08-08 |

Switch models via the `LIPSYNC_MODEL` env in `lib/config.js` once a slug is confirmed.
