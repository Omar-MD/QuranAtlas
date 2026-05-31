import { describe, expect, it } from 'vitest'

import type { SearchPackManifestV1 } from '../../../shared/search'
import { SearchWorkerSession } from '../../../src/search-worker/session'
import { parseSearchQuery } from '../../../src/search/query-parser'
import { createFixturePack, sha256Hex, writeJsonShard } from './search-test-utils'

describe('Search morphology worker runtime', () => {
  it('returns source-backed same written form, same root, lemma, and Surah context results without Reader word highlighting', async () => {
    const { cacheStorage, manifest } = await createMorphologyFixturePack()
    const session = new SearchWorkerSession({
      cacheStorage,
      manifest,
      aliases: { '1': [{ hafs: 1, warsh: 1, qaloon: 1 }], '2': [{ hafs: 255, warsh: 255, qaloon: 255 }] },
    })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })

    const sameForm = await query(session, 'الله', 'same-written-form')
    expect(sameForm.results[0]).toMatchObject({
      canHighlightWordsInRead: false,
      matchLanes: ['same-written-form'],
      morphology: {
        sourceNote: expect.stringContaining('Hafs/Tanzil text'),
        root: 'Alh',
        lemma: '{ll~ah',
        sourceToken: 'الله',
      },
    })

    const sameRoot = await query(session, 'الله', 'same-root')
    expect(sameRoot.results.length).toBeGreaterThan(1)
    expect(sameRoot.results.every((result) => result.morphology?.root === 'Alh')).toBe(true)

    const lemma = await query(session, '{ll~ah', 'lemma')
    expect(lemma.results[0]?.morphology?.lemma).toBe('{ll~ah')

    const context = await query(session, 'الله', 'surah-context')
    expect(context.results[0]?.morphology?.surahContext).toContainEqual({ surah: 1, count: 1 })
  })

  it('returns a missing feature error when the active pack lacks morphology', async () => {
    const { cacheStorage, manifest } = await createFixturePack()
    const session = new SearchWorkerSession({ cacheStorage, manifest })
    await session.handle({ type: 'init', requestId: 'init', packId: manifest.packId })

    const parsed = parseSearchQuery('الله', { mode: 'same-root' })
    await expect(session.handle({
      type: 'query',
      requestId: 'same-root',
      query: parsed.ast,
      limit: 5,
      sort: 'relevance',
    })).resolves.toMatchObject({
      type: 'error',
      error: { code: 'missing-feature' },
    })
  })
})

async function query(session: SearchWorkerSession, text: string, mode: Parameters<typeof parseSearchQuery>[1]['mode']) {
  const parsed = parseSearchQuery(text, { mode })
  const response = await session.handle({
    type: 'query',
    requestId: `${mode}-${text}`,
    query: parsed.ast,
    limit: 10,
    sort: 'relevance',
  })
  if (response.type !== 'ok' || response.payload.kind !== 'query-window') throw new Error('expected query window')
  return response.payload.window
}

async function createMorphologyFixturePack() {
  const fixture = await createFixturePack()
  const contentHash = fixture.manifest.contentHash
  const cache = await fixture.cacheStorage.open(`quran-atlas-search-pack-${contentHash}`)
  const payloads = {
    'morphology-root-dictionary': {
      kind: 'morphology-dictionary',
      dictionary: 'roots',
      entries: [{ id: 1, value: 'Alh', count: 2 }],
    },
    'morphology-lemma-dictionary': {
      kind: 'morphology-dictionary',
      dictionary: 'lemmas',
      entries: [{ id: 1, value: '{ll~ah', count: 2 }],
    },
    'morphology-rows-1': {
      kind: 'morphology-rows',
      rows: [
        morphologyRow({ ayahId: 1, ref: '1:1', surah: 1, ayah: 1, tokenOrdinal: 1, wordPosition: 2 }),
        morphologyRow({ ayahId: 2, ref: '2:255', surah: 2, ayah: 255, tokenOrdinal: 0, wordPosition: 1 }),
      ],
    },
    'same-written-form-postings-1': {
      kind: 'morphology-postings',
      lane: 'same-written-form-postings',
      postings: [{ term: 'الله', postings: [{ ayahId: 1, position: 1 }, { ayahId: 2, position: 0 }] }],
    },
    'same-root-postings-1': {
      kind: 'morphology-postings',
      lane: 'same-root-postings',
      postings: [{ term: 'Alh', postings: [{ ayahId: 1, position: 1 }, { ayahId: 2, position: 0 }] }],
    },
    'lemma-postings-1': {
      kind: 'morphology-postings',
      lane: 'lemma-postings',
      postings: [{ term: '{ll~ah', postings: [{ ayahId: 1, position: 1 }, { ayahId: 2, position: 0 }] }],
    },
    'surah-context': {
      kind: 'surah-context',
      roots: [{ term: 'Alh', total: 2, surahs: [{ surah: 1, count: 1 }, { surah: 2, count: 1 }] }],
      lemmas: [],
      writtenForms: [],
    },
    'morphology-provenance': {
      kind: 'morphology-provenance',
      sourceId: 'search-qac-morphology-0-4',
      sourceVersion: '0.4',
      sourcePath: 'data/normalized/search/qac/quranic-corpus-morphology-0.4.txt',
      sourceUrl: 'https://corpus.quran.com/download/',
      sourceSha256: 'a1d12923815341face765083805d2148ed2d9f5cc3f7d6665219d887675d8c46',
      acceptedSha256: ['a1d12923815341face765083805d2148ed2d9f5cc3f7d6665219d887675d8c46'],
      licenseIds: ['search-qac-gpl-v3-terms'],
      sourceAvailability: 'Committed source.',
      transformedDataNotes: 'Derived Search output.',
      requiredNotice: 'notice',
      coverage: { surahs: 114, ayahs: 6236, tokens: 77429, rows: 128219 },
    },
  } as const

  for (const [shardId, payload] of Object.entries(payloads)) {
    const bytes = writeJsonShard(payload)
    const url = `/search-packs/packs/${contentHash}/shards/${shardId}.qas`
    await cache.put(url, new Response(bytes))
    fixture.manifest.shards.push(shardManifest({ shardId, url, bytes }))
  }
  fixture.manifest.features.push('morphology')
  fixture.manifest.requires.push(
    'morphology-root-dictionary',
    'morphology-lemma-dictionary',
    'morphology-rows',
    'same-written-form-postings',
    'same-root-postings',
    'lemma-postings',
    'surah-context',
    'morphology-provenance',
  )
  return fixture
}

function morphologyRow(overrides: Partial<Record<'ayahId' | 'surah' | 'ayah' | 'tokenOrdinal' | 'wordPosition', number> & { ref: `${number}:${number}` }>) {
  return {
    ayahId: overrides.ayahId ?? 1,
    ref: overrides.ref ?? '1:1',
    surah: overrides.surah ?? 1,
    ayah: overrides.ayah ?? 1,
    tokenOrdinal: overrides.tokenOrdinal ?? 1,
    wordPosition: overrides.wordPosition ?? 2,
    sourceToken: 'الله',
    normalizedSourceToken: 'الله',
    transliteration: '{ll~ah',
    root: 'Alh',
    lemma: '{ll~ah',
    segments: [],
  }
}

function shardManifest({ shardId, url, bytes }: { shardId: string; url: string; bytes: ArrayBuffer }): SearchPackManifestV1['shards'][number] {
  return {
    shardId,
    featureId: 'morphology',
    schemaId: 'search-shard-morphology-v1',
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
