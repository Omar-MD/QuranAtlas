import { get, getDb } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { applyRiwayah, DEFAULT_RIWAYAH, isRiwayah, type Riwayah } from '../packs/riwayah'
import { canUseTextAsset, defaultTextStyleForRiwayah } from '../packs/text-assets'
import { canUseMushafAsset, defaultMushafEditionForRiwayah } from '../packs/mushaf-assets'
import { broadcastActiveVariantBundle } from '../infra/safety/sync'
import { settings } from './state.svelte.ts'

export type ActiveVariantBundle = {
  riwayah: Riwayah
  quranTextStyleId: string
  mushafEditionId: string
}

type SettingsWrite = { key: string; value: unknown }

export function snapshotActiveVariantBundle(): ActiveVariantBundle {
  return {
    riwayah: settings.riwayah,
    quranTextStyleId: settings.quranTextStyleId,
    mushafEditionId: settings.mushafEditionId,
  }
}

async function loadSettingValue(key: string): Promise<unknown> {
  const rec = await get('settings', key).catch(() => undefined)
  return (rec as { value?: unknown } | undefined)?.value
}

async function putSettingsBundleAtomically(records: SettingsWrite[]): Promise<void> {
  const db = await getDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite')
    const store = tx.objectStore('settings')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Settings bundle transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('Settings bundle transaction aborted'))
    for (const record of records) {
      store.put(record)
    }
  })
}

export async function setActiveVariantBundle(next: ActiveVariantBundle): Promise<boolean> {
  if (!isRiwayah(next.riwayah)) return false
  if (!(await canUseTextAsset(next.riwayah, next.quranTextStyleId))) return false
  if (!(await canUseMushafAsset(next.riwayah, next.mushafEditionId))) return false

  const previous = snapshotActiveVariantBundle()
  try {
    await putSettingsBundleAtomically([
      { key: 'riwayah', value: next.riwayah },
      { key: 'quranTextStyleId', value: next.quranTextStyleId },
      { key: 'mushafEditionId', value: next.mushafEditionId },
    ])
  } catch (error) {
    logger.error('Failed to save active variant bundle', { next, error })
    return false
  }

  Object.assign(settings, next)
  applyRiwayah(next.riwayah)
  if (previous.riwayah !== next.riwayah) {
    emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: previous.riwayah, to: next.riwayah })
  }
  broadcastActiveVariantBundle(next)
  return true
}

export async function initActiveVariantBundle(): Promise<ActiveVariantBundle> {
  const rawRiwayah = await loadSettingValue('riwayah')
  const riwayah = isRiwayah(rawRiwayah) ? rawRiwayah : DEFAULT_RIWAYAH
  const defaultTextStyleId = await defaultTextStyleForRiwayah(riwayah)
  const defaultMushafEditionId = await defaultMushafEditionForRiwayah(riwayah)
  const rawTextStyleId = await loadSettingValue('quranTextStyleId')
  const rawMushafEditionId = await loadSettingValue('mushafEditionId')
  const candidate = {
    riwayah,
    quranTextStyleId: typeof rawTextStyleId === 'string' ? rawTextStyleId : defaultTextStyleId,
    mushafEditionId: typeof rawMushafEditionId === 'string' ? rawMushafEditionId : defaultMushafEditionId,
  }
  const usable =
    await canUseTextAsset(candidate.riwayah, candidate.quranTextStyleId)
    && await canUseMushafAsset(candidate.riwayah, candidate.mushafEditionId)
  const bundle = usable
    ? candidate
    : { riwayah, quranTextStyleId: defaultTextStyleId, mushafEditionId: defaultMushafEditionId }
  Object.assign(settings, bundle)
  applyRiwayah(bundle.riwayah)
  return bundle
}
