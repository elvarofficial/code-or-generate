"""The golem walk test in the Blender studio: Code on the left, Tripo API on the right, same side-on camera.

Code:      route-a/glb/06-golem-walk.glb  (bake_code_walk.js: the coded walk, sampled at 30 fps, 4 strides = 5.2 s)
Tripo API: route-b/06-golem-walk.glb      (rig + retarget preset:walk, 2.37 s clip, looped)
Run:  blender -b --factory-startup -P blender/walk.py -- [samples] [frames]
Writes renders/blender/walk/####.png and walk.json (label positions).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import studio as S  # noqa: E402

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SAMPLES = int(ARGS[0]) if ARGS else 96
FRAMES = int(ARGS[1]) if len(ARGS) > 1 else 156  # 5.2 s at 30 fps
OUT = os.path.join(S.ROOT, "renders", "blender", "walk")
os.makedirs(OUT, exist_ok=True)

S.SAMPLES = SAMPLES
# both face image-left: the camera sees each golem's own left side
scene, cam, pivots = S.build(
    os.path.join(S.ROOT, "route-a", "glb", "06-golem-walk.glb"),
    os.path.join(S.ROOT, "route-b", "06-golem-walk.glb"),
    yaw=-math.pi / 2,
)
scene.frame_start, scene.frame_end = 1, FRAMES
# the golems turn their side to the camera: a soft fill from the lens side keeps the darker bronze readable
S.area("walkfill", (0.4, -6.5, 1.6), (0, 0, 0.7), 3.5, 160, (0.9, 0.93, 1.0))
scene.render.use_motion_blur = True
scene.render.motion_blur_shutter = 0.4


def objects_under(p):
    out, stack = [], [p]
    while stack:
        o = stack.pop()
        out.append(o)
        stack += list(o.children)
    return out


# Tripo: play the walk clip on the armature, repeated past the last frame
# the Code golem's baked clip is also called "walk": take the one made for an armature
walk = next((a for a in bpy.data.actions if a.name.lower().startswith("walk") and any(sl.identifier == "OBArmature" for sl in getattr(a, "slots", []))), None)
for o in objects_under(pivots[1]):
    if o.type == "ARMATURE" and walk:
        ad = o.animation_data or o.animation_data_create()
        for t in list(ad.nla_tracks):
            ad.nla_tracks.remove(t)
        ad.action = None
        track = ad.nla_tracks.new()
        strip = track.strips.new("walk", 1, walk)
        if hasattr(strip, "action_slot") and getattr(walk, "slots", None):
            strip.action_slot = walk.slots[0]
        length = walk.frame_range[1] - walk.frame_range[0]
        strip.action_frame_start, strip.action_frame_end = walk.frame_range[0], walk.frame_range[1]
        strip.repeat = math.ceil(FRAMES / length) + 1
        print("tripo walk:", walk.name, "length", length, "repeat", strip.repeat, "strip", strip.frame_start, strip.frame_end)

scene.render.filepath = os.path.join(OUT, "####")
scene.render.image_settings.file_format = "PNG"
with open(os.path.join(OUT, "walk.json"), "w") as f:
    json.dump({"label_x": S.label_x(scene, cam), "frames": FRAMES}, f)
bpy.ops.render.render(animation=True)
print("walk frames done")
