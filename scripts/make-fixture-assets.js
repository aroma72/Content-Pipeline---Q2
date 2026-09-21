'use strict';
/**
 * Give a committed video folder the render assets it needs, without buying any.
 *
 * A video folder in git carries beats.js, durations.json and animation/ -- the
 * cheap, reviewable part. Everything the render actually draws (art/, layers/,
 * audio/, out/) is gitignored and absent, because it is generated and large.
 *
 * That is why the gates could only ever be tested by buying a lesson. One render
 * cost $2.81, surfaced ONE bug, and stopped -- so five bugs cost five renders.
 * This writes stand-ins at the exact paths the renderer expects, so the whole
 * pipeline can be exercised for nothing.
 *
 * The stand-ins are flat colour. That is deliberate and sufficient: the gates
 * measure the DOM -- text nodes, computed font sizes, bounding boxes, whether an
 * image resolved -- and none of that is improved by a real illustration. A gate
 * that needs pretty pictures to pass is not measuring what it claims to.
 *
 *   node scripts/make-fixture-assets.js <video-dir> [--force]
 *
 * Refuses to touch a folder that already has real art unless --force, because
 * overwriting a $0.60 art buy with flat squares would be an expensive mistake to
 * make by accident.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1920;
const H = 1080;

/**
 * A solid-colour PNG, written by hand.
 *
 * No Pillow, no canvas, no npm install: this has to run identically on a laptop
 * and inside the deploy image, and the fewer moving parts between them the more
 * the harness is worth. zlib is a Node builtin.
 */
function solidPng(width, height, [r, g, b]) {
  const crcTable = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 2;    // colour type: truecolour RGB
  // 10,11,12 are compression/filter/interlace, all 0

  // One filter byte (0 = none) per scanline, then RGB triples.
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 1 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Distinct per beat, so a frame dump is readable and a stuck frame is visible. */
function colourFor(i) {
  const hue = (i * 47) % 360;
  const c = 180;
  const x = Math.round(c * (1 - Math.abs(((hue / 60) % 2) - 1)));
  const table = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  const [r, g, b] = table[Math.floor(hue / 60) % 6];
  return [r + 60, g + 60, b + 60];
}

function main() {
  const dir = process.argv[2];
  const force = process.argv.includes('--force');
  if (!dir) {
    console.error('usage: node scripts/make-fixture-assets.js <video-dir> [--force]');
    process.exit(2);
  }
  const abs = path.resolve(dir);
  const beatsPath = path.join(abs, 'beats.js');
  if (!fs.existsSync(beatsPath)) {
    console.error(`no beats.js in ${abs}`);
    process.exit(2);
  }

  const artDir = path.join(abs, 'art');
  if (fs.existsSync(artDir) && !force) {
    const real = fs.readdirSync(artDir).filter((f) => f.endsWith('.png'));
    const stamp = path.join(artDir, '.fixture');
    if (real.length && !fs.existsSync(stamp)) {
      console.error(`${artDir} already holds ${real.length} image(s) that this did not write.`);
      console.error('Refusing to overwrite bought art. Pass --force if you are sure.');
      process.exit(2);
    }
  }

  const beats = require(beatsPath);
  fs.mkdirSync(artDir, { recursive: true });
  fs.writeFileSync(path.join(artDir, '.fixture'), 'written by scripts/make-fixture-assets.js\n');

  let n = 0;
  beats.forEach((b, i) => {
    if (!b || !b.id) return;
    // checkpoint beats are never drawn -- the player pauses at the boundary and
    // the LMS shows the question, so no art is expected and none is written.
    if (b.mode === 'checkpoint') return;
    const png = solidPng(W, H, colourFor(i));
    fs.writeFileSync(path.join(artDir, `${b.id}.png`), png);
    n += 1;

    // An `ali` beat draws a cutout over a plate when anchors exist. compile-lesson
    // passes anchors; qa-frames does not, so it falls through to art/. Write both
    // so either path has something to draw.
    if (b.mode === 'ali') {
      const layerDir = path.join(abs, 'layers', String(b.id));
      fs.mkdirSync(layerDir, { recursive: true });
      fs.writeFileSync(path.join(layerDir, 'plate.png'), png);
      fs.writeFileSync(path.join(layerDir, 'boy.png'), solidPng(400, 800, [40, 40, 40]));
    }
  });

  // durations.json is committed for these fixtures, but a folder without one
  // makes qa-frames skip rather than fail -- a silent pass is the worst outcome
  // for a harness, so write a plausible one rather than let it opt out.
  const durPath = path.join(abs, 'durations.json');
  if (!fs.existsSync(durPath) || force) {
    const durations = {};
    for (const b of beats) if (b && b.id) durations[b.id] = 6.2;
    fs.writeFileSync(durPath, JSON.stringify(durations, null, 2));
    console.log(`  wrote durations.json (${Object.keys(durations).length} beats at 6.2s)`);
  }

  console.log(`[fixture] ${n} stand-in image(s) in ${path.relative(process.cwd(), artDir)}`);
}

main();
