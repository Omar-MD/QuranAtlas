import 'fake-indexeddb/auto'
import { vi } from 'vitest'
import { openDB } from '../../../src/core/db.js'
import { on } from '../../../src/core/events.js'

let store

beforeEach(async () => {
  await openDB()
  store = await import('../../../src/marks/store.js')
})

describe('marks/store.js', () => {
  describe('save()', () => {
    it('creates a new mark with verseKey and tags', async () => {
      await store.save('2:255', ['favourite', 'study'])
      const mark = await store.getByVerseKey('2:255')
      expect(mark.verseKey).toBe('2:255')
      expect(mark.tags).toEqual(['favourite', 'study'])
      expect(mark.createdAt).toBeTypeOf('number')
      expect(mark.updatedAt).toBeTypeOf('number')
    })

    it('updates an existing mark (preserves createdAt, updates updatedAt)', async () => {
      await store.save('2:255', ['favourite'])
      const first = await store.getByVerseKey('2:255')

      // Small delay to ensure updatedAt differs
      await new Promise(r => setTimeout(r, 10))
      await store.save('2:255', ['favourite', 'study'])

      const updated = await store.getByVerseKey('2:255')
      expect(updated.tags).toEqual(['favourite', 'study'])
      expect(updated.createdAt).toBe(first.createdAt)
      expect(updated.updatedAt).toBeGreaterThanOrEqual(first.updatedAt)
    })

    it('emits marks:saved event', async () => {
      const received = []
      const unsub = on('marks:saved', (payload) => received.push(payload))

      await store.save('2:255', ['favourite'])
      expect(received).toHaveLength(1)
      expect(received[0].verseKey).toBe('2:255')

      unsub()
    })
  })

  describe('del()', () => {
    it('deletes a mark by verseKey', async () => {
      await store.save('2:255', ['favourite'])
      await store.del('2:255')
      const mark = await store.getByVerseKey('2:255')
      expect(mark).toBeUndefined()
    })

    it('emits marks:deleted event', async () => {
      const received = []
      const unsub = on('marks:deleted', (payload) => received.push(payload))

      await store.save('2:255', ['favourite'])
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
      await store.save('1:1', ['favourite'])
      await store.save('2:255', ['study'])
      const all = await store.getAll()
      expect(all).toHaveLength(2)
    })
  })

  describe('getByTag()', () => {
    it('returns marks matching a tag via the by-tag index', async () => {
      await store.save('1:1', ['favourite'])
      await store.save('2:255', ['study'])
      await store.save('3:1', ['favourite', 'study'])

      const favs = await store.getByTag('favourite')
      expect(favs).toHaveLength(2)
      expect(favs.map(m => m.verseKey).sort()).toEqual(['1:1', '3:1'])
    })
  })

  describe('cross-tab broadcast', () => {
    it('calls broadcastMarkChange after save', async () => {
      const sync = await import('../../../src/safety/sync.js')
      const spy = vi.spyOn(sync, 'broadcastMarkChange')

      await store.save('2:255', ['favourite'])

      expect(spy).toHaveBeenCalledWith(['2:255'])
      spy.mockRestore()
    })

    it('calls broadcastMarkChange after delete', async () => {
      const sync = await import('../../../src/safety/sync.js')
      const spy = vi.spyOn(sync, 'broadcastMarkChange')

      await store.save('2:255', ['favourite'])
      spy.mockClear()

      await store.del('2:255')

      expect(spy).toHaveBeenCalledWith(['2:255'])
      spy.mockRestore()
    })
  })
})
