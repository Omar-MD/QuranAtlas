import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn(async () => undefined),
  put: vi.fn(),
}))
vi.mock('../../../src/core/logger.js', () => ({ logger: { error: vi.fn() } }))
vi.mock('../../../src/state/settings.svelte.ts', () => ({ settings: {} as Record<string, unknown> }))
vi.mock('../../../src/core/events.ts', () => ({ on: vi.fn(() => () => {}), emit: vi.fn() }))

describe('lineHeightFor', () => {
  it('uses the shared 1.92 floor at xs step across all riwayat', async () => {
    const { lineHeightFor } = await import('../../../src/settings/reading-typography')
    expect(lineHeightFor('hafs',   'xs')).toBeCloseTo(1.92, 2)
    expect(lineHeightFor('warsh',  'xs')).toBeCloseTo(1.92, 2)
    expect(lineHeightFor('qaloon', 'xs')).toBeCloseTo(1.92, 2)
  })

  it('xl step adds +0.4 over the floor', async () => {
    const { lineHeightFor } = await import('../../../src/settings/reading-typography')
    expect(lineHeightFor('hafs',   'xl')).toBeCloseTo(2.32, 2)
    expect(lineHeightFor('warsh',  'xl')).toBeCloseTo(2.32, 2)
    expect(lineHeightFor('qaloon', 'xl')).toBeCloseTo(2.32, 2)
  })

  it('intermediate steps add the right delta', async () => {
    const { lineHeightFor } = await import('../../../src/settings/reading-typography')
    expect(lineHeightFor('hafs', 'sm')).toBeCloseTo(2.02, 2)
    expect(lineHeightFor('hafs', 'md')).toBeCloseTo(2.12, 2)
    expect(lineHeightFor('hafs', 'lg')).toBeCloseTo(2.22, 2)
  })
})
