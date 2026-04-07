# Story 5: Review Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Review Hub at `#/review` showing all marked verses with surah grouping, flat view, tag/surah filtering, sorting, pagination, delete with undo, and session restore.

**Architecture:** `review/hub.js` renders the All Marks view with grouping, filtering, sorting, and pagination. `review/state.js` persists view preferences to IDB `positions["review"]`. The router writes `settings["lastSurface"]` on every route change (already implemented in `router.js:75`). Launch restore in `app.js` already reads `lastSurface` and routes accordingly. A top bar icon provides permanent access.

**Tech Stack:** Vanilla JS, IDB via `src/core/db.js`, pub/sub via `src/core/events.js`, Vitest + fake-indexeddb + jsdom

---

### Task 1: Add review event constants

**Files:**
- Modify: `src/core/constants.js`

- [ ] **Step 1: Add review event constants**

```js
// Add to the Events object in src/core/constants.js:
REVIEW_OPEN: 'review:open',
REVIEW_FILTER: 'review:filter',
```

- [ ] **Step 2: Commit**

```bash
git add src/core/constants.js
git commit -m "feat(review): add review event constants"
```

---

### Task 2: Implement review state persistence

**Files:**
- Modify: `src/review/state.js`
- Create: `tests/unit/review/state.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/review/state.test.js`:

```js
import 'fake-indexeddb/auto'
import { openDB, get } from '../../../src/core/db.js'

let state

beforeEach(async () => {
  await openDB()
  state = await import('../../../src/review/state.js')
})

describe('review/state.js', () => {
  describe('save()', () => {
    it('writes review state to positions["review"]', async () => {
      await state.save({
        view: 'all',
        activeTag: null,
        surahFilter: null,
        sortBy: 'updatedAt',
        groupBy: 'surah',
      })

      const record = await get('positions', 'review')
      expect(record.id).toBe('review')
      expect(record.sortBy).toBe('updatedAt')
      expect(record.groupBy).toBe('surah')
    })
  })

  describe('load()', () => {
    it('returns null when no saved state', async () => {
      const result = await state.load()
      expect(result).toBeNull()
    })

    it('returns saved state', async () => {
      await state.save({
        view: 'all',
        activeTag: 'favourite',
        surahFilter: 2,
        sortBy: 'createdAt',
        groupBy: 'flat',
      })

      const result = await state.load()
      expect(result.activeTag).toBe('favourite')
      expect(result.surahFilter).toBe(2)
      expect(result.sortBy).toBe('createdAt')
      expect(result.groupBy).toBe('flat')
    })
  })

  describe('getDefaultState()', () => {
    it('returns default state values', () => {
      const defaults = state.getDefaultState()
      expect(defaults).toEqual({
        view: 'all',
        activeTag: null,
        surahFilter: null,
        sortBy: 'updatedAt',
        groupBy: 'surah',
      })
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/review/state.test.js`
Expected: FAIL -- `getDefaultState` not exported, `save`/`load` are stubs

- [ ] **Step 3: Implement review state**

Replace `src/review/state.js` with:

```js
/**
 * Review state persistence.
 * Persists/restores view mode, filters, sort, and grouping to IDB positions["review"].
 * Written on every state change (immediate, no debounce).
 */

import { get, put } from '../core/db.js'

const POSITION_ID = 'review'

const DEFAULT_STATE = {
  view: 'all',
  activeTag: null,
  surahFilter: null,
  sortBy: 'updatedAt',
  groupBy: 'surah',
}

/**
 * Get default review state.
 * @returns {object}
 */
export function getDefaultState() {
  return { ...DEFAULT_STATE }
}

/**
 * Save review state to IDB.
 * @param {object} reviewState
 */
export async function save(reviewState) {
  await put('positions', {
    id: POSITION_ID,
    surah: 0,
    verse: 0,
    savedAt: Date.now(),
    ...reviewState,
  })
}

/**
 * Load review state from IDB.
 * @returns {Promise<object|null>}
 */
export async function load() {
  const record = await get('positions', POSITION_ID)
  if (!record) return null
  return {
    view: record.view ?? DEFAULT_STATE.view,
    activeTag: record.activeTag ?? DEFAULT_STATE.activeTag,
    surahFilter: record.surahFilter ?? DEFAULT_STATE.surahFilter,
    sortBy: record.sortBy ?? DEFAULT_STATE.sortBy,
    groupBy: record.groupBy ?? DEFAULT_STATE.groupBy,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/review/state.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/review/state.js tests/unit/review/state.test.js
git commit -m "feat(review): implement review state persistence"
```

---

### Task 3: Implement Review Hub (All Marks view)

**Files:**
- Modify: `src/review/hub.js`
- Create: `tests/unit/review/hub.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/review/hub.test.js`:

```js
import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save as saveMark } from '../../../src/marks/store.js'
import { on } from '../../../src/core/events.js'

let hub

beforeEach(async () => {
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
      await new Promise(r => setTimeout(r, 50))

      const markCards = document.querySelectorAll('[data-mark]')
      // Surahs 1 (20 favs) + 3 (20 favs) = 40 total, page 1 = 30
      expect(markCards.length).toBe(30)
    })

    it('filters by surah', async () => {
      await hub.init()
      hub.applyFilter({ activeTag: null, surahFilter: 1 })
      await new Promise(r => setTimeout(r, 50))

      const markCards = document.querySelectorAll('[data-mark]')
      expect(markCards.length).toBe(20)
    })

    it('combines tag and surah filters (AND)', async () => {
      await hub.init()
      hub.applyFilter({ activeTag: 'study', surahFilter: 3 })
      await new Promise(r => setTimeout(r, 50))

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
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/review/hub.test.js`
Expected: FAIL -- `hub.init` is a stub

- [ ] **Step 3: Implement Review Hub**

Replace `src/review/hub.js` with:

```js
/**
 * Review hub: All Marks view.
 * Surah-grouped and flat views, tag/surah filtering, sort, pagination.
 */

import { getAll, getByTag, del as deleteMark, save as saveMark } from '../marks/store.js'
import { getColorForTag } from '../marks/tags.js'
import { getSurahs } from '../data/dataset.js'
import { emit } from '../core/events.js'
import { save as saveState, load as loadState, getDefaultState } from './state.js'
import { openEditor } from '../marks/editor.js'

const PAGE_SIZE = 30
const UNDO_TIMEOUT_MS = 5000

let currentState = null
let allMarks = []
let filteredMarks = []
let displayedCount = 0
let undoTimer = null
let undoRecord = null
let surahs = []

/**
 * Initialize the Review Hub.
 */
export async function init() {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) return

  try {
    surahs = await getSurahs()
  } catch {
    surahs = []
  }

  const saved = await loadState()
  currentState = saved || getDefaultState()

  await reloadMarks()
  render(mainContent)

  emit('review:open')
}

/**
 * Clean up hub state.
 */
export function cleanup() {
  clearUndoToast()
  currentState = null
  allMarks = []
  filteredMarks = []
  displayedCount = 0
}

/**
 * Apply a filter and re-render.
 * @param {{ activeTag?: string|null, surahFilter?: number|null }} filter
 */
export async function applyFilter(filter) {
  if (filter.activeTag !== undefined) currentState.activeTag = filter.activeTag
  if (filter.surahFilter !== undefined) currentState.surahFilter = filter.surahFilter
  await saveState(currentState)
  emit('review:filter', { tags: currentState.activeTag, surah: currentState.surahFilter })

  await reloadMarks()
  displayedCount = 0
  const mainContent = document.getElementById('main-content')
  if (mainContent) render(mainContent)
}

/**
 * Reload marks from IDB.
 */
async function reloadMarks() {
  allMarks = await getAll()
}

/**
 * Render the hub view.
 */
function render(container) {
  container.textContent = ''

  // Apply filters
  filteredMarks = [...allMarks]
  if (currentState.activeTag) {
    filteredMarks = filteredMarks.filter(m => m.tags.includes(currentState.activeTag))
  }
  if (currentState.surahFilter) {
    const surahPrefix = `${currentState.surahFilter}:`
    filteredMarks = filteredMarks.filter(m => m.verseKey.startsWith(surahPrefix))
  }

  // Sort
  const sortKey = currentState.sortBy || 'updatedAt'
  filteredMarks.sort((a, b) => b[sortKey] - a[sortKey])

  if (filteredMarks.length === 0 && allMarks.length === 0) {
    renderEmptyState(container)
    return
  }

  if (filteredMarks.length === 0) {
    renderNoResults(container)
    return
  }

  renderControls(container)

  const pageMarks = filteredMarks.slice(0, PAGE_SIZE)
  displayedCount = pageMarks.length

  if (currentState.groupBy === 'surah') {
    renderGrouped(container, pageMarks)
  } else {
    renderFlat(container, pageMarks)
  }

  if (displayedCount < filteredMarks.length) {
    renderLoadMore(container)
  }
}

function renderControls(container) {
  const controls = document.createElement('div')
  controls.className = 'qa-review-controls'

  const groupToggle = document.createElement('button')
  groupToggle.className = 'qa-review-group-toggle'
  groupToggle.textContent = currentState.groupBy === 'surah' ? 'Flat view' : 'Surah view'
  groupToggle.addEventListener('click', async () => {
    currentState.groupBy = currentState.groupBy === 'surah' ? 'flat' : 'surah'
    await saveState(currentState)
    render(container)
  })
  controls.appendChild(groupToggle)

  const sortToggle = document.createElement('button')
  sortToggle.className = 'qa-review-sort-toggle'
  sortToggle.textContent = currentState.sortBy === 'updatedAt' ? 'Sort: Updated' : 'Sort: Created'
  sortToggle.addEventListener('click', async () => {
    currentState.sortBy = currentState.sortBy === 'updatedAt' ? 'createdAt' : 'updatedAt'
    await saveState(currentState)
    render(container)
  })
  controls.appendChild(sortToggle)

  container.appendChild(controls)
}

function renderGrouped(container, marks) {
  const groups = new Map()
  for (const mark of marks) {
    const surahNum = parseInt(mark.verseKey.split(':')[0], 10)
    if (!groups.has(surahNum)) groups.set(surahNum, [])
    groups.get(surahNum).push(mark)
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => a - b)
  for (const surahNum of sortedKeys) {
    const header = document.createElement('div')
    header.className = 'qa-review-surah-header'
    header.setAttribute('data-surah-group', String(surahNum))
    const meta = surahs.find(s => s.n === surahNum)
    header.textContent = meta ? `${meta.name} (${meta.n})` : `Surah ${surahNum}`
    container.appendChild(header)

    for (const mark of groups.get(surahNum)) {
      container.appendChild(renderMarkCard(mark))
    }
  }
}

function renderFlat(container, marks) {
  for (const mark of marks) {
    container.appendChild(renderMarkCard(mark))
  }
}

function renderMarkCard(mark) {
  const card = document.createElement('div')
  card.className = 'qa-review-mark'
  card.setAttribute('data-mark', mark.verseKey)

  const verseLabel = document.createElement('span')
  verseLabel.className = 'qa-review-verse-label'
  verseLabel.textContent = mark.verseKey

  const tagDots = document.createElement('span')
  tagDots.className = 'qa-review-tag-dots'
  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.style.backgroundColor = getColorForTag(tag)
    dot.title = tag
    tagDots.appendChild(dot)
  }

  const actions = document.createElement('div')
  actions.className = 'qa-review-mark-actions'

  card.addEventListener('click', (e) => {
    if (e.target.closest('button')) return
    openEditor(mark.verseKey)
  })

  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'qa-review-delete-btn'
  deleteBtn.setAttribute('data-action', 'delete-mark')
  deleteBtn.textContent = 'Delete'
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation()
    undoRecord = mark
    await deleteMark(mark.verseKey)
    card.remove()
    showUndoToast(mark.verseKey)
  })
  actions.appendChild(deleteBtn)

  card.appendChild(verseLabel)
  card.appendChild(tagDots)
  card.appendChild(actions)
  return card
}

function renderEmptyState(container) {
  const empty = document.createElement('div')
  empty.className = 'qa-review-empty'
  empty.textContent = 'No marks yet. Start reading and mark verses to see them here.'
  container.appendChild(empty)
}

function renderNoResults(container) {
  const noResults = document.createElement('div')
  noResults.className = 'qa-review-no-results'
  noResults.textContent = 'No marks match your filters.'

  const clearBtn = document.createElement('button')
  clearBtn.className = 'qa-review-clear-filter'
  clearBtn.textContent = 'Clear filter'
  clearBtn.addEventListener('click', () => {
    applyFilter({ activeTag: null, surahFilter: null })
  })

  noResults.appendChild(document.createElement('br'))
  noResults.appendChild(clearBtn)
  container.appendChild(noResults)
}

function renderLoadMore(container) {
  const btn = document.createElement('button')
  btn.className = 'qa-review-load-more'
  btn.setAttribute('data-action', 'load-more')
  btn.textContent = 'Load more'
  btn.addEventListener('click', () => {
    btn.remove()
    const nextPage = filteredMarks.slice(displayedCount, displayedCount + PAGE_SIZE)
    displayedCount += nextPage.length

    if (currentState.groupBy === 'surah') {
      renderGrouped(container, nextPage)
    } else {
      renderFlat(container, nextPage)
    }

    if (displayedCount < filteredMarks.length) {
      renderLoadMore(container)
    }
  })
  container.appendChild(btn)
}

function showUndoToast(verseKey) {
  clearUndoToast()

  const toast = document.createElement('div')
  toast.className = 'qa-undo-toast'
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')

  const text = document.createElement('span')
  text.textContent = `Mark ${verseKey} deleted.`

  const undoBtn = document.createElement('button')
  undoBtn.textContent = 'Undo'
  undoBtn.addEventListener('click', async () => {
    if (undoRecord) {
      await saveMark(undoRecord.verseKey, undoRecord.tags)
      undoRecord = null
    }
    clearUndoToast()
    await reloadMarks()
    const mainContent = document.getElementById('main-content')
    if (mainContent) render(mainContent)
  })

  toast.appendChild(text)
  toast.appendChild(undoBtn)

  const shell = document.getElementById('app-shell') || document.body
  shell.appendChild(toast)

  undoTimer = setTimeout(() => {
    clearUndoToast()
    undoRecord = null
  }, UNDO_TIMEOUT_MS)
}

function clearUndoToast() {
  if (undoTimer) {
    clearTimeout(undoTimer)
    undoTimer = null
  }
  const toast = document.querySelector('.qa-undo-toast')
  if (toast) toast.remove()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/review/hub.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/review/hub.js tests/unit/review/hub.test.js
git commit -m "feat(review): implement Review Hub with grouping, filtering, and pagination"
```

---

### Task 4: Add Review Hub icon to top bar

**Files:**
- Modify: `src/core/app.js`

- [ ] **Step 1: Add review icon to top bar after router init**

In `src/core/app.js`, after the nav panel initialization block (around line 49), add:

```js
// Add Review Hub icon to top bar
const topBar = document.getElementById('top-bar')
if (topBar && !topBar.querySelector('.qa-review-icon')) {
  const reviewLink = document.createElement('a')
  reviewLink.className = 'qa-review-icon'
  reviewLink.href = '#/review'
  reviewLink.setAttribute('aria-label', 'Review Hub')
  reviewLink.textContent = 'Review'
  topBar.insertBefore(reviewLink, topBar.firstChild)
}
```

- [ ] **Step 2: Run all tests to verify no regressions**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/core/app.js
git commit -m "feat(review): add permanent Review Hub icon to top bar"
```

---

### Task 5: Add Review Hub CSS

**Files:**
- Modify: `src/core/theme.css`

- [ ] **Step 1: Append review hub styles**

Append to `src/core/theme.css`:

```css
/* Review Hub */
.qa-review-controls {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--qa-border);
  margin-bottom: 0.75rem;
}

.qa-review-group-toggle,
.qa-review-sort-toggle {
  background: var(--qa-bg-secondary);
  color: var(--qa-text-primary);
  border: 1px solid var(--qa-border);
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8125rem;
}

.qa-review-surah-header {
  font-weight: 600;
  padding: 0.5rem 0;
  margin-top: 0.75rem;
  color: var(--qa-text-secondary);
  font-size: 0.875rem;
  border-bottom: 1px solid var(--qa-border);
}

.qa-review-mark {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--qa-border);
  cursor: pointer;
}

.qa-review-mark:hover {
  background: var(--qa-bg-secondary);
}

.qa-review-verse-label {
  font-weight: 500;
  min-width: 4rem;
  color: var(--qa-text-primary);
}

.qa-review-tag-dots {
  display: flex;
  gap: 3px;
  flex: 1;
}

.qa-review-mark-actions {
  margin-left: auto;
}

.qa-review-delete-btn {
  background: none;
  border: none;
  color: var(--qa-color-error);
  cursor: pointer;
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
}

.qa-review-empty,
.qa-review-no-results {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--qa-text-secondary);
}

.qa-review-clear-filter {
  background: var(--qa-accent);
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1rem;
}

.qa-review-load-more {
  display: block;
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.5rem;
  background: var(--qa-bg-secondary);
  color: var(--qa-text-primary);
  border: 1px solid var(--qa-border);
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
}

.qa-review-icon {
  color: var(--qa-text-primary);
  text-decoration: none;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/theme.css
git commit -m "style(review): add Review Hub styles"
```

---

### Task 6: Run full test suite and verify

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS, no regressions

- [ ] **Step 2: Final commit if any fixups needed**
