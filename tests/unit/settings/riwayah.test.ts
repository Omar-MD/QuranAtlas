import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock IDB wrapper before importing module-under-test.
const fakeStore = new Map<string, unknown>()
vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn(async (_store: string, key: string) => fakeStore.has(key) ? { key, value: fakeStore.get(key) } : undefined),
  put: vi.fn(async (_store: string, rec: { key: string; value: unknown }) => { fakeStore.set(rec.key, rec.value) }),
}))
vi.mock('../../../src/core/events.js', () => ({ emit: vi.fn() }))
vi.mock('../../../src/core/logger.js', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }))
vi.mock('../../../src/settings/state.svelte.ts', () => ({ settings: {} as Record<string, unknown> }))

beforeEach(() => { fakeStore.clear() })

describe('riwayah settings', () => {
  it('loadRiwayah defaults to qaloon', async () => {
    const { loadRiwayah } = await import('../../../src/settings/riwayah')
    expect(await loadRiwayah()).toBe('qaloon')
  })

  it('setRiwayah persists value + emits SETTINGS_RIWAYAH_CHANGED', async () => {
    const { setRiwayah } = await import('../../../src/settings/riwayah')
    const { emit } = await import('../../../src/core/events.js')
    await setRiwayah('hafs')
    expect(fakeStore.get('riwayah')).toBe('hafs')
    expect(emit).toHaveBeenCalledWith('settings:riwayah-changed', { from: 'qaloon', to: 'hafs' })
  })

  it('setRiwayah rejects unknown values', async () => {
    const { setRiwayah } = await import('../../../src/settings/riwayah')
    expect(await setRiwayah('xyz' as never)).toBe(false)
  })

  it('getRiwayahOptions returns the three valid ids in order', async () => {
    const { getRiwayahOptions } = await import('../../../src/settings/riwayah')
    expect(getRiwayahOptions()).toEqual(['hafs', 'warsh', 'qaloon'])
  })
})
