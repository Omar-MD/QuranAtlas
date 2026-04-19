/**
 * Imperative bridge for the Settings panel Svelte component.
 * Same pattern as core/ui-bridge.ts — component registers its open fn on mount.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings } from '../state/settings.svelte.ts'

type PanelExports = {
  openSettingsSheet: () => void
  closeSettingsSheet: () => void
}

let _instance: PanelExports | null = null

export function registerPanel(instance: PanelExports): void {
  _instance = instance
}

export function openSettingsSheet(): void {
  _instance?.openSettingsSheet()
}

export function closeSettingsSheet(): void {
  _instance?.closeSettingsSheet()
}

/**
 * Flip translation visibility, persist, emit the shared settings event,
 * and apply to any already-rendered verses. Returns the new value.
 * Preserved from settings/panel.js for consumers (command-sheet.js etc).
 */
export async function toggleTranslation(): Promise<boolean | null> {
  let next: boolean | null = null
  try {
    const current = await get('settings', 'translationVisible')
    next = !(current?.value as boolean | undefined ?? true)
    await put('settings', { key: 'translationVisible', value: next })
  } catch (error) {
    logger.error('Failed to toggle translation visibility', { error })
    return null
  }
  Object.assign(settings, { translationVisible: next })
  return next
}
