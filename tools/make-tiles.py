"""Seamless media tiles for the Renew City tank (#etapas), cropped from the flyer product-9.jpeg (1236x1600).

The flyer's cut-away column shows the six media bands at x 686-735 (left of the steel rod, which sits at
x 737-756; the callout dots reach x 693) with 3-5 px dark separators. Each tile is the centre 40x84 of a band,
mirrored 2x2 so it repeats without seams: 80x168 WebP q70 (~3-6 KB).

    python -X utf8 tools/make-tiles.py path/to/product-9.jpeg
"""
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "img" / "tiles"

X0, W, H = 695, 40, 84  # media column between the callout dots (x<=693) and the rod
# band (top, bottom) rows measured on the flyer, between the dark separators
BANDS = {
    "grava": (500, 596),
    "garnet": (602, 709),
    "cationica": (715, 812),
    "anionica": (818, 914),
    "carbon": (922, 1016),
    "kdf": (1021, 1120),
}


def tile(img, top, bottom):
    y = (top + bottom) // 2 - H // 2
    a = img.crop((X0, y, X0 + W, y + H))
    t = Image.new("RGB", (W * 2, H * 2))
    t.paste(a, (0, 0))
    t.paste(ImageOps.mirror(a), (W, 0))
    t.paste(ImageOps.flip(a), (0, H))
    t.paste(ImageOps.flip(ImageOps.mirror(a)), (W, H))
    return t


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python -X utf8 tools/make-tiles.py path/to/product-9.jpeg  (the original 1236x1600 flyer)")
    img = Image.open(sys.argv[1]).convert("RGB")
    assert img.size == (1236, 1600), f"unexpected flyer size {img.size}"
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (top, bottom) in BANDS.items():
        assert bottom - top >= H, name
        p = OUT / f"tile-{name}.webp"
        tile(img, top, bottom).save(p, "WEBP", quality=70, method=6)
        print(f"{p.name}: {p.stat().st_size} bytes")
