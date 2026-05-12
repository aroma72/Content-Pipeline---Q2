# Educational Video Animation Guidelines

## Remotion Animation Techniques for Autonomous Systems Series

### Core Animation Principles
- **Staggered Entrance**: Elements appear sequentially with 8-12 frame delays for visual hierarchy
- **Spring Physics**: Use `damping: 80-90, stiffness: 60-100` for organic, bouncy motion
- **Microlearning Focus**: Each scene focused on 1-2 key concepts, 12-15 second duration
- **Handcrafted Aesthetic**: Organic timing, avoid linear interpolation, favor spring-based movement

### Animation Functions Used

#### fadeIn(frame, start, duration)
- Linear opacity transition
- Duration: 20-40 frames typical
- Usage: Fade in entire groups or subtle backgrounds

#### slideIn(frame, fps, delay, direction)
- Spring-based lateral movement
- Directions: "left", "right"
- Distance: 80px typical
- Config: damping 90, stiffness 60 (smooth, controlled)
- Usage: Entrance animations for diagrams and text groups

#### scaleIn(frame, delay)
- Spring-based scale from 0.7 to 1.0
- Config: damping 90, stiffness 60
- Usage: Cards, boxes, central system elements
- Combines with fadeIn for compound animations

#### bounceScale(frame, delay)
- Bouncy scale from 0.5 to 1.0
- Config: damping 8, stiffness 200 (much bouncier)
- Usage: System boxes, emphasis on interactive elements
- Creates energetic, playful feel

#### rotateIn(frame, delay, degrees)
- Rotation from specified angle to 0°
- Default: 180° (full spin)
- Config: damping 90, stiffness 60
- Usage: Badge elements, concept labels (not yet implemented)

### Scene Structure Pattern

```typescript
// Group-level opacity and timing control
<g opacity={fadeIn(frame, startFrame, duration)}>
  // Animated entrance
  <g transform={`translateX(${slideIn(...)}px)`}>
    {/* Element 1 */}
  </g>
  
  // Staggered sub-elements
  <g opacity={fadeIn(frame, startFrame + 20, duration)}>
    {/* Element 2 */}
  </g>
  
  <g opacity={fadeIn(frame, startFrame + 40, duration)}>
    {/* Element 3 */}
  </g>
</g>
```

### Timing Strategy

**Scene 2 & 4 (Definition + Grid Cards)**
- Title: Appears immediately with slideIn (frame 0)
- Quote/headline: Fades in (frame 0, duration 40)
- Grid cards:
  - Card 1: Scale in at frame 40
  - Card 2: Scale in at frame 48
  - Card 3: Scale in at frame 56
  - Spacing: 8 frames between each

**Scene 3 & 5 (Visual Diagrams)**
- Person figure: Slides in from left (frame 0)
- Dependency/autonomy arrows: Fade in (frame 20-40)
- System box: Bounces in with scale (frame 40-60)
- Outward arrows: Staggered appearance (frames 50-70)

**Scene 6 (Radial Concept Map)**
- Title: Scales in (frame 0)
- Concepts (7 items):
  - Each concept drawn in sequence with line animation
  - Start frame: 60 + (index * 8)
  - Line drawing: Spring-based interpolation from center outward
  - Label appears after line reaches 70% completion
  - Label scales in with spring physics

### Color Usage
- Primary accent: `softOrange` (#d99670) for Consumer/dependency themes
- Secondary accent: `softGreen` (#8b9d7d) for Producer/autonomy themes
- Tertiary accent: `softBlue` (#7d9db8) for Autonomy concept map
- Text: `textDark` (#3a3530) for headlines, `textGray` (#6b5d52) for body

### Font Sizing (DM Sans)
- H1/Titles: 88-96px, weight 300-400
- H2/Section headers: 56-60px, weight 300
- Captions/Key concepts: 40px, weight 700 (bold)
- Body text: 24-32px, weight 500-600
- Small labels: 20-22px, weight 500-600
- Labels in diagrams: 32px, weight 700

### Common Patterns

**Compound Animation (Scale + Opacity + Transform)**
```typescript
<div
  style={{
    opacity: fadeIn(frame, 40, 20),
    transform: `scale(${scaleIn(frame, 40)}) translateY(${slideIn(frame, 30, 40)}px)`,
  }}
>
  {/* Content */}
</div>
```

**Staggered Grid Animation**
```typescript
{items.map((item, i) => (
  <div
    key={i}
    style={{
      opacity: fadeIn(frame, 40 + i * 8, 20),
      transform: `scale(${scaleIn(frame, 40 + i * 8)})`,
    }}
  >
    {/* Item content */}
  </div>
))}
```

### Line Drawing Animation
Used in Scene 6 for radial concept map:
- Interpolate line endpoint from center to edge
- Show endpoint dot only when line is 80%+ drawn
- Fade in label after line reaches 70% completion
- Label scales in with spring physics as line finishes

### Educational Best Practices Applied
1. **Cognitive Load Management**: Elements appear gradually, not all at once
2. **Visual Hierarchy**: Important items emphasize through size and timing
3. **Microlearning Format**: ~13s per scene, focused on 1-2 concepts
4. **Handcrafted Feel**: Spring physics over linear timing
5. **Clear Alignment**: All shapes aligned to grid, centered positioning
6. **Organic Motion**: Bouncy, smooth transitions feel more engaging

### Future Enhancements
- SVG path animations (line drawing)
- Text reveal animations (character by character)
- Particle effects for emphasis
- Morphing shapes (SVG path morphing)
- Background pattern animations (subtle parallax)

---

**Last Updated**: 2026-05-12
**Framework**: Remotion (React-based video framework)
**Target Audience**: Educational/microlearning
