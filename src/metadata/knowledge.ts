import {
  loadAyahKnowledgeForSurah,
  loadPassagesForSurah,
  type AyahKnowledgeEntry,
  type KnowledgePassage,
} from '../data/knowledge-dataset'
import type { OptionalMetadataState } from './types'

export type KnowledgeMetadata = {
  state: OptionalMetadataState
  ayahsByKey: Record<string, AyahKnowledgeEntry>
  passagesById: Record<string, KnowledgePassage>
}

export async function loadKnowledgeMetadataForSurah(surah: number): Promise<KnowledgeMetadata> {
  const [ayahResult, passageResult] = await Promise.allSettled([
    loadAyahKnowledgeForSurah(surah),
    loadPassagesForSurah(surah),
  ])
  const ayahPayload = ayahResult.status === 'fulfilled' ? ayahResult.value : null
  const passagePayload = passageResult.status === 'fulfilled' ? passageResult.value : null

  const ayahsByKey = ayahPayload
    ? Object.fromEntries(ayahPayload.ayahs.map((entry) => [entry.key, entry]))
    : {}
  const passagesById = passagePayload
    ? Object.fromEntries(passagePayload.passages.map((entry) => [entry.id, entry]))
    : {}

  let state: OptionalMetadataState = 'available'
  if (!ayahPayload && !passagePayload) {
    state = 'unavailable'
  } else if (!ayahPayload || !passagePayload) {
    state = 'stale'
  } else if (ayahPayload.ayahs.length === 0 && passagePayload.passages.length === 0) {
    state = 'empty'
  }

  return {
    state,
    ayahsByKey,
    passagesById,
  }
}

export type { AyahKnowledgeEntry, KnowledgePassage } from '../data/knowledge-dataset'
