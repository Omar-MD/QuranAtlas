import {
  SEARCH_PACK_REGISTRY_RUNTIME_URL,
  SEARCH_TABLE_DIRECTORY_ENTRY_LENGTH,
  SEARCH_TABLE_ROLES,
  SEARCH_VALUE_WIDTHS,
  assertImmutableSearchPackRuntimeUrl,
  assertSearchPackManifestUrls,
  assertSearchTableDirectoryEntry,
  assertSupportedSearchPackAbi,
  readSearchShardHeaderWithDataView,
  type SearchPackManifestV1,
  type SearchPackRegistry,
  type SearchPackShardManifest,
  type SearchShardTableDirectoryEntry,
} from '../../shared/search'
import { searchPackCacheName } from '../offline/cache-names'
import type {
  SearchAyahRow,
  SearchDecodedShard,
  SearchPackShardPayload,
  SearchMorphologyPostingsPayload,
  SearchMorphologyRowsPayload,
  SearchSurahContextPayload,
  SearchPostingsPayload,
  SearchReferencesPayload,
  SearchRuntimeErrorShape,
} from './schema'

export type SearchShardCacheStorage = Pick<CacheStorage, 'open'>

export interface SearchPackReaderOptions {
  cacheStorage?: SearchShardCacheStorage
  fetcher?: typeof fetch
  signal?: AbortSignal
}

export class SearchPackReaderError extends Error {
  readonly code: SearchRuntimeErrorShape['code']
  readonly retryable: boolean

  constructor(code: SearchRuntimeErrorShape['code'], message: string, retryable = false) {
    super(message)
    this.name = 'SearchPackReaderError'
    this.code = code
    this.retryable = retryable
  }
}

export class SearchPackReader {
  readonly manifest: SearchPackManifestV1
  private readonly options: SearchPackReaderOptions
  private readonly decoded = new Map<string, SearchDecodedShard<SearchPackShardPayload>>()

  constructor(manifest: SearchPackManifestV1, options: SearchPackReaderOptions = {}) {
    assertSearchPackManifestUrls(manifest)
    const [majorText, minorText] = manifest.packAbiVersion.split('.')
    assertSupportedSearchPackAbi(Number(majorText), Number(minorText))
    this.manifest = manifest
    this.options = options
  }

  async loadCore(): Promise<void> {
    await Promise.all([
      this.loadShard('core-references'),
      this.loadShard('core-dictionaries'),
      this.loadShard('arabic-postings'),
      this.loadShard('exact-word-postings'),
      this.loadShard('translation-postings'),
    ])
  }

  async loadFeature(featureId: string): Promise<void> {
    const shards = this.manifest.shards.filter((shard) => shard.featureId === featureId || shard.shardId.startsWith(`${featureId}-`))
    if (shards.length === 0) {
      throw new SearchPackReaderError('missing-feature', `Search pack is missing feature ${featureId}`)
    }
    for (const shard of shards) await this.decodeShard(shard)
  }

  async loadShard(shardId: string): Promise<SearchDecodedShard<SearchPackShardPayload>> {
    const shard = this.manifest.shards.find((entry) => entry.shardId === shardId)
    if (!shard) throw new SearchPackReaderError('missing-feature', `Search shard ${shardId} is not declared`)
    return this.decodeShard(shard)
  }

  async loadPhraseShards(length: number): Promise<SearchDecodedShard<SearchPostingsPayload>[]> {
    const shards = this.manifest.shards.filter((entry) => entry.shardId.startsWith(`phrase-postings-l${length}-`))
    if (shards.length === 0) return []
    const decoded: SearchDecodedShard<SearchPostingsPayload>[] = []
    for (const shard of shards) {
      const value = await this.decodeShard(shard)
      if (isPostingsPayload(value.payload)) decoded.push(value as SearchDecodedShard<SearchPostingsPayload>)
    }
    return decoded
  }

  async getReferences(): Promise<SearchReferencesPayload> {
    const shard = await this.loadShard('core-references')
    if (!isReferencesPayload(shard.payload)) {
      throw new SearchPackReaderError('corrupt-shard', 'Search references shard has the wrong payload kind')
    }
    return shard.payload
  }

  async findAyah(ref: string): Promise<SearchAyahRow | null> {
    const references = await this.getReferences()
    return references.ayahs.find((ayah) => ayah.ref === ref) ?? null
  }

  async getPostings(lane: SearchPostingsPayload['lane']): Promise<SearchPostingsPayload[]> {
    const shardIds = lane === 'phrase'
      ? this.manifest.shards.filter((shard) => shard.shardId.startsWith('phrase-postings-')).map((shard) => shard.shardId)
      : [`${lane === 'exact-word' ? 'exact-word' : lane}-postings`]
    const postings: SearchPostingsPayload[] = []
    for (const shardId of shardIds) {
      const shard = await this.loadShard(shardId)
      if (isPostingsPayload(shard.payload) && shard.payload.lane === lane) postings.push(shard.payload)
    }
    return postings
  }

  async getMorphologyRows(): Promise<SearchMorphologyRowsPayload['rows']> {
    const shards = this.manifest.shards.filter((entry) => entry.shardId.startsWith('morphology-rows-'))
    if (shards.length === 0) throw new SearchPackReaderError('missing-feature', 'Search pack is missing morphology rows')
    const rows: SearchMorphologyRowsPayload['rows'] = []
    for (const shard of shards) {
      const decoded = await this.decodeShard(shard)
      if (isMorphologyRowsPayload(decoded.payload)) rows.push(...decoded.payload.rows)
    }
    return rows
  }

  async getMorphologyPostings(lane: SearchMorphologyPostingsPayload['lane']): Promise<SearchMorphologyPostingsPayload[]> {
    const shards = this.manifest.shards.filter((entry) => entry.shardId.startsWith(`${lane}-`))
    if (shards.length === 0) throw new SearchPackReaderError('missing-feature', `Search pack is missing ${lane}`)
    const postings: SearchMorphologyPostingsPayload[] = []
    for (const shard of shards) {
      const decoded = await this.decodeShard(shard)
      if (isMorphologyPostingsPayload(decoded.payload) && decoded.payload.lane === lane) postings.push(decoded.payload)
    }
    return postings
  }

  async getSurahContext(): Promise<SearchSurahContextPayload> {
    const shard = await this.loadShard('surah-context')
    if (!isSurahContextPayload(shard.payload)) {
      throw new SearchPackReaderError('corrupt-shard', 'Search Surah context shard has the wrong payload kind')
    }
    return shard.payload
  }

  dispose(): void {
    this.decoded.clear()
  }

  private async decodeShard(shard: SearchPackShardManifest): Promise<SearchDecodedShard<SearchPackShardPayload>> {
    const cached = this.decoded.get(shard.shardId)
    if (cached) return cached
    this.throwIfAborted()
    if (shard.byteLength > this.manifest.byteBudget.maxShardBytes || shard.maxDecodedBytes > this.manifest.byteBudget.maxDecodedShardBytes) {
      throw new SearchPackReaderError('corrupt-shard', `Search shard ${shard.shardId} exceeds declared byte budget`)
    }
    const bytes = await this.readShardBytes(shard)
    this.throwIfAborted()
    if (bytes.byteLength !== shard.byteLength) {
      throw new SearchPackReaderError('corrupt-shard', `Search shard ${shard.shardId} byte length mismatch`)
    }
    await assertSha256(bytes, shard.checksum)
    const payload = decodeSearchJsonShard(bytes)
    const decoded: SearchDecodedShard<SearchPackShardPayload> = {
      shardId: shard.shardId,
      payload,
      byteLength: bytes.byteLength,
      estimatedMemoryBytes: shard.estimatedMemoryBytes,
    }
    this.decoded.set(shard.shardId, decoded)
    return decoded
  }

  private async readShardBytes(shard: SearchPackShardManifest): Promise<ArrayBuffer> {
    assertImmutableSearchPackRuntimeUrl(shard.url, this.manifest.contentHash)
    const cacheStorage = this.options.cacheStorage ?? globalThis.caches
    if (!cacheStorage) throw new SearchPackReaderError('offline-miss', 'Search pack cache is unavailable', true)
    const cache = await cacheStorage.open(searchPackCacheName(this.manifest.contentHash))
    const response = await cache.match(shard.url)
    if (!response) throw new SearchPackReaderError('offline-miss', `Search shard ${shard.shardId} is not cached`, true)
    if (!response.ok) throw new SearchPackReaderError('offline-miss', `Search shard ${shard.shardId} cached response is unavailable`, true)
    return response.arrayBuffer()
  }

  private throwIfAborted(): void {
    if (this.options.signal?.aborted) {
      throw new SearchPackReaderError('cancelled', 'Search pack read was cancelled')
    }
  }
}

export async function loadSearchPackManifestFromRegistry(
  packId: string,
  options: Pick<SearchPackReaderOptions, 'fetcher' | 'signal'> = {},
): Promise<SearchPackManifestV1> {
  const fetcher = options.fetcher ?? fetch
  try {
    const registryResponse = await fetcher(SEARCH_PACK_REGISTRY_RUNTIME_URL, { signal: options.signal })
    if (!registryResponse.ok) throw new Error('registry unavailable')
    const registry = await registryResponse.json() as SearchPackRegistry
    const entry = registry.packs.find((pack) => pack.packId === packId)
    if (!entry) throw new SearchPackReaderError('unavailable-pack', `Search pack ${packId} is not registered`, true)
    const manifestResponse = await fetcher(entry.manifestUrl, { signal: options.signal })
    if (!manifestResponse.ok) throw new Error('manifest unavailable')
    return manifestResponse.json() as Promise<SearchPackManifestV1>
  } catch (caught) {
    if (caught instanceof SearchPackReaderError) throw caught
    const cached = await loadCachedSearchPackManifest(packId)
    if (cached) return cached
    throw new SearchPackReaderError('unavailable-pack', 'Search pack registry is unavailable', true)
  }
}

async function loadCachedSearchPackManifest(packId: string): Promise<SearchPackManifestV1 | null> {
  if (!globalThis.caches?.keys) return null
  for (const cacheName of await globalThis.caches.keys()) {
    if (!cacheName.startsWith('quran-atlas-search-pack-')) continue
    const cache = await globalThis.caches.open(cacheName)
    if (!('keys' in cache)) continue
    for (const request of await cache.keys()) {
      const url = new URL(request.url)
      if (!url.pathname.endsWith('/manifest.json')) continue
      const response = await cache.match(request)
      if (!response?.ok) continue
      const manifest = await response.json() as SearchPackManifestV1
      if (manifest.packId === packId) return manifest
    }
  }
  return null
}

export function decodeSearchJsonShard(bytes: ArrayBuffer | Uint8Array): SearchPackShardPayload {
  const viewBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const header = readSearchShardHeaderWithDataView(viewBytes)
  const directoryOffset = header.tableDirectoryOffset
  const directoryLength = header.tableCount * SEARCH_TABLE_DIRECTORY_ENTRY_LENGTH
  if (directoryOffset + directoryLength > viewBytes.byteLength) {
    throw new SearchPackReaderError('corrupt-shard', 'Search shard table directory is truncated')
  }
  const view = new DataView(viewBytes.buffer, viewBytes.byteOffset, viewBytes.byteLength)
  const entry = readTableDirectoryEntry(view, directoryOffset)
  assertSearchTableDirectoryEntry(entry)
  if (entry.role !== SEARCH_TABLE_ROLES.provenance && entry.role !== SEARCH_TABLE_ROLES.postings) {
    throw new SearchPackReaderError('corrupt-shard', 'Search shard JSON table has an unsupported role')
  }
  if (entry.valueWidth !== SEARCH_VALUE_WIDTHS.utf8) {
    throw new SearchPackReaderError('corrupt-shard', 'Search shard JSON table must be UTF-8')
  }
  if (entry.offset + entry.byteLength > viewBytes.byteLength) {
    throw new SearchPackReaderError('corrupt-shard', 'Search shard JSON table exceeds shard size')
  }
  const text = new TextDecoder().decode(viewBytes.subarray(entry.offset, entry.offset + entry.byteLength))
  const payload = JSON.parse(text) as SearchPackShardPayload
  if (!isSearchPackShardPayload(payload)) {
    throw new SearchPackReaderError('corrupt-shard', 'Search shard payload has an unknown kind')
  }
  return payload
}

function readTableDirectoryEntry(view: DataView, offset: number): SearchShardTableDirectoryEntry {
  const checksumScopeId = view.getUint8(offset + 20)
  return {
    role: view.getUint16(offset, true) as SearchShardTableDirectoryEntry['role'],
    offset: view.getUint32(offset + 4, true),
    byteLength: view.getUint32(offset + 8, true),
    itemCount: view.getUint32(offset + 12, true),
    valueWidth: view.getUint16(offset + 16, true) as SearchShardTableDirectoryEntry['valueWidth'],
    alignment: view.getUint16(offset + 18, true) as SearchShardTableDirectoryEntry['alignment'],
    checksumScope: checksumScopeId === 1 ? 'encoded-bytes' : 'decoded-bytes',
  }
}

async function assertSha256(bytes: ArrayBuffer, expected: string): Promise<void> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const actual = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  if (actual !== expected) throw new SearchPackReaderError('corrupt-shard', 'Search shard checksum mismatch')
}

function isSearchPackShardPayload(payload: SearchPackShardPayload): payload is SearchPackShardPayload {
  return isReferencesPayload(payload)
    || isPostingsPayload(payload)
    || isMorphologyRowsPayload(payload)
    || isMorphologyPostingsPayload(payload)
    || isSurahContextPayload(payload)
    || (payload?.kind === 'dictionaries' && typeof payload.dictionaries === 'object')
    || (payload?.kind === 'provenance' && Array.isArray(payload.sourceIds))
    || (payload?.kind === 'morphology-dictionary' && Array.isArray(payload.entries))
    || (payload?.kind === 'morphology-provenance' && typeof payload.sourceId === 'string')
}

function isReferencesPayload(payload: SearchPackShardPayload): payload is SearchReferencesPayload {
  return payload?.kind === 'references' && Array.isArray(payload.ayahs)
}

function isPostingsPayload(payload: SearchPackShardPayload): payload is SearchPostingsPayload {
  return payload?.kind === 'postings' && Array.isArray(payload.postings)
}

function isMorphologyRowsPayload(payload: SearchPackShardPayload): payload is SearchMorphologyRowsPayload {
  return payload?.kind === 'morphology-rows' && Array.isArray(payload.rows)
}

function isMorphologyPostingsPayload(payload: SearchPackShardPayload): payload is SearchMorphologyPostingsPayload {
  return payload?.kind === 'morphology-postings' && Array.isArray(payload.postings)
}

function isSurahContextPayload(payload: SearchPackShardPayload): payload is SearchSurahContextPayload {
  return payload?.kind === 'surah-context' && Array.isArray(payload.roots)
}
