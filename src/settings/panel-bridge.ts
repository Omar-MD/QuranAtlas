/**
 * Settings Panel — overlay bridge + sole-writer/-reader data functions.
 *
 * The OVERLAY surface (open/close) goes through createOverlayBridge —
 * audit N22 (2026-05-01). External callers (`MarginHeader`, command
 * sheet, app-bootstrap routes) keep importing `openSettingsSheet` /
 * `closeSettingsSheet` — those names are now thin wrappers over
 * `panelBridge.api.<method>()`.
 *
 * The DATA functions (setTranslationVisible / setTranslationId /
 * loadTranslationId / toggleTranslation) stay as plain async exports.
 * They are sole-writer/-reader for `settings.translationVisible` +
 * `settings.translationId` (audit R-08 / R-25). Not overlay surface —
 * they live here only because the Settings Panel was historically the
 * sole UI for both. Other surfaces (CommandSheet, keyboard 't' shortcut,
 * onboarding picker) call them too.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings } from '../settings/state.svelte.ts'
import { createOverlayBridge, type BaseOverlayAPI } from '../core/persistent-overlay'

// ── Overlay surface ─────────────────────────────────────────────────────────

export interface PanelOverlayAPI extends BaseOverlayAPI {
  open(): void
  close(): void
  isOpen(): boolean
}

export const panelBridge = createOverlayBridge<PanelOverlayAPI>({ name: 'settings-panel' })

export const openSettingsSheet = (): void => panelBridge.api.open()
export const closeSettingsSheet = (): void => panelBridge.api.close()

// ── Data: settings.translationVisible (sole writer) ─────────────────────────

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

// ── Data: settings.translationId (sole writer + reader) ─────────────────────

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

/**
 * Sole reader for `settings.translationId`. Companion to setTranslationId
 * — audit R-25 (2026-04-30); Panel.svelte previously read raw IDB.
 */
export async function loadTranslationId(): Promise<string | null> {
  try {
    const rec = await get('settings', 'translationId')
    return typeof rec?.value === 'string' ? rec.value : null
  } catch {
    return null
  }
}
