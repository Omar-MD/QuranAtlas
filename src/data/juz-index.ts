import { assertRuntimeDatasetUrl } from './runtime-boundary'

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

const DEFAULT_JUZ_STARTS: JuzIndexEntry[] = [
  { n: 1, start: { surah: 1, verse: 1 } },
  { n: 2, start: { surah: 2, verse: 142 } },
  { n: 3, start: { surah: 2, verse: 253 } },
  { n: 4, start: { surah: 3, verse: 92 } },
  { n: 5, start: { surah: 4, verse: 24 } },
  { n: 6, start: { surah: 4, verse: 148 } },
  { n: 7, start: { surah: 5, verse: 82 } },
  { n: 8, start: { surah: 6, verse: 111 } },
  { n: 9, start: { surah: 7, verse: 88 } },
  { n: 10, start: { surah: 8, verse: 41 } },
  { n: 11, start: { surah: 9, verse: 94 } },
  { n: 12, start: { surah: 11, verse: 6 } },
  { n: 13, start: { surah: 12, verse: 53 } },
  { n: 14, start: { surah: 15, verse: 1 } },
  { n: 15, start: { surah: 17, verse: 1 } },
  { n: 16, start: { surah: 18, verse: 75 } },
  { n: 17, start: { surah: 21, verse: 1 } },
  { n: 18, start: { surah: 23, verse: 1 } },
  { n: 19, start: { surah: 25, verse: 21 } },
  { n: 20, start: { surah: 27, verse: 56 } },
  { n: 21, start: { surah: 29, verse: 46 } },
  { n: 22, start: { surah: 33, verse: 31 } },
  { n: 23, start: { surah: 36, verse: 28 } },
  { n: 24, start: { surah: 39, verse: 32 } },
  { n: 25, start: { surah: 41, verse: 47 } },
  { n: 26, start: { surah: 46, verse: 1 } },
  { n: 27, start: { surah: 51, verse: 31 } },
  { n: 28, start: { surah: 58, verse: 1 } },
  { n: 29, start: { surah: 67, verse: 1 } },
  { n: 30, start: { surah: 78, verse: 1 } },
]

async function fetchJson<T>(fetcher: typeof fetch, url: string, signal?: AbortSignal): Promise<T> {
  assertRuntimeDatasetUrl(url)
  const response = await fetcher(url, { signal })
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return response.json() as Promise<T>
}

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
  const rows = await fetchJson<unknown>(fetcher, '/dataset/juz.json', signal)
  if (!Array.isArray(rows)) throw new Error('Invalid Juz index payload')
  return buildJuzRows(rows as DatasetJuzEntry[])
}
