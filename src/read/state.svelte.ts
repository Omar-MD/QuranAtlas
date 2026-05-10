import type { SurahPayload } from '../data/dataset'

export type ReaderMode = 'verse' | 'mushaf'

export class ReaderState {
  currentSurah = $state<SurahPayload | null>(null)
  currentSurahNum = $state<number | null>(null)
  currentVerseKey = $state<string | null>(null)
  currentMushafPage = $state<number | null>(null)
  readerMode = $state<ReaderMode>('verse')
  fontMultiplier = $state(1.0)
  translationVisible = $state(true)
  scrollY = $state(0)
  renderedCount = $state(0)
  isRendering = $state(false)
  scrollAppendRafPending = $state(false)
  lastTrackedVerse = $state<string | null>(null)
  surahHeaderHidden = $state(false)
}
export const reader = new ReaderState()
