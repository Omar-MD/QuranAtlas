import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/data/dataset', () => ({
  getSurahs: vi.fn(async () => ([
    { n: 1, counts: { hafs: 7, warsh: 7, qaloon: 7 } },
    { n: 2, counts: { hafs: 286, warsh: 285, qaloon: 285 } },
    { n: 3, counts: { hafs: 200, warsh: 200, qaloon: 200 } },
  ])),
}))

import 'fake-indexeddb/auto'
import { openDB, deleteDB, put } from '../../../src/core/db'
import {
  clearGlobalPosition,
  loadGlobalPosition,
  resolveSavedPositionTarget,
  saveGlobalPosition,
} from '../../../src/continuity/position'

describe('continuity/position', () => {
  it('owns the persisted currentPosition record without mutating configure state directly', async () => {
    try { await deleteDB() } catch { /* fresh DB */ }
    await openDB()

    await saveGlobalPosition(2, 255)
    await expect(loadGlobalPosition('qaloon')).resolves.toEqual({ surah: 2, verse: 255 })

    await clearGlobalPosition()
    await expect(loadGlobalPosition('qaloon')).resolves.toBeNull()
  })

  it('returns null for malformed persisted currentPosition values', async () => {
    try { await deleteDB() } catch { /* fresh DB */ }
    await openDB()

    await put('settings', { key: 'currentPosition', value: 'garbage' })

    await expect(loadGlobalPosition('qaloon')).resolves.toBeNull()
  })

  it('returns null for out-of-range numeric persisted currentPosition values', async () => {
    try { await deleteDB() } catch { /* fresh DB */ }
    await openDB()

    await put('settings', { key: 'currentPosition', value: { surah: 2, verse: 999 } })

    await expect(loadGlobalPosition('qaloon')).resolves.toBeNull()
  })

  it('returns a validated reader target for an in-range saved position when metadata is available', async () => {
    await expect(
      resolveSavedPositionTarget({ surah: 2, verse: 255 }, 'qaloon')
    ).resolves.toBe('#/s/2/255')
    await expect(resolveSavedPositionTarget({ surah: 2, verse: 286 }, 'qaloon')).resolves.toBeNull()
  })

  it('rejects malformed, signed, decimal, and out-of-range saved positions', async () => {
    await expect(resolveSavedPositionTarget({ surah: 0, verse: 1 }, 'qaloon')).resolves.toBeNull()
    await expect(resolveSavedPositionTarget({ surah: 2, verse: 999 }, 'qaloon')).resolves.toBeNull()
    await expect(resolveSavedPositionTarget({ surah: 2, verse: '255' }, 'qaloon')).resolves.toBeNull()
    await expect(resolveSavedPositionTarget({ surah: 2.5, verse: 1 }, 'qaloon')).resolves.toBeNull()
    await expect(resolveSavedPositionTarget({ surah: -2, verse: 1 }, 'qaloon')).resolves.toBeNull()
  })

  it('preserves a valid saved verse target when surah metadata is unavailable', async () => {
    const { getSurahs } = await import('../../../src/data/dataset')
    vi.mocked(getSurahs).mockRejectedValue(new Error('offline'))

    await expect(resolveSavedPositionTarget({ surah: 2, verse: 255 }, 'qaloon')).resolves.toBe('#/s/2/255')
    await expect(resolveSavedPositionTarget({ surah: 2, verse: 286 }, 'qaloon')).resolves.toBeNull()
  })

  it('preserves a valid saved verse target when the active riwayah count is missing', async () => {
    const { getSurahs } = await import('../../../src/data/dataset')
    vi.mocked(getSurahs).mockResolvedValueOnce([
      { n: 9, counts: { hafs: 129, warsh: 129, qaloon: undefined } },
    ])

    await expect(resolveSavedPositionTarget({ surah: 9, verse: 130 }, 'qaloon')).resolves.toBe('#/s/9/130')
    await expect(resolveSavedPositionTarget({ surah: 9, verse: 131 }, 'qaloon')).resolves.toBeNull()
  })

  it('keeps offline fallback boundaries aligned with the shipped surah counts across all surahs', async () => {
    const { getSurahs } = await import('../../../src/data/dataset')
    vi.mocked(getSurahs).mockRejectedValue(new Error('offline'))

    const surahs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'public/dataset/surahs.json'), 'utf8')
    ) as Array<{ counts: { hafs: number, warsh: number, qaloon: number } }>

    expect(surahs).toHaveLength(114)

    await Promise.all(
      surahs.flatMap((surah, index) => {
        const surahNo = index + 1
        return ([
          ['hafs', surah.counts.hafs],
          ['warsh', surah.counts.warsh],
          ['qaloon', surah.counts.qaloon],
        ] as const).flatMap(([riwayah, count]) => [
          expect(
            resolveSavedPositionTarget({ surah: surahNo, verse: count }, riwayah)
          ).resolves.toBe(`#/s/${surahNo}/${count}`),
          expect(
            resolveSavedPositionTarget({ surah: surahNo, verse: count + 1 }, riwayah)
          ).resolves.toBeNull(),
        ])
      })
    )
  })
})
