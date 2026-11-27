"""Turntable for the reel: one asset, Code and Tripo API turning together on their plinths in the studio.

Run:  blender -b --factory-startup -P blender/turntable.py -- <asset> [samples] [frames] [degrees]
Writes renders/blender/turn/<asset>/####.png and turn.json (label positions).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import studio as S  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ASSET = ARGS[0] if ARGS else "06-golem"
S.SAMPLES = int(ARGS[1]) if len(ARGS) > 1 else 96
FRAMES = int(ARGS[2]) if len(ARGS) > 2 else 90
DEGREES = float(ARGS[3]) if len(ARGS) > 3 else 70
OUT = os.path.join(S.ROOT, "renders", "blender", "turn", ASSET)
os.makedirs(OUT, exist_ok=True)

start = math.radians(-20)
scene, cam, pivots = S.build(yaw=start)
scene.frame_start, scene.frame_end = 1, FRAMES
scene.render.use_motion_blur = True
scene.render.motion_blur_shutter = 0.4
for p in pivots:
    base = p.rotation_euler.z
    p.rotation_euler.z = base
    p.keyframe_insert("rotation_euler", index=2, frame=1)
    p.rotation_euler.z = base + math.radians(DEGREES)
    p.keyframe_insert("rotation_euler", index=2, frame=FRAMES)
    # constant speed: the reel cuts mid-turn, an ease would read as a stop
    ad = p.animation_data
    act = ad.action
    curves = []
    if hasattr(act, "fcurves"):
        curves = list(act.fcurves)
    else:
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    curves += list(bag.fcurves)
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"

scene.render.filepath = os.path.join(OUT, "####")
scene.render.image_settings.file_format = "PNG"
with open(os.path.join(OUT, "turn.json"), "w") as f:
    json.dump({"asset": ASSET, "label_x": S.label_x(scene, cam), "frames": FRAMES}, f)
bpy.ops.render.render(animation=True)
print("turn frames done", ASSET)
