import { describe, expect, it } from 'vitest'

import { buildCacheInstallPlan } from '../../../src-react/offline/cache-plan'
import { reactAssetPackCacheName } from '../../../src-react/offline/cache-names'
import { mapQuotaEstimate } from '../../../src-react/offline/quota'
import { createInstallRequest } from '../../../src-react/offline/service-worker-contract'
import { packStatusToUiState } from '../../../src-react/offline/ui-state'

describe('React cache planning', () => {
  it('builds cache plans with React cache names and service-worker install messages', () => {
    const pack = { packId: 'translation:bridges', kind: 'translation' as const, version: 'v1', totalBytes: 2, urls: ['/dataset/translations/bridges/001.json'] }
    const plan = buildCacheInstallPlan(pack)

    expect(plan.cacheName).toBe(reactAssetPackCacheName(pack))
    expect(plan.urls).toEqual(pack.urls)
    expect(createInstallRequest(plan)).toMatchObject({ type: 'QA_REACT_ASSET_PACK_INSTALL', packId: pack.packId })
  })

  it('maps quota and UI status without persisting rich state', () => {
    expect(mapQuotaEstimate({ quota: 100, usage: 95 }).status).toBe('critical')
    expect(packStatusToUiState({ packId: 'translation:bridges', status: 'installed' })).toMatchObject({ action: 'activate', usable: false })
  })
})
