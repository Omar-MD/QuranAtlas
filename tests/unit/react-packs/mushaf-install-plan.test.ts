import { describe, expect, it } from 'vitest'

import { buildMushafInstallPlan } from '../../../src-react/packs/mushaf-install-plan'
import { qaloonMushafFixture } from '../../../src-react/packs/mushaf-fixtures'
import { createMushafInstallRequest } from '../../../src-react/offline/mushaf-service-worker-protocol'
import { validateMushafAssetIndexEntry } from '../../../src-react/packs/mushaf-index'

describe('React Mushaf install plans', () => {
  it('builds an install plan from edition-aware fixture indexes', () => {
    const plan = buildMushafInstallPlan(qaloonMushafFixture)

    expect(plan.packId).toBe('mushaf-pages:qaloon:qalun-quran-ws-v1')
    expect(plan.urls[0]).toBe('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg')
    expect(plan.cacheName).toContain('qalun-quran-ws-v1')
    expect(createMushafInstallRequest(plan)).toMatchObject({ type: 'QA_REACT_MUSHAF_PACK_INSTALL', packId: plan.packId })
  })

  it('rejects riwayah and edition mismatches in the index contract', () => {
    expect(() => validateMushafAssetIndexEntry({
      ...qaloonMushafFixture,
      manifestUrl: '/dataset/mushaf-pages/hafs/qalun-quran-ws-v1/manifest.json',
    })).toThrow(/riwayah mismatch/)

    expect(() => validateMushafAssetIndexEntry({
      ...qaloonMushafFixture,
      pageUrls: ['/dataset/mushaf-pages/qaloon/other-quran-ws-v1/pages/001.svg'],
    })).toThrow(/edition mismatch/)
  })

  it('rejects stale page indexes that do not match the declared page count', () => {
    expect(() => validateMushafAssetIndexEntry({
      ...qaloonMushafFixture,
      pageCount: 2,
      pageUrls: [
        '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg',
      ],
    })).toThrow(/page count/)
  })
})
