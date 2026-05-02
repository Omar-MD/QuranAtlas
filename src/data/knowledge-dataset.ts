import { CACHE_DATASET } from '../core/constants'

const DATASET_BASE = '/dataset/knowledge'
const FETCH_TIMEOUT_MS = 3000

export type KnowledgeTheme = {
  id: string
  weight: number
  certainty: 'high' | 'medium' | 'low'
}

export type AyahKnowledgeEntry = {
  key: string
  passageId: string | null
  themes: KnowledgeTheme[]
}

export type SurahAyahKnowledgePayload = {
  surah: number
  version: string
  ayahs: AyahKnowledgeEntry[]
}

export type KnowledgePassage = {
  id: string
  startKey: string
  endKey: string
  title: { en: string, ar?: string }
  summary: { en: string, ar?: string }
  themes: string[]
  roleInSurah: string
}

export type SurahPassagesPayload = {
  surah: number
  version: string
  passages: KnowledgePassage[]
}

let ayahPayloadCache = new Map<number, Promise<SurahAyahKnowledgePayload | null>>()
let passagePayloadCache = new Map<number, Promise<SurahPassagesPayload | null>>()

function parseAyahKey(ayahKey: string): { surah: number, ayah: number } {
  const [surahRaw, ayahRaw, ...rest] = String(ayahKey).split(':')
  const surah = Number(surahRaw)
  const ayah = Number(ayahRaw)
  if (rest.length !== 0 || !Number.isInteger(surah) || !Number.isInteger(ayah) || surah < 1 || surah > 114 || ayah < 1) {
    throw new Error(`Invalid ayah key: ${ayahKey}`)
  }
  return { surah, ayah }
}

function assertSurahNumber(surahNumber: number): number {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    throw new Error(`Invalid surah number: ${surahNumber}`)
  }
  return surahNumber
}

async function fetchKnowledgeJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status}`)
    }
    return await res.json()
  } catch {
    clearTimeout(timeout)
    try {
      const cache = await caches.open(CACHE_DATASET)
      const cached = await cache.match(url)
      if (cached) {
        return await cached.json()
      }
    } catch {
      // cache miss
    }
    return null
  }
}

export async function loadAyahKnowledgeForSurah(surahNumber: number): Promise<SurahAyahKnowledgePayload | null> {
  const surah = assertSurahNumber(surahNumber)
  const cached = ayahPayloadCache.get(surah)
  if (cached) {
    return cached
  }
  const padded = String(surah).padStart(3, '0')
  const promise = (async () => {
    const payload = await fetchKnowledgeJson(`${DATASET_BASE}/ayah/${padded}.json`) as SurahAyahKnowledgePayload | null
    if (!payload || payload.surah !== surah || !Array.isArray(payload.ayahs)) {
      return null
    }
    return payload
  })()
  ayahPayloadCache.set(surah, promise)
  return promise
}

export async function loadPassagesForSurah(surahNumber: number): Promise<SurahPassagesPayload | null> {
  const surah = assertSurahNumber(surahNumber)
  const cached = passagePayloadCache.get(surah)
  if (cached) {
    return cached
  }
  const padded = String(surah).padStart(3, '0')
  const promise = (async () => {
    const payload = await fetchKnowledgeJson(`${DATASET_BASE}/passages/${padded}.json`) as SurahPassagesPayload | null
    if (!payload || payload.surah !== surah || !Array.isArray(payload.passages)) {
      return null
    }
    return payload
  })()
  passagePayloadCache.set(surah, promise)
  return promise
}

export async function getAyahKnowledge(ayahKey: string): Promise<AyahKnowledgeEntry | null> {
  const { surah } = parseAyahKey(ayahKey)
  const payload = await loadAyahKnowledgeForSurah(surah)
  if (!payload) {
    return null
  }
  return payload.ayahs.find((entry) => entry.key === ayahKey) ?? null
}

export async function getThemesForAyah(ayahKey: string): Promise<KnowledgeTheme[]> {
  const knowledge = await getAyahKnowledge(ayahKey)
  return knowledge?.themes ?? []
}

export async function getPassageForAyah(ayahKey: string): Promise<KnowledgePassage | null> {
  const knowledge = await getAyahKnowledge(ayahKey)
  if (!knowledge?.passageId) {
    return null
  }
  const { surah } = parseAyahKey(ayahKey)
  const payload = await loadPassagesForSurah(surah)
  if (!payload) {
    return null
  }
  return payload.passages.find((passage) => passage.id === knowledge.passageId) ?? null
}

export function clearKnowledgeDatasetCache(): void {
  ayahPayloadCache = new Map()
  passagePayloadCache = new Map()
}
