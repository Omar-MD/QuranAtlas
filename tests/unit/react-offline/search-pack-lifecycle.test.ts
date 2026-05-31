import { createHash } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import { datasetRuntimeCaching } from '../../../vite.config'
import { searchPackCacheName } from '../../../src/offline/cache-names'
import { isLeaseProtected, stageSearchPackResponses, verifyCachedSearchPack } from '../../../src/offline/search/cache'
import { selectCompatibleSearchPack } from '../../../src/offline/search/registry'
import type { SearchPackManifestV1 } from '../../../shared/search'

function makeBytes(value: string) {
  return new TextEncoder().encode(value)
}

function sha256(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex')
}

function makeManifest(): SearchPackManifestV1 {
  const bytes = makeBytes('search-shard')
  return {
    packId: 'qa-search-core-hafs-v1',
    packVersion: '1.0.0',
    packAbiVersion: '1.0',
    minAppVersion: '0.0.0',
    minWorkerVersion: '1.0.0',
    contentHash: '0123456789abcdef',
    graphCorpusId: 'hafs-search-core-v1',
    sourceRiwayah: 'hafs',
    features: ['core'],
    requires: [],
    compatibleWith: ['quranatlas-search-phase-1'],
    licenseIds: ['search-pack-metadata-quranatlas'],
    sourceIds: ['search-hafs-text-kfgqpc-v1'],
    normalizerVersion: 1,
    queryAstVersion: 1,
    checksumAlgorithm: 'sha-256',
    totalBytes: bytes.byteLength,
    estimatedMemoryBytes: bytes.byteLength,
    byteBudget: {
      maxShardBytes: 4 * 1024 * 1024,
      maxDecodedShardBytes: 8 * 1024 * 1024,
      maxResidentWorkerBytes: 48 * 1024 * 1024,
    },
    shards: [{
      shardId: 'core-fixture',
      featureId: 'core',
      schemaId: 'search-shard-core-v1',
      url: '/search-packs/packs/0123456789abcdef/shards/core-fixture.qas',
      byteLength: bytes.byteLength,
      checksum: sha256(bytes),
      checksumAlgorithm: 'sha-256',
      checksumScope: 'encoded-bytes',
      requiredDictionaries: [],
      estimatedMemoryBytes: bytes.byteLength,
      decodingFixtureId: 'fixture',
      maxDecodedBytes: bytes.byteLength,
      internalCompression: 'none',
    }],
    notices: [],
    buildInputDigests: { source: 'a'.repeat(64) },
    builtAt: '2026-05-31T00:00:00.000Z',
  }
}

describe('Search pack lifecycle', () => {
  it('uses a dedicated Search cache and verifies fetched encoded bytes', async () => {
    const manifest = makeManifest()
    const bytes = makeBytes('search-shard')
    const store = new Map<string, Response>()
    vi.stubGlobal('caches', {
      open: async () => ({
        put: async (key: string, response: Response) => { store.set(key, response) },
        match: async (key: string) => store.get(key),
      }),
      keys: async () => [searchPackCacheName(manifest.contentHash)],
      delete: async () => true,
    })

    await expect(stageSearchPackResponses(manifest, async () => new Response(bytes) as Response)).resolves.toEqual({
      cacheName: searchPackCacheName(manifest.contentHash),
      bytesWritten: bytes.byteLength,
    })
    await expect(verifyCachedSearchPack(manifest)).resolves.toBeUndefined()
  })

  it('does not let Search pack URLs be owned by generic dataset CacheFirst handling', async () => {
    expect(datasetRuntimeCaching.urlPattern({ url: new URL('https://quranatlas.test/dataset/surahs.json') })).toBe(true)
    expect(datasetRuntimeCaching.urlPattern({ url: new URL('https://quranatlas.test/dataset/search/baseline/index.json') })).toBe(false)
    expect(datasetRuntimeCaching.urlPattern({ url: new URL('https://quranatlas.test/search-packs/registry.json') })).toBe(false)
  })

  it('selects compatible registry entries and protects visible-tab leases', () => {
    expect(selectCompatibleSearchPack({
      registryVersion: 1,
      registryUrl: '/search-packs/registry.json',
      generatedAt: '2026-05-31T00:00:00.000Z',
      packs: [{
        packId: 'qa-search-core-hafs-v1',
        packVersion: '1.0.0',
        contentHash: '0123456789abcdef',
        manifestUrl: '/search-packs/packs/0123456789abcdef/manifest.json',
        sourceRiwayah: 'hafs',
        features: ['core'],
        minAppVersion: '0.0.0',
        minWorkerVersion: '1.0.0',
        totalBytes: 12,
      }],
    })?.contentHash).toBe('0123456789abcdef')
    expect(isLeaseProtected({
      contentHash: '0123456789abcdef',
      generation: 1,
      ownerId: 'tab-1',
      ownerKind: 'tab',
      visible: true,
      heartbeatAt: 0,
    }, 120_000)).toBe(true)
  })
})
