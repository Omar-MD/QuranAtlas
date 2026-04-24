import 'fake-indexeddb/auto'
import { vi } from 'vitest'
import { on } from '../../../src/core/events.js'

const BASE_INPUT = {
  threads: [], subjects: [], audience: [], speaker: [],
  quotedSpeaker: [], mode: [], form: [], tone: [],
  people: [], places: [], events: [], divineNames: [],
  note: '',
}

let store

beforeEach(async () => {
  const { deleteDB, openDB } = await import('../../../src/core/db.js')
  try { await deleteDB() } catch {}
  await openDB()
  store = await import('../../../src/marks/store.js')
})

describe('marks/store.js', () => {
  describe('save()', () => {
    it('creates a new mark with verseKey and layers', async () => {
      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['favourite', 'study'] })
      const mark = await store.getByVerseKey('2:255')
      expect(mark.verseKey).toBe('2:255')
      expect(mark.threads).toEqual(['favourite', 'study'])
      expect(mark.createdAt).toBeTypeOf('number')
      expect(mark.updatedAt).toBeTypeOf('number')
    })

    it('updates an existing mark (preserves createdAt, updates updatedAt)', async () => {
      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['favourite'] })
      const first = await store.getByVerseKey('2:255')

      await new Promise(r => setTimeout(r, 10))
      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['favourite', 'study'] })

      const updated = await store.getByVerseKey('2:255')
      expect(updated.threads).toEqual(['favourite', 'study'])
      expect(updated.createdAt).toBe(first.createdAt)
      expect(updated.updatedAt).toBeGreaterThanOrEqual(first.updatedAt)
    })

    it('computes _canon on write', async () => {
      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['Mercy'], people: ['Moses'] })
      const mark = await store.getByVerseKey('2:255')
      expect(mark._canon.threads).toEqual(['mercy'])
      expect(mark._canon.people).toEqual(['musa'])
    })

    it('emits marks:saved event', async () => {
      const received = []
      const unsub = on('marks:saved', (payload) => received.push(payload))

      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['favourite'] })
      expect(received).toHaveLength(1)
      expect(received[0].verseKey).toBe('2:255')

      unsub()
    })
  })

  describe('del()', () => {
    it('deletes a mark by verseKey', async () => {
      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['favourite'] })
      await store.del('2:255')
      const mark = await store.getByVerseKey('2:255')
      expect(mark).toBeUndefined()
    })

    it('emits marks:deleted event', async () => {
      const received = []
      const unsub = on('marks:deleted', (payload) => received.push(payload))

      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['favourite'] })
      await store.del('2:255')
      expect(received).toHaveLength(1)
      expect(received[0].verseKey).toBe('2:255')

      unsub()
    })
  })

  describe('getByVerseKey()', () => {
    it('returns undefined for non-existent mark', async () => {
      const mark = await store.getByVerseKey('999:999')
      expect(mark).toBeUndefined()
    })
  })

  describe('getAll()', () => {
    it('returns all marks', async () => {
      await store.save({ ...BASE_INPUT, verseKey: '1:1', threads: ['favourite'] })
      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['study'] })
      const all = await store.getAll()
      expect(all).toHaveLength(2)
    })
  })

  describe('getByLayerCanonical()', () => {
    it('returns marks matching a canonical value via the by-canon-threads index', async () => {
      await store.save({ ...BASE_INPUT, verseKey: '1:1', threads: ['favourite'] })
      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['study'] })
      await store.save({ ...BASE_INPUT, verseKey: '3:1', threads: ['favourite', 'study'] })

      const favs = await store.getByLayerCanonical('threads', 'favourite')
      expect(favs).toHaveLength(2)
      expect(favs.map(m => m.verseKey).sort()).toEqual(['1:1', '3:1'])
    })
  })

  describe('getByTag() legacy compat', () => {
    it('returns marks matching a tag via threads layer', async () => {
      await store.save({ ...BASE_INPUT, verseKey: '1:1', threads: ['favourite'] })
      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['study'] })

      const favs = await store.getByTag('favourite')
      expect(favs).toHaveLength(1)
      expect(favs[0].verseKey).toBe('1:1')
    })
  })

  describe('cross-tab broadcast', () => {
    it('calls broadcastMarkChange after save', async () => {
      const sync = await import('../../../src/safety/sync.js')
      const spy = vi.spyOn(sync, 'broadcastMarkChange')

      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['favourite'] })

      expect(spy).toHaveBeenCalledWith(['2:255'])
      spy.mockRestore()
    })

    it('calls broadcastMarkChange after delete', async () => {
      const sync = await import('../../../src/safety/sync.js')
      const spy = vi.spyOn(sync, 'broadcastMarkChange')

      await store.save({ ...BASE_INPUT, verseKey: '2:255', threads: ['favourite'] })
      spy.mockClear()

      await store.del('2:255')

      expect(spy).toHaveBeenCalledWith(['2:255'])
      spy.mockRestore()
    })
  })
})
