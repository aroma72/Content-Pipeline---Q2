# Blender + Remotion Integration Guide

## Overview
Combine **Blender's 3D animation capabilities** with **Remotion's video composition** to create complex, professional educational videos.

---

## Quick Start

### 1. Install Blender (Free, Open-Source)

**Option A: Using Chocolatey (Recommended)**
```powershell
choco install blender
```

**Option B: Manual Download**
- Visit https://www.blender.org/download/
- Download Blender 4.0+ 
- Install to default location

**Verify Installation:**
```bash
blender --version
```

### 2. Create Blender 3D Assets

Blender scripts are located in: `./blender/`

**Available Scripts:**
- `measure_framework_3d.py` — 3D MEASURE framework animation

### 3. Render Blender Scene

```bash
node tools/blender-render.js measure_framework_3d.py
```

This will:
- Render the Blender scene
- Save MP4 to `./video_production/blender_renders/`
- Output ready for Remotion integration

---

## Workflow: Blender → Remotion Integration

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  1. Create/Edit Blender Scene (.blend file)             │
│  2. Run Python Script to Animate & Render               │
│  3. Output: MP4/Image Sequence                          │
│  4. Import into Remotion Composition                    │
│  5. Compose with other elements (text, graphics)        │
│  6. Final render via Remotion                           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Creating Custom Blender Scenes

### Structure of a Blender Python Script

```python
import bpy
import math

# 1. Clear scene and setup
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# 2. Configure scene
scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.fps = 30
scene.frame_end = 300  # Total frames

# 3. Create objects
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
cube = bpy.context.active_object

# 4. Add animation keyframes
cube.location = (0, 0, 0)
cube.keyframe_insert(data_path="location", frame=0)

cube.location = (5, 5, 0)
cube.keyframe_insert(data_path="location", frame=300)

# 5. Render
scene.render.filepath = "output.mp4"
bpy.ops.render.render(animation=True)
```

### Common Blender Tasks

**Create 3D Text:**
```python
bpy.ops.object.text_add(location=(0, 0, 0))
text_obj = bpy.context.active_object
text_obj.data.body = "MEASURE"
text_obj.data.size = 2
```

**Add Material/Color:**
```python
mat = bpy.data.materials.new(name="RedMaterial")
mat.use_nodes = True
mat.node_tree.nodes["Principled BSDF"].inputs[0].default_value = (1, 0, 0, 1)  # RGB
cube.data.materials.append(mat)
```

**Add Keyframe Animation:**
```python
obj.location = (0, 0, 0)
obj.keyframe_insert(data_path="location", frame=0)

obj.location = (10, 0, 0)
obj.keyframe_insert(data_path="location", frame=100)
```

**Render to MP4:**
```python
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.filepath = "output.mp4"
bpy.ops.render.render(animation=True)
```

---

## Integrating Blender Video into Remotion

### Step 1: Render Blender Scene to MP4

```bash
node tools/blender-render.js measure_framework_3d.py
```

Output: `video_production/blender_renders/measure_framework.mp4`

### Step 2: Import into Remotion Composition

In your Remotion TSX file:

```typescript
import { useVideoConfig, OffthreadVideo } from "remotion";

export const MyScene: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Background or other elements */}
      
      {/* Blender video - starts at frame 100, duration 360 frames */}
      <OffthreadVideo
        src="file:///absolute/path/to/measure_framework.mp4"
        startFrom={0}
        muted={false}
      />
      
      {/* Other Remotion elements on top */}
    </AbsoluteFill>
  );
};
```

### Step 3: Render Final Video

```bash
npx remotion render MyComposition output.mp4
```

---

## Rendering Optimization

### Faster Renders (Preview)
```bash
# Render at lower resolution for preview
scene.render.resolution_percentage = 50
```

### Quality Renders (Final)
```bash
# Full resolution, high samples
scene.render.resolution_percentage = 100
scene.cycles.samples = 256  # For Cycles render engine
```

### Command-Line Render
```bash
# Headless render (no UI)
blender -b scene.blend -P script.py --render-anim

# With custom output
blender -b scene.blend -o //tmp/frame_#### -F PNG -a
```

---

## Project Structure

```
Content Queen/
├── blender/                          # Blender scripts & scenes
│   ├── measure_framework_3d.py       # MEASURE framework animation
│   ├── character_animation.py        # Character 3D model
│   └── data_visualization.py         # 3D charts/graphs
│
├── video_production/
│   ├── blender_renders/              # Output from Blender
│   │   ├── measure_framework.mp4
│   │   ├── character.mp4
│   │   └── data_viz.mp4
│   │
│   └── systems_evaluations/
│       ├── video_1_STORYBOOK.mp4
│       ├── video_2_SchoolOfLife.mp4
│       └── video_3_with_3D.mp4       # Final composition with Blender assets
│
├── drawing-room-video/
│   └── drawing-room-remotion/src/
│       └── SystemsEvaluationsFinal.tsx  # Final composition with 3D + 2D
│
└── tools/
    └── blender-render.js             # Render automation
```

---

## Animation Ideas for Systems Evaluations

### Part 2 Enhancement: Testing vs Evaluation
- 3D cubes representing "test boxes" vs "evaluation boxes"
- Animated MEASURE letters rotating/building
- 3D data visualizations showing consequences

### Part 3: Real-World Examples
- 3D pie charts showing bias distribution
- 3D models of broken systems
- 3D timeline of evaluation phases

### Part 4: Framework Deep Dive
- 3D MEASURE framework expanding
- Each letter becomes a 3D object spinning into frame
- 3D interconnected network showing relationships

---

## Troubleshooting

### Blender not found
```bash
# Add Blender to PATH (Windows)
$env:PATH += ";C:\Program Files\Blender Foundation\Blender 4.0\bin"
blender --version
```

### Render is slow
- Lower resolution for preview: `scene.render.resolution_percentage = 25`
- Reduce samples in materials
- Use CPU render instead of GPU (faster for complex scenes)

### Video codec issues
```python
# Use H.264 instead of MPEG4
scene.render.image_settings.ffmpeg_codec = 'H264'
scene.render.ffmpeg_format = 'MPEG4'  # MP4 container
```

### Keyframes not animating
- Check frame_start and frame_end are correct
- Verify keyframes are inserted at correct frames
- Use Timeline view in Blender to debug

---

## Next Steps

1. ✅ Install Blender
2. ✅ Run the existing `measure_framework_3d.py` script
3. ✅ Review output video
4. ✅ Create custom animations for Parts 3 & 4
5. ✅ Integrate Blender videos into Remotion compositions
6. ✅ Add voiceover with ElevenLabs API
7. ✅ Final render and delivery

---

## Resources

- **Blender Official:** https://www.blender.org/
- **Blender Python API:** https://docs.blender.org/api/current/
- **Blender Tutorials:** https://www.blenderguru.com/
- **Remotion Docs:** https://www.remotion.dev/
- **3D Animation Learning:** https://www.youtube.com/c/BlenderDaily

---

## Questions?

For issues or questions about Blender + Remotion integration, check:
- Blender documentation
- Remotion documentation
- Test with simpler scripts first before complex animations
