"""
Blender Python Script - MEASURE Framework 3D Animation
This script creates an animated 3D visualization of the MEASURE framework
for the Systems Evaluations video.

Usage: blender -b -P measure_framework_3d.py
"""

import bpy
import math
from mathutils import Vector, Euler

# Clear default scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# ─── Scene Setup ───────────────────────────────────────────────────────────

scene = bpy.context.scene
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.fps = 30
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.image_settings.ffmpeg_codec = 'MPEG4'
scene.render.ffmpeg_format = 'MPEG4'

# Set animation frames (2 seconds per letter = 60 frames each, 7 letters = 420 frames)
scene.frame_start = 0
scene.frame_end = 420

# ─── Colors ────────────────────────────────────────────────────────────────

COLORS = {
    "soft_orange": (0.851, 0.588, 0.439, 1.0),      # #d99670
    "soft_red": (0.788, 0.439, 0.439, 1.0),         # #c97070
    "soft_green": (0.545, 0.616, 0.490, 1.0),       # #8b9d7d
    "soft_blue": (0.490, 0.616, 0.722, 1.0),        # #7d9db8
    "soft_purple": (0.616, 0.490, 0.722, 1.0),      # #9d7db8
    "cream": (0.929, 0.910, 0.875, 1.0),            # #ede8e0
    "beige": (0.831, 0.769, 0.690, 1.0),            # #d4c4b0
}

# ─── Camera ────────────────────────────────────────────────────────────────

camera = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
scene.collection.objects.link(camera)
scene.camera = camera
camera.location = (0, -20, 8)
camera.rotation_euler = (math.radians(70), 0, 0)

# ─── Lighting ──────────────────────────────────────────────────────────────

light = bpy.data.objects.new("Light", bpy.data.lights.new(name="Light", type='SUN'))
scene.collection.objects.link(light)
light.location = (10, 10, 20)
light.data.energy = 2.0

# ─── Create MEASURE Letters as 3D Objects ──────────────────────────────────

def create_material(name, color):
    """Create a material with given color"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs[0].default_value = color
    return mat

def create_text_object(text, location, color_key, rotation_y=0):
    """Create a 3D text object"""
    bpy.ops.object.text_add(location=location)
    text_obj = bpy.context.active_object
    text_obj.data.body = text
    text_obj.data.size = 2
    text_obj.data.font = None  # Default font
    text_obj.rotation_euler = (0, rotation_y, 0)

    # Apply material
    material = create_material(f"Mat_{text}", COLORS[color_key])
    text_obj.data.materials.append(material)

    return text_obj

def create_cube(location, size, color_key):
    """Create a cube for the framework boxes"""
    bpy.ops.mesh.primitive_cube_add(size=size, location=location)
    cube = bpy.context.active_object
    cube.name = f"Box_{location}"

    material = create_material(f"Mat_Box_{location}", COLORS[color_key])
    cube.data.materials.append(material)

    return cube

# ─── Create MEASURE Framework ──────────────────────────────────────────────

measure_items = [
    {"letter": "M", "word": "Metrics", "pos": (-6, 0, 0), "color": "soft_orange"},
    {"letter": "E", "word": "Equity", "pos": (-4, 0, 0), "color": "soft_red"},
    {"letter": "A", "word": "Accuracy", "pos": (-2, 0, 0), "color": "soft_green"},
    {"letter": "S", "word": "Safety", "pos": (0, 0, 0), "color": "soft_blue"},
    {"letter": "U", "word": "Usability", "pos": (2, 0, 0), "color": "soft_purple"},
    {"letter": "R", "word": "Reliability", "pos": (4, 0, 0), "color": "soft_orange"},
    {"letter": "E", "word": "Ethics", "pos": (6, 0, 0), "color": "soft_red"},
]

text_objects = []
for idx, item in enumerate(measure_items):
    # Create cube background
    cube = create_cube(item["pos"], 1.2, item["color"])

    # Create letter text
    letter_obj = create_text_object(item["letter"], item["pos"], item["color"])
    text_objects.append(letter_obj)

    # Add scale animation (starts small, scales up)
    letter_obj.scale = (0.1, 0.1, 0.1)
    letter_obj.keyframe_insert(data_path="scale", frame=int(idx * 60))

    letter_obj.scale = (1, 1, 1)
    letter_obj.keyframe_insert(data_path="scale", frame=int(idx * 60 + 30))

# ─── Add rotation animation to all ──────────────────────────────────────────

for text_obj in text_objects:
    # Keyframe at start: no rotation
    text_obj.rotation_euler = (0, 0, 0)
    text_obj.keyframe_insert(data_path="rotation_euler", frame=0)

    # Keyframe at end: 360 degree rotation
    text_obj.rotation_euler = (0, math.radians(360), 0)
    text_obj.keyframe_insert(data_path="rotation_euler", frame=420)

# ─── Render Settings ────────────────────────────────────────────────────────

scene.render.filepath = "C:\\Users\\Aroma Tahir\\Downloads\\Content Queen\\blender\\output\\measure_framework.mp4"

# Create output directory if it doesn't exist
import os
output_dir = os.path.dirname(scene.render.filepath)
os.makedirs(output_dir, exist_ok=True)

print(f"Blender scene created. Render output: {scene.render.filepath}")
print(f"Total frames: {scene.frame_end - scene.frame_start}")
print("To render: blender -b -P measure_framework_3d.py --render-anim")
