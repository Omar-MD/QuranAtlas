import { get, put } from '../core/db.js'
import { settings } from './state.svelte.ts'
import { canUseMushafAsset, defaultMushafEditionForRiwayah } from '../packs/mushaf-assets'
import { setActiveVariantBundle } from './variant-bundle'

export async function loadMushafEditionId(): Promise<string> {
  const rec = await get('settings', 'mushafEditionId').catch(() => undefined)
  const raw = (rec as { value?: unknown } | undefined)?.value
  return typeof raw === 'string' ? raw : defaultMushafEditionForRiwayah(settings.riwayah)
}

export async function setMushafEditionId(mushafEditionId: string): Promise<boolean> {
  if (!(await canUseMushafAsset(settings.riwayah, mushafEditionId))) return false
  return setActiveVariantBundle({
    riwayah: settings.riwayah,
    quranTextStyleId: settings.quranTextStyleId,
    mushafEditionId,
  })
}

export async function initMushafEdition(): Promise<string> {
  const mushafEditionId = await loadMushafEditionId()
  Object.assign(settings, { mushafEditionId })
  await put('settings', { key: 'mushafEditionId', value: mushafEditionId }).catch(() => undefined)
  return mushafEditionId
}
