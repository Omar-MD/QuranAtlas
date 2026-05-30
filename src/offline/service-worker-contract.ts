import type { CacheInstallPlan } from './cache-plan'

export type ReactAssetPackInstallRequest = CacheInstallPlan & {
  type: 'QA_REACT_ASSET_PACK_INSTALL'
}

export type ReactAssetPackInstallResult = {
  type: 'QA_REACT_ASSET_PACK_INSTALLED' | 'QA_REACT_ASSET_PACK_FAILED'
  packId: string
  error?: string
}

export function createInstallRequest(plan: CacheInstallPlan): ReactAssetPackInstallRequest {
  return { type: 'QA_REACT_ASSET_PACK_INSTALL', ...plan }
}
