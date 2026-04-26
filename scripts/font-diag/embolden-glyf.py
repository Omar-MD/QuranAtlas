#!/usr/bin/env python3
"""Embolden a TrueType font's glyph outlines by perpendicular-offsetting every
contour point outward, including combining marks (tashkeel, sukun, shadda,
dagger alif). Preserves advance widths, glyph IDs, GPOS anchor coordinates,
glyph point indices (so any TT instructions added later still reference the
right points).

Why this exists: KFGQPC HAFS / WARSH / QALOON ship from
fonts.qurancomplex.gov.sa with no TT hinting AND outlines drawn at "true
calligraphic" weight (the design weight a hinted Mushaf print would render
at, not the unhinted-screen-rendering weight). FreeType (Skia / Chromium)
auto-hints unhinted fonts so verses look heavy. CoreGraphics (WebKit /
Safari macOS + iOS) does not auto-hint and Apple removed font-smoothing /
stem-darkening from CoreGraphics in macOS 10.14+. Result: Apple platforms
render the actual outline weight, which is hairline. ttfautohint alone is
insufficient — Naskh has few axis-aligned stems for grid-fit to thicken;
CSS faux-bold via @supports + font-weight: 500 thickens base letters but
leaves combining marks unchanged. Pre-thickening every contour at the
binary level guarantees parity across both rasterisers and uniform weight
on base letters AND marks.

Usage:
  python3 scripts/font-diag/embolden-glyf.py <input.ttf> <output.ttf> [offset]

  offset is the perpendicular distance in font units (default 30, against
  KFGQPC unitsPerEm 2048 = ~1.5% growth). Tune visually.
"""

from __future__ import annotations
import math
import sys
from fontTools.ttLib import TTFont


def _signed_area(points: list[tuple[float, float]]) -> float:
    """Shoelace formula. Positive = counter-clockwise in y-up coords =
    outer contour (TT spec); negative = clockwise = hole."""
    n = len(points)
    if n < 3:
        return 0.0
    a = 0.0
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def _embolden_contour(points: list[tuple[float, float]],
                      offset: float) -> list[tuple[float, float]]:
    """Offset each point perpendicular-outward by `offset` font units.
    Treats off-curve and on-curve points uniformly — simple averaged-normal
    approach. Adequate for slight thickening of curvy Naskh outlines.

    For sharper corners or concave joins this can produce minor distortion;
    that risk is bounded by the small offset values we use (≤ ~1.5% of UPM)."""
    n = len(points)
    if n < 2:
        return list(points)

    area = _signed_area(points)
    # In y-up font coords: CCW outer contour has positive area; outward
    # (away from glyph interior) is RIGHT of walking direction. For CW
    # inner holes (negative area): outward (into surrounding solid) is
    # LEFT of walking direction. Both reduce to "right of tangent for
    # CCW, left for CW", which matches the sign of the area.
    sign = 1.0 if area > 0.0 else -1.0

    out: list[tuple[float, float]] = []
    for i in range(n):
        px, py = points[(i - 1) % n]
        cx, cy = points[i]
        nx_, ny_ = points[(i + 1) % n]

        # Incoming tangent: prev → curr
        dx_in, dy_in = cx - px, cy - py
        len_in = math.hypot(dx_in, dy_in)
        # Outgoing tangent: curr → next
        dx_out, dy_out = nx_ - cx, ny_ - cy
        len_out = math.hypot(dx_out, dy_out)

        # Perpendicular (rotate tangent 90° CW): (dx, dy) -> (dy, -dx).
        # That gives the RIGHT-of-tangent direction. Multiplied by `sign`
        # below, it flips to LEFT-of-tangent for CW holes — both end up
        # pointing into the surrounding solid (outward from the filled
        # interior). Skip degenerate zero-length tangents.
        n1x = dy_in / len_in if len_in > 1e-9 else 0.0
        n1y = -dx_in / len_in if len_in > 1e-9 else 0.0
        n2x = dy_out / len_out if len_out > 1e-9 else 0.0
        n2y = -dx_out / len_out if len_out > 1e-9 else 0.0

        # Average; re-normalise so corner displacement matches mid-segment
        # displacement (otherwise sharp corners shrink toward the centre).
        ax = (n1x + n2x) / 2.0
        ay = (n1y + n2y) / 2.0
        alen = math.hypot(ax, ay)
        if alen > 1e-9:
            ax /= alen
            ay /= alen
        else:
            # Degenerate (180° fold). Fall back to a single normal if available.
            ax, ay = (n1x, n1y) if (len_in > 0) else (n2x, n2y)

        out.append((cx + sign * ax * offset, cy + sign * ay * offset))
    return out


def embolden_font(in_path: str, out_path: str, offset: float = 30.0) -> None:
    font = TTFont(in_path)
    glyf = font["glyf"]
    glyph_order = font.getGlyphOrder()

    n_modified = 0
    for name in glyph_order:
        g = glyf[name]
        if g.isComposite():
            # Composite glyphs reference base glyph IDs; the bases are
            # emboldened in this same pass, so the composite picks up the
            # change automatically.
            continue
        if not hasattr(g, "numberOfContours") or g.numberOfContours <= 0:
            continue
        if not hasattr(g, "coordinates") or not hasattr(g, "endPtsOfContours"):
            continue

        coords = list(g.coordinates)
        new_coords: list[tuple[int, int]] = []
        start = 0
        for end_idx in g.endPtsOfContours:
            contour_pts = [(float(x), float(y)) for (x, y) in coords[start:end_idx + 1]]
            offset_pts = _embolden_contour(contour_pts, offset)
            for (x, y) in offset_pts:
                new_coords.append((int(round(x)), int(round(y))))
            start = end_idx + 1

        # Write back. GlyphCoordinates is mutable list-like.
        for i, pt in enumerate(new_coords):
            g.coordinates[i] = pt
        # Recompute bbox for this glyph.
        g.recalcBounds(glyf)
        n_modified += 1

    # head.xMin/yMin/xMax/yMax recomputed on save; force.
    font["head"].xMin = font["head"].yMin = 0
    font["head"].xMax = font["head"].yMax = 0
    font.save(out_path)

    print(f"emboldened {n_modified} glyphs (offset {offset:g} font units) → {out_path}")


def main() -> int:
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print(__doc__, file=sys.stderr)
        return 2
    in_path = sys.argv[1]
    out_path = sys.argv[2]
    offset = float(sys.argv[3]) if len(sys.argv) == 4 else 30.0
    embolden_font(in_path, out_path, offset)
    return 0


if __name__ == "__main__":
    sys.exit(main())
