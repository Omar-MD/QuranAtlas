import { get, put } from '../core/db.js'
import { settings } from './state.svelte.ts'
import { DEFAULT_READER_ASSET_PROFILE } from '../../shared/reader-assets/default-profile'

export async function loadMushafEditionId(): Promise<string> {
  const rec = await get('settings', 'mushafEditionId').catch(() => undefined)
  const raw = (rec as { value?: unknown } | undefined)?.value
  return raw === DEFAULT_READER_ASSET_PROFILE.mushafEditionId
    ? raw
    : DEFAULT_READER_ASSET_PROFILE.mushafEditionId
}

export async function setMushafEditionId(mushafEditionId: string): Promise<boolean> {
  if (mushafEditionId !== DEFAULT_READER_ASSET_PROFILE.mushafEditionId) return false
  Object.assign(settings, { mushafEditionId })
  return true
}

export async function initMushafEdition(): Promise<string> {
  const mushafEditionId = await loadMushafEditionId()
  Object.assign(settings, { mushafEditionId })
  await put('settings', { key: 'mushafEditionId', value: mushafEditionId }).catch(() => undefined)
  return mushafEditionId
}
