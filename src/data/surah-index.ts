import { assertRuntimeDatasetUrl } from './runtime-boundary'
import type { Riwayah } from '../storage/types'

export type ReaderSurahIndexEntry = {
  counts: Record<Riwayah, number>
  n: number
  name: string
  name_ar: string
}

export type ReaderSurahDirection = 'next' | 'previous'

const FIRST_SURAH = 1
const LAST_SURAH = 114

async function fetchJson<T>(fetcher: typeof fetch, url: string, signal?: AbortSignal): Promise<T> {
  assertRuntimeDatasetUrl(url)
  const response = await fetcher(url, { signal })
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return response.json() as Promise<T>
}

function isReaderSurahIndexEntry(value: unknown): value is ReaderSurahIndexEntry {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<ReaderSurahIndexEntry>
  return Number.isInteger(row.n)
    && typeof row.name === 'string'
    && row.name.length > 0
    && typeof row.name_ar === 'string'
    && row.name_ar.length > 0
    && Boolean(row.counts)
}

export async function loadReaderSurahIndex(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<ReaderSurahIndexEntry[]> {
  const rows = await fetchJson<unknown>(fetcher, '/dataset/surahs.json', signal)
  if (!Array.isArray(rows) || rows.length !== LAST_SURAH || !rows.every(isReaderSurahIndexEntry)) {
    throw new Error('Invalid reader Surah index payload')
  }
  return rows
}

export function adjacentSurahNumber(surah: number, direction: ReaderSurahDirection): number {
  if (direction === 'next') return surah >= LAST_SURAH ? FIRST_SURAH : surah + 1
  return surah <= FIRST_SURAH ? LAST_SURAH : surah - 1
}

export function findAdjacentSurah(
  rows: ReaderSurahIndexEntry[],
  surah: number,
  direction: ReaderSurahDirection,
): ReaderSurahIndexEntry | null {
  const target = adjacentSurahNumber(surah, direction)
  return rows.find((row) => row.n === target) ?? null
}
