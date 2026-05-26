import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'

import { closeReactDb, openReactDb } from '../../../src-react/storage/db'
import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_DB_VERSION, QURAN_ATLAS_V7_STORES } from '../../../src-react/storage/schema'
import { writeOnboardingCompletion, writeReaderAssetBundleSettings } from '../../../src-react/storage/settings-writer'

describe('React storage schema mirror', () => {
  afterEach(async () => {
    closeReactDb()
    await indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
  })

  it('opens the existing quran-atlas v7 store layout without adding stores', async () => {
    const db = await openReactDb()

    expect(db.name).toBe(QURAN_ATLAS_DB_NAME)
    expect(db.verno).toBe(QURAN_ATLAS_DB_VERSION)
    expect(Object.keys(QURAN_ATLAS_V7_STORES)).toEqual(['settings', 'activationState', 'datasetMeta', 'bookmarks'])
  })

  it('writes reader asset bundle settings atomically through the facade', async () => {
    const db = await openReactDb()
    await writeReaderAssetBundleSettings(db, {
      riwayah: 'qaloon',
      quranTextStyleId: 'qaloon-v10',
      mushafEditionId: 'qalun-quran-ws-v1',
    })

    await expect(db.settings.bulkGet(['riwayah', 'quranTextStyleId', 'mushafEditionId'])).resolves.toEqual([
      { key: 'riwayah', value: 'qaloon' },
      { key: 'quranTextStyleId', value: 'qaloon-v10' },
      { key: 'mushafEditionId', value: 'qalun-quran-ws-v1' },
    ])
  })

  it('writes React onboarding completion and selected sources atomically through the facade', async () => {
    const db = await openReactDb()

    await writeOnboardingCompletion(db, {
      riwayah: 'qaloon',
      translationId: 'bridges',
    })

    await expect(db.settings.bulkGet(['onboardingComplete', 'riwayah', 'translationId'])).resolves.toEqual([
      { key: 'onboardingComplete', value: true },
      { key: 'riwayah', value: 'qaloon' },
      { key: 'translationId', value: 'bridges' },
    ])
  })
})
