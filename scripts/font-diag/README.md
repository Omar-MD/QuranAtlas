# Font diagnostic + asset-prep scripts

Two-track pipeline for KFGQPC webfonts. See
`docs/context/riwayat-dataset.md` § "Cross-engine rendering" for the full
landscape.

## Scripts

| File | Purpose |
|---|---|
| `hint-kfgqpc.sh` | **Asset-prep pipeline.** Embolden + ttfautohint the upstream KFGQPC TTF and repackage to woff2. Hafs only by default (Warsh / Qaloon don't respond — substituted at the CSS layer on WebKit instead). Override via `KFGQPC_RIWAYAT="hafs warsh qaloon"`. Run after any KFGQPC source re-import. |
| `embolden-glyf.py` | Helper for `hint-kfgqpc.sh`. Perpendicular outline-offset by N font units (default 30). Used to compensate for Apple's removed stem-darkening in CoreGraphics. |
| `inspect-kfgqpc-tables.sh` | Audit script — prints `fpgm` / `prep` / `cvt` / `gasp` / `OS/2.usWeightClass` for each KFGQPC TTF + woff2. |
| `render-compare.mjs` | Local Playwright Chromium ↔ WebKit screenshot pair generator. Renders Surat ar-Rahman 1-4 in chosen riwayat at `scripts/font-diag/.out/{engine}-{riwayah}.png`. Use for visual regression checks before shipping a font change. |
| `remove-overlaps.py` | Exploratory — runs `fontTools.ttLib.removeOverlaps` (skia-pathops boolean union). Tested 2026-04-27 against Warsh / Qaloon WebKit hollow-glyph bug; **does not fix it**. Kept here so future investigations don't re-derive the negative result. |
| `document-fonts-snapshot.js` | Browser-console snippet — paste in Safari Web Inspector to enumerate `document.fonts` for duplicate KFGQPC FontFace registrations. Tested 2026-04-26 — orthogonal to the Warsh / Qaloon WebKit rendering bug. |
| `mark-position-pixel-diff.html` | Standalone HTML page — captures per-codepoint client rects for Ayat al-Kursi etc. Use to discriminate mark-positioning bugs (mkmk drop) from rasterisation-weight bugs. |

## Prerequisites

```sh
brew install ttfautohint woff2
pip install fonttools brotli skia-pathops
npx playwright install chromium webkit  # for render-compare.mjs
```

## Quick reference

```sh
# Re-build Hafs woff2 from upstream after a KFGQPC source re-import:
bash scripts/font-diag/hint-kfgqpc.sh

# Confirm hinting tables:
bash scripts/font-diag/inspect-kfgqpc-tables.sh

# Visual side-by-side check (Chromium + WebKit, ar-Rahman 1-4, all 3 riwayat):
RIWAYAT=hafs,warsh,qaloon node scripts/font-diag/render-compare.mjs
# screenshots → scripts/font-diag/.out/
```

## Why some files are exploratory

`remove-overlaps.py`, `document-fonts-snapshot.js`, and
`mark-position-pixel-diff.html` exist to document **paths that did NOT fix
the Warsh / Qaloon WebKit hollow-glyph bug**. They are kept (not deleted)
so future investigators can verify the negative result quickly without
re-installing tooling and re-deriving that the upstream font geometry is
the root cause. Active asset-prep is `hint-kfgqpc.sh` + `embolden-glyf.py`
+ `inspect-kfgqpc-tables.sh` + `render-compare.mjs`.
