import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save } from '../../../src/marks/store.js'
import { Events } from '../../../src/core/constants.js'

let indicator
let events
let store

function waitForIndicatorWork() {
  return new Promise((resolve) => setTimeout(resolve, 50))
}

beforeEach(async () => {
  vi.resetModules()
  await openDB()
  while (document.body.firstChild) { document.body.removeChild(document.body.firstChild) }
  const main = document.createElement('div')
  main.id = 'main-content'
  document.body.appendChild(main)
  indicator = await import('../../../src/marks/indicator.js')
  events = await import('../../../src/core/events.js')
  store = await import('../../../src/marks/store.js')
})

describe('marks/indicator.js', () => {
  describe('decorateVerse()', () => {
    it('adds qa-verse--bookmarked class to a verse element that has marks', async () => {
      await save('2:255', ['favourite', 'study'])

      const verseEl = document.createElement('div')
      verseEl.setAttribute('data-verse', '255')

      await indicator.decorateVerse('2:255', verseEl)

      expect(verseEl.classList.contains('qa-verse--bookmarked')).toBe(true)
    })

    it('does not add qa-verse--bookmarked to an unmarked verse', async () => {
      const verseEl = document.createElement('div')
      verseEl.setAttribute('data-verse', '1')

      await indicator.decorateVerse('1:1', verseEl)

      expect(verseEl.classList.contains('qa-verse--bookmarked')).toBe(false)
    })

    it('removes stale bookmark class before re-decorating (no mark → no class)', async () => {
      await save('2:255', ['favourite'])
      const verseEl = document.createElement('div')

      await indicator.decorateVerse('2:255', verseEl)
      expect(verseEl.classList.contains('qa-verse--bookmarked')).toBe(true)

      await store.del('2:255')
      await indicator.decorateVerse('2:255', verseEl)
      expect(verseEl.classList.contains('qa-verse--bookmarked')).toBe(false)
    })
  })

  describe('init()', () => {
    it('subscribes to reader:verse-rendered and marks:saved', () => {
      const unsub = indicator.init()
      expect(typeof unsub).toBe('function')
      unsub()
    })
  })

  describe('cross-tab sync', () => {
    it('re-decorates verse when sync:update-received fires', async () => {
      await store.save('2:255', ['favourite'])

      const verse = document.createElement('div')
      verse.setAttribute('data-verse-key', '2:255')
      document.body.appendChild(verse)

      await indicator.decorateVerse('2:255', verse)
      expect(verse.classList.contains('qa-verse--bookmarked')).toBe(true)

      indicator.init()

      await store.del('2:255')
      events.emit(Events.SYNC_UPDATE_RECEIVED, { verseKeys: ['2:255'] })
      await waitForIndicatorWork()

      expect(verse.classList.contains('qa-verse--bookmarked')).toBe(false)
    })

    it('removes bookmark class when marks:deleted fires for a rendered verse', async () => {
      await save('1:1', ['favourite'])

      const verse = document.createElement('div')
      verse.setAttribute('data-verse-key', '1:1')
      document.body.appendChild(verse)

      await indicator.decorateVerse('1:1', verse)
      expect(verse.classList.contains('qa-verse--bookmarked')).toBe(true)

      indicator.init()
      events.emit(Events.MARKS_DELETED, { verseKey: '1:1' })

      expect(verse.classList.contains('qa-verse--bookmarked')).toBe(false)
    })

    it('re-decorates a rendered verse when marks:undo restores it', async () => {
      await save('1:2', ['study'])

      const verse = document.createElement('div')
      verse.setAttribute('data-verse-key', '1:2')
      document.body.appendChild(verse)

      indicator.init()
      events.emit(Events.READER_SURAH_LOADED)
      await waitForIndicatorWork()

      events.emit(Events.MARKS_UNDO, { verseKey: '1:2' })
      await waitForIndicatorWork()

      expect(verse.classList.contains('qa-verse--bookmarked')).toBe(true)
    })

    it('reconciles changed and removed marks on db:visibility:visible', async () => {
      await save('1:3', ['study'])
      await save('1:4', ['reflection'])

      const verse3 = document.createElement('div')
      verse3.setAttribute('data-verse-key', '1:3')
      const verse4 = document.createElement('div')
      verse4.setAttribute('data-verse-key', '1:4')
      document.body.appendChild(verse3)
      document.body.appendChild(verse4)

      indicator.init()
      events.emit(Events.READER_SURAH_LOADED)
      await waitForIndicatorWork()

      await indicator.decorateVerse('1:3', verse3)
      await indicator.decorateVerse('1:4', verse4)
      expect(verse3.classList.contains('qa-verse--bookmarked')).toBe(true)
      expect(verse4.classList.contains('qa-verse--bookmarked')).toBe(true)

      await store.save('1:3', ['study', 'reflection'])
      await store.del('1:4')

      events.emit(Events.DB_VISIBILITY_VISIBLE)
      await waitForIndicatorWork()

      expect(verse3.classList.contains('qa-verse--bookmarked')).toBe(true)
      expect(verse4.classList.contains('qa-verse--bookmarked')).toBe(false)
    })

    it('decorates newly rendered verses from the in-memory cache after surah load', async () => {
      await save('1:5', ['favourite'])

      const verse = document.createElement('div')
      verse.setAttribute('data-verse-key', '1:5')

      indicator.init()
      events.emit(Events.READER_SURAH_LOADED)
      await waitForIndicatorWork()

      events.emit(Events.READER_VERSE_RENDERED, {
        verseKey: '1:5',
        element: verse,
      })
      await waitForIndicatorWork()

      expect(verse.classList.contains('qa-verse--bookmarked')).toBe(true)
    })
  })
})
