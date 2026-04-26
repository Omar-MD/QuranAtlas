#!/usr/bin/env python3
"""Apply skia-pathops boolean union to every glyph's contours.

Why: KFGQPC WARSH and QALOON ship with overlapping same-direction contours
in some glyphs (sheen ش base, jeem ج family, certain marks). Skia (Chromium
rasteriser) fills these correctly under non-zero fill rule. CoreGraphics
(WebKit / Safari macOS + iOS) interprets the overlap differently and
renders hollow/broken regions where contours self-overlap.

The fix is to pre-bake a boolean union on every glyph: convert glyf contours
to a Skia path, simplify (which removes overlaps and self-intersections),
convert back to TT contours. The result is a single watertight outline per
glyph that all rasterisers fill identically.

Tooling: fontTools.ttLib.removeOverlaps wraps this exact pipeline. Requires
the `skia-pathops` Python binding (install via `pip install skia-pathops`).

Usage:
  python3 scripts/font-diag/remove-overlaps.py <input.ttf> <output.ttf>
"""

from __future__ import annotations
import sys
from fontTools.ttLib import TTFont
from fontTools.ttLib.removeOverlaps import removeOverlaps


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    in_path, out_path = sys.argv[1], sys.argv[2]
    font = TTFont(in_path)
    removeOverlaps(font)
    font.save(out_path)
    print(f"removed overlaps → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
