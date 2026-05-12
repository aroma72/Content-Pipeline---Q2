# Typography Standards — Video Production

## Font Family
- **Primary**: DM Sans (Google Fonts)
- **Weights**: 300 (light), 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
- **Fallback**: Inter, system-ui, sans-serif

## Font Sizes by Element Type

### Regular Body Text (All Slides)
- **Size**: 16px
- **Weight**: 700 (BOLD)
- **Color**: textDark (#3a3530)
- **Usage**: Descriptions, body content, supporting text
- **Line height**: 1.5

### Captions (Bottom of visual slides)
- **Size**: 40px
- **Weight**: 700 (bold)
- **Color**: textDark (#3a3530)
- **Usage**: Scene conclusions, key statements
- **Line height**: 1.4

### Scene Titles / Headlines
- **Size**: 56-96px
- **Weight**: 300 (light)
- **Color**: Accent colors (softOrange, softGreen, softBlue)
- **Usage**: Section headers, scene titles
- **Line height**: 1.2

### Diagram Labels / Concepts
- **Size**: 32px
- **Weight**: 700 (bold)
- **Color**: textDark (#3a3530)
- **Usage**: Radial concept maps, diagram annotations
- **Line height**: 1.4

### Grid Card Labels (Scene 2, 4)
- **Size**: 22px
- **Weight**: 600 (semi-bold)
- **Color**: Accent colors (softOrange for Consumer, softGreen for Producer)
- **Usage**: Grid item headers
- **Line height**: 1.3

### Grid Card Descriptions (Scene 2, 4)
- **Size**: 16px
- **Weight**: 400 (regular)
- **Color**: textGray (#6b5d52)
- **Usage**: Grid item supporting text
- **Line height**: 1.5

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| textDark | #3a3530 | Headlines, captions, main text |
| textGray | #6b5d52 | Supporting text, descriptions |
| softOrange | #d99670 | Consumer mindset accent, grid labels |
| softGreen | #8b9d7d | Producer mindset accent, autonomy arrows |
| softBlue | #7d9db8 | Autonomy concept, series accent |

### Background Colors
| Name | Hex | Usage |
|------|-----|-------|
| bgLight | #faf8f5 | Visual/diagram scenes |
| bgWarm | #f9f3ed | Definition/text-heavy scenes |
| cream | #ede8e0 | Conclusion/summary scenes |

## Font Rendering Rules

### DO ✓
- Use bold (weight 700) for all regular body text
- Use clean, sharp text rendering (no distortion)
- Ensure sufficient contrast (text vs background)
- Keep text within SVG/container bounds
- Use proper alignment (centered, left-aligned as appropriate)

### DON'T ✗
- Apply CSS transform: scale() to text (causes distortion)
- Mix different font families in same scene
- Use text colors that blend with backgrounds
- Position text outside container bounds
- Use opacity transforms on text (use conditional rendering instead)

## Responsive Sizing
- Base resolution: 1920×1080
- All font sizes are absolute (no relative sizing)
- No scaling needed for different resolutions

## Animation Rules
- Text appears via opacity fade or conditional rendering
- NO transform: scale() on text (causes distortion)
- NO rotate transforms on text
- Use fadeIn() for gentle entrance
- Stagger text entrance by 8-12 frames between elements

## Example Implementation

```typescript
// ✓ CORRECT - Clean text rendering
<text
  x={100}
  y={100}
  fontSize="16"
  fontWeight="700"
  fill={COLORS.textDark}
  fontFamily="'DM Sans', sans-serif"
>
  Regular body text
</text>

// ✗ WRONG - Distorted rendering
<text
  x={100}
  y={100}
  fontSize="16"
  style={{ transform: `scale(${0.5})` }}
>
  This text will be distorted!
</text>

// ✓ CORRECT - Animated text entrance
{showText && (
  <text x={100} y={100} fontSize="16">
    Text appears cleanly
  </text>
)}
```

## Validation Checklist
- [ ] All body text is 16px, bold (weight 700)
- [ ] All captions are 40px, bold
- [ ] Text colors have sufficient contrast
- [ ] No text positioned outside bounds
- [ ] No transform: scale() applied to text elements
- [ ] Text renders cleanly without distortion
- [ ] Font family is DM Sans (or proper fallback)

---

**Last Updated**: 2026-05-12  
**Status**: ENFORCED - All videos must comply  
**Owner**: Video Production Team
