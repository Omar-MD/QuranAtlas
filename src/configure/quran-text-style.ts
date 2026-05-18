import { get, put } from '../core/db.js'
import { settings } from './state.svelte.ts'
import { canUseTextAsset, defaultTextStyleForRiwayah } from '../packs/text-assets'
import { setActiveVariantBundle } from './variant-bundle'

export async function loadQuranTextStyleId(): Promise<string> {
  const rec = await get('settings', 'quranTextStyleId').catch(() => undefined)
  const raw = (rec as { value?: unknown } | undefined)?.value
  return typeof raw === 'string' ? raw : defaultTextStyleForRiwayah(settings.riwayah)
}

export async function setQuranTextStyleId(quranTextStyleId: string): Promise<boolean> {
  if (!(await canUseTextAsset(settings.riwayah, quranTextStyleId))) return false
  return setActiveVariantBundle({
    riwayah: settings.riwayah,
    quranTextStyleId,
    mushafEditionId: settings.mushafEditionId,
  })
}

export async function initQuranTextStyle(): Promise<string> {
  const quranTextStyleId = await loadQuranTextStyleId()
  Object.assign(settings, { quranTextStyleId })
  await put('settings', { key: 'quranTextStyleId', value: quranTextStyleId }).catch(() => undefined)
  return quranTextStyleId
}
