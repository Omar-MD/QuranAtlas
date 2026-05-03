/**
 * Component tests for Panel.svelte — covers the 2026-04-29 v7 redesign:
 *
 *   D1:   Sheet structure — preview band (no header bar), Reading + Sources
 *         sections, theme footer with swatches + night moon, ✕ inside preview.
 *   D1:   Escape closes the sheet (also closes any open picker first).
 *   D:    Clear-data row not in sheet.
 *   D2:   Translation toggle in dual-action row (Translation row inside Sources).
 *   D2:   Translation chevron disabled when ≤1 translation; popover does not open.
 *   D3:   Theme swatches in footer pill — 4 swatches, click writes setTheme.
 *   D3:   Night moon toggle — click writes nightMode.
 *   D5:   Sliders inline (no subview); reset link appears on change + restores.
 *   D6:   Live preview present + theme-true (uses var(--qa-surface-raised));
 *         translation line gated on translationVisible rune.
 *   D7:   Recitation popover — tap source row opens, riwayah click writes IDB,
 *         popover closes; tap scrim closes.
 *   D8:   Picker popover dismiss — Escape closes picker first then sheet on
 *         second press.
 */

import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, beforeEach, vi } from 'vitest'

let translationOptions = [
  { id: 'bridges', name: 'Bridges', subtitle: 'Baseline' },
]

vi.mock('../../../src/data/dataset.js', () => ({
  getTranslations: vi.fn(async () => translationOptions),
  getTafsirs: vi.fn(async () => [
    { id: 'muyassar', name: 'Tafsir Muyassar' },
    { id: 'mukhtasar', name: 'Al-Mukhtasar fi al-Tafsir' },
  ]),
}))
vi.mock('../../../src/data/dataset.ts', () => ({
  getTranslations: vi.fn(async () => translationOptions),
  getTafsirs: vi.fn(async () => [
    { id: 'muyassar', name: 'Tafsir Muyassar' },
    { id: 'mukhtasar', name: 'Al-Mukhtasar fi al-Tafsir' },
  ]),
}))
vi.mock('../../../src/infra/safety/sync.ts', () => ({
  broadcastRiwayahChange: vi.fn(),
  suppressNextVersionChange: vi.fn(),
}))
vi.mock('../../../src/a11y/announcer.js', () => ({ announce: vi.fn() }))

import Panel from '../../../src/configure/Panel.svelte'
import { openSettingsSheet, closeSettingsSheet } from '../../../src/configure/panel-bridge.ts'
import { del, get, openDB } from '../../../src/core/db.js'
import { settings } from '../../../src/configure/state.svelte.ts'

const FLOW_KEYS = ['theme', 'translationVisible', 'translationId', 'tafsirId', 'riwayah', 'fontSize',
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

describe('Panel.svelte (2026-04-29 v7 redesign)', () => {
  beforeEach(async () => {
    await openDB()
    translationOptions = [
      { id: 'bridges', name: 'Bridges', subtitle: 'Baseline' },
    ]
    for (const k of FLOW_KEYS) {
      try { await del('settings', k) } catch { /* ignore */ }
    }
    Object.assign(settings, {
      theme: 'auto',
      riwayah: 'qaloon',
      fontSize: 'md',
      translationId: 'bridges',
      tafsirId: 'muyassar',
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

  it('D1: opens with preview band, Reading + Sources sections, theme footer', async () => {
    await mountAndOpen()

    const sheet = document.querySelector('.qa-sheet--settings-fs')
    expect(sheet).not.toBeNull()

    // Preview band — no separate header bar
    expect(document.querySelector('[data-testid="settings-preview"]')).not.toBeNull()

    // ✕ inside preview, not separate header
    const preview = document.querySelector('.qa-settings-preview')!
    expect(preview.querySelector('.qa-settings-close')).not.toBeNull()

    // No standalone settings title element
    expect(document.querySelector('.qa-settings-title')).toBeNull()

    // Three body sections in order: Reading, Sources, Storage (Storage added N21)
    const sectionNames = [...document.querySelectorAll('.qa-settings-sect-name')]
      .map(el => el.textContent)
    expect(sectionNames).toEqual(['Reading', 'Sources', 'Storage'])

    // Theme footer present with 4 swatches + night moon
    const footer = document.querySelector('.qa-settings-footer')!
    expect(footer).not.toBeNull()
    expect(footer.querySelectorAll('.qa-settings-tf-dot')).toHaveLength(4)
    expect(footer.querySelector('[data-testid="night-mode-switch"]')).not.toBeNull()
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

  it('D7: tapping Recitation row opens popover; clicking a swatch writes IDB + closes', async () => {
    await mountAndOpen()
    expect(document.querySelector('[data-testid="settings-pop"]')).toBeNull()

    const row = document.querySelector('[data-testid="src-row-recitation"]') as HTMLButtonElement
    expect(row).not.toBeNull()
    await fireEvent.click(row)
    await flush()

    const pop = document.querySelector('[data-testid="settings-pop"]')!
    expect(pop).not.toBeNull()
    expect(pop.getAttribute('aria-label')).toBe('Choose Recitation')

    const rows = pop.querySelectorAll('.qa-settings-pop-row')
    expect(rows).toHaveLength(3)

    const warsh = [...rows].find(el => el.textContent?.includes('Warsh')) as HTMLButtonElement
    await fireEvent.click(warsh)

    await vi.waitFor(async () => {
      const rec = await get('settings', 'riwayah') as { value: string } | undefined
      expect(rec?.value).toBe('warsh')
      expect(document.querySelector('[data-testid="settings-pop"]')).toBeNull()
    })
  })

  it('D7: tapping scrim closes the popover without writing', async () => {
    await mountAndOpen()
    const row = document.querySelector('[data-testid="src-row-recitation"]') as HTMLButtonElement
    await fireEvent.click(row)
    await flush()
    expect(document.querySelector('[data-testid="settings-pop"]')).not.toBeNull()

    const scrim = document.querySelector('.qa-settings-pop-scrim') as HTMLElement
    await fireEvent.click(scrim)
    await flush()

    expect(document.querySelector('[data-testid="settings-pop"]')).toBeNull()
    // Riwayah unchanged
    expect(settings.riwayah).toBe('qaloon')
  })

  it('D8: Escape with picker open closes picker first, sheet stays open', async () => {
    await mountAndOpen()
    const row = document.querySelector('[data-testid="src-row-recitation"]') as HTMLButtonElement
    await fireEvent.click(row)
    await flush()
    expect(document.querySelector('[data-testid="settings-pop"]')).not.toBeNull()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flush()

    expect(document.querySelector('[data-testid="settings-pop"]')).toBeNull()
    expect(document.querySelector('.qa-sheet--settings-fs')).not.toBeNull()

    // Second Escape closes the sheet
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flush()
    expect(document.querySelector('.qa-sheet--settings-fs')).toBeNull()
  })

  it('D2: Translation row appears in Sources with toggle + chev', async () => {
    await mountAndOpen()
    const transRow = document.querySelector('.qa-settings-trans-row')!
    expect(transRow).not.toBeNull()
    expect(transRow.textContent).toContain('Translation')
    expect(transRow.querySelector('[aria-label="Show translation"]')).not.toBeNull()
    expect(transRow.querySelector('.qa-settings-trans-chev')).not.toBeNull()
  })

  it('D2: Tafsir row appears in Sources and opens its source picker', async () => {
    await mountAndOpen()
    const tafsirRow = document.querySelector('[data-testid="src-row-tafsir"]') as HTMLButtonElement
    expect(tafsirRow).not.toBeNull()
    await vi.waitFor(() => {
      expect(tafsirRow.textContent).toContain('Tafsir')
      expect(tafsirRow.textContent).toContain('Tafsir Muyassar')
    })

    await fireEvent.click(tafsirRow)
    await vi.waitFor(() => {
      const pop = document.querySelector('[data-testid="settings-pop"]')
      expect(pop).not.toBeNull()
      expect(pop?.getAttribute('aria-label')).toBe('Choose Tafsir')
      expect(pop?.textContent).toContain('Al-Mukhtasar fi al-Tafsir')
    })
  })

  it('D2: chevron is disabled when only 1 translation; click does not open popover', async () => {
    await mountAndOpen()
    const chev = document.querySelector('.qa-settings-trans-chev') as HTMLButtonElement
    expect(chev.disabled).toBe(true)
    await fireEvent.click(chev)
    await flush()
    expect(document.querySelector('[data-testid="settings-pop"]')).toBeNull()
  })

  it('D2: choosing a translation updates the source row label and persists the selection', async () => {
    translationOptions = [
      { id: 'bridges', name: 'Bridges', subtitle: 'Baseline' },
      { id: 'clear-quran', name: 'The Clear Quran', subtitle: 'Mustafa Khattab' },
    ]
    await mountAndOpen()

    const row = document.querySelector('[data-testid="src-row-translation"]') as HTMLButtonElement
    await vi.waitFor(() => {
      expect(row.textContent).toContain('Bridges')
    })

    await fireEvent.click(row)
    await vi.waitFor(() => {
      const pop = document.querySelector('[data-testid="settings-pop"]')
      expect(pop?.getAttribute('aria-label')).toBe('Choose Translation')
    })

    const clear = [...document.querySelectorAll('.qa-settings-pop-row')]
      .find(el => el.textContent?.includes('The Clear Quran')) as HTMLButtonElement
    await fireEvent.click(clear)

    await vi.waitFor(async () => {
      expect(document.querySelector('[data-testid="settings-pop"]')).toBeNull()
      expect(row.textContent).toContain('The Clear Quran')
      const rec = await get('settings', 'translationId') as { value: string } | undefined
      expect(rec?.value).toBe('clear-quran')
    })
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

  it('D3: theme footer pill has 4 swatches; clicking each persists', async () => {
    await mountAndOpen()
    const dots = document.querySelectorAll('.qa-settings-tf-dot')
    expect(dots).toHaveLength(4)
    for (const t of ['light', 'sepia', 'dark', 'auto']) {
      expect(document.querySelector(`.qa-settings-tf-dot--${t}`)).not.toBeNull()
    }

    for (const theme of ['light', 'sepia', 'dark', 'auto'] as const) {
      const sw = document.querySelector(`.qa-settings-tf-dot--${theme}`) as HTMLButtonElement
      await fireEvent.click(sw)

      await vi.waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme-pref')).toBe(theme)
      })

      expect(sw.classList.contains('qa-settings-tf-dot--act')).toBe(true)

      await vi.waitFor(async () => {
        const rec = await get('settings', 'theme') as { value: string } | undefined
        expect(rec?.value).toBe(theme)
      })
    }
  })

  it('D3: night moon click toggles night mode', async () => {
    await mountAndOpen()
    const moon = document.querySelector('[data-testid="night-mode-switch"]') as HTMLButtonElement
    expect(moon).not.toBeNull()
    expect(moon.getAttribute('aria-checked')).toBe('false')

    await fireEvent.click(moon)

    await vi.waitFor(() => {
      expect(settings.nightMode).toBe(true)
      expect(document.documentElement.getAttribute('data-night-mode')).toBe('on')
      expect(moon.classList.contains('qa-settings-tf-night--on')).toBe(true)
    })
  })

  it('D5: font slider directly reachable; writes fontSize + flips data-font-size', async () => {
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

    const labels = [...document.querySelectorAll('.qa-settings-slider-label')]
      .map(el => el.textContent)
    expect(labels).toEqual(['Font size', 'Reading flow'])
  })

  it('D5: reset button always rendered (disabled idle at default); enables on slider change; click restores defaults', async () => {
    await mountAndOpen()

    // Always rendered now (no layout shift when sliders move). At default
    // it is disabled + carries the --idle modifier.
    const initialBtn = document.querySelector('[data-testid="typography-reset"]') as HTMLButtonElement
    expect(initialBtn).not.toBeNull()
    expect(initialBtn.disabled).toBe(true)
    expect(initialBtn.classList.contains('qa-settings-reset--idle')).toBe(true)

    const flowSlider = document.querySelector('#qa-tslider-flow') as HTMLInputElement
    flowSlider.value = '4'
    flowSlider.dispatchEvent(new Event('input', { bubbles: true }))

    await vi.waitFor(() => {
      expect(settings.lineSpacing).toBe('xl')
    })

    const resetBtn = document.querySelector('[data-testid="typography-reset"]') as HTMLButtonElement
    expect(resetBtn.disabled).toBe(false)
    expect(resetBtn.classList.contains('qa-settings-reset--idle')).toBe(false)

    await fireEvent.click(resetBtn)

    await vi.waitFor(() => {
      expect(settings.lineSpacing).toBe('md')
      expect(settings.readerMargin).toBe('md')
      expect(document.documentElement.dataset.lineSpacing).toBe('md')
      expect(document.documentElement.dataset.readerMargin).toBe('md')
      const after = document.querySelector('[data-testid="typography-reset"]') as HTMLButtonElement
      expect(after.disabled).toBe(true)
      expect(after.classList.contains('qa-settings-reset--idle')).toBe(true)
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

    // Toggle off → translation row stays in DOM (reserves layout space) but
    // is marked hidden so preview height does not shift on toggle.
    const sw = document.querySelector('[aria-label="Show translation"]') as HTMLButtonElement
    await fireEvent.click(sw)
    await vi.waitFor(() => {
      const tr = preview.querySelector('.qa-settings-preview-tr')
      expect(tr).not.toBeNull()
      expect(tr?.classList.contains('qa-settings-preview-tr--hidden')).toBe(true)
      expect(tr?.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('D7: switching riwayah via popover swaps preview glyphs', async () => {
    await mountAndOpen()

    const row = document.querySelector('[data-testid="src-row-recitation"]') as HTMLButtonElement
    await fireEvent.click(row)
    await flush()

    const pop = document.querySelector('[data-testid="settings-pop"]')!
    const hafs = [...pop.querySelectorAll('.qa-settings-pop-row')]
      .find(el => el.textContent?.includes('Ḥafṣ')) as HTMLButtonElement
    await fireEvent.click(hafs)

    await vi.waitFor(() => {
      const ar = document.querySelector('.qa-settings-preview-ar')!
      expect(ar.textContent).toContain('ٱلرَّحۡمَٰنُ')
    })
  })

  it('D7: re-opening sheet resets picker state', async () => {
    await mountAndOpen()
    const row = document.querySelector('[data-testid="src-row-recitation"]') as HTMLButtonElement
    await fireEvent.click(row)
    await flush()
    expect(document.querySelector('[data-testid="settings-pop"]')).not.toBeNull()

    closeSettingsSheet()
    await flush()
    openSettingsSheet()
    await flush()
    await Promise.resolve()

    expect(document.querySelector('[data-testid="settings-pop"]')).toBeNull()
  })

})
