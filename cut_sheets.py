"""Step 1: cut each turnaround sheet in sheets/ into three square images.

assets/<asset>/front.png, left.png, back.png
Asset centered, same scale in all three, white background.
Run: python cut_sheets.py
"""
import glob
import os

from PIL import Image, ImageDraw

SIDE = 1024      # output size in px
MARGIN = 0.06    # white margin around the largest view, share of the square
VIEWS = ["front", "left", "back"]

# Convention for left.png: the camera sits on the object's own left, so the object faces
# image-left. The image model drew the lantern and the wolf from the other side (facing
# image-right), so their side view is mirrored. An orthographic silhouette seen from the
# opposite side is an exact mirror image, so the silhouette match is not affected.
MIRROR_LEFT = {"02-lantern", "05-wolf", "12-shield", "19-slime", "24-goblin"}


def clean_background(im, level=238):
    """Turn the near-white area connected to the borders into pure white.

    Near-white pixels inside the object (glass, highlights) are left as they are."""
    im = im.convert("RGB")
    near_white = im.convert("L").point(lambda v: 255 if v >= level else 0)
    w, h = im.size
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if near_white.getpixel(seed) == 255:
            ImageDraw.floodfill(near_white, seed, 128)
    background = near_white.point(lambda v: 255 if v == 128 else 0)
    white = Image.new("RGB", im.size, (255, 255, 255))
    return Image.composite(white, im, background)


def column_runs(mask_cols):
    runs, start = [], None
    for x, on in enumerate(mask_cols):
        if on and start is None:
            start = x
        if not on and start is not None:
            runs.append([start, x])
            start = None
    if start is not None:
        runs.append([start, len(mask_cols)])
    return runs


def split_three(im):
    w, h = im.size
    px = im.load()
    cols = [any(px[x, y] != (255, 255, 255) for y in range(0, h, 2)) for x in range(w)]
    runs = column_runs(cols)
    # merge runs across the smallest gaps until three panels remain
    while len(runs) > 3:
        gaps = [(runs[i + 1][0] - runs[i][1], i) for i in range(len(runs) - 1)]
        _, i = min(gaps)
        runs[i] = [runs[i][0], runs[i + 1][1]]
        del runs[i + 1]
    if len(runs) != 3:
        raise ValueError(f"found {len(runs)} panels")
    boxes = []
    for x0, x1 in runs:
        panel = im.crop((x0, 0, x1, h))
        inv = Image.eval(panel.convert("L"), lambda v: 255 if v < 255 else 0)
        bx = inv.getbbox()
        boxes.append((x0 + bx[0], bx[1], x0 + bx[2], bx[3]))
    return boxes


def main():
    import sys
    only = sys.argv[1:]
    for sheet in sorted(glob.glob("sheets/*.png")):
        if only and os.path.splitext(os.path.basename(sheet))[0] not in only:
            continue
        name = os.path.splitext(os.path.basename(sheet))[0]
        im = clean_background(Image.open(sheet))
        boxes = split_three(im)
        # one square size for all three views, so the scale stays the same
        size = max(max(b[2] - b[0], b[3] - b[1]) for b in boxes)
        size = int(size / (1 - 2 * MARGIN))
        out_dir = os.path.join("assets", name)
        os.makedirs(out_dir, exist_ok=True)
        for view, (x0, y0, x1, y1) in zip(VIEWS, boxes):
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            left, top = cx - size // 2, cy - size // 2
            sq = Image.new("RGB", (size, size), (255, 255, 255))
            sq.paste(im.crop((x0, y0, x1, y1)), (x0 - left, y0 - top))
            if view == "left" and name in MIRROR_LEFT:
                sq = sq.transpose(Image.FLIP_LEFT_RIGHT)
            sq.resize((SIDE, SIDE), Image.LANCZOS).save(os.path.join(out_dir, f"{view}.png"))
        note = " (left mirrored)" if name in MIRROR_LEFT else ""
        print(f"{name}: boxes {boxes}, square {size}px -> {SIDE}px{note}")


if __name__ == "__main__":
    main()
