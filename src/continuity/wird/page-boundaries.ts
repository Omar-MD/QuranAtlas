import { loadMushafManifest } from '../../packs/mushaf-page-asset'
import { readActiveMushafProfile } from '../../storage/reader-settings'
import { createPageWirdBoundariesFromStarts } from './metadata'
import type { SurahCount, WirdBoundary } from './types'

export async function loadReactWirdPageBoundaries(
  counts: ReadonlyArray<SurahCount>,
  signal?: AbortSignal,
): Promise<WirdBoundary[]> {
  if (counts.length === 0 || signal?.aborted) return []
  const { mushafEditionId, riwayah } = await readActiveMushafProfile()
  if (signal?.aborted) return []
  const manifest = await loadMushafManifest({ mushafEditionId, riwayah, signal })
  return createPageWirdBoundariesFromStarts(
    manifest.pages.map((page) => ({ n: page.page, start: page.firstVerse })),
    counts,
  )
}
