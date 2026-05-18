import { describe, expect, it } from 'vitest'
import { ACTIVE_DELETE_DISABLED_REASON, assetRowView, type AssetRowInput } from '../../../../src/configure/assets/asset-view-model'

const base: AssetRowInput = {
  id: 'uthmani-kfgqpc-v1',
  group: 'quran-text',
  label: 'Uthmani KFGQPC',
  status: 'installable',
  compatible: true,
}

const rowFor = (patch: Partial<AssetRowInput>) => assetRowView({ ...base, ...patch })

describe('asset row view model', () => {
  it('maps the asset status matrix to actions and disabled reasons', () => {
    expect(rowFor({ status: 'installed', active: true })).toMatchObject({
      status: 'installed',
      primaryAction: 'Active',
      deleteDisabledReason: ACTIVE_DELETE_DISABLED_REASON,
    })
    expect(rowFor({ status: 'installable' })).toMatchObject({
      status: 'installable',
      primaryAction: 'Install',
    })
    expect(rowFor({ status: 'installed' })).toMatchObject({
      status: 'installed',
      primaryAction: 'Set Active',
    })
    expect(rowFor({ status: 'shipped', shipped: true })).toMatchObject({
      status: 'shipped',
      primaryAction: 'Set Active',
      disabledReason: 'Included with app',
    })
    expect(rowFor({ status: 'incomplete' })).toMatchObject({
      status: 'incomplete',
      primaryAction: 'Reinstall',
    })
    expect(rowFor({ status: 'incompatible', compatible: false, requiredRiwayah: 'hafs' })).toMatchObject({
      status: 'incompatible',
      primaryAction: null,
      disabledReason: expect.stringContaining('Requires active riwayah:'),
    })
    expect(rowFor({ status: 'installing', progress: { cached: 3, total: 114 } })).toMatchObject({
      status: 'installing',
      primaryAction: 'Installing...',
      progressText: '3 of 114',
    })
  })
})
