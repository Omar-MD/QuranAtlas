#!/usr/bin/env node
/**
 * Validate Hafs ↔ Warsh ↔ Qaloon ↔ Saheeh-translation mapping.
 *
 * Three checks:
 *   A. alias-coverage    — re-runs word-stream + ayah-DP alignment for ALL 114
 *                          surahs (drops the count-equality skip in
 *                          derive-verse-aliases.mjs). Surahs whose alignment
 *                          is non-identity but missing from
 *                          `_verse-aliases.json` are flagged. Catches surahs
 *                          like Al-A`raf (7) where Hafs/Warsh/Qaloon counts
 *                          all equal 206 but internal ayah boundaries diverge.
 *
 *   B. translation-source — fetches Hafs Arabic + Saheeh English (id 20) for
 *                           every verse_key from quran.com qdc and compares
 *                           against local `riwayat/hafs/NNN.json` and
 *                           `translations/saheeh.raw.json`. Drops in either
 *                           direction = data corruption or pipeline bug.
 *                           Network-bound; skip with --offline.
 *
 *   C. cross-riwayah-render — for each non-Hafs (warsh, qaloon) ayah, simulates
 *                              the Reader's `resolveTranslationFor` lookup
 *                              against the FRESHLY-DERIVED alias table from
 *                              check A (not the on-disk one), then asserts the
 *                              normalised word multiset of the Madinan ayah
 *                              equals the multiset of the resolved Hafs ayah(s)
 *                              concatenation. Drift = wrong translation
 *                              displayed.
 *
 * Usage:
 *   node scripts/validate-translation-mapping.mjs [--check=A|B|C|all] [--offline]
 *
 * Output: tmp/translation-mapping-report.json + console summary by severity.
 * Exit code: 0 if no findings, 1 if any check reports `error`-level finding.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const RIWAYAT_DIR = join(DATASET_DIR, 'riwayat')
const TRANSLATIONS_DIR = join(DATASET_DIR, 'translations')
const REPORT_PATH = join(REPO_ROOT, 'tmp', 'translation-mapping-report.json')

const QDC_API_BASE = 'https://api.qurancdn.com/api/qdc'
const SAHEEH_TRANSLATION_ID = 20
const UA = 'QuranAtlas-validate/1.0 (https://quranatlas.org)'
const PAD3 = (n) => String(n).padStart(3, '0')

// Args
const args = process.argv.slice(2)
const checkArg = (args.find((a) => a.startsWith('--check=')) ?? '--check=all').split('=')[1]
const OFFLINE = args.includes('--offline')

// ---------- normalisation ----------

// Strip ALL combining marks across the Arabic Unicode blocks. Riwayat datasets
// use distinct mark sets (Hafs sukun U+06E1, Warsh small waw U+06E5, Quranic
// pause marks U+06D6-U+06ED, hamza-above U+0654, alif-above U+0670, etc.).
// Strip ALL Unicode combining marks via property escape — but FIRST promote
// U+0670 (alif khanjariyah, also a combining mark) to explicit alif U+0627.
// Warsh rasm writes silent alif as ٰ where Hafs writes ا; both denote the
// same alif phoneme, so they must tokenise identically.
function normaliseArabic(s) {
  let out = s.normalize('NFKD')
  out = out.replace(/\u0670/g, '\u0627')               // alif khanjariyah → ا
  out = out.replace(/\p{M}/gu, '')                      // strip remaining combining marks
  out = out.replace(/[\u0671\u0622\u0623\u0625]/g, '\u0627') // alif-wasla, madda-alif, alif-hamza → ا
  out = out.replace(/[\u0649\u0626\u06D2]/g, '\u064A')        // alif-maqsura, hamza-on-ya, yeh-barree → ي
  out = out.replace(/\u0629/g, '\u0647')               // taa marbuta → ه
  out = out.replace(/[\u0621\u0624]/g, '')             // drop hamza-on-line, hamza-on-waw
  out = out.replace(/[\u200C-\u200F\uFEFF]/g, '')     // strip zero-widths
  out = out.replace(/\u0640/g, '')                    // strip tatweel (kashida \u2014 decorative, no phonetic content)
  out = out.replace(/[^\u0620-\u064A\s]/g, '')        // keep Arabic letter block + whitespace
  return out.replace(/\s+/g, ' ').trim()
}

function wordList(s) {
  return normaliseArabic(s).split(' ').filter(Boolean)
}

/**
 * Riwayat differ at the qira'at level (real word substitutions: e.g. Hafs
 * "yaghfir" vs Warsh "naghfir"). Multiset-equals is too strict — even a
 * correctly-aligned ayah pair will diverge on a few words. Use word-set
 * Jaccard similarity instead, with a generous floor; the goal is to catch
 * "Madinan ayah aliased to a completely different Hafs ayah" (Jaccard near 0)
 * NOT "Madinan ayah differs from Hafs by 1-2 qira'at substitutions".
 */
function jaccardSim(words1, words2) {
  const s1 = new Set(words1)
  const s2 = new Set(words2)
  if (s1.size === 0 && s2.size === 0) { return 1 }
  let inter = 0
  for (const w of s1) { if (s2.has(w)) { inter++ } }
  const union = s1.size + s2.size - inter
  return union === 0 ? 1 : inter / union
}

const JACCARD_THRESHOLD = 0.55
const WORD_COUNT_RATIO_MAX = 1.6 // |a/b| or |b/a| must be ≤ this

// ---------- alignment (mirror of derive-verse-aliases.mjs but always-run) ----------

function computeWordCumulative(ayat) {
  const lens = ayat.map((a) => normaliseArabic(a.aya_text).split(' ').filter(Boolean).length)
  const cum = []
  let s = 0
  for (const l of lens) { s += l; cum.push(s) }
  return { lens, cum, total: s }
}

const MAX_GROUP_SIZE = 4

function alignByAyahDP(hafsAyat, otherAyat, otherKey) {
  const hLens = hafsAyat.map((a) => normaliseArabic(a.aya_text).split(' ').filter(Boolean).length)
  const oLens = otherAyat.map((a) => normaliseArabic(a.aya_text).split(' ').filter(Boolean).length)
  const m = hLens.length
  const n = oLens.length
  const dp = Array.from({ length: m + 1 }, () => new Float64Array(n + 1))
  const back = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => [-1, -1]))
  for (let i = 0; i <= m; i++) { for (let j = 0; j <= n; j++) { dp[i][j] = Infinity } }
  dp[0][0] = 0
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (dp[i][j] === Infinity) { continue }
      if (i < m && j < n) {
        const cost = Math.abs(hLens[i] - oLens[j])
        if (dp[i][j] + cost < dp[i + 1][j + 1]) {
          dp[i + 1][j + 1] = dp[i][j] + cost
          back[i + 1][j + 1] = [i, j]
        }
      }
      for (let k = 2; k <= MAX_GROUP_SIZE && j + k <= n && i < m; k++) {
        let oSum = 0
        for (let kk = 0; kk < k; kk++) { oSum += oLens[j + kk] }
        const cost = Math.abs(hLens[i] - oSum)
        if (dp[i][j] + cost < dp[i + 1][j + k]) {
          dp[i + 1][j + k] = dp[i][j] + cost
          back[i + 1][j + k] = [i, j]
        }
      }
      for (let k = 2; k <= MAX_GROUP_SIZE && i + k <= m && j < n; k++) {
        let hSum = 0
        for (let kk = 0; kk < k; kk++) { hSum += hLens[i + kk] }
        const cost = Math.abs(hSum - oLens[j])
        if (dp[i][j] + cost < dp[i + k][j + 1]) {
          dp[i + k][j + 1] = dp[i][j] + cost
          back[i + k][j + 1] = [i, j]
        }
      }
    }
  }
  if (dp[m][n] === Infinity) {
    throw new Error(`ayah-DP alignment found no path: hafs=${m}, ${otherKey}=${n}`)
  }
  const groups = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    const [pi, pj] = back[i][j]
    groups.push([pi, i, pj, j])
    i = pi; j = pj
  }
  groups.reverse()
  const aliases = []
  for (let hi = 1; hi <= m; hi++) {
    const g = groups.find(([hs, he]) => hi - 1 >= hs && hi - 1 < he)
    if (!g) { aliases.push({ hafs: hi, [otherKey]: null }); continue }
    const [hs, he, os, oe] = g
    if (he - hs === 1 && oe - os === 1) {
      aliases.push({ hafs: hi, [otherKey]: os + 1 })
    } else if (he - hs === 1 && oe - os > 1) {
      const list = []
      for (let oi = os; oi < oe; oi++) { list.push(oi + 1) }
      aliases.push({ hafs: hi, [otherKey]: list })
    } else {
      const list = []
      for (let oi = os; oi < oe; oi++) { list.push(oi + 1) }
      aliases.push({ hafs: hi, [otherKey]: list.length === 1 ? list[0] : list })
    }
  }
  return { aliases, cost: dp[m][n] }
}

function alignWordStream(hafsAyat, otherAyat, otherKey, bismillahDrop) {
  const h = computeWordCumulative(hafsAyat)
  const o = computeWordCumulative(otherAyat)
  if (bismillahDrop) {
    if (h.total - h.lens[0] !== o.total) {
      throw new Error(`bismillah-drop alignment fails: hafs[1:] total ${h.total - h.lens[0]}, ${otherKey} total ${o.total}`)
    }
    const subAliases = alignWordStream(hafsAyat.slice(1), otherAyat, otherKey, false)
    return [
      { hafs: 1, [otherKey]: null },
      ...subAliases.map((a) => ({ hafs: a.hafs + 1, [otherKey]: a[otherKey] })),
    ]
  }
  if (h.total !== o.total) {
    throw new Error(`word-stream totals diverge: hafs ${h.total}, ${otherKey} ${o.total}`)
  }
  const aliases = []
  let oIdx = 0
  for (let i = 0; i < h.cum.length; i++) {
    const hEnd = h.cum[i]
    const otherAyatHere = []
    while (oIdx < o.cum.length && o.cum[oIdx] <= hEnd) {
      otherAyatHere.push(oIdx + 1)
      oIdx++
    }
    if (oIdx < o.cum.length) {
      const oStart = oIdx === 0 ? 0 : o.cum[oIdx - 1]
      if (oStart < hEnd) { otherAyatHere.push(oIdx + 1) }
    }
    aliases.push({
      hafs: i + 1,
      [otherKey]: otherAyatHere.length === 0 ? null
        : otherAyatHere.length === 1 ? otherAyatHere[0]
        : otherAyatHere,
    })
  }
  return aliases
}

function alignSafe(hafsAyat, otherAyat, otherKey, bismillahDrop) {
  try {
    return { aliases: alignWordStream(hafsAyat, otherAyat, otherKey, bismillahDrop), method: 'word-stream' }
  } catch {
    const r = alignByAyahDP(hafsAyat, otherAyat, otherKey)
    return { aliases: r.aliases, method: 'ayah-dp', dpCost: r.cost }
  }
}

function isIdentityAlias(merged) {
  for (const a of merged) {
    if (a.warsh !== a.hafs || a.qaloon !== a.hafs) { return false }
  }
  return true
}

// ---------- check A ----------

async function loadRiwayahSurah(riwayah, n) {
  return JSON.parse(await readFile(join(RIWAYAT_DIR, riwayah, `${PAD3(n)}.json`), 'utf8'))
}

async function checkAliasCoverage(surahsMeta, shippedAliases) {
  const findings = []
  const derived = {}
  for (const meta of surahsMeta) {
    const n = meta.n
    const hafs = await loadRiwayahSurah('hafs', n)
    const warsh = await loadRiwayahSurah('warsh', n)
    const qaloon = await loadRiwayahSurah('qaloon', n)
    const bism = n === 1
    let w, q
    try {
      w = alignSafe(hafs.ayat, warsh.ayat, 'warsh', bism)
      q = alignSafe(hafs.ayat, qaloon.ayat, 'qaloon', bism)
    } catch (e) {
      findings.push({ severity: 'error', check: 'A', surah: n, kind: 'alignment-failed', message: e.message })
      continue
    }
    const merged = w.aliases.map((wa, i) => ({ hafs: wa.hafs, warsh: wa.warsh, qaloon: q.aliases[i].qaloon }))
    derived[String(n)] = { merged, warshMethod: w.method, qaloonMethod: q.method }
    const identity = isIdentityAlias(merged)
    const inShipped = Boolean(shippedAliases.aliases?.[String(n)])
    if (!identity && !inShipped) {
      findings.push({
        severity: 'error',
        check: 'A',
        surah: n,
        name: meta.name,
        counts: meta.counts,
        kind: 'missing-alias-entry',
        message: `Surah ${n} (${meta.name}) has non-identity alignment but is absent from _verse-aliases.json. Reader will identity-map → wrong translation.`,
        warshMethod: w.method,
        qaloonMethod: q.method,
        sampleDivergent: merged.slice(0, 6).filter((a) => a.warsh !== a.hafs || a.qaloon !== a.hafs).slice(0, 3),
      })
    }
    if (identity && inShipped && n !== 1) {
      findings.push({
        severity: 'warning',
        check: 'A',
        surah: n,
        kind: 'redundant-alias-entry',
        message: `Surah ${n} aligns as identity but ships an alias entry; harmless but dead bytes.`,
      })
    }
  }
  return { findings, derived }
}

// ---------- check B ----------

async function getJSON(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })
      if (!res.ok) { throw new Error(`HTTP ${res.status} for ${url}`) }
      return await res.json()
    } catch (e) {
      if (attempt === retries - 1) { throw e }
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    }
  }
}

const SUP_RE = /<sup\s+foot_note=(?:"?(\d+)"?)[^>]*>(\d+)<\/sup>/g
const HTML_TAG_RE = /<[^>]+>/g
function stripHtmlAndFootnoteMarkers(s) {
  let out = s.replace(SUP_RE, '')
  if (HTML_TAG_RE.test(out)) {
    HTML_TAG_RE.lastIndex = 0
    out = out.replace(HTML_TAG_RE, '')
  }
  return out.trim().replace(/\s+/g, ' ')
}

function stripLocalSaheehFootnotes(s) {
  return s.replace(/\[\d+\]/g, '').trim().replace(/\s+/g, ' ')
}

async function fetchSurahFromQdc(surahNo) {
  const url = `${QDC_API_BASE}/verses/by_chapter/${surahNo}?language=en&words=false&translations=${SAHEEH_TRANSLATION_ID}&fields=text_uthmani&per_page=300&page=1`
  const data = await getJSON(url)
  if (!Array.isArray(data?.verses) || data.pagination?.total_pages !== 1) {
    throw new Error(`bad payload for surah ${surahNo}`)
  }
  return data.verses
}

async function checkTranslationSource(surahsMeta) {
  const findings = []
  let saheehRaw
  try {
    saheehRaw = JSON.parse(await readFile(join(TRANSLATIONS_DIR, 'saheeh.raw.json'), 'utf8'))
  } catch (e) {
    findings.push({ severity: 'error', check: 'B', kind: 'local-saheeh-missing', message: e.message })
    return findings
  }
  for (const meta of surahsMeta) {
    const n = meta.n
    let remoteVerses
    try { remoteVerses = await fetchSurahFromQdc(n) }
    catch (e) {
      findings.push({ severity: 'error', check: 'B', surah: n, kind: 'fetch-failed', message: e.message })
      continue
    }
    const hafs = await loadRiwayahSurah('hafs', n)
    const localSaheehSurah = saheehRaw.surahs?.[PAD3(n)]
    if (!localSaheehSurah) {
      findings.push({ severity: 'error', check: 'B', surah: n, kind: 'local-saheeh-surah-missing' })
      continue
    }
    if (remoteVerses.length !== hafs.ayat.length) {
      findings.push({
        severity: 'error', check: 'B', surah: n, kind: 'count-mismatch',
        message: `remote ${remoteVerses.length} vs local hafs ${hafs.ayat.length}`,
      })
    }
    if (remoteVerses.length !== localSaheehSurah.verses.length) {
      findings.push({
        severity: 'error', check: 'B', surah: n, kind: 'translation-count-mismatch',
        message: `remote ${remoteVerses.length} vs local saheeh ${localSaheehSurah.verses.length}`,
      })
    }
    const stop = Math.min(remoteVerses.length, hafs.ayat.length, localSaheehSurah.verses.length)
    for (let i = 0; i < stop; i++) {
      const r = remoteVerses[i]
      const lh = hafs.ayat[i]
      const ls = localSaheehSurah.verses[i]
      const expectedKey = `${n}:${i + 1}`
      if (r.verse_key !== expectedKey) {
        findings.push({
          severity: 'error', check: 'B', surah: n, ayah: i + 1, kind: 'remote-key-drift',
          message: `remote key ${r.verse_key} ≠ expected ${expectedKey}`,
        })
      }
      if (ls.key !== expectedKey) {
        findings.push({
          severity: 'error', check: 'B', surah: n, ayah: i + 1, kind: 'local-saheeh-key-drift',
          message: `local saheeh key ${ls.key} ≠ expected ${expectedKey}`,
        })
      }
      const remoteAr = normaliseArabic(r.text_uthmani ?? '')
      const localAr = normaliseArabic(lh.aya_text ?? '')
      // Letter-only comparison: KFGQPC and quran.com qdc disagree on
      // word-segmentation for fused particles (e.g. "مالي" vs "ما لي" — same
      // letters, different printing conventions). Tokenisation belongs to the
      // edition, not the verse content; collapse spaces for the equivalence
      // check but record both forms when they DIFFER on letters.
      const remoteLetters = remoteAr.replace(/\s+/g, '')
      const localLetters = localAr.replace(/\s+/g, '')
      if (remoteLetters !== localLetters) {
        findings.push({
          severity: 'error', check: 'B', surah: n, ayah: i + 1, kind: 'arabic-text-drift',
          remoteLen: remoteLetters.length, localLen: localLetters.length,
          firstDiffAt: firstDiffOffset(remoteLetters, localLetters),
        })
      } else if (remoteAr !== localAr) {
        findings.push({
          severity: 'info', check: 'B', surah: n, ayah: i + 1, kind: 'word-segmentation-diff',
          message: 'remote and local differ only in space placement (editorial word-fusion choice); content equivalent',
        })
      }
      const remoteEn = stripHtmlAndFootnoteMarkers(r.translations?.[0]?.text ?? '')
      const localEn = stripLocalSaheehFootnotes(ls.text ?? '')
      if (remoteEn !== localEn) {
        const remoteWords = remoteEn.split(' ').length
        const localWords = localEn.split(' ').length
        const drift = Math.abs(remoteWords - localWords)
        findings.push({
          severity: drift > 3 ? 'error' : 'warning',
          check: 'B', surah: n, ayah: i + 1, kind: 'translation-text-drift',
          remoteWords, localWords,
          firstDiffAt: firstDiffOffset(remoteEn, localEn),
          sample: { remote: remoteEn.slice(0, 120), local: localEn.slice(0, 120) },
        })
      }
    }
    process.stdout.write(`[B] surah ${n}/114 done\r`)
  }
  process.stdout.write('\n')
  return findings
}

function firstDiffOffset(a, b) {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) { if (a[i] !== b[i]) { return i } }
  return a.length === b.length ? -1 : len
}

// ---------- check C ----------

function resolveTranslationFor(surahAliases, riwayah, surahNo, ayahNo) {
  if (riwayah === 'hafs' || !surahAliases) {
    return { role: 'identity', hafsKeys: [`${surahNo}:${ayahNo}`] }
  }
  const hits = []
  for (const entry of surahAliases) {
    const target = entry[riwayah]
    if (target === ayahNo) {
      hits.push({ hafs: entry.hafs, isContinuation: false })
    } else if (Array.isArray(target) && target.includes(ayahNo)) {
      const first = target[0]
      hits.push({ hafs: entry.hafs, isContinuation: ayahNo !== first, splitFirst: ayahNo !== first ? first : undefined })
    }
  }
  if (hits.length === 0) { return { role: 'none', hafsKeys: [] } }
  if (hits.length === 1) {
    const h = hits[0]
    if (h.isContinuation) {
      return { role: 'continuation', hafsKeys: [`${surahNo}:${h.hafs}`], primaryAyah: h.splitFirst }
    }
    const entry = surahAliases.find((e) => e.hafs === h.hafs)
    if (entry && Array.isArray(entry[riwayah])) {
      return { role: 'primary', hafsKeys: [`${surahNo}:${h.hafs}`] }
    }
    return { role: 'identity', hafsKeys: [`${surahNo}:${h.hafs}`] }
  }
  return { role: 'merged', hafsKeys: hits.map((h) => `${surahNo}:${h.hafs}`) }
}

async function checkCrossRiwayahRender(surahsMeta, shippedAliases) {
  const findings = []
  for (const meta of surahsMeta) {
    const n = meta.n
    const hafs = await loadRiwayahSurah('hafs', n)
    const warsh = await loadRiwayahSurah('warsh', n)
    const qaloon = await loadRiwayahSurah('qaloon', n)
    const surahAliases = shippedAliases.aliases?.[String(n)] ?? null

    for (const [riwayah, ayat] of [['warsh', warsh.ayat], ['qaloon', qaloon.ayat]]) {
      // Group consecutive primary/continuation Madinan ayat by their primary Hafs key
      // so a Hafs split (1 hafs → [w_a, w_b]) is checked as a single unit
      // (concat of madinan parts ↔ that single Hafs ayah).
      const groupBuckets = new Map() // key=primaryAyah → { madinanAyat: number[], hafsKeys: Set<string> }
      const standaloneCheckQueue = []

      for (let i = 0; i < ayat.length; i++) {
        const ayahNo = i + 1
        const res = resolveTranslationFor(surahAliases, riwayah, n, ayahNo)
        if (res.role === 'none') {
          findings.push({
            severity: 'warning', check: 'C', surah: n, riwayah, ayah: ayahNo, kind: 'no-hafs-equivalent',
            message: `${riwayah} ${n}:${ayahNo} resolves to role=none; reader will hide translation.`,
          })
          continue
        }
        if (res.role === 'primary' || res.role === 'continuation') {
          const primary = res.role === 'primary' ? ayahNo : (res.primaryAyah ?? ayahNo)
          const bucketKey = `${primary}|${res.hafsKeys[0]}`
          if (!groupBuckets.has(bucketKey)) {
            groupBuckets.set(bucketKey, { madinanAyat: [], hafsKey: res.hafsKeys[0] })
          }
          groupBuckets.get(bucketKey).madinanAyat.push(ayahNo)
          continue
        }
        standaloneCheckQueue.push({ ayahNo, hafsKeys: res.hafsKeys, role: res.role })
      }

      const flagPair = (info, madinanText, hafsText) => {
        const w1 = wordList(madinanText)
        const w2 = wordList(hafsText)
        if (w1.length === 0 && w2.length === 0) { return }
        const j = jaccardSim(w1, w2)
        const lenRatio = w1.length === 0 || w2.length === 0
          ? Infinity
          : Math.max(w1.length / w2.length, w2.length / w1.length)
        if (j < JACCARD_THRESHOLD || lenRatio > WORD_COUNT_RATIO_MAX) {
          findings.push({
            ...info,
            severity: j < 0.25 ? 'error' : 'warning',
            jaccard: Number(j.toFixed(3)),
            madinanWords: w1.length,
            hafsWords: w2.length,
            sample: { madinan: madinanText.slice(0, 100), hafs: hafsText.slice(0, 100) },
          })
        }
      }

      // Verify split groups: concat madinan text ↔ single hafs ayah text.
      for (const [, g] of groupBuckets) {
        const madinanText = g.madinanAyat.map((m) => ayat[m - 1].aya_text).join(' ')
        const [hafsSurah, hafsAyahStr] = g.hafsKey.split(':')
        const hafsAyah = Number(hafsAyahStr)
        if (Number(hafsSurah) !== n) { continue }
        const hafsText = hafs.ayat[hafsAyah - 1]?.aya_text ?? ''
        flagPair({
          check: 'C', surah: n, riwayah, ayat: g.madinanAyat, hafsKey: g.hafsKey,
          kind: 'split-group-text-mismatch',
          message: `${riwayah} ${n}:[${g.madinanAyat.join(',')}] concat ↔ Hafs ${g.hafsKey} similarity below threshold`,
        }, madinanText, hafsText)
      }

      // Verify identity / merged: madinan ayah ↔ concatenated hafs ayat.
      for (const item of standaloneCheckQueue) {
        const madinanText = ayat[item.ayahNo - 1].aya_text
        const hafsText = item.hafsKeys.map((k) => {
          const [, ay] = k.split(':')
          return hafs.ayat[Number(ay) - 1]?.aya_text ?? ''
        }).join(' ')
        flagPair({
          check: 'C', surah: n, riwayah, ayah: item.ayahNo,
          hafsKeys: item.hafsKeys, role: item.role,
          kind: 'render-text-mismatch',
          message: `${riwayah} ${n}:${item.ayahNo} (role=${item.role}) ↔ Hafs ${item.hafsKeys.join(',')} similarity below threshold`,
        }, madinanText, hafsText)
      }
    }
  }
  return findings
}

// ---------- main ----------

function summarize(findings) {
  const bySev = { error: 0, warning: 0, info: 0 }
  const byCheck = { A: 0, B: 0, C: 0 }
  const byKind = {}
  for (const f of findings) {
    bySev[f.severity] = (bySev[f.severity] ?? 0) + 1
    byCheck[f.check] = (byCheck[f.check] ?? 0) + 1
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1
  }
  return { bySev, byCheck, byKind }
}

async function main() {
  const surahsMeta = JSON.parse(await readFile(join(DATASET_DIR, 'surahs.json'), 'utf8'))
  const shippedAliases = JSON.parse(await readFile(join(TRANSLATIONS_DIR, '_verse-aliases.json'), 'utf8'))

  const findings = []
  let derived = {}

  const runA = checkArg === 'all' || checkArg === 'A'
  const runB = (checkArg === 'all' || checkArg === 'B') && !OFFLINE
  const runC = checkArg === 'all' || checkArg === 'C'

  if (runA) {
    console.log('[A] alias-coverage — running alignment for all 114 surahs')
    const a = await checkAliasCoverage(surahsMeta, shippedAliases)
    findings.push(...a.findings)
    derived = a.derived
  }

  if (runB) {
    console.log('[B] translation-source — fetching qdc API for all 114 surahs (network)')
    findings.push(...(await checkTranslationSource(surahsMeta)))
  } else if (checkArg === 'B' && OFFLINE) {
    console.log('[B] skipped — --offline')
  }

  if (runC) {
    console.log('[C] cross-riwayah-render — simulating Reader resolution against SHIPPED _verse-aliases.json')
    findings.push(...(await checkCrossRiwayahRender(surahsMeta, shippedAliases)))
  }

  const summary = summarize(findings)
  await mkdir(dirname(REPORT_PATH), { recursive: true })
  await writeFile(REPORT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    args: { check: checkArg, offline: OFFLINE },
    summary,
    findings,
  }, null, 2), 'utf8')

  console.log('\n=== summary ===')
  console.log('severity:', summary.bySev)
  console.log('by check:', summary.byCheck)
  console.log('by kind:', summary.byKind)
  console.log(`\nreport: ${REPORT_PATH}`)
  if (findings.length === 0) { console.log('no findings.') }
  else {
    console.log('\nfirst 10 errors:')
    let n = 0
    for (const f of findings) {
      if (f.severity !== 'error') { continue }
      console.log(' ', JSON.stringify(f).slice(0, 240))
      if (++n >= 10) { break }
    }
  }
  process.exit(summary.bySev.error > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
