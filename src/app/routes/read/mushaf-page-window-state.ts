import type {
  MushafPageDescriptor,
  MushafReadyPageAssetState,
} from '../../../packs/mushaf-page-asset'

export type MushafPageWindowEntry =
  | { page: number; descriptor: MushafPageDescriptor; status: 'descriptor' }
  | { page: number; descriptor: MushafPageDescriptor; attempt: number; status: 'loading' | 'retrying' }
  | {
      page: number
      descriptor?: MushafPageDescriptor
      asset: MushafReadyPageAssetState
      rendition: 'preview' | 'full'
      status: 'ready'
      upgradeStatus: 'idle' | 'loading' | 'retrying' | 'failed'
    }
  | { page: number; descriptor: MushafPageDescriptor; error: Error; status: 'transient-error' | 'contract-error' }
  | { page: number; descriptor: MushafPageDescriptor; reason: string; status: 'confirmed-missing' }

export const MUSHAF_RETRY_DELAYS_MS = [150, 500] as const

export function readableAsset(entry: MushafPageWindowEntry | undefined): MushafReadyPageAssetState | null {
  return entry?.status === 'ready' ? entry.asset : null
}

export function setMushafPageAttempt(
  descriptor: MushafPageDescriptor,
  attempt: number,
): MushafPageWindowEntry {
  return {
    attempt,
    descriptor,
    page: descriptor.resolved.page,
    status: attempt === 0 ? 'loading' : 'retrying',
  }
}

export function commitMushafPagePreview(
  descriptor: MushafPageDescriptor,
  asset: MushafReadyPageAssetState,
): MushafPageWindowEntry {
  return {
    asset,
    descriptor,
    page: descriptor.resolved.page,
    rendition: descriptor.kind === 'external-image' ? 'preview' : 'full',
    status: 'ready',
    upgradeStatus: 'idle',
  }
}

export function commitMushafPageFull(
  current: MushafPageWindowEntry,
  descriptor: MushafPageDescriptor,
  asset: MushafReadyPageAssetState,
): MushafPageWindowEntry {
  if (current.status !== 'ready') return current
  return {
    asset,
    descriptor,
    page: descriptor.resolved.page,
    rendition: 'full',
    status: 'ready',
    upgradeStatus: 'idle',
  }
}

export function setMushafPageUpgradeAttempt(
  current: MushafPageWindowEntry,
  attempt: number,
): MushafPageWindowEntry {
  if (current.status !== 'ready') return current
  return {
    ...current,
    upgradeStatus: attempt === 0 ? 'loading' : 'retrying',
  }
}

export function preserveMushafPageOnUpgradeFailure(
  current: MushafPageWindowEntry,
): MushafPageWindowEntry {
  if (current.status !== 'ready') return current
  return { ...current, upgradeStatus: 'failed' }
}

export function resetMushafPageUpgrade(
  current: MushafPageWindowEntry,
): MushafPageWindowEntry {
  if (current.status !== 'ready' || current.upgradeStatus === 'idle') return current
  return { ...current, upgradeStatus: 'idle' }
}

export function writeMushafPageGeneration(
  entries: readonly MushafPageWindowEntry[],
  entry: MushafPageWindowEntry,
  generation: number,
  activeGeneration: number | undefined,
): readonly MushafPageWindowEntry[] {
  if (generation !== activeGeneration) return entries
  return entries.map((current) => current.page === entry.page ? entry : current)
}
