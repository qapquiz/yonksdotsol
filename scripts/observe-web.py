#!/usr/bin/env python3
"""Headless observation of the Expo web preview (dev server).

Why this exists: on a Pi 5 (or any displayless box) headless chromium cannot
fetch HTTP URLs at all (broken network service), so pointing it at
http://localhost:8081 yields blank screenshots. This script works around that:

  1. Fetches the served dev HTML + JS bundle from the Metro server (via urllib,
     which works fine).
  2. Inlines the bundle into a self-contained file:// page, rewriting
     `location.*` accessors so Expo Router boots on `/` instead of matching the
     temp filename (which renders the "Unmatched Route" screen).
  3. Boots it in headless chromium over the DevTools Protocol (CDP), emulates
     `prefers-color-scheme` (uniwind follows the OS preference; headless
     defaults to light), waits for mount, then captures:
       - screenshot (PNG)
       - computed design tokens (bg / muted / primary)
       - rendered on-screen text
       - any uncaught page errors

A single "Uncaught SyntaxError" is expected: lazy route chunks 404 on the
file:// carrier (they load normally from the dev server).

Requires: pillow, websocket-client  (pip install pillow websocket-client)

Usage:
  python3 scripts/observe-web.py                      # dark, 412x1400
  python3 scripts/observe-web.py --theme light
  python3 scripts/observe-web.py --width 412 --height 915 --out shot.png
"""

import argparse
import base64
import json
import os
import re
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request
from collections import Counter

try:
    import websocket  # websocket-client
    from PIL import Image
except ImportError as e:
    sys.exit(f"missing dependency: {e.name} — pip install pillow websocket-client")

CHROMIUM = os.environ.get("CHROMIUM_BIN", "chromium")

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
        "muted #999999": (153, 153, 153),
        "primary #6b8f71": (107, 143, 113),
        "primaryDim #dce8de": (220, 232, 222),
        "secondary #c07a3e": (192, 122, 62),
        "secondaryDim #f5e6d5": (245, 230, 213),
        "negative #b55044": (181, 80, 68),
    },
}


def fetch(url: str) -> str:
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def build_carrier(dev_url: str) -> str:
    """Return a self-contained file://-ready HTML for the app at dev_url."""
    html = fetch(dev_url)
    m = re.search(r'<script src="(/index\.bundle[^"]*)"[^>]*></script>', html)
    if not m:
        sys.exit("could not find the Metro bundle <script> in the served HTML — is the dev server running?")
    js = fetch(dev_url.rstrip("/") + m.group(1))

    # Route fix: the router matches the file:// temp path otherwise.
    js = js.replace("location.pathname", '"/"')
    js = js.replace("location.search", '""')
    js = js.replace("location.href", '"http://localhost/"')

    # Page error trap, installed before the bundle runs.
    trap = "<script>window.__errs=[];window.onerror=function(m){window.__errs.push(String(m))}</script>"
    html = re.sub(r'<script src="/index\.bundle[^"]*"[^>]*></script>', trap, html)
    return html.replace("</body>", "<script>" + js.replace("</script", "<\\/script") + "</script></body>")


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class CDP:
    def __init__(self, port: int):
        tabs = None
        for _ in range(40):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2))
                pages = [t for t in tabs if t.get("type") == "page"]
                if pages:
                    break
            except Exception:
                pass
            time.sleep(0.5)
        if not pages:
            sys.exit("chromium devtools endpoint never came up")
        self.ws = websocket.create_connection(pages[0]["webSocketDebuggerUrl"], timeout=60)
        self.mid = 0

    def cmd(self, method: str, params: dict | None = None) -> dict:
        self.mid += 1
        self.ws.send(json.dumps({"id": self.mid, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.mid:
                return msg.get("result", {})

    def eval(self, expression: str) -> str:
        r = self.cmd("Runtime.evaluate", {"expression": expression, "returnByValue": True})
        return str(r.get("result", {}).get("value", ""))


def analyze(png_path: str, theme: str) -> None:
    img = Image.open(png_path).convert("RGB")
    w, h = img.size
    px = img.load()
    counts = Counter(px[x, y] for y in range(0, h, 2) for x in range(0, w, 2))
    total = sum(counts.values())
    print(f"\n== palette ({theme}, {w}x{h}, sampled {total}px) ==")
    for name, (r, g, b) in TOKENS[theme].items():
        n = sum(v for (pr, pg, pb), v in counts.items() if abs(pr - r) <= 8 and abs(pg - g) <= 8 and abs(pb - b) <= 8)
        print(f"  {name:28s} {n * 100 / total:6.3f}%  {'FOUND' if n else '-'}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--url", default="http://localhost:8081", help="dev server URL")
    ap.add_argument("--theme", choices=["dark", "light"], default="dark")
    ap.add_argument("--width", type=int, default=412)
    ap.add_argument("--height", type=int, default=1400)
    ap.add_argument("--out", default=".expo/web-capture.png")
    ap.add_argument("--boot-seconds", type=int, default=12, help="wall-clock wait for app mount")
    args = ap.parse_args()

    carrier = build_carrier(args.url)
    fd, carrier_path = tempfile.mkstemp(suffix=".html", prefix="observe-web-")
    with os.fdopen(fd, "w") as f:
        f.write(carrier)

    port = free_port()
    proc = subprocess.Popen(
        [
            CHROMIUM,
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            f"--remote-debugging-port={port}",
            "--remote-allow-origins=*",
            f"--window-size={args.width},{args.height}",
            f"file://{carrier_path}",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        cdp = CDP(port)
        cdp.cmd("Page.enable")
        print(f"booting app ({args.boot_seconds}s wall clock)...")
        time.sleep(args.boot_seconds)

        cdp.cmd(
            "Emulation.setEmulatedMedia",
            {"features": [{"name": "prefers-color-scheme", "value": args.theme}]},
        )
        time.sleep(2)

        probe = cdp.eval(
            "(() => { const cs = getComputedStyle(document.documentElement);"
            " return ['bg=' + cs.getPropertyValue('--color-app-bg').trim(),"
            " 'muted=' + cs.getPropertyValue('--color-app-text-muted').trim(),"
            " 'primary=' + cs.getPropertyValue('--color-app-primary').trim()].join(' | '); })()"
        )
        print(f"computed tokens: {probe}")

        text = cdp.eval("document.body.innerText")
        lines = []
        for line in (l.strip() for l in text.splitlines()):
            if line and line not in lines:
                lines.append(line)
        print(f"\n== on screen ({len(lines)} unique lines, first 30) ==")
        for line in lines[:30]:
            print(f"  {line!r}")

        errs = cdp.eval("(window.__errs || []).join('\\n')")
        print(f"\n== page errors ==\n{errs or '(none)'}")

        shot = cdp.cmd("Page.captureScreenshot", {"format": "png"})
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        with open(args.out, "wb") as f:
            f.write(base64.b64decode(shot["data"]))
        print(f"\nscreenshot: {args.out} ({os.path.getsize(args.out)} bytes)")

        analyze(args.out, args.theme)
    finally:
        proc.terminate()
        try:
            os.unlink(carrier_path)
        except OSError:
            pass


if __name__ == "__main__":
    main()
