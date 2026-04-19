import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save as saveMark } from '../../../src/marks/store.js'
import { on } from '../../../src/core/events.js'
import { Events } from '../../../src/core/constants.js'

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
let cleanup

beforeEach(async () => {
  cleanup?.()
  cleanup = undefined

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
      // Flat de-duped view: exactly PAGE_SIZE (30) unique marks on first page
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
      // All 60 marks loaded flat (no duplicates)
      expect(markCards.length).toBe(60)
    })
  })

  describe('grouping', () => {
    it('renders each mark exactly once regardless of tag count', async () => {
      await hub.init()
      const cards = document.querySelectorAll('[data-mark="3:1"]')
      // 3:1 has 2 tags ('favourite', 'study') — should appear exactly once
      expect(cards.length).toBe(1)
    })
  })

  describe('tag-grouped view', () => {
    it('does not render .qa-review-surah-header or .qa-review-tag-header', async () => {
      await hub.init()
      expect(document.querySelectorAll('.qa-review-surah-header').length).toBe(0)
      expect(document.querySelectorAll('.qa-review-tag-header').length).toBe(0)
    })

    it('does not render surah sub-headers', async () => {
      await hub.init()
      const surahHeaders = document.querySelectorAll('[data-surah-group]')
      expect(surahHeaders.length).toBe(0)
    })

    it('multi-tagged mark renders exactly once (no duplication)', async () => {
      await hub.init()
      // Load all pages
      const loadMore = document.querySelector('[data-action="load-more"]')
      if (loadMore) { loadMore.click(); await new Promise(r => setTimeout(r, 50)) }
      const all = document.querySelectorAll('[data-mark]')
      const keys = [...all].map(c => c.getAttribute('data-mark'))
      const unique = new Set(keys)
      expect(unique.size).toBe(keys.length)
    })

    it('mark cards show all tags as chips regardless of which group they are in', async () => {
      await hub.init()
      // Find a card that should have 2 tags
      const cards = document.querySelectorAll('[data-mark]')
      const multiTagCard = [...cards].find(c => c.querySelectorAll('.qa-review-card-chip').length > 1)
      // marks 3:1–3:20 all have ['favourite', 'study']
      expect(multiTagCard).toBeTruthy()
    })
  })

  describe('group controls', () => {
    it('renders group segment pill with tag/surah/date options', async () => {
      await hub.init()
      const groupSeg = document.querySelector('.qa-review-seg')
      expect(groupSeg).not.toBeNull()
      const buttons = [...groupSeg.querySelectorAll('[data-group]')].map(b => b.getAttribute('data-group'))
      expect(buttons).toContain('tag')
      expect(buttons).toContain('surah')
      expect(buttons).toContain('flat')
    })

    it('renders sort dropdown', async () => {
      await hub.init()
      const sortSelect = document.querySelector('[data-control="sort"]')
      expect(sortSelect).not.toBeNull()
      expect(sortSelect.tagName).toBe('SELECT')
    })

    it('renders tag filter dropdown', async () => {
      await hub.init()
      const tagSelect = document.querySelector('[data-control="tag"]')
      expect(tagSelect).not.toBeNull()
    })

    it('renders surah filter dropdown with only surahs that have marks', async () => {
      await hub.init()
      const surahSelect = document.querySelector('[data-control="surah"]')
      expect(surahSelect).not.toBeNull()
      // We have marks in surahs 1, 2, 3 — so 3 + "All" = 4 options
      expect(surahSelect.options.length).toBe(4)
    })

    it('switching group to surah updates the view', async () => {
      await hub.init()
      const surahBtn = document.querySelector('.qa-review-seg [data-group="surah"]')
      surahBtn.click()
      await new Promise(r => setTimeout(r, 100))
      // No tag or surah headers — flat render regardless of groupBy
      expect(document.querySelectorAll('.qa-review-tag-header').length).toBe(0)
      expect(document.querySelectorAll('[data-surah-group]').length).toBe(0)
      // But cards still render
      expect(document.querySelectorAll('[data-mark]').length).toBeGreaterThan(0)
    })
  })

  describe('active filter chips', () => {
    it('shows filter chips when tag filter is active', async () => {
      await hub.init()
      const tagSelect = document.querySelector('[data-control="tag"]')
      tagSelect.value = 'favourite'
      tagSelect.dispatchEvent(new Event('change'))
      await new Promise(r => setTimeout(r, 100))
      const chips = document.querySelectorAll('.qa-review-filter-chip')
      expect(chips.length).toBeGreaterThanOrEqual(1)
    })

    it('clearing a filter chip resets that filter', async () => {
      await hub.init()
      const tagSelect = document.querySelector('[data-control="tag"]')
      tagSelect.value = 'favourite'
      tagSelect.dispatchEvent(new Event('change'))
      await new Promise(r => setTimeout(r, 100))
      const chipDismiss = document.querySelector('.qa-review-filter-chip button')
      chipDismiss.click()
      await new Promise(r => setTimeout(r, 100))
      // Tag filter should be reset
      const tagSelectAfter = document.querySelector('[data-control="tag"]')
      expect(tagSelectAfter.value).toBe('')
    })
  })

  describe('filtering', () => {
    it('filters by tag', async () => {
      await hub.init()
      hub.applyFilter({ activeTag: 'favourite', surahFilter: null })
      await new Promise(r => setTimeout(r, 10))

      const markCards = document.querySelectorAll('[data-mark]')
      // Surahs 1 (20 favs) + 3 (20 favs) = 40 total, page 1 = 30
      expect(markCards.length).toBe(30)
    })

    it('filters by surah', async () => {
      await hub.init()
      hub.applyFilter({ activeTag: null, surahFilter: 1 })
      await new Promise(r => setTimeout(r, 10))

      const markCards = document.querySelectorAll('[data-mark]')
      expect(markCards.length).toBe(20)
    })

    it('combines tag and surah filters (AND)', async () => {
      await hub.init()
      hub.applyFilter({ activeTag: 'study', surahFilter: 3 })
      await new Promise(r => setTimeout(r, 10))

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
    it('calls openEditor when a mark card body is clicked', async () => {
      const openEditor = vi.fn()
      await hub.init({}, { openEditor })
      const firstMark = document.querySelector('[data-mark]')
      firstMark.click()
      expect(openEditor).toHaveBeenCalled()
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

      // 61 total unique marks → page 1 = 30
      let cards = document.querySelectorAll('[data-mark]')
      expect(cards.length).toBe(30)

      // Simulate: another tab deleted a mark (already in IDB)
      await store.del('2:255')

      // Fire the cross-tab event
      emit(Events.SYNC_UPDATE_RECEIVED, { verseKeys: ['2:255'] })

      // Wait for async re-render
      await new Promise(r => setTimeout(r, 50))

      cards = document.querySelectorAll('[data-mark]')
      // Back to 60 marks → page 1 = 30 unique
      expect(cards.length).toBe(30)
    })

    it('cleanup() unsubscribes event listeners so they do not fire after teardown', async () => {
      const { emit } = await import('../../../src/core/events.js')

      cleanup = await hub.init({}, { openEditor: vi.fn() })
      cleanup()
      cleanup = undefined

      const mainContent = document.getElementById('main-content')
      mainContent.textContent = 'sentinel'
      emit(Events.SYNC_UPDATE_RECEIVED, { verseKeys: [] })

      await new Promise(r => setTimeout(r, 50))
      expect(mainContent.textContent).toBe('sentinel')
    })

    it('double init() does not register duplicate listeners', async () => {
      const { emit } = await import('../../../src/core/events.js')

      await hub.init({}, { openEditor: vi.fn() })
      cleanup = await hub.init({}, { openEditor: vi.fn() })
      cleanup()
      cleanup = undefined

      const mainContent = document.getElementById('main-content')
      mainContent.textContent = 'sentinel'
      emit(Events.SYNC_UPDATE_RECEIVED, { verseKeys: [] })

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
      emit(Events.DB_VISIBILITY_VISIBLE, {})

      await new Promise(r => setTimeout(r, 50))

      // 60 seeded marks remain → page 1 = 30 unique
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
