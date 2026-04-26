import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn(async () => undefined),
  put: vi.fn(),
}))
vi.mock('../../../src/core/logger.js', () => ({ logger: { error: vi.fn() } }))
vi.mock('../../../src/state/settings.svelte.ts', () => ({ settings: {} as Record<string, unknown> }))
vi.mock('../../../src/core/events.ts', () => ({ on: vi.fn(() => () => {}), emit: vi.fn() }))

describe('lineHeightFor', () => {
  it('respects per-Riwayah floors at xs step', async () => {
    const { lineHeightFor } = await import('../../../src/settings/reading-typography')
    expect(lineHeightFor('hafs',   'xs')).toBeCloseTo(1.76, 2)
    expect(lineHeightFor('warsh',  'xs')).toBeCloseTo(1.73, 2)
    expect(lineHeightFor('qaloon', 'xs')).toBeCloseTo(1.72, 2)
  })

  it('xl step adds +0.4 over the Riwayah floor', async () => {
    const { lineHeightFor } = await import('../../../src/settings/reading-typography')
    expect(lineHeightFor('hafs',   'xl')).toBeCloseTo(2.16, 2)
    expect(lineHeightFor('warsh',  'xl')).toBeCloseTo(2.13, 2)
    expect(lineHeightFor('qaloon', 'xl')).toBeCloseTo(2.12, 2)
  })

  it('intermediate steps add the right delta', async () => {
    const { lineHeightFor } = await import('../../../src/settings/reading-typography')
    expect(lineHeightFor('hafs', 'sm')).toBeCloseTo(1.86, 2)
    expect(lineHeightFor('hafs', 'md')).toBeCloseTo(1.96, 2)
    expect(lineHeightFor('hafs', 'lg')).toBeCloseTo(2.06, 2)
  })
})
