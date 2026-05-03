/**
 * QuranAtlas dataset build pipeline.
 *
 * Reads normalized source files committed to the repo:
 *   data/normalized/quran/riwayat/{hafs,warsh,qaloon}.json
 *   data/normalized/translations/{id}.json
 *   data/normalized/tafsir/{id}.json
 *
 * Emits:
 *   public/dataset/riwayat/{name}/{NNN}.json          (per selected profile)
 *   public/dataset/translations/{id}/{NNN}.json       (114 per shipped translation)
 *   public/dataset/surahs.json                        (114 entries, per-Riwayah counts)
 *   public/dataset/juz.json                           (30 entries)
 *   public/dataset/manifest.json                      (inventory per shipped file)
 *   public/dataset/provenance.json                    (corpus + Riwayah + translations + font metadata)
 *
 * Run via: pnpm run data -- build
 *
 * Source files are produced by scripts/data/fetch-source.mjs and committed so this
 * build runs offline.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { pad3, parseAyahKey } from '../lib/ayah.mjs'
import { cleanPackDirs } from '../lib/fs.mjs'
import { buildManifestPayload } from '../manifest/inventory.mjs'
import { loadSourceCatalog, validateSourceCatalog } from '../sources/catalog.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const RIWAYAT_SOURCE_DIR = join(REPO_ROOT, 'data', 'normalized', 'quran', 'riwayat')
const NORMALIZED_TRANSLATIONS_DIR = join(REPO_ROOT, 'data', 'normalized', 'translations')
const NORMALIZED_TAFSIR_DIR = join(REPO_ROOT, 'data', 'normalized', 'tafsir')
const RIWAYAT_DIR = join(DATASET_DIR, 'riwayat')                            // shipped output (per-surah split files)
const TRANSLATIONS_DIR = join(DATASET_DIR, 'translations')
const TAFSIR_DIR = join(DATASET_DIR, 'tafsir')
const INDEXES_DIR = join(DATASET_DIR, 'indexes')
const VERSE_MAP_PATH = join(TRANSLATIONS_DIR, '_verse-map.json')
const VERSE_ALIASES_PATH = join(TRANSLATIONS_DIR, '_verse-aliases.json')

/**
 * Translations shipped in the dataset. Each entry resolves a normalized
 * source file produced by its fetch script. Add new entries here when adding
 * a translation pack — the build phase auto-handles them.
 */
const SHIPPED_TRANSLATIONS = [
  {
    id: 'saheeh',
    normalizedFile: 'saheeh.json',
    label: 'Saheeh International',
    translator: 'Saheeh International',
    language: 'en',
    license: 'Free for non-commercial distribution (Saheeh International Foundation)',
    licenseUrl: 'https://saheehinternational.com/',
    source: 'Quran DB translation: Umm Muhammad (Sahih International)',
    sourceUrl: 'https://raw.githubusercontent.com/faisalill/quran_db/main/ummmuhammadsahihinternational.json',
  },
  {
    id: 'bridges',
    normalizedFile: 'bridges.json',
    label: 'Bridges',
    translator: 'Fadel Soliman',
    language: 'en',
    license: 'Quran DB upstream translation source',
    licenseUrl: 'https://github.com/faisalill/quran_db',
    source: 'Quran DB translation: Bridges',
    sourceUrl: 'https://raw.githubusercontent.com/faisalill/quran_db/main/bridges.json',
  },
  {
    id: 'clear-quran',
    normalizedFile: 'clear-quran.json',
    label: 'The Clear Quran',
    translator: 'Mustafa Khattab',
    language: 'en',
    license: 'Quran DB upstream translation source',
    licenseUrl: 'https://github.com/faisalill/quran_db',
    source: 'Quran DB translation: Mustafa Khattab 2018',
    sourceUrl: 'https://raw.githubusercontent.com/faisalill/quran_db/main/mustafakhattab2018.json',
  },
  {
    id: 'abdel-haleem',
    normalizedFile: 'abdel-haleem.json',
    label: 'M.A.S. Abdel Haleem',
    translator: 'M.A.S. Abdel Haleem',
    language: 'en',
    license: 'Quran DB upstream translation source',
    licenseUrl: 'https://github.com/faisalill/quran_db',
    source: 'Quran DB translation: Abdel Haleem',
    sourceUrl: 'https://raw.githubusercontent.com/faisalill/quran_db/main/abdelhaleem.json',
  },
]

const SHIPPED_TAFSIR = [
  {
    id: 'muyassar',
    normalizedFile: 'muyassar.json',
    label: 'Tafsir Muyassar',
    language: 'ar',
    license: 'QUL downloadable resource',
    licenseUrl: 'https://qul.tarteel.ai/resources/tafsir/38',
    source: 'QUL tafsir resource 38',
    sourceUrl: 'https://qul.tarteel.ai/resources/tafsir/38',
  },
  {
    id: 'mukhtasar',
    normalizedFile: 'mukhtasar.json',
    label: 'Al-Mukhtasar fi al-Tafsir',
    language: 'ar',
    license: 'QUL downloadable resource',
    licenseUrl: 'https://qul.tarteel.ai/resources/tafsir/251',
    source: 'QUL tafsir resource 251',
    sourceUrl: 'https://qul.tarteel.ai/resources/tafsir/251',
  },
  {
    id: 'saadi',
    normalizedFile: 'saadi.json',
    label: "Tafsir al-Sa'di",
    language: 'ar',
    license: 'QUL downloadable resource',
    licenseUrl: 'https://qul.tarteel.ai/resources/tafsir/24',
    source: 'QUL tafsir resource 24',
    sourceUrl: 'https://qul.tarteel.ai/resources/tafsir/24',
  },
]

export const AYAT_COUNTS = { hafs: 6236, warsh: 6214, qaloon: 6214 }
export const RIWAYAT = ['hafs', 'warsh', 'qaloon']
export const DEFAULT_RIWAYAH = 'qaloon'
export const DEFAULT_TRANSLATION = 'saheeh'
export const DEFAULT_TAFSIR = 'muyassar'

const DATASET_PROFILES = {
  baseline: {
    name: 'baseline',
    riwayat: [DEFAULT_RIWAYAH],
    translations: [DEFAULT_TRANSLATION],
    tafsir: [DEFAULT_TAFSIR],
  },
  full: {
    name: 'full',
    riwayat: RIWAYAT,
    translations: SHIPPED_TRANSLATIONS.map((t) => t.id),
    tafsir: SHIPPED_TAFSIR.map((t) => t.id),
  },
  catalog: {
    name: 'catalog',
    riwayat: [],
    translations: [],
    tafsir: [],
  },
}

export function getDatasetProfile(name = 'baseline') {
  const profile = DATASET_PROFILES[name]
  if (!profile) {
    throw new Error(`Unknown dataset profile: ${name}`)
  }
  return {
    name: profile.name,
    riwayat: [...profile.riwayat],
    translations: [...profile.translations],
    tafsir: [...profile.tafsir],
  }
}

function parseProfileArg(argv = process.argv.slice(2)) {
  const explicit = argv.find((arg) => arg.startsWith('--profile='))
  return explicit ? explicit.slice('--profile='.length) : 'baseline'
}

// minLineHeight = unitless line-height at the xs step on the Reading-flow
// slider. KFGQPC tashkeel (esp. shadda + alif khanjariyya) collides with
// the line above at the font's design metric (1.72–1.76); 1.92 matches
// conventional Madinah mushaf leading. Mirrored in
// src/settings/reading-typography.ts (RIWAYAH_FLOOR); keep in sync.
const RIWAYAH_META = {
  hafs:   { label: 'Ḥafṣ ʿan ʿĀṣim',   version: '18', fontFamily: 'KFGQPC Hafs',   minLineHeight: 1.92 },
  warsh:  { label: 'Warsh ʿan Nāfiʿ',  version: '10', fontFamily: 'KFGQPC Warsh',  minLineHeight: 1.92 },
  qaloon: { label: 'Qālūn ʿan Nāfiʿ',  version: '10', fontFamily: 'KFGQPC Qaloon', minLineHeight: 1.92 },
}

const FONT_PATHS = {
  hafs:   { woff2: '/fonts/kfgqpc-hafs/hafs.18.woff2',     ttf: '/fonts/kfgqpc-hafs/hafs.18.ttf' },
  warsh:  { woff2: '/fonts/kfgqpc-warsh/warsh.10.woff2',   ttf: '/fonts/kfgqpc-warsh/warsh.10.ttf' },
  qaloon: { woff2: '/fonts/kfgqpc-qaloon/qaloon.10.woff2', ttf: '/fonts/kfgqpc-qaloon/qaloon.10.ttf' },
}

const PACKAGE_VERSION = '2.1.0'

/**
 * Strip the trailing in-text Arabic-Indic verse number from `aya_text`.
 * KFGQPC bundles e.g. "اِ۬لْحَمْدُ … ١" — the "١" is redundant because
 * `aya_no` already carries the number and the reader UI renders it as a
 * separate badge. Audited 2026-04-26 across all 18664 ayat in the three
 * Riwayat: regex matches every ayah, captured digit numerically equals
 * `aya_no` every time. Throws when the captured digit disagrees with
 * `aya_no` (defensive — would catch a future KFGQPC layout change).
 */
const A_INDIC_TO_WESTERN = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [String.fromCharCode(0x0660 + i), String(i)]),
)
const TRAILING_AYA_NUMBER_RE = /[ \s]+([٠-٩]+)\s*$/

function stripTrailingAyaNumber(text, ayaNo) {
  const m = TRAILING_AYA_NUMBER_RE.exec(text)
  if (!m) {
    throw new Error(`Expected trailing Arabic-Indic digit on ayah ${ayaNo}, got: ${JSON.stringify(text.slice(-20))}`)
  }
  const western = parseInt(m[1].split('').map((c) => A_INDIC_TO_WESTERN[c] ?? '?').join(''), 10)
  if (western !== ayaNo) {
    throw new Error(`Captured digit ${m[1]} (= ${western}) does not match aya_no ${ayaNo}; refusing to strip`)
  }
  return text.slice(0, m.index)
}

/**
 * Split a flat KFGQPC ayah array into per-surah objects keyed by zero-padded surah number.
 * Normalises Hafs's `sora` field to `sura_no` for cross-Riwayah consistency.
 * Strips the trailing Arabic-Indic verse number from `aya_text` (see above).
 */
export function splitRiwayah(riwayah, ayat) {
  const grouped = {}
  for (const a of ayat) {
    const suraNo = a.sura_no ?? a.sora
    const key = pad3(suraNo)
    if (!grouped[key]) {
      grouped[key] = {
        riwayah,
        version: RIWAYAH_META[riwayah].version,
        sura_no: suraNo,
        sura_name_ar: (a.sura_name_ar ?? a.sora_name_ar ?? '').trim(),
        sura_name_en: a.sura_name_en ?? a.sora_name_en,
        ayat: [],
      }
    }
    // Drop source-only transliteration and keep Hafs page-line fields only;
    // the non-Hafs sources do not carry authored page-line metadata.
    const ayah = {
      jozz: a.jozz,
      page: a.page,
      aya_no: a.aya_no,
      aya_text: stripTrailingAyaNumber(a.aya_text, a.aya_no),
    }
    if (riwayah === 'hafs') {
      ayah.id = a.id
      ayah.line_start = a.line_start
      ayah.line_end = a.line_end
    }
    grouped[key].ayat.push(ayah)
  }
  return grouped
}

/**
 * Build the 114-entry surahs metadata array. Names taken from the default
 * Riwayah (Qaloon); per-Riwayah ayah counts embedded.
 */
export function computeSurahsMeta(namesEn, namesAr, perRiwayahCounts) {
  return Array.from({ length: 114 }, (_, i) => ({
    n: i + 1,
    name: namesEn[i],
    name_ar: namesAr[i],
    counts: {
      hafs:   perRiwayahCounts.hafs[i],
      warsh:  perRiwayahCounts.warsh[i],
      qaloon: perRiwayahCounts.qaloon[i],
    },
  }))
}

/**
 * Validate + split a monolithic translation source into per-surah payloads.
 * Hafs verse counts are passed in; mismatched upstream counts hard-fail
 * (would indicate a different mushaf counting and thus text/verse drift).
 *
 * Asserts: 114 surahs present, per-surah verse count matches Hafs, verse keys
 * are exactly "{surah}:{n}" for 1..count, every [N] marker resolves to
 * footnotes[N], footnote keys are contiguous 1..K, and every defined
 * footnote is referenced at least once.
 */
const MARKER_RE = /\[(\d+)\]/g

export function buildTranslationSplits(rawSource, expectedHafsCounts) {
  if (!rawSource || typeof rawSource !== 'object' || !rawSource.surahs) {
    throw new Error('translation raw source missing `surahs`')
  }
  const ids = Object.keys(rawSource.surahs)
  if (ids.length !== 114) {
    throw new Error(`translation has ${ids.length} surahs, expected 114`)
  }
  const perSurah = {}
  let totalVerses = 0
  let totalFootnotes = 0
  for (let n = 1; n <= 114; n++) {
    const key = pad3(n)
    const src = rawSource.surahs[key]
    if (!src) {
      throw new Error(`translation missing surah ${key}`)
    }
    const expected = expectedHafsCounts[n - 1]
    if (!Array.isArray(src.verses) || src.verses.length !== expected) {
      throw new Error(`translation surah ${key} verse count ${src.verses?.length} != Hafs ${expected}`)
    }
    for (let i = 0; i < src.verses.length; i++) {
      const expectedKey = `${n}:${i + 1}`
      if (src.verses[i].key !== expectedKey) {
        throw new Error(`translation surah ${key} verse[${i}].key=${src.verses[i].key} expected ${expectedKey}`)
      }
      if (typeof src.verses[i].text !== 'string' || !src.verses[i].text) {
        throw new Error(`translation surah ${key} verse[${i}] missing text`)
      }
    }
    const fnKeys = Object.keys(src.footnotes || {})
    const expectedFnKeys = new Set(Array.from({ length: fnKeys.length }, (_, i) => String(i + 1)))
    if (fnKeys.length !== expectedFnKeys.size || fnKeys.some((k) => !expectedFnKeys.has(k))) {
      throw new Error(`translation surah ${key} footnote keys non-contiguous: ${fnKeys.join(',')}`)
    }
    const seenMarkers = new Set()
    for (const v of src.verses) {
      for (const m of v.text.matchAll(MARKER_RE)) {
        const idx = m[1]
        if (!src.footnotes || !(idx in src.footnotes)) {
          throw new Error(`translation surah ${key} verse ${v.key}: marker [${idx}] has no matching footnote`)
        }
        seenMarkers.add(idx)
      }
    }
    for (const k of fnKeys) {
      if (!seenMarkers.has(k)) {
        throw new Error(`translation surah ${key}: footnote ${k} defined but never referenced`)
      }
    }
    perSurah[key] = {
      translationId: rawSource.translationId,
      translationVersion: rawSource.translationVersion,
      surahNo: n,
      intro: Array.isArray(src.intro) ? src.intro : [],
      verses: src.verses.map((v) => ({ key: v.key, text: v.text })),
      footnotes: { ...src.footnotes },
    }
    totalVerses += src.verses.length
    totalFootnotes += fnKeys.length
  }
  return { perSurah, totals: { verses: totalVerses, footnotes: totalFootnotes } }
}

export function normalizeQulTafsir(tafsirId, rawSource, options = {}) {
  if (!rawSource || typeof rawSource !== 'object' || Array.isArray(rawSource)) {
    throw new Error('QUL tafsir source must be an object')
  }
  const entries = []
  for (const [key, value] of Object.entries(rawSource)) {
    if (typeof value === 'string') continue
    if (!value || typeof value !== 'object') {
      throw new Error(`QUL tafsir ${key} must be an object or group pointer`)
    }
    const ayahKeys = Array.isArray(value.ayah_keys) ? value.ayah_keys : [key]
    if (ayahKeys.length === 0) {
      throw new Error(`QUL tafsir ${key} has no ayah_keys`)
    }
    for (const ayahKey of ayahKeys) parseAyahKey(ayahKey)
    entries.push({
      id: key,
      startKey: ayahKeys[0],
      endKey: ayahKeys[ayahKeys.length - 1],
      ayahKeys,
      sourceGranularity: ayahKeys.length > 1 ? 'range' : 'ayah',
      text: String(value.text ?? ''),
    })
  }
  entries.sort((a, b) => {
    const pa = parseAyahKey(a.startKey)
    const pb = parseAyahKey(b.startKey)
    return pa.surah - pb.surah || pa.ayah - pb.ayah
  })
  return {
    tafsirId,
    tafsirVersion: options.tafsirVersion ?? `qul-resource-${options.resourceId ?? tafsirId}`,
    language: options.language ?? 'ar',
    entries,
  }
}

export function buildTafsirSplits(normalizedSource) {
  if (!normalizedSource || typeof normalizedSource !== 'object' || !Array.isArray(normalizedSource.entries)) {
    throw new Error('normalized tafsir source missing entries')
  }
  const perSurah = {}
  for (const entry of normalizedSource.entries) {
    const { surah } = parseAyahKey(entry.startKey)
    const key = pad3(surah)
    if (!perSurah[key]) {
      perSurah[key] = {
        tafsirId: normalizedSource.tafsirId,
        tafsirVersion: normalizedSource.tafsirVersion,
        language: normalizedSource.language,
        surahNo: surah,
        entries: [],
      }
    }
    perSurah[key].entries.push({
      id: entry.id,
      startKey: entry.startKey,
      endKey: entry.endKey,
      ayahKeys: entry.ayahKeys,
      sourceGranularity: entry.sourceGranularity,
      text: entry.text,
    })
  }
  return perSurah
}

/**
 * Validate _verse-map.json against the freshly-computed surahs.json counts.
 * The verse-map is the canonical fact file enumerating every surah whose
 * verse-count diverges across the three riwayat. Translations are keyed to
 * the primary riwayah (Hafs / Kufan numbering); Warsh and Qaloon (Madinan
 * numbering) partition the same Quranic text differently in the surahs
 * listed there, which is why a Hafs-numbered translation cannot 1:1 map to
 * every Warsh / Qaloon ayah without explicit scholarly aliases.
 *
 * Hard-fails when the verse-map's listed divergences drift from what
 * surahs.json actually says — dataset bumps must update both in lockstep.
 */
export function validateVerseMap(verseMap, surahsMeta) {
  if (!verseMap || typeof verseMap !== 'object') {
    throw new Error('_verse-map.json missing or not an object')
  }
  if (verseMap?._meta?.primaryRiwayah !== 'hafs') {
    throw new Error(`_verse-map.json _meta.primaryRiwayah must be 'hafs', got ${verseMap?._meta?.primaryRiwayah}`)
  }
  if (!Array.isArray(verseMap.divergences)) {
    throw new Error('_verse-map.json divergences must be an array')
  }
  const actualDivergent = surahsMeta
    .filter((s) => !(s.counts.hafs === s.counts.warsh && s.counts.warsh === s.counts.qaloon))
    .map((s) => ({ surah: s.n, counts: s.counts }))
  const declared = new Map(verseMap.divergences.map((d) => [d.surah, d.counts]))
  const actual = new Map(actualDivergent.map((d) => [d.surah, d.counts]))
  const missingFromMap = [...actual.keys()].filter((n) => !declared.has(n))
  const extraInMap = [...declared.keys()].filter((n) => !actual.has(n))
  if (missingFromMap.length > 0 || extraInMap.length > 0) {
    throw new Error(
      `_verse-map.json divergences drift from surahs.json — `
      + `missing surahs: [${missingFromMap.join(',')}], extra: [${extraInMap.join(',')}]. `
      + `Regenerate _verse-map.json to match.`,
    )
  }
  for (const [surah, counts] of actual) {
    const dec = declared.get(surah)
    if (dec.hafs !== counts.hafs || dec.warsh !== counts.warsh || dec.qaloon !== counts.qaloon) {
      throw new Error(
        `_verse-map.json surah ${surah} counts ${JSON.stringify(dec)} `
        + `disagree with surahs.json ${JSON.stringify(counts)}`,
      )
    }
  }
  return { divergent: actual.size }
}

/**
 * Validate _verse-aliases.json against the per-surah ayah counts. The aliases
 * are mechanically derived from KFGQPC by `scripts/data/derive-verse-aliases.mjs`;
 * this validator hard-fails when:
 *   - the aliases file is missing
 *   - any divergent surah lacks alias entries
 *   - the aliases reference an ayah index outside the riwayah's actual count
 *   - the alias count for a surah does not equal Hafs's ayah count
 *
 * Surah 1 (Al-Fatiha) is included for the Bismillah carve-out even though
 * counts agree across riwayat — semantically divergent.
 */
export function validateVerseAliases(verseAliases, surahsMeta) {
  if (!verseAliases || typeof verseAliases !== 'object') {
    throw new Error('_verse-aliases.json missing or not an object')
  }
  if (!verseAliases.aliases || typeof verseAliases.aliases !== 'object') {
    throw new Error('_verse-aliases.json: `aliases` must be an object')
  }
  const expectedSurahs = surahsMeta
    .filter((s) => s.n === 1 || !(s.counts.hafs === s.counts.warsh && s.counts.warsh === s.counts.qaloon))
    .map((s) => s.n)
  for (const n of expectedSurahs) {
    const entries = verseAliases.aliases[String(n)]
    const meta = surahsMeta.find((s) => s.n === n)
    if (!Array.isArray(entries)) {
      throw new Error(`_verse-aliases.json missing surah ${n}`)
    }
    if (entries.length !== meta.counts.hafs) {
      throw new Error(`_verse-aliases.json surah ${n}: ${entries.length} entries, expected ${meta.counts.hafs} (hafs count)`)
    }
    for (const entry of entries) {
      if (typeof entry.hafs !== 'number') {
        throw new Error(`_verse-aliases.json surah ${n}: entry missing hafs index`)
      }
      for (const r of ['warsh', 'qaloon']) {
        const v = entry[r]
        if (v === null) { continue }
        const indices = Array.isArray(v) ? v : [v]
        for (const idx of indices) {
          if (!Number.isInteger(idx) || idx < 1 || idx > meta.counts[r]) {
            throw new Error(`_verse-aliases.json surah ${n} hafs ${entry.hafs}: ${r} index ${idx} out of range [1..${meta.counts[r]}]`)
          }
        }
      }
    }
  }
  return { surahCount: expectedSurahs.length, totalAliasedSurahs: Object.keys(verseAliases.aliases).length }
}

/**
 * Compute coverage of a Hafs-numbered translation across the three riwayat.
 * For every (riwayah, surah, ayah) the riwayah ships, look up the equivalent
 * Hafs key in the translation. Reports per-riwayah `{ total, covered, missing,
 * divergentSurahs }`. Hafs is always 100%; Warsh / Qaloon will be missing the
 * count delta on each divergent surah (translation has fewer / more keys at
 * the surah's tail than the riwayah has ayat).
 *
 * This is a structural check, not a scholarly equivalence check: it confirms
 * the translation key for `(surah, ayah)` resolves to a non-empty string when
 * the riwayah has that ayah index — it does NOT prove that key's text is the
 * scholarly counterpart of the verse at that boundary.
 */
export function computeTranslationCoverage(translationPerSurah, splitsByRiwayah, verseAliases) {
  const coverage = {}
  for (const r of RIWAYAT) {
    let total = 0
    let covered = 0
    const divergentSurahs = []
    const missingKeys = []
    for (let n = 1; n <= 114; n++) {
      const key = pad3(n)
      const surah = splitsByRiwayah[r][key]
      if (!surah) { throw new Error(`coverage: ${r} missing surah ${key}`) }
      const transSurah = translationPerSurah[key]
      if (!transSurah) { throw new Error(`coverage: translation missing surah ${key}`) }
      const transKeys = new Set(transSurah.verses.map((v) => v.key))
      // Build inverse alias lookup for this surah & riwayah: Madinan ayah →
      // [Hafs ayah]. Hafs is identity. Surahs without aliases fall through
      // to identity.
      const surahAliases = verseAliases?.aliases?.[String(n)]
      const resolveHafsKeys = (ayaNo) => {
        if (r === 'hafs' || !surahAliases) { return [`${n}:${ayaNo}`] }
        const hits = []
        for (const entry of surahAliases) {
          const target = entry[r]
          if (target === ayaNo) { hits.push(entry.hafs) }
          else if (Array.isArray(target) && target.includes(ayaNo)) { hits.push(entry.hafs) }
        }
        return hits.map((h) => `${n}:${h}`)
      }
      let surahCovered = 0
      for (const ayah of surah.ayat) {
        total += 1
        const hafsKeys = resolveHafsKeys(ayah.aya_no)
        const hit = hafsKeys.some((k) => transKeys.has(k))
        if (hit) {
          covered += 1
          surahCovered += 1
        } else {
          missingKeys.push(`${n}:${ayah.aya_no}`)
        }
      }
      if (surahCovered !== surah.ayat.length) {
        divergentSurahs.push(n)
      }
    }
    coverage[r] = {
      total,
      covered,
      missing: total - covered,
      divergentSurahs,
      ...(missingKeys.length > 0 ? { missingKeys } : {}),
    }
  }
  return coverage
}

/** Build the 30-entry juz array from Hafs (juz boundaries are constant across Riwayat). */
export function computeJuzMeta(hafsAyat) {
  const seen = new Set()
  const out = []
  for (const a of hafsAyat) {
    if (seen.has(a.jozz)) { continue }
    seen.add(a.jozz)
    const suraNo = a.sora ?? a.sura_no
    out.push({ n: a.jozz, start: { surah: suraNo, ayah: a.aya_no } })
  }
  return out.sort((a, b) => a.n - b.n)
}

function buildSourceIndex(catalog, profile) {
  const emitted = new Set([
    ...profile.riwayat.map((id) => `riwayah:${id}`),
    ...profile.translations.map((id) => `translation:${id}`),
    ...profile.tafsir.map((id) => `tafsir:${id}`),
  ])
  const defaults = catalog.verificationRules?.defaults ?? {
    riwayah: DEFAULT_RIWAYAH,
    translation: DEFAULT_TRANSLATION,
    tafsir: DEFAULT_TAFSIR,
  }
  return {
    version: 1,
    profile: profile.name,
    defaults,
    sources: catalog.sources.map((source) => ({
      id: source.id,
      type: source.type,
      label: source.label,
      displayLabel: source.displayLabel ?? source.label,
      role: source.role ?? source.type,
      trustTier: source.trustTier ?? null,
      language: source.language ?? null,
      translator: source.translator ?? null,
      sourceProvider: source.sourceProvider ?? null,
      licenseStatus: licensesById(catalog).get(source.licenseId)?.status ?? null,
      visibility: source.visibility,
      default: source.default === true,
      availableInManifest: emitted.has(`${source.type}:${source.id}`),
      outputPath: source.outputPath,
      sourceUrl: source.sourceUrl,
    })),
  }
}

function licensesById(catalog) {
  return new Map((Array.isArray(catalog.licenses) ? catalog.licenses : []).map((license) => [license.id, license]))
}

export async function main() {
  const profile = getDatasetProfile(parseProfileArg())
  console.log(`[build-dataset] starting profile=${profile.name}`)

  const sourceCatalog = await loadSourceCatalog()
  const catalogResult = validateSourceCatalog(sourceCatalog)
  if (!catalogResult.ok) {
    throw new Error(`source catalog invalid:\n${catalogResult.errors.join('\n')}`)
  }

  await mkdir(DATASET_DIR, { recursive: true })
  await mkdir(INDEXES_DIR, { recursive: true })
  await writeFile(join(INDEXES_DIR, 'sources.json'), JSON.stringify(buildSourceIndex(sourceCatalog, profile)), 'utf8')

  // 1. Read normalized source inputs. These monolithic files are NOT shipped;
  // only the per-surah split outputs are.
  const sources = {}
  for (const r of RIWAYAT) {
    const path = join(RIWAYAT_SOURCE_DIR, `${r}.json`)
    if (!existsSync(path)) { throw new Error(`Missing source: ${path}`) }
    sources[r] = JSON.parse(await readFile(path, 'utf8'))
    if (sources[r].length !== AYAT_COUNTS[r]) {
      throw new Error(`Ayah count mismatch for ${r}: got ${sources[r].length}, expected ${AYAT_COUNTS[r]}`)
    }
    console.log(`[build-dataset] ${r}: ${sources[r].length} ayat`)
  }

  // 2. Wipe + emit per-surah split files
  const splits = {}
  await cleanPackDirs(RIWAYAT_DIR)
  for (const r of RIWAYAT) {
    splits[r] = splitRiwayah(r, sources[r])
    if (Object.keys(splits[r]).length !== 114) {
      throw new Error(`${r} produced ${Object.keys(splits[r]).length} surahs, expected 114`)
    }
    let total = 0
    if (profile.riwayat.includes(r)) {
      const outDir = join(RIWAYAT_DIR, r)
      await mkdir(outDir, { recursive: true })
      for (const [key, payload] of Object.entries(splits[r])) {
        await writeFile(join(outDir, `${key}.json`), JSON.stringify(payload), 'utf8')
        total += payload.ayat.length
      }
    } else {
      for (const payload of Object.values(splits[r])) {
        total += payload.ayat.length
      }
    }
    if (total !== AYAT_COUNTS[r]) {
      throw new Error(`${r} split total ${total}, expected ${AYAT_COUNTS[r]}`)
    }
  }

  // 3. surahs.json (names from Qaloon — same Arabic across Riwayat)
  const namesEn = []
  const namesAr = []
  const perRiwayahCounts = { hafs: [], warsh: [], qaloon: [] }
  for (let i = 1; i <= 114; i++) {
    const key = pad3(i)
    for (const r of RIWAYAT) {
      if (!splits[r][key]) {
        throw new Error(`${r} missing surah ${key} after split — check input ayat for surah ${i}`)
      }
    }
    namesEn.push(splits.qaloon[key].sura_name_en)
    namesAr.push(splits.qaloon[key].sura_name_ar)
    for (const r of RIWAYAT) {
      perRiwayahCounts[r].push(splits[r][key].ayat.length)
    }
  }
  const surahsMeta = computeSurahsMeta(namesEn, namesAr, perRiwayahCounts)
  await writeFile(join(DATASET_DIR, 'surahs.json'), JSON.stringify(surahsMeta), 'utf8')

  // 3a. Validate translations/_verse-map.json matches surahs.json divergences.
  // This is a checks anchor: any future riwayah dataset bump that changes a
  // surah's count must be reflected in the verse-map in the same commit.
  if (!existsSync(VERSE_MAP_PATH)) {
    throw new Error(`Missing ${relative(REPO_ROOT, VERSE_MAP_PATH)} — required for translation cross-riwayah checks`)
  }
  const verseMap = JSON.parse(await readFile(VERSE_MAP_PATH, 'utf8'))
  const vmResult = validateVerseMap(verseMap, surahsMeta)
  console.log(`[build-dataset] verse-map: ${vmResult.divergent} divergent surahs validated against surahs.json`)

  // 3b. Validate translations/_verse-aliases.json (per-ayah Hafs ↔ Warsh ↔
  // Qaloon equivalence table, mechanically derived from KFGQPC by
  // scripts/data/derive-verse-aliases.mjs).
  if (!existsSync(VERSE_ALIASES_PATH)) {
    throw new Error(`Missing ${relative(REPO_ROOT, VERSE_ALIASES_PATH)} — run \`pnpm run data -- aliases\``)
  }
  const verseAliases = JSON.parse(await readFile(VERSE_ALIASES_PATH, 'utf8'))
  const vaResult = validateVerseAliases(verseAliases, surahsMeta)
  console.log(`[build-dataset] verse-aliases: ${vaResult.totalAliasedSurahs} surah alias tables (${vaResult.surahCount} count-divergent + ${vaResult.totalAliasedSurahs - vaResult.surahCount} boundary-drift)`)

  // 4. juz.json (from Hafs; juz/page constant across Riwayat)
  const juzMeta = computeJuzMeta(sources.hafs)
  if (juzMeta.length !== 30) { throw new Error(`juz count ${juzMeta.length}, expected 30`) }
  await writeFile(join(DATASET_DIR, 'juz.json'), JSON.stringify(juzMeta), 'utf8')

  // 5. translations — split each shipped translation pack from its raw source.
  const translationProvenance = []
  const hafsCounts = perRiwayahCounts.hafs.slice() // 114-entry array, matches surah index
  await cleanPackDirs(TRANSLATIONS_DIR, ['_verse-map.json', '_verse-aliases.json'])
  for (const t of SHIPPED_TRANSLATIONS.filter((entry) => profile.translations.includes(entry.id))) {
    const rawPath = join(NORMALIZED_TRANSLATIONS_DIR, t.normalizedFile)
    if (!existsSync(rawPath)) {
      throw new Error(`Missing translation source: ${rawPath} (run \`pnpm run data:fetch -- translation:${t.id}\`)`)
    }
    const raw = JSON.parse(await readFile(rawPath, 'utf8'))
    if (raw.translationId !== t.id) {
      throw new Error(`translation source ${rawPath} has translationId=${raw.translationId}, expected ${t.id}`)
    }
    const { perSurah, totals } = buildTranslationSplits(raw, hafsCounts)
    const outDir = join(TRANSLATIONS_DIR, t.id)
    await mkdir(outDir, { recursive: true })
    for (const [key, payload] of Object.entries(perSurah)) {
      await writeFile(join(outDir, `${key}.json`), JSON.stringify(payload), 'utf8')
    }
    console.log(`[build-dataset] translation ${t.id}: 114 surahs, ${totals.verses} verses, ${totals.footnotes} footnotes`)

    // Cross-riwayah coverage: for every (riwayah, surah, ayah) shipped, does
    // the translation have a key for that exact `${surah}:${ayah}` address?
    // Hafs always 100% (build-time invariant above); Warsh / Qaloon expose
    // the Madinan-numbering deltas as `missing` ayat in `divergentSurahs`.
    const coverage = computeTranslationCoverage(perSurah, splits, verseAliases)
    for (const r of RIWAYAT) {
      const c = coverage[r]
      console.log(`[build-dataset]   coverage[${r}]: ${c.covered}/${c.total} (${c.missing} missing across ${c.divergentSurahs.length} divergent surahs)`)
    }
    if (coverage.hafs.missing !== 0) {
      throw new Error(`translation ${t.id}: Hafs coverage incomplete — ${coverage.hafs.missing} ayat lack a translation key (verse-map keys translations to Hafs)`)
    }

    translationProvenance.push({
      id: t.id,
      label: t.label,
      translator: t.translator,
      language: t.language,
      version: raw.translationVersion,
      ayatCount: totals.verses,
      footnoteCount: totals.footnotes,
      hasIntros: Object.values(perSurah).some((s) => Array.isArray(s.intro) && s.intro.length > 0),
      license: t.license,
      licenseUrl: t.licenseUrl,
      source: t.source,
      sourceUrl: t.sourceUrl,
      fetchedAt: raw.fetchedAt,
      primaryRiwayah: 'hafs',
      coverage: {
        hafs:   { total: coverage.hafs.total,   covered: coverage.hafs.covered,   missing: coverage.hafs.missing,   divergentSurahs: coverage.hafs.divergentSurahs },
        warsh:  { total: coverage.warsh.total,  covered: coverage.warsh.covered,  missing: coverage.warsh.missing,  divergentSurahs: coverage.warsh.divergentSurahs },
        qaloon: { total: coverage.qaloon.total, covered: coverage.qaloon.covered, missing: coverage.qaloon.missing, divergentSurahs: coverage.qaloon.divergentSurahs },
      },
    })
  }

  // 5b. tafsir — split committed normalized source packs.
  const tafsirProvenance = []
  await cleanPackDirs(TAFSIR_DIR)
  for (const t of SHIPPED_TAFSIR.filter((entry) => profile.tafsir.includes(entry.id))) {
    const normalizedPath = join(NORMALIZED_TAFSIR_DIR, t.normalizedFile)
    if (!existsSync(normalizedPath)) {
      throw new Error(`Missing normalized tafsir source: ${normalizedPath}`)
    }
    const normalized = JSON.parse(await readFile(normalizedPath, 'utf8'))
    if (normalized.tafsirId !== t.id) {
      throw new Error(`tafsir source ${normalizedPath} has tafsirId=${normalized.tafsirId}, expected ${t.id}`)
    }
    const perSurah = buildTafsirSplits(normalized)
    const outDir = join(TAFSIR_DIR, t.id)
    await mkdir(outDir, { recursive: true })
    for (let n = 1; n <= 114; n++) {
      const key = pad3(n)
      const payload = perSurah[key] ?? {
        tafsirId: t.id,
        tafsirVersion: normalized.tafsirVersion,
        language: normalized.language,
        surahNo: n,
        entries: [],
      }
      await writeFile(join(outDir, `${key}.json`), JSON.stringify(payload), 'utf8')
    }
    const rangeCount = normalized.entries.filter((entry) => entry.sourceGranularity === 'range').length
    tafsirProvenance.push({
      id: t.id,
      label: t.label,
      language: t.language,
      version: normalized.tafsirVersion,
      entryCount: normalized.entries.length,
      rangeEntryCount: rangeCount,
      license: t.license,
      licenseUrl: t.licenseUrl,
      source: t.source,
      sourceUrl: t.sourceUrl,
      coverage: { surahs: Object.keys(perSurah).length },
    })
    console.log(`[build-dataset] tafsir ${t.id}: ${normalized.entries.length} entries (${rangeCount} ranges)`)
  }

  // 6. provenance.json
  const provenance = {
    packageVersion: PACKAGE_VERSION,
    profile: profile.name,
    builtAt: new Date().toISOString(),
    corpus: {
      name: 'Mushaf al-Madinah — KFGQPC',
      publisher: "King Fahd Glorious Qur'an Printing Complex (KFGQPC), Madinah",
      publisherAr: 'مجمع الملك فهد لطباعة المصحف الشريف',
      license: 'Free for personal, educational, non-commercial use with attribution',
      url: 'https://qurancomplex.gov.sa/en/techquran/dev/',
    },
    riwayat: profile.riwayat.map((id) => ({
      id,
      label: RIWAYAH_META[id].label,
      version: RIWAYAH_META[id].version,
      ayatCount: AYAT_COUNTS[id],
      fontFamily: RIWAYAH_META[id].fontFamily,
      minLineHeight: RIWAYAH_META[id].minLineHeight,
    })),
    translations: translationProvenance,
    tafsir: tafsirProvenance,
    fonts: FONT_PATHS,
  }
  await writeFile(join(DATASET_DIR, 'provenance.json'), JSON.stringify(provenance), 'utf8')

  const manifest = await buildManifestPayload({
    datasetDir: DATASET_DIR,
    riwayatDir: RIWAYAT_DIR,
    translationsDir: TRANSLATIONS_DIR,
    provenance,
    packageVersion: PACKAGE_VERSION,
    profileName: profile.name,
  })
  await writeFile(join(DATASET_DIR, 'manifest.json'), JSON.stringify(manifest), 'utf8')

  console.log(`[build-dataset] done — wrote per-surah riwayat + translation files, surahs.json, juz.json, provenance.json, manifest.json`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
