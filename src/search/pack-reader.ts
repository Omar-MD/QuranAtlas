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
import { openReactDb } from '../storage/db'
import type {
  SearchAyahRow,
  SearchDecodedShard,
  SearchPackShardPayload,
  SearchMorphologyPostingsPayload,
  SearchMorphologyRowsPayload,
  SearchSurahContextPayload,
  SearchPostingsPayload,
  SearchReferencesPayload,
  SearchFollowingWordingPayload,
  SearchSharedWordingPayload,
  SearchRepeatedPhrasesPayload,
  SearchOccursOncePayload,
  SearchAyahEndingsPayload,
  SearchCountsPatternsPayload,
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

  async getFollowingWording(): Promise<SearchFollowingWordingPayload[]> {
    return this.loadGraphPayloads('following-wording', isFollowingWordingPayload)
  }

  async getSharedWording(): Promise<SearchSharedWordingPayload[]> {
    return this.loadGraphPayloads('shared-wording', isSharedWordingPayload)
  }

  async getRepeatedPhrases(): Promise<SearchRepeatedPhrasesPayload[]> {
    return this.loadGraphPayloads('repeated-phrases', isRepeatedPhrasesPayload)
  }

  async getOccursOnce(): Promise<SearchOccursOncePayload[]> {
    return this.loadGraphPayloads('occurs-once', isOccursOncePayload)
  }

  async getAyahEndings(): Promise<SearchAyahEndingsPayload> {
    const shard = await this.loadShard('ayah-endings')
    if (!isAyahEndingsPayload(shard.payload)) {
      throw new SearchPackReaderError('corrupt-shard', 'Search ayah endings shard has the wrong payload kind')
    }
    return shard.payload
  }

  async getCountsPatterns(): Promise<SearchCountsPatternsPayload> {
    const shard = await this.loadShard('counts-patterns')
    if (!isCountsPatternsPayload(shard.payload)) {
      throw new SearchPackReaderError('corrupt-shard', 'Search counts and patterns shard has the wrong payload kind')
    }
    return shard.payload
  }

  dispose(): void {
    this.decoded.clear()
  }

  private async loadGraphPayloads<TPayload extends SearchPackShardPayload>(
    prefix: string,
    guard: (payload: SearchPackShardPayload) => payload is TPayload,
  ): Promise<TPayload[]> {
    const shards = this.manifest.shards.filter((entry) => entry.shardId.startsWith(`${prefix}-`) || entry.shardId === prefix)
    if (shards.length === 0) throw new SearchPackReaderError('missing-feature', `Search pack is missing ${prefix}`)
    const payloads: TPayload[] = []
    for (const shard of shards) {
      const decoded = await this.decodeShard(shard)
      if (guard(decoded.payload)) payloads.push(decoded.payload)
    }
    return payloads
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
    const cache = cacheStorage
      ? await cacheStorage.open(searchPackCacheName(this.manifest.contentHash)).catch(() => null)
      : null
    const cachedResponse = await cache?.match(shard.url)
    if (cachedResponse) {
      if (!cachedResponse.ok) throw new SearchPackReaderError('offline-miss', `Search shard ${shard.shardId} cached response is unavailable`, true)
      return cachedResponse.arrayBuffer()
    }

    const fetcher = this.options.fetcher ?? globalThis.fetch
    if (!fetcher) throw new SearchPackReaderError('offline-miss', `Search shard ${shard.shardId} is not cached`, true)
    let fetchedResponse: Response
    try {
      fetchedResponse = await fetcher(shard.url, { signal: this.options.signal })
    } catch {
      throw new SearchPackReaderError('offline-miss', `Search shard ${shard.shardId} is not cached`, true)
    }
    if (!fetchedResponse.ok) throw new SearchPackReaderError('offline-miss', `Search shard ${shard.shardId} is unavailable`, true)
    const bytes = await fetchedResponse.arrayBuffer()
    if (cache && bytes.byteLength === shard.byteLength) {
      await cache.put(shard.url, new Response(bytes, {
        headers: fetchedResponse.headers,
        status: fetchedResponse.status,
        statusText: fetchedResponse.statusText,
      })).catch(() => undefined)
    }
    return bytes
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
    const manifest = await manifestResponse.json() as SearchPackManifestV1
    assertSearchPackManifestUrls(manifest)
    await cacheSearchPackManifest(manifest, entry.manifestUrl)
    return manifest
  } catch (caught) {
    if (caught instanceof SearchPackReaderError) throw caught
    const active = await loadActiveSearchPackManifest(packId, options)
    if (active) return active
    const cached = await loadCachedSearchPackManifest(packId)
    if (cached) return cached
    throw new SearchPackReaderError('unavailable-pack', 'Search pack registry is unavailable', true)
  }
}

async function cacheSearchPackManifest(manifest: SearchPackManifestV1, manifestUrl: string): Promise<void> {
  const cacheStorage = globalThis.caches
  if (!cacheStorage) return
  const cache = await cacheStorage.open(searchPackCacheName(manifest.contentHash)).catch(() => null)
  if (!cache) return
  await cache.put(manifestUrl, new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })).catch(() => undefined)
}

async function loadActiveSearchPackManifest(
  packId: string,
  options: Pick<SearchPackReaderOptions, 'fetcher' | 'signal'>,
): Promise<SearchPackManifestV1 | null> {
  const active = await openReactDb()
    .then((db) => db.searchPackActivations.get('current'))
    .catch(() => null)
  if (!active || active.status !== 'active' || active.packId !== packId) return null

  const cached = await loadCachedSearchPackManifest(packId, active.contentHash)
  if (cached) return cached

  const manifestUrl = `/search-packs/packs/${active.contentHash}/manifest.json`
  const fetcher = options.fetcher ?? globalThis.fetch
  if (!fetcher) return null
  try {
    const response = await fetcher(manifestUrl, { signal: options.signal })
    if (!response.ok) return null
    const manifest = await response.json() as SearchPackManifestV1
    assertSearchPackManifestUrls(manifest)
    return manifest.packId === packId && manifest.contentHash === active.contentHash ? manifest : null
  } catch {
    return null
  }
}

async function loadCachedSearchPackManifest(packId: string, contentHash?: string): Promise<SearchPackManifestV1 | null> {
  if (!globalThis.caches?.keys) return null
  if (contentHash) {
    const manifestUrl = `/search-packs/packs/${contentHash}/manifest.json`
    const cache = await globalThis.caches.open(searchPackCacheName(contentHash))
    const response = await cache.match(manifestUrl)
    if (!response?.ok) return null
    const manifest = await response.json() as SearchPackManifestV1
    assertSearchPackManifestUrls(manifest)
    return manifest.packId === packId && manifest.contentHash === contentHash ? manifest : null
  }

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
      assertSearchPackManifestUrls(manifest)
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
    || isFollowingWordingPayload(payload)
    || isSharedWordingPayload(payload)
    || isRepeatedPhrasesPayload(payload)
    || isOccursOncePayload(payload)
    || isAyahEndingsPayload(payload)
    || isCountsPatternsPayload(payload)
    || (payload?.kind === 'graph-provenance' && Array.isArray(payload.sourceIds))
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

function isFollowingWordingPayload(payload: SearchPackShardPayload): payload is SearchFollowingWordingPayload {
  return payload?.kind === 'following-wording' && Array.isArray(payload.rows)
}

function isSharedWordingPayload(payload: SearchPackShardPayload): payload is SearchSharedWordingPayload {
  return payload?.kind === 'shared-wording' && Array.isArray(payload.rows)
}

function isRepeatedPhrasesPayload(payload: SearchPackShardPayload): payload is SearchRepeatedPhrasesPayload {
  return payload?.kind === 'repeated-phrases' && Array.isArray(payload.rows)
}

function isOccursOncePayload(payload: SearchPackShardPayload): payload is SearchOccursOncePayload {
  return payload?.kind === 'occurs-once' && Array.isArray(payload.rows)
}

function isAyahEndingsPayload(payload: SearchPackShardPayload): payload is SearchAyahEndingsPayload {
  return payload?.kind === 'ayah-endings' && Array.isArray(payload.rows)
}

function isCountsPatternsPayload(payload: SearchPackShardPayload): payload is SearchCountsPatternsPayload {
  return payload?.kind === 'counts-patterns' && Array.isArray(payload.phraseCounts)
}
