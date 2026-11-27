"""Web copy of a .glb: every embedded texture scaled down to at most MAX px, geometry and everything else untouched.

    python lib/shrink_glb.py in.glb out.glb [max_px] [--webp]

--webp re-encodes every image as WebP (EXT_texture_webp, which three's GLTFLoader reads): colour and
metal/roughness at quality 88, normal maps at 94, where block artefacts would show in the lighting.

GLB = 12-byte header, a JSON chunk, a BIN chunk. Images live in bufferViews; this rewrites those views and
re-packs the BIN chunk with 4-byte alignment, updating byteOffset / byteLength. Accessors keep their view indices.
"""
import io
import json
import struct
import sys

from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith("--")]
WEBP = "--webp" in sys.argv
src, dst = args[0], args[1]
MAX = int(args[2]) if len(args) > 2 else 1024

data = open(src, "rb").read()
magic, version, _ = struct.unpack_from("<III", data, 0)
assert magic == 0x46546C67, "not a glb"
off, gltf, binc = 12, None, b""
while off < len(data):
    length, ctype = struct.unpack_from("<II", data, off)
    chunk = data[off + 8: off + 8 + length]
    if ctype == 0x4E4F534A:
        gltf = json.loads(chunk)
    elif ctype == 0x004E4942:
        binc = chunk
    off += 8 + length

views = gltf.get("bufferViews", [])
blobs = [binc[v.get("byteOffset", 0): v.get("byteOffset", 0) + v["byteLength"]] for v in views]
# images used as normal maps get a higher WebP quality
normal_images = set()
for m in gltf.get("materials", []):
    t = m.get("normalTexture")
    if t is not None:
        normal_images.add(gltf["textures"][t["index"]].get("source"))

webp_images = set()
for n, img in enumerate(gltf.get("images", [])):
    if "bufferView" not in img:
        continue
    i = img["bufferView"]
    im = Image.open(io.BytesIO(blobs[i]))
    big = max(im.size) > MAX
    if not big and not WEBP:
        continue
    if big:
        s = MAX / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    out = io.BytesIO()
    if WEBP:
        im = im if im.mode in ("RGB", "RGBA") else im.convert("RGBA" if "A" in im.getbands() else "RGB")
        im.save(out, "WEBP", quality=94 if n in normal_images else 88, method=6)
        img["mimeType"] = "image/webp"
        webp_images.add(n)
    elif img.get("mimeType") == "image/png":
        im.save(out, "PNG", optimize=True)
    else:
        im.convert("RGB").save(out, "JPEG", quality=88, optimize=True)
    blobs[i] = out.getvalue()

if webp_images:
    for t in gltf.get("textures", []):
        if t.get("source") in webp_images:
            t.setdefault("extensions", {})["EXT_texture_webp"] = {"source": t.pop("source")}
    for key in ("extensionsUsed", "extensionsRequired"):
        gltf[key] = sorted(set(gltf.get(key, [])) | {"EXT_texture_webp"})

packed = b""
for v, b in zip(views, blobs):
    packed += b"\0" * ((-len(packed)) % 4)
    v["byteOffset"] = len(packed)
    v["byteLength"] = len(b)
    packed += b
packed += b"\0" * ((-len(packed)) % 4)
gltf["buffers"][0]["byteLength"] = len(packed)

js = json.dumps(gltf, separators=(",", ":")).encode()
js += b" " * ((-len(js)) % 4)
out = struct.pack("<III", magic, version, 12 + 8 + len(js) + 8 + len(packed))
out += struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(packed), 0x004E4942) + packed
open(dst, "wb").write(out)
print(f"{src}: {len(data) / 1e6:.1f} MB -> {len(out) / 1e6:.1f} MB")
