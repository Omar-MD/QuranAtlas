import hizbStarts from './hizb-starts.json'
import { loadReaderSurahIndex } from './surah-index'
import { refFromIndex, refToIndex, type QuranRef, type SurahCount } from '../continuity/verse-key'

export type HizbIndexEntry = {
  end: QuranRef
  n: number
  start: QuranRef
}

// Canonical 60-entry hizb start table. Single-sourced from
// src/data/hizb-starts.json so the data pipeline
// (scripts/data/check-juz-hizb.mjs) can assert the same table the reader uses.
//
// Derivation: the repo's normalized sources carry jozz (juz) markers but no
// rubʿ (quarter) markers, so the table comes from Tanzil's published quarter
// metadata (240 quarters; every 4th quarter starts a hizb), with every
// boundary verified to be an actual Hafs ayah start, plus one deviation forced
// by this app's canonical juz table: hizb 21 = 9:94 — Tanzil starts juz 11 at
// 9:93, while the KFGQPC source this app builds from (and
// src/data/juz-starts.json) use 9:94. Invariant: hizb 2N−1 must start exactly
// at juz N's start ayah (N = 1..30).
export const HIZB_STARTS: ReadonlyArray<readonly [number, number]> = hizbStarts.map(
  ([surah, verse]) => [surah, verse] as const,
)

export function buildHizbRows(counts: ReadonlyArray<SurahCount>): HizbIndexEntry[] {
  const total = counts.reduce((sum, row) => sum + row.count, 0)
  return HIZB_STARTS.map(([surah, verse], index) => {
    const next = HIZB_STARTS[index + 1]
    const endIndex = next ? refToIndex({ surah: next[0], verse: next[1] }, counts) - 1 : total
    return {
      end: refFromIndex(endIndex, counts),
      n: index + 1,
      start: { surah, verse },
    }
  })
}

export async function loadHizbIndex(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<HizbIndexEntry[]> {
  const rows = await loadReaderSurahIndex(fetcher, signal)
  return buildHizbRows(rows.map((row) => ({ count: row.counts.qaloon, n: row.n })))
}
