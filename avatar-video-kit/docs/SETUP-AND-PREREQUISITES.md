---
title: Setup & Prerequisites
type: reference
last_verified: 2026-08-08
owner: aroma
---

# Setup & Prerequisites

Do this **once**. After that, each new video is just copy-the-templates + edit + run.

## 1. Accounts & API keys you must have

| Service | What it does here | Where to get the key | Rough cost |
|---|---|---|---|
| **kie.ai** | Both the still image (`nano-banana-2`) AND the lip-sync (`infinitalk/from-audio`) | https://kie.ai → dashboard → API keys. Add credits/billing. | image ~$0.04; lip-sync ~$0.06/s @720p, ~$0.015/s @480p |
| **Google AI Studio (Gemini)** | The voiceover (`gemini-2.5-flash-preview-tts`) | https://aistudio.google.com/apikey | pennies per video |

You need **one kie.ai key** and **one Google key**. That's it. No ElevenLabs, no Veo, no paid video-gen
service beyond kie.ai.

> Keep credits topped up on kie.ai — the lip-sync step is the only real cost and it will hard-fail
> with a spend/credit error if the account is empty.

## 2. Local tooling

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | 18+ (tested on 24) | Uses global `fetch` — no `node-fetch` needed. |
| **ffmpeg / ffprobe** | bundled | Installed automatically via `ffmpeg-static` + `ffprobe-static` (`npm i`). No system ffmpeg required. |
| Python | ❌ none | Not used. (Unlike the explainer pipeline, there is no cutout/segmentation step.) |

Install per project:
```bash
cd my-avatar-video && npm i
```

## 3. The `.env` file

Copy `templates/.env.example` → `.env` and fill it in. Put it either in the project folder **or any
parent folder** — the scripts walk up the directory tree to find it, so one shared `.env` covers many
video folders.

```
GEMINI_OMNI_API_KEY=<kie.ai key>      # or KIE_API_KEY=
GEMINI_API_KEY=<google ai studio key> # or GOOGLE_STUDIO_API_KEY=
```

## 4. Spend guard (how "ask before paying" works)

Every script that hits a paid API calls `guardSpend()` first. It **blocks and exits** unless you opt in
for that run with either:
- CLI flag: `--yes` (or `--confirm-spend`), or
- env var: `CONFIRM_SPEND=1`

So a bare `node generate-lipsync.js` will just print the estimate and refuse. This is intentional —
it prevents accidental charges. `assemble.js` is free (local ffmpeg) and needs no flag.

## 5. One-time sanity check

```bash
cp -r avatar-video-kit/templates smoke && cd smoke && npm i
node -e "require('./lib/config').omniKey() && require('./lib/config').geminiKey() && console.log('keys OK')"
```
If it prints `keys OK`, you're ready. If it exits complaining about a missing key, fix `.env`.

## Prerequisite checklist
- [ ] kie.ai account + API key + credits loaded
- [ ] Google AI Studio API key
- [ ] Node 18+ installed
- [ ] `.env` created (project or parent folder) with both keys
- [ ] `npm i` run in the project folder
- [ ] `keys OK` smoke check passes
