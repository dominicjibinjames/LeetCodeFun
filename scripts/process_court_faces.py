"""Chroma-key court portraits and build subtle animated WebP idles."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageEnhance

ASSETS = Path(r"C:\Users\domin\.cursor\projects\d-Personal-Projects-LeetCodeFun\assets")
OUT = Path(r"d:\Personal_Projects\LeetCodeFun\public\art\court")
OUT.mkdir(parents=True, exist_ok=True)

MAP = {
    "king-calm.webp": "king-calm-raw.png",
    "king-grim.webp": "king-grim-raw.png",
    "queen-calm.webp": "queen-calm-raw.png",
    "queen-grim.webp": "queen-grim-raw.png",
    "heir-calm.webp": "heir-calm-raw.png",
    "heir-grim.webp": "heir-grim-raw.png",
    "commoner-1-calm.webp": "commoner-1-calm-raw.png",
    "commoner-1-angry.webp": "commoner-1-angry-raw.png",
    "commoner-2-calm.webp": "commoner-2-calm-raw.png",
    "commoner-2-angry.webp": "commoner-2-angry-raw.png",
    "commoner-3-calm.webp": "commoner-3-calm-raw.png",
    "commoner-3-angry.webp": "commoner-3-angry-raw.png",
    "commoner-4-calm.webp": "commoner-4-calm-raw.png",
    "commoner-4-angry.webp": "commoner-4-angry-raw.png",
}


def chromakey(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g > 90 and g > r * 1.2 and g > b * 1.2:
                strength = min(1.0, (g - max(r, b)) / 110.0)
                na = 0 if strength > 0.5 else int(a * (1.0 - strength))
                px[x, y] = (r, g, b, na)
            elif r > 225 and g > 225 and b > 225:
                px[x, y] = (r, g, b, 0)
    bbox = im.getbbox()
    if not bbox:
        return im
    cropped = im.crop(bbox)
    pad = 6
    canvas = Image.new("RGBA", (cropped.width + pad * 2, cropped.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(cropped, (pad, pad))
    # normalize height for consistent UI
    target_h = 420
    scale = target_h / canvas.height
    nw = max(1, int(canvas.width * scale))
    return canvas.resize((nw, target_h), Image.Resampling.LANCZOS)


def make_idle_webp(base: Image.Image, path: Path) -> None:
    """4-frame subtle head bob / breathe so faces feel alive."""
    frames: list[Image.Image] = []
    durations = [180, 180, 180, 180]
    for i, (dy, sc, bright) in enumerate(
        [
            (0, 1.0, 1.0),
            (-2, 1.012, 1.02),
            (0, 1.0, 1.0),
            (2, 0.992, 0.98),
        ]
    ):
        w, h = base.size
        nw, nh = max(1, int(w * sc)), max(1, int(h * sc))
        scaled = base.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (w + 8, h + 12), (0, 0, 0, 0))
        x = (canvas.width - nw) // 2
        y = (canvas.height - nh) // 2 + dy
        canvas.paste(scaled, (x, y), scaled)
        canvas = ImageEnhance.Brightness(canvas).enhance(bright)
        frames.append(canvas)
    frames[0].save(
        path,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        lossless=False,
        quality=85,
        method=4,
    )
    print("wrote", path.name, path.stat().st_size, "frames", len(frames))


def main() -> None:
    for out_name, raw_name in MAP.items():
        raw = ASSETS / raw_name
        if not raw.exists():
            print("MISSING", raw)
            continue
        keyed = chromakey(Image.open(raw))
        make_idle_webp(keyed, OUT / out_name)
        # also keep a static png snapshot for fallback
        keyed.save(OUT / out_name.replace(".webp", ".png"))


if __name__ == "__main__":
    main()
