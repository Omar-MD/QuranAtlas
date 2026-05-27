import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock IDB wrapper before importing module-under-test.
const fakeStore = new Map<string, unknown>()
let usableRiwayah = new Set(['qaloon', 'hafs', 'warsh'])
let riwayahTopicHandler: ((payload: unknown) => void) | null = null
const mockState = {
  settings: {} as Record<string, unknown>,
  riwayahInstallIntent: { requested: null as string | null, previousUsable: 'qaloon' },
  riwayahPackageState: {} as Record<string, unknown>,
}
vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn(async (_store: string, key: string) => fakeStore.has(key) ? { key, value: fakeStore.get(key) } : undefined),
  put: vi.fn(async (_store: string, rec: { key: string; value: unknown }) => { fakeStore.set(rec.key, rec.value) }),
}))
vi.mock('../../../src/core/events.js', () => ({ emit: vi.fn() }))
vi.mock('../../../src/core/logger.js', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }))
vi.mock('../../../src/configure/state.svelte.ts', () => mockState)
vi.mock('../../../src/packs/text-assets', () => ({
  defaultTextStyleForRiwayah: vi.fn(async () => 'uthmani-kfgqpc-v1'),
  canUseTextAsset: vi.fn(async () => true),
}))
vi.mock('../../../src/packs/mushaf-assets', () => ({
  defaultMushafEditionForRiwayah: vi.fn(async (riwayah: string) => (
    riwayah === 'hafs' ? 'hafs-quran-ws-v1'
      : riwayah === 'warsh' ? 'warsh-quran-ws-v1'
        : 'qalun-quran-ws-v1'
  )),
  canUseMushafAsset: vi.fn(async () => true),
}))
vi.mock('../../../src/configure/variant-bundle', async () => {
  const { emit } = await import('../../../src/core/events.js')
  return {
    initActiveVariantBundle: vi.fn(async () => {
      const riwayah = typeof fakeStore.get('riwayah') === 'string' ? fakeStore.get('riwayah') as string : 'qaloon'
      const bundle = {
        riwayah,
        quranTextStyleId: typeof fakeStore.get('quranTextStyleId') === 'string' ? fakeStore.get('quranTextStyleId') as string : 'uthmani-kfgqpc-v1',
        mushafEditionId: typeof fakeStore.get('mushafEditionId') === 'string' ? fakeStore.get('mushafEditionId') as string : riwayah === 'hafs' ? 'hafs-quran-ws-v1' : 'qalun-quran-ws-v1',
      }
      Object.assign(mockState.settings, bundle)
      return bundle
    }),
    setActiveVariantBundle: vi.fn(async (bundle: { riwayah: string; quranTextStyleId: string; mushafEditionId: string }) => {
      if (!usableRiwayah.has(bundle.riwayah)) return false
      const previous = typeof fakeStore.get('riwayah') === 'string' ? fakeStore.get('riwayah') as string : 'qaloon'
      fakeStore.set('riwayah', bundle.riwayah)
      fakeStore.set('quranTextStyleId', bundle.quranTextStyleId)
      fakeStore.set('mushafEditionId', bundle.mushafEditionId)
      Object.assign(mockState.settings, bundle)
      if (previous !== bundle.riwayah) {
        emit('settings:riwayah-changed', { from: previous, to: bundle.riwayah })
      }
      return true
    }),
  }
})
vi.mock('../../../src/packs/riwayah', async () => {
  const { emit } = await import('../../../src/core/events.js')
  return {
    DEFAULT_RIWAYAH: 'qaloon',
    getRiwayahOptions: vi.fn(() => ['hafs', 'warsh', 'qaloon']),
    isRiwayah: vi.fn((value: string) => ['hafs', 'warsh', 'qaloon'].includes(value)),
    isRiwayahUsable: vi.fn(async (riwayah: string) => usableRiwayah.has(riwayah)),
    applyRiwayah: vi.fn(),
    loadRiwayah: vi.fn(async () => {
      const value = fakeStore.get('riwayah')
      return typeof value === 'string' ? value : 'qaloon'
    }),
    persistRiwayahSelection: vi.fn(async (next: string) => {
      if (!['hafs', 'warsh', 'qaloon'].includes(next) || !usableRiwayah.has(next)) {
        return null
      }
      const previous = typeof fakeStore.get('riwayah') === 'string' ? fakeStore.get('riwayah') : 'qaloon'
      fakeStore.set('riwayah', next)
      if (previous !== next) {
        emit('settings:riwayah-changed', { from: previous, to: next })
      }
      return { changed: previous !== next, previous }
    }),
    getRiwayahPackageStatus: vi.fn(async (riwayah: string) => (
      usableRiwayah.has(riwayah)
        ? { kind: 'installed', riwayah, totalBytes: 1 }
        : { kind: 'installable', riwayah, totalBytes: 1 }
    )),
    beginRiwayahInstall: vi.fn((riwayah: string) => {
      if (!['hafs', 'warsh', 'qaloon'].includes(riwayah) || riwayah === 'qaloon') return false
      mockState.riwayahInstallIntent.requested = riwayah
      return true
    }),
    failRiwayahInstall: vi.fn((riwayah: string) => {
      if (mockState.riwayahInstallIntent.requested === riwayah) {
        mockState.riwayahInstallIntent.requested = null
      }
    }),
    refreshRiwayahPackageStatus: vi.fn(async (riwayah: string) => (
      usableRiwayah.has(riwayah)
        ? { kind: 'installed', riwayah, totalBytes: 1 }
        : { kind: 'installable', riwayah, totalBytes: 1 }
    )),
    completeRiwayahInstall: vi.fn(async () => true),
  }
})
vi.mock('../../../src/infra/safety/sync', () => ({
  broadcastRiwayahChange: vi.fn(),
  registerTopic: vi.fn((_topic: string, handler: (payload: unknown) => void) => {
    riwayahTopicHandler = handler
  }),
}))

beforeEach(() => {
  fakeStore.clear()
  usableRiwayah = new Set(['qaloon', 'hafs', 'warsh'])
  riwayahTopicHandler = null
  mockState.riwayahInstallIntent.requested = null
  mockState.riwayahInstallIntent.previousUsable = 'qaloon'
  mockState.riwayahPackageState = {}
  vi.clearAllMocks()
})

describe('riwayah settings', () => {
  it('loadRiwayah defaults to qaloon', async () => {
    const { loadRiwayah } = await import('../../../src/configure/riwayah')
    expect(await loadRiwayah()).toBe('qaloon')
  })

  it('setRiwayah accepts the default profile without rewriting storage', async () => {
    const { setRiwayah } = await import('../../../src/configure/riwayah')
    const { setActiveVariantBundle } = await import('../../../src/configure/variant-bundle')
    const { emit } = await import('../../../src/core/events.js')

    await expect(setRiwayah('qaloon')).resolves.toBe(true)
    expect(fakeStore.has('riwayah')).toBe(false)
    expect(setActiveVariantBundle).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })

  it('setRiwayah rejects unknown values', async () => {
    const { setRiwayah } = await import('../../../src/configure/riwayah')
    expect(await setRiwayah('xyz' as never)).toBe(false)
  })

  it('source writers reject unsupported legacy profile values without persisting or mutating state', async () => {
    const { setRiwayah } = await import('../../../src/configure/riwayah')
    const { setQuranTextStyleId } = await import('../../../src/configure/quran-text-style')
    const { setMushafEditionId } = await import('../../../src/configure/mushaf-edition')
    const { setTranslationId } = await import('../../../src/configure/panel-bridge')
    const { emit } = await import('../../../src/core/events.js')

    await expect(setRiwayah('hafs')).resolves.toBe(false)
    await expect(setQuranTextStyleId('hafs-uthmani-kfgqpc-v1')).resolves.toBe(false)
    await expect(setMushafEditionId('hafs-quran-ws-v1')).resolves.toBe(false)
    await setTranslationId('saheeh')

    expect(fakeStore.has('riwayah')).toBe(false)
    expect(fakeStore.has('quranTextStyleId')).toBe(false)
    expect(fakeStore.has('mushafEditionId')).toBe(false)
    expect(fakeStore.get('translationId')).toBe('bridges')
    expect(mockState.settings).not.toMatchObject({
      riwayah: 'hafs',
      quranTextStyleId: 'hafs-uthmani-kfgqpc-v1',
      mushafEditionId: 'hafs-quran-ws-v1',
      translationId: 'saheeh',
    })
    expect(emit).not.toHaveBeenCalled()
  })

  it('failed install intent leaves previousUsable unchanged', async () => {
    const { riwayahInstallIntent } = await import('../../../src/configure/state.svelte.ts')
    const { beginRiwayahInstall, failRiwayahInstall } = await import('../../../src/configure/riwayah')

    beginRiwayahInstall('hafs')
    riwayahInstallIntent.previousUsable = 'qaloon'
    failRiwayahInstall('hafs', 'network failed')

    expect(riwayahInstallIntent).toMatchObject({
      requested: null,
      previousUsable: 'qaloon',
    })
  })

  it('getRiwayahOptions returns the three valid ids in order', async () => {
    const { getRiwayahOptions } = await import('../../../src/configure/riwayah')
    expect(getRiwayahOptions()).toEqual(['hafs', 'warsh', 'qaloon'])
  })

  it('sync topic updates the active settings rune on inbound riwayah changes', async () => {
    const { initRiwayah } = await import('../../../src/configure/riwayah')
    const { settings } = await import('../../../src/configure/state.svelte.ts')

    await initRiwayah()
    riwayahTopicHandler?.({ value: 'warsh' })

    expect(settings.riwayah).toBe('qaloon')
  })

  it('sync topic ignores bundled legacy variant axes', async () => {
    const { initRiwayah } = await import('../../../src/configure/riwayah')
    const { settings } = await import('../../../src/configure/state.svelte.ts')

    await initRiwayah()
    riwayahTopicHandler?.({
      riwayah: 'hafs',
      quranTextStyleId: 'uthmani-kfgqpc-v1',
      mushafEditionId: 'hafs-quran-ws-v1',
    })

    expect(settings).toMatchObject({
      riwayah: 'qaloon',
      quranTextStyleId: 'uthmani-kfgqpc-v1',
      mushafEditionId: 'qalun-quran-ws-v1',
    })
  })
})
