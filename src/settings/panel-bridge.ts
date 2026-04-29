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
 * Sole writer for `settings.translationVisible`. Pre-fix this was
 * shared with settings/Panel.svelte::handleTranslationToggle (audit
 * R-08 / CC-3, 2026-04-29). Both surfaces (command sheet, panel
 * toggle, keyboard shortcut) now go through here.
 *
 * Setting an explicit value sets it; passing `undefined` flips the
 * current value.
 */
export async function setTranslationVisible(next?: boolean): Promise<boolean | null> {
  let resolved: boolean
  try {
    if (next === undefined) {
      const current = await get('settings', 'translationVisible')
      resolved = !(current?.value as boolean | undefined ?? true)
    } else {
      resolved = next
    }
    await put('settings', { key: 'translationVisible', value: resolved })
  } catch (error) {
    logger.error('Failed to write translationVisible', { error })
    return null
  }
  Object.assign(settings, { translationVisible: resolved })
  return resolved
}

// Back-compat alias retained for the existing command-sheet caller. New
// callers should use setTranslationVisible(undefined) directly.
export async function toggleTranslation(): Promise<boolean | null> {
  return setTranslationVisible(undefined)
}

/**
 * Sole writer for `settings.translationId`. Pre-fix this was joint-
 * owned by settings/Panel.svelte::handleTranslationChoice and
 * onboarding/Onboarding.svelte's translation picker (audit CC-3).
 */
export async function setTranslationId(id: string): Promise<void> {
  try {
    await put('settings', { key: 'translationId', value: id })
  } catch (error) {
    logger.error('Failed to write translationId', { id, error })
    return
  }
  Object.assign(settings, { translationId: id })
}
