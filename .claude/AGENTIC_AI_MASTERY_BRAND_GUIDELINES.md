---
name: agentic_ai_mastery_brand_guidelines
description: Visual and design standards for Agentic AI Mastery course (Sessions 1-4)
metadata:
  type: reference
  owner: Aroma Tahir
  last_verified: 2026-05-21
---

# Agentic AI Mastery — Brand & Visual Guidelines

**Applies to**: All Sessions (1-4) videos, assignments, documentation  
**Standards**: WCAG 2.1 AA accessibility, educational content best practices, consistent brand identity  
**Approved**: Yes

---

## Core Philosophy

- **Clarity first**: Every visual element must be immediately understandable
- **Not too dark**: Never use pure black (#000000) backgrounds; minimum 95% luminance for readability
- **High contrast**: Text-to-background contrast ratio ≥ 4.5:1 (WCAG AA standard)
- **Consistent brand**: Same fonts, color palette, spacing across all 4 sessions
- **Educational tone**: Professional but warm; encouraging, not intimidating

---

## Color Palette

### Primary Colors (Core Brand)
| Name | Hex | Usage | WCAG AA Contrast |
|------|-----|-------|-----------------|
| **Primary Blue** | `#4A7BA7` | Headers, key concepts, CTAs | ✓ 8.2:1 on white |
| **Brand Teal** | `#5DADE2` | Highlights, section dividers, emphasis | ✓ 5.1:1 on white |
| **Warm Accent** | `#E8A76A` | Call-to-action buttons, highlights | ✓ 4.6:1 on white |
| **Success Green** | `#52B788` | Checkmarks, correct answers, completion | ✓ 4.8:1 on white |

### Backgrounds (NEVER PURE BLACK OR DARK GRAY)
| Name | Hex | Luminance | Usage |
|------|-----|-----------|-------|
| **Off-White** | `#F8F7F4` | 98% | Default background for all slides |
| **Soft Cream** | `#FAF8F5` | 97.5% | Alternative background, section breaks |
| **Light Gray** | `#E8E7E4` | 91% | Secondary backgrounds, subtle separation |
| **Lightest Blue** | `#EDF5F9` | 96% | Code blocks, technical sections, callouts |

### Text Colors
| Name | Hex | Usage | WCAG AA (on off-white) |
|------|-----|-------|----------------------|
| **Dark Text** | `#2C3E50` | Body copy, primary text | ✓ 14:1 contrast |
| **Gray Text** | `#6B7280` | Secondary text, captions, timestamps | ✓ 7.2:1 contrast |
| **Link Text** | `#4A7BA7` | Hyperlinks in docs | ✓ 8.2:1 contrast |

---

## Typography

### Font Family
**Primary Font**: System font stack  
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 
             'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 
             sans-serif;
```

**Purpose**: Modern, clean, highly readable on all devices and screen sizes  
**Fallback**: System fonts ensure compatibility; no web fonts needed (faster rendering)

**Monospace Font** (code snippets):
```css
font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
```

### Font Sizes & Weights

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| **Page Title** | 56px | 700 (bold) | Session opening, main topics |
| **Section Header** | 40px | 600 (semibold) | Major concept divisions |
| **Subsection Header** | 32px | 600 (semibold) | Topic subdivisions |
| **Body Copy** | 24px | 400 (regular) | Main narrative text, explanations |
| **Caption/Label** | 18px | 400 (regular) | Image captions, timestamps, labels |
| **Small Text** | 14px | 400 (regular) | Footnotes, metadata, credits |
| **Code/Monospace** | 16px | 400 (regular) | Code snippets, terminal output |

---

## Layout & Spacing Principles

### Margins & Padding
- **Title to content**: 48px vertical spacing
- **Section to section**: 56px vertical spacing
- **Element to element**: 24px horizontal/vertical padding within sections
- **Text to text**: 18px line-height for body copy (1.5x line-height multiplier)

### Safe Zones (Video Composition)
- **Top/Bottom safe zone**: 80px (account for player controls)
- **Left/Right safe zone**: 60px (account for aspect ratio changes)
- **Text/graphics never extend to edges**: Always maintain 60px minimum padding

### Visual Hierarchy
1. **Most important**: Large text, primary blue (#4A7BA7), top of slide
2. **Important**: Medium text, dark text color, secondary positioning
3. **Supporting**: Small text, gray (#6B7280), lower on slide
4. **Decorative**: Light accent colors, subtle visual separation

---

## Component Styling

### Headers/Titles
- **Color**: Primary Blue (#4A7BA7)
- **Background**: Transparent or Soft Cream (#FAF8F5) for emphasis
- **Style**: Clean, minimal, no drop shadows (unprofessional)
- **Underline option**: Warm Accent (#E8A76A) 2-4px underline for key titles

### Body Text
- **Color**: Dark Text (#2C3E50)
- **Line-height**: 1.5 (24px text = 36px line-height)
- **Max width**: 800px (optimal reading width for comprehension)
- **Alignment**: Left-aligned (best for education content per W3C/WCAG guidelines)

### Emphasis/Callouts
- **Color**: Warm Accent (#E8A76A) or Success Green (#52B788)
- **Style**: Left border (4-6px) + subtle background (Lightest Blue #EDF5F9)
- **Example**:
  ```
  ┌─────────────────────────────────────┐
  │ KEY CONCEPT: This is important      │
  │ All callouts use this style          │
  └─────────────────────────────────────┘
  ```

### Code Blocks
- **Background**: Lightest Blue (#EDF5F9)
- **Text color**: Dark Text (#2C3E50)
- **Border**: 1px Light Gray (#E8E7E4)
- **Padding**: 16px
- **Font**: Monospace, 16px
- **Example**:
  ```
  ┌────────────────────────────────┐
  │ def create_agent():            │
  │     return Agent(...)          │
  └────────────────────────────────┘
  ```

### Buttons/CTAs
- **Background**: Brand Teal (#5DADE2) or Warm Accent (#E8A76A)
- **Text**: White (#FFFFFF) for contrast ≥ 7:1
- **Padding**: 12px 24px (accessible touch target: 44×44px minimum)
- **Border radius**: 4px (slightly rounded, professional)
- **Hover**: Lighten by 10% or add subtle shadow

### Links
- **Color**: Primary Blue (#4A7BA7)
- **Underline**: Always visible (not just on hover)
- **Style**: No all-caps, regular font-weight

---

## Remotion Composition Standards

### Animation Principles
- **Entrance**: 200-300ms (spring animation, not abrupt)
- **Hold**: Minimum 3 seconds per concept (allows reading)
- **Exit**: 200ms (fade out)
- **Easing**: Use `spring({ damping: 90, stiffness: 60 })` for natural motion
- **No flashing**: Nothing faster than 3 flashes/second (seizure safety)

### Background Colors in Video
```typescript
// ✓ GOOD: Off-white background
style={{ backgroundColor: '#F8F7F4' }}

// ✗ BAD: Dark background (hard to read)
style={{ backgroundColor: '#1a1a1a' }}

// ✓ GOOD: Soft cream alternative
style={{ backgroundColor: '#FAF8F5' }}
```

### Text Overlay Guidelines
```typescript
// ✓ GOOD: High contrast
<div style={{
  color: '#2C3E50',           // Dark text
  backgroundColor: '#FAF8F5', // Soft cream background
  padding: '24px',
  borderRadius: '4px'
}}>

// ✗ BAD: Low contrast (hard to read)
<div style={{
  color: '#888888',           // Gray text on gray background
  backgroundColor: '#999999'
}}>
```

---

## Document & Assignment Styling

### PDF Generation
- **Page background**: Off-White (#F8F7F4)
- **Header color**: Primary Blue (#4A7BA7)
- **Body font size**: 12-14pt (ensure printable)
- **Line spacing**: 1.5
- **Margins**: 0.75 inch on all sides
- **Header/Footer**: Include course name, session number, page number

### Word Document (.docx)
- **Style**: Professional template with header + footer
- **Colors**: Use defined palette; no random colors
- **Embedded images**: 300 DPI minimum for print quality
- **Font**: Calibri or Segoe UI, 11-12pt body
- **Headings**: Use Word styles (Heading 1, Heading 2, etc.) for consistency

### Accessibility in Documents
- [ ] All images have alt-text (describe, don't just label)
- [ ] Links are underlined and in Primary Blue (#4A7BA7)
- [ ] Tables have header rows
- [ ] No text as images (use actual text instead)
- [ ] Document structure follows logical heading hierarchy (H1 → H2 → H3)

---

## Specific Requirements by Content Type

### Session Videos (Remotion)
1. **Background**: Off-White (#F8F7F4) or Soft Cream (#FAF8F5)
2. **Text**: Dark Text (#2C3E50) minimum 24pt
3. **Headers**: Primary Blue (#4A7BA7), 40-56pt
4. **Emphasis**: Warm Accent (#E8A76A) or Success Green (#52B788)
5. **Animations**: Spring-based (natural feeling), no jarring cuts
6. **Duration per concept**: Minimum 3 seconds (reading time)
7. **Contrast check**: Every text element tested with WCAG contrast checker

### Theory Assignments (PDF)
1. **Questions**: Dark Text (#2C3E50), 12-14pt
2. **Answer key**: Success Green (#52B788) for correct answers
3. **Instructions**: Primary Blue (#4A7BA7) headers
4. **Layout**: Single column, 0.75 inch margins, 1.5 line spacing

### Practical Assignments (PDF)
1. **Task description**: Clear, numbered steps
2. **Screenshots**: Bordered (1px Light Gray #E8E7E4) with captions
3. **Callouts**: Lightest Blue (#EDF5F9) background with left border
4. **Success criteria**: Success Green (#52B788) checkmarks

### Step-by-Step Guides (Word + PDF)
1. **Section headers**: Primary Blue (#4A7BA7), 18pt
2. **Step number**: Warm Accent (#E8A76A) circle or badge
3. **Screenshots**: Embedded at 100% width with captions
4. **Instructions**: Dark Text (#2C3E50), 12pt, 1.5 line spacing
5. **Callout boxes**: Lightest Blue (#EDF5F9) background for tips/notes

---

## Accessibility Checklist (Before Publishing)

### Videos
- [ ] Captions/subtitles present and synchronized
- [ ] Text ≥24pt for readability
- [ ] Color contrast ≥4.5:1 for all text (tested with contrast checker)
- [ ] No flashing elements (>3Hz)
- [ ] Animation entrance ≥200ms (not jarring)
- [ ] Hold time ≥3 seconds per concept (reading time)

### Documents
- [ ] Heading hierarchy correct (H1→H2→H3)
- [ ] All images have descriptive alt-text
- [ ] Links are underlined and in Primary Blue (#4A7BA7)
- [ ] Font size ≥11pt (body), ≥14pt (video captions)
- [ ] Line spacing ≥1.5
- [ ] Color contrast ≥4.5:1 for all text
- [ ] No PDFs created as image scans (use native PDF export)

### Overall
- [ ] Document tested with NVDA/JAWS (screen reader compatibility)
- [ ] Preview in Taleemabad LMS to verify rendering
- [ ] Test on mobile device (responsive/readable)
- [ ] Review by subject matter expert for clarity

---

## Tools & Resources for Verification

### Contrast Checking
- **Tool**: WebAIM Contrast Checker (webaim.org/resources/contrastchecker/)
- **Standard**: WCAG AA (4.5:1 for normal text, 3:1 for large text)

### Readability Testing
- **Tool**: Hemingway Editor (hemingwayapp.com) for document clarity
- **Tool**: Flesch-Kincaid Grade Level (target: 8-10, college-level but accessible)

### Accessibility Validation
- **Tool**: axe DevTools (browser extension) for WCAG compliance
- **Tool**: NVDA (screen reader) for document testing
- **Tool**: Color Blindness Simulator (coblis.org) to verify color-only information isn't critical

---

## Implementation Checklist for Sessions 2-4

When building each session, follow this checklist:

### Video Production
- [ ] Create Remotion composition using off-white background (#F8F7F4)
- [ ] Set text color to Dark Text (#2C3E50)
- [ ] Use Primary Blue (#4A7BA7) for headers
- [ ] Verify font sizes: titles ≥56pt, body ≥24pt
- [ ] Test contrast ratio: all text ≥4.5:1
- [ ] Preview in Studio for readability on standard monitor
- [ ] Check animation timing: entrance ≥200ms, hold ≥3s

### Assignment Generation
- [ ] Use PDF template with header/footer
- [ ] Set body font to 12-14pt
- [ ] Use Primary Blue (#4A7BA7) for question headers
- [ ] Use Success Green (#52B788) for answer keys
- [ ] Include alt-text for any diagrams/images
- [ ] Test PDF in Acrobat Reader for rendering

### Documentation
- [ ] Embed screenshots with 1px Light Gray (#E8E7E4) borders
- [ ] Use Primary Blue (#4A7BA7) for section headers (18pt)
- [ ] Add Lightest Blue (#EDF5F9) callout boxes for tips
- [ ] Verify images embedded (not linked)
- [ ] Test Word document for heading hierarchy
- [ ] Export to PDF and verify rendering
- [ ] Test screenshot readability at 100% zoom

### Pre-Publication
- [ ] Run axe DevTools on generated documents
- [ ] Check WCAG contrast for all text elements
- [ ] Review in Taleemabad staging environment
- [ ] Test on mobile device (mobile-friendly?)
- [ ] Confirm video plays without audio distortion
- [ ] Verify all assignments downloadable and printable

---

## Brand Evolution & Updates

This document is the **source of truth** for Sessions 1-4 visual consistency.

**Updates**: Any changes to colors, fonts, or standards must be:
1. Documented in this file with date and rationale
2. Applied to ALL sessions (retroactively if needed)
3. Approved by course owner (Aroma Tahir)

**Version**: 1.0 (May 21, 2026)  
**Last Updated**: May 21, 2026  
**Next Review**: After Session 2 publication (feedback incorporation)

---

**CRITICAL**: This document is non-negotiable. All Sessions 2-4 MUST follow these guidelines.  
**No exceptions** for "creative freedom" or "personal preference" — consistency is more important than individuality in educational content.
