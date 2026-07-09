#!/usr/bin/env python3
"""
segment-all.py — cut the character out of each art/<id>.png into a puppet layer.

For every art/<id>.png:
  layers/<id>/boy.png    the character, tight-cropped, transparent background
  layers/<id>/plate.png  the background with the character region filled (a "plate"
                         the puppet can sway/breathe over without leaving a hole)
  layers/<id>/anchors.json  bbox + head/feet/center pivots (for cutout-puppet motion)

METHOD (Law 4 depends on clean-hero art):
  * foreground = NOT near-white/cream  (drop bg by brightness + low saturation)
  * keep the LARGEST connected component (seed from the biggest blob, not the
    centre pixel) so stray specks don't merge the whole frame
  * erode ~1px then feather the alpha to kill white halos
  * a full-image bbox means segmentation merged everything -> art is too dark/busy;
    we WARN so you regenerate that still instead of shipping a bad cutout

Deps: Pillow, numpy  (scipy used if present for faster labeling; pure-numpy fallback).
"""

import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ART = Path("art")
LAYERS = Path("layers")
LAYERS.mkdir(exist_ok=True)

try:
    from scipy import ndimage  # optional, faster
    HAVE_SCIPY = True
except Exception:
    HAVE_SCIPY = False


def largest_component(mask: np.ndarray) -> np.ndarray:
    """Return a boolean mask of the single largest 4-connected component."""
    if HAVE_SCIPY:
        lbl, n = ndimage.label(mask)
        if n == 0:
            return mask
        sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
        biggest = int(np.argmax(sizes)) + 1
        return lbl == biggest
    # pure-numpy BFS flood fill over True pixels
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best = np.zeros_like(mask, dtype=bool)
    best_n = 0
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if seen[sy, sx]:
            continue
        stack = [(sy, sx)]
        comp = []
        seen[sy, sx] = True
        while stack:
            y, x = stack.pop()
            comp.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(comp) > best_n:
            best_n = len(comp)
            best = np.zeros_like(mask, dtype=bool)
            for (y, x) in comp:
                best[y, x] = True
    return best


def foreground_mask(rgb: np.ndarray) -> np.ndarray:
    """True where pixel is the subject. Adaptive: background = pixels close to the
    ACTUAL corner cream color (robust to Imagen's vignette/texture), not a fixed
    brightness/saturation threshold."""
    h, w, _ = rgb.shape
    c = max(16, min(h, w) // 20)
    corners = np.concatenate([
        rgb[:c, :c].reshape(-1, 3), rgb[:c, -c:].reshape(-1, 3),
        rgb[-c:, :c].reshape(-1, 3), rgb[-c:, -c:].reshape(-1, 3),
    ]).astype(float)
    cream = np.median(corners, axis=0)
    dist = np.sqrt(((rgb.astype(float) - cream) ** 2).sum(axis=2))
    fg = dist > 55.0  # far from cream = subject; tolerates vignette/gradient
    return fg


def process(png: Path):
    rid = png.stem
    out = LAYERS / rid
    out.mkdir(parents=True, exist_ok=True)

    img = Image.open(png).convert("RGB")
    W, H = img.size
    rgb = np.asarray(img)

    mask = foreground_mask(rgb)
    mask = largest_component(mask)

    if mask.sum() < 500:
        print(f"[seg] {rid}: WARN tiny/empty subject ({int(mask.sum())} px) — check the art.")
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        print(f"[seg] {rid}: FAIL no subject found — regenerate this still.")
        return
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    if x0 <= 1 and y0 <= 1 and x1 >= W - 2 and y1 >= H - 2:
        print(f"[seg] {rid}: WARN full-image bbox = merged background. Regenerate with cleaner clean-hero art.")

    # alpha: erode ~1px then feather
    alpha = Image.fromarray((mask * 255).astype(np.uint8), "L")
    alpha = alpha.filter(ImageFilter.MinFilter(3))      # erode ~1px (kill halo)
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.0)) # feather

    # boy.png — tight crop with transparency
    rgba = img.convert("RGBA")
    rgba.putalpha(alpha)
    pad = 6
    bx0, by0 = max(0, x0 - pad), max(0, y0 - pad)
    bx1, by1 = min(W, x1 + pad), min(H, y1 + pad)
    boy = rgba.crop((bx0, by0, bx1, by1))
    boy.save(out / "boy.png")

    # plate.png — fill subject region with the border/background cream so the
    # puppet can move without exposing a hole (cheap stand-in for true inpaint)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]], axis=0)
    cream = tuple(int(c) for c in np.median(border, axis=0))
    plate = np.array(img).copy()
    grow = Image.fromarray((mask * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(7))
    grow_np = np.asarray(grow) > 0
    plate[grow_np] = cream
    Image.fromarray(plate, "RGB").filter(ImageFilter.GaussianBlur(0.6)).save(out / "plate.png")

    anchors = {
        "image_w": W, "image_h": H,
        "bbox": [bx0, by0, bx1, by1],
        "center": [int((x0 + x1) / 2), int((y0 + y1) / 2)],
        "head": [int((x0 + x1) / 2), y0],
        "feet": [int((x0 + x1) / 2), y1],
        "cream": list(cream),
    }
    with open(out / "anchors.json", "w") as f:
        json.dump(anchors, f, indent=2)
    print(f"[seg] {rid}: ok  bbox={anchors['bbox']}  ({int(mask.sum())} px)")


def main():
    if not ART.exists():
        print("[seg] no art/ folder — run generate-lesson-art.js first.")
        sys.exit(1)
    pngs = sorted(ART.glob("*.png"))
    if not pngs:
        print("[seg] art/ is empty.")
        sys.exit(1)
    only = [s for s in os.environ.get("SEG_IDS", "").split(",") if s]
    for png in pngs:
        if only and png.stem not in only:
            continue
        process(png)
    print(f"\n[seg] done ({'scipy' if HAVE_SCIPY else 'numpy'} labeling). Verify tight bboxes above.")


if __name__ == "__main__":
    main()
