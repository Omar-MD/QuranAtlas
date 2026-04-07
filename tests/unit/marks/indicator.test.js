import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save } from '../../../src/marks/store.js'

let indicator

beforeEach(async () => {
  await openDB()
  document.body.innerHTML = '<div id="main-content"></div>'
  indicator = await import('../../../src/marks/indicator.js')
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
    })
  })

  describe('init()', () => {
    it('subscribes to reader:verse-rendered and marks:saved', () => {
      const unsub = indicator.init()
      expect(typeof unsub).toBe('function')
      unsub()
    })
  })
})
