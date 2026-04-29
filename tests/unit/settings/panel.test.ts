/**
 * Component tests for Panel.svelte — covers the 2026-04-29 full-screen redesign:
 *
 *   D1:   Settings sheet structure — header, sticky preview, 3 sections in
 *         order (Reading · Appearance · Recitation), 4 theme swatches,
 *         translation toggle, night-mode switch.
 *   D1:   Escape closes the sheet.
 *   D:    Clear-data row not in sheet (post-redesign).
 *   D1b:  Recitation collapsed by default; tap expands; 3 riwayah swatches
 *         appear; clicking one persists to IDB + flips active.
 *   D2:   Show translation row subtitle visible; toggle writes IDB + flips rune.
 *   D3:   Each theme swatch click → setTheme runs + active class flips.
 *   D5:   Font-size + Reading-flow sliders reachable directly (no subview tap).
 *         Reset button hidden by default; appears on slider change; click restores defaults.
 *   D6:   Sticky live preview present; reflects current riwayah glyphs;
 *         translation line gated on translationVisible.
 *   D7:   Translation picker subview never mounts when only 1 translation
 *         is shipped (stub view fully removed).
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
import { openSettingsSheet, closeSettingsSheet } from '../../../src/settings/panel-bridge.ts'
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

async function expandRecitation() {
  const row = document.querySelector('.qa-settings-recite-row') as HTMLButtonElement
  await fireEvent.click(row)
  await flush()
}

describe('Panel.svelte (2026-04-29 full-screen redesign)', () => {
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

  it('D1: opens with header, sticky preview, 3 sections in order, 4 theme swatches', async () => {
    await mountAndOpen()

    const sheet = document.querySelector('.qa-sheet--settings-fs')
    expect(sheet).not.toBeNull()

    expect(document.querySelector('.qa-settings-title')?.textContent).toBe('Settings')
    expect(document.querySelector('[data-testid="settings-preview"]')).not.toBeNull()

    const sectionNames = [...document.querySelectorAll('.qa-settings-sect-name')]
      .map(el => el.textContent)
    expect(sectionNames).toEqual(['Reading', 'Appearance', 'Recitation'])

    expect(document.querySelectorAll('.qa-theme-swatch')).toHaveLength(4)
    for (const t of ['light', 'sepia', 'dark', 'auto']) {
      expect(document.querySelector(`.qa-theme-swatch--${t}`)).not.toBeNull()
    }

    const translationSwitch = sheet!.querySelector('[aria-label="Show translation"]')
    expect(translationSwitch).not.toBeNull()
    expect(sheet!.querySelector('[data-testid="night-mode-switch"]')).not.toBeNull()
  })

  it('D: clear-data row is not in the Settings sheet', async () => {
    await mountAndOpen()
    const sheet = document.querySelector('.qa-sheet--settings-fs')!
    expect(sheet.querySelector('.qa-sheet-row--danger')).toBeNull()
    expect(sheet.textContent).not.toMatch(/clear.*data/i)
  })

  it('D1: Escape on the document closes the sheet', async () => {
    await mountAndOpen()
    expect(document.querySelector('.qa-sheet--settings-fs')).not.toBeNull()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flush()

    expect(document.querySelector('.qa-sheet--settings-fs')).toBeNull()
  })

  it('D1b: Recitation collapsed by default; tap expands; swatches appear', async () => {
    await mountAndOpen()
    const row = document.querySelector('.qa-settings-recite-row') as HTMLButtonElement
    expect(row).not.toBeNull()
    expect(row.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelectorAll('.qa-riwayah-swatch')).toHaveLength(0)

    await fireEvent.click(row)
    await flush()

    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelectorAll('.qa-riwayah-swatch')).toHaveLength(3)
  })

  it('D1b: clicking a riwayah swatch persists to IDB + flips active', async () => {
    await mountAndOpen()
    await expandRecitation()

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

  it('D1b: closing + reopening collapses Recitation back to default', async () => {
    await mountAndOpen()
    await expandRecitation()
    expect(document.querySelectorAll('.qa-riwayah-swatch')).toHaveLength(3)

    closeSettingsSheet()
    await flush()
    openSettingsSheet()
    await flush()
    await Promise.resolve()
    await Promise.resolve()

    const row = document.querySelector('.qa-settings-recite-row') as HTMLButtonElement
    expect(row.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelectorAll('.qa-riwayah-swatch')).toHaveLength(0)
  })

  it('D2: Show translation row subtitle visible (≤1 translation = read-only body)', async () => {
    await mountAndOpen()
    const sheet = document.querySelector('.qa-sheet--settings-fs')!
    expect(sheet.textContent).toContain('Show translation')

    const subs = sheet.querySelectorAll('.qa-settings-toggle-sub')
    expect([...subs].some(el => el.textContent === 'English')).toBe(true)
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

  it('D5: font slider reachable directly (no subview); writes fontSize + flips data-font-size', async () => {
    await mountAndOpen()

    const fontSlider = document.querySelector('#qa-tslider-fs') as HTMLInputElement
    expect(fontSlider).not.toBeNull()

    fontSlider.value = '4'
    fontSlider.dispatchEvent(new Event('input', { bubbles: true }))

    await vi.waitFor(() => {
      expect(settings.fontSize).toBe('xl')
      expect(document.documentElement.getAttribute('data-font-size')).toBe('xl')
    })
    const stored = await get('settings', 'fontSize') as { value: string } | undefined
    expect(stored?.value).toBe('xl')
  })

  it('D5: Font size + Reading flow sliders both reachable directly', async () => {
    await mountAndOpen()

    expect(document.querySelector('#qa-tslider-fs')).not.toBeNull()
    expect(document.querySelector('#qa-tslider-flow')).not.toBeNull()

    expect(document.querySelector('label[for="qa-tslider-fs"]')?.textContent).toBe('Font size')
    expect(document.querySelector('label[for="qa-tslider-flow"]')?.textContent).toBe('Reading flow')

    const labels = [...document.querySelectorAll('.qa-settings-slider-label')]
      .map(el => el.textContent)
    expect(labels).toEqual(['Font size', 'Reading flow'])
  })

  it('D5: reset button hidden by default; appears after slider change; click restores defaults', async () => {
    await mountAndOpen()

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

  it('D6: live preview present; shows current-riwayah Arabic; translation gated on rune', async () => {
    await mountAndOpen()
    const preview = document.querySelector('[data-testid="settings-preview"]')!
    expect(preview).not.toBeNull()

    const ar = preview.querySelector('.qa-settings-preview-ar')!
    // Qālūn corpus glyphs (default test setup)
    expect(ar.textContent).toContain('اِ۬لرَّحْمَٰنُ')
    expect(preview.querySelector('.qa-settings-preview-tr')?.textContent)
      .toContain('The Most Gracious')

    // Toggle off → translation line disappears
    const sw = document.querySelector('[aria-label="Show translation"]') as HTMLButtonElement
    await fireEvent.click(sw)
    await vi.waitFor(() => {
      expect(preview.querySelector('.qa-settings-preview-tr')).toBeNull()
    })
  })

  it('D6: switching riwayah inside Recitation swaps preview glyphs', async () => {
    await mountAndOpen()
    await expandRecitation()

    const hafs = [...document.querySelectorAll('.qa-riwayah-swatch')]
      .find(el => el.textContent?.includes('Ḥafṣ'))!
    await fireEvent.click(hafs)

    await vi.waitFor(() => {
      const ar = document.querySelector('.qa-settings-preview-ar')!
      // Hafs corpus uses U+06E1/U+0670 (small ḥā', superscript alif)
      expect(ar.textContent).toContain('ٱلرَّحۡمَٰنُ')
    })
  })

  it('D7: translation picker view does not mount (stub fully removed)', async () => {
    await mountAndOpen()
    expect(document.querySelector('.qa-settings-trans-choice')).toBeNull()
    // No back-to-main affordance survives — single view only.
    expect(document.querySelector('.qa-sheet-back')).toBeNull()
  })

})
