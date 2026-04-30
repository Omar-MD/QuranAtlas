// Bridge for the UndoToast overlay (`core/ui.svelte`). Migrated to
// createOverlayBridge 2026-05-01 (audit N22). Public exports
// (showUndoToast / clearUndoToast / clearUndoRecord) are thin wrappers
// over `undoToastBridge.api.<method>()` so existing callers don't
// change. The bridge's `open` is the same as historical "show" — the
// overlay accepts a payload describing the verseKey, the mark record to
// stash for undo, and the callbacks.

import { createOverlayBridge, type BaseOverlayAPI } from './persistent-overlay'

export type UndoToastOpts = {
  verseKey: string
  record: unknown
  onUndo: (rec: unknown) => Promise<void>
  onComplete?: () => void
}

export interface UndoToastAPI extends BaseOverlayAPI {
  open(opts: UndoToastOpts): void
  close(): void
  isOpen(): boolean
  /** Forget the cached mark record — used by Reader during route changes
   *  so a stale record can't be restored after the user has navigated
   *  away from the affected verse. */
  clearRecord(): void
}

export const undoToastBridge = createOverlayBridge<UndoToastAPI>({ name: 'undo-toast' })

export const showUndoToast = (opts: UndoToastOpts): void => undoToastBridge.api.open(opts)
export const clearUndoToast = (): void => undoToastBridge.api.close()
export const clearUndoRecord = (): void => undoToastBridge.api.clearRecord()
