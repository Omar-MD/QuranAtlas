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

All three riwayat render in **Amiri Quran** (Khaled Hosny, OFL) — a single Mashriqi Naskh face with full Quranic mark coverage that renders identically on every engine (Skia / CoreGraphics / Gecko). The riwayah text data (Maghrebi-orthography spellings, riwaya-specific marks like small high seen `U+06EC` for Warsh/Qaloon) drives the orthographic differences; only the calligrapher's hand is unified.

```
public/fonts/amiri-quran/
  AmiriQuran-Regular.woff2    ~135 KB
```

### Font metrics → minimum line-height

`unitsPerEm = 1024`, `OS/2 sTypoAscender = 1990`, `sTypoDescender = -1138`. CSS `line-height` floor ≈ **1.92** to clear stacked harakat + dagger alif + hamzat al-wasl. Reader uses 2.12 by default (mid step on the 5-step Reading flow slider; `src/styles/surfaces/reading-typography.css`).

For mixed Arabic + Latin lines (e.g. translation toggle), apply the Arabic line-height on the Arabic span specifically — let the Latin run inherit a tighter value or the page grows visibly.

### `@font-face` declaration

```css
@font-face {
  font-family: 'Amiri Quran';
  src: url('/fonts/amiri-quran/AmiriQuran-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
}
```

Wired through tokens — `--ff-amiri-quran` (defined in `src/styles/tokens/primitives.css`) → `--qa-font-arabic` (in `src/styles/tokens/semantic.css`, bound for all three `[data-riwayah=...]` selectors). The reader's `.qa-verse-arabic` consumes `--qa-font-arabic`.

`font-display: swap` is acceptable because Latin fallback won't render the Arabic glyphs anyway — the verse appears as `.notdef` boxes during the swap window. If that flash is unacceptable, switch to `block`.

---

## Cross-engine rendering

Amiri Quran is professionally hinted (Khaled Hosny / aliftype) and renders identically on Chromium (Skia), WebKit (CoreGraphics — macOS Safari, iOS Safari, iOS Chrome, headless WebKit), and Firefox (Gecko). Every tashkeel renders accurately — fatha, kasra, damma, sukun, shadda stacks, dagger alif `U+0670`, small high seen `U+06EC`, alif waslah `ٱ`, sajdah-cue marks `U+06D6+`. GPOS mark/mkmk anchors handle combining-mark stacking on every engine. No engine-conditional fallback, no post-processing pipeline, no `data-engine` attribute.

### History — KFGQPC fonts retired 2026-04-27

The app previously shipped KFGQPC Hafs v0.18, Warsh v0.10, and Qaloon v0.10 (Uthman Taha's hand, official Madinah Mushaf). Two unrelated rendering bugs forced replacement:

1. **Hafs (v0.18)** — shipped unhinted (no `fpgm` / `prep` / `cvt` tables). Skia auto-hinted; CoreGraphics did not, rendering hairline. Worked around with a perpendicular outline-embolden + `ttfautohint --default-script=arab --stem-width-mode=sqq` pipeline.
2. **Warsh + Qaloon (v0.10)** — outline geometry rendered as hollow / broken combining-mark stacks in CoreGraphics. Not fixable via post-processing (verified `ttfautohint`, embolden, `skia-pathops removeOverlaps`). Worked around by substituting Amiri Quran on WebKit only via `[data-engine='safari']` CSS rule.

Maintaining a two-track font pipeline plus an engine-detection attribute for what was effectively "use Amiri Quran on Safari" was net-negative complexity. Single-font-everywhere is cleaner: same calligraphic hand cross-engine, no asset post-processing, no engine sniffing, smaller bundle (~390 KB of KFGQPC woff2 dropped). The KFGQPC *text dataset* (per-surah JSON under `public/dataset/riwayat/{hafs,warsh,qaloon}/`) is unchanged and remains the canonical content source — only the rendering font changed.

For users who want the authentic Uthman Taha typesetting (Madinah Mushaf hand) or the Tarabulsi typesetting (Libyan Jamahiriya Mushaf), the long-term path is page-image rendering — see `docs/context/future-work.md`. That route ships pre-typeset PDF/PNG pages from the official mushaf, preserving every calligrapher's hand at the cost of asset size and the ability to live-restyle text.

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
