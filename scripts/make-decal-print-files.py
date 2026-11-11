"""Builds the rank decal print files: each rank's emblem on one dark
rounded badge, lit in the rank's color. Printful die-cuts the sticker
around the badge, so its white edge is one thin, even outline instead
of tracing the emblem's spikes and each word separately.

Reads public/decals/{tier}.png (the emblem artwork) and writes
public/decals/print/{tier}.png: 1200x1200 at 300 DPI, which is 4x4 in.

    python scripts/make-decal-print-files.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "decals"
OUT = SRC / "print"

# RANK_TEXT_COLORS in src/lib/rating/rank.ts.
GLOW = {
    "bronze": "#c98a52",
    "copper": "#d99569",
    "iron": "#aeb2bb",
    "silver": "#dde1e7",
    "gold": "#f0cd6e",
    "platinum": "#eef4f8",
    "emerald": "#5be3a9",
    "diamond": "#c9f4ff",
    "ruby": "#f27a93",
    "cosmic": "#c9b6ff",
}

SIZE = 1200
# Room inside the print area for the die-cut edge around the badge.
INSET = 40
RADIUS = 230
BADGE = (14, 14, 18)


def rgb(hex_color: str) -> tuple[int, int, int]:
    return tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5))  # type: ignore[return-value]


def badge(tier: str) -> Image.Image:
    shape = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(shape).rounded_rectangle((INSET, INSET, SIZE - INSET, SIZE - INSET), radius=RADIUS, fill=255)

    face = Image.new("RGBA", (SIZE, SIZE), BADGE + (255,))
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((260, 170, 940, 850), fill=rgb(GLOW[tier]) + (95,))
    face.alpha_composite(glow.filter(ImageFilter.GaussianBlur(150)))

    art = Image.open(SRC / f"{tier}.png").convert("RGBA")
    art = art.resize((900, 900), Image.LANCZOS)
    face.alpha_composite(art, ((SIZE - 900) // 2, (SIZE - 900) // 2 + 6))

    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(face, (0, 0), shape)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for tier in GLOW:
        dest = OUT / f"{tier}.png"
        badge(tier).save(dest, dpi=(300, 300), optimize=True)
        print(dest.relative_to(ROOT), dest.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
