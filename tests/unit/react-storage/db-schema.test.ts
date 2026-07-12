import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'

import { closeReactDb, openReactDb } from '../../../src/storage/db'
import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_DB_VERSION, QURAN_ATLAS_V8_STORES } from '../../../src/storage/schema'
import {
  DEFAULT_REACT_READER_PREFERENCES,
  readReactReaderPreferences,
  writeMushafEditionSelection,
  writeOnboardingCompletion,
  writeReactReaderPreferences,
  writeReaderAssetBundleSettings,
} from '../../../src/storage/settings-writer'

describe('React storage schema mirror', () => {
  afterEach(async () => {
    closeReactDb()
    await indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
  })

  it('opens the existing quran-atlas v8 store layout with Search lifecycle stores', async () => {
    const db = await openReactDb()

    expect(db.name).toBe(QURAN_ATLAS_DB_NAME)
    expect(db.verno).toBe(QURAN_ATLAS_DB_VERSION)
    expect(Object.keys(QURAN_ATLAS_V8_STORES)).toEqual([
      'settings',
      'activationState',
      'datasetMeta',
      'bookmarks',
      'savedSearches',
      'searchPackActivations',
      'searchPackStaging',
    ])
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

  it('writes a Mushaf edition and setup marker in one settings transaction', async () => {
    const db = await openReactDb()

    await writeMushafEditionSelection(db, {
      mushafEditionId: 'qalun-furatiyyah-2023-v1',
      mushafEditionSetupVersion: 1,
    })

    await expect(db.settings.bulkGet(['mushafEditionId', 'mushafEditionSetupVersion'])).resolves.toEqual([
      { key: 'mushafEditionId', value: 'qalun-furatiyyah-2023-v1' },
      { key: 'mushafEditionSetupVersion', value: 1 },
    ])
  })

  it('loads default MVP reader preferences when settings are absent', async () => {
    const db = await openReactDb()

    await expect(readReactReaderPreferences(db)).resolves.toEqual(DEFAULT_REACT_READER_PREFERENCES)
  })

  it('writes React reader preferences through the shared settings facade', async () => {
    const db = await openReactDb()

    await writeReactReaderPreferences(db, {
      fontSize: 'lg',
      lineSpacing: 'sm',
      mushafFitWidth: true,
      mushafPageFraming: 0.5,
      mushafViewMode: 'continuous',
      nightMode: 'on',
      readerMargin: 'xl',
      theme: 'dark',
      translationVisible: false,
      verseSpacing: 'xs',
      wordSpacing: 'lg',
      wirdReaderStatusVisible: false,
    })

    await expect(db.settings.bulkGet([
      'translationVisible',
      'wirdReaderStatusVisible',
      'fontSize',
      'lineSpacing',
      'wordSpacing',
      'readerMargin',
      'verseSpacing',
      'theme',
      'nightMode',
      'mushafViewMode',
      'mushafFitWidth',
      'mushafPageFraming',
    ])).resolves.toEqual([
      { key: 'translationVisible', value: false },
      { key: 'wirdReaderStatusVisible', value: false },
      { key: 'fontSize', value: 'lg' },
      { key: 'lineSpacing', value: 'sm' },
      { key: 'wordSpacing', value: 'lg' },
      { key: 'readerMargin', value: 'xl' },
      { key: 'verseSpacing', value: 'xs' },
      { key: 'theme', value: 'dark' },
      { key: 'nightMode', value: 'on' },
      { key: 'mushafViewMode', value: 'continuous' },
      { key: 'mushafFitWidth', value: true },
      { key: 'mushafPageFraming', value: 0.5 },
    ])
  })

  it('normalizes legacy fit-width Mushaf mode into separate mode and width preferences', async () => {
    const db = await openReactDb()
    await db.settings.put({ key: 'mushafViewMode', value: 'fit-width' })

    await expect(readReactReaderPreferences(db)).resolves.toEqual({
      ...DEFAULT_REACT_READER_PREFERENCES,
      mushafFitWidth: true,
      mushafViewMode: 'fit-page',
    })
  })

  it('clamps corrupt Mushaf framing values to the supported range', async () => {
    const db = await openReactDb()
    await db.settings.put({ key: 'mushafPageFraming', value: 4 })
    await expect(readReactReaderPreferences(db)).resolves.toMatchObject({ mushafPageFraming: 1 })
    await db.settings.put({ key: 'mushafPageFraming', value: 'invalid' })
    await expect(readReactReaderPreferences(db)).resolves.toMatchObject({ mushafPageFraming: 0 })
  })
})
