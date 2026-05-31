import { describe, expect, it } from 'vitest'

import type { SearchPackManifestV1 } from '../../../shared/search'
import { SearchWorkerSession } from '../../../src/search-worker/session'
import { parseSearchQuery } from '../../../src/search/query-parser'
import { createFixturePack, sha256Hex, writeJsonShard } from './search-test-utils'

describe('Search graph worker runtime', () => {
  it('returns lazy memory graph sections with panel DTOs and no generated wording language', async () => {
    const { cacheStorage, manifest } = await createGraphFixturePack()
    const session = new SearchWorkerSession({ cacheStorage, manifest })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })

    const parsed = parseSearchQuery('بسم الله', { mode: 'phrase' })
    const query = await session.handle({ type: 'query', requestId: 'query', query: parsed.ast, limit: 1, sort: 'relevance' })
    if (query.type !== 'ok' || query.payload.kind !== 'query-window') throw new Error('expected query window')

    const response = await session.handle({
      type: 'explore',
      requestId: 'explore',
      query: parsed.ast,
      result: query.payload.window.results[0]!,
      limit: 2,
    })

    expect(response).toMatchObject({ type: 'ok', payload: { kind: 'explore-sections' } })
    if (response.type !== 'ok' || response.payload.kind !== 'explore-sections') throw new Error('expected explore sections')
    const sections = response.payload.sections as Array<{ id: string; rows?: unknown[]; note?: string; summary?: unknown }>
    expect(sections.map((section) => section.id)).toEqual([
      'following-wording',
      'shared-wording',
      'repeated-phrases',
      'occurs-once',
      'ayah-endings',
      'counts-patterns',
    ])
    expect(sections.find((section) => section.id === 'following-wording')?.note).toBe('Attested following wording shows wording observed after this phrase in the indexed text.')
    expect(JSON.stringify(sections)).not.toMatch(/prediction|autocomplete|suggested/i)
  })

  it('returns panel-level unavailable sections when graph features are absent', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const session = new SearchWorkerSession({ cacheStorage, manifest })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })
    const parsed = parseSearchQuery('بسم الله', { mode: 'phrase' })
    const query = await session.handle({ type: 'query', requestId: 'query', query: parsed.ast, limit: 1, sort: 'relevance' })
    if (query.type !== 'ok' || query.payload.kind !== 'query-window') throw new Error('expected query window')

    const response = await session.handle({
      type: 'explore',
      requestId: 'missing-graph',
      query: parsed.ast,
      result: query.payload.window.results[0]!,
      sections: ['following-wording'],
    })

    expect(response).toMatchObject({
      type: 'ok',
      payload: {
        kind: 'explore-sections',
        sections: [{ id: 'following-wording', unavailable: { retryable: true } }],
      },
    })
  })
})

async function createGraphFixturePack() {
  const fixture = await createFixturePack()
  const contentHash = fixture.manifest.contentHash
  const cache = await fixture.cacheStorage.open(`quran-atlas-search-pack-${contentHash}`)
  const sourcePolicy = [{ label: 'Boundary policy', value: 'Phrase windows stay within one ayah and one surah.' }]
  const payloads = {
    'following-wording-1': {
      kind: 'following-wording',
      sourcePolicy,
      rows: [{ term: 'بسم الله', length: 2, followers: [{ token: 'الرحمن', count: 1, refs: [{ ref: '1:1', position: 0, phraseLength: 2 }] }] }],
    },
    'shared-wording-1': {
      kind: 'shared-wording',
      sourcePolicy,
      rows: [{ ayahId: 1, ref: '1:1', neighbors: [{ ayahId: 2, ref: '2:255', sharedTokenCount: 1, sharedTokens: ['الله'] }] }],
    },
    'repeated-phrases-1': {
      kind: 'repeated-phrases',
      sourcePolicy,
      rows: [{ term: 'بسم الله', length: 2, count: 2, refs: [{ ref: '1:1', position: 0 }, { ref: '2:255', position: 0 }] }],
    },
    'occurs-once-1': {
      kind: 'occurs-once',
      sourcePolicy,
      rows: [{ term: 'الله الرحمن', length: 2, count: 1, refs: [{ ref: '1:1', position: 1 }] }],
    },
    'ayah-endings': {
      kind: 'ayah-endings',
      sourcePolicy,
      rows: [{ ayahId: 1, ref: '1:1', endings: [{ term: 'الرحيم', length: 1, position: 3, countInIndex: 1 }] }],
      topEndings: [{ term: 'الرحيم', count: 1, refs: [{ ref: '1:1', position: 3, length: 1 }] }],
    },
    'counts-patterns': {
      kind: 'counts-patterns',
      sourcePolicy,
      tokenCounts: { totalTokens: 9, uniqueTokens: 7 },
      phraseCounts: [{ length: 2, count: 4 }],
      rootCounts: [{ root: 'Alh', count: 2 }],
      surahDistribution: [{ surah: 1, ayahCount: 1, tokenCount: 4 }],
      ayahEndings: [{ term: 'الرحيم', count: 1 }],
      adjacencyCounts: { ayahsWithSharedWording: 1, sharedEdges: 1 },
    },
    'graph-provenance': {
      kind: 'graph-provenance',
      sourcePolicy,
      sourceIds: ['test-source'],
      generatedFeatureIds: ['following-wording'],
    },
  } as const

  for (const [shardId, payload] of Object.entries(payloads)) {
    const bytes = writeJsonShard(payload)
    const url = `/search-packs/packs/${contentHash}/shards/${shardId}.qas`
    await cache.put(url, new Response(bytes))
    fixture.manifest.shards.push(shardManifest({ shardId, url, bytes }))
  }
  fixture.manifest.features.push('following-wording', 'shared-wording', 'repeated-phrases', 'occurs-once', 'ayah-endings', 'counts-patterns')
  fixture.manifest.requires.push('following-wording', 'shared-wording', 'repeated-phrases', 'occurs-once', 'ayah-endings', 'counts-patterns', 'graph-provenance')
  return fixture
}

function shardManifest({ shardId, url, bytes }: { shardId: string; url: string; bytes: ArrayBuffer }): SearchPackManifestV1['shards'][number] {
  const featureId = shardId.startsWith('following-wording')
    ? 'following-wording'
    : shardId.startsWith('shared-wording')
      ? 'shared-wording'
      : shardId.startsWith('repeated-phrases')
        ? 'repeated-phrases'
        : shardId.startsWith('occurs-once')
          ? 'occurs-once'
          : shardId.startsWith('ayah-endings')
            ? 'ayah-endings'
            : shardId.startsWith('counts-patterns')
              ? 'counts-patterns'
              : 'provenance'
  return {
    shardId,
    featureId,
    schemaId: `search-shard-${featureId}-v1`,
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
  }
}
