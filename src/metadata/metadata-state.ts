export type MetadataState = 'available' | 'empty' | 'missing' | 'stale' | 'invalid' | 'offline' | 'unavailable'

export type VerseMetadata = {
  verseKey: string
  themes: Array<{ id: string; label: string }>
  passageSummary: string | null
}

export type SurahMetadataResult = {
  state: MetadataState
  rows: Map<string, VerseMetadata>
}
