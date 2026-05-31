import { getAliasVerses, type VerseAlias, type VerseAliases } from '../data/verse-aliases'
import type { Riwayah } from '../storage/types'
import type { SearchMappingAsset, SearchMappingState, SearchReaderRef } from '../../shared/search'
import type { SearchGraphRef } from './schema'

export type SearchReaderRiwayah = Riwayah | 'hafs'

export interface SearchResultMapping {
  sourceRef: SearchGraphRef
  readerRefs: SearchGraphRef[]
  mappingState: SearchMappingState
  canOpenInRead: boolean
  canHighlightWordsInRead: false
  openInReadUrl: string | null
  reason: string
}

export function mapSearchRefToSearchSource(sourceRef: SearchGraphRef): SearchResultMapping {
  return {
    sourceRef,
    readerRefs: [],
    mappingState: 'hafs-source-only',
    canOpenInRead: true,
    canHighlightWordsInRead: false,
    openInReadUrl: null,
    reason: 'Search result is preserved in the Hafs Search source until Open in Read resolves the active Reader target',
  }
}

export function mapSearchRefToReader({
  aliases,
  readerRiwayah,
  sourceRef,
}: {
  aliases: VerseAliases
  readerRiwayah: SearchReaderRiwayah
  sourceRef: SearchGraphRef
}): SearchResultMapping {
  const [surahText, ayahText] = sourceRef.split(':')
  const surah = Number(surahText)
  const ayah = Number(ayahText)
  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) {
    return sourceOnly(sourceRef, 'Search source reference is not a valid ayah reference')
  }

  if (readerRiwayah === 'hafs') {
    return readerIdentity(sourceRef, surah, ayah, 'Hafs Reader can open the Hafs Search source reference directly')
  }

  const surahAliases = aliases[String(surah)]
  if (!surahAliases) {
    return hasLoadedAliases(aliases)
      ? readerIdentity(sourceRef, surah, ayah, 'This surah is omitted from the Hafs-to-Qalun alias table because its ayah boundaries are identity-mapped')
      : sourceOnly(sourceRef, 'Reader alias data is not available for this Search result')
  }

  const alias = surahAliases.find((entry) => entry.hafs === ayah)
  if (!alias) {
    return sourceOnly(sourceRef, 'No explicit Hafs-to-Reader ayah alignment is available for this Search result')
  }

  const readerAyahs = getAliasVerses(alias, readerRiwayah)
  if (readerAyahs.length === 0) {
    return sourceOnly(sourceRef, 'The Hafs source ayah has no validated Qalun Reader alignment')
  }

  const readerRefs = readerAyahs.map((readerAyah) => `${surah}:${readerAyah}` as SearchGraphRef)
  const mappingState = stateForAlias(alias, readerRiwayah, ayah, readerAyahs)
  const canOpenInRead = readerRefs.length === 1 && mappingState !== 'different-ayah-boundary'

  return {
    sourceRef,
    readerRefs,
    mappingState,
    canOpenInRead,
    canHighlightWordsInRead: false,
    openInReadUrl: canOpenInRead ? `#/s/${surah}/${readerAyahs[0]}` : null,
    reason: reasonForMapping(mappingState),
  }
}

export function mappingAssetToResultMapping(asset: SearchMappingAsset): SearchResultMapping {
  const readerRefs = asset.readerRefs.map((ref) => ref.verseKey)
  const singleRef = parseReaderRef(asset.readerRefs[0])
  return {
    sourceRef: asset.sourceRef,
    readerRefs,
    mappingState: asset.mappingState,
    canOpenInRead: asset.canOpenInRead && readerRefs.length === 1,
    canHighlightWordsInRead: false,
    openInReadUrl: asset.canOpenInRead && singleRef ? `#/s/${singleRef.surah}/${singleRef.ayah}` : null,
    reason: asset.reason,
  }
}

function hasLoadedAliases(aliases: VerseAliases): boolean {
  return Object.keys(aliases).length > 0
}

function stateForAlias(
  alias: VerseAlias,
  riwayah: Riwayah,
  sourceAyah: number,
  readerAyahs: number[],
): SearchMappingState {
  if (readerAyahs.length > 1) return 'different-ayah-boundary'
  if (readerAyahs[0] === sourceAyah && alias[riwayah] !== null) return 'same-wording-in-reader'
  return 'corresponding-ayah-in-reader'
}

function readerIdentity(sourceRef: SearchGraphRef, surah: number, ayah: number, reason: string): SearchResultMapping {
  return {
    sourceRef,
    readerRefs: [sourceRef],
    mappingState: 'same-wording-in-reader',
    canOpenInRead: true,
    canHighlightWordsInRead: false,
    openInReadUrl: `#/s/${surah}/${ayah}`,
    reason,
  }
}

function reasonForMapping(state: SearchMappingState): string {
  if (state === 'same-wording-in-reader') return 'Same wording in Reader is explicitly validated for this ayah'
  if (state === 'corresponding-ayah-in-reader') return 'A corresponding Qalun Reader ayah is explicitly mapped'
  if (state === 'different-ayah-boundary') return 'The mapped Reader text uses a different ayah boundary'
  if (state === 'no-reader-ayah-alignment') return 'No Reader ayah alignment is available'
  if (state === 'no-reader-token-alignment') return 'Reader word-level alignment is not validated'
  return 'This result is available in the Hafs Search source only'
}

function sourceOnly(sourceRef: SearchGraphRef, reason: string): SearchResultMapping {
  return {
    sourceRef,
    readerRefs: [],
    mappingState: 'hafs-source-only',
    canOpenInRead: false,
    canHighlightWordsInRead: false,
    openInReadUrl: null,
    reason,
  }
}

function parseReaderRef(ref: SearchReaderRef | undefined): { surah: number; ayah: number } | null {
  if (!ref) return null
  return { surah: ref.surah, ayah: ref.ayah }
}
