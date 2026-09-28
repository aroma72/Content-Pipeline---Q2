# Typography Standards — Video Production
# Agentic AI Mastery · Coursera/Udemy Grade · 1920×1080 @ 30fps

---

## Safe Zone (CRITICAL — root cause of indentation issues)

All text must live inside the **safe zone**, not the raw canvas edge.

| Rule | Value | Why |
|---|---|---|
| Horizontal padding | **120px each side** | Prevents text jamming against the video edge |
| Vertical padding | **80px top and bottom** | Breathing room top and bottom |
| Effective text area | **1680 × 920px** | Inside the 1920×1080 canvas |

```tsx
// ✅ CORRECT — always use this as your root container
<AbsoluteFill style={{
  backgroundColor: BG,
  padding: '80px 120px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}}>

// ❌ WRONG — text will sit 32px from the raw edge (looks jammed)
<AbsoluteFill style={{ padding: '32px' }}>
```

---

## Font Family

- **Primary**: `'Georgia, serif'`
- **NEVER use**: `-apple-system`, `Segoe UI`, `Roboto`, `Arial`, `DM Sans`, `Inter`, or any system UI font
- **Reason**: Georgia reads with authority and warmth on video; system UI fonts feel like a browser tab

---

## Typography Scale

### Hero Title / Hook (one strong statement per screen)
- **Size**: 62–72px
- **Weight**: 700
- **Line height**: 1.15–1.2
- **Max width**: 1400px
- **Colour**: `#6B5344` (dark brown)

### Section Heading (topic or phase label)
- **Size**: 48–56px
- **Weight**: 700
- **Line height**: 1.2
- **Max width**: 1400px
- **Colour**: `#6B5344`

### Eyebrow Label (above titles — stage/topic indicator)
- **Size**: 16px
- **Weight**: 700
- **Transform**: UPPERCASE
- **Letter spacing**: 4px
- **Colour**: `#C67C5F` (terracotta accent)
- **Margin below**: 16–24px before the title

### Bullet / Key Point (the most common element — MINIMUM 28px)
- **Size**: 28–32px ← **never go below 28px at 1080p**
- **Weight**: 700
- **Line height**: 1.45
- **Max width**: 1400px
- **Colour**: `#6B5344`
- **Bullet style**: Left-border bar (see below) — never dots, dashes, or emoji
- **Gap between bullets**: 24–32px

### Body Copy / Supporting Text
- **Size**: 24–26px
- **Weight**: 400
- **Line height**: 1.6
- **Max width**: 1200px ← tighter than bullets for readability
- **Colour**: `#9B7A6B` (medium brown)

### Card Title (inside card components)
- **Size**: 26px
- **Weight**: 700
- **Line height**: 1.3
- **Colour**: accent colour (terracotta, sage, blue — depends on card)

### Card Body (inside card components)
- **Size**: 20–22px
- **Weight**: 400
- **Line height**: 1.5
- **Colour**: `#9B7A6B`

### Closing CTA Text
- **Size**: 28–32px
- **Weight**: 700
- **Alignment**: centred
- **Max width**: 960px

---

## Bullet Row Pattern (standard implementation)

```tsx
// ✅ CORRECT bullet row
<div style={{
  display: 'flex',
  alignItems: 'stretch',
  gap: 0,
  maxWidth: 1400,
  opacity: bulletOpacity,
  transform: `translateY(${bulletY}px)`,
}}>
  {/* Left border bar */}
  <div style={{
    width: 5,
    alignSelf: 'stretch',
    backgroundColor: BRAND,   // terracotta #C67C5F or matching accent
    borderRadius: 3,
    marginRight: 24,
    flexShrink: 0,
  }} />
  {/* Bullet text */}
  <div style={{
    fontSize: 28,
    fontWeight: 700,
    color: HEADING,            // #6B5344
    lineHeight: 1.45,
    alignSelf: 'center',
  }}>
    {bullet}
  </div>
</div>
```

---

## Text Alignment Rules

| Context | Alignment |
|---|---|
| Hero titles (single line) | Centre |
| Section headings (single line) | Left or Centre |
| Multi-line body / bullets | **Left always** |
| Closing CTA | Centre |
| Eyebrow labels | Same as title below it |

**Never centre-align multi-line paragraph text** — it creates a ragged zigzag that is hard to scan.

---

## Colour Palette

### Text Colours
| Token | Hex | Usage |
|---|---|---|
| Heading / dark text | `#6B5344` | Titles, bullets, card titles |
| Body text | `#9B7A6B` | Supporting text, descriptions, card body |
| Eyebrow / accent text | `#C67C5F` | Labels, eyebrows, highlights |

### Background Colours
| Token | Hex | Usage |
|---|---|---|
| Main background | `#F5F1E8` | All segments |
| Closing phase | `#EDE8DC` | Final closing card |
| Card fill (terracotta) | `#FDF3EC` | Cursor/warm cards |
| Card fill (sage) | `#EEF3EC` | Claude Code/green cards |
| Card fill (blue) | `#EDF6F9` | GitHub/cool cards |

---

## Animation Rules for Text

- Text enters via **opacity fade + translateY slide** — never scale()
- `scale()` on text causes layout jitter at video scale — banned
- Stagger multi-bullet reveals: 60–90 frames between each bullet
- Entrance animation duration: 20–25 frames (0.67–0.83s)

```tsx
// ✅ CORRECT text entrance
const opacity = interpolate(frame, [startF, startF + 22], [0, 1], { extrapolateRight: 'clamp' });
const y = interpolate(frame, [startF, startF + 22], [32, 0], { extrapolateRight: 'clamp' });

// ❌ WRONG — never scale text
const scale = interpolate(frame, [startF, startF + 22], [0.8, 1], { extrapolateRight: 'clamp' });
style={{ transform: `scale(${scale})` }}
```

---

## Layout Checklist (run before every render)

- [ ] Root container uses `padding: '80px 120px'` — not `'32px'`
- [ ] All bullet text is **28px minimum**
- [ ] All body copy has `maxWidth: 1200` or `maxWidth: 1400`
- [ ] Multi-line text is **left-aligned**
- [ ] No `scale()` on text elements
- [ ] No `white-space: nowrap` on any text
- [ ] Font is `'Georgia, serif'` — no system fonts
- [ ] Bullet left-border bar is 5px wide, not a dot/dash/emoji
- [ ] Card padding is **28px minimum**

---

**Last Updated**: 2026-05-25
**Status**: ENFORCED — all Week 2+ videos must comply
**Owner**: Aroma Tahir
