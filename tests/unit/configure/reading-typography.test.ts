import { describe, expect, it, beforeEach } from 'vitest'
import { del, openDB, put } from '../../../src/core/db.js'
import { settings } from '../../../src/configure/state.svelte.ts'

const KEYS = ['lineSpacing', 'wordSpacing', 'readerMargin', 'verseSpacing'] as const
const ATTRS = {
  lineSpacing: 'data-line-spacing',
  wordSpacing: 'data-word-spacing',
  readerMargin: 'data-reader-margin',
  verseSpacing: 'data-verse-spacing',
} as const

describe('reading-typography', () => {
  beforeEach(async () => {
    await openDB()
    for (const k of KEYS) {
      try { await del('settings', k) } catch { /* ignore */ }
      document.documentElement.removeAttribute(ATTRS[k])
      ;(settings as any)[k] = 'md'
    }
  })

  it('exposes 5 options in ascending scale order', async () => {
    const mod = await import('../../../src/configure/reading-typography.ts')
    expect(mod.getReadingOptions()).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])
  })

  it('applyReadingStep sets the correct attribute on <html>', async () => {
    const { applyReadingStep } = await import('../../../src/configure/reading-typography.ts')
    applyReadingStep('lineSpacing', 'lg')
    expect(document.documentElement.getAttribute('data-line-spacing')).toBe('lg')
    applyReadingStep('wordSpacing', 'xs')
    expect(document.documentElement.getAttribute('data-word-spacing')).toBe('xs')
    applyReadingStep('readerMargin', 'xl')
    expect(document.documentElement.getAttribute('data-reader-margin')).toBe('xl')
  })

  it('loadReadingSettings returns md defaults on fresh install', async () => {
    const { loadReadingSettings } = await import('../../../src/configure/reading-typography.ts')
    const result = await loadReadingSettings()
    expect(result).toEqual({ lineSpacing: 'md', wordSpacing: 'md', readerMargin: 'md', verseSpacing: 'md' })
  })

  it('loadReadingSettings returns saved values when present', async () => {
    await put('settings', { key: 'lineSpacing', value: 'lg' })
    await put('settings', { key: 'wordSpacing', value: 'xs' })
    await put('settings', { key: 'readerMargin', value: 'xl' })
    const { loadReadingSettings } = await import('../../../src/configure/reading-typography.ts')
    expect(await loadReadingSettings()).toEqual({
      lineSpacing: 'lg',
      wordSpacing: 'xs',
      readerMargin: 'xl',
      verseSpacing: 'md',
    })
  })

  it('loadReadingSettings falls back to md for invalid stored values', async () => {
    await put('settings', { key: 'lineSpacing', value: 'huge' })
    const { loadReadingSettings } = await import('../../../src/configure/reading-typography.ts')
    const result = await loadReadingSettings()
    expect(result.lineSpacing).toBe('md')
  })

  it('setReadingStep writes IDB, applies attribute, mutates rune', async () => {
    const { setReadingStep } = await import('../../../src/configure/reading-typography.ts')
    const ok = await setReadingStep('lineSpacing', 'xl')
    expect(ok).toBe(true)
    expect(document.documentElement.getAttribute('data-line-spacing')).toBe('xl')
    expect(settings.lineSpacing).toBe('xl')
    const stored = await (await import('../../../src/core/db.js')).get('settings', 'lineSpacing') as { value: string } | undefined
    expect(stored?.value).toBe('xl')
  })

  it('setReadingStep returns false for invalid step and writes nothing', async () => {
    const { setReadingStep } = await import('../../../src/configure/reading-typography.ts')
    const ok = await setReadingStep('lineSpacing', 'huge' as any)
    expect(ok).toBe(false)
    expect(document.documentElement.hasAttribute('data-line-spacing')).toBe(false)
    expect(settings.lineSpacing).toBe('md')
  })

  it('resetReadingTypography writes md to all three keys + applies attributes', async () => {
    const { setReadingStep, resetReadingTypography } =
      await import('../../../src/configure/reading-typography.ts')
    await setReadingStep('lineSpacing', 'xl')
    await setReadingStep('wordSpacing', 'xs')
    await setReadingStep('readerMargin', 'lg')
    const ok = await resetReadingTypography()
    expect(ok).toBe(true)
    for (const k of KEYS) {
      expect(settings[k]).toBe('md')
      expect(document.documentElement.getAttribute(ATTRS[k])).toBe('md')
    }
  })

  it('setReadingFlow writes all four IDB keys + applies attributes (ports D5 e2e)', async () => {
    const { setReadingFlow } = await import('../../../src/configure/reading-typography.ts')
    expect(await setReadingFlow('xl')).toBe(true)
    for (const k of KEYS) {
      const stored = await (await import('../../../src/core/db.js')).get('settings', k) as { value: string } | undefined
      expect(stored?.value).toBe('xl')
      expect(document.documentElement.getAttribute(ATTRS[k])).toBe('xl')
      expect(settings[k]).toBe('xl')
    }
  })

  it('setReadingFlow + initReadingTypography round-trip restores all four keys (ports D5 reload e2e)', async () => {
    const { setReadingFlow, initReadingTypography } =
      await import('../../../src/configure/reading-typography.ts')
    await setReadingFlow('xl')
    // Simulate reload: clear in-memory rune + DOM, then init from IDB.
    for (const k of KEYS) {
      ;(settings as any)[k] = 'md'
      document.documentElement.removeAttribute(ATTRS[k])
    }
    await initReadingTypography()
    for (const k of KEYS) {
      expect(settings[k]).toBe('xl')
      expect(document.documentElement.getAttribute(ATTRS[k])).toBe('xl')
    }
  })

  it('initReadingTypography hydrates rune + applies attributes from IDB', async () => {
    await put('settings', { key: 'lineSpacing', value: 'lg' })
    await put('settings', { key: 'wordSpacing', value: 'sm' })
    await put('settings', { key: 'readerMargin', value: 'xl' })
    const { initReadingTypography } =
      await import('../../../src/configure/reading-typography.ts')
    await initReadingTypography()
    expect(settings.lineSpacing).toBe('lg')
    expect(settings.wordSpacing).toBe('sm')
    expect(settings.readerMargin).toBe('xl')
    expect(document.documentElement.getAttribute('data-line-spacing')).toBe('lg')
    expect(document.documentElement.getAttribute('data-word-spacing')).toBe('sm')
    expect(document.documentElement.getAttribute('data-reader-margin')).toBe('xl')
  })
})
