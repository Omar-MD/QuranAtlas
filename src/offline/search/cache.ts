import {
  assertImmutableSearchPackRuntimeUrl,
  type SearchPackManifestV1,
} from '../../../shared/search'
import { searchPackCacheName } from '../cache-names'

export type SearchPackCacheEntryState = 'active' | 'previous-active' | 'visible-tab' | 'live-worker' | 'orphaned'

export type SearchPackLease = {
  contentHash: string
  generation: number
  ownerId: string
  ownerKind: 'tab' | 'worker'
  visible: boolean
  heartbeatAt: number
}

export async function openSearchPackCache(contentHash: string): Promise<Cache> {
  return caches.open(searchPackCacheName(contentHash))
}

export function assertSearchPackRequest(request: RequestInfo | URL, contentHash?: string): string {
  const url = typeof request === 'string'
    ? request
    : request instanceof URL
      ? request.pathname
      : new URL(request.url).pathname
  assertImmutableSearchPackRuntimeUrl(url, contentHash)
  return url
}

export async function stageSearchPackResponses(
  manifest: SearchPackManifestV1,
  fetcher: typeof fetch = fetch,
): Promise<{ cacheName: string; bytesWritten: number }> {
  const cacheName = searchPackCacheName(manifest.contentHash)
  const cache = await caches.open(cacheName)
  let bytesWritten = 0

  for (const shard of manifest.shards) {
    assertSearchPackRequest(shard.url, manifest.contentHash)
    const response = await fetcher(shard.url)
    if (!response.ok) throw new Error(`failed to fetch Search shard ${shard.shardId}`)
    const bytes = await response.clone().arrayBuffer()
    await assertSha256(bytes, shard.checksum)
    await cache.put(shard.url, new Response(bytes, {
      headers: response.headers,
      status: response.status,
      statusText: response.statusText,
    }))
    bytesWritten += bytes.byteLength
  }

  return { cacheName, bytesWritten }
}

export async function verifyCachedSearchPack(manifest: SearchPackManifestV1): Promise<void> {
  const cache = await caches.open(searchPackCacheName(manifest.contentHash))
  for (const shard of manifest.shards) {
    assertSearchPackRequest(shard.url, manifest.contentHash)
    const response = await cache.match(shard.url)
    if (!response) throw new Error(`missing cached Search shard ${shard.shardId}`)
    await assertSha256(await response.arrayBuffer(), shard.checksum)
  }
}

export async function listSearchPackCaches(): Promise<string[]> {
  const names = await caches.keys()
  return names.filter((name) => name.startsWith('quran-atlas-search-pack-')).sort()
}

export async function cleanupOrphanedSearchPackCaches(protectedContentHashes: Iterable<string>): Promise<string[]> {
  const protectedNames = new Set([...protectedContentHashes].map(searchPackCacheName))
  const deleted: string[] = []
  for (const name of await listSearchPackCaches()) {
    if (protectedNames.has(name)) continue
    if (await caches.delete(name)) deleted.push(name)
  }
  return deleted
}

export function isLeaseProtected(lease: SearchPackLease, now = Date.now(), staleAfterMs = 60_000): boolean {
  if (lease.visible) return true
  return now - lease.heartbeatAt <= staleAfterMs
}

async function assertSha256(bytes: ArrayBuffer, expected: string): Promise<void> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  if (actual !== expected) throw new Error('Search pack checksum mismatch')
}
