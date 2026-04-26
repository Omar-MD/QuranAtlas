#!/usr/bin/env node
/**
 * QuranAtlas dataset build pipeline (Riwayat edition).
 *
 * Reads the three monolithic KFGQPC Riwayah JSONs from
 *   public/dataset/riwayat/{hafs,warsh,qaloon}.json
 * and emits:
 *   public/dataset/riwayat/{name}/{NNN}.json   (114 per Riwayah, 342 total)
 *   public/dataset/surahs.json                 (114 entries, per-Riwayah counts)
 *   public/dataset/juz.json                    (30 entries)
 *   public/dataset/manifest.json               (sha256 per shipped file)
 *   public/dataset/provenance.json             (corpus + Riwayah + font metadata)
 *
 * Run via: pnpm build:dataset
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const RIWAYAT_DIR = join(DATASET_DIR, 'riwayat')

export const AYAT_COUNTS = { hafs: 6236, warsh: 6214, qaloon: 6214 }
export const RIWAYAT = ['hafs', 'warsh', 'qaloon']

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

const PACKAGE_VERSION = '2.0.0'

const pad3 = (n) => String(n).padStart(3, '0')

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
    const ayah = {
      id: a.id,
      jozz: a.jozz,
      page: a.page,
      line_start: a.line_start,
      line_end: a.line_end,
      aya_no: a.aya_no,
      aya_text: stripTrailingAyaNumber(a.aya_text, a.aya_no),
    }
    if (a.aya_text_emlaey) {
      // emlaey may or may not carry the trailing digit — try strip, fall back to original on miss
      try { ayah.aya_text_emlaey = stripTrailingAyaNumber(a.aya_text_emlaey, a.aya_no) }
      catch { ayah.aya_text_emlaey = a.aya_text_emlaey }
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

async function sha256(filePath) {
  const buf = await readFile(filePath)
  return createHash('sha256').update(buf).digest('hex')
}

async function listFiles(rootDir) {
  const out = []
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) { await walk(full) } else { out.push(full) }
    }
  }
  await walk(rootDir)
  return out
}

async function main() {
  console.log('[build-riwayat] starting')
  // 1. Read inputs
  const sources = {}
  for (const r of RIWAYAT) {
    const path = join(RIWAYAT_DIR, `${r}.json`)
    if (!existsSync(path)) { throw new Error(`Missing source: ${path}`) }
    sources[r] = JSON.parse(await readFile(path, 'utf8'))
    if (sources[r].length !== AYAT_COUNTS[r]) {
      throw new Error(`Ayah count mismatch for ${r}: got ${sources[r].length}, expected ${AYAT_COUNTS[r]}`)
    }
    console.log(`[build-riwayat] ${r}: ${sources[r].length} ayat`)
  }

  // 2. Wipe + emit per-surah split files
  const splits = {}
  for (const r of RIWAYAT) {
    const outDir = join(RIWAYAT_DIR, r)
    if (existsSync(outDir)) { await rm(outDir, { recursive: true, force: true }) }
    await mkdir(outDir, { recursive: true })
    splits[r] = splitRiwayah(r, sources[r])
    if (Object.keys(splits[r]).length !== 114) {
      throw new Error(`${r} produced ${Object.keys(splits[r]).length} surahs, expected 114`)
    }
    let total = 0
    for (const [key, payload] of Object.entries(splits[r])) {
      await writeFile(join(outDir, `${key}.json`), JSON.stringify(payload), 'utf8')
      total += payload.ayat.length
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

  // 4. juz.json (from Hafs; juz/page constant across Riwayat)
  const juzMeta = computeJuzMeta(sources.hafs)
  if (juzMeta.length !== 30) { throw new Error(`juz count ${juzMeta.length}, expected 30`) }
  await writeFile(join(DATASET_DIR, 'juz.json'), JSON.stringify(juzMeta), 'utf8')

  // 5. provenance.json
  const provenance = {
    packageVersion: PACKAGE_VERSION,
    builtAt: new Date().toISOString(),
    corpus: {
      name: 'Mushaf al-Madinah — KFGQPC',
      publisher: "King Fahd Glorious Qur'an Printing Complex (KFGQPC), Madinah",
      publisherAr: 'مجمع الملك فهد لطباعة المصحف الشريف',
      license: 'Free for personal, educational, non-commercial use with attribution',
      url: 'https://qurancomplex.gov.sa/en/techquran/dev/',
    },
    riwayat: RIWAYAT.map((id) => ({
      id,
      label: RIWAYAH_META[id].label,
      version: RIWAYAH_META[id].version,
      ayatCount: AYAT_COUNTS[id],
      fontFamily: RIWAYAH_META[id].fontFamily,
      minLineHeight: RIWAYAH_META[id].minLineHeight,
    })),
    translations: [],
    fonts: FONT_PATHS,
  }
  await writeFile(join(DATASET_DIR, 'provenance.json'), JSON.stringify(provenance), 'utf8')

  // 6. manifest.json — sha256 of every shipped file under public/dataset/.
  // provenance.json is hashed against a builtAt-stripped form so the manifest
  // stays stable across no-op rebuilds (otherwise every re-run dirties git).
  const allFiles = await listFiles(DATASET_DIR)
  const files = {}
  for (const f of allFiles) {
    if (f.endsWith('manifest.json')) { continue }
    // Immediate children of riwayat/ are monolithic source inputs, not shipped.
    if (dirname(f) === RIWAYAT_DIR) { continue }
    const rel = relative(DATASET_DIR, f).replace(/\\/g, '/')
    if (rel === 'provenance.json') {
      const stable = JSON.stringify({ ...provenance, builtAt: '' })
      files[rel] = createHash('sha256').update(stable).digest('hex')
    } else {
      files[rel] = await sha256(f)
    }
  }
  await writeFile(join(DATASET_DIR, 'manifest.json'), JSON.stringify({ packageVersion: PACKAGE_VERSION, builtAt: provenance.builtAt, files }), 'utf8')

  console.log(`[build-riwayat] done — 342 surah files + surahs.json + juz.json + provenance.json + manifest.json`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
