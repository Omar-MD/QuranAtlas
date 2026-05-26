export type ReaderMetadataSlot = {
  verseKey: string
  themes: Array<{ id: string; label: string }>
  passageSummary: string | null
}

export type ReaderMetadataAdapter = {
  loadForSurah: (surah: number) => Promise<Map<string, ReaderMetadataSlot>>
}
