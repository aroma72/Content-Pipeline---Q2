# Drawing Room — Slack/Jira agent + full video render, on Railway.
#
# The image has to carry the whole explainer pipeline, not just a web server:
# compile-lesson.js drives headless Chrome, segment-all.py does the cutout work in
# Pillow/numpy, and the stitch step shells out to ffmpeg. Any one of those missing
# turns into a mid-render failure minutes into a paid run, so they are installed
# here rather than discovered at runtime.

FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive \
    # Puppeteer must use the system Chromium. Letting it download its own bundled
    # build both bloats the image and pulls a binary that misses these shared libs.
    PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
    CHROME_PATH=/usr/bin/chromium

RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ffmpeg \
      python3 \
      python3-pil \
      python3-numpy \
      # Chromium refuses to start headless without these.
      fonts-liberation fonts-dejavu-core libnss3 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
      libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# produce.js invokes `python`, but Debian ships only `python3`. On Windows the
# repo's shell.js papers over this with a PATH probe; on Linux it passes the name
# straight to spawn, so an unshimmed `python` is a guaranteed ENOENT at the
# segmentation step — after the art has already been paid for.
RUN ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

# The judgement stages run through `claude -p`, not the Anthropic API. That is
# deliberate (see orchestrator/lib/llm-cli.js): the same models under the
# subscription already being paid for, and one fewer credential to hold. The CLI
# therefore has to exist inside the image, authenticated by
# CLAUDE_CODE_OAUTH_TOKEN rather than an interactive login.
RUN npm install -g @anthropic-ai/claude-code --no-audit --no-fund

# Dependencies first: this layer is cached and only rebuilt when the manifests
# change, so ordinary code edits redeploy in seconds instead of minutes.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Renders write into the image's own filesystem, which Railway wipes on redeploy.
# Anything that must outlive a deploy (queue history, run state) belongs on a
# mounted volume — see docs/DEPLOYMENT_PREREQS.md.
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
