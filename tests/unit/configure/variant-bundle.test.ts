import { beforeEach, describe, expect, it, vi } from 'vitest'

const committedSettings = new Map<string, unknown>()
let abortOnPutNumber = Number.POSITIVE_INFINITY

const mockState = {
  settings: {
    riwayah: 'qaloon',
    quranTextStyleId: 'uthmani-kfgqpc-v1',
    mushafEditionId: 'qalun-quran-ws-v1',
  },
}

const applyRiwayah = vi.fn((riwayah: string) => {
  document.documentElement.setAttribute('data-riwayah', riwayah)
})
const emit = vi.fn()
const broadcastActiveVariantBundle = vi.fn()

vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn(async (_store: string, key: string) => (
    committedSettings.has(key) ? { key, value: committedSettings.get(key) } : undefined
  )),
  getDb: vi.fn(async () => ({
    transaction: vi.fn(() => {
      let putCount = 0
      const pending: Array<{ key: string; value: unknown }> = []
      const tx = {
        error: null as Error | null,
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore: vi.fn(() => ({
          put: vi.fn((record: { key: string; value: unknown }) => {
            putCount += 1
            if (putCount === abortOnPutNumber) {
              tx.error = new Error('settings bundle abort')
              queueMicrotask(() => tx.onabort?.())
              return
            }
            pending.push(record)
          }),
        })),
      }
      queueMicrotask(() => {
        if (tx.error) return
        for (const record of pending) {
          committedSettings.set(record.key, record.value)
        }
        tx.oncomplete?.()
      })
      return tx
    }),
  })),
}))

vi.mock('../../../src/core/events.js', () => ({ emit }))
vi.mock('../../../src/core/logger.js', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }))
vi.mock('../../../src/configure/state.svelte.ts', () => mockState)
vi.mock('../../../src/packs/riwayah', () => ({
  DEFAULT_RIWAYAH: 'qaloon',
  isRiwayah: vi.fn((value: string) => ['hafs', 'warsh', 'qaloon'].includes(value)),
  applyRiwayah,
}))
vi.mock('../../../src/packs/text-assets', () => ({
  canUseTextAsset: vi.fn(async () => true),
  defaultTextStyleForRiwayah: vi.fn(async () => 'uthmani-kfgqpc-v1'),
}))
vi.mock('../../../src/packs/mushaf-assets', () => ({
  canUseMushafAsset: vi.fn(async () => true),
  defaultMushafEditionForRiwayah: vi.fn(async (riwayah: string) => (
    riwayah === 'hafs' ? 'hafs-quran-ws-v1' : 'qalun-quran-ws-v1'
  )),
}))
vi.mock('../../../src/infra/safety/sync', () => ({ broadcastActiveVariantBundle }))

beforeEach(() => {
  committedSettings.clear()
  abortOnPutNumber = Number.POSITIVE_INFINITY
  Object.assign(mockState.settings, {
    riwayah: 'qaloon',
    quranTextStyleId: 'uthmani-kfgqpc-v1',
    mushafEditionId: 'qalun-quran-ws-v1',
  })
  document.documentElement.setAttribute('data-riwayah', 'qaloon')
  vi.clearAllMocks()
})

describe('active variant bundle', () => {
  it('does not mutate runtime state, DOM, events, or broadcast when the transaction aborts', async () => {
    abortOnPutNumber = 2
    const { setActiveVariantBundle } = await import('../../../src/configure/variant-bundle')

    await expect(setActiveVariantBundle({
      riwayah: 'hafs',
      quranTextStyleId: 'uthmani-kfgqpc-v1',
      mushafEditionId: 'hafs-quran-ws-v1',
    })).resolves.toBe(false)

    expect(mockState.settings).toMatchObject({
      riwayah: 'qaloon',
      quranTextStyleId: 'uthmani-kfgqpc-v1',
      mushafEditionId: 'qalun-quran-ws-v1',
    })
    expect(committedSettings.size).toBe(0)
    expect(document.documentElement.getAttribute('data-riwayah')).toBe('qaloon')
    expect(applyRiwayah).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
    expect(broadcastActiveVariantBundle).not.toHaveBeenCalled()
  })
})
