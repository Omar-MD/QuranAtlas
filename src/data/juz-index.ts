import juzStarts from './juz-starts.json'
import { fetchJson } from './fetch'

export type DatasetJuzEntry = {
  n: number
  start: {
    ayah?: number
    surah: number
    verse?: number
  }
}

export type JuzIndexEntry = {
  n: number
  start: {
    surah: number
    verse: number
  }
}

// Canonical juz start table. Single-sourced from src/data/juz-starts.json so
// the data pipeline (scripts/data/check-juz-hizb.mjs) can assert the same
// table the reader uses. Invariant: hizb 2N−1 in hizb-index.ts must start
// exactly at juz N's start.
export const DEFAULT_JUZ_STARTS: JuzIndexEntry[] = juzStarts.map(([surah, verse], index) => ({
  n: index + 1,
  start: { surah, verse },
}))

export function buildJuzRows(rows: DatasetJuzEntry[]): JuzIndexEntry[] {
  const byNumber = new Map(rows.map((row) => [row.n, row]))
  return DEFAULT_JUZ_STARTS.map((fallback) => {
    const row = byNumber.get(fallback.n)
    const verse = row?.start.verse ?? row?.start.ayah ?? fallback.start.verse
    const surah = row?.start.surah ?? fallback.start.surah
    return { n: fallback.n, start: { surah, verse } }
  })
}

export async function loadJuzIndex(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<JuzIndexEntry[]> {
  const rows = await fetchJson<unknown>(fetcher, '/dataset/juz.json', { signal })
  if (!Array.isArray(rows)) throw new Error('Invalid Juz index payload')
  return buildJuzRows(rows as DatasetJuzEntry[])
}
