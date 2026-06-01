import type { SearchBriefFeatureSection, SearchMappingState, SearchQueryMode } from '../../search/schema'

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
  if (lane === 'phrase') return 'Exact source phrase'
  if (lane === 'exact-word-form') return 'Exact word form'
  if (lane === 'same-written-form') return 'Same written form'
  if (lane === 'same-root') return 'Same-root morphology'
  if (lane === 'lemma') return 'Same-lemma morphology'
  if (lane === 'surah-context') return 'Morphology-based Surah distribution'
  if (lane === 'translation') return 'Translation'
  if (lane === 'context') return 'Context'
  return lane.charAt(0).toUpperCase() + lane.slice(1)
}

export function evidenceTypeLabel(type: string): string {
  if (type === 'reference') return 'Reference'
  if (type === 'arabic-text') return 'Arabic text match'
  if (type === 'exact-word-form') return 'Exact word-form match'
  if (type === 'exact-source-phrase') return 'Exact source phrase'
  if (type === 'translation-context') return 'Translation/context match'
  if (type === 'same-written-form') return 'Same written form'
  if (type === 'same-root') return 'Same-root morphology'
  if (type === 'lemma') return 'Same-lemma morphology'
  return type
}

export function representativeRefLabel(label: string): string {
  if (label === 'top-ranked') return 'Top ranked'
  if (label === 'first-in-mushaf-order') return 'First in Mushaf order'
  if (label === 'different-surah-example') return 'Different surah example'
  if (label === 'translation-context-example') return 'Translation/context example'
  if (label === 'arabic-text-example') return 'Arabic text example'
  return label
}

export function featureSectionLabel(section: SearchBriefFeatureSection): string {
  if (section === 'morphology') return 'Morphology evidence'
  if (section === 'same-written-form') return 'Same written form'
  if (section === 'same-root') return 'Same-root morphology'
  if (section === 'lemma') return 'Same-lemma morphology'
  if (section === 'following-wording') return 'Attested following wording'
  if (section === 'shared-wording') return 'Shared indexed wording'
  if (section === 'repeated-phrases') return 'Repeated source phrase'
  if (section === 'occurs-once') return 'Occurs once in this Search index'
  if (section === 'ayah-endings') return 'Ayah-ending wording'
  if (section === 'counts-patterns') return 'Index counts'
  return section
}

export function featureStatusLabel(status: string): string {
  if (status === 'available') return 'Available'
  if (status === 'missing') return 'Missing pack'
  if (status === 'offline-unavailable') return 'Offline unavailable'
  if (status === 'incompatible') return 'Incompatible pack'
  return status
}

export function aggregateStatusLabel(status: string): string {
  if (status === 'full') return 'Full aggregate'
  if (status === 'partial') return 'Partial aggregate'
  if (status === 'unavailable') return 'Aggregate unavailable'
  return status
}

export function guardrailNoteLabel(id: string): string {
  if (id === 'search-source-boundary') return 'Search source boundary'
  if (id === 'translation-context-not-tafsir') return 'Translation/context boundary'
  if (id === 'same-root-not-interpretation') return 'Same-root boundary'
  if (id === 'following-wording-not-generated') return 'Following wording boundary'
  if (id === 'shared-wording-lexical-only') return 'Shared wording boundary'
  if (id === 'occurs-once-index-policy') return 'Occurs-once boundary'
  return id
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
      return 'Search source only'
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
