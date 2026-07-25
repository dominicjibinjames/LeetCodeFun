from PIL import Image
from pathlib import Path

src_dir = Path(r"C:\Users\domin\.cursor\projects\d-Personal-Projects-LeetCodeFun\assets")
out_dir = Path(r"d:\Personal_Projects\LeetCodeFun\public\art\overlays")
out_dir.mkdir(parents=True, exist_ok=True)


def chromakey(path_in: Path, path_out: Path, name: str) -> None:
    im = Image.open(path_in).convert("RGBA")
    px = im.load()
    w, h = im.size
    removed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g > 90 and g > r * 1.25 and g > b * 1.25:
                strength = min(1.0, (g - max(r, b)) / 120.0)
                na = int(a * (1.0 - strength))
                if strength > 0.55:
                    na = 0
                    removed += 1
                px[x, y] = (r, g, b, na)
            elif r > 220 and g > 220 and b > 220:
                px[x, y] = (r, g, b, 0)
                removed += 1
    samples = []
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w // 2, h // 2)]:
        samples.append((x, y) + px[x, y])
    im.save(path_out, "PNG")
    print(name, "size", w, h, "keyed", removed, "samples", samples)


chromakey(src_dir / "fire-parchment-raw.png", out_dir / "fire.png", "fire")
chromakey(src_dir / "rubble-parchment-raw.png", out_dir / "rubble.png", "rubble")
