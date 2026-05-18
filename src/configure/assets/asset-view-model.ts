import type { AssetStatusKind } from '../../packs/asset-types'

export const ACTIVE_DELETE_DISABLED_REASON = 'Switch to another compatible asset before deleting.'

export type AssetRowGroup = 'quran-text' | 'mushaf' | 'translation' | 'tafsir'

export type AssetRowView = {
  id: string
  group: AssetRowGroup
  label: string
  status: AssetStatusKind
  active: boolean
  compatible: boolean
  primaryAction: 'Install' | 'Retry' | 'Reinstall' | 'Set Active' | 'Active' | 'Installing...' | null
  secondaryAction: 'Delete' | 'Cancel' | null
  disabledReason: string | null
  deleteDisabledReason: string | null
  progressText: string | null
}

export type AssetRowInput = {
  id: string
  group: AssetRowGroup
  label: string
  status: AssetStatusKind
  active?: boolean
  compatible?: boolean
  shipped?: boolean
  requiredRiwayah?: string | null
  progress?: { cached: number; total: number } | null
}

export function assetRowView(input: AssetRowInput): AssetRowView {
  const active = input.active === true
  const compatible = input.compatible !== false
  const disabledReason = compatible
    ? input.shipped && !active ? 'Included with app' : null
    : `Requires active riwayah: ${input.requiredRiwayah ?? 'compatible source'}`
  const progressText = input.status === 'installing' && input.progress
    ? `${input.progress.cached} of ${input.progress.total}`
    : null

  let primaryAction: AssetRowView['primaryAction']
  switch (input.status) {
    case 'installable':
      primaryAction = compatible ? 'Install' : null
      break
    case 'installed':
    case 'cached':
      primaryAction = active ? 'Active' : compatible ? 'Set Active' : null
      break
    case 'shipped':
      primaryAction = active ? 'Active' : compatible ? 'Set Active' : null
      break
    case 'incomplete':
      primaryAction = compatible ? 'Reinstall' : null
      break
    case 'unavailable':
      primaryAction = compatible ? 'Retry' : null
      break
    case 'installing':
      primaryAction = 'Installing...'
      break
    case 'incompatible':
      primaryAction = null
      break
  }

  return {
    id: input.id,
    group: input.group,
    label: input.label,
    status: input.status,
    active,
    compatible,
    primaryAction,
    secondaryAction: input.status === 'installing' ? 'Cancel' : input.status === 'shipped' ? null : 'Delete',
    disabledReason,
    deleteDisabledReason: active && input.status !== 'shipped' ? ACTIVE_DELETE_DISABLED_REASON : null,
    progressText,
  }
}
