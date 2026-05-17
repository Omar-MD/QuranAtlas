/**
 * Riwayah preference: which Qur'anic transmission the reader displays.
 * Sole writer for `settings['riwayah']`. Default = 'qaloon'.
 */

import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import {
  applyRiwayah,
  beginRiwayahInstall,
  completeRiwayahInstall,
  DEFAULT_RIWAYAH,
  failRiwayahInstall,
  getRiwayahOptions,
  isRiwayah,
  isRiwayahUsable,
  loadRiwayah,
  persistRiwayahSelection,
  refreshRiwayahPackageStatus,
  type Riwayah,
} from '../packs/riwayah'
import {
  riwayahInstallIntent,
  settings,
} from './state.svelte.ts'
import { registerTopic } from '../infra/safety/sync'

export type { Riwayah }
export { getRiwayahOptions, loadRiwayah }
export {
  beginRiwayahInstall,
  completeRiwayahInstall,
  failRiwayahInstall,
  refreshRiwayahPackageStatus,
}

export async function setRiwayah(next: Riwayah): Promise<boolean> {
  const result = await persistRiwayahSelection(next)
  if (!result) return false
  return true
}

export async function initRiwayah(): Promise<Riwayah> {
  // Register the cross-tab topic handler. settings/riwayah owns its own
  // applyRiwayah / event-emit on incoming messages — sync.ts no longer
  // imports from this module, breaking the audit CC-4 cycle (2026-04-29).
  registerTopic('settings.riwayah', (payload) => {
    const v = (payload || {}) as { value?: unknown }
    if (!isRiwayah(v.value)) { return }
    const next = v.value
    const prev = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-riwayah') : null) as Riwayah | null
    if (prev === next) { return }
    applyRiwayah(next)
    ;(settings as Record<string, unknown>).riwayah = next
    emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: (prev ?? DEFAULT_RIWAYAH), to: next })
  })
  const r = await loadRiwayah()
  try {
    if (await isRiwayahUsable(r)) {
      riwayahInstallIntent.previousUsable = r
    } else if (await isRiwayahUsable(DEFAULT_RIWAYAH)) {
      riwayahInstallIntent.previousUsable = DEFAULT_RIWAYAH
    }
  } catch {
    // Package index may be absent in old cached builds or test harnesses; the
    // active setting still loads, but optional persistence remains gated.
  }
  applyRiwayah(r)
  ;(settings as Record<string, unknown>).riwayah = r
  return r
}
