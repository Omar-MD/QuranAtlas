import { render } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AmbientDock from '../../../src/read/AmbientDock.svelte'

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}))

vi.mock('../../../src/core/db', () => ({
  get: getMock,
}))
vi.mock('../../../src/configure/panel-bridge', () => ({
  openSettingsSheet: vi.fn(),
}))
vi.mock('../../../src/navigate/nav-drawer-bridge', () => ({
  openNavDrawer: vi.fn(),
}))

async function flush() {
  for (let i = 0; i < 8; i++) { await Promise.resolve() }
}

describe('AmbientDock.svelte', () => {
  beforeEach(() => {
    document.body.innerHTML = '<footer id="bottom-nav"></footer>'
    getMock.mockReset()
    getMock.mockResolvedValue({ value: '#/s/1' })
    window.location.hash = '#/s/2/255'
  })

  it('does not let stale lastSurface overwrite the current verse route', async () => {
    render(AmbientDock)
    await flush()

    expect(document.querySelector('[data-tab="verse"]')?.getAttribute('href')).toBe('#/s/2/255')
  })

  it('returns from Mushaf to the latest observed verse route', async () => {
    render(AmbientDock)
    await flush()

    window.location.hash = '#/m/42'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await flush()

    expect(document.querySelector('[data-tab="mushaf"]')?.getAttribute('href')).toBe('#/m/42')
    expect(document.querySelector('[data-tab="verse"]')?.getAttribute('href')).toBe('#/s/2/255')
  })

  it('keeps the desktop rail scoped to verse, mushaf, settings, and more', async () => {
    render(AmbientDock)
    await flush()

    const tabs = [...document.querySelectorAll('[data-tab]')].map((el) => el.getAttribute('data-tab'))
    expect(tabs).toEqual(['verse', 'mushaf', 'settings', 'more'])
    expect(document.querySelector('[aria-label="Search"]')).toBeNull()
  })
})
