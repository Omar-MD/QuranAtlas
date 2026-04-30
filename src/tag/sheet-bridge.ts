/**
 * Bridge for the deep TagSheet overlay (`tag/TagSheet.svelte`). Migrated
 * from prop-driven mount (`<TagSheet isOpen={...} verseKey={...} />`)
 * to api-driven via createOverlayBridge 2026-05-01 (audit N22). The
 * `tagSession.sheetOpen` rune is gone — this bridge IS the source of
 * truth for whether the deep sheet is open.
 *
 * Distinct from `tag/session-bridge.ts` (which mutates session state and
 * routes the fast-path / deep-path entry points): this file is solely
 * the overlay bridge. `session-bridge::openDeep` calls
 * `tagSheetBridge.api.open(verseKey)`.
 */

import { createOverlayBridge, type BaseOverlayAPI } from '../core/persistent-overlay'

export interface TagSheetAPI extends BaseOverlayAPI {
  open(verseKey: string): void
  close(): void
  isOpen(): boolean
}

export const tagSheetBridge = createOverlayBridge<TagSheetAPI>({ name: 'tag-sheet' })

export const openTagSheet = (verseKey: string): void => tagSheetBridge.api.open(verseKey)
export const closeTagSheet = (): void => tagSheetBridge.api.close()
