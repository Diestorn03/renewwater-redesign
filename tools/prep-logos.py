"""Financing-partner logos -> transparent colour + white variants for the $0 section.

    python -X utf8 tools/prep-logos.py <dir with the original site's financial/*.png>

Several originals (homerun, time, rffc, synchrony) sit on an opaque white box, so a CSS filter
cannot turn them white. This "un-mattes" white (exact inverse of compositing over white, so the
colour file looks identical on the hover pill), trims to the ink, scales to 96 px high (3x the
32 px display height) and writes public/img/partners/<slug>.webp and <slug>-white.webp.
Prints each width: copy them into LOGO_W in src/components/home/CeroSeLlena.astro.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SRC = {  # slug -> original file name on renewwaterus.com
    'synchrony': 'synchrony.png', 'time': 'time.png', 'ygrene': 'ygrene.png',
    'foundation': 'fundation-png.png', 'homerun': 'homerun.png', 'pci': 'pci-png.png', 'rffc': 'rffc.png',
}
H = 96
OUT = Path(__file__).resolve().parent.parent / 'public' / 'img' / 'partners'


def unmatte(img):
    a = np.asarray(img.convert('RGBA'), dtype=np.float32) / 255
    rgb, alpha = a[..., :3], a[..., 3]
    aw = (1 - rgb).max(axis=2)                      # how far from white each pixel is
    safe = np.maximum(aw, 1e-4)[..., None]
    col = np.clip((rgb - (1 - aw)[..., None]) / safe, 0, 1)
    return col, alpha * aw


def main(src_dir):
    for slug, name in SRC.items():
        src = Image.open(Path(src_dir) / name)
        col, alpha = unmatte(src)
        # self-check: the colour file over white must look like the original over white
        orig = np.asarray(src.convert('RGBA'), dtype=np.float32) / 255
        over = lambda c, a: c * a[..., None] + (1 - a[..., None])
        assert np.abs(over(col, alpha) - over(orig[..., :3], orig[..., 3])).max() < 2 / 255, slug
        ys, xs = np.nonzero(alpha > 0.03)
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        rgba = np.dstack([col, alpha])
        colour = Image.fromarray((rgba * 255).round().astype(np.uint8), 'RGBA').crop(box)
        w = round(colour.width * H / colour.height)
        colour = colour.resize((w, H), Image.LANCZOS)
        # white silhouette: light inks (yellow bars, pale greens, grey type) are boosted so they read on navy
        a = np.asarray(colour, dtype=np.float32)[..., 3] / 255
        white = np.dstack([np.full(a.shape + (3,), 255, np.uint8), (np.clip(a * 1.6, 0, 1) * 255).round().astype(np.uint8)])
        colour.save(OUT / f'{slug}.webp', lossless=True, method=6)
        Image.fromarray(white, 'RGBA').save(OUT / f'{slug}-white.webp', lossless=True, method=6)
        print(f'{slug}: {w}x{H}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
