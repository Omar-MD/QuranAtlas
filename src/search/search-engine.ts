import type { Riwayah } from '../storage/types'
import type { SearchEntry, SearchResult, SearchShard } from './schema'
import { getAliasVerses, type VerseAliases } from '../data/verse-aliases'

export function searchShard(shard: SearchShard, query: string): SearchResult[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return []
  return shard.entries
    .filter((entry) => entry.text.toLocaleLowerCase().includes(normalized) || entry.lane.includes(normalized))
    .map((entry) => ({
      ...entry,
      excerpt: entry.text,
      matchReason: entry.text.toLocaleLowerCase().includes(normalized) ? 'text' : 'lane',
    }))
}

export function mapSearchResultToActiveRiwayah(
  result: Pick<SearchEntry, 'lane' | 'sourceRef' | 'sourceRiwayah'>,
  { aliases }: { aliases: VerseAliases },
  riwayah: Riwayah,
): { displayRef: { surah: number; verse: number }; aliasRole: 'identity' | 'primary' | 'continuation' } {
  if (result.sourceRiwayah === riwayah) {
    return { displayRef: result.sourceRef, aliasRole: 'identity' }
  }
  const alias = aliases[String(result.sourceRef.surah)]?.find((entry) => entry.hafs === result.sourceRef.verse)
  if (!alias) return { displayRef: result.sourceRef, aliasRole: 'identity' }
  const verses = getAliasVerses(alias, riwayah)
  return { displayRef: { surah: result.sourceRef.surah, verse: verses[0] ?? result.sourceRef.verse }, aliasRole: 'primary' }
}
