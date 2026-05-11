import { describe, expect, it, beforeEach } from 'vitest'
import { del, get, openDB, put } from '../../../../src/core/db.js'
import { settings } from '../../../../src/configure/state.svelte.ts'

describe('mushaf view mode preference', () => {
  beforeEach(async () => {
    await openDB()
    try { await del('settings', 'mushafViewMode') } catch { /* ignore */ }
    settings.mushafViewMode = 'auto'
  })

  it('exposes document-reader view mode options', async () => {
    const { getMushafViewModeOptions } = await import('../../../../src/read/mushaf/view-mode.ts')
    expect(getMushafViewModeOptions()).toEqual(['auto', 'fit-page', 'fit-width'])
  })

  it('loads auto on fresh install', async () => {
    const { loadMushafViewMode } = await import('../../../../src/read/mushaf/view-mode.ts')
    expect(await loadMushafViewMode()).toBe('auto')
  })

  it('loads a saved valid mode', async () => {
    await put('settings', { key: 'mushafViewMode', value: 'fit-page' })
    const { loadMushafViewMode } = await import('../../../../src/read/mushaf/view-mode.ts')
    expect(await loadMushafViewMode()).toBe('fit-page')
  })

  it('falls back to auto for invalid stored values', async () => {
    await put('settings', { key: 'mushafViewMode', value: 'cover' })
    const { loadMushafViewMode } = await import('../../../../src/read/mushaf/view-mode.ts')
    expect(await loadMushafViewMode()).toBe('auto')
  })

  it('setMushafViewMode writes IDB and mutates the settings rune', async () => {
    const { setMushafViewMode } = await import('../../../../src/read/mushaf/view-mode.ts')
    expect(await setMushafViewMode('fit-width')).toBe(true)
    expect(settings.mushafViewMode).toBe('fit-width')
    const stored = await get('settings', 'mushafViewMode') as { value: string } | undefined
    expect(stored?.value).toBe('fit-width')
  })

  it('rejects invalid modes without mutating settings', async () => {
    const { setMushafViewMode } = await import('../../../../src/read/mushaf/view-mode.ts')
    expect(await setMushafViewMode('cover' as never)).toBe(false)
    expect(settings.mushafViewMode).toBe('auto')
    expect(await get('settings', 'mushafViewMode')).toBeUndefined()
  })

  it('initMushafViewMode hydrates the settings rune', async () => {
    await put('settings', { key: 'mushafViewMode', value: 'fit-page' })
    const { initMushafViewMode } = await import('../../../../src/read/mushaf/view-mode.ts')
    await initMushafViewMode()
    expect(settings.mushafViewMode).toBe('fit-page')
  })
})
