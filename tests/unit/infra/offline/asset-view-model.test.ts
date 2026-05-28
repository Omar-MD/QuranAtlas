import { describe, expect, it } from 'vitest'
import { defaultAssetInventoryRows } from '../../../../src/configure/assets/asset-view-model'

describe('asset row view model', () => {
  it('returns read-only rows for the default MVP profile', () => {
    const rows = defaultAssetInventoryRows()

    expect(rows.map((row) => row.label)).toEqual([
      'Qaloon Text + Font',
      'Qaloon Mushaf',
      'Bridges Translation',
    ])
    expect(rows.every((row) => row.status === 'default-installed')).toBe(true)
    expect(rows.every((row) => row.active === true)).toBe(true)
    expect(rows.every((row) => row.primaryAction === null)).toBe(true)
    expect(rows.every((row) => row.secondaryAction === null)).toBe(true)
  })
})
