import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn(async () => undefined),
  put: vi.fn(),
}))
vi.mock('../../../src/core/logger.js', () => ({ logger: { error: vi.fn() } }))
vi.mock('../../../src/configure/state.svelte.ts', () => ({ settings: {} as Record<string, unknown> }))
vi.mock('../../../src/core/events.ts', () => ({ on: vi.fn(() => () => {}), emit: vi.fn() }))

describe('lineHeightFor', () => {
  it('uses the shared 1.92 floor at xs step for the default riwayah', async () => {
    const { lineHeightFor } = await import('../../../src/configure/reading-typography')
    expect(lineHeightFor('qaloon', 'xs')).toBeCloseTo(1.92, 2)
  })

  it('xl step adds +0.4 over the floor', async () => {
    const { lineHeightFor } = await import('../../../src/configure/reading-typography')
    expect(lineHeightFor('qaloon', 'xl')).toBeCloseTo(2.32, 2)
  })

  it('intermediate steps add the right delta', async () => {
    const { lineHeightFor } = await import('../../../src/configure/reading-typography')
    expect(lineHeightFor('qaloon', 'sm')).toBeCloseTo(2.02, 2)
    expect(lineHeightFor('qaloon', 'md')).toBeCloseTo(2.12, 2)
    expect(lineHeightFor('qaloon', 'lg')).toBeCloseTo(2.22, 2)
  })
})
