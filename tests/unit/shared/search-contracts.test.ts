import { describe, expect, it } from 'vitest'

import {
  FORBIDDEN_SEARCH_DATASET_PREFIX,
  SEARCH_FEATURE_IDS,
  SEARCH_FIXTURE_IDS,
  SEARCH_PACK_ABI_MAJOR,
  SEARCH_PACK_CHECKSUM_ALGORITHM,
  SEARCH_PACK_REGISTRY_RUNTIME_URL,
  SEARCH_PHASE1_BYTE_BUDGET,
  SEARCH_QUERY_MODES,
  SEARCH_SHARD_ENDIAN_LITTLE,
  SEARCH_SHARD_HEADER_LENGTH,
  SEARCH_SHARD_MAGIC_BYTES,
  SEARCH_TABLE_ROLES,
  SEARCH_VALUE_WIDTHS,
  SEARCH_TEXT_FIXTURES,
  assertImmutableSearchPackRuntimeUrl,
  assertSearchMappingAsset,
  assertSearchPackManifestUrls,
  assertSearchPackRegistry,
  assertSearchPackUrlHasSingleOwner,
  assertSearchPhraseWithinPhase1Policy,
  assertSearchShardWithinByteBudget,
  assertSearchTableDirectoryEntry,
  assertSearchWorkerResponseForRequest,
  assertSupportedSearchPackAbi,
  isImmutableSearchPackRuntimeUrl,
  isStableMutableSearchDatasetUrl,
  normalizeSearchInput,
  readSearchShardHeaderWithDataView,
  tokenizeSearchInput,
  type SearchPackActivationRecord,
  type SearchMappingAsset,
  type SearchPackManifestV1,
  type SearchPackRegistry,
  type SearchShardTableDirectoryEntry,
} from '../../../shared/search'

const contentHash = '0123456789abcdef0123456789abcdef'
const shardUrl = `/search-packs/packs/${contentHash}/core-postings.qas`

function makeHeader(overrides: Partial<{
  magic: Uint8Array
  abiMajor: number
  abiMinor: number
  endianMarker: number
  headerLength: number
  tableDirectoryOffset: number
}> = {}) {
  const bytes = new Uint8Array(SEARCH_SHARD_HEADER_LENGTH)
  bytes.set(overrides.magic ?? SEARCH_SHARD_MAGIC_BYTES, 0)
  const view = new DataView(bytes.buffer)
  view.setUint16(4, overrides.abiMajor ?? SEARCH_PACK_ABI_MAJOR, true)
  view.setUint16(6, overrides.abiMinor ?? 0, true)
  view.setUint32(8, overrides.endianMarker ?? SEARCH_SHARD_ENDIAN_LITTLE, true)
  view.setUint16(12, 1, true)
  view.setUint16(14, 1, true)
  view.setUint32(16, overrides.headerLength ?? SEARCH_SHARD_HEADER_LENGTH, true)
  view.setUint32(20, overrides.tableDirectoryOffset ?? SEARCH_SHARD_HEADER_LENGTH, true)
  view.setUint32(24, 1, true)
  view.setUint32(28, 128, true)
  view.setUint32(32, 7, true)
  return bytes
}

function makeManifest(overrides: Partial<SearchPackManifestV1> = {}): SearchPackManifestV1 {
  return {
    packId: 'qa-search-core-hafs-v1',
    packVersion: '1.0.0',
    packAbiVersion: '1.0',
    minAppVersion: '0.0.0',
    minWorkerVersion: '1.0.0',
    contentHash,
    graphCorpusId: 'hafs-search-core-v1',
    sourceRiwayah: 'hafs',
    features: [SEARCH_FEATURE_IDS.core, SEARCH_FEATURE_IDS.arabicText],
    requires: [],
    compatibleWith: ['quranatlas-search-phase-1'],
    licenseIds: ['search-hafs-text-license'],
    sourceIds: ['search-hafs-text'],
    normalizerVersion: 1,
    queryAstVersion: 1,
    checksumAlgorithm: SEARCH_PACK_CHECKSUM_ALGORITHM,
    totalBytes: 128,
    estimatedMemoryBytes: 256,
    byteBudget: SEARCH_PHASE1_BYTE_BUDGET,
    shards: [{
      shardId: 'core-postings',
      featureId: SEARCH_FEATURE_IDS.core,
      schemaId: 'search-shard-core-v1',
      url: shardUrl,
      byteLength: 128,
      checksum: 'a'.repeat(64),
      checksumAlgorithm: SEARCH_PACK_CHECKSUM_ALGORITHM,
      checksumScope: 'encoded-bytes',
      requiredDictionaries: [],
      estimatedMemoryBytes: 256,
      decodingFixtureId: SEARCH_FIXTURE_IDS.abiDecode,
      maxDecodedBytes: 512,
    }],
    notices: [],
    buildInputDigests: { source: 'b'.repeat(64) },
    builtAt: '2026-05-31T00:00:00.000Z',
    ...overrides,
  }
}

function makeMapping(overrides: Partial<SearchMappingAsset> = {}): SearchMappingAsset {
  return {
    mappingId: 'hafs-to-qaloon-2-255',
    sourceCorpusId: 'hafs-search-core-v1',
    readerCorpusId: 'qaloon-reader-v1',
    sourceRef: '2:255',
    readerRefs: [{ surah: 2, ayah: 255, verseKey: '2:255' }],
    mappingState: 'corresponding-ayah-in-reader',
    aliasRole: 'alias-verified',
    boundaryRole: 'same-ayah',
    canOpenInRead: true,
    canHighlightWordsInRead: false,
    reason: 'Verified through explicit Hafs to Qalun ayah alias data.',
    sourceChecksum: 'a'.repeat(64),
    readerChecksum: 'b'.repeat(64),
    mappingVersion: 1,
    ...overrides,
  }
}

describe('Search shared contracts', () => {
  it('rejects unsupported ABI versions, shard magic, and endian markers', () => {
    expect(() => assertSupportedSearchPackAbi(2, 0)).toThrow('unsupported Search pack ABI major 2')
    expect(() => readSearchShardHeaderWithDataView(makeHeader({ magic: new Uint8Array([0, 0, 0, 0]) }))).toThrow('invalid Search shard magic')
    expect(() => readSearchShardHeaderWithDataView(makeHeader({ endianMarker: 0x04030201 }))).toThrow('unsupported Search shard endian marker')
    expect(readSearchShardHeaderWithDataView(makeHeader())).toMatchObject({
      magic: 'QAS1',
      abiMajor: 1,
      abiMinor: 0,
      tableCount: 1,
      fixtureId: 7,
    })
  })

  it('uses DataView-first header checks before typed array trust', () => {
    expect(() => readSearchShardHeaderWithDataView(new Uint8Array(12))).toThrow('Search shard header is truncated')
    expect(() => readSearchShardHeaderWithDataView(makeHeader({ tableDirectoryOffset: 16 }))).toThrow('Search shard table directory overlaps header')
  })

  it('validates table role, value width, alignment, and checksum scope', () => {
    const entry: SearchShardTableDirectoryEntry = {
      role: SEARCH_TABLE_ROLES.postings,
      offset: 16,
      byteLength: 32,
      itemCount: 8,
      valueWidth: SEARCH_VALUE_WIDTHS.u32,
      alignment: 8,
      checksumScope: 'encoded-bytes',
    }
    expect(() => assertSearchTableDirectoryEntry(entry)).not.toThrow()
    expect(() => assertSearchTableDirectoryEntry({ ...entry, offset: 10 })).toThrow('not 8-byte aligned')
    expect(() => assertSearchTableDirectoryEntry({ ...entry, checksumScope: 'other' as 'encoded-bytes' })).toThrow('unsupported Search checksum scope')
  })

  it('accepts only the runtime registry URL and immutable content-addressed pack URLs', () => {
    const registry: SearchPackRegistry = {
      registryVersion: 1,
      registryUrl: SEARCH_PACK_REGISTRY_RUNTIME_URL,
      generatedAt: '2026-05-31T00:00:00.000Z',
      packs: [{
        packId: 'qa-search-core-hafs-v1',
        packVersion: '1.0.0',
        contentHash,
        manifestUrl: `/search-packs/packs/${contentHash}/manifest.json`,
        sourceRiwayah: 'hafs',
        features: [SEARCH_FEATURE_IDS.core],
        minAppVersion: '0.0.0',
        minWorkerVersion: '1.0.0',
        totalBytes: 128,
      }],
    }
    expect(() => assertSearchPackRegistry(registry)).not.toThrow()
    expect(isImmutableSearchPackRuntimeUrl(shardUrl, contentHash)).toBe(true)
    expect(() => assertImmutableSearchPackRuntimeUrl(`${FORBIDDEN_SEARCH_DATASET_PREFIX}baseline/index.json`)).toThrow('stable mutable')
  })

  it('requires SHA-256 over fetched encoded bytes and rejects double-owned Search pack URLs', () => {
    expect(() => assertSearchPackManifestUrls(makeManifest())).not.toThrow()
    expect(() => assertSearchPackManifestUrls(makeManifest({
      shards: [{ ...makeManifest().shards[0], checksumScope: 'decoded-bytes' }],
    }))).toThrow('checksum must cover fetched encoded bytes')
    expect(isStableMutableSearchDatasetUrl('/dataset/search/baseline/index.json')).toBe(true)
    expect(() => assertSearchPackUrlHasSingleOwner('/dataset/search/baseline/index.json')).toThrow('generic dataset cache owner')
    expect(() => assertSearchPackUrlHasSingleOwner(shardUrl)).not.toThrow()
  })

  it('describes activation storage with a monotonic generation and protected active packs', () => {
    const activation: SearchPackActivationRecord = {
      schemaVersion: 1,
      activePackId: 'qa-search-core-hafs-v1',
      activeContentHash: contentHash,
      previousActivePackId: null,
      previousActiveContentHash: null,
      activationGeneration: 2,
      activationState: 'active',
      lastVerifiedAt: 1_779_999_999_000,
      lastError: null,
    }
    expect(activation.activationGeneration).toBeGreaterThan(1)
    expect(activation.activationState).toBe('active')
  })

  it('normalizes Arabic search fixtures while preserving exact-word forms on demand', () => {
    expect(normalizeSearchInput(SEARCH_TEXT_FIXTURES.diacritizedArabic)).toBe('قل هو الله احد')
    expect(normalizeSearchInput(SEARCH_TEXT_FIXTURES.hamzaAlifVariants)).toBe('ااااا')
    expect(normalizeSearchInput('سورة ١١٢')).toBe('سوره 112')
    expect(normalizeSearchInput(SEARCH_TEXT_FIXTURES.exactWordPreservation, 'exact-word-form')).toBe('أَحَدٌ')
    expect(tokenizeSearchInput(SEARCH_TEXT_FIXTURES.mixedArabicEnglish)).toEqual(['Surah', '112', 'قل', 'هو', 'الله', 'احد'])
  })

  it('enforces phrase boundaries and byte-budget gates', () => {
    expect(() => assertSearchPhraseWithinPhase1Policy(['one', 'two', 'three'])).not.toThrow()
    expect(() => assertSearchPhraseWithinPhase1Policy(tokenizeSearchInput(SEARCH_TEXT_FIXTURES.maxPhraseLength))).toThrow('exceeds Phase 1 maximum')
    expect(() => assertSearchShardWithinByteBudget(1, 1, 1)).not.toThrow()
    expect(() => assertSearchShardWithinByteBudget(SEARCH_PHASE1_BYTE_BUDGET.maxShardBytes + 1, 1, 1)).toThrow('encoded byte budget')
  })

  it('validates mapping states, reader refs, and no silent identity fallback', () => {
    expect(() => assertSearchMappingAsset(makeMapping())).not.toThrow()
    expect(() => assertSearchMappingAsset(makeMapping({ readerRefs: [], canOpenInRead: true }))).toThrow('without reader refs')
    expect(() => assertSearchMappingAsset(makeMapping({ mappingState: 'corresponding-ayah-in-reader', canHighlightWordsInRead: true }))).toThrow('cannot highlight')
    expect(() => assertSearchMappingAsset(makeMapping({
      sourceCorpusId: 'qaloon-reader-v1',
      readerCorpusId: 'qaloon-reader-v1',
      sourceRef: '2:255',
      readerRefs: [{ surah: 2, ayah: 255, verseKey: '2:255' }],
    }))).toThrow('silently fall back')
    expect(() => assertSearchMappingAsset(makeMapping({ readerRefs: [], canOpenInRead: false }))).not.toThrow()
    expect(() => assertSearchMappingAsset(makeMapping({
      readerRefs: [
        { surah: 1, ayah: 1, verseKey: '1:1' },
        { surah: 1, ayah: 2, verseKey: '1:2' },
      ],
    }))).not.toThrow()
  })

  it('keeps query modes exhaustive including Phase 2 morphology modes', () => {
    expect(SEARCH_QUERY_MODES).toEqual([
      'all',
      'arabic-text',
      'translation',
      'context',
      'exact-word-form',
      'phrase',
      'same-written-form',
      'same-root',
      'lemma',
      'surah-context',
    ])
  })

  it('preserves worker request ids in responses', () => {
    expect(() => assertSearchWorkerResponseForRequest(
      { type: 'preloadCore', requestId: 'request-1' },
      {
        type: 'ok',
        requestId: 'request-1',
        workerEpoch: 1,
        packId: 'qa-search-core-hafs-v1',
        packVersion: '1.0.0',
        payload: { kind: 'preloaded-core' },
      },
    )).not.toThrow()
    expect(() => assertSearchWorkerResponseForRequest(
      { type: 'preloadCore', requestId: 'request-1' },
      {
        type: 'error',
        requestId: 'request-2',
        workerEpoch: 1,
        packId: null,
        packVersion: null,
        error: { code: 'stale-epoch', message: 'stale', retryable: true },
      },
    )).toThrow('does not match request-1')
  })
})
