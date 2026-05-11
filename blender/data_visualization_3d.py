"""
Blender Python Script - 3D Data Visualization
Creates animated 3D pie chart and data visualization for evaluation metrics

Usage: blender -b -P data_visualization_3d.py --render-anim
"""

import bpy
import math
from mathutils import Vector, Matrix

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Scene setup
scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.fps = 30
scene.frame_end = 300  # 10 seconds

# Camera
camera = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
scene.collection.objects.link(camera)
scene.camera = camera
camera.location = (0, -20, 5)
camera.rotation_euler = (math.radians(60), 0, 0)

# Lighting
light = bpy.data.objects.new("Light", bpy.data.lights.new(name="Light", type='SUN'))
scene.collection.objects.link(light)
light.location = (20, 20, 30)
light.data.energy = 3.0

# Create materials
def create_material(name, color):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs[0].default_value = color
    bsdf.inputs[26].default_value = 0.3
    return mat

# Colors for different metrics
metric_colors = [
    (0.851, 0.588, 0.439, 1.0),  # Orange - Metrics
    (0.788, 0.439, 0.439, 1.0),  # Red - Equity
    (0.545, 0.616, 0.490, 1.0),  # Green - Accuracy
    (0.490, 0.616, 0.722, 1.0),  # Blue - Safety
    (0.616, 0.490, 0.722, 1.0),  # Purple - Usability
]

# Create 3D pie chart (wedges as cubes)
metrics = ["Metrics", "Equity", "Accuracy", "Safety", "Usability"]
slices = [25, 20, 25, 15, 15]  # Percentages
total = sum(slices)

start_angle = 0
for idx, (metric, slice_val, color) in enumerate(zip(metrics, slices, metric_colors)):
    angle = (slice_val / total) * 360
    mid_angle = math.radians(start_angle + angle / 2)

    # Create cylinder for pie slice
    bpy.ops.mesh.primitive_cylinder_add(
        radius=3,
        depth=1,
        location=(0, 0, 0)
    )
    slice_obj = bpy.context.active_object
    slice_obj.name = f"Slice_{metric}"

    # Apply material
    mat = create_material(f"Mat_{metric}", color)
    slice_obj.data.materials.append(mat)

    # Animate scale
    slice_obj.scale = (0.1, 0.1, 0.1)
    slice_obj.keyframe_insert(data_path="scale", frame=0)
    slice_obj.scale = (1, 1, 1)
    slice_obj.keyframe_insert(data_path="scale", frame=60 + idx * 30)

    # Animate rotation
    slice_obj.rotation_euler = (0, 0, 0)
    slice_obj.keyframe_insert(data_path="rotation_euler", frame=0)
    slice_obj.rotation_euler = (0, 0, math.radians(360))
    slice_obj.keyframe_insert(data_path="rotation_euler", frame=300)

    start_angle += angle

# Create vertical bars showing evaluation phases
phases = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"]
heights = [0.8, 1.2, 1.8, 2.0]

for idx, (phase, height) in enumerate(zip(phases, heights)):
    x_pos = -4 + idx * 2.5

    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(x_pos, 5, height/2)
    )
    bar = bpy.context.active_object
    bar.scale = (0.7, 1.2, height)
    bar.name = f"Bar_{phase}"

    mat = create_material(f"Mat_{phase}", metric_colors[idx % len(metric_colors)])
    bar.data.materials.append(mat)

    # Animate height
    bar.scale = (0.7, 1.2, 0.1)
    bar.keyframe_insert(data_path="scale", frame=0)
    bar.scale = (0.7, 1.2, height)
    bar.keyframe_insert(data_path="scale", frame=150 + idx * 25)

# Add text labels
for idx, metric in enumerate(metrics):
    angle = (idx / len(metrics)) * 2 * math.pi
    label_x = 4 * math.cos(angle)
    label_y = 4 * math.sin(angle)

    bpy.ops.object.text_add(location=(label_x, label_y, 1.5))
    text_obj = bpy.context.active_object
    text_obj.data.body = metric
    text_obj.data.size = 0.5
    text_obj.name = f"Label_{metric}"

    mat = create_material(f"MatLabel_{metric}", metric_colors[idx])
    text_obj.data.materials.append(mat)

# Render settings
scene.render.filepath = "C:\\Users\\Aroma Tahir\\Downloads\\Content Queen\\blender\\output\\data_visualization.mp4"
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.image_settings.ffmpeg_codec = 'MPEG4'

import os
os.makedirs(os.path.dirname(scene.render.filepath), exist_ok=True)

print(f"✅ Data visualization scene ready")
print(f"   Output: {scene.render.filepath}")
print(f"   Duration: {scene.frame_end / scene.render.fps}s")
