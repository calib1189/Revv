"""Builds the build-poster assets in src/features/posters/assets:
each rank's emblem cropped to just the gem (the emblem artwork in
public/decals/{tier}.png also carries the rank name and logo
underneath, which the poster sets in type instead).

The committed gem-*.png files went one step further: each crop was
upscaled 4x with Real-ESRGAN (realesrgan-ncnn-vulkan, model
realesrgan-x4plus-anime) for clean facet edges, then resized to 1200 px,
more than the ~900 px the poster prints. Rerunning this script replaces
them with the plain, un-upscaled crops.

    python scripts/make-poster-assets.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "decals"
OUT = ROOT / "src" / "features" / "posters" / "assets"
TIERS = ["bronze", "copper", "iron", "silver", "gold", "platinum", "emerald", "diamond", "ruby", "cosmic"]


def gem(tier: str) -> Image.Image:
    im = Image.open(SRC / f"{tier}.png").convert("RGBA")
    alpha = im.getchannel("A")
    w, h = im.size
    filled = [alpha.crop((0, y, w, y + 1)).getbbox() is not None for y in range(h)]
    top = filled.index(True)
    # The gem ends at the first clear band (at least 6 rows) below it.
    y, run = top, 0
    while y < h:
        run = run + 1 if not filled[y] else 0
        if run >= 6:
            break
        y += 1
    bottom = y - run + 1
    shield = im.crop((0, top, w, bottom))
    shield = shield.crop(shield.getchannel("A").getbbox())
    side = max(shield.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(shield, ((side - shield.width) // 2, (side - shield.height) // 2))
    # Kept at the artwork's own resolution: the poster prints the gem
    # about 3 in. wide, so any downscale here would show.
    return square


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for tier in TIERS:
        dest = OUT / f"gem-{tier}.png"
        gem(tier).save(dest, optimize=True)
        print(dest.relative_to(ROOT), dest.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
