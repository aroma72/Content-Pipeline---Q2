# The deploy image, plus the one thing a gate needs that the server does not.
#
# FROM the real image on purpose. The whole value of this harness is that it is
# the same environment: the same Chromium, the same fonts, the same ffmpeg, the
# same python, the same /dev/shm. A bespoke test image would have found none of
# the bugs that motivated it -- a laptop has Chrome, so the missing-browser
# failure was invisible locally and only appeared after a paid render.
#
# Build the base first:
#   docker build -t content-queen:base .
#   docker build -t content-queen:harness -f scripts/harness/Dockerfile .
ARG BASE=content-queen:base
FROM ${BASE}

# The gates `require('puppeteer')` from inside a video folder. In production that
# dependency arrives with the per-video `npm i` that produce.js runs; here the
# folders are checked-out fixtures with no node_modules, so it is installed once
# into the image and found via NODE_PATH. PUPPETEER_SKIP_DOWNLOAD is already set
# by the base image, so this pulls the JS and not a second browser.
RUN npm install -g puppeteer@25 --no-audit --no-fund
ENV NODE_PATH=/usr/local/lib/node_modules

WORKDIR /work
