import type { SearchPackManifestV1 } from '../../../shared/search'

export type SearchPackQuotaEstimate = {
  requiredBytes: number
  availableBytes: number | null
  lowQuota: boolean
}

export async function estimateSearchPackQuota(
  manifest: Pick<SearchPackManifestV1, 'totalBytes' | 'estimatedMemoryBytes'>,
  retainedPackBytes = 0,
): Promise<SearchPackQuotaEstimate> {
  const requiredBytes = manifest.totalBytes + retainedPackBytes
  const estimate = await navigator.storage?.estimate?.()
  const quota = estimate?.quota
  const usage = estimate?.usage ?? 0
  const availableBytes = typeof quota === 'number' ? Math.max(0, quota - usage) : null
  return {
    requiredBytes,
    availableBytes,
    lowQuota: availableBytes !== null && availableBytes < requiredBytes,
  }
}

export async function assertSearchPackQuota(manifest: SearchPackManifestV1, retainedPackBytes = 0): Promise<void> {
  const estimate = await estimateSearchPackQuota(manifest, retainedPackBytes)
  if (estimate.lowQuota) {
    throw new Error('not enough browser storage quota for Search pack')
  }
}
