import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

import { closeReactDb, openReactDb } from '../../../src/storage/db'
import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_DB_VERSION, QURAN_ATLAS_V8_STORES } from '../../../src/storage/schema'
import type { SavedSearchRecord } from '../../../src/storage/types'

describe('Search storage schema', () => {
  afterEach(async () => {
    closeReactDb()
    await indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
  })

  it('migrates the existing reader stores to v8 and adds Search stores', async () => {
    const oldDb = new Dexie(QURAN_ATLAS_DB_NAME)
    oldDb.version(7).stores({
      settings: 'key',
      activationState: 'id',
      datasetMeta: 'id',
      bookmarks: '[riwayah+verseKey], [riwayah+surah], riwayah',
    })
    await oldDb.table('settings').put({ key: 'theme', value: 'dark' })
    oldDb.close()

    const db = await openReactDb()

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
    await expect(db.settings.get('theme')).resolves.toEqual({ key: 'theme', value: 'dark' })
  })

  it('stores saved search query definitions rather than result windows', async () => {
    const db = await openReactDb()
    const record: SavedSearchRecord = {
      id: 'saved-1',
      schemaVersion: 1,
      intent: {
        schemaVersion: 1,
        id: 'intent-1',
        name: 'Mercy phrase',
        queryText: 'الرحمن الرحيم',
        queryMode: 'phrase',
        queryAstVersion: 1,
        filters: {},
        sourceLanes: ['arabic-text'],
        sort: 'mushaf-order',
        compatiblePackRequirements: {
          packAbiMajor: 1,
          normalizerVersion: 1,
          requiredFeatures: ['core', 'phrase'],
        },
        displayPreferences: { showSourceNotes: true },
        createdAt: 1,
        updatedAt: 1,
        lastOpenedAt: null,
      },
      packCompatibilityKey: 'abi1-normalizer1-core-phrase',
      createdAt: 1,
      updatedAt: 2,
      lastOpenedAt: null,
      lastRunAt: null,
    }

    await db.savedSearches.put(record)
    const stored = await db.savedSearches.get('saved-1')

    expect(stored?.intent.queryText).toBe('الرحمن الرحيم')
    expect(stored).not.toHaveProperty('results')
  })
})
