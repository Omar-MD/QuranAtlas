import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { save, getByVerseKey } from '../../../src/marks/store'

beforeEach(async () => {
  const { deleteDB, openDB } = await import('../../../src/core/db')
  try { await deleteDB() } catch {}
  await openDB()
})

describe('marks/store save()', () => {
  it('computes _canon for every layer on write', async () => {
    await save({
      verseKey: '2:255',
      threads: ['Mercy'],
      subjects: [],
      audience: ["Mu'minin"],
      speaker: ['Allah'],
      quotedSpeaker: [],
      mode: [], form: [], tone: [],
      people: ['Moses'],
      places: [], events: [], divineNames: [],
      flags: {},
      note: '',
    })
    const got = await getByVerseKey('2:255')
    expect(got?.audience).toEqual(["Mu'minin"])
    expect(got?._canon.audience).toEqual(['muminin'])
    expect(got?._canon.people).toEqual(['musa'])
    expect(got?.createdAt).toBeGreaterThan(0)
    expect(got?.updatedAt).toBeGreaterThanOrEqual(got!.createdAt)
  })

  it('preserves createdAt on update', async () => {
    const baseRecord = {
      verseKey: '2:255',
      threads: [], subjects: [], audience: [], speaker: [],
      quotedSpeaker: [], mode: [], form: [], tone: [],
      people: [], places: [], events: [], divineNames: [],
      flags: {}, note: '',
    }
    await save(baseRecord)
    const first = await getByVerseKey('2:255')
    await new Promise(r => setTimeout(r, 5))
    await save({ ...baseRecord, threads: ['mercy'] })
    const second = await getByVerseKey('2:255')
    expect(second?.createdAt).toBe(first?.createdAt)
    expect(second?.updatedAt).toBeGreaterThan(first!.updatedAt)
  })
})
