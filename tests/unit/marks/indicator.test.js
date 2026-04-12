import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save } from '../../../src/marks/store.js'
import { getColorForTag } from '../../../src/marks/tags.js'

let indicator
let events
let store

function waitForIndicatorWork() {
  return new Promise((resolve) => setTimeout(resolve, 50))
}

beforeEach(async () => {
  vi.resetModules()
  await openDB()
  document.body.innerHTML = '<div id="main-content"></div>'
  indicator = await import('../../../src/marks/indicator.js')
  events = await import('../../../src/core/events.js')
  store = await import('../../../src/marks/store.js')
})

describe('marks/indicator.js', () => {
  describe('decorateVerse()', () => {
    it('adds colored dots to a verse element that has marks', async () => {
      await save('2:255', ['favourite', 'study'])

      const verseEl = document.createElement('div')
      verseEl.setAttribute('data-verse', '255')

      await indicator.decorateVerse('2:255', verseEl)

      const dots = verseEl.querySelector('.qa-mark-dots')
      expect(dots).not.toBeNull()
      expect(dots.children).toHaveLength(2)
      const firstDot = dots.children[0]
      expect(firstDot.style.backgroundColor).toBeTruthy()
    })

    it('does not add dots to an unmarked verse', async () => {
      const verseEl = document.createElement('div')
      verseEl.setAttribute('data-verse', '1')

      await indicator.decorateVerse('1:1', verseEl)

      const dots = verseEl.querySelector('.qa-mark-dots')
      expect(dots).toBeNull()
    })

    it('removes old dots before adding new ones (re-decoration)', async () => {
      await save('2:255', ['favourite'])
      const verseEl = document.createElement('div')

      await indicator.decorateVerse('2:255', verseEl)
      expect(verseEl.querySelector('.qa-mark-dots').children).toHaveLength(1)

      await save('2:255', ['favourite', 'study', 'reflection'])
      await indicator.decorateVerse('2:255', verseEl)
      expect(verseEl.querySelector('.qa-mark-dots').children).toHaveLength(3)
      const dot = verseEl.querySelector('.qa-mark-dots').children[0]
      expect(dot.style.backgroundColor).toBeTruthy()
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

      // Create a verse element
      const verse = document.createElement('div')
      verse.setAttribute('data-verse-key', '2:255')
      document.body.appendChild(verse)

      // Decorate it initially
      await indicator.decorateVerse('2:255', verse)
      expect(verse.querySelector('.qa-mark-dots')).toBeTruthy()

      // Register sync listener
      indicator.init()

      // Delete the mark (simulating another tab)
      await store.del('2:255')

      // Fire sync event
      events.emit('sync:update-received', { verseKeys: ['2:255'] })

      // Wait for async re-decoration
      await waitForIndicatorWork()

      expect(verse.querySelector('.qa-mark-dots')).toBeFalsy()
    })

    it('removes dots when marks:deleted fires for a rendered verse', async () => {
      await save('1:1', ['favourite'])

      const verse = document.createElement('div')
      verse.setAttribute('data-verse-key', '1:1')
      document.body.appendChild(verse)

      await indicator.decorateVerse('1:1', verse)
      expect(verse.querySelector('.qa-mark-dots')).toBeTruthy()

      indicator.init()
      events.emit('marks:deleted', { verseKey: '1:1' })

      expect(verse.querySelector('.qa-mark-dots')).toBeFalsy()
    })

    it('re-decorates a rendered verse when marks:undo restores it', async () => {
      await save('1:2', ['study'])

      const verse = document.createElement('div')
      verse.setAttribute('data-verse-key', '1:2')
      document.body.appendChild(verse)

      indicator.init()
      events.emit('reader:surah-loaded')
      await waitForIndicatorWork()

      events.emit('marks:undo', { verseKey: '1:2' })
      await waitForIndicatorWork()

      expect(verse.querySelector('.qa-mark-dots')).toBeTruthy()
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
      events.emit('reader:surah-loaded')
      await waitForIndicatorWork()

      await indicator.decorateVerse('1:3', verse3)
      await indicator.decorateVerse('1:4', verse4)
      expect(verse3.querySelectorAll('.qa-mark-dot')).toHaveLength(1)
      expect(verse4.querySelectorAll('.qa-mark-dot')).toHaveLength(1)

      await store.save('1:3', ['study', 'reflection'])
      await store.del('1:4')

      events.emit('db:visibility:visible')
      await waitForIndicatorWork()

      expect(verse3.querySelectorAll('.qa-mark-dot')).toHaveLength(2)
      expect(verse4.querySelector('.qa-mark-dots')).toBeFalsy()
    })

    it('decorates newly rendered verses from the in-memory cache after surah load', async () => {
      await save('1:5', ['favourite'])

      const verse = document.createElement('div')
      verse.setAttribute('data-verse-key', '1:5')

      indicator.init()
      events.emit('reader:surah-loaded')
      await waitForIndicatorWork()

      events.emit('reader:verse-rendered', {
        verseKey: '1:5',
        element: verse,
      })
      await waitForIndicatorWork()

      expect(verse.querySelector('.qa-mark-dots')).toBeTruthy()
    })
  })
})
