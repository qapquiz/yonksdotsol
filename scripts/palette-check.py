#!/usr/bin/env python3
"""Token-vs-pixels palette audit for a web capture.

Confirms a screenshot from the web preview actually contains the design
tokens declared in src/config/theme.ts — catches uniwind CSS vars drifting
out of sync with theme.ts, or a capture taken in the wrong theme.

Drive the browser itself with agent-browser (see AGENTS.md, "Web Preview");
this script only audits the resulting PNG. Theme is auto-detected from the
dominant background color; override with --theme if detection picks wrong.

Usage:
  python3 scripts/palette-check.py .expo/web-capture.png
  python3 scripts/palette-check.py shot.png --theme light
"""

import argparse
import sys
from collections import Counter

try:
    from PIL import Image
except ImportError as e:
    print(f"missing dependency: {e.name} — pip install pillow")
    raise SystemExit(1)

# Keep in sync with src/config/theme.ts
TOKENS = {
    "dark": {
        "app-bg #050505": (5, 5, 5),
        "surface #151515": (21, 21, 21),
        "surfaceHighlight #252525": (37, 37, 37),
        "text #ffffff": (255, 255, 255),
        "muted #909090": (144, 144, 144),
        "primary #8fa893": (143, 168, 147),
        "primaryDim #2a332c": (42, 51, 44),
        "secondary #d4955f": (212, 149, 95),
        "secondaryDim #332619": (51, 38, 25),
        "negative #c97064": (201, 112, 100),
    },
    "light": {
        "app-bg #f5f5f5": (245, 245, 245),
        "surface #ffffff": (255, 255, 255),
        "surfaceHighlight #eeeeee": (238, 238, 238),
        "text #1a1a1a": (26, 26, 26),
        "muted #737373": (115, 115, 115),
        "primary #5a7a60": (90, 122, 96),
        "primaryDim #dce8de": (220, 232, 222),
        "primaryDimText #3e5a45": (62, 90, 69),
        "secondary #a5652f": (165, 101, 47),
        "secondaryDim #f5e6d5": (245, 230, 213),
        "secondaryDimText #7d4a20": (125, 74, 32),
        "negative #b55044": (181, 80, 68),
    },
}

TOLERANCE = 8


def pixel_counts(png_path: str, step: int = 2) -> Counter:
    img = Image.open(png_path).convert("RGB")
    w, h = img.size
    px = img.load()
    return Counter(px[x, y] for y in range(0, h, step) for x in range(0, w, step))


def detect_theme(png_path: str) -> str:
    """Pick the theme whose token set covers more of the capture."""
    counts = pixel_counts(png_path, step=4)
    total = sum(counts.values())
    scores = {}
    for theme, tokens in TOKENS.items():
        matched = sum(
            v
            for (pr, pg, pb), v in counts.items()
            if any(
                abs(pr - r) <= TOLERANCE and abs(pg - g) <= TOLERANCE and abs(pb - b) <= TOLERANCE
                for (r, g, b) in tokens.values()
            )
        )
        scores[theme] = matched / total
    best = max(scores, key=scores.get)
    if scores[best] < 0.2:
        print(f"could not detect theme (best match {best} covers {scores[best] * 100:.1f}%) — pass --theme")
        raise SystemExit(1)
    return best


def analyze(png_path: str, theme: str) -> None:
    img = Image.open(png_path).convert("RGB")
    w, h = img.size
    px = img.load()
    counts = Counter(px[x, y] for y in range(0, h, 2) for x in range(0, w, 2))
    total = sum(counts.values())
    print(f"== palette ({theme}, {w}x{h}, sampled {total}px) ==")
    missing = []
    for name, (r, g, b) in TOKENS[theme].items():
        n = sum(
            v
            for (pr, pg, pb), v in counts.items()
            if abs(pr - r) <= TOLERANCE and abs(pg - g) <= TOLERANCE and abs(pb - b) <= TOLERANCE
        )
        print(f"  {name:28s} {n * 100 / total:6.3f}%  {'FOUND' if n else '-'}")
        if not n:
            missing.append(name)
    if missing:
        print(f"\n{len(missing)} token(s) not found: {', '.join(missing)}")
        print("(a token may legitimately not render on this screen — check before treating as drift)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("png", help="screenshot to audit")
    ap.add_argument("--theme", choices=["dark", "light"], help="skip auto-detection")
    args = ap.parse_args()

    theme = args.theme or detect_theme(args.png)
    analyze(args.png, theme)


if __name__ == "__main__":
    sys.exit(main())
