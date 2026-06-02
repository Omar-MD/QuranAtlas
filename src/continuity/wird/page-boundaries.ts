import { loadMushafManifest } from '../../packs/mushaf-page-asset'
import { readNativeSettings } from '../../storage/native-reader-store'
import type { Riwayah } from '../../storage/types'
import { createPageWirdBoundariesFromStarts } from './metadata'
import type { SurahCount, WirdBoundary } from './types'

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'
const DEFAULT_MUSHAF_EDITION_ID = 'qalun-quran-ws-v1'

export async function loadReactWirdPageBoundaries(
  counts: ReadonlyArray<SurahCount>,
  signal?: AbortSignal,
): Promise<WirdBoundary[]> {
  if (counts.length === 0 || signal?.aborted) return []
  const [riwayah, mushafEditionId] = await readNativeSettings(['riwayah', 'mushafEditionId'])
  if (signal?.aborted) return []
  const manifest = await loadMushafManifest({
    mushafEditionId: typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : DEFAULT_MUSHAF_EDITION_ID,
    riwayah: riwayah?.value === 'qaloon' ? riwayah.value : DEFAULT_RIWAYAH,
    signal,
  })
  return createPageWirdBoundariesFromStarts(
    manifest.pages.map((page) => ({ n: page.page, start: page.firstVerse })),
    counts,
  )
}
