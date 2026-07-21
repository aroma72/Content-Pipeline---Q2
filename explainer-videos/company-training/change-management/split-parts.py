#!/usr/bin/env python3
"""
split-parts.py — VIDEO B rig. Split each Ali cutout (layers/<id>/boy.png) into two
overlapping layers so the head can move independently of the body:

  layers/<id>/head.png   head + shoulders, alpha-faded out below the neck line
  layers/<id>/body.png   body, alpha-faded in above the neck line (no double head)
  layers/<id>/rig.json   { "neck": [x_frac, y_frac] }  pivot for the head nod

The feathered OVERLAP at the neck means a small head nod (a few degrees) never opens
a seam. lesson-rig.html stacks body under head and animates head rotation about neck.
Only `ali` beats are rigged (scene beats have Ali embedded in the art — not separable).
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image

LAYERS = Path("layers")
ALI_IDS = ["03", "04", "05"]           # the isolated-cutout beats
NECK_FRAC = 0.20                        # neck line as fraction of cutout height (from top)
OVERLAP_FRAC = 0.035                    # feather band half-height (fraction)

def vfade(h, y0, y1, top_keep):
    """column mask (h,) : 1 where kept, linear feather across [y0,y1]."""
    m = np.ones(h, dtype=np.float32)
    for y in range(h):
        if y < y0:
            m[y] = 1.0 if top_keep else 0.0
        elif y > y1:
            m[y] = 0.0 if top_keep else 1.0
        else:
            f = (y - y0) / max(1, (y1 - y0))
            m[y] = (1.0 - f) if top_keep else f
    return m

def main():
    for cid in ALI_IDS:
        d = LAYERS / cid
        boy_p = d / "boy.png"
        if not boy_p.exists():
            print(f"[rig] {cid}: no boy.png — skip")
            continue
        boy = Image.open(boy_p).convert("RGBA")
        W, H = boy.size
        arr = np.array(boy).astype(np.float32)
        alpha = arr[:, :, 3]

        neck = int(NECK_FRAC * H)
        ov = max(4, int(OVERLAP_FRAC * H))
        y0, y1 = neck - ov, neck + ov

        head_mask = vfade(H, y0, y1, top_keep=True)[:, None]     # keep above neck
        body_mask = vfade(H, y0, y1, top_keep=False)[:, None]    # keep below neck

        head = arr.copy(); head[:, :, 3] = alpha * head_mask
        body = arr.copy(); body[:, :, 3] = alpha * body_mask

        Image.fromarray(head.astype(np.uint8), "RGBA").save(d / "head.png")
        Image.fromarray(body.astype(np.uint8), "RGBA").save(d / "body.png")

        # neck pivot: horizontal centre of head mass at the neck row
        row = alpha[neck]
        xs = np.where(row > 40)[0]
        cx = float(xs.mean()) / W if len(xs) else 0.5
        (d / "rig.json").write_text(json.dumps({"neck": [round(cx, 4), round(neck / H, 4)]}))
        print(f"[rig] {cid}: head/body split @ neck y={neck}/{H}  pivot=({cx:.2f},{neck/H:.2f})")

    print("[rig] done.")

if __name__ == "__main__":
    main()
