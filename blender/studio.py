"""Blender Cycles studio for the article images: Code on the left, Tripo API on the right, the same light for both.

Models: route-a/glb/<asset>.glb (the Code module exported by export_code_glb.js) and route-b/<asset>.glb (Tripo API).
Run:  blender -b --factory-startup -P blender/studio.py -- <asset> <hero|card> [samples]
Writes renders/blender/<mode>-<asset>.png and a .json with the screen x of each plinth (for the labels).
"""
import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if ARGS and ARGS[0].startswith("--"):  # imported by batch.py, which takes flags
    ARGS = []
ASSET = ARGS[0] if ARGS else "06-golem"
MODE = ARGS[1] if len(ARGS) > 1 else "hero"
SAMPLES = int(ARGS[2]) if len(ARGS) > 2 else 256
OUT = os.path.join(ROOT, "renders", "blender")
os.makedirs(OUT, exist_ok=True)

GAP = 1.05          # plinth centers at x = -GAP (Code) and +GAP (Tripo API)
PLINTH_R, PLINTH_H = 0.62, 0.09
HEIGHT, MAX_W = 1.3, 1.12
YAW = math.radians(20)
EXPOSURE = float(os.environ.get("STUDIO_EXPOSURE", "-0.7"))
ACCENT = {"code": (1.0, 0.56, 0.16), "tripo": (0.27, 0.62, 1.0)}


def gpu(scene):
    prefs = bpy.context.preferences
    prefs.filepaths.temporary_directory = os.environ.get("BLENDER_TMP", os.path.join(__import__("tempfile").gettempdir(), "blender_tmp") + os.sep)
    cp = prefs.addons["cycles"].preferences
    cp.compute_device_type = "OPTIX"
    cp.get_devices()
    for d in cp.devices:
        d.use = d.type == "OPTIX"
    scene.render.engine = "CYCLES"
    scene.cycles.device = "GPU"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPTIX"
    scene.cycles.max_bounces = 8
    scene.cycles.transparent_max_bounces = 16


def mat(name, color, rough=0.5, metal=0.0, coat=0.0, emit=None, estr=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.08
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = estr
    return m


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def aim(o, target):
    d = Vector(target) - o.location
    o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def area(name, loc, target, size, power, color=(1, 1, 1), size_y=None):
    d = bpy.data.lights.new(name, "AREA")
    d.energy, d.color = power, color
    if size_y:
        d.shape, d.size, d.size_y = "RECTANGLE", size, size_y
    else:
        d.size = size
    o = link(bpy.data.objects.new(name, d))
    o.location = loc
    aim(o, target)
    o.visible_glossy = False  # no hot softbox reflections in the floor
    return o


def spot(name, loc, target, power, angle, blend, color=(1, 0.93, 0.85)):
    d = bpy.data.lights.new(name, "SPOT")
    d.energy, d.color, d.spot_size, d.spot_blend, d.shadow_soft_size = power, color, angle, blend, 0.35
    o = link(bpy.data.objects.new(name, d))
    o.location = loc
    aim(o, target)
    return o


def cyclorama():
    """Floor that curves up into a back wall, no horizon line."""
    prof = [(y, 0.0) for y in (-14, -6, 0, 3)]
    r = 4.0
    for i in range(1, 17):
        a = math.pi / 2 * i / 16
        prof.append((3 + r * math.sin(a), r - r * math.cos(a)))
    prof += [(7.0, 9.0), (7.0, 16.0)]
    verts, faces = [], []
    for x in (-20, 20):
        verts += [(x, y, z) for y, z in prof]
    n = len(prof)
    for i in range(n - 1):
        faces.append((i, i + 1, n + i + 1, n + i))
    me = bpy.data.meshes.new("cyc")
    me.from_pydata(verts, [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    o = link(bpy.data.objects.new("cyclorama", me))
    m = mat("cyc", (0.011, 0.012, 0.014), rough=0.26)
    # a little roughness break-up so the floor reflections stay soft
    nt = m.node_tree
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.0
    rmp = nt.nodes.new("ShaderNodeMapRange")
    rmp.inputs["To Min"].default_value, rmp.inputs["To Max"].default_value = 0.18, 0.34
    nt.links.new(noise.outputs["Fac"], rmp.inputs["Value"])
    nt.links.new(rmp.outputs["Result"], nt.nodes["Principled BSDF"].inputs["Roughness"])
    o.data.materials.append(m)
    return o


def plinth(x, accent):
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=PLINTH_R, depth=PLINTH_H, location=(x, 0, PLINTH_H / 2))
    p = bpy.context.active_object
    bev = p.modifiers.new("bevel", "BEVEL")
    bev.width, bev.segments = 0.014, 4
    bpy.ops.object.shade_smooth()
    p.data.materials.append(mat("plinth", (0.016, 0.017, 0.02), rough=0.22, coat=0.6))
    bpy.ops.mesh.primitive_torus_add(major_radius=PLINTH_R + 0.003, minor_radius=0.0042, major_segments=192, minor_segments=12, location=(x, 0, PLINTH_H * 0.5))
    ring = bpy.context.active_object
    ring.data.materials.append(mat("rim", (0, 0, 0), emit=accent, estr=14.0))
    return p


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    # the glTF importer adds an icosphere as the display shape for bones: not part of the model
    shapes = {pb.custom_shape for o in new if o.type == "ARMATURE" for pb in o.pose.bones if pb.custom_shape}
    for sh in shapes:
        sh.hide_render = True
        sh.hide_viewport = True
    pivot = link(bpy.data.objects.new(os.path.basename(path), None))
    for o in new:
        if o.parent is None and o not in shapes:
            o.parent = pivot
    return pivot, [o for o in new if o.type == "MESH" and o not in shapes]


def world_bounds(meshes):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx


def place(path, x, turn, yaw=None):
    pivot, meshes = import_glb(path)
    pivot.rotation_euler = (0, 0, turn + (YAW if yaw is None else yaw))
    mn, mx = world_bounds(meshes)
    size = mx - mn
    s = min(HEIGHT / size.z, MAX_W / size.x)
    pivot.scale = (s, s, s)
    mn, mx = world_bounds(meshes)
    c = (mn + mx) / 2
    pivot.location += Vector((x - c.x, -c.y, PLINTH_H - mn.z))
    for o in meshes:
        o.visible_shadow = True
        use_vertex_colors(o)
    return pivot


def use_vertex_colors(o):
    """three.js multiplies COLOR_0 into the base colour; the glTF importer leaves it unplugged. Plug it in."""
    attrs = o.data.color_attributes
    if not attrs:
        return
    name = attrs[0].name
    for m in o.data.materials:
        if not m or not m.use_nodes:
            continue
        nt = m.node_tree
        b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not b or b.inputs["Base Color"].is_linked and any(l.from_node.type == "VERTEX_COLOR" for l in b.inputs["Base Color"].links):
            continue
        vc = nt.nodes.new("ShaderNodeVertexColor")
        vc.layer_name = name
        mul = nt.nodes.new("ShaderNodeMix")
        mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
        mul.inputs["Factor"].default_value = 1.0
        if b.inputs["Base Color"].is_linked:
            nt.links.new(b.inputs["Base Color"].links[0].from_socket, mul.inputs["A"])
        else:
            mul.inputs["A"].default_value = b.inputs["Base Color"].default_value
        nt.links.new(vc.outputs["Color"], mul.inputs["B"])
        nt.links.new(mul.outputs["Result"], b.inputs["Base Color"])


def build(code_glb=None, tripo_glb=None, yaw=None, fps=30):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = fps  # before the imports: glTF animation times are converted at this rate
    gpu(scene)
    scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = EXPOSURE
    scene.render.film_transparent = False

    world = bpy.data.worlds.new("w")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.006, 0.0065, 0.008, 1)

    cyclorama()
    plinth(-GAP, ACCENT["code"])
    plinth(GAP, ACCENT["tripo"])
    # Code modules face +Z in three.js = -Y in Blender; Tripo exports X-forward = +X in Blender
    code_glb = code_glb or os.path.join(ROOT, "route-a", "glb", f"{ASSET}.glb")
    tripo_glb = tripo_glb or os.path.join(ROOT, "route-b", f"{ASSET}.glb")
    pivots = [place(code_glb, -GAP, 0.0, yaw), place(tripo_glb, GAP, -math.pi / 2, yaw)]

    tgt = (0, 0, 0.72)
    # key: a small warm softbox high on the left, so the forms read and the floor stays dark
    area("key", (-2.6, -3.2, 3.9), tgt, 1.6, 680, (1.0, 0.9, 0.78))
    area("fill", (3.6, -4.6, 1.5), tgt, 3.0, 140, (0.8, 0.88, 1.0))
    # strip lights behind each model draw the silhouette
    area("rimL", (-2.2, 2.2, 2.3), (-GAP, 0, 0.9), 0.25, 900, (0.68, 0.8, 1.0), size_y=2.6)
    area("rimR", (2.2, 2.2, 2.3), (GAP, 0, 0.9), 0.25, 900, (0.68, 0.8, 1.0), size_y=2.6)
    # a faint glow on the back wall for depth
    area("wall", (0, 5.0, 0.3), (0, 7.2, 3.0), 5.0, 55, (0.5, 0.58, 0.78))
    for x in (-GAP, GAP):
        spot(f"pool{x}", (x, -0.5, 5.4), (x, 0, 0), 1100, math.radians(24), 1.0)

    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 70
    cam_data.dof.use_dof = True
    cam_data.dof.aperture_fstop = 3.2
    cam = link(bpy.data.objects.new("cam", cam_data))
    cam.location = (0, -8.6, 1.55)
    aim(cam, (0, 0, 0.74))
    cam_data.dof.focus_distance = (Vector((0, 0, 0.7)) - cam.location).length
    if MODE == "card":
        cam_data.lens = 60
        cam_data.shift_x = -0.11  # leave the left column of the card free
    scene.camera = cam
    return scene, cam, pivots


def label_x(scene, cam):
    bpy.context.view_layer.update()  # the camera matrix is stale until the depsgraph runs
    return [world_to_camera_view(scene, cam, Vector((x, 0, 0))).x * scene.render.resolution_x for x in (-GAP, GAP)]


if __name__ == "__main__":
    scene, cam, _ = build()
    png = os.path.join(OUT, f"{MODE}-{ASSET}.png")
    scene.render.filepath = png
    bpy.ops.render.render(write_still=True)
    xs = label_x(scene, cam)
    with open(png.replace(".png", ".json"), "w") as f:
        json.dump({"asset": ASSET, "mode": MODE, "label_x": xs}, f)
    print("saved", png, xs)
