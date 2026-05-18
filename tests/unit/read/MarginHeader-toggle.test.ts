import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MarginHeader from '../../../src/read/MarginHeader.svelte'
import { reader } from '../../../src/read/state.svelte.ts'
import { settings } from '../../../src/configure/state.svelte.ts'
import { emit } from '../../../src/core/events'
import { Events } from '../../../src/core/constants'

// Real dataset uses `name_ar` (not `arabic`) — see public/dataset/surahs.json.
// Mock here MUST mirror that shape so a regression like the 2026-04-26 bug
// (label silently rendered empty because the component read `meta.arabic`)
// surfaces in this suite.
vi.mock('../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => [
    { n: 2, name: 'Al-Baqarah', name_ar: 'البَقَرَة',
      counts: { hafs: 286, warsh: 285, qaloon: 285 } },
  ]),
}))
vi.mock('../../../src/navigate/nav-drawer-bridge', () => ({
  openNavDrawer: vi.fn(), toggleNavDrawer: vi.fn(),
}))
vi.mock('../../../src/configure/panel-bridge', () => ({
  openSettingsSheet: vi.fn(), toggleTranslation: vi.fn(),
}))
vi.mock('../../../src/configure/theme', () => ({ cycleTheme: vi.fn() }))

async function flush() { for (let i = 0; i < 6; i++) { await Promise.resolve() } }

describe('MarginHeader.svelte — surah label tap toggles surah header visibility', () => {
  beforeEach(() => {
    reader.currentSurahNum = 2
    reader.surahHeaderHidden = false
    settings.surahHeaderHidden = false
    window.location.hash = '#/s/2'
  })

  afterEach(() => {
    vi.useRealTimers()
    reader.currentSurahNum = null
    reader.currentMushafPage = null
    reader.surahHeaderHidden = false
    settings.surahHeaderHidden = false
  })

  it('tap on label flips reader.surahHeaderHidden when on reader route', async () => {
    const { container } = render(MarginHeader)
    await flush()
    const label = container.querySelector('.qa-mh-label') as HTMLElement
    expect(label).not.toBeNull()
    expect(reader.surahHeaderHidden).toBe(false)
    await fireEvent.click(label)
    await flush()
    expect(reader.surahHeaderHidden).toBe(true)
    await fireEvent.click(label)
    await flush()
    expect(reader.surahHeaderHidden).toBe(false)
  })

  it('tap is a no-op off the reader route', async () => {
    window.location.hash = '#/about'
    const { container } = render(MarginHeader)
    await flush()
    const label = container.querySelector('.qa-mh-label') as HTMLElement
    await fireEvent.click(label)
    await flush()
    expect(reader.surahHeaderHidden).toBe(false)
  })

  it('Mushaf page label is not exposed as an inactive button', async () => {
    window.location.hash = '#/m/42'
    reader.currentMushafPage = 42
    const { container } = render(MarginHeader)
    await flush()
    const label = container.querySelector('.qa-mh-label') as HTMLElement

    expect(label.textContent).toContain('Page 42')
    expect(label.getAttribute('role')).toBeNull()
    expect(label.getAttribute('tabindex')).toBeNull()

    await fireEvent.click(label)
    await fireEvent.keyDown(label, { key: 'Enter' })
    await flush()
    expect(reader.surahHeaderHidden).toBe(false)
  })

  it('tap is a no-op when no surah is loaded (wordmark mode)', async () => {
    reader.currentSurahNum = null
    const { container } = render(MarginHeader)
    await flush()
    const label = container.querySelector('.qa-mh-label') as HTMLElement
    await fireEvent.click(label)
    await flush()
    expect(reader.surahHeaderHidden).toBe(false)
  })

  it('does not render mobile chrome on the onboarding route', async () => {
    window.location.hash = '#/onboarding'
    const { container } = render(MarginHeader)
    await flush()
    expect(container.querySelector('.qa-mh')).toBeNull()

    window.location.hash = '#/s/2'
    emit(Events.ROUTER_ROUTE_CHANGE, { hash: '#/s/2' })
    await flush()
    expect(container.querySelector('.qa-mh')).not.toBeNull()
  })

  it('keyboard Enter on focused label toggles visibility', async () => {
    const { container } = render(MarginHeader)
    await flush()
    const label = container.querySelector('.qa-mh-label') as HTMLElement
    await fireEvent.keyDown(label, { key: 'Enter' })
    await flush()
    expect(reader.surahHeaderHidden).toBe(true)
  })

  it('label drops the English line and only renders Arabic', async () => {
    const { container } = render(MarginHeader)
    await flush()
    expect(container.querySelector('.qa-mh-label-ar')).not.toBeNull()
    expect(container.querySelector('.qa-mh-label-en')).toBeNull()
  })

  it('Arabic label text comes from the dataset name_ar field (regression: label was empty when component read .arabic)', async () => {
    const { container } = render(MarginHeader)
    await flush()
    const ar = container.querySelector('.qa-mh-label-ar')
    expect(ar?.textContent?.trim()).toBe('البَقَرَة')
  })

  it('opens Verse Settings from the gear on verse routes', async () => {
    vi.useFakeTimers()
    const panel = await import('../../../src/configure/panel-bridge')
    const { container } = render(MarginHeader)
    await flush()
    await fireEvent.click(container.querySelector('.qa-mh-settings') as HTMLElement)
    await vi.advanceTimersByTimeAsync(301)
    expect(panel.openSettingsSheet).toHaveBeenCalledWith('verse')
  })

  it('opens Mushaf Settings from the gear on Mushaf routes', async () => {
    vi.useFakeTimers()
    window.location.hash = '#/m/42'
    reader.currentMushafPage = 42
    const panel = await import('../../../src/configure/panel-bridge')
    const { container } = render(MarginHeader)
    await flush()
    await fireEvent.click(container.querySelector('.qa-mh-settings') as HTMLElement)
    await vi.advanceTimersByTimeAsync(301)
    expect(panel.openSettingsSheet).toHaveBeenCalledWith('mushaf')
  })

  it('swipe-left on label navigates next surah and does NOT toggle visibility (regression guard)', async () => {
    const { container } = render(MarginHeader)
    await flush()
    const label = container.querySelector('.qa-mh-label') as HTMLElement
    // Synthesise a horizontal swipe-left: x moves -100px in 200ms (well past
    // classifySwipe's distance + velocity thresholds).
    await fireEvent.touchStart(label, { touches: [{ clientX: 200, clientY: 100 } as Touch] })
    await new Promise((r) => setTimeout(r, 50))
    await fireEvent.touchEnd(label, { changedTouches: [{ clientX: 80, clientY: 100 } as Touch] })
    await flush()
    expect(reader.surahHeaderHidden).toBe(false)
    expect(window.location.hash).toBe('#/s/3')
  })
})
