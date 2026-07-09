'use strict';
/*
 * Brand bumper config — set once for the whole repo.
 * The intro TITLE is per-lesson (passed by stitch-brand.js --title); everything
 * else here is the fixed brand identity shared by every video.
 */
module.exports = {
  brandName: 'Drawing Room',
  tagline: 'Agentic AI Mastery',
  signOff: 'We believe everyone can be extraordinary.', // outro line
  // brand assets (drop real files in brand/; falls back to system fonts/colors if absent)
  fontFile: 'brand/fonts/brand.woff2',   // e.g. Clash Grotesk
  fontFamily: 'BrandFont',
  logoFile: 'brand/logo.png',
  introSeconds: 2.6,
  outroSeconds: 2.6,
  // palette (kept in sync with animation/mckinsey.css)
  bg: '#F5F1E8', ink: '#2E2A24', head: '#6B5344', accent: '#C08A3E',
};
