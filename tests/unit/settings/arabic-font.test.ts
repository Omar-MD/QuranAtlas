import { describe, expect, it, beforeEach } from 'vitest'
import { del, openDB, put, get } from '../../../src/core/db.js'
import { settings, type Riwayah } from '../../../src/state/settings.svelte.ts'
import { emit } from '../../../src/core/events.js'
import { Events } from '../../../src/core/constants.js'

const RIWAYAT: Riwayah[] = ['hafs', 'warsh', 'qaloon']
const STORAGE_KEYS = ['arabicFont_hafs', 'arabicFont_warsh', 'arabicFont_qaloon'] as const
const RUNE_KEYS = ['arabicFontHafs', 'arabicFontWarsh', 'arabicFontQaloon'] as const

describe('arabic-font', () => {
  beforeEach(async () => {
    await openDB()
    for (const k of STORAGE_KEYS) {
      try { await del('settings', k) } catch { /* ignore */ }
    }
    for (const k of RUNE_KEYS) {
      ;(settings as Record<string, unknown>)[k] = 'amiri-quran'
    }
    document.documentElement.removeAttribute('data-arabic-font')
    ;(settings as Record<string, unknown>).riwayah = 'qaloon'
  })

  it('exposes 3 options in canonical order', async () => {
    const mod = await import('../../../src/settings/arabic-font.ts')
    expect(mod.getArabicFontOptions()).toEqual(['amiri-quran', 'kfgqpc', 'scheherazade'])
  })

  it('loadArabicFont returns amiri-quran default on fresh install for each riwayah', async () => {
    const { loadArabicFont } = await import('../../../src/settings/arabic-font.ts')
    for (const r of RIWAYAT) {
      expect(await loadArabicFont(r)).toBe('amiri-quran')
    }
  })

  it('loadArabicFont returns saved value per riwayah', async () => {
    await put('settings', { key: 'arabicFont_hafs', value: 'kfgqpc' })
    await put('settings', { key: 'arabicFont_warsh', value: 'scheherazade' })
    const { loadArabicFont } = await import('../../../src/settings/arabic-font.ts')
    expect(await loadArabicFont('hafs')).toBe('kfgqpc')
    expect(await loadArabicFont('warsh')).toBe('scheherazade')
    expect(await loadArabicFont('qaloon')).toBe('amiri-quran')
  })

  it('loadArabicFont falls back to default for invalid stored value', async () => {
    await put('settings', { key: 'arabicFont_hafs', value: 'invalid-font' })
    const { loadArabicFont } = await import('../../../src/settings/arabic-font.ts')
    expect(await loadArabicFont('hafs')).toBe('amiri-quran')
  })

  it('applyArabicFont sets data-arabic-font on <html>', async () => {
    const { applyArabicFont } = await import('../../../src/settings/arabic-font.ts')
    applyArabicFont('kfgqpc')
    expect(document.documentElement.getAttribute('data-arabic-font')).toBe('kfgqpc')
    applyArabicFont('scheherazade')
    expect(document.documentElement.getAttribute('data-arabic-font')).toBe('scheherazade')
  })

  it('setArabicFont writes IDB, mutates rune, applies attribute when active', async () => {
    ;(settings as Record<string, unknown>).riwayah = 'hafs'
    const { setArabicFont } = await import('../../../src/settings/arabic-font.ts')
    const ok = await setArabicFont('hafs', 'kfgqpc')
    expect(ok).toBe(true)
    expect(settings.arabicFontHafs).toBe('kfgqpc')
    expect(document.documentElement.getAttribute('data-arabic-font')).toBe('kfgqpc')
    const rec = await get('settings', 'arabicFont_hafs') as { value: string } | undefined
    expect(rec?.value).toBe('kfgqpc')
  })

  it('setArabicFont mutates rune but does NOT apply attribute when riwayah inactive', async () => {
    ;(settings as Record<string, unknown>).riwayah = 'qaloon'
    const { setArabicFont } = await import('../../../src/settings/arabic-font.ts')
    await setArabicFont('hafs', 'scheherazade')
    expect(settings.arabicFontHafs).toBe('scheherazade')
    expect(document.documentElement.getAttribute('data-arabic-font')).toBeNull()
  })

  it('setArabicFont returns false for invalid font value', async () => {
    const { setArabicFont } = await import('../../../src/settings/arabic-font.ts')
    const ok = await setArabicFont('hafs', 'invalid' as never)
    expect(ok).toBe(false)
    expect(settings.arabicFontHafs).toBe('amiri-quran')
  })

  it('initArabicFont loads all three keys + applies active riwayah font', async () => {
    await put('settings', { key: 'arabicFont_hafs', value: 'kfgqpc' })
    await put('settings', { key: 'arabicFont_warsh', value: 'scheherazade' })
    ;(settings as Record<string, unknown>).riwayah = 'hafs'
    const { initArabicFont } = await import('../../../src/settings/arabic-font.ts')
    await initArabicFont()
    expect(settings.arabicFontHafs).toBe('kfgqpc')
    expect(settings.arabicFontWarsh).toBe('scheherazade')
    expect(settings.arabicFontQaloon).toBe('amiri-quran')
    expect(document.documentElement.getAttribute('data-arabic-font')).toBe('kfgqpc')
  })

  it('riwayah change emits SETTINGS_RIWAYAH_CHANGED → reapplies new active font', async () => {
    await put('settings', { key: 'arabicFont_hafs', value: 'kfgqpc' })
    await put('settings', { key: 'arabicFont_warsh', value: 'scheherazade' })
    ;(settings as Record<string, unknown>).riwayah = 'hafs'
    const { initArabicFont } = await import('../../../src/settings/arabic-font.ts')
    await initArabicFont()
    expect(document.documentElement.getAttribute('data-arabic-font')).toBe('kfgqpc')
    ;(settings as Record<string, unknown>).riwayah = 'warsh'
    emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: 'hafs', to: 'warsh' })
    await Promise.resolve()
    expect(document.documentElement.getAttribute('data-arabic-font')).toBe('scheherazade')
  })
})
