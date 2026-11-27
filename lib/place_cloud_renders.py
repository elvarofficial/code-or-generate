"""Move renders pulled from a RunPod box into the places hero.js and compose_video.js read them from.

  python lib/place_cloud_renders.py [asset ...]     (default: every folder in renders/blender/cloud)

card-<asset>/f_0001.png  -> renders/blender/card-<asset>.png + .json
hero-<asset>/f_0001.png  -> renders/blender/hero-<asset>.png + .json
turn-<asset>/f_####.png  -> renders/blender/turn/<asset>/####.png + turn.json
The label positions come from the crate card and the golem hero: every render uses the same camera.
"""
import json
import os
import shutil
import sys

R = "renders/blender"
card_meta = json.load(open(f"{R}/card-01-crate.json"))
hero_meta = json.load(open(f"{R}/hero-06-golem.json"))
only = set(sys.argv[1:])
done = []
for d in sorted(os.listdir(f"{R}/cloud")):
    kind, asset = d.split("-", 1)
    if only and asset not in only:
        continue
    src = f"{R}/cloud/{d}"
    if kind in ("card", "hero"):
        if not os.path.exists(f"{src}/f_0001.png"):
            continue
        meta = card_meta if kind == "card" else hero_meta
        shutil.copyfile(f"{src}/f_0001.png", f"{R}/{kind}-{asset}.png")
        json.dump({"asset": asset, "mode": kind, "label_x": meta["label_x"]}, open(f"{R}/{kind}-{asset}.json", "w"))
        done.append(d)
    elif kind == "turn":
        frames = sorted(f for f in os.listdir(src) if f.startswith("f_"))
        dst = f"{R}/turn/{asset}"
        os.makedirs(dst, exist_ok=True)
        for f in frames:
            shutil.copyfile(f"{src}/{f}", f"{dst}/{f[2:]}")
        json.dump({"asset": asset, "label_x": hero_meta["label_x"], "frames": len(frames)}, open(f"{dst}/turn.json", "w"))
        done.append(f"{d} ({len(frames)} frames)")
print("\n".join(done))
