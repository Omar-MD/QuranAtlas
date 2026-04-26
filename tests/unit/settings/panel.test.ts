/**
 * Component tests for Panel.svelte — ports several non-layout D-tests to unit:
 *
 *   D1:  open Settings sheet → structure (4 theme swatches, switches, typography row)
 *   D1:  Escape closes Settings sheet
 *   D:   Clear-data row no longer in Settings sheet (post-redesign regression guard)
 *   D1b: Riwayah row exposes 3 swatches; clicking commits to IDB
 *   D2:  Show translation row subtitle visible (≤1 translation: not-a-button branch)
 *   D2:  toggle translation switch → IDB write + rune flip
 *   D3:  4× theme swatch click → setTheme runs + active class flips
 *   D5:  typography subview exposes Font size + Reading flow sliders only
 *   D5:  reset button hidden by default, appears on change
 */

import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../src/data/dataset.ts', () => ({
  getTranslations: vi.fn(async () => []),
}))
vi.mock('../../../src/safety/sync.ts', () => ({
  broadcastRiwayahChange: vi.fn(),
  suppressNextVersionChange: vi.fn(),
}))
vi.mock('../../../src/a11y/announcer.js', () => ({ announce: vi.fn() }))

import Panel from '../../../src/settings/Panel.svelte'
import { openSettingsSheet } from '../../../src/settings/panel-bridge.ts'
import { del, get, openDB } from '../../../src/core/db.js'
import { settings } from '../../../src/state/settings.svelte.ts'

const FLOW_KEYS = ['theme', 'translationVisible', 'translationId', 'riwayah', 'fontSize',
                   'lineSpacing', 'wordSpacing', 'readerMargin', 'verseSpacing'] as const

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
}

async function mountAndOpen() {
  render(Panel)
  await flush()
  openSettingsSheet()
  await flush()
  await Promise.resolve()
  await Promise.resolve()
}

describe('Panel.svelte (D1 / D1b / D2 / D3 / D5)', () => {
  beforeEach(async () => {
    await openDB()
    for (const k of FLOW_KEYS) {
      try { await del('settings', k) } catch { /* ignore */ }
    }
    Object.assign(settings, {
      theme: 'auto',
      riwayah: 'qaloon',
      fontSize: 'md',
      translationId: null,
      translationVisible: true,
      lineSpacing: 'md',
      wordSpacing: 'md',
      readerMargin: 'md',
      verseSpacing: 'md',
      nightMode: false,
    })
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-pref')
    document.documentElement.removeAttribute('data-night-mode')
    document.documentElement.className = ''
  })

  it('D1: opens with 4 theme swatches, typography row, translation + night-mode switches', async () => {
    await mountAndOpen()

    const sheet = document.querySelector('.qa-sheet--settings')
    expect(sheet).not.toBeNull()

    expect(document.querySelectorAll('.qa-theme-swatch')).toHaveLength(4)
    for (const t of ['light', 'sepia', 'dark', 'auto']) {
      expect(document.querySelector(`.qa-theme-swatch--${t}`)).not.toBeNull()
    }

    expect(sheet!.textContent).toContain('Size, spacing & margins')

    const translationSwitch = sheet!.querySelector('[aria-label="Show translation"]')
    expect(translationSwitch).not.toBeNull()
    expect(sheet!.querySelector('[data-testid="night-mode-switch"]')).not.toBeNull()
  })

  it('D: clear-data row is no longer in Settings sheet (post-redesign)', async () => {
    await mountAndOpen()
    const sheet = document.querySelector('.qa-sheet--settings')!
    expect(sheet.querySelector('.qa-sheet-row--danger')).toBeNull()
  })

  it('D1: Escape on the document closes the sheet', async () => {
    await mountAndOpen()
    expect(document.querySelector('.qa-sheet--settings')).not.toBeNull()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flush()

    expect(document.querySelector('.qa-sheet--settings')).toBeNull()
  })

  it('D1b: Riwayah row exposes 3 swatches; clicking persists to IDB + flips active', async () => {
    await mountAndOpen()
    const swatches = document.querySelectorAll('.qa-riwayah-swatch')
    expect(swatches).toHaveLength(3)
    const labels = [...swatches].map(el => el.textContent ?? '')
    expect(labels.some(l => l.includes('Ḥafṣ'))).toBe(true)
    expect(labels.some(l => l.includes('Warsh'))).toBe(true)
    expect(labels.some(l => l.includes('Qālūn'))).toBe(true)

    const warsh = [...swatches].find(el => el.textContent?.includes('Warsh'))!
    await fireEvent.click(warsh)

    await vi.waitFor(async () => {
      const rec = await get('settings', 'riwayah') as { value: string } | undefined
      expect(rec?.value).toBe('warsh')
    })

    const active = document.querySelector('.qa-riwayah-swatch--active')!
    expect(active.textContent).toContain('Warsh')
  })

  it('D2: Show translation row subtitle visible (≤1 translation = read-only body)', async () => {
    await mountAndOpen()
    const sheet = document.querySelector('.qa-sheet--settings')!
    expect(sheet.textContent).toContain('Show translation')

    const subs = sheet.querySelectorAll('.qa-settings-toggle-sub')
    expect([...subs].some(el => el.textContent === 'English')).toBe(true)

    const translationBody = [...sheet.querySelectorAll('.qa-settings-toggle-body')]
      .find(el => el.textContent?.includes('Show translation'))!
    expect(translationBody.tagName).toBe('DIV')
  })

  it('D2: toggle translation switch → IDB write + rune flip', async () => {
    await mountAndOpen()
    expect(settings.translationVisible).toBe(true)

    const sw = document.querySelector('[aria-label="Show translation"]') as HTMLButtonElement
    await fireEvent.click(sw)

    await vi.waitFor(async () => {
      expect(settings.translationVisible).toBe(false)
      const rec = await get('settings', 'translationVisible') as { value: boolean } | undefined
      expect(rec?.value).toBe(false)
    })

    expect(sw.getAttribute('aria-checked')).toBe('false')
  })

  it('D3: clicking each theme swatch persists the choice + sets data-theme-pref', async () => {
    await mountAndOpen()

    for (const theme of ['light', 'sepia', 'dark', 'auto'] as const) {
      const sw = document.querySelector(`.qa-theme-swatch--${theme}`) as HTMLButtonElement
      expect(sw).not.toBeNull()
      await fireEvent.click(sw)

      await vi.waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme-pref')).toBe(theme)
      })

      const applied = document.documentElement.getAttribute('data-theme')
      expect(['light', 'sepia', 'dark']).toContain(applied)

      expect(sw.classList.contains('qa-theme-swatch--active')).toBe(true)

      await vi.waitFor(async () => {
        const rec = await get('settings', 'theme') as { value: string } | undefined
        expect(rec?.value).toBe(theme)
      })
    }
  })

  it('D5: typography subview exposes Font size + Reading flow only (no legacy 4 sliders)', async () => {
    await mountAndOpen()
    const navBtn = [...document.querySelectorAll('.qa-settings-toggle-body')]
      .find(el => el.textContent?.includes('Size, spacing & margins'))! as HTMLButtonElement
    await fireEvent.click(navBtn)
    await flush()

    expect(document.querySelector('[data-testid="typography-preview"]')).not.toBeNull()
    expect(document.querySelector('label[for="qa-tslider-fs"]')?.textContent).toBe('Font size')
    expect(document.querySelector('label[for="qa-tslider-flow"]')?.textContent).toBe('Reading flow')

    const labels = [...document.querySelectorAll('.qa-typography-slider-label')]
      .map(el => el.textContent)
    expect(labels).toEqual(['Font size', 'Reading flow'])
  })

  it('D5: reset button hidden by default; appears after slider change; click restores defaults', async () => {
    await mountAndOpen()
    const navBtn = [...document.querySelectorAll('.qa-settings-toggle-body')]
      .find(el => el.textContent?.includes('Size, spacing & margins'))! as HTMLButtonElement
    await fireEvent.click(navBtn)
    await flush()

    expect(document.querySelector('[data-testid="typography-reset"]')).toBeNull()

    const flowSlider = document.querySelector('#qa-tslider-flow') as HTMLInputElement
    flowSlider.value = '4'
    flowSlider.dispatchEvent(new Event('input', { bubbles: true }))

    await vi.waitFor(() => {
      expect(settings.lineSpacing).toBe('xl')
    })

    const resetBtn = document.querySelector('[data-testid="typography-reset"]') as HTMLButtonElement
    expect(resetBtn).not.toBeNull()

    await fireEvent.click(resetBtn)

    await vi.waitFor(() => {
      expect(settings.lineSpacing).toBe('md')
      expect(settings.readerMargin).toBe('md')
      expect(document.documentElement.dataset.lineSpacing).toBe('md')
      expect(document.documentElement.dataset.readerMargin).toBe('md')
      expect(document.querySelector('[data-testid="typography-reset"]')).toBeNull()
    })
  })
})
