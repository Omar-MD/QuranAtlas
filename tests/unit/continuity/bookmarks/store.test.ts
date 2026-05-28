import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  add,
  del,
  getAllForRiwayah,
  getGroupedForRiwayah,
  getOne,
  toggle,
} from '../../../../src/continuity/bookmarks/store'

beforeEach(async () => {
  const { deleteDB, openDB } = await import('../../../../src/core/db')
  try { await deleteDB() } catch { /* fresh DB */ }
  await openDB()
})

describe('continuity/bookmarks/store', () => {
  it('persists a bookmark under the default riwayah', async () => {
    await add('2:255', 'qaloon')

    await expect(getOne('2:255', 'qaloon')).resolves.toMatchObject({ verseKey: '2:255', riwayah: 'qaloon' })
  })

  it('deletes the targeted default-riwayah record', async () => {
    await add('1:1', 'qaloon')

    await del('1:1', 'qaloon')

    await expect(getOne('1:1', 'qaloon')).resolves.toBeUndefined()
  })

  it('toggles bookmark state for the default riwayah', async () => {
    await add('18:1', 'qaloon')

    await expect(toggle('18:1', 'qaloon')).resolves.toBe(false)

    await expect(getOne('18:1', 'qaloon')).resolves.toBeUndefined()
  })

  it('returns grouped and flat results only for the requested riwayah', async () => {
    await add('2:10', 'qaloon')
    await add('2:5', 'qaloon')
    await add('1:1', 'qaloon')

    await expect(getAllForRiwayah('qaloon')).resolves.toMatchObject([
      { verseKey: '1:1', riwayah: 'qaloon' },
      { verseKey: '2:5', riwayah: 'qaloon' },
      { verseKey: '2:10', riwayah: 'qaloon' },
    ])

    const grouped = await getGroupedForRiwayah('qaloon')
    expect([...grouped.keys()]).toEqual([1, 2])
    expect(grouped.get(2)?.map((bookmark) => bookmark.verseKey)).toEqual(['2:5', '2:10'])
  })
})
