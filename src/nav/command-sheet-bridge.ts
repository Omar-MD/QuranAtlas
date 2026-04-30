/**
 * Bridge for the CommandSheet (⌘K) overlay. Migrated to
 * createOverlayBridge 2026-05-01 (audit N22). Allows AmbientDock /
 * AmbientPill / global-shortcuts module to open / close the command
 * sheet without a circular import on the Svelte component.
 */

import { createOverlayBridge, type BaseOverlayAPI } from '../core/persistent-overlay'

export interface CommandSheetAPI extends BaseOverlayAPI {
  open(): void
  close(): void
  isOpen(): boolean
}

export const commandSheetBridge = createOverlayBridge<CommandSheetAPI>({ name: 'command-sheet' })

export const openCommandSheet = (): void => commandSheetBridge.api.open()
export const closeCommandSheet = (): void => commandSheetBridge.api.close()
