'use strict';
/*
 * Brand bumper config — set once for the whole repo.
 * The intro TITLE is per-lesson (passed by stitch-brand.js --title); everything
 * else here is the fixed brand identity shared by every video.
 */
module.exports = {
  brandName: 'Taleemabad University',
  tagline: '',
  signOff: '', // outro line (empty = logo only, no sign-off text)
  // brand assets: if brand/logo.png exists it's used; otherwise the built-in
  // Taleemabad wordmark (inline SVG in bumper.html) renders — crisp, correct spelling.
  fontFile: 'brand/fonts/brand.woff2',
  fontFamily: 'Segoe UI, Arial, sans-serif',
  logoFile: 'brand/logo.png',
  introSeconds: 2.6,
  outroSeconds: 2.4,
  // palette — Taleemabad blue on white
  bg: '#FFFFFF', ink: '#1F2A44', head: '#3B6FE6', accent: '#3B6FE6',
};
