"""Many studio renders in one Blender run, for a rented GPU box (3d/cloud/runpod.py + box.sh).

  blender -b --factory-startup -P blender/batch.py -- --out <dir> --jobs card:07-chest,turn:07-chest,... \
      [--card-samples 256] [--turn-samples 96] [--frames 60] [--degrees 50]

card:<asset>  one still in the card framing      -> <out>/card-<asset>/f_0001.png
hero:<asset>  one still in the hero framing      -> <out>/hero-<asset>/f_0001.png
turn:<asset>  the pair turning, hero framing      -> <out>/turn-<asset>/f_####.png
Frames are named f_*.png so box.sh / runpod.py pull them back.
"""
import argparse
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import studio as S  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--jobs", required=True)
ap.add_argument("--card-samples", type=int, default=256)
ap.add_argument("--turn-samples", type=int, default=96)
ap.add_argument("--frames", type=int, default=60)
ap.add_argument("--degrees", type=float, default=50)
a = ap.parse_args(argv)


def linear(pivot):
    act = pivot.animation_data.action
    curves = list(act.fcurves) if hasattr(act, "fcurves") else [
        fc for layer in act.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"


for job in a.jobs.split(","):
    kind, asset = job.split(":")
    S.ASSET = asset
    out = os.path.join(a.out, f"{kind}-{asset}")
    os.makedirs(out, exist_ok=True)
    if kind in ("card", "hero"):
        S.MODE, S.SAMPLES = kind, a.card_samples
        scene, cam, _ = S.build()
        scene.render.filepath = os.path.join(out, "f_0001.png")
        bpy.ops.render.render(write_still=True)
    elif kind == "turn":
        S.MODE, S.SAMPLES = "hero", a.turn_samples
        scene, cam, pivots = S.build(yaw=math.radians(-20))
        scene.frame_start, scene.frame_end = 1, a.frames
        scene.render.use_motion_blur = True
        scene.render.motion_blur_shutter = 0.4
        for p in pivots:
            z = p.rotation_euler.z
            p.keyframe_insert("rotation_euler", index=2, frame=1)
            p.rotation_euler.z = z + math.radians(a.degrees)
            p.keyframe_insert("rotation_euler", index=2, frame=a.frames)
            linear(p)
        scene.render.filepath = os.path.join(out, "f_")
        scene.render.image_settings.file_format = "PNG"
        bpy.ops.render.render(animation=True)
    print(f"rendered in batch: {job}", flush=True)
