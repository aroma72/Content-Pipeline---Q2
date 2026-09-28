const path = require('path');
const puppeteer = require(path.resolve(__dirname, 'drawing-room-video/drawing-room-remotion/node_modules/puppeteer'));
(async () => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  for (const [f, out] of [['video-builder-concept.html','c1.png'],['video-builder-technical.html','t1.png']]) {
    const p = await b.newPage();
    await p.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1.4 });
    await p.goto('file://' + path.join(__dirname, 'prototypes', f), { waitUntil: 'networkidle0' });
    await p.evaluate(() => document.fonts.ready);
    const el = await p.$('.page');
    await el.screenshot({ path: path.join(process.env.SHOT_DIR, out) });
    await p.close();
  }
  await b.close();
  console.log('shots written');
})();
