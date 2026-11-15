"""Builds the SORZA tee print files: one front and one back per design,
at Printful's print area for the Gildan 5000 (12 x 16 in., 1800x2400 at
150 DPI, transparent). Printful prints each file over the whole area, so
where the art sits in the file is where it sits on the shirt.

Logos are the official vectors (src/features/posters/assets), rasterized
by sharp; type is Geist (src/features/posters/fonts). Inks are solid
colors, no partial transparency, so DTG prints them clean.

Writes public/merch/print/{design}-{front,back}.png.

    python scripts/make-tee-print-files.py
"""
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "src" / "features" / "posters" / "assets"
FONTS = ROOT / "src" / "features" / "posters" / "fonts"
OUT = ROOT / "public" / "merch" / "print"

W, H = 1800, 2400
# The designs were laid out on a 1462-wide canvas; everything scales by K.
K = W / 1462

WHITE = (255, 255, 255)
INK = (17, 17, 20)  # near-black for the white shirt
RED = (225, 20, 31)  # #E1141F, the logo's red
GREY = (160, 160, 164)  # the App Store line: solid grey, not translucent white

TAG_GREY = (110, 110, 116)  # the App Store line on the white shirt


def s(v: float) -> int:
    return round(v * K)


def font(name: str, size: float) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"{name}.ttf"), s(size))


def rasterize_logos(tmp: Path) -> None:
    """S mark and wordmark, white and ink, 3000px wide, via sharp."""
    jobs = []
    for name, svg in (("mark", "s-mark.svg"), ("word", "wordmark.svg")):
        for tone, hex_color in (("white", "#FFFFFF"), ("ink", "#111114")):
            jobs.append({"src": str(ASSETS / svg), "out": str(tmp / f"{name}-{tone}.png"), "color": hex_color})
    script = """
const sharp = require(process.argv[1] + "/node_modules/sharp");
const fs = require("fs");
(async () => {
  for (const j of JSON.parse(process.argv[2])) {
    const svg = fs.readFileSync(j.src, "utf8").replace(/#FFFFFF/gi, j.color);
    await sharp(Buffer.from(svg), { density: 300 }).resize({ width: 3000 }).png().toFile(j.out);
  }
})();
"""
    subprocess.run(["node", "-e", script, str(ROOT), json.dumps(jobs)], check=True)


def logo(tmp: Path, name: str, tone: str, width: float) -> Image.Image:
    im = Image.open(tmp / f"{name}-{tone}.png").convert("RGBA")
    w = s(width)
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)


def spaced(d: ImageDraw.ImageDraw, x: float, y: float, text: str, f: ImageFont.FreeTypeFont, fill, tracking: float) -> None:
    """Letter-spaced text centered on x (layout units)."""
    t = s(tracking)
    widths = [d.textlength(c, font=f) for c in text]
    cx = s(x) - (sum(widths) + t * (len(text) - 1)) / 2
    for c, w in zip(text, widths):
        d.text((cx, s(y)), c, font=f, fill=fill)
        cx += w + t


def canvas() -> Image.Image:
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def centered(c: Image.Image, im: Image.Image, y: float) -> None:
    c.alpha_composite(im, ((W - im.width) // 2, s(y)))


def chest_mark(tmp: Path, tone: str) -> Image.Image:
    """Small S on the wearer's left chest (the right of the file)."""
    c = canvas()
    m = logo(tmp, "mark", tone, 300)
    c.alpha_composite(m, (W - m.width - s(150), s(260)))
    return c


def app_store_tag(back: Image.Image, d: ImageDraw.ImageDraw, tmp: Path, y: float, tone: str, line_fill) -> None:
    """The SORZA wordmark with NOW ON THE APP STORE under it, the two the
    same width, at the foot of a back."""
    f = font("Geist-Medium", 34)
    text = "NOW ON THE APP STORE"
    tracking = 12
    width = (sum(d.textlength(c, font=f) for c in text) + s(tracking) * (len(text) - 1)) / K
    word = logo(tmp, "word", tone, width)
    centered(back, word, y)
    spaced(d, 731, y + word.height / K + 30, text, f, line_fill, tracking)


def big_s(tmp: Path) -> tuple[Image.Image, Image.Image]:
    front = canvas()
    centered(front, logo(tmp, "word", "white", 600), 280)

    back = canvas()
    d = ImageDraw.Draw(back)
    m = logo(tmp, "mark", "white", 900)
    centered(back, m, 470)
    y = 470 + m.height / K + 110
    d.rectangle([s(731 - 60), s(y), s(731 + 60), s(y + 8)], fill=RED)
    f = font("Geist-Medium", 70)
    spaced(d, 731, y + 70, "THE SOCIAL NETWORK", f, WHITE, 22)
    spaced(d, 731, y + 170, "FOR CAR ENTHUSIASTS", f, WHITE, 22)
    app_store_tag(back, d, tmp, y + 320, "white", GREY)
    return front, back


def built_rated_ranked(tmp: Path) -> tuple[Image.Image, Image.Image]:
    front = chest_mark(tmp, "ink")
    back = canvas()
    d = ImageDraw.Draw(back)
    centered(back, logo(tmp, "mark", "ink", 980), 340)
    f = font("Geist-Bold", 190)
    for i, (word, color) in enumerate((("BUILT.", INK), ("RATED.", INK), ("RANKED.", RED))):
        spaced(d, 731, 1030 + i * 230, word, f, color, 6)
    app_store_tag(back, d, tmp, 1785, "ink", TAG_GREY)
    return front, back


def wordmark(tmp: Path) -> tuple[Image.Image, Image.Image]:
    front = chest_mark(tmp, "white")
    back = canvas()
    centered(back, logo(tmp, "word", "white", 1402), 540)
    return front, back


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        rasterize_logos(tmp)
        for design, (front, back) in (
            ("big-s", big_s(tmp)),
            ("built-rated-ranked", built_rated_ranked(tmp)),
            ("wordmark", wordmark(tmp)),
        ):
            for side, im in (("front", front), ("back", back)):
                bbox = im.getbbox()
                assert bbox and bbox[3] <= H and bbox[2] <= W, (design, side, bbox)
                im.save(OUT / f"{design}-{side}.png", optimize=True, dpi=(150, 150))
                print(f"{design}-{side}.png", im.size, "art", bbox)


if __name__ == "__main__":
    main()
