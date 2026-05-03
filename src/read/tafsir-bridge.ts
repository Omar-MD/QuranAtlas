import { createOverlayBridge, type BaseOverlayAPI } from '../core/persistent-overlay'
import { openTafsirPreview } from './tafsir-state.svelte'

export interface TafsirSheetAPI extends BaseOverlayAPI {
  open(verseKey?: string): void
  close(): void
  isOpen(): boolean
}

export const tafsirSheetBridge = createOverlayBridge<TafsirSheetAPI>({ name: 'tafsir-sheet' })

export function openTafsirSheet(verseKey?: string): void {
  if (verseKey) {
    void openTafsirPreview(verseKey)
  }
  tafsirSheetBridge.api.open(verseKey)
}

export const closeTafsirSheet = (): void => tafsirSheetBridge.api.close()

export {
  openTafsirPreview,
  closeTafsirPreview,
} from './tafsir-state.svelte'
