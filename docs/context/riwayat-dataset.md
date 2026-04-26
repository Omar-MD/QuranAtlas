# Riwayat Dataset (KFGQPC)

Authentic Qur'anic text per riwaya, sourced from the King Fahd Glorious Qur'an Printing Complex (KFGQPC) — the official publisher of *Mushaf al-Madinah al-Nabawiyyah*. Three riwayat shipped:

- **Hafs** عن عاصم (Egypt, Levant, KSA, most of Muslim world)
- **Warsh** عن نافع (Maghreb, West Africa, parts of Western Europe)
- **Qaloon** عن نافع (Libya, Tunisia, parts of Mauritania)

These are the **active reader corpus** — the prior PUA-encoded Hafs corpus (quran.com-derived) was removed. `data/dataset.ts::getSurah(n)` reads `settings['riwayah']` to resolve the per-surah URL from `public/dataset/riwayat/{riwayah}/{NNN}.json`. See the Build pipeline section below.

---

## Build pipeline

The three monolithic source files (`hafs.json` / `warsh.json` / `qaloon.json` under `public/dataset/riwayat/`) are inputs to `scripts/build-riwayat.mjs`. The script splits each into 114 per-surah files (`riwayat/{name}/{NNN}.json`), regenerates `surahs.json` (114 entries with per-Riwayah `counts`), `juz.json` (30 entries from Hafs — juz boundaries are constant across Riwayat), and writes a fresh `manifest.json` (sha256 per shipped file; `provenance.json` is hashed against a `builtAt`-stripped form so the manifest stays idempotent across no-op rebuilds) and `provenance.json` (v2.0.0). Run via `pnpm build:dataset`; chained automatically by `pnpm build`.

---

## Files

```
public/dataset/riwayat/
  hafs.json     3.42 MB   6236 ayat   v18
  warsh.json    2.64 MB   6214 ayat   v10
  qaloon.json   2.63 MB   6214 ayat   v10
```

Ayah counts are riwaya-correct (Hafs 6236, Warsh / Qaloon 6214 — the Basmala of Surah al-Fātiḥah is counted as ayah 1 in Hafs but not in Warsh / Qaloon, plus other minor splits). Different counts are a fast integrity-check: a "Warsh" file with 6236 records is corrupt or actually Hafs.

### SHA-256 (truncated)

| File | sha256 (first 16 hex) |
|---|---|
| `hafs.json`   | `5d8bb91726e48283` |
| `warsh.json`  | `f05d0dc652fd46b3` |
| `qaloon.json` | `18465c40ebeec40a` |

Recompute when bumping versions; commit the new digests in the same PR.

---

## Schema

Flat JSON array. One record per ayah.

### Hafs (`hafs.json`)

```ts
{
  id:               number,   // 1..6236, global ayah index
  jozz:             number,   // 1..30
  sora:             number,   // 1..114    ← note: "sora", not "sura_no"
  sora_name_en:     string,
  sora_name_ar:     string,
  page:             string,   // Madinah mushaf page, "1".."604"
  line_start:       number,   // 1..15 — first line on the page
  line_end:         number,   // last line (often line_start+1)
  aya_no:           number,   // ayah number within the surah
  aya_text:         string,   // Uthmani script for the Hafs font
  aya_text_emlaey:  string,   // modern (إملائي) plain spelling — useful for search/normalisation
}
```

### Warsh (`warsh.json`) and Qaloon (`qaloon.json`)

```ts
{
  id:            number,   // 1..6214
  jozz:          number,
  sura_no:       number,   // 1..114    ← note: "sura_no", not "sora"
  sura_name_en:  string,
  sura_name_ar:  string,
  page:          string,
  line_start:    number,
  line_end:      number,
  aya_no:        number,
  aya_text:      string,   // Maghrebi-orthography text for the Warsh / Qaloon font
}
```

**Schema differences from Hafs:** field name is `sura_no` (not `sora`), and there is no `aya_text_emlaey`. Any cross-riwaya code path must alias these. Suggested normaliser:

```ts
function ayaSurah(rec: any): number {
  return rec.sora ?? rec.sura_no;
}
```

`page` + `line_start` / `line_end` are the official Madinah mushaf coordinates **for that riwaya's mushaf** — Warsh and Qaloon use different page layouts than Hafs. Do not cross-reference page numbers across riwayat.

---

## Fonts

KFGQPC publishes a dedicated Uthmanic font per riwaya. **Generic Arabic fonts will mis-render Warsh and Qaloon text** (special small alif `ا۬` / `ا۪`, qasr marks, wasla over alif, distinct mark stacking). Always pair text with its matching font:

```
public/fonts/
  kfgqpc-hafs/
    hafs.18.ttf       237 KB
    hafs.18.woff2      86 KB
  kfgqpc-warsh/
    warsh.10.ttf      250 KB
    warsh.10.woff2     89 KB
  kfgqpc-qaloon/
    qaloon.10.ttf     255 KB
    qaloon.10.woff2    89 KB
```

Prefer `.woff2` for the web; ship `.ttf` for offline/legacy fallback.

### Font metrics → minimum line-height

All three fonts use **`unitsPerEm` = 2048**. Vertical metrics from the file (in design units), and the resulting CSS `line-height` floor:

| Riwaya | Win ascent | Win descent | Total | Min `line-height` (unitless) |
|---|---:|---:|---:|---:|
| Hafs   | 2400 | 1200 | 3600 | **1.76** |
| Warsh  | 2375 | 1175 | 3550 | **1.73** |
| Qaloon | 2350 | 1175 | 3525 | **1.72** |

Why so tall: Arabic Uthmanic glyphs reach far above and below the baseline (small alif overlays, low madda, stacked harakat + dagger alif, hamzat al-wasl). The fonts declare matching `OS/2 sTypoAscender / sTypoDescender` and `hhea ascent / descent` — same numbers across all three metric tables (no asymmetry to negotiate), so any layout engine produces the same height.

**Reader CSS rules:**

- Use `line-height: 1.8` or higher in any container that renders these fonts. Below ~1.7, top harakat clip on adjacent lines.
- Do **not** use `line-height: 1` or numeric pixel values smaller than `font-size × 1.72`.
- If the existing reader sets a lower line-height for the PUA Hafs corpus, that value is **not** safe for these KFGQPC fonts — gate per-corpus.
- For mixed Arabic + Latin lines (e.g. translation toggle), apply `line-height` on the Arabic span specifically; let the Latin run inherit a tighter value, or the page grows visibly.

### `@font-face` declarations

```css
@font-face {
  font-family: "KFGQPC Hafs";
  src: url("/fonts/kfgqpc-hafs/hafs.18.woff2") format("woff2"),
       url("/fonts/kfgqpc-hafs/hafs.18.ttf")  format("truetype");
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
}

@font-face {
  font-family: "KFGQPC Warsh";
  src: url("/fonts/kfgqpc-warsh/warsh.10.woff2") format("woff2"),
       url("/fonts/kfgqpc-warsh/warsh.10.ttf")  format("truetype");
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
}

@font-face {
  font-family: "KFGQPC Qaloon";
  src: url("/fonts/kfgqpc-qaloon/qaloon.10.woff2") format("woff2"),
       url("/fonts/kfgqpc-qaloon/qaloon.10.ttf")  format("truetype");
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
}

.qa-aya[data-riwaya="hafs"]   { font-family: "KFGQPC Hafs",   serif; line-height: 1.8;  }
.qa-aya[data-riwaya="warsh"]  { font-family: "KFGQPC Warsh",  serif; line-height: 1.78; }
.qa-aya[data-riwaya="qaloon"] { font-family: "KFGQPC Qaloon", serif; line-height: 1.78; }
```

`font-display: swap` is acceptable here only because Latin fallback won't render the Arabic glyphs anyway — the verse will appear as `.notdef` boxes during the swap window. If that flash is unacceptable, switch to `block` for these three families.

---

## Cross-engine rendering

KFGQPC's three webfonts ship with two unrelated rendering issues across browser engines. Each has a different fix.

### Issue 1 — Hafs (v0.18): unhinted outlines render thin on WebKit

KFGQPC `hafs.18.ttf` ships with no TrueType hinting (`fpgm` / `prep` / `cvt` tables absent, `maxp.maxFunctionDefs = 0`). FreeType (Skia / Chromium) auto-hints unhinted fonts so verses look bold; CoreGraphics / Quartz (WebKit / Safari macOS + iOS) does not auto-hint and has no stem-darkening fallback (Apple removed it in macOS 10.14+) so verses render hairline.

**Fix shipped:** `scripts/font-diag/hint-kfgqpc.sh` runs perpendicular outline-embolden via `embolden-glyf.py` (offset 30 font units against UPM 2048) followed by `ttfautohint --default-script=arab --stem-width-mode=sqq`. Output replaces `public/fonts/kfgqpc-hafs/hafs.18.woff2` (~88 KB → ~118 KB). Both engines now grid-fit to the same pixel positions.

**Regression guard:** `tests/unit/assets/kfgqpc-hinting.test.ts` parses the WOFF2 table directory of the shipped Hafs file and asserts `fpgm` / `prep` / `cvt ` are present — fails if a future asset re-import drops back to upstream unhinted bytes.

### Issue 2 — Warsh + Qaloon (v0.10): outline geometry breaks in CoreGraphics

KFGQPC `warsh.10.ttf` and `qaloon.10.ttf` have outline encoding that CoreGraphics rasterises as hollow / broken combining-mark stacks (sheen ش base, jeem ج family, shadda+vowel pairs). Skia (Chromium) and Gecko (Firefox) render the same outlines correctly. Verified locally via `scripts/font-diag/render-compare.mjs` (Playwright Chromium ↔ WebKit screenshot pairs).

**Not fixable via binary post-processing.** Tested and ruled out 2026-04-26/27:
- `ttfautohint` — no effect.
- Perpendicular outline embolden (`scripts/font-diag/embolden-glyf.py` at offset 15, 20, 30, both sign directions) — no effect.
- `skia-pathops` boolean union via `fontTools.ttLib.removeOverlaps` — no effect.

**No alternative font available.** Confirmed exhaustively via web research:
- KFGQPC publishes only v0.10 of Qaloon; no newer version, no "QaloonSmart" variant. Last update 2010.
- Quran Foundation, Tarteel QUL, quran.com, fawazahmed0/quran-api, NaifAlsultan typst-quran-package, me_quran, PDMS Saleem, Khaled Hosny / SIL fonts — none ship a Qaloon-specific Naskh font with full Quranic combining-mark coverage.
- Every Quran app that supports Qaloon visually (Tarteel, quran.com, quran-android, Mushaf Mecca, AAYAAT, Quranflash) does so via **page-image rendering** (PNG/SVG of pre-typeset pages, Unicode text underneath only for selection/sharing).

**Stopgap shipped:** Substitute Amiri Quran (Khaled Hosny, OFL, hinted, full Quranic mark coverage) for Warsh and Qaloon on WebKit only. Hafs unaffected (its embolden+ttfautohint pipeline works). The `data-engine="safari"` attribute is set in `src/core/engine-detect.ts` from `navigator.vendor === "Apple Computer, Inc."` (set by every WebKit derivative including Mobile Safari, iOS Safari, headless WebKit; not by Chromium or Firefox). CSS in `src/styles/tokens/semantic.css` swaps `--qa-font-arabic` to Amiri Quran for `[data-engine='safari'][data-riwayah='warsh']` and `[data-engine='safari'][data-riwayah='qaloon']`.

**What is preserved:** Every tashkeel renders accurately — fatha, kasra, damma, sukun, shadda stacks, dagger alif U+0670, small high seen U+06EC, alif waslah ٱ, sajdah-cue marks U+06D6+. GPOS mark/mkmk anchors handle combining-mark stacking. The Qaloon / Warsh text data (Maghrebi-orthography spellings, riwaya-specific marks) is rendered exactly — only the typeface's calligraphic hand changes.

**What changes:** The calligrapher's hand shifts from Uthman Taha (KFGQPC) to Khaled Hosny (Amiri Quran). Both are Mashriqi Naskh; Amiri Quran's marks sit slightly higher above the baseline and stems are heavier. Chromium and Firefox users continue to see authentic KFGQPC typesetting.

**Long-term proper fix:** Page-image rendering for non-Hafs riwayat (industry-standard pattern across Quran apps). Tracked in `docs/context/future-work.md`.

---

## Provenance and license

- **Upstream publisher:** King Fahd Glorious Qur'an Printing Complex (مجمع الملك فهد لطباعة المصحف الشريف), Madinah, KSA.
- **Developer portal:** <https://qurancomplex.gov.sa/en/techquran/dev/>
- **Mirror used to fetch this snapshot:** <https://github.com/thetruetruth/quran-data-kfgqpc> (community mirror — not authoritative; KFGQPC is).
- **Versions pinned:** Hafs v18, Warsh v10, Qaloon v10. KFGQPC bumps versions occasionally (typo / mark fixes); re-fetch and recompute SHA-256 when upgrading.
- **License:** KFGQPC publishes these files for free personal, educational, and non-commercial use, with attribution. **Commercial / monetised distribution requires written permission** from KFGQPC. The mirror repo carries no LICENSE file — do not treat its silence as a grant.
  - Action before any monetised release: email <feedback@qurancomplex.gov.sa> for explicit permission.
  - Required attribution string (Arabic, render on About page and wherever this text is shown):
    > نص القرآن الكريم برواية {حفص / ورش / قالون} — مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة.

Update `docs/product-info.md` and the About page when wiring this dataset into a user-facing surface.

---

## Cross-references

- `docs/context/data-model.md` — IDB stores. This dataset is read-only at build time; nothing about it is written to IDB unless a future surface caches it.
- `docs/context/architecture.md` — boot flow + asset pipeline.
- `docs/context/future-work.md` — translation packs are the next dataset addition; Riwayah picker is already shipped.
