import { assertRuntimeDatasetUrl } from './runtime-boundary'
import type { Riwayah } from '../storage/types'

export type SourceIndexRecord = {
  id: string
  type: 'riwayah' | 'translation' | string
  displayLabel?: string
  label?: string
  default?: boolean
  availableInManifest?: boolean
}

export type OnboardingSourceIndexes = {
  riwayat: Array<{ id: Riwayah; label: string; disabled: boolean }>
  translations: Array<{ id: string; label: string; disabled: boolean }>
}

const SOURCE_INDEX_URL = '/dataset/indexes/sources.json'

function sourceLabel(source: SourceIndexRecord): string {
  return source.displayLabel ?? source.label ?? source.id
}

function isRiwayah(id: string): id is Riwayah {
  return id === 'hafs' || id === 'warsh' || id === 'qaloon'
}

export async function loadOnboardingSourceIndexes({
  fetcher = fetch,
  signal,
}: {
  fetcher?: typeof fetch
  signal?: AbortSignal
} = {}): Promise<OnboardingSourceIndexes> {
  assertRuntimeDatasetUrl(SOURCE_INDEX_URL)
  const response = await fetcher(SOURCE_INDEX_URL, { signal })
  if (!response.ok) throw new Error(`Unable to load React onboarding source index: ${response.status}`)
  const data = await response.json() as { sources?: SourceIndexRecord[] }
  const sources = Array.isArray(data.sources) ? data.sources : []

  return {
    riwayat: sources
      .filter((source) => source.type === 'riwayah' && isRiwayah(source.id))
      .map((source) => ({
        id: source.id as Riwayah,
        label: sourceLabel(source),
        disabled: source.availableInManifest !== true,
      })),
    translations: sources
      .filter((source) => source.type === 'translation')
      .map((source) => ({
        id: source.id,
        label: sourceLabel(source),
        disabled: source.availableInManifest !== true,
      })),
  }
}
