# Brand assets (drop your real files here)

The bumpers work with sensible fallbacks, but for the real brand look add:

| File | What | Fallback if missing |
|---|---|---|
| `logo.png` | Square brand logo (≥220×220, transparent) | a solid accent-color rounded square |
| `fonts/brand.woff2` | Brand display font (e.g. Clash Grotesk) | Georgia serif |

Then edit `../config.js`:
- `brandName`, `tagline`, `signOff` (outro line)
- `fontFamily` must match the `@font-face` name if you wire the font
- palette (`bg/ink/head/accent`) — keep in sync with `../../.claude/skills/creating-explainer-videos/templates/animation/mckinsey.css`

Render invariant (do not change): all bumpers output **1920×1080 / 30 fps / yuv420p / AAC 48k**
so the lesson concat re-encodes cleanly.
