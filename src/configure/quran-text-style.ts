import { get, put } from '../core/db.js'
import { settings } from './state.svelte.ts'
import { DEFAULT_READER_ASSET_PROFILE } from '../../shared/reader-assets/default-profile'

export async function loadQuranTextStyleId(): Promise<string> {
  const rec = await get('settings', 'quranTextStyleId').catch(() => undefined)
  const raw = (rec as { value?: unknown } | undefined)?.value
  return raw === DEFAULT_READER_ASSET_PROFILE.quranTextStyleId
    ? raw
    : DEFAULT_READER_ASSET_PROFILE.quranTextStyleId
}

export async function setQuranTextStyleId(quranTextStyleId: string): Promise<boolean> {
  if (quranTextStyleId !== DEFAULT_READER_ASSET_PROFILE.quranTextStyleId) return false
  Object.assign(settings, { quranTextStyleId })
  return true
}

export async function initQuranTextStyle(): Promise<string> {
  const quranTextStyleId = await loadQuranTextStyleId()
  Object.assign(settings, { quranTextStyleId })
  await put('settings', { key: 'quranTextStyleId', value: quranTextStyleId }).catch(() => undefined)
  return quranTextStyleId
}
