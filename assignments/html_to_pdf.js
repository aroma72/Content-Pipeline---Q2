// Render an HTML file to a print-quality A4 PDF using the puppeteer that's
// already installed in the Remotion submodule.
//   node assignments/html_to_pdf.js <input.html> <output.pdf>
const path = require("path");
const puppeteer = require(path.resolve(__dirname, "../drawing-room-video/drawing-room-remotion/node_modules/puppeteer"));

(async () => {
  const [, , inp, out] = process.argv;
  if (!inp || !out) { console.error("usage: html_to_pdf.js <in.html> <out.pdf>"); process.exit(1); }
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.goto("file://" + path.resolve(inp), { waitUntil: "networkidle0" });
    await page.pdf({
      path: path.resolve(out),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    console.log("PDF written:", out);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
