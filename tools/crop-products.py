"""Product cut-outs for the catalogue cards and detail pages, cropped from the flyers (1236x1600 JPEG).

Most flyers share one template: a pale logo watermark sits behind the product photo. The watermark is removed by
background subtraction: the "plate" is, per pixel, the value most flyers agree on (products sit in different places,
so the template wins the vote). Pixels close to the plate fade to white; the product and its soft contact shadow stay.
Cards show the result with mix-blend-mode:multiply, so white needs no alpha.

    python -X utf8 tools/crop-products.py [folder with product-N.jpeg]

Writes public/img/products/cut-<slug>.webp (<= 800 px tall, q82).
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "flyers"
OUT = ROOT / "public" / "img" / "products"
MAX_H = 800

# slug: (flyer, crop box x0 y0 x1 y1, [rects to inpaint (callout lines touching the product); a 5th item 'white' blanks copy])
CUTS = {
    "renew-city": (12, (842, 330, 1218, 1108), []),
    "renew-duo": (5, (104, 326, 596, 1092), []),
    "5-pasos-eco": (2, (112, 308, 482, 1136), []),
    "linea-clasica": (8, (352, 286, 806, 1034), [(768, 340, 806, 368), (560, 1018, 640, 1034)]),
    "linea-economica": (7, (398, 306, 806, 1020), [(791, 350, 806, 368), (560, 1010, 640, 1020)]),
    "agua-de-pozo": (3, (570, 336, 1124, 1098), []),
    "agua-de-pozo-plus": (4, (22, 356, 1194, 1094), [(22, 356, 852, 452, 'white')]),
    "renew-apto-4-pasos": (13, (284, 318, 566, 1112), []),
    "renew-small-4-pasos": (14, (308, 294, 528, 1112), []),
    "osmosis-inversa": (11, (584, 404, 1156, 1010), []),
    "astrid": (6, (134, 318, 672, 1082), []),
}
TEMPLATE = [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14]  # flyers that share the watermark template
# where each template flyer has product or copy over the watermark (excluded from the plate vote)
BUSY = {n: [box] for n, box, _ in CUTS.values()}
BUSY[9] = [(220, 240, 1060, 1150)]                        # Renew City cut-away tank and its step labels
BUSY[12] += [(90, 300, 800, 1140)]                        # long copy block
BUSY[5] = BUSY.get(5, []) + [(650, 460, 1150, 770)]


def load(n):
    return np.asarray(Image.open(SRC / f"product-{n}.jpeg").convert("RGB")).astype(np.int16)


def plate(imgs):
    """Per pixel, the value most flyers agree on (within 14 levels), counting only flyers that are not busy there.
    Returns the plate and a mask of pixels where the plate is trustworthy (enough votes, pale like the watermark)."""
    ns = list(imgs)
    stack = np.stack([imgs[n] for n in ns])
    free = np.ones(stack.shape[:3], bool)
    for i, n in enumerate(ns):
        for x0, y0, x1, y1 in BUSY.get(n, []):
            free[i, y0:y1, x0:x1] = False
    best, votes = stack[0].copy(), np.zeros(stack.shape[1:3], np.int16)
    for i, c in enumerate(stack):
        v = sum(((np.abs(o - c).max(-1) <= 14) & free[j]).astype(np.int16) for j, o in enumerate(stack))
        take = free[i] & (v > votes)
        best[take], votes[take] = c[take], v[take]
    return best, (votes >= 2) & (best.min(-1) >= 150)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def cut(img, bg, ok, box, erase):
    d = np.abs(img - bg).max(-1).astype(np.float32)
    alpha = np.where(ok, smoothstep(10, 34, d), 1)[..., None]
    out = img * alpha + 255 * (1 - alpha)
    for x0, y0, x1, y1, *white in erase:
        if white:  # plain background (copy blocks): white
            out[y0:y1, x0:x1] = 255
            continue
        # callout line over a shadow: blend the rows just above and below so the shadow stays continuous
        t = np.linspace(0, 1, y1 - y0)[:, None, None]
        out[y0:y1, x0:x1] = out[y0 - 1, x0:x1] * (1 - t) + out[y1, x0:x1] * t
    x0, y0, x1, y1 = box
    crop = out[y0:y1, x0:x1]
    # feather the crop edges to white so nothing ends in a hard line on the card
    h, w = crop.shape[:2]
    f = 14
    ramp = lambda n: np.minimum(np.minimum(np.arange(n), np.arange(n)[::-1]) / f, 1)
    edge = np.minimum.outer(ramp(h), ramp(w))[..., None]
    crop = crop * edge + 255 * (1 - edge)
    im = Image.fromarray(np.clip(crop, 0, 255).astype(np.uint8))
    if im.height > MAX_H:
        im = im.resize((round(im.width * MAX_H / im.height), MAX_H), Image.LANCZOS)
    return im


def main():
    imgs = {n: load(n) for n in TEMPLATE}
    bg, ok = plate(imgs)
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, (n, box, erase) in CUTS.items():
        im = cut(imgs[n], bg, ok, box, erase)
        dst = OUT / f"cut-{slug}.webp"
        im.save(dst, "WEBP", quality=82, method=6)
        print(f"{dst.name}: {im.width}x{im.height} {dst.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
