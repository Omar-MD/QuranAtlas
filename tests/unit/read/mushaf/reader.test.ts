import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mushafMocks = vi.hoisted(() => {
  class MushafPackUnavailableError extends Error {
    code = 'MUSHAF_PACK_UNAVAILABLE' as const

    constructor(public riwayah: 'hafs' | 'warsh' | 'qaloon') {
      super(`Mushaf page pack is not available for ${riwayah}`)
      this.name = 'MushafPackUnavailableError'
    }
  }

  return {
    MushafPackUnavailableError,
    resolveMushafPage: vi.fn(),
    loadMushafManifest: vi.fn(),
  }
})

const datasetMocks = vi.hoisted(() => {
  class RiwayahPackUnavailableError extends Error {
    code = 'RIWAYAH_PACK_UNAVAILABLE' as const

    constructor(public riwayah: 'hafs' | 'warsh' | 'qaloon') {
      super(`Text pack is not available for ${riwayah}`)
      this.name = 'RiwayahPackUnavailableError'
    }
  }

  return {
    RiwayahPackUnavailableError,
    getSurah: vi.fn(),
    getSurahs: vi.fn(),
    loadTranslationForSurah: vi.fn(),
  }
})

vi.mock('../../../../src/data/mushaf-pages', () => ({
  MushafPackUnavailableError: mushafMocks.MushafPackUnavailableError,
  resolveMushafPage: mushafMocks.resolveMushafPage,
  loadMushafManifest: mushafMocks.loadMushafManifest,
}))

vi.mock('../../../../src/data/dataset', () => ({
  RiwayahPackUnavailableError: datasetMocks.RiwayahPackUnavailableError,
  getSurah: datasetMocks.getSurah,
  getSurahs: datasetMocks.getSurahs,
  loadTranslationForSurah: datasetMocks.loadTranslationForSurah,
}))

vi.mock('../../../../src/read/position', () => ({
  savePosition: vi.fn(async () => {}),
  initPositionTracking: vi.fn(() => []),
  teardownPositionTracking: vi.fn(),
}))

function pad3(value: number): string {
  return String(value).padStart(3, '0')
}

function makeResolvedPage(riwayah: string, page: number) {
  const safePage = Math.min(604, Math.max(1, page))
  return {
    page: safePage,
    pageCount: 604,
    riwayahLabel: riwayah === 'qaloon' ? 'Qālūn ʿan Nāfiʿ' : riwayah,
    assetPath: `pages/${pad3(safePage)}.svg`,
    assetUrl: `/dataset/mushaf-pages/${riwayah}/pages/${pad3(safePage)}.svg`,
    viewBox: { minX: 0, minY: 0, width: 900, height: 1379.25 },
    viewBoxText: '0 0 900 1379.25',
    bytes: 1,
    firstVerse: { surah: safePage === 604 ? 114 : 2, verse: safePage === 604 ? 1 : 255 },
    sourcePdfUrl: `https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-${safePage}.pdf`,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}

function pageSvg(viewBox = '0 0 900 1379.25'): string {
  return `<svg viewBox="${viewBox}"><path d="M0 0" fill="var(--qa-mushaf-ink)"/></svg>`
}

function responseText(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response
}

describe('MushafReader', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<main id="main-content"></main>'
    window.history.replaceState(null, '', '#/s/1')
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn(async () => responseText(pageSvg())))

    mushafMocks.resolveMushafPage.mockImplementation(async ({ riwayah, page }) => makeResolvedPage(riwayah, page))
    mushafMocks.loadMushafManifest.mockImplementation(async (riwayah: string) => ({
      version: 1,
      riwayah,
      sourceSlug: riwayah === 'qaloon' ? 'qalun' : riwayah,
      pageCount: 604,
      attribution: { provider: 'quran.ws', sourceUrl: 'https://pdf.quran.ws/' },
      verseToPage: { '2:255': 42 },
      pages: [
        {
          page: 42,
          assetPath: 'pages/042.svg',
          viewBox: '0 0 900 1379.25',
          bytes: 1,
          sourcePdfUrl: 'https://pdf.quran.ws/pdfs/qalun/page/quran-qalun-page-42.pdf',
          firstVerse: { surah: 2, verse: 255 },
        },
      ],
    }))
    datasetMocks.getSurah.mockRejectedValue(new datasetMocks.RiwayahPackUnavailableError('hafs'))
    datasetMocks.getSurahs.mockResolvedValue([])
    datasetMocks.loadTranslationForSurah.mockResolvedValue(null)

    const { settings } = await import('../../../../src/configure/state.svelte')
    const { reader } = await import('../../../../src/read/state.svelte')
    settings.riwayah = 'qaloon'
    settings.currentPosition = { surah: 2, verse: 255 }
    reader.readerMode = 'verse'
    reader.currentMushafPage = null
  })

  afterEach(async () => {
    const router = await import('../../../../src/core/router')
    router.clearRoutes()
  })

  it('reloads the rendered page when the page prop changes', async () => {
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')
    const view = render(MushafReader, { props: { page: '1' } })

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Mushaf page 1/ })).toHaveAttribute('data-page', '1')
    })
    expect(document.querySelector('.qa-mushaf-page-img')).toBeNull()

    await view.rerender({ page: '2' })

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Mushaf page 2/ })).toHaveAttribute('data-page', '2')
    })
  })

  it('reloads the active page when the active riwayah changes', async () => {
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')
    const { settings } = await import('../../../../src/configure/state.svelte')
    const { emit } = await import('../../../../src/core/events')
    const { Events } = await import('../../../../src/core/constants')

    render(MushafReader, { props: { page: '1' } })

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Mushaf page 1/ })).toHaveAccessibleName(/Qālūn/)
    })

    settings.riwayah = 'hafs'
    emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: 'qaloon', to: 'hafs' })

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Mushaf page 1/ })).toHaveAccessibleName(/hafs/)
    })
  })

  it('renders a missing active-riwayah page pack prompt without falling back to Qaloon', async () => {
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')
    const { settings } = await import('../../../../src/configure/state.svelte')
    settings.riwayah = 'warsh'
    mushafMocks.resolveMushafPage.mockRejectedValue(new mushafMocks.MushafPackUnavailableError('warsh'))

    render(MushafReader, { props: { page: '1' } })

    await waitFor(() => {
      expect(screen.getByText('warsh pages are not installed yet.')).toBeInTheDocument()
    })
    expect(screen.queryByRole('img')).toBeNull()
    expect(mushafMocks.resolveMushafPage).toHaveBeenCalledWith({ riwayah: 'warsh', page: 1 })
  })

  it('renders page 2 when navigating through the current router from page 1', async () => {
    const router = await import('../../../../src/core/router')
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')
    const target = document.getElementById('main-content')!
    let mounted: Record<string, unknown> | null = null

    router.clearRoutes()
    router.onRouteChange((Component, params) => {
      if (mounted) {
        void unmount(mounted)
        mounted = null
      }
      if (Component) {
        mounted = mount(Component as never, { target, props: params })
      }
    })
    router.register('#/m/:page', async () => MushafReader)

    router.navigate('#/m/1')
    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Mushaf page 1/ })).toHaveAttribute('data-page', '1')
    })

    router.navigate('#/m/2')
    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Mushaf page 2/ })).toHaveAttribute('data-page', '2')
    })

    if (mounted) await unmount(mounted)
  })

  it('canonicalizes out-of-range pages through router navigation and persists the canonical hash', async () => {
    const router = await import('../../../../src/core/router')
    const db = await import('../../../../src/core/db')
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')
    const navigateSpy = vi.spyOn(router, 'navigate')
    const target = document.getElementById('main-content')!
    let mounted: Record<string, unknown> | null = null

    router.clearRoutes()
    router.onRouteChange((Component, params) => {
      if (mounted) {
        void unmount(mounted)
        mounted = null
      }
      if (Component) {
        mounted = mount(Component as never, { target, props: params })
      }
    })
    router.register('#/m/:page', async () => MushafReader)

    router.navigate('#/m/999')

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith('#/m/604', { replace: true })
      expect(window.location.hash).toBe('#/m/604')
    })
    await waitFor(async () => {
      await expect(db.get('settings', 'lastSurface')).resolves.toMatchObject({ value: '#/m/604' })
    })

    if (mounted) await unmount(mounted)
  })

  it('does not canonicalize stale page loads after unmount', async () => {
    const router = await import('../../../../src/core/router')
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')
    const navigateSpy = vi.spyOn(router, 'navigate')
    const pending = deferred<ReturnType<typeof makeResolvedPage>>()
    mushafMocks.resolveMushafPage.mockReturnValueOnce(pending.promise)

    const view = render(MushafReader, { props: { page: '999' } })
    view.unmount()
    pending.resolve(makeResolvedPage('qaloon', 604))
    await flush()

    expect(navigateSpy).not.toHaveBeenCalledWith('#/m/604', { replace: true })
  })

  it('renders an asset error when the fetched inline SVG viewBox mismatches the manifest', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => responseText(pageSvg('0 0 100 100'))))
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')

    render(MushafReader, { props: { page: '1' } })

    await waitFor(() => {
      expect(screen.getByText(/viewBox does not match/)).toBeInTheDocument()
    })
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('uses inline SVG instead of img in the ready path', async () => {
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')

    render(MushafReader, { props: { page: '1' } })

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Mushaf page 1/ })).toBeInTheDocument()
    })
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('.qa-mushaf-svg')).not.toBeNull()
    expect(document.querySelector('.qa-mushaf-svg path[tabindex]')).toBeNull()
  })

  it('maps overlay edge zones to physical Mushaf page actions', async () => {
    const router = await import('../../../../src/core/router')
    const navigateSpy = vi.spyOn(router, 'navigate')
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')

    const view = render(MushafReader, { props: { page: '1' } })
    await waitFor(() => expect(screen.getByRole('img', { name: /Mushaf page 1/ })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Return to previous Mushaf page' })).toBeDisabled()
    await fireEvent.click(screen.getByRole('button', { name: 'Advance Mushaf page' }))
    expect(navigateSpy).toHaveBeenCalledWith('#/m/2')

    await view.rerender({ page: '2' })
    await waitFor(() => expect(screen.getByRole('img', { name: /Mushaf page 2/ })).toBeInTheDocument())
    await fireEvent.click(screen.getByRole('button', { name: 'Return to previous Mushaf page' }))
    expect(navigateSpy).toHaveBeenCalledWith('#/m/1')
  })

  it('opens, clamps, commits, cancels, and restores focus for the page chip', async () => {
    const router = await import('../../../../src/core/router')
    const navigateSpy = vi.spyOn(router, 'navigate')
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')

    render(MushafReader, { props: { page: '2' } })
    await waitFor(() => expect(screen.getByRole('img', { name: /Mushaf page 2/ })).toBeInTheDocument())

    const chip = screen.getByRole('button', { name: /Jump from Mushaf page 2/ })
    await fireEvent.keyDown(chip, { key: 'Enter' })
    const input = screen.getByRole('spinbutton', { name: 'Mushaf page number' })
    await fireEvent.input(input, { target: { value: '999' } })
    await fireEvent.keyDown(input, { key: 'Enter' })
    expect(navigateSpy).toHaveBeenCalledWith('#/m/604')

    await fireEvent.click(chip)
    expect(screen.queryByRole('button', { name: 'Advance Mushaf page' })).toBeNull()
    const cancelInput = screen.getByRole('spinbutton', { name: 'Mushaf page number' })
    await fireEvent.keyDown(cancelInput, { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(chip))
  })

  it('maps ArrowLeft and ArrowRight to physical Mushaf actions', async () => {
    const router = await import('../../../../src/core/router')
    const navigateSpy = vi.spyOn(router, 'navigate')
    const { default: MushafReader } = await import('../../../../src/read/mushaf/MushafReader.svelte')

    const view = render(MushafReader, { props: { page: '1' } })
    await waitFor(() => expect(screen.getByRole('img', { name: /Mushaf page 1/ })).toBeInTheDocument())
    await fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(navigateSpy).toHaveBeenCalledWith('#/m/2')

    await view.rerender({ page: '2' })
    await waitFor(() => expect(screen.getByRole('img', { name: /Mushaf page 2/ })).toBeInTheDocument())
    await fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(navigateSpy).toHaveBeenCalledWith('#/m/1')
  })
})

describe('Reader active-riwayah text prompt', () => {
  it('shows an install prompt instead of fallback Qaloon ayat when active text is unavailable', async () => {
    document.body.innerHTML = '<main id="main-content"></main>'

    const { default: Reader } = await import('../../../../src/read/Reader.svelte')
    const { settings } = await import('../../../../src/configure/state.svelte')
    settings.riwayah = 'hafs'

    render(Reader, { props: { surah: '1' } })
    await flush()

    await waitFor(() => {
      expect(screen.getByText('hafs text is not installed yet.')).toBeInTheDocument()
    })
    expect(screen.queryByText(/اِ۬لْحَمْدُ/)).toBeNull()
  })

  it('ignores stale unavailable-pack errors after a newer riwayah load starts', async () => {
    document.body.innerHTML = '<main id="main-content"></main>'

    const firstLoad = deferred<never>()
    const secondLoad = deferred<never>()
    datasetMocks.getSurah
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise)

    const { default: Reader } = await import('../../../../src/read/Reader.svelte')
    const { settings } = await import('../../../../src/configure/state.svelte')
    const { emit } = await import('../../../../src/core/events')
    const { Events } = await import('../../../../src/core/constants')
    settings.riwayah = 'hafs'

    render(Reader, { props: { surah: '1' } })
    await flush()

    settings.riwayah = 'qaloon'
    emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: 'hafs', to: 'qaloon' })
    firstLoad.reject(new datasetMocks.RiwayahPackUnavailableError('hafs'))
    await flush()

    expect(screen.queryByText('hafs text is not installed yet.')).toBeNull()

    secondLoad.reject(new datasetMocks.RiwayahPackUnavailableError('qaloon'))
  })
})
