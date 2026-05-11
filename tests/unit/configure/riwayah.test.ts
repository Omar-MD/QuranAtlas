import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock IDB wrapper before importing module-under-test.
const fakeStore = new Map<string, unknown>()
let usableRiwayah = new Set(['qaloon', 'hafs', 'warsh'])
vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn(async (_store: string, key: string) => fakeStore.has(key) ? { key, value: fakeStore.get(key) } : undefined),
  put: vi.fn(async (_store: string, rec: { key: string; value: unknown }) => { fakeStore.set(rec.key, rec.value) }),
}))
vi.mock('../../../src/core/events.js', () => ({ emit: vi.fn() }))
vi.mock('../../../src/core/logger.js', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }))
vi.mock('../../../src/configure/state.svelte.ts', () => ({
  settings: {} as Record<string, unknown>,
  riwayahInstallIntent: { requested: null, previousUsable: 'qaloon' },
  riwayahPackageState: {},
}))
vi.mock('../../../src/data/riwayah-packages', () => ({
  isRiwayahUsable: vi.fn(async (riwayah: string) => usableRiwayah.has(riwayah)),
  getRiwayahPackageStatus: vi.fn(async (riwayah: string) => (
    usableRiwayah.has(riwayah)
      ? { kind: 'installed', riwayah, totalBytes: 1 }
      : { kind: 'installable', riwayah, totalBytes: 1 }
  )),
}))
vi.mock('../../../src/infra/safety/sync', () => ({
  broadcastRiwayahChange: vi.fn(),
  registerTopic: vi.fn(),
}))

beforeEach(() => {
  fakeStore.clear()
  usableRiwayah = new Set(['qaloon', 'hafs', 'warsh'])
  vi.clearAllMocks()
})

describe('riwayah settings', () => {
  it('loadRiwayah defaults to qaloon', async () => {
    const { loadRiwayah } = await import('../../../src/configure/riwayah')
    expect(await loadRiwayah()).toBe('qaloon')
  })

  it('setRiwayah persists value + emits SETTINGS_RIWAYAH_CHANGED', async () => {
    const { setRiwayah } = await import('../../../src/configure/riwayah')
    const { emit } = await import('../../../src/core/events.js')
    await setRiwayah('hafs')
    expect(fakeStore.get('riwayah')).toBe('hafs')
    expect(emit).toHaveBeenCalledWith('settings:riwayah-changed', { from: 'qaloon', to: 'hafs' })
  })

  it('setRiwayah rejects unknown values', async () => {
    const { setRiwayah } = await import('../../../src/configure/riwayah')
    expect(await setRiwayah('xyz' as never)).toBe(false)
  })

  it('setRiwayah rejects unusable riwayat without persisting or emitting', async () => {
    usableRiwayah = new Set(['qaloon'])
    const { setRiwayah } = await import('../../../src/configure/riwayah')
    const { emit } = await import('../../../src/core/events.js')

    expect(await setRiwayah('hafs')).toBe(false)
    expect(fakeStore.has('riwayah')).toBe(false)
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
})
