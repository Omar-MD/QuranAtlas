import type { SearchMappingState, SearchQueryMode } from '../../search/schema'

export const SEARCH_MODE_OPTIONS: Array<{ label: string; shortLabel?: string; value: SearchQueryMode }> = [
  { label: 'All', value: 'all' },
  { label: 'Arabic text', shortLabel: 'Arabic', value: 'arabic-text' },
  { label: 'Translation', value: 'translation' },
  { label: 'Context', value: 'context' },
  { label: 'Exact word form', shortLabel: 'Exact', value: 'exact-word-form' },
  { label: 'Phrase', value: 'phrase' },
  { label: 'Same written form', shortLabel: 'Form', value: 'same-written-form' },
  { label: 'Same root', shortLabel: 'Root', value: 'same-root' },
  { label: 'Lemma', value: 'lemma' },
]

export function modeLabel(mode: SearchQueryMode): string {
  return SEARCH_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? 'All'
}

export function laneLabel(lane: string): string {
  if (lane === 'arabic-text') return 'Arabic text'
  if (lane === 'exact-word-form') return 'Exact word form'
  if (lane === 'same-written-form') return 'Same written form'
  if (lane === 'same-root') return 'Same root'
  if (lane === 'surah-context') return 'Surah context'
  return lane.charAt(0).toUpperCase() + lane.slice(1)
}

export function mappingLabel(state: SearchMappingState): string {
  switch (state) {
    case 'same-wording-in-reader':
      return 'Same wording in Reader'
    case 'corresponding-ayah-in-reader':
      return 'Corresponding ayah in Reader'
    case 'different-ayah-boundary':
      return 'Different ayah boundary'
    case 'no-reader-ayah-alignment':
      return 'No Reader ayah alignment'
    case 'no-reader-token-alignment':
      return 'No Reader token alignment'
    case 'hafs-source-only':
      return 'Hafs Search source'
  }
}

export function formatSearchReference(ref: `${number}:${number}` | string): string {
  const [surah = '', ayah = ''] = ref.split(':')
  return `Surah ${surah} · ${surah}:${ayah}`
}

export function sourceLaneForMode(mode: SearchQueryMode): Array<'arabic-text' | 'translation' | 'context'> {
  if (mode === 'translation') return ['translation']
  if (mode === 'context') return ['context']
  if (
    mode === 'arabic-text'
    || mode === 'exact-word-form'
    || mode === 'phrase'
    || mode === 'same-written-form'
    || mode === 'same-root'
    || mode === 'lemma'
    || mode === 'surah-context'
  ) return ['arabic-text']
  return ['arabic-text', 'translation', 'context']
}
