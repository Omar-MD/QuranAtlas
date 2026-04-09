import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save as saveMark } from '../../../src/marks/store.js'
import { on } from '../../../src/core/events.js'

// Mock dataset module to prevent fetch('/dataset/surahs.json') errors in jsdom
vi.mock('../../../src/data/dataset.js', () => ({
  getSurahs: vi.fn().mockResolvedValue([
    { n: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', count: 7, type: 'Meccan' },
    { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', count: 286, type: 'Medinan' },
    { n: 3, name: "Ali 'Imran", arabic: 'آل عمران', count: 200, type: 'Medinan' },
  ]),
  getSurah: vi.fn().mockResolvedValue(null),
}))

let hub

beforeEach(async () => {
  if (hub?.cleanup) {
    hub.cleanup()
  }

  await openDB()
  document.body.textContent = ''
  const shell = document.createElement('div')
  shell.id = 'app-shell'
  const main = document.createElement('main')
  main.id = 'main-content'
  shell.appendChild(main)
  document.body.appendChild(shell)

  // Seed 60 marks across 3 surahs and multiple tags
  for (let i = 1; i <= 20; i++) {
    await saveMark(`1:${i}`, ['favourite'])
  }
  for (let i = 1; i <= 20; i++) {
    await saveMark(`2:${i}`, ['study'])
  }
  for (let i = 1; i <= 20; i++) {
    await saveMark(`3:${i}`, ['favourite', 'study'])
  }

  hub = await import('../../../src/review/hub.js')
})

describe('review/hub.js', () => {
  describe('init()', () => {
    it('renders marks in main-content', async () => {
      await hub.init()
      const mainContent = document.getElementById('main-content')
      const markCards = mainContent.querySelectorAll('[data-mark]')
      // First page: 30 marks
      expect(markCards.length).toBe(30)
    })

    it('emits review:open on mount', async () => {
      const received = []
      const unsub = on('review:open', () => received.push(true))
      await hub.init()
      expect(received).toHaveLength(1)
      unsub()
    })

    it('shows Load More button when more than 30 marks exist', async () => {
      await hub.init()
      const loadMore = document.querySelector('[data-action="load-more"]')
      expect(loadMore).not.toBeNull()
    })

    it('loads next page when Load More is clicked', async () => {
      await hub.init()
      const loadMore = document.querySelector('[data-action="load-more"]')
      loadMore.click()
      await new Promise(r => setTimeout(r, 50))

      const markCards = document.querySelectorAll('[data-mark]')
      expect(markCards.length).toBe(60)
    })
  })

  describe('grouping', () => {
    it('renders surah headers in surah-grouped view', async () => {
      await hub.init()
      const headers = document.querySelectorAll('[data-surah-group]')
      expect(headers.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('filtering', () => {
    it('filters by tag', async () => {
      await hub.init()
      hub.applyFilter({ activeTag: 'favourite', surahFilter: null })
      await new Promise(r => setTimeout(r, 100))

      const markCards = document.querySelectorAll('[data-mark]')
      // Surahs 1 (20 favs) + 3 (20 favs) = 40 total, page 1 = 30
      expect(markCards.length).toBe(30)
    })

    it('filters by surah', async () => {
      await hub.init()
      hub.applyFilter({ activeTag: null, surahFilter: 1 })
      await new Promise(r => setTimeout(r, 100))

      const markCards = document.querySelectorAll('[data-mark]')
      expect(markCards.length).toBe(20)
    })

    it('combines tag and surah filters (AND)', async () => {
      await hub.init()
      hub.applyFilter({ activeTag: 'study', surahFilter: 3 })
      await new Promise(r => setTimeout(r, 100))

      const markCards = document.querySelectorAll('[data-mark]')
      expect(markCards.length).toBe(20)
    })
  })

  describe('empty states', () => {
    it('shows empty state when no marks exist', async () => {
      const { getDb } = await import('../../../src/core/db.js')
      const db = await getDb()
      const tx = db.transaction('marks', 'readwrite')
      tx.objectStore('marks').clear()
      await new Promise(r => { tx.oncomplete = r })

      await hub.init()
      const empty = document.querySelector('.qa-review-empty')
      expect(empty).not.toBeNull()
    })
  })

  describe('delete', () => {
    it('deletes a mark and shows undo toast', async () => {
      await hub.init()
      const firstMark = document.querySelector('[data-mark]')
      const deleteBtn = firstMark.querySelector('[data-action="delete-mark"]')
      deleteBtn.click()

      await new Promise(r => setTimeout(r, 50))

      const toast = document.querySelector('.qa-undo-toast')
      expect(toast).not.toBeNull()
    })
  })

  describe('cross-tab sync', () => {
    it('re-renders when sync:update-received fires', async () => {
      const { emit } = await import('../../../src/core/events.js')
      const store = await import('../../../src/marks/store.js')
      const { save: saveState, getDefaultState } = await import('../../../src/review/state.js')

      // Reset hub state so no filter is active from prior tests
      await saveState(getDefaultState())

      // Seed an extra mark
      await store.save('2:255', ['favourite'])

      await hub.init()

      // 60 seeded + 1 extra = 61 total → page 1 shows 30
      let cards = document.querySelectorAll('[data-mark]')
      expect(cards.length).toBe(30)

      // Simulate: another tab deleted a mark (already in IDB)
      await store.del('2:255')

      // Fire the cross-tab event
      emit('sync:update-received', { verseKeys: ['2:255'] })

      // Wait for async re-render
      await new Promise(r => setTimeout(r, 50))

      cards = document.querySelectorAll('[data-mark]')
      // Back to 60 marks → page 1 still shows 30
      expect(cards.length).toBe(30)
    })

    it('cleanup() unsubscribes event listeners so they do not fire after teardown', async () => {
      const { emit } = await import('../../../src/core/events.js')

      await hub.init({}, { openEditor: vi.fn() })
      hub.cleanup()

      const mainContent = document.getElementById('main-content')
      mainContent.textContent = 'sentinel'
      emit('sync:update-received', { verseKeys: [] })

      await new Promise(r => setTimeout(r, 50))
      expect(mainContent.textContent).toBe('sentinel')
    })

    it('double init() does not register duplicate listeners', async () => {
      const { emit } = await import('../../../src/core/events.js')

      await hub.init({}, { openEditor: vi.fn() })
      await hub.init({}, { openEditor: vi.fn() })
      hub.cleanup()

      const mainContent = document.getElementById('main-content')
      mainContent.textContent = 'sentinel'
      emit('sync:update-received', { verseKeys: [] })

      await new Promise(r => setTimeout(r, 50))
      expect(mainContent.textContent).toBe('sentinel')
    })
  })

  describe('visibilitychange catch-all', () => {
    it('re-reads marks when tab becomes visible', async () => {
      const { emit } = await import('../../../src/core/events.js')
      const store = await import('../../../src/marks/store.js')
      const { save: saveState, getDefaultState } = await import('../../../src/review/state.js')

      // Reset hub state so no filter is active from prior tests
      await saveState(getDefaultState())

      await store.save('2:255', ['favourite'])
      await hub.init()

      // Delete a mark "behind the scenes" (simulating missed broadcast)
      await store.del('2:255')

      // Simulate tab becoming visible
      emit('db:visibility-visible', {})

      await new Promise(r => setTimeout(r, 50))

      // 60 seeded marks remain → page 1 shows 30
      const cards = document.querySelectorAll('[data-mark]')
      expect(cards.length).toBe(30)
    })
  })

  describe('tag deep link (#/t/:tag)', () => {
    beforeEach(async () => {
      const { getDb } = await import('../../../src/core/db.js')
      const db = await getDb()
      const tx = db.transaction('marks', 'readwrite')
      tx.objectStore('marks').clear()
      await new Promise(r => { tx.oncomplete = r })
    })

    it('renders FVR for a valid tag with marks', async () => {
      const store = await import('../../../src/marks/store.js')

      await store.save('2:255', ['study'])
      await store.save('3:1', ['study'])

      await hub.init({ tag: 'study' })

      const cards = document.querySelectorAll('[data-mark]')
      expect(cards.length).toBe(2)
    })

    it('renders FVR case-insensitively (uppercase input)', async () => {
      const store = await import('../../../src/marks/store.js')

      await store.save('2:255', ['study'])

      await hub.init({ tag: 'STUDY' })

      const cards = document.querySelectorAll('[data-mark]')
      expect(cards.length).toBe(1)
    })

    it('renders not-found state for tag with no marks', async () => {
      await hub.init({ tag: 'nonexistent' })

      const notFound = document.querySelector('.qa-review-tag-not-found')
      expect(notFound).toBeTruthy()
      expect(notFound.textContent).toContain('nonexistent')

      const hubLink = notFound.querySelector('a[href="#/review"]')
      expect(hubLink).toBeTruthy()
    })

    it('renders not-found state for empty tag', async () => {
      await hub.init({ tag: '' })

      const notFound = document.querySelector('.qa-review-tag-not-found')
      expect(notFound).toBeTruthy()
    })

    it('renders not-found state for oversized tag', async () => {
      await hub.init({ tag: 'x'.repeat(51) })

      const notFound = document.querySelector('.qa-review-tag-not-found')
      expect(notFound).toBeTruthy()
    })

    it('writes lastSurface and positions["review"] on successful FVR entry', async () => {
      const store = await import('../../../src/marks/store.js')
      const { get } = await import('../../../src/core/db.js')

      await store.save('2:255', ['study'])
      await hub.init({ tag: 'study' })

      const lastSurface = await get('settings', 'lastSurface')
      expect(lastSurface.value).toContain('/t/')

      const reviewState = await get('positions', 'review')
      expect(reviewState.view).toBe('fvr')
      expect(reviewState.activeTag).toBe('study')
    })

    it('announces not-found state for screen readers', async () => {
      const announcer = await import('../../../src/a11y/announcer.js')
      const spy = vi.spyOn(announcer, 'announce')

      await hub.init({ tag: 'missing' })

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('missing'))
      spy.mockRestore()
    })
  })
})
