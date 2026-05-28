import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  add, del, toggle, getOne, getAllForRiwayah, getGroupedForRiwayah,
} from '../../../../src/navigate/bookmarks/store'

beforeEach(async () => {
  const { deleteDB, openDB } = await import('../../../../src/core/db')
  try { await deleteDB() } catch { /* fresh */ }
  await openDB()
})

describe('bookmarks/store add() + getOne()', () => {
  it('adds a bookmark and reads it back', async () => {
    await add('2:255', 'qaloon')
    const got = await getOne('2:255', 'qaloon')
    expect(got?.verseKey).toBe('2:255')
    expect(got?.riwayah).toBe('qaloon')
    expect(got?.surah).toBe(2)
    expect(got?.createdAt).toBeGreaterThan(0)
  })

  it('does not duplicate the default-riwayah record for the same verseKey', async () => {
    await add('2:255', 'qaloon')
    await add('2:255', 'qaloon')
    const qaloon = await getOne('2:255', 'qaloon')
    expect(qaloon?.riwayah).toBe('qaloon')
    expect(qaloon?.verseKey).toBe('2:255')
  })
})

describe('bookmarks/store del()', () => {
  it('removes a bookmark', async () => {
    await add('1:1', 'qaloon')
    expect(await getOne('1:1', 'qaloon')).toBeDefined()
    await del('1:1', 'qaloon')
    expect(await getOne('1:1', 'qaloon')).toBeUndefined()
  })

  it('removing an absent default-riwayah bookmark is harmless', async () => {
    await add('1:1', 'qaloon')
    await del('1:1', 'qaloon')
    await del('1:1', 'qaloon')
    expect(await getOne('1:1', 'qaloon')).toBeUndefined()
  })
})

describe('bookmarks/store toggle()', () => {
  it('adds when absent and returns true', async () => {
    const state = await toggle('2:1', 'qaloon')
    expect(state).toBe(true)
    expect(await getOne('2:1', 'qaloon')).toBeDefined()
  })

  it('removes when present and returns false', async () => {
    await add('2:1', 'qaloon')
    const state = await toggle('2:1', 'qaloon')
    expect(state).toBe(false)
    expect(await getOne('2:1', 'qaloon')).toBeUndefined()
  })
})

describe('bookmarks/store getAllForRiwayah()', () => {
  it('returns only bookmarks for the active riwayah, sorted by (surah, verse)', async () => {
    await add('2:10', 'qaloon')
    await add('1:1', 'qaloon')
    await add('2:5', 'qaloon')
    const list = await getAllForRiwayah('qaloon')
    expect(list.map(b => b.verseKey)).toEqual(['1:1', '2:5', '2:10'])
  })

  it('returns an empty list when nothing is bookmarked', async () => {
    expect(await getAllForRiwayah('qaloon')).toEqual([])
  })
})

describe('bookmarks/store getGroupedForRiwayah()', () => {
  it('groups by surah in canonical order with ascending verses', async () => {
    await add('5:1', 'qaloon')
    await add('2:255', 'qaloon')
    await add('5:55', 'qaloon')
    await add('2:1', 'qaloon')
    const grouped = await getGroupedForRiwayah('qaloon')
    const surahs = [...grouped.keys()]
    expect(surahs).toEqual([2, 5])
    expect(grouped.get(2)!.map(b => b.verseKey)).toEqual(['2:1', '2:255'])
    expect(grouped.get(5)!.map(b => b.verseKey)).toEqual(['5:1', '5:55'])
  })

  it('groups default-riwayah bookmarks only', async () => {
    await add('1:1', 'qaloon')
    const grouped = await getGroupedForRiwayah('qaloon')
    expect(grouped.size).toBe(1)
    expect(grouped.get(1)!.length).toBe(1)
  })
})
