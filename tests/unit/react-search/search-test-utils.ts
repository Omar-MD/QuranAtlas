import { createHash } from 'node:crypto'

import type { SearchPackManifestV1 } from '../../../shared/search'

const HEADER_LENGTH = 48
const DIRECTORY_ENTRY_LENGTH = 28

export class MemoryCacheStorage {
  private readonly caches = new Map<string, MemoryCache>()

  async open(name: string): Promise<MemoryCache> {
    const existing = this.caches.get(name)
    if (existing) return existing
    const cache = new MemoryCache()
    this.caches.set(name, cache)
    return cache
  }
}

export class MemoryCache {
  private readonly responses = new Map<string, Response>()

  async match(url: string): Promise<Response | undefined> {
    return this.responses.get(url)
  }

  async put(url: string, response: Response): Promise<void> {
    this.responses.set(url, response)
  }
}

export async function createFixturePack() {
  const contentHash = 'abcdef1234567890abcdef1234567890'
  const cacheStorage = new MemoryCacheStorage()
  const cache = await cacheStorage.open(`quran-atlas-search-pack-${contentHash}`)
  const payloads = {
    'core-references': {
      kind: 'references',
      ayahs: [
        {
          ayahId: 1,
          ref: '1:1',
          surah: 1,
          ayah: 1,
          sourceRef: '1:1',
          arabicText: 'بسم الله الرحمن الرحيم',
          translationText: 'In the name of Allah',
          tokenCount: 4,
        },
        {
          ayahId: 2,
          ref: '2:255',
          surah: 2,
          ayah: 255,
          sourceRef: '2:255',
          arabicText: 'الله لا اله الا هو',
          translationText: 'Allah there is no deity except Him',
          tokenCount: 5,
        },
      ],
    },
    'core-dictionaries': {
      kind: 'dictionaries',
      dictionaries: {
        normalizedTokens: [{ id: 1, value: 'الله' }],
        surfaceTokens: [{ id: 1, value: 'اللَّهِ' }],
      },
    },
    'arabic-postings': {
      kind: 'postings',
      lane: 'arabic',
      postings: [{ term: 'الله', postings: [{ ayahId: 1, position: 1 }, { ayahId: 2, position: 0 }] }],
    },
    'exact-word-postings': {
      kind: 'postings',
      lane: 'exact-word',
      postings: [{ term: 'اللَّهِ', postings: [{ ayahId: 1, position: 1 }] }],
    },
    'translation-postings': {
      kind: 'postings',
      lane: 'translation',
      postings: [{ term: 'allah', postings: [{ ayahId: 1, position: 4 }, { ayahId: 2, position: 0 }] }],
    },
    'phrase-postings-l2-1': {
      kind: 'postings',
      lane: 'phrase',
      phraseLength: 2,
      postings: [{ term: 'بسم الله', postings: [{ ayahId: 1, position: 0 }] }],
    },
  } as const

  const shardManifests: SearchPackManifestV1['shards'] = []
  for (const [shardId, payload] of Object.entries(payloads)) {
    const bytes = writeJsonShard(payload)
    const url = `/search-packs/packs/${contentHash}/shards/${shardId}.qas`
    await cache.put(url, new Response(bytes))
    shardManifests.push({
      shardId,
      featureId: shardId.startsWith('phrase') ? 'phrase' : 'core',
      schemaId: shardId.startsWith('phrase') ? 'search-shard-phrase-v1' : 'search-shard-core-v1',
      url,
      byteLength: bytes.byteLength,
      checksum: sha256Hex(bytes),
      checksumAlgorithm: 'sha-256',
      checksumScope: 'encoded-bytes',
      requiredDictionaries: [],
      estimatedMemoryBytes: bytes.byteLength,
      decodingFixtureId: `test-${shardId}`,
      maxDecodedBytes: 64_000,
      internalCompression: 'none',
    })
  }

  const manifest: SearchPackManifestV1 = {
    packId: 'qa-search-core-hafs-v1',
    packVersion: '1.0.0',
    packAbiVersion: '1.0',
    minAppVersion: '0.0.0',
    minWorkerVersion: '1.0.0',
    contentHash,
    graphCorpusId: 'test-hafs',
    sourceRiwayah: 'hafs',
    features: ['core', 'arabic-text', 'translation', 'context', 'phrase', 'provenance'],
    requires: ['core-references', 'core-dictionaries'],
    compatibleWith: ['test'],
    licenseIds: ['test-license'],
    sourceIds: ['test-source'],
    normalizerVersion: 1,
    queryAstVersion: 1,
    checksumAlgorithm: 'sha-256',
    totalBytes: shardManifests.reduce((sum, shard) => sum + shard.byteLength, 0),
    estimatedMemoryBytes: shardManifests.reduce((sum, shard) => sum + shard.estimatedMemoryBytes, 0),
    byteBudget: {
      maxShardBytes: 64_000,
      maxDecodedShardBytes: 64_000,
      maxResidentWorkerBytes: 128_000,
    },
    shards: shardManifests,
    notices: [],
    buildInputDigests: {},
    builtAt: '2026-05-31T00:00:00.000Z',
  }

  return { cacheStorage, manifest }
}

export function writeJsonShard(payload: unknown): ArrayBuffer {
  const body = new TextEncoder().encode(JSON.stringify(payload))
  const bytes = new Uint8Array(HEADER_LENGTH + DIRECTORY_ENTRY_LENGTH + body.byteLength)
  const view = new DataView(bytes.buffer)
  bytes.set([0x51, 0x41, 0x53, 0x31], 0)
  view.setUint16(4, 1, true)
  view.setUint16(6, 0, true)
  view.setUint32(8, 0x01020304, true)
  view.setUint16(12, 1, true)
  view.setUint16(14, 1, true)
  view.setUint32(16, HEADER_LENGTH, true)
  view.setUint32(20, HEADER_LENGTH, true)
  view.setUint32(24, 1, true)
  view.setUint32(28, body.byteLength, true)
  view.setUint32(32, 1, true)
  view.setUint16(HEADER_LENGTH, 5, true)
  view.setUint32(HEADER_LENGTH + 4, HEADER_LENGTH + DIRECTORY_ENTRY_LENGTH, true)
  view.setUint32(HEADER_LENGTH + 8, body.byteLength, true)
  view.setUint32(HEADER_LENGTH + 12, 1, true)
  view.setUint16(HEADER_LENGTH + 16, 255, true)
  view.setUint16(HEADER_LENGTH + 18, 4, true)
  view.setUint8(HEADER_LENGTH + 20, 1)
  bytes.set(body, HEADER_LENGTH + DIRECTORY_ENTRY_LENGTH)
  return bytes.buffer
}

export function sha256Hex(bytes: ArrayBuffer): string {
  return createHash('sha256').update(new Uint8Array(bytes)).digest('hex')
}
