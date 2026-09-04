import type { SearchPackManifestV1 } from '../../../shared/search'
import { openReactDb, type QuranAtlasReactDb } from '../../storage/db'
import type { SearchPackActivationRecord, SearchPackStagingRecord } from '../../storage/types'
import { searchPackCacheName } from '../cache-names'
import { assertSearchPackQuota } from './quota'
import { stageSearchPackResponses, verifyCachedSearchPack } from './cache'

export const SEARCH_PACK_ACTIVATION_ID = 'current'

export type SearchPackActivationMessage = {
  type: 'search-pack-activation'
  generation: number
  contentHash: string
}

export async function installSearchPack(
  manifest: SearchPackManifestV1,
  options: { db?: QuranAtlasReactDb; fetcher?: typeof fetch; now?: number } = {},
): Promise<SearchPackStagingRecord> {
  const db = options.db ?? await openReactDb()
  const now = options.now ?? Date.now()
  await assertSearchPackQuota(manifest)
  const { cacheName, bytesWritten } = await stageSearchPackResponses(manifest, options.fetcher)
  const record: SearchPackStagingRecord = {
    id: manifest.contentHash,
    packId: manifest.packId,
    packVersion: manifest.packVersion,
    contentHash: manifest.contentHash,
    status: 'staged',
    cacheName,
    totalBytes: manifest.totalBytes,
    verifiedBytes: bytesWritten,
    createdAt: now,
    updatedAt: now,
  }
  await db.searchPackStaging.put(record)
  return record
}

export async function verifyStagedSearchPack(
  manifest: SearchPackManifestV1,
  options: { db?: QuranAtlasReactDb; now?: number } = {},
): Promise<SearchPackStagingRecord> {
  const db = options.db ?? await openReactDb()
  const existing = await db.searchPackStaging.get(manifest.contentHash)
  if (!existing) throw new Error('Search pack is not staged')
  await db.searchPackStaging.put({ ...existing, status: 'verifying', updatedAt: options.now ?? Date.now() })
  await verifyCachedSearchPack(manifest)
  const verified = { ...existing, status: 'staged' as const, verifiedBytes: manifest.totalBytes, updatedAt: options.now ?? Date.now() }
  await db.searchPackStaging.put(verified)
  return verified
}

export async function activateSearchPack(
  manifest: SearchPackManifestV1,
  options: { db?: QuranAtlasReactDb; expectedGeneration?: number; now?: number } = {},
): Promise<SearchPackActivationRecord> {
  const db = options.db ?? await openReactDb()
  const now = options.now ?? Date.now()
  let record: SearchPackActivationRecord | null = null
  await db.transaction('rw', db.searchPackActivations, db.searchPackStaging, async () => {
    const current = await db.searchPackActivations.get(SEARCH_PACK_ACTIVATION_ID)
    if (typeof options.expectedGeneration === 'number' && current && current.generation !== options.expectedGeneration) {
      throw new Error('Search pack activation generation changed')
    }
    const nextGeneration = (current?.generation ?? 0) + 1
    record = {
      id: SEARCH_PACK_ACTIVATION_ID,
      packId: manifest.packId,
      packVersion: manifest.packVersion,
      contentHash: manifest.contentHash,
      generation: nextGeneration,
      status: 'active',
      cacheName: searchPackCacheName(manifest.contentHash),
      totalBytes: manifest.totalBytes,
      estimatedMemoryBytes: manifest.estimatedMemoryBytes,
      activatedAt: now,
      verifiedAt: now,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    }
    await db.searchPackActivations.put(record)
    await db.searchPackStaging.delete(manifest.contentHash)
  })
  if (!record) throw new Error('Search pack activation did not complete')
  announceSearchPackActivation(record)
  return record
}

export async function rollbackSearchPack(
  previous: SearchPackActivationRecord,
  options: { db?: QuranAtlasReactDb; now?: number } = {},
): Promise<SearchPackActivationRecord> {
  const db = options.db ?? await openReactDb()
  const record = { ...previous, generation: previous.generation + 1, status: 'active' as const, updatedAt: options.now ?? Date.now() }
  await db.searchPackActivations.put(record)
  announceSearchPackActivation(record)
  return record
}

export function announceSearchPackActivation(record: Pick<SearchPackActivationRecord, 'generation' | 'contentHash'>): void {
  const message: SearchPackActivationMessage = {
    type: 'search-pack-activation',
    generation: record.generation,
    contentHash: record.contentHash,
  }
  if ('BroadcastChannel' in globalThis) {
    const channel = new BroadcastChannel('quran-atlas-search-pack-activation')
    channel.postMessage(message)
    channel.close()
  } else {
    localStorage.setItem('quran-atlas-search-pack-activation', JSON.stringify({ ...message, sentAt: Date.now() }))
  }
}
