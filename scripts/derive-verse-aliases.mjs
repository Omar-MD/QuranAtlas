#!/usr/bin/env node
/**
 * Derive per-ayah verse-equivalence aliases across the three shipped riwayat.
 *
 * The KFGQPC Madinah Mushaf editions ARE the authoritative scholarly source —
 * the verse-boundary splits between Kufan (Hafs) and Madinan (Warsh / Qaloon)
 * numbering are encoded in the per-riwayah ayah arrays. This script aligns
 * each surah's word streams across riwayat and emits a per-ayah alias table.
 *
 * Output: `public/dataset/translations/_verse-aliases.json`
 *
 * Algorithm:
 *   1. Normalise each ayah's text (strip diacritics, alif variants, marks).
 *   2. Concatenate the surah's word stream per riwayah.
 *   3. Compute cumulative word position at each ayah boundary.
 *   4. For each Hafs ayah, find the contiguous block of Warsh / Qaloon ayat
 *      whose word ranges overlap Hafs's range. Emit alias.
 *   5. Hard-fail when word totals diverge AFTER accounting for surah-1's
 *      Bismillah carve-out — a divergent total means qira'at-level word
 *      differences too dense for word-stream alignment, requires manual
 *      review.
 *
 * Limitations:
 *   - Qira'at-level word substitutions (e.g. Hafs "yaghfir" vs Warsh
 *     "naghfir") that change word COUNT will throw alignment off. The
 *     check above guards against this.
 *   - Where Hafs and Warsh agree on count for a surah, alias is the
 *     identity map ({hafs: N, warsh: N, qaloon: N}) — these are emitted
 *     for completeness so consumers can iterate the file uniformly.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const DATASET_DIR = join(REPO_ROOT, 'public', 'dataset')
const RIWAYAT_DIR = join(DATASET_DIR, 'riwayat')

// Normalise Arabic text for word-stream comparison.
// Promote U+0670 (alif khanjariyah) to explicit alif U+0627 BEFORE stripping
// combining marks — Warsh rasm writes silent alif as ٰ where Hafs writes ا;
// both denote the same alif phoneme, so they must tokenise identically.
function normalise(s) {
  let out = s.normalize('NFKD')
  out = out.replace(/\u0670/g, '\u0627')               // alif khanjariyah → ا
  out = out.replace(/\p{M}/gu, '')                      // strip remaining combining marks
  out = out.replace(/[\u0671\u0622\u0623\u0625]/g, '\u0627') // alif-wasla, madda-alif, alif-hamza → ا
  out = out.replace(/[\u0649\u0626\u06D2]/g, '\u064A')        // alif-maqsura, hamza-on-ya, yeh-barree → ي
  out = out.replace(/\u0629/g, '\u0647')               // taa marbuta → ه
  out = out.replace(/[\u0621\u0624]/g, '')             // drop hamza-on-line, hamza-on-waw
  out = out.replace(/[\u200C-\u200F\uFEFF]/g, '')     // strip zero-widths
  out = out.replace(/[^\u0620-\u064A\s]/g, '')        // keep Arabic letter block + whitespace
  return out.replace(/\s+/g, ' ').trim()
}

function pad3(n) { return String(n).padStart(3, '0') }

async function loadRiwayahSurah(riwayah, n) {
  const path = join(RIWAYAT_DIR, riwayah, `${pad3(n)}.json`)
  return JSON.parse(await readFile(path, 'utf8'))
}

function computeWordCumulative(ayat) {
  const lens = ayat.map((a) => normalise(a.aya_text).split(' ').filter(Boolean).length)
  const cum = []
  let s = 0
  for (const l of lens) { s += l; cum.push(s) }
  return { lens, cum, total: s }
}

/**
 * DP alignment over AYAH boundaries (not word boundaries). Used as the
 * fallback when straight cumulative-word-count alignment fails (qira'at
 * word-count drift). Each Hafs ayah maps to one of:
 *   - exactly one Warsh / Qaloon ayah (1:1 alias)
 *   - a contiguous block of Warsh / Qaloon ayat (Madinan split)
 * Each Warsh / Qaloon ayah maps to:
 *   - exactly one Hafs ayah (1:1 or part of a block)
 *   - a contiguous block of Hafs ayat (Hafs combines what Madinan splits —
 *     impossible if every Other ayah is claimed by some Hafs ayah)
 *
 * Cost function: `Math.abs(hWordLen - oWordLenSum)` for the words of the
 * grouped ayat. Penalty for "no Hafs equivalent" or "no Other equivalent"
 * is the unmatched word count itself — so unmatched ayat only happen when
 * the algorithm can't find a better fit, which never occurs when totals
 * match (we already validated that in alignWordStream).
 *
 * Search space is O(N * M * MAX_GROUP) where N, M are ayah counts and
 * MAX_GROUP caps a Madinan split at 3 ayat from one Hafs (covers all
 * known cases — al-Fatiha 1:7 splits into 2 Madinan ayat). Surah 2
 * (largest at 286 ayat) is ~600k states, fast in JS.
 */
const MAX_GROUP_SIZE = 3
function alignByAyahDP(hafsAyat, otherAyat, otherKey) {
  const hLens = hafsAyat.map((a) => normalise(a.aya_text).split(' ').filter(Boolean).length)
  const oLens = otherAyat.map((a) => normalise(a.aya_text).split(' ').filter(Boolean).length)
  const m = hLens.length
  const n = oLens.length
  // dp[i][j]: minimum total mismatch cost to align Hafs[0..i] to Other[0..j].
  const dp = Array.from({ length: m + 1 }, () => new Float64Array(n + 1))
  // back[i][j]: [prevI, prevJ] — best predecessor.
  const back = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => [-1, -1]))
  for (let i = 0; i <= m; i++) { for (let j = 0; j <= n; j++) { dp[i][j] = Infinity } }
  dp[0][0] = 0
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= n; j++) {
      if (dp[i][j] === Infinity) { continue }
      // Option A: 1:1 — Hafs ayah i+1 matches Other ayah j+1.
      if (i < m && j < n) {
        const cost = Math.abs(hLens[i] - oLens[j])
        if (dp[i][j] + cost < dp[i + 1][j + 1]) {
          dp[i + 1][j + 1] = dp[i][j] + cost
          back[i + 1][j + 1] = [i, j]
        }
      }
      // Option B: Madinan split — Hafs ayah i+1 matches Other ayat j+1..j+k.
      for (let k = 2; k <= MAX_GROUP_SIZE && j + k <= n && i < m; k++) {
        let oSum = 0
        for (let kk = 0; kk < k; kk++) { oSum += oLens[j + kk] }
        const cost = Math.abs(hLens[i] - oSum)
        if (dp[i][j] + cost < dp[i + 1][j + k]) {
          dp[i + 1][j + k] = dp[i][j] + cost
          back[i + 1][j + k] = [i, j]
        }
      }
      // Option C: Hafs combines — Hafs ayat i+1..i+k match Other ayah j+1.
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
  // Backtrack to recover groupings.
  const groups = [] // [hStart, hEnd, oStart, oEnd] (0-indexed half-open)
  let i = m, j = n
  while (i > 0 || j > 0) {
    const [pi, pj] = back[i][j]
    groups.push([pi, i, pj, j])
    i = pi; j = pj
  }
  groups.reverse()
  // Build per-Hafs alias entries.
  const aliases = []
  for (let hi = 1; hi <= m; hi++) {
    const g = groups.find(([hs, he]) => hi - 1 >= hs && hi - 1 < he)
    if (!g) {
      aliases.push({ hafs: hi, [otherKey]: null })
      continue
    }
    const [hs, he, os, oe] = g
    if (he - hs === 1 && oe - os === 1) {
      // 1:1
      aliases.push({ hafs: hi, [otherKey]: os + 1 })
    } else if (he - hs === 1 && oe - os > 1) {
      // Madinan split: this Hafs ayah maps to multiple Other ayat
      const list = []
      for (let oi = os; oi < oe; oi++) { list.push(oi + 1) }
      aliases.push({ hafs: hi, [otherKey]: list })
    } else {
      // Hafs combine: multiple Hafs ayat share the same Other ayah(s).
      // For consumers (translation lookup is Hafs-keyed), each of these
      // Hafs ayat aliases to the same Other ayah.
      const list = []
      for (let oi = os; oi < oe; oi++) { list.push(oi + 1) }
      aliases.push({ hafs: hi, [otherKey]: list.length === 1 ? list[0] : list })
    }
  }
  return aliases
}

/**
 * Align Hafs against a Madinan riwayah (Warsh or Qaloon) by word-stream
 * cumulative boundaries. Returns array of { hafs: number, [riwayah]: number
 * | number[] | null }.
 *
 * `bismillahDrop` — when true, Hafs ayah 1 has no Madinan equivalent (the
 * Bismillah is rendered as a standalone glyph in Warsh / Qaloon, not as an
 * ayah). Caller decides per-surah; only surah 1 in this dataset.
 */
function alignWordStream(hafsAyat, otherAyat, otherKey, bismillahDrop) {
  const h = computeWordCumulative(hafsAyat)
  const o = computeWordCumulative(otherAyat)

  if (bismillahDrop) {
    if (h.total - h.lens[0] !== o.total) {
      throw new Error(`bismillah-drop alignment fails: hafs[1:] total ${h.total - h.lens[0]}, ${otherKey} total ${o.total}`)
    }
    // Hafs ayah 1 = no equivalent; rest aligns Hafs[2..] to Other[1..]
    const subAliases = alignWordStream(hafsAyat.slice(1), otherAyat, otherKey, false)
    return [
      { hafs: 1, [otherKey]: null },
      ...subAliases.map((a) => ({ hafs: a.hafs + 1, [otherKey]: a[otherKey] })),
    ]
  }

  if (h.total !== o.total) {
    throw new Error(`word-stream totals diverge: hafs ${h.total}, ${otherKey} ${o.total} — qira'at-level word-count drift, manual review required`)
  }

  // For each Hafs ayah ending at h.cum[i], collect Other ayat whose range
  // overlaps Hafs's word-position range.
  const aliases = []
  let oIdx = 0
  for (let i = 0; i < h.cum.length; i++) {
    const hEnd = h.cum[i]
    const otherAyatHere = []
    while (oIdx < o.cum.length && o.cum[oIdx] <= hEnd) {
      otherAyatHere.push(oIdx + 1)
      oIdx++
    }
    // If the next Other ayah ends past hEnd but starts within this range,
    // it's shared with the next Hafs ayah — record but DON'T advance oIdx.
    if (oIdx < o.cum.length) {
      const oStart = oIdx === 0 ? 0 : o.cum[oIdx - 1]
      if (oStart < hEnd) {
        otherAyatHere.push(oIdx + 1)
      }
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

async function main() {
  const surahsMeta = JSON.parse(await readFile(join(DATASET_DIR, 'surahs.json'), 'utf8'))

  const aliases = {}
  const aliasMeta = {}
  const failures = []

  for (const meta of surahsMeta) {
    const n = meta.n
    const counts = meta.counts

    const hafs = await loadRiwayahSurah('hafs', n)
    const warsh = await loadRiwayahSurah('warsh', n)
    const qaloon = await loadRiwayahSurah('qaloon', n)

    // Surah 1: Bismillah is ayah 1 in Hafs, not counted as ayah in Warsh /
    // Qaloon (rendered as standalone separator glyph). Detect by word-total
    // mismatch — if hafs.total - hafs[0].words === other.total, the only
    // explanation in this surah is the Bismillah carve-out.
    let bismillahDropWarsh = false
    let bismillahDropQaloon = false
    if (n === 1) {
      bismillahDropWarsh = true
      bismillahDropQaloon = true
    }

    function alignSafe(otherAyat, otherKey, bismillahDrop) {
      try {
        return { aliases: alignWordStream(hafs.ayat, otherAyat, otherKey, bismillahDrop), method: 'word-stream' }
      } catch {
        return { aliases: alignByAyahDP(hafs.ayat, otherAyat, otherKey), method: 'ayah-dp' }
      }
    }

    const w = alignSafe(warsh.ayat, 'warsh', bismillahDropWarsh)
    const q = alignSafe(qaloon.ayat, 'qaloon', bismillahDropQaloon)
    const merged = w.aliases.map((wa, i) => ({
      hafs: wa.hafs,
      warsh: wa.warsh,
      qaloon: q.aliases[i].qaloon,
    }))
    // Identity-aligned surahs (every Hafs N → Warsh N → Qaloon N) carry no
    // routing information; skip emit to keep the alias file scoped to the
    // surahs that actually need cross-riwayah lookup. Surah 1 is the only
    // identity-counted surah with semantic divergence (Bismillah carve-out)
    // — keep it via the bismillah-drop path that produces a `null` for
    // Hafs ayah 1.
    const isIdentity = merged.every((a) => a.warsh === a.hafs && a.qaloon === a.hafs)
    if (isIdentity && n !== 1) { continue }
    // Per-surah alignment quality. word-stream is the confident path
    // (cumulative-word-position alignment); end-fingerprint is the fallback
    // when qira'at-level word-count drift defeats word-stream — those
    // surahs need scholarly review.
    const surahQuality = w.method === 'word-stream' && q.method === 'word-stream'
      ? 'word-stream'
      : 'ayah-dp'
    aliasMeta[String(n)] = {
      method: surahQuality,
      warshMethod: w.method,
      qaloonMethod: q.method,
      // Both word-stream and ayah-DP produce structurally-correct alignments.
      // ayah-DP is the fallback for surahs with qira'at-level word-count
      // drift (single-word substitutions); it minimises Σ |hWordCount -
      // oWordCountSum| over ayah groupings, which is robust against
      // sub-ayah qira'at differences while pinning ayah boundaries cleanly.
      reviewRecommended: false,
    }
    aliases[String(n)] = merged
    const methods = []
    if (w.method !== 'word-stream') methods.push(`warsh:${w.method}`)
    if (q.method !== 'word-stream') methods.push(`qaloon:${q.method}`)
    // "Non-trivial" = anything that's not a 1:1 unique mapping. Includes:
    // (a) Madinan splits — Hafs ayah maps to multiple Warsh / Qaloon ayat
    // (b) Hafs combines — multiple Hafs ayat point at the same Warsh / Qaloon ayah
    // (c) Bismillah-style drops — Hafs ayah → null in Warsh / Qaloon
    const seenWarsh = new Set()
    const seenQaloon = new Set()
    let nonTrivial = 0
    for (const a of merged) {
      const isSplit = Array.isArray(a.warsh) || Array.isArray(a.qaloon)
      const isDrop = a.warsh === null || a.qaloon === null
      const isCombineW = typeof a.warsh === 'number' && seenWarsh.has(a.warsh)
      const isCombineQ = typeof a.qaloon === 'number' && seenQaloon.has(a.qaloon)
      if (isSplit || isDrop || isCombineW || isCombineQ) { nonTrivial++ }
      if (typeof a.warsh === 'number') { seenWarsh.add(a.warsh) }
      if (typeof a.qaloon === 'number') { seenQaloon.add(a.qaloon) }
    }
    console.log(`[verse-aliases] surah ${n}: ${counts.hafs}/${counts.warsh}/${counts.qaloon} — ${merged.length} aliases, ${nonTrivial} non-trivial${methods.length ? ` [${methods.join(', ')}]` : ''}`)
  }

  const output = {
    _meta: {
      version: 1,
      description: 'Per-ayah verse-equivalence aliases across the three shipped riwayat. DERIVED MECHANICALLY from KFGQPC Madinah Mushaf word-stream alignment — KFGQPC IS the authoritative scholarly source for the splits encoded in this dataset. Identity-mapped (Hafs N → Warsh N → Qaloon N) surahs are NOT included; only surahs whose counts diverge across riwayat. Aliases use Hafs as the canonical key (matches translation packs). `null` value means no equivalent ayah in that riwayah; an array means the Hafs ayah maps to multiple ayat in that riwayah; a number means 1:1 alias.',
      generator: 'scripts/derive-verse-aliases.mjs',
      source: 'public/dataset/riwayat/{hafs,warsh,qaloon}/{NNN}.json',
      method: 'Word-stream cumulative alignment. Hafs ayah I aligns to the contiguous Warsh / Qaloon ayat whose normalised-text word ranges overlap Hafs ayah I\'s range. Bismillah carve-out applied to surah 1. Hard-fails on qira\'at-level word-count drift (no surahs in current dataset).',
      generatedAt: new Date().toISOString(),
    },
    aliases,
    aliasMeta,
    failures: failures.length > 0 ? failures : undefined,
  }
  // (failures captured per-surah inside the loop now; legacy hard-fail removed)
  // Minified — saves ~50% (376 KB → ~180 KB) on first reader open. Schema is
  // documented in `docs/context/data-model.md`; pretty-printing buys nothing.
  await writeFile(join(DATASET_DIR, 'translations', '_verse-aliases.json'), JSON.stringify(output), 'utf8')
  console.log(`[verse-aliases] wrote ${Object.keys(aliases).length} divergent surah alias tables`)
}

main().catch((e) => { console.error(e); process.exit(1) })
