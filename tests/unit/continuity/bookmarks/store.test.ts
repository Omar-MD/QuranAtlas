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
  it('persists a bookmark under the requested riwayah without crossing to another riwayah', async () => {
    await add('2:255', 'hafs')
    await add('2:255', 'warsh')
    await add('2:255', 'qaloon')

    await expect(getOne('2:255', 'hafs')).resolves.toMatchObject({ verseKey: '2:255', riwayah: 'hafs' })
    await expect(getOne('2:255', 'warsh')).resolves.toMatchObject({ verseKey: '2:255', riwayah: 'warsh' })
    await expect(getOne('2:255', 'qaloon')).resolves.toMatchObject({ verseKey: '2:255', riwayah: 'qaloon' })
  })

  it('deletes only the targeted riwayah record for a shared verse key', async () => {
    await add('1:1', 'hafs')
    await add('1:1', 'warsh')
    await add('1:1', 'qaloon')

    await del('1:1', 'warsh')

    await expect(getOne('1:1', 'hafs')).resolves.toBeDefined()
    await expect(getOne('1:1', 'warsh')).resolves.toBeUndefined()
    await expect(getOne('1:1', 'qaloon')).resolves.toBeDefined()
  })

  it('toggles bookmark state per riwayah boundary', async () => {
    await add('18:1', 'hafs')

    await expect(toggle('18:1', 'warsh')).resolves.toBe(true)
    await expect(toggle('18:1', 'hafs')).resolves.toBe(false)

    await expect(getOne('18:1', 'hafs')).resolves.toBeUndefined()
    await expect(getOne('18:1', 'warsh')).resolves.toBeDefined()
  })

  it('returns grouped and flat results only for the requested riwayah', async () => {
    await add('2:10', 'qaloon')
    await add('2:5', 'qaloon')
    await add('1:1', 'qaloon')
    await add('2:255', 'hafs')
    await add('3:7', 'warsh')

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
