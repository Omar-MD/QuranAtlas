import type { Riwayah } from '../storage/types'

export type SearchLane = 'arabic' | 'translation' | 'metadata'

export type SearchRef = {
  surah: number
  verse: number
}

export type SearchEntry = {
  id: string
  lane: SearchLane
  sourceRiwayah: Riwayah
  sourceRef: SearchRef
  text: string
}

export type SearchShard = {
  id: string
  generatedAt: string
  entries: SearchEntry[]
}

export type SearchResult = SearchEntry & {
  matchReason: 'text' | 'lane'
  excerpt: string
}
