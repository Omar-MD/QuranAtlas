import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { del, get, openDB } from '../../../src/core/db.js'
import { clear } from '../../../src/core/events.js'
import { logger } from '../../../src/core/logger.js'
import { applyTheme, cycleTheme, getThemeOptions, initTheme, setTheme } from '../../../src/configure/theme.ts'

function mockPrefersDark(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (q: string) => ({
      matches: q.includes('dark') ? matches : false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  })
}

async function resetThemeSetting() {
  try {
    await del('settings', 'theme')
  } catch {
    // No-op: missing records are fine for test setup.
  }
}

describe('settings/theme.ts', () => {
  beforeEach(async () => {
    await openDB()
    await resetThemeSetting()
    clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(async () => {
    clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-pref')
    await resetThemeSetting()
    vi.restoreAllMocks()
  })

  it('applies the new theme attribute and persists asynchronously', async () => {
    applyTheme('sepia')

    const success = await setTheme('dark')

    expect(success).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    await vi.waitFor(async () => {
      expect(await get('settings', 'theme')).toEqual({ key: 'theme', value: 'dark' })
    })
  })

  it('rejects invalid themes without persisting anything', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    applyTheme('light')

    const success = await setTheme('midnight')

    expect(success).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(await get('settings', 'theme')).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith('Invalid theme:', { theme: 'midnight' })
  })

  it('applies sepia even when only the legacy theme-dark class is present', async () => {
    document.documentElement.classList.add('theme-dark')
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-pref')

    const success = await setTheme('sepia')

    expect(success).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia')
  })

  it('syncs <meta name="theme-color"> to --qa-surface-app on every applyTheme', async () => {
    document.querySelectorAll('meta[name="theme-color"]').forEach((node) => node.remove())
    const surfaceByTheme = {
      light: 'rgb(11, 22, 33)',
      sepia: 'rgb(44, 55, 66)',
      dark: 'rgb(77, 88, 99)',
    }
    const original = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
      const variant = document.documentElement.getAttribute('data-theme') ?? 'light'
      const value = surfaceByTheme[variant as keyof typeof surfaceByTheme] ?? ''
      const real = original.call(window, el)
      return { ...real, getPropertyValue: (prop: string) => prop === '--qa-surface-app' ? value : real.getPropertyValue(prop) } as CSSStyleDeclaration
    })

    applyTheme('light')
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(surfaceByTheme.light)

    applyTheme('dark')
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(surfaceByTheme.dark)

    applyTheme('sepia')
    expect(document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content).toBe(surfaceByTheme.sepia)
  })

  it('returns the supported theme options as a new array', () => {
    const options = getThemeOptions()

    expect(options).toEqual(['light', 'sepia', 'dark', 'auto'])
    expect(options).not.toBe(getThemeOptions())
  })

  describe('cycleTheme', () => {
    it('cycles light → sepia → dark → light, skipping auto so the visible variant always changes', async () => {
      mockPrefersDark(false)
      applyTheme('light')
      expect(await cycleTheme()).toBe('sepia')
      expect(await cycleTheme()).toBe('dark')
      expect(await cycleTheme()).toBe('light')
    })

    it('from auto + OS dark, next tap goes to light (regression: dark→auto→dark previously needed two taps to reach light)', async () => {
      mockPrefersDark(true)
      applyTheme('auto')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      expect(await cycleTheme()).toBe('light')
    })

    it('from auto + OS light, next tap goes to sepia', async () => {
      mockPrefersDark(false)
      applyTheme('auto')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
      expect(await cycleTheme()).toBe('sepia')
    })
  })

  it('initTheme loads the persisted value and applies it', async () => {
    document.documentElement.classList.add('theme-light')
    await openDB()
    await del('settings', 'theme').catch(() => {})
    const { put } = await import('../../../src/core/db.js')
    await put('settings', { key: 'theme', value: 'sepia' })

    await initTheme()

    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia')
    expect(document.documentElement.classList.contains('theme-sepia')).toBe(true)
  })

  it('loadTheme falls back to light and logs when the settings read fails', async () => {
    vi.resetModules()
    const errorSpy = vi.fn()

    vi.doMock('../../../src/core/db.js', () => ({
      get: vi.fn().mockRejectedValue(new Error('broken settings store')),
      put: vi.fn(),
    }))
    vi.doMock('../../../src/core/logger.js', () => ({
      logger: {
        error: errorSpy,
        warn: vi.fn(),
      },
    }))

    const { loadTheme } = await import('../../../src/configure/theme.ts')

    await expect(loadTheme()).resolves.toBe('light')
    expect(errorSpy).toHaveBeenCalledWith('Failed to load theme:', {
      error: expect.any(Error),
    })
  })

  it('logs persistence failures without rolling back the applied theme', async () => {
    vi.resetModules()
    const errorSpy = vi.fn()

    vi.doMock('../../../src/core/db.js', () => ({
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockRejectedValue(new Error('quota exceeded')),
    }))
    vi.doMock('../../../src/core/logger.js', () => ({
      logger: {
        error: errorSpy,
        warn: vi.fn(),
      },
    }))

    const { setTheme: setThemeWithFailure } = await import('../../../src/configure/theme.ts')

    await expect(setThemeWithFailure('dark')).resolves.toBe(true)
    await Promise.resolve()

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(errorSpy).toHaveBeenCalledWith('Failed to save theme:', {
      theme: 'dark',
      error: expect.any(Error),
    })
  })
})