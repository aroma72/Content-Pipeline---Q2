"""
Blender Python Script - 3D Bias Visualization
Shows how bias affects different groups in an AI system

Usage: blender -b -P bias_visualization_3d.py --render-anim
"""

import bpy
import math
from mathutils import Vector

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Scene setup
scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.fps = 30
scene.frame_end = 360  # 12 seconds

# Camera
camera = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
scene.collection.objects.link(camera)
scene.camera = camera
camera.location = (0, -25, 8)
camera.rotation_euler = (math.radians(65), 0, 0)

# Lighting
light = bpy.data.objects.new("Light", bpy.data.lights.new(name="Light", type='SUN'))
scene.collection.objects.link(light)
light.location = (15, 15, 25)
light.data.energy = 2.5

# Colors
colors = {
    "group_a": (0.2, 0.7, 0.3, 1.0),   # Green - treated fairly
    "group_b": (0.9, 0.2, 0.2, 1.0),   # Red - treated unfairly (bias)
    "neutral": (0.7, 0.7, 0.7, 1.0),   # Gray
}

def create_material(name, color):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs[0].default_value = color
    mat.node_tree.nodes["Principled BSDF"].inputs[26].default_value = 0.5  # Roughness
    return mat

# Create 3D bars showing bias
# Group A: Fair treatment
for i in range(5):
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(-8 + i*2.5, 0, 1)
    )
    bar = bpy.context.active_object
    bar.scale = (0.9, 0.9, 1.5)
    bar.name = f"GroupA_{i}"

    mat = create_material(f"MatA_{i}", colors["group_a"])
    bar.data.materials.append(mat)

    # Scale animation
    bar.scale = (0.9, 0.9, 0.1)
    bar.keyframe_insert(data_path="scale", frame=0)
    bar.scale = (0.9, 0.9, 1.5)
    bar.keyframe_insert(data_path="scale", frame=60 + i*20)

# Group B: Biased treatment
for i in range(5):
    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=(3 + i*2.5, 0, 1)
    )
    bar = bpy.context.active_object
    bar.scale = (0.9, 0.9, 0.3)  # Much shorter - showing bias
    bar.name = f"GroupB_{i}"

    mat = create_material(f"MatB_{i}", colors["group_b"])
    bar.data.materials.append(mat)

    # Scale animation
    bar.scale = (0.9, 0.9, 0.1)
    bar.keyframe_insert(data_path="scale", frame=0)
    bar.scale = (0.9, 0.9, 0.3)
    bar.keyframe_insert(data_path="scale", frame=60 + i*20)

# Add labels (text objects)
bpy.ops.object.text_add(location=(-4, 3, 0))
label_a = bpy.context.active_object
label_a.data.body = "Fair"
label_a.data.size = 1

bpy.ops.object.text_add(location=(10, 3, 0))
label_b = bpy.context.active_object
label_b.data.body = "Biased"
label_b.data.size = 1

mat_fair = create_material("MatLabel_Fair", colors["group_a"])
label_a.data.materials.append(mat_fair)

mat_biased = create_material("MatLabel_Biased", colors["group_b"])
label_b.data.materials.append(mat_biased)

# Render settings
scene.render.filepath = "C:\\Users\\Aroma Tahir\\Downloads\\Content Queen\\blender\\output\\bias_visualization.mp4"
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.image_settings.ffmpeg_codec = 'MPEG4'

# Create output directory
import os
os.makedirs(os.path.dirname(scene.render.filepath), exist_ok=True)

print(f"✅ Bias visualization scene ready")
print(f"   Output: {scene.render.filepath}")
print(f"   Frames: {scene.frame_end}")
print(f"   Duration: {scene.frame_end / scene.render.fps}s")
