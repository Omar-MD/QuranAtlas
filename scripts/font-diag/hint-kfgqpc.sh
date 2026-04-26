#!/usr/bin/env bash
# Two-stage KFGQPC font transform → woff2 the app ships.
#
# Stage 1 — outline embolden (`embolden-glyf.py`): perpendicular-offsets every
# glyph contour outward by N font units, including combining-mark glyphs
# (sukun, fatha, kasra, shadda, dagger alif, small high seen). Thickens
# strokes at the binary level so CoreGraphics (WebKit / Safari macOS + iOS)
# renders heavy without depending on auto-hint stem-darkening (which Apple
# removed from CoreGraphics in macOS 10.14+ and never had on iOS).
#
# Stage 2 — TT hinting via `ttfautohint`: adds fpgm / prep / cvt instruction
# tables on top of the emboldened outlines. FreeType (Skia / Chrome) prefers
# real instructions over its auto-hinter, CoreGraphics now has instructions
# to execute. Both engines grid-fit to the same pixel positions.
#
# Why both: ttfautohint alone left iOS Safari rendering hairline because
# Naskh has few axis-aligned stems for grid-fit to thicken. CSS faux-bold
# (`font-weight: 500` via `@supports (-webkit-touch-callout: none)`) thickened
# base letters but left combining marks unchanged. Embolden uniformly thickens
# everything; hinting then aligns to device grid.
#
# This script is a one-off asset-prep tool — NOT wired into pnpm build. Run
# manually when KFGQPC source TTFs change. Outputs replace the woff2 files
# in public/fonts/ in place.
#
# Requires:
#   brew install ttfautohint woff2
#   pip install fonttools brotli
#
# Optional env var:
#   EMBOLDEN_OFFSET=30   (font units against UPM 2048; tune visually)

set -euo pipefail

cd "$(dirname "$0")/../.."

if ! command -v ttfautohint >/dev/null 2>&1; then
  echo "error: ttfautohint not installed (brew install ttfautohint)" >&2
  exit 1
fi
if ! command -v woff2_compress >/dev/null 2>&1; then
  echo "error: woff2_compress not installed (brew install woff2)" >&2
  exit 1
fi
if ! python3 -c "import fontTools" >/dev/null 2>&1; then
  echo "error: fontTools not installed (pip install fonttools brotli)" >&2
  exit 1
fi

EMBOLDEN_OFFSET="${EMBOLDEN_OFFSET:-30}"

# (subdir base) — the woff2 file replaced is "$base.woff2" alongside "$base.ttf".
#
# Hafs only by default. Warsh and Qaloon (KFGQPC v0.10) have outline-geometry
# bugs in CoreGraphics/Quartz that survive embolden + ttfautohint AND
# skia-pathops removeOverlaps. They are substituted at the CSS level on
# WebKit (see `src/styles/tokens/semantic.css` `[data-engine='safari']` rules)
# rather than processed here. Override via env: `KFGQPC_RIWAYAT="hafs warsh qaloon"`
RIWAYAT_INPUT="${KFGQPC_RIWAYAT:-hafs}"
PAIRS=()
for r in $RIWAYAT_INPUT; do
  case "$r" in
    hafs)   PAIRS+=("kfgqpc-hafs/hafs.18") ;;
    warsh)  PAIRS+=("kfgqpc-warsh/warsh.10") ;;
    qaloon) PAIRS+=("kfgqpc-qaloon/qaloon.10") ;;
    *) echo "error: unknown riwayah '$r' (valid: hafs warsh qaloon)" >&2; exit 1 ;;
  esac
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for pair in "${PAIRS[@]}"; do
  TTF="public/fonts/$pair.ttf"
  OUT_WOFF2="public/fonts/$pair.woff2"

  if [ ! -f "$TTF" ]; then
    echo "error: missing source TTF $TTF" >&2
    exit 1
  fi

  BASE=$(basename "$pair")
  EMBOLDENED_TTF="$TMP/$BASE.emboldened.ttf"
  HINTED_TTF="$TMP/$BASE.hinted.ttf"
  HINTED_WOFF2="$TMP/$BASE.hinted.woff2"

  echo "── $pair ──"

  # Stage 1: embolden every glyph contour (base letters + combining marks).
  python3 scripts/font-diag/embolden-glyf.py \
    "$TTF" "$EMBOLDENED_TTF" "$EMBOLDEN_OFFSET"

  # Stage 2: ttfautohint over the emboldened outlines.
  # -D arab / -f arab:        shape Arabic via the Arabic-aware hinting
  #                           writing system (ttfautohint ≥1.6).
  # -a sqq (stem-width-mode): three chars = [grayscale, GDI ClearType,
  #                           DirectWrite ClearType]. Browsers in this app
  #                           rasterise grayscale (body sets
  #                           -webkit-font-smoothing: antialiased, Skia on
  #                           macOS already grayscale), so we want strong
  #                           grid-fit on grayscale = `s`. ClearType modes
  #                           kept at quantized = `q` for Windows users
  #                           if/when they hit the site.
  # --windows-compatibility:  keep usWinAscent/Descent in sync with typo
  #                           metrics so line-height stays unchanged from
  #                           current KFGQPC OS/2 values (2400/-1200 on
  #                           Hafs etc).
  # --no-info:                do NOT inject "Hinted by ttfautohint" into
  #                           the name table — keeps official KFGQPC
  #                           identity strings intact.
  ttfautohint \
    --default-script=arab \
    --fallback-script=arab \
    --stem-width-mode=sqq \
    --no-info \
    --windows-compatibility \
    "$EMBOLDENED_TTF" "$HINTED_TTF"

  woff2_compress "$HINTED_TTF"
  # woff2_compress writes alongside the input with .woff2 extension.
  # Some versions write to CWD; guard against that.
  if [ -f "$HINTED_TTF.woff2" ]; then
    HINTED_WOFF2="$HINTED_TTF.woff2"
  elif [ -f "$(basename "$HINTED_TTF" .ttf).woff2" ]; then
    HINTED_WOFF2="$(basename "$HINTED_TTF" .ttf).woff2"
  fi

  cp "$HINTED_WOFF2" "$OUT_WOFF2"

  printf '  %-25s  %8d → %8d bytes\n' \
    "$(basename "$OUT_WOFF2")" \
    "$(wc -c < "$TTF")" \
    "$(wc -c < "$OUT_WOFF2")"
done

echo
echo "Done. Replaced 3 woff2 files. Verify with:"
echo "  bash scripts/font-diag/inspect-kfgqpc-tables.sh"
