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
  refreshRiwayahPackageStatus,
  type Riwayah,
} from '../packs/riwayah'
import { defaultTextStyleForRiwayah } from '../packs/text-assets'
import { defaultMushafEditionForRiwayah } from '../packs/mushaf-assets'
import {
  riwayahInstallIntent,
  settings,
} from './state.svelte.ts'
import { registerTopic } from '../infra/safety/sync'
import { initActiveVariantBundle, setActiveVariantBundle, type ActiveVariantBundle } from './variant-bundle'

export type { Riwayah }
export { getRiwayahOptions, loadRiwayah }
export {
  beginRiwayahInstall,
  completeRiwayahInstall,
  failRiwayahInstall,
  refreshRiwayahPackageStatus,
}

export async function setRiwayah(next: Riwayah): Promise<boolean> {
  if (!isRiwayah(next)) return false
  const [quranTextStyleId, mushafEditionId] = await Promise.all([
    defaultTextStyleForRiwayah(next),
    defaultMushafEditionForRiwayah(next),
  ])
  return setActiveVariantBundle({ riwayah: next, quranTextStyleId, mushafEditionId })
}

function isBundlePayload(payload: unknown): payload is ActiveVariantBundle {
  const bundle = payload as Partial<ActiveVariantBundle> | null
  return !!bundle
    && isRiwayah(bundle.riwayah)
    && typeof bundle.quranTextStyleId === 'string'
    && typeof bundle.mushafEditionId === 'string'
}

function applySyncedBundle(next: ActiveVariantBundle): void {
  const previous = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-riwayah') : null) as Riwayah | null
  if (
    settings.riwayah === next.riwayah
    && settings.quranTextStyleId === next.quranTextStyleId
    && settings.mushafEditionId === next.mushafEditionId
  ) {
    return
  }
  Object.assign(settings, next)
  applyRiwayah(next.riwayah)
  if (previous !== next.riwayah) {
    emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: (previous ?? DEFAULT_RIWAYAH), to: next.riwayah })
  }
}

export async function initRiwayah(): Promise<Riwayah> {
  // Register the cross-tab topic handler. settings/riwayah owns its own
  // applyRiwayah / event-emit on incoming messages — sync.ts no longer
  // imports from this module, breaking the audit CC-4 cycle (2026-04-29).
  registerTopic('settings.riwayah', (payload) => {
    if (isBundlePayload(payload)) {
      applySyncedBundle(payload)
      return
    }
    const v = (payload || {}) as { value?: unknown }
    if (!isRiwayah(v.value)) { return }
    applySyncedBundle({
      riwayah: v.value,
      quranTextStyleId: settings.quranTextStyleId,
      mushafEditionId: settings.mushafEditionId,
    })
  })
  const bundle = await initActiveVariantBundle()
  try {
    if (await isRiwayahUsable(bundle.riwayah)) {
      riwayahInstallIntent.previousUsable = bundle.riwayah
    } else if (await isRiwayahUsable(DEFAULT_RIWAYAH)) {
      riwayahInstallIntent.previousUsable = DEFAULT_RIWAYAH
    }
  } catch {
    // Package index may be absent in old cached builds or test harnesses; the
    // active setting still loads, but optional persistence remains gated.
  }
  return bundle.riwayah
}
