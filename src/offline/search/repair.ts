import { type SearchPackRegistryEntry } from '../../../shared/search'
import { openReactDb, type QuranAtlasReactDb } from '../../storage/db'
import { searchPackCacheName } from '../cache-names'
import { fetchSearchPackRegistry, selectCompatibleSearchPack } from './registry'

export type SearchPackAvailabilityState =
  | 'not available'
  | 'available online'
  | 'installing'
  | 'staged'
  | 'verifying'
  | 'active'
  | 'update available'
  | 'incompatible'
  | 'failed'
  | 'offline unavailable'

export type SearchPackRepairState = {
  state: SearchPackAvailabilityState
  activePack: SearchPackRegistryEntry | null
  reason?: string
}

export async function reconcileSearchPackState(
  options: { db?: QuranAtlasReactDb; fetcher?: typeof fetch; online?: boolean } = {},
): Promise<SearchPackRepairState> {
  const db = options.db ?? await openReactDb()
  const online = options.online ?? navigator.onLine
  const active = await db.searchPackActivations.get('current')
  if (active?.status === 'failed') return { state: 'failed', activePack: null, reason: active.error }
  if (active?.status === 'active') {
    if ((await caches.has(searchPackCacheName(active.contentHash)))) {
      if (!online) return { state: 'active', activePack: null }
      const registry = await fetchSearchPackRegistry(options.fetcher)
      const compatible = selectCompatibleSearchPack(registry)
      if (compatible && compatible.contentHash !== active.contentHash) return { state: 'update available', activePack: compatible }
      return { state: 'active', activePack: compatible }
    }
    return online ? { state: 'available online', activePack: null, reason: 'active Search pack cache missing' } : { state: 'offline unavailable', activePack: null }
  }

  const staged = await db.searchPackStaging.toArray()
  const latestStaged = staged.sort((a, b) => b.updatedAt - a.updatedAt)[0]
  if (latestStaged) return { state: latestStaged.status.replace('-', ' ') as SearchPackAvailabilityState, activePack: null }
  if (!online) return { state: 'offline unavailable', activePack: null }

  const registry = await fetchSearchPackRegistry(options.fetcher)
  const compatible = selectCompatibleSearchPack(registry)
  return compatible ? { state: 'available online', activePack: compatible } : { state: 'incompatible', activePack: null }
}
