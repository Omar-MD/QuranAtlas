import type { SearchByteBudget, SearchChecksumScope, SearchFeatureId, SearchShardSchemaId } from './abi'

export const SEARCH_PACK_REGISTRY_RUNTIME_URL = '/search-packs/registry.json'
export const SEARCH_PACKS_RUNTIME_PREFIX = '/search-packs/packs/'
export const SEARCH_PACKS_FILESYSTEM_REGISTRY = 'public/search-packs/registry.json'
export const SEARCH_PACKS_FILESYSTEM_PREFIX = 'public/search-packs/packs/'
export const SEARCH_PACK_CACHE_PREFIX = 'quran-atlas-search-pack'
export const SEARCH_PACK_STAGED_CACHE_PREFIX = 'quran-atlas-search-pack-staged'
export const SEARCH_PACK_CHECKSUM_ALGORITHM = 'sha-256'
export const FORBIDDEN_SEARCH_DATASET_PREFIX = '/dataset/search/'

export type SearchPackActivationProtection = 'active' | 'previous-active' | 'staged' | 'orphaned'

export interface SearchPackNotice {
  id: string
  label: string
  body: string
  sourceId?: string
  licenseId?: string
}

export interface SearchPackShardManifest {
  shardId: string
  featureId: SearchFeatureId
  schemaId: SearchShardSchemaId
  url: string
  byteLength: number
  checksum: string
  checksumAlgorithm: typeof SEARCH_PACK_CHECKSUM_ALGORITHM
  checksumScope: SearchChecksumScope
  requiredDictionaries: string[]
  estimatedMemoryBytes: number
  decodingFixtureId: string
  maxDecodedBytes: number
  internalCompression?: 'none' | 'gzip' | 'br'
}

export interface SearchPackManifestV1 {
  packId: string
  packVersion: string
  packAbiVersion: `${number}.${number}`
  minAppVersion: string
  minWorkerVersion: string
  contentHash: string
  graphCorpusId: string
  sourceRiwayah: 'hafs'
  features: SearchFeatureId[]
  requires: string[]
  compatibleWith: string[]
  licenseIds: string[]
  sourceIds: string[]
  normalizerVersion: number
  queryAstVersion: number
  checksumAlgorithm: typeof SEARCH_PACK_CHECKSUM_ALGORITHM
  totalBytes: number
  estimatedMemoryBytes: number
  byteBudget: SearchByteBudget
  shards: SearchPackShardManifest[]
  notices: SearchPackNotice[]
  buildInputDigests: Record<string, string>
  builtAt: string
}

export interface SearchPackRegistryEntry {
  packId: string
  packVersion: string
  contentHash: string
  manifestUrl: string
  sourceRiwayah: 'hafs'
  features: SearchFeatureId[]
  minAppVersion: string
  minWorkerVersion: string
  totalBytes: number
}

export interface SearchPackRegistry {
  registryVersion: 1
  registryUrl: typeof SEARCH_PACK_REGISTRY_RUNTIME_URL
  generatedAt: string
  packs: SearchPackRegistryEntry[]
}

export interface SearchPackCacheOwnership {
  registryRuntimeUrl: typeof SEARCH_PACK_REGISTRY_RUNTIME_URL
  runtimePackPrefix: typeof SEARCH_PACKS_RUNTIME_PREFIX
  activeCachePrefix: typeof SEARCH_PACK_CACHE_PREFIX
  stagedCachePrefix: typeof SEARCH_PACK_STAGED_CACHE_PREFIX
  genericDatasetCacheExcludedPrefix: typeof FORBIDDEN_SEARCH_DATASET_PREFIX
  protectedStates: SearchPackActivationProtection[]
}

export interface SearchPackActivationRecord {
  schemaVersion: 1
  activePackId: string | null
  activeContentHash: string | null
  previousActivePackId: string | null
  previousActiveContentHash: string | null
  activationGeneration: number
  activationState:
    | 'not-available'
    | 'available-online'
    | 'installing'
    | 'staged'
    | 'verifying'
    | 'active'
    | 'update-available'
    | 'incompatible'
    | 'failed'
    | 'offline-unavailable'
  lastVerifiedAt: number | null
  lastError: string | null
}

export interface SearchRuntimeVersionHandshake {
  appVersion: string
  serviceWorkerVersion: string
  searchWorkerVersion: string
  activePackId: string | null
  activePackVersion: string | null
  minAppVersion: string | null
  minWorkerVersion: string | null
}

export const SEARCH_PACK_CACHE_OWNERSHIP: SearchPackCacheOwnership = {
  registryRuntimeUrl: SEARCH_PACK_REGISTRY_RUNTIME_URL,
  runtimePackPrefix: SEARCH_PACKS_RUNTIME_PREFIX,
  activeCachePrefix: SEARCH_PACK_CACHE_PREFIX,
  stagedCachePrefix: SEARCH_PACK_STAGED_CACHE_PREFIX,
  genericDatasetCacheExcludedPrefix: FORBIDDEN_SEARCH_DATASET_PREFIX,
  protectedStates: ['active', 'previous-active'],
}

export function searchStagedCacheName(contentHash: string): string {
  assertContentHashSegment(contentHash)
  return `${SEARCH_PACK_STAGED_CACHE_PREFIX}-${contentHash}`
}

export function searchActiveCacheName(contentHash: string): string {
  assertContentHashSegment(contentHash)
  return `${SEARCH_PACK_CACHE_PREFIX}-${contentHash}`
}

export function isSearchPackRegistryRuntimeUrl(url: string): boolean {
  return url === SEARCH_PACK_REGISTRY_RUNTIME_URL
}

export function isStableMutableSearchDatasetUrl(url: string): boolean {
  return url.startsWith(FORBIDDEN_SEARCH_DATASET_PREFIX)
}

export function isImmutableSearchPackRuntimeUrl(url: string, contentHash?: string): boolean {
  if (isStableMutableSearchDatasetUrl(url)) return false
  const prefix = `${SEARCH_PACKS_RUNTIME_PREFIX}${contentHash ?? ''}`
  if (!url.startsWith(prefix)) return false
  const remainder = url.slice(SEARCH_PACKS_RUNTIME_PREFIX.length)
  const [hashSegment, ...pathParts] = remainder.split('/')
  return isContentHashSegment(hashSegment) && pathParts.length > 0 && pathParts.every(Boolean)
}

export function assertSearchPackRegistryUrl(url: string): void {
  if (!isSearchPackRegistryRuntimeUrl(url)) {
    throw new Error(`Search pack registry must be ${SEARCH_PACK_REGISTRY_RUNTIME_URL}`)
  }
}

export function assertImmutableSearchPackRuntimeUrl(url: string, contentHash?: string): void {
  if (isStableMutableSearchDatasetUrl(url)) {
    throw new Error('Search pack URL must not use stable mutable /dataset/search/** assets')
  }
  if (!isImmutableSearchPackRuntimeUrl(url, contentHash)) {
    throw new Error(`Search pack URL must be immutable under ${SEARCH_PACKS_RUNTIME_PREFIX}<contentHash>/**`)
  }
}

export function assertSearchPackManifestUrls(manifest: SearchPackManifestV1): void {
  assertContentHashSegment(manifest.contentHash)
  for (const shard of manifest.shards) {
    assertImmutableSearchPackRuntimeUrl(shard.url, manifest.contentHash)
    if (shard.checksumAlgorithm !== SEARCH_PACK_CHECKSUM_ALGORITHM) {
      throw new Error(`Search shard ${shard.shardId} must use SHA-256 checksums`)
    }
    if (shard.checksumScope !== 'encoded-bytes') {
      throw new Error(`Search shard ${shard.shardId} checksum must cover fetched encoded bytes`)
    }
  }
}

export function assertSearchPackRegistry(registry: SearchPackRegistry): void {
  assertSearchPackRegistryUrl(registry.registryUrl)
  for (const entry of registry.packs) {
    assertImmutableSearchPackRuntimeUrl(entry.manifestUrl, entry.contentHash)
  }
}

export function assertSearchPackUrlHasSingleOwner(url: string): void {
  if (isStableMutableSearchDatasetUrl(url) && isImmutableSearchPackRuntimeUrl(url)) {
    throw new Error('Search pack URL cannot be owned by both dataset cache and Search installer')
  }
  if (isStableMutableSearchDatasetUrl(url)) {
    throw new Error('Search pack URL is under the generic dataset cache owner')
  }
  assertImmutableSearchPackRuntimeUrl(url)
}

function isContentHashSegment(value: string): boolean {
  return /^[a-f0-9]{12,64}$/.test(value)
}

function assertContentHashSegment(value: string): void {
  if (!isContentHashSegment(value)) {
    throw new Error(`invalid Search pack content hash ${value}`)
  }
}
