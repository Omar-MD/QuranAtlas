import { describe, expect, it, beforeEach } from 'vitest'
import { del, openDB, put, get } from '../../../src/core/db.js'
import { settings } from '../../../src/settings/state.svelte.ts'
import { reader } from '../../../src/reader/state.svelte.ts'

describe('surah-header-visibility', () => {
  beforeEach(async () => {
    await openDB()
    try { await del('settings', 'surahHeaderHidden') } catch { /* ignore */ }
    settings.surahHeaderHidden = false
    reader.surahHeaderHidden = false
  })

  it('loadSurahHeaderHidden returns false on fresh install', async () => {
    const { loadSurahHeaderHidden } = await import('../../../src/settings/surah-header-visibility.ts')
    expect(await loadSurahHeaderHidden()).toBe(false)
  })

  it('loadSurahHeaderHidden returns saved boolean', async () => {
    await put('settings', { key: 'surahHeaderHidden', value: true })
    const { loadSurahHeaderHidden } = await import('../../../src/settings/surah-header-visibility.ts')
    expect(await loadSurahHeaderHidden()).toBe(true)
  })

  it('loadSurahHeaderHidden falls back to false for non-boolean stored value', async () => {
    await put('settings', { key: 'surahHeaderHidden', value: 'yes' })
    const { loadSurahHeaderHidden } = await import('../../../src/settings/surah-header-visibility.ts')
    expect(await loadSurahHeaderHidden()).toBe(false)
  })

  it('setSurahHeaderHidden writes IDB + mirrors rune + settings', async () => {
    const { setSurahHeaderHidden } = await import('../../../src/settings/surah-header-visibility.ts')
    await setSurahHeaderHidden(true)
    expect(settings.surahHeaderHidden).toBe(true)
    expect(reader.surahHeaderHidden).toBe(true)
    const stored = await get('settings', 'surahHeaderHidden') as { value: boolean } | undefined
    expect(stored?.value).toBe(true)
  })

  it('toggleSurahHeaderHidden flips state and returns the new value', async () => {
    const { toggleSurahHeaderHidden } = await import('../../../src/settings/surah-header-visibility.ts')
    expect(await toggleSurahHeaderHidden()).toBe(true)
    expect(settings.surahHeaderHidden).toBe(true)
    expect(await toggleSurahHeaderHidden()).toBe(false)
    expect(settings.surahHeaderHidden).toBe(false)
  })

  it('initSurahHeaderHidden hydrates rune + settings from IDB', async () => {
    await put('settings', { key: 'surahHeaderHidden', value: true })
    const { initSurahHeaderHidden } = await import('../../../src/settings/surah-header-visibility.ts')
    await initSurahHeaderHidden()
    expect(settings.surahHeaderHidden).toBe(true)
    expect(reader.surahHeaderHidden).toBe(true)
  })

  it('preference persists across simulated surah navigation (regression guard for req 4)', async () => {
    const { setSurahHeaderHidden } = await import('../../../src/settings/surah-header-visibility.ts')
    await setSurahHeaderHidden(true)
    reader.currentSurahNum = 1
    expect(reader.surahHeaderHidden).toBe(true)
    reader.currentSurahNum = 2
    expect(reader.surahHeaderHidden).toBe(true)
    expect(settings.surahHeaderHidden).toBe(true)
  })
})
