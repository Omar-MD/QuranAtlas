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
import {
  riwayahInstallIntent,
  settings,
} from './state.svelte.ts'
import { registerTopic } from '../infra/safety/sync'
import { initActiveVariantBundle, type ActiveVariantBundle } from './variant-bundle'
import { DEFAULT_READER_ASSET_PROFILE } from '../../shared/reader-assets/default-profile'

export type { Riwayah }
export { getRiwayahOptions, loadRiwayah }
export {
  beginRiwayahInstall,
  completeRiwayahInstall,
  failRiwayahInstall,
  refreshRiwayahPackageStatus,
}

export async function setRiwayah(next: Riwayah): Promise<boolean> {
  return next === DEFAULT_READER_ASSET_PROFILE.riwayah
}

function isBundlePayload(payload: unknown): payload is ActiveVariantBundle {
  const bundle = payload as Partial<ActiveVariantBundle> | null
  return !!bundle
    && isRiwayah(bundle.riwayah)
    && typeof bundle.quranTextStyleId === 'string'
    && typeof bundle.mushafEditionId === 'string'
}

function applySyncedBundle(next: ActiveVariantBundle): void {
  if (!isDefaultVariantBundle(next)) return
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

function isDefaultVariantBundle(bundle: ActiveVariantBundle): boolean {
  return bundle.riwayah === DEFAULT_READER_ASSET_PROFILE.riwayah
    && bundle.quranTextStyleId === DEFAULT_READER_ASSET_PROFILE.quranTextStyleId
    && bundle.mushafEditionId === DEFAULT_READER_ASSET_PROFILE.mushafEditionId
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
