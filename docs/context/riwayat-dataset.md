# Riwayat Dataset (KFGQPC) — Source of Truth

**Scope.** This doc is the canonical reference for how the project handles Qur'anic text and its components: the three riwayat (qira'at), per-riwayah Arabic dataset, fonts, translation alignment across riwayat, and the validation/regression machinery that keeps it honest. Everything below — counts, file paths, normalization rules, alignment algorithm, validator scope — is load-bearing. Code disagreements with this doc are bugs in the code (Rule 2: update doc in same commit when behavior changes).

Authentic Qur'anic text sourced from the **King Fahd Glorious Qur'an Printing Complex (KFGQPC)** — official publisher of *Mushaf al-Madinah al-Nabawiyyah*. Three riwayat shipped:

- **Hafs** عن عاصم (Egypt, Levant, KSA, most of Muslim world)
- **Warsh** عن نافع (Maghreb, West Africa, parts of Western Europe)
- **Qaloon** عن نافع (Libya, Tunisia, parts of Mauritania)

These are the **active reader corpus** — the prior PUA-encoded Hafs corpus (quran.com-derived) was removed. `data/dataset.ts::getSurah(n)` reads `settings['riwayah']` to resolve the per-surah URL from `public/dataset/riwayat/{riwayah}/{NNN}.json`.

---

## Build pipeline

The three monolithic source files (`hafs.json` / `warsh.json` / `qaloon.json` under `public/dataset/riwayat/`) are inputs to `scripts/build-riwayat.mjs`. The script splits each into 114 per-surah files (`riwayat/{name}/{NNN}.json`), regenerates `surahs.json` (114 entries with per-Riwayah `counts`), `juz.json` (30 entries from Hafs — juz boundaries are constant across Riwayat), and writes a fresh `manifest.json` (sha256 per shipped file; `provenance.json` is hashed against a `builtAt`-stripped form so the manifest stays idempotent across no-op rebuilds) and `provenance.json` (v2.0.0). Run via `pnpm build:dataset`; chained automatically by `pnpm build`.

After source data is split into per-surah files, the verse-aliases pipeline runs `scripts/derive-verse-aliases.mjs` to emit `public/dataset/translations/_verse-aliases.json`. This is the per-ayah Hafs↔Warsh↔Qaloon equivalence table that lets translations (Hafs-keyed) display correctly when the user views Warsh or Qaloon. Algorithm + invariants documented in **§ Cross-riwayah translation alignment** below.

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

Each riwayah is paired with its own KFGQPC Uthmanic mushaf cut — the official KSA Madinah Mushaf hand, authored against that riwayah's orthography. **Cross-riwayah font reuse mis-renders combining marks** (using the Hafs cut on Warsh text was the bug behind the 2026-04-27 → 2026-04-28 churn): each cut's GPOS mark anchors are tuned to its own marks set (Warsh `U+06EC` small high rounded zero; Qaloon imala dot, naql signs; etc.). Amiri Quran (Khaled Hosny, OFL) is kept as the cross-riwayah fallback for engines or moments when KFGQPC isn't loaded.

```
public/fonts/kfgqpc-uthmanic-hafs/uthmanic_hafs_v22.woff2     ~107 KB  (Hafs)
public/fonts/kfgqpc-uthmanic-warsh/UthmanicWarsh_V21.woff2     ~91 KB  (Warsh)
public/fonts/kfgqpc-uthmanic-qaloon/UthmanicQaloun_V21.woff2   ~91 KB  (Qaloon)
public/fonts/amiri-quran/AmiriQuran-Regular.woff2             ~135 KB  (cross-riwayah fallback)
```

### Font metrics → minimum line-height

KFGQPC line-height floor ≈ **1.92** to clear stacked harakat + dagger alif + hamzat al-wasl across all three cuts. Reader uses 2.12 by default (mid step on the 5-step Reading flow slider; `src/styles/surfaces/reading-typography.css`).

For mixed Arabic + Latin lines (e.g. translation toggle), apply the Arabic line-height on the Arabic span specifically — let the Latin run inherit a tighter value or the page grows visibly.

### `@font-face` declarations

```css
@font-face {
  font-family: 'KFGQPC Uthmanic Hafs';
  src: url('/fonts/kfgqpc-uthmanic-hafs/uthmanic_hafs_v22.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
}
/* … same shape for KFGQPC Uthmanic Warsh / Qaloon and Amiri Quran fallback. */
```

Wired through tokens — `--ff-kfgqpc-{hafs,warsh,qaloon}` (defined in `src/styles/tokens/primitives.css`) → `--qa-font-arabic` (in `src/styles/tokens/semantic.css`, bound to each `[data-riwayah=...]` selector). The reader's `.qa-verse-arabic` consumes `--qa-font-arabic`.

`font-display: swap` is acceptable because Latin fallback won't render the Arabic glyphs anyway — the verse appears as `.notdef` boxes during the swap window. If that flash is unacceptable, switch to `block`.

### Cross-engine rendering

KFGQPC Uthmanic fonts render across Chromium (Skia), WebKit (CoreGraphics — macOS Safari, iOS Safari, iOS Chrome, headless WebKit), and Firefox (Gecko) when each riwayah is paired with its own cut. Cross-riwayah font reuse (e.g. the Hafs cut on Warsh text) was the source of an earlier hollow-mark bug investigation — fixed by binding `[data-riwayah='hafs']` → `--ff-kfgqpc-hafs`, `'warsh'` → `--ff-kfgqpc-warsh`, `'qaloon'` → `--ff-kfgqpc-qaloon`. Amiri Quran sits in each token's font-family chain as the cross-riwayah fallback for engines or moments when KFGQPC isn't loaded. **Regression guard:** `tests/unit/styles/font-tokens.test.js` rejects any cross-riwayah font misuse.

---

## Cross-riwayah translation alignment

Translations ship **Hafs-keyed (Kufan / Kufi numbering)**. Warsh and Qaloon follow **Madanī-1 numbering** and partition the same Qur'anic text differently. The reader resolves this at render time via `src/data/verse-aliases.ts::resolveTranslationFor` against `public/dataset/translations/_verse-aliases.json`.

### Why Hafs-keyed

The Saheeh International translation (and most modern English translations sourced from quran.com / Tanzil) come keyed by Hafs ayah indices. Re-keying every translation per riwayah is impractical and brittle. Instead, every Warsh / Qaloon ayah is mapped back to its Hafs equivalent at lookup time.

### Counting-school primer

The riwayah and the ayah-counting school are **separate variables** that travel together by convention:

| Riwayah         | Counting school | Ayah total |
|-----------------|-----------------|-----------:|
| Hafs `'an `Aṣim | **Kufi**        | 6236       |
| Warsh `'an Nāfiʿ| **Madanī-1**    | 6214       |
| Qaloon `'an Nāfiʿ| **Madanī-1**   | 6214       |

Madanī-1 ≡ Madanī-1 → Warsh and Qaloon share counts. Differences vs. Hafs come from where Madinan scholars placed verse-stop markers, not from the recitation differing on letter content.

### What "diverges" means — three cases

A surah is treated as **boundary-divergent** (and gets an alias entry) if any of these holds:

1. **Count divergence** — `surahs.json::counts` differs across the three riwayat.
2. **Boundary drift at equal counts** — `counts.hafs === counts.warsh === counts.qaloon` but ayah boundaries shift internally and resync via a compensating split. *(See § Challenges → "Boundary drift at equal counts".)*
3. **Bismillah carve-out (surah 1 only)** — counts equal, but Hafs counts the Basmala as ayah 1 while Warsh / Qaloon do not.

A surah whose alignment is true identity (every Hafs N → Warsh N → Qaloon N) is **not** emitted to `_verse-aliases.json` — the reader's identity fall-through covers it.

### Algorithm — `scripts/derive-verse-aliases.mjs`

For each surah, the script aligns the three riwayat's word streams:

1. **Word-stream cumulative alignment (primary).** Tokenise each riwayah's full surah into a normalised word list (rasm-folded; see § Normalization). Compute cumulative word counts at each ayah boundary. For each Hafs ayah ending at position `h.cum[i]`, take the contiguous Warsh / Qaloon ayat whose word ranges overlap. Hard-fails when total word counts diverge — qira'at-level word-count drift defeats this method.
2. **Ayah-DP alignment (fallback).** When word totals diverge, run a dynamic-program over ayah boundaries minimising `Σ |hWordCount − oWordSum|` per grouping, with `MAX_GROUP_SIZE = 4`. Robust against single-word qira'at substitutions; structurally correct.
3. **Bismillah carve-out (surah 1 only).** Hafs ayah 1 → `null` (no Madinan equivalent); Hafs ayah 2..7 align via word-stream against Warsh / Qaloon ayat 1..7.
4. **Identity skip.** Post-alignment, if the result is pure identity (`warsh === hafs && qaloon === hafs` for every entry), skip emit (except surah 1).

Output schema per surah entry:

```ts
{ hafs: number, warsh: number | number[] | null, qaloon: number | number[] | null }
```

- `number` → 1:1 alias
- `number[]` → Madinan split (this Hafs ayah covers multiple Warsh / Qaloon ayat)
- `null` → no Madinan equivalent (Bismillah only, in current dataset)

Multiple Hafs entries pointing at the same Madinan number → "Hafs combine" (Madinan merges what Hafs splits) — encoded by repetition.

### Reader resolution — five roles

`resolveTranslationFor(aliases, riwayah, surahNo, ayahNo)` returns one of:

| role           | Render behavior                                                              |
|----------------|------------------------------------------------------------------------------|
| `identity`     | 1:1 alias (or surah without aliases). Show full Hafs translation as-is.      |
| `merged`       | Multiple Hafs ayat → this Madinan ayah. Concat translations from each.       |
| `primary`      | First half of a Hafs split. Show full translation.                           |
| `continuation` | Subsequent half of a Hafs split. Translation lives on `primary`; show marker.|
| `none`         | No Hafs equivalent (e.g. Warsh/Qaloon surah-1 ayah 1 — Bismillah carve-out). |

Hafs viewer is always `identity` (translations match keys directly).

### Coverage stats (current build)

- **60 surahs** carry alias tables in `_verse-aliases.json`. Up from 51 (pre-2026-04-29) — see § Challenges → "Boundary drift at equal counts".
- **53 surahs** align via word-stream (high confidence). **7 surahs** fall back to ayah-DP (qira'at-level word-count drift): **7, 27, 36, 40, 41, 56, 57**. All structurally valid.
- The remaining 54 surahs have pure-identity alignment and need no alias.

### Cross-validation

Count divergences are **cross-validated against [quran-center/quran-meta](https://github.com/quran-center/quran-meta)** (Tanzil-derived independent dataset) — pinned in `tests/fixtures/quran-meta-counts.json`, asserted by `tests/unit/data/translation-riwayah-alignment.test.js`. KFGQPC's per-riwayah ayah arrays are the authoritative scholarly source for boundary positions; Tanzil is the independent integrity check.

Per-ayah equivalence is otherwise grounded in al-Dani's *Al-Bayan fi `Add Ay al-Qur'an* (d. 444 AH) — printed manuscript editions only, no machine-readable per-ayah table in public circulation as of 2026-04. KFGQPC's encoded verse-arrays are the modern proxy.

---

## Translation source pipeline

`public/dataset/translations/saheeh.raw.json` is fetched once by `scripts/fetch-translation-saheeh.mjs` from quran.com qdc API (translation id 20 = Saheeh International). The fetcher normalises HTML markup, renumbers footnote IDs per surah (1..K), and rewrites markers as `[N]`. Output committed to git so subsequent builds run offline.

`public/dataset/translations/saheeh/NNN.json` (per-surah translation packs) ship to the user. Keyed by `verse_key: "S:V"` with Hafs / Kufi numbering — by definition the same indexing as the local Hafs Arabic dataset.

**Source integrity is verified** by `scripts/validate-translation-mapping.mjs --check=B` (network mode): every local Hafs ayah and every local Saheeh translation is compared against quran.com's qdc API for the same `verse_key`. Run after re-fetching translations or bumping a riwayah dataset version.

---

## Validation & regression machinery

`scripts/validate-translation-mapping.mjs` is the source-of-truth checker for everything in this doc. Three modes:

| Mode | Network? | What it asserts |
|------|----------|-----------------|
| `--check=A` (alias-coverage)        | offline | Re-runs word-stream + ayah-DP alignment for ALL 114 surahs (no count-equality skip). Flags any surah whose alignment is non-identity but is missing from `_verse-aliases.json`. |
| `--check=B` (translation-source)    | network | Diffs local Hafs Arabic + local Saheeh English vs. quran.com qdc API per `verse_key`. Catches data corruption + key drift. |
| `--check=C` (cross-riwayah-render)  | offline | Simulates Reader's `resolveTranslationFor` lookup for every Warsh / Qaloon ayah against the SHIPPED `_verse-aliases.json`. Asserts the resolved Hafs ayah(s) have ≥0.55 Jaccard word-set similarity with the Madinan ayah. Catches "Madinan ayah aliased to a completely different Hafs ayah". |

Default `--check=all`. Output: `tmp/translation-mapping-report.json` + console summary (errors / warnings / info, by check, by kind).

**Run before bumping a riwayah dataset version. Run after re-fetching translations.** Required before merging any change touching `derive-verse-aliases.mjs`, `fetch-translation-saheeh.mjs`, `_verse-aliases.json`, or the per-riwayah JSON.

Current expected baseline: **0 errors, 48 warnings, 3 info**. Warnings are qira'at-level word substitutions tolerated by Jaccard ≥ 0.55. Info-level entries are word-segmentation differences between editions (see § Challenges → "Word segmentation differs between editions"). Any new error == regression.

---

## Challenges encountered

This section is the war-story counterpart to the algorithms above. Future readers re-encountering these traps should find the answer here before re-deriving it from first principles.

### 1. KFGQPC fonts are riwayah-bound; cross-use mangles marks

**Symptom (2026-04-27).** Warsh ayat rendered with hollow / displaced combining marks across Chromium and WebKit. Qaloon worse.

**Cause.** `--qa-font-arabic` was bound to `--ff-kfgqpc-hafs` for all riwayat. The KFGQPC Hafs cut's GPOS mark anchors are tuned to Hafs's mark inventory only. Warsh-specific marks (`U+06EC` small high rounded zero, etc.) and Qaloon imala/naql signs have no anchor in the Hafs cut → engine fallback or `.notdef`.

**Fix.** Per-riwayah binding: `[data-riwayah='hafs']` → `--ff-kfgqpc-hafs`, `'warsh'` → `--ff-kfgqpc-warsh`, `'qaloon'` → `--ff-kfgqpc-qaloon`. Amiri Quran kept as cross-riwayah fallback. Regression guard: `tests/unit/styles/font-tokens.test.js`.

**Takeaway.** Treat each KFGQPC riwayah cut as a discrete font; never substitute. The text is also bound to its cut: the same Unicode codepoint sequence carries different visual semantics across riwayat (e.g. dagger alif vs. silent alif marker). Pairing matters as much for legibility as for correctness.

### 2. Boundary drift at equal counts (the Al-A`raf bug)

**Symptom (reported 2026-04-29).** When viewing Warsh, the translation shown for surah 7 ayah 1 was "Alif, Lām, Meem, Ṣād" — but Warsh ayah 1 actually contains "الٓمٓصٓ كِتَٰبٌ أُنزِلَ إِلَيۡكَ..." (the muqatta'at AND the start of the next clause merged). The correct full translation (Hafs ayah 1 + 2 concatenated) was missing.

**Cause.** `derive-verse-aliases.mjs` skipped any surah where Hafs / Warsh / Qaloon counts were equal:

```js
if (!isCountDivergent && n !== 1) { continue }   // ← bug
```

The reader then identity-mapped (`Madinan N → Hafs N`). For 9 surahs this is wrong: counts agree (e.g. surah 7: 206/206/206) but **internal boundaries differ**. Hafs splits muqatta'at-then-clause as ayah 1 vs. ayah 2; Madanī merges them as ayah 1; Madanī compensates with a later split (in surah 7, Hafs ayah 138 splits into Warsh / Qaloon 137+138 to resync). Net count is preserved; per-ayah identity is not.

**Affected surahs.** **3, 7, 15, 28, 29, 32, 43, 69, 103.**

**Fix.** Drop the count-equality skip; replace with post-alignment identity check:

```js
const isIdentity = merged.every((a) => a.warsh === a.hafs && a.qaloon === a.hafs)
if (isIdentity && n !== 1) { continue }
```

Word-stream / ayah-DP alignment runs unconditionally; only TRULY identity-aligned surahs are skipped. Alias coverage went **51 → 60 surahs**.

**Regression guard.** `tests/unit/data/translation-riwayah-alignment.test.js` — explicit assertion that all 9 boundary-drift surahs have non-identity alias entries. Validated via Rule 5 break-and-restore (test fails on the buggy script, passes after fix).

**Takeaway.** Equal counts ≠ identity boundaries. The only sound check is to actually align the word streams and inspect the result; counts are a false-positive-prone proxy. Future work that touches the alignment pipeline should likewise distrust shortcuts that bypass alignment entirely.

### 3. Arabic normalization is not "strip diacritics"

Comparing Arabic text across editions, riwayat, and sources requires a normalizer that can fold:

| Issue | Hafs (KFGQPC) example | Warsh / quran.com example | Fix |
|-------|-----------------------|---------------------------|-----|
| Tashkeel (basic harakat) | `بِسۡمِ` | `بِسْمِ` | Strip via `\p{M}/u` |
| Sukun variant | `U+06E1` (small high khah) | `U+0652` (sukun) | Both stripped as marks |
| Alif khanjariyah / dagger alif | `عَيۡنَانِ` (explicit alif) | `عَيۡنَٰنِ` (U+0670, silent alif) | **Promote** ٰ → ا BEFORE stripping marks |
| Yeh barree (Maghrebi) | `أَمْرِي` | `أَمْرِے` (U+06D2) | Map ے → ي |
| Hamza-on-yeh | `يَستَهۡزِئُ` (with hamza) | `يَستَهۡزِيُ` (without) | Map ئ → ي; strip standalone ء/ؤ |
| Alif-wasla | `ٱلۡحَمۡدُ` (U+0671) | `الْحَمْدُ` (U+0627) | Map ٱ → ا |
| Madda-alif | `ءَالَآءِ` (U+0622) | (varies) | Map آ → ا |
| Taa marbuta | `جَنَّةٖ` | `جَنَّهٖ` | Map ة → ه |
| Tatweel (kashida) | `ٱلرَّحۡمَٰنِ` | `ٱلرَّحْمَـٰنِ` (extra U+0640) | Strip tatweel |
| Word fusion | `مَالِيَ` (joined) | `مَا لِىَ` (split, qdc) | Letter-only compare (drop spaces) for source-integrity check |

**Order matters.** Promote ٰ → ا BEFORE the `\p{M}` strip — otherwise the dagger alif is removed and "ʿaynāni" tokenises as "ʿaynni", breaking Jaccard against Hafs. This was the source of a 879→6→0 errors trajectory while building check C.

**Implementation.** Normalisation is duplicated (intentionally) in `scripts/derive-verse-aliases.mjs::normalise` and `scripts/validate-translation-mapping.mjs::normaliseArabic`. Both must stay in lockstep — when you change one, change the other. The validator's check A enforces this implicitly (validator's freshly-derived alignment is compared against the shipped table; divergence is flagged as `missing-alias-entry`).

**Why this can't go in `src/`.** The reader never compares Arabic to Arabic at runtime — translation lookup is index-based. Build-time only.

### 4. Qira'at-level word substitutions vs. wrong alignments

Cross-riwayah ayah pairs that ARE correctly aligned often still differ at word level (e.g. Hafs `يَغۡفِرۡ` vs. Warsh `نَغۡفِرۡ`). Strict word-multiset equality reports these as alignment errors (4829 false positives in the original validator pass).

**Resolution.** Use **word-set Jaccard similarity** with a 0.55 floor + word-count-ratio ≤ 1.6 ceiling. Catches "Madinan ayah aliased to a completely different Hafs ayah" (Jaccard near 0) without flagging "1-2 words substituted" (Jaccard ≥ 0.7 typically).

**Tunable knobs.** `JACCARD_THRESHOLD` and `WORD_COUNT_RATIO_MAX` in `validate-translation-mapping.mjs`. Lowering thresholds risks false negatives (real misalignments with high lexical overlap); raising thresholds re-introduces qira'at false positives. Current values calibrated against zero false-positive errors and the 9 actual boundary-drift surahs.

### 5. Word segmentation differs between editions (KFGQPC ↔ quran.com qdc)

**Symptom.** Check B reported 3 ayat where local Hafs Arabic differed from quran.com qdc Hafs Arabic for the same `verse_key`: surah 15:7, 27:20, 36:22.

**Cause.** Editorial choice on fused particles. KFGQPC writes `لَّوۡمَا` / `مَالِيَ` / `وَمَالِيَ` joined; qdc writes `لَّوْ مَا` / `مَا لِىَ` / `وَمَا لِىَ` split. **Same letters, same recitation, same content** — different printing convention.

**Resolution.** Source-integrity comparison drops whitespace (`text.replace(/\s+/g, '')`) and reports surviving differences as `arabic-text-drift` errors, while pure space-only differences are demoted to `info`-level `word-segmentation-diff`. Both forms ship correctly because the user-facing reader is layout-driven, not segmentation-driven.

### 6. `null` value in `text_uthmani` from qdc

Not yet hit, but documented for future: qdc's `text_uthmani` field has been observed empty for some legacy translation IDs. The validator's check B uses `r.text_uthmani ?? ''` — if it goes empty, the comparison silently turns into "remote was empty, all 6236 ayat drift". Watch for sudden 6236-error counts.

### 7. Why we don't use Tanzil's verse aliases directly

Tanzil ships a `quran-data.xml` with per-counting-school ayah counts but **not** a per-ayah Hafs↔Warsh boundary alias table. al-Dani's *Al-Bayan fi `Add Ay al-Qur'an* is the classical authority but is only available as printed / scanned manuscript — no machine-readable transcription in public circulation. Mechanical alignment from KFGQPC's word streams is the only auditable, self-contained option.

When KFGQPC and Tanzil disagree on a count divergence, KFGQPC is canonical (the source of the Arabic text we ship). Tanzil is the integrity sanity check.

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
- **Saheeh translation source:** quran.com qdc API, translation id 20 (Saheeh International Foundation). Free for non-commercial distribution.

Update `docs/product-info.md` and the About page when wiring this dataset into a user-facing surface.

---

## Cross-references

- `docs/context/data-model.md` — IDB stores. This dataset is read-only at build time; nothing about it is written to IDB unless a future surface caches it. Translation ↔ riwayah alignment schema lives there too.
- `docs/context/architecture.md` — boot flow + asset pipeline.
- `docs/context/future-work.md` — additional translation packs (Pickthall, Yusuf Ali, transliteration) deferred. Once added, each will need its own check-B network audit and per-pack `provenance.json::translations[]` entry.
- `scripts/derive-verse-aliases.mjs` — alias derivation source-of-truth.
- `scripts/validate-translation-mapping.mjs` — three-mode validator. Run before any riwayah / translation dataset change.
- `tests/unit/data/translation-riwayah-alignment.test.js` — count-divergence + boundary-drift regression guards.
- `tests/unit/data/verse-aliases-resolver.test.js` — `resolveTranslationFor` role logic.
