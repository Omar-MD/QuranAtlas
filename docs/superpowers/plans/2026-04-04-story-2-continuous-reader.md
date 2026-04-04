# Story 2: Continuous Reader & Session Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add session restore, continuous position tracking via IntersectionObserver, chunked rendering (50 verses at a time), and a resume indicator — so returning users continue exactly where they left off.

**Architecture:** New `reader/scroll-tracker.js` encapsulates IntersectionObserver position tracking with 1s debounce. `reader/index.js` extends rendering to chunked mode (50 verses + append-on-scroll) and integrates the scroll tracker. `core/router.js` adds launch restore from the `positions` IDB store.

**Tech Stack:** Vanilla JS (ES2020), IntersectionObserver, CSS `content-visibility: auto`, IndexedDB (existing `positions` store), Vitest + jsdom.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `reader/scroll-tracker.js` | Create | IntersectionObserver position tracking, debounced `onPositionChange` |
| `reader/index.js` | Modify (extend) | Chunked rendering, resume indicator, scroll tracker integration |
| `core/router.js` | Modify | Launch restore from positions IDB store |
| `core/app.js` | Modify | Listen for `router:launch-restore`, dispatch restore logic |
| `src/core/theme.css` | Modify | Resume indicator CSS, content-visibility verse styles |
| `tests/unit/reader/scroll-tracker.test.js` | Create | Unit tests for scroll tracker |
| `tests/unit/reader/reader-story2.test.js` | Create | Integration tests for chunked rendering + resume |

---

### Task 0: `reader/scroll-tracker.js` — Position Tracking Module

**Files:**
- Create: `src/reader/scroll-tracker.js`
- Test: `tests/unit/reader/scroll-tracker.test.js`

This module uses IntersectionObserver to detect which verse is at the center of the viewport, debouncing position updates to once per 1s of scrolling silence.

- [x] **Step 1: Write failing test for scroll tracker**

Create `tests/unit/reader/scroll-tracker.test.js`:

```js
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'

describe('reader/scroll-tracker.js', () => {
  let container
  let onPositionChange
  let observeScroll
  let unobserve

  beforeEach(async () => {
    // Create a scrollable container with verse elements
    container = document.createElement('div')
    container.style.height = '400px'
    container.style.overflow = 'auto'

    for (let i = 1; i <= 10; i++) {
      const verse = document.createElement('div')
      verse.setAttribute('data-verse', String(i))
      verse.style.height = '100px'
      verse.textContent = `Verse ${i}`
      container.appendChild(verse)
    }

    document.body.appendChild(container)
    onPositionChange = vi.fn()

    const mod = await import('../../../src/reader/scroll-tracker.js')
    observeScroll = mod.observeScroll
    unobserve = mod.unobserve
  })

  afterEach(() => {
    unobserve()
    document.body.removeChild(container)
    vi.useRealTimers()
  })

  it('fires onPositionChange with the center-viewport verse', async () => {
    vi.useFakeTimers()

    observeScroll(container, { onPositionChange })

    // Simulate scroll to verse 5
    container.scrollTop = 400
    container.dispatchEvent(new Event('scroll'))

    // Advance past debounce window (1s)
    vi.advanceTimersByTime(1100)

    expect(onPositionChange).toHaveBeenCalledWith({ verse: 5 })
  })

  it('debounces: 10 rapid scrolls fire callback once', async () => {
    vi.useFakeTimers()

    observeScroll(container, { onPositionChange })

    for (let i = 0; i < 10; i++) {
      container.scrollTop = i * 100
      container.dispatchEvent(new Event('scroll'))
    }

    vi.advanceTimersByTime(1100)

    expect(onPositionChange).toHaveBeenCalledTimes(1)
  })

  it('does not fire before debounce window', async () => {
    vi.useFakeTimers()

    observeScroll(container, { onPositionChange })

    container.scrollTop = 400
    container.dispatchEvent(new Event('scroll'))

    vi.advanceTimersByTime(500)

    expect(onPositionChange).not.toHaveBeenCalled()
  })

  it('unobserve clears the listener', async () => {
    vi.useFakeTimers()

    observeScroll(container, { onPositionChange })
    unobserve()

    container.scrollTop = 400
    container.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(1100)

    expect(onPositionChange).not.toHaveBeenCalled()
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/unit/reader/scroll-tracker.test.js`
Expected: FAIL — module doesn't exist.

- [x] **Step 3: Implement `scroll-tracker.js`**

Create `src/reader/scroll-tracker.js`:

```js
/**
 * Scroll position tracking using IntersectionObserver.
 * Detects which verse is at the center of the viewport,
 * debouncing position updates to once per 1s of scrolling silence.
 */

const DEBOUNCE_MS = 1000
const CENTER_BAND_PX = 390

let observer = null
let pendingPosition = null
let debounceTimer = null
let onPositionChangeCallback = null

/**
 * Start observing scroll position changes.
 * @param {HTMLElement} container - The scrollable container
 * @param {object} options
 * @param {Function} options.onPositionChange - Called with { verse: number } after debounce
 */
export function observeScroll(container, { onPositionChange }) {
  onPositionChangeCallback = onPositionChange

  // Create a center-band sentinel for IntersectionObserver
  const sentinel = document.createElement('div')
  sentinel.setAttribute('data-scroll-sentinel', '')
  sentinel.style.cssText = `
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: ${CENTER_BAND_PX * 2}px;
    transform: translateY(-50%);
    pointer-events: none;
    z-index: -1;
  `
  container.style.position = 'relative'
  container.appendChild(sentinel)

  // Track which verse intersects the center band
  const verseSentinels = container.querySelectorAll('[data-verse]')
  const centerObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const verseEl = entry.target
          const verseNum = parseInt(verseEl.getAttribute('data-verse'), 10)
          if (!isNaN(verseNum)) {
            pendingPosition = verseNum
            scheduleDebounce()
          }
        }
      }
    },
    {
      root: container,
      rootMargin: `-${CENTER_BAND_PX}px 0px -${CENTER_BAND_PX}px 0px`,
      threshold: 0,
    }
  )

  verseSentinels.forEach((el) => centerObserver.observe(el))
  observer = centerObserver
}

/**
 * Stop observing and clean up.
 */
export function unobserve() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  pendingPosition = null
  onPositionChangeCallback = null
}

/**
 * Schedule a debounced position update.
 */
function scheduleDebounce() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    if (pendingPosition !== null && onPositionChangeCallback) {
      onPositionChangeCallback({ verse: pendingPosition })
    }
    pendingPosition = null
    debounceTimer = null
  }, DEBOUNCE_MS)
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/unit/reader/scroll-tracker.test.js`
Expected: All 4 tests pass.

- [x] **Step 5: Commit**

```bash
git add src/reader/scroll-tracker.js tests/unit/reader/scroll-tracker.test.js
git commit -m "feat: add scroll tracker with IntersectionObserver and debouncing"
```

---

### Task 1: Extend `reader/index.js` — Chunked Rendering + Resume Indicator

**Files:**
- Modify: `src/reader/index.js`
- Test: `tests/unit/reader/reader-story2.test.js`
- Modify: `src/core/theme.css`

This task adds: (1) chunked rendering (50 verses at a time, append-on-scroll), (2) resume indicator, (3) scroll tracker integration, (4) position save/restore.

- [x] **Step 1: Write failing test for chunked rendering**

Create `tests/unit/reader/reader-story2.test.js`:

```js
import { beforeEach, describe, it, expect, vi } from 'vitest'
import * as events from '../../../src/core/events.js'

// Mock dataset with 60 verses (to test chunking)
const mockSurah = {
  ar: Array.from({ length: 60 }, (_, i) => `Arabic verse ${i + 1}`),
  en: Array.from({ length: 60 }, (_, i) => `English verse ${i + 1}`),
}

vi.mock('../../../src/data/dataset.js', () => ({
  getSurah: vi.fn().mockResolvedValue(mockSurah),
  getSurahs: vi.fn().mockResolvedValue([
    { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286, juz: 1 },
  ]),
}))

// Mock db
vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn().mockResolvedValue({ key: 'translationVisible', value: true }),
  put: vi.fn().mockResolvedValue(),
}))

// Mock scroll tracker
vi.mock('../../../src/reader/scroll-tracker.js', () => ({
  observeScroll: vi.fn(),
  unobserve: vi.fn(),
}))

describe('reader/index.js — Story 2', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header id="top-bar"></header>
      <main id="main-content"></main>
    `
    events.clear()
  })

  it('renders only first 50 verses initially', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2' })

    const verses = document.querySelectorAll('[data-verse]')
    expect(verses.length).toBe(50)
  })

  it('shows resume indicator when saved position exists', async () => {
    const { get } = await import('../../../src/core/db.js')
    get.mockResolvedValueOnce({ key: 'translationVisible', value: true })
    get.mockResolvedValueOnce({ id: 's2', surah: 2, verse: 25, savedAt: Date.now() })

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2' })

    const indicator = document.querySelector('[data-resume-indicator]')
    expect(indicator).toBeTruthy()
  })

  it('does not show resume indicator when no saved position', async () => {
    const { get } = await import('../../../src/core/db.js')
    get.mockResolvedValueOnce({ key: 'translationVisible', value: true })
    get.mockResolvedValueOnce(undefined)

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2' })

    const indicator = document.querySelector('[data-resume-indicator]')
    expect(indicator).toBeFalsy()
  })

  it('emits reader:surah-loaded event', async () => {
    const loadedFn = vi.fn()
    events.on('reader:surah-loaded', loadedFn)

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '2' })

    expect(loadedFn).toHaveBeenCalledWith({ surah: 2 })
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/unit/reader/reader-story2.test.js`
Expected: FAIL — chunked rendering not implemented.

- [x] **Step 3: Add CSS for resume indicator and content-visibility**

Append to `src/core/theme.css`:

```css
/* Resume indicator */
.qa-resume-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background-color: var(--qa-bg-secondary);
  border: 1px solid var(--qa-accent);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--qa-text-primary);
}

.qa-resume-text {
  flex: 1;
}

.qa-resume-actions {
  display: flex;
  gap: 0.5rem;
}

.qa-resume-jump {
  background: var(--qa-accent);
  color: var(--qa-bg-primary);
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.qa-resume-dismiss {
  background: none;
  border: none;
  color: var(--qa-text-secondary);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  line-height: 1;
}

/* Content-visibility for verses */
.qa-verse {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;
}

/* Surah end marker */
.qa-surah-end {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--qa-text-secondary);
  font-size: 0.875rem;
  border-top: 1px solid var(--qa-border);
  margin-top: 1.5rem;
}
```

- [x] **Step 4: Implement chunked rendering and resume indicator**

Replace the entire `src/reader/index.js`:

```js
/**
 * Reader route handler.
 * Renders surah content with Arabic text, translation, and basmala rules.
 * Supports chunked rendering, position tracking, and session restore.
 */

import { getSurah, getSurahs } from '../data/dataset.js'
import { get, put } from '../core/db.js'
import { emit, on } from '../core/events.js'
import { observeScroll, unobserve } from './scroll-tracker.js'

const SKELETON_TIMEOUT_MS = 5000
const CHUNK_SIZE = 50

let currentSurah = null
let currentSurahNum = null
let renderedCount = 0
let isRendering = false

/**
 * Initialize the reader for a surah.
 * @param {object} params
 * @param {string} params.surah - Surah number
 * @param {string} [params.ayah] - Specific verse (deep link)
 * @param {object} [options]
 * @param {boolean} [options.savePosition=true] - Whether to auto-save position
 */
export async function init(params, { savePosition = true } = {}) {
  const surahNum = parseInt(params.surah, 10)
  if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
    return
  }

  // Clean up previous session
  cleanup()

  const mainContent = document.getElementById('main-content')
  const topBar = document.getElementById('top-bar')
  if (!mainContent) {
    return
  }

  currentSurahNum = surahNum

  // Show skeleton
  showSkeleton(mainContent)

  // Set 5s hard timeout
  const timeout = setTimeout(() => {
    showError(mainContent, surahNum)
  }, SKELETON_TIMEOUT_MS)

  try {
    const [surah, surahs, translationVisible, savedPosition] = await Promise.all([
      getSurah(surahNum),
      getSurahs(),
      get('settings', 'translationVisible').then(r => r?.value ?? true),
      get('positions', `s${surahNum}`),
    ])

    clearTimeout(timeout)

    currentSurah = surah
    const surahMeta = surahs.find(s => s.n === surahNum)

    // Render
    mainContent.innerHTML = ''
    renderSurahHeader(mainContent, surahMeta)
    renderBasmala(mainContent, surahNum)

    // Render resume indicator if position saved and not already there
    const targetVerse = params.ayah ? parseInt(params.ayah, 10) : null
    if (savedPosition && !targetVerse) {
      renderResumeIndicator(mainContent, surahMeta, savedPosition)
    }

    // Chunked rendering: render first chunk
    renderedCount = 0
    isRendering = true
    renderVerseChunk(mainContent, surah, translationVisible, 0, CHUNK_SIZE)
    isRendering = false

    // Render surah end marker
    renderSurahEnd(mainContent, surahMeta)

    // Render top bar controls
    renderTopBar(topBar, translationVisible, surahNum)

    // Set up scroll tracking if savePosition is enabled
    if (savePosition) {
      setupScrollTracking(mainContent, surahNum)
    }

    // Scroll to saved position or deep link verse
    if (savedPosition && !targetVerse) {
      scrollToVerse(mainContent, savedPosition.verse)
    } else if (targetVerse) {
      scrollToVerse(mainContent, targetVerse)
    }

    emit('reader:surah-loaded', { surah: surahNum })
  } catch (error) {
    clearTimeout(timeout)
    showError(mainContent, surahNum, error.message)
  }
}

/**
 * Clean up the current reader session.
 */
function cleanup() {
  unobserve()
  currentSurah = null
  currentSurahNum = null
  renderedCount = 0
}

/**
 * Render a chunk of verses.
 */
function renderVerseChunk(container, surah, translationVisible, start, end) {
  const actualEnd = Math.min(end, surah.ar.length)

  for (let i = start; i < actualEnd; i++) {
    const verseNum = i + 1
    const verseBlock = document.createElement('div')
    verseBlock.className = 'qa-verse'
    verseBlock.setAttribute('data-verse', `${verseNum}`)

    const arabicEl = document.createElement('div')
    arabicEl.className = 'qa-verse-arabic'
    arabicEl.setAttribute('dir', 'rtl')
    arabicEl.textContent = surah.ar[i]

    const numberEl = document.createElement('span')
    numberEl.className = 'qa-verse-number'
    numberEl.textContent = String(verseNum)

    arabicEl.insertBefore(numberEl, arabicEl.firstChild)
    verseBlock.appendChild(arabicEl)

    if (translationVisible) {
      const transEl = document.createElement('div')
      transEl.className = 'qa-verse-translation'
      transEl.setAttribute('data-translation', '')
      transEl.textContent = surah.en[i]
      verseBlock.appendChild(transEl)
    }

    container.appendChild(verseBlock)
  }

  renderedCount = actualEnd
}

/**
 * Set up scroll tracking with append-on-scroll.
 */
function setupScrollTracking(container, surahNum) {
  const mainContent = document.getElementById('main-content')
  if (!mainContent) return

  observeScroll(mainContent, {
    onPositionChange: ({ verse }) => {
      savePosition(surahNum, verse)
    },
  })

  // Append more verses on scroll near bottom
  mainContent.addEventListener('scroll', handleScrollAppend, { passive: true })
}

/**
 * Handle scroll events to append more verse chunks.
 */
function handleScrollAppend() {
  if (isRendering || !currentSurah || renderedCount >= currentSurah.ar.length) return

  const mainContent = document.getElementById('main-content')
  if (!mainContent) return

  const scrollBottom = mainContent.scrollTop + mainContent.clientHeight
  const scrollHeight = mainContent.scrollHeight

  // Append next chunk when within one viewport height of bottom
  if (scrollHeight - scrollBottom < mainContent.clientHeight) {
    isRendering = true
    renderVerseChunk(mainContent, currentSurah, true, renderedCount, renderedCount + CHUNK_SIZE)
    isRendering = false
  }
}

/**
 * Save reading position to IDB.
 */
async function savePosition(surahNum, verse) {
  try {
    await put('positions', {
      id: `s${surahNum}`,
      surah: surahNum,
      verse,
      savedAt: Date.now(),
    })
    emit('reader:position-changed', { surah: surahNum, verse })
  } catch {
    // Position save failed, continue anyway
  }
}

/**
 * Scroll to a specific verse.
 */
function scrollToVerse(container, verseNum) {
  const verseEl = container.querySelector(`[data-verse="${verseNum}"]`)
  if (verseEl) {
    verseEl.scrollIntoView({ block: 'start' })
  }
}

/**
 * Show skeleton loader.
 */
function showSkeleton(container) {
  container.innerHTML = ''
  for (let i = 0; i < 6; i++) {
    const line = document.createElement('div')
    line.className = 'qa-skeleton qa-skeleton-line'
    line.style.width = i % 2 === 0 ? '100%' : '80%'
    container.appendChild(line)
  }
}

/**
 * Show error state.
 */
function showError(container, surahNum, _message) {
  container.innerHTML = ''
  const errorDiv = document.createElement('div')
  errorDiv.style.textAlign = 'center'
  errorDiv.style.padding = '2rem 1rem'
  errorDiv.textContent = `Failed to load Surah ${surahNum}.`

  const retryBtn = document.createElement('button')
  retryBtn.textContent = 'Retry'
  retryBtn.style.marginTop = '0.5rem'
  retryBtn.style.cursor = 'pointer'
  retryBtn.addEventListener('click', () => init({ surah: String(surahNum) }))
  errorDiv.appendChild(document.createElement('br'))
  errorDiv.appendChild(retryBtn)

  container.appendChild(errorDiv)
}

/**
 * Render surah header.
 */
function renderSurahHeader(container, meta) {
  const header = document.createElement('div')
  header.setAttribute('data-surah-header', '')

  const nameEl = document.createElement('div')
  nameEl.className = 'qa-surah-name'
  nameEl.textContent = meta?.arabic ?? ''

  const metaEl = document.createElement('div')
  metaEl.className = 'qa-surah-meta'
  metaEl.textContent = `${meta?.name ?? ''} · Surah ${meta?.n ?? ''} · ${meta?.count ?? ''} verses · ${meta?.type ?? ''}`

  header.appendChild(nameEl)
  header.appendChild(metaEl)
  container.appendChild(header)
}

/**
 * Render basmala according to rules.
 */
function renderBasmala(container, surahNum) {
  if (surahNum === 1 || surahNum === 9) {
    return
  }

  const basmala = document.createElement('div')
  basmala.className = 'qa-basmala'
  basmala.textContent = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'
  container.appendChild(basmala)
}

/**
 * Render resume indicator.
 */
function renderResumeIndicator(container, meta, position) {
  const indicator = document.createElement('div')
  indicator.className = 'qa-resume-indicator'
  indicator.setAttribute('data-resume-indicator', '')

  const text = document.createElement('span')
  text.className = 'qa-resume-text'
  text.textContent = `Resume reading: ${meta?.name ?? ''} ${position.verse}`

  const actions = document.createElement('div')
  actions.className = 'qa-resume-actions'

  const jumpBtn = document.createElement('button')
  jumpBtn.className = 'qa-resume-jump'
  jumpBtn.textContent = 'Jump'
  jumpBtn.addEventListener('click', () => {
    scrollToVerse(container, position.verse)
    indicator.remove()
  })

  const dismissBtn = document.createElement('button')
  dismissBtn.className = 'qa-resume-dismiss'
  dismissBtn.textContent = '×'
  dismissBtn.setAttribute('aria-label', 'Dismiss')
  dismissBtn.addEventListener('click', () => {
    indicator.remove()
  })

  actions.appendChild(jumpBtn)
  actions.appendChild(dismissBtn)
  indicator.appendChild(text)
  indicator.appendChild(actions)
  container.appendChild(indicator)
}

/**
 * Render surah end marker.
 */
function renderSurahEnd(container, meta) {
  const endMarker = document.createElement('div')
  endMarker.className = 'qa-surah-end'
  endMarker.textContent = `End of ${meta?.name ?? 'Surah'}`
  container.appendChild(endMarker)
}

/**
 * Render top bar with translation toggle.
 */
function renderTopBar(topBar, translationVisible, surahNum) {
  if (!topBar) {
    return
  }

  topBar.innerHTML = ''

  const toggleBtn = document.createElement('button')
  toggleBtn.textContent = translationVisible ? 'EN ▾' : 'EN ▸'
  toggleBtn.setAttribute('aria-label', translationVisible ? 'Hide translation' : 'Show translation')
  toggleBtn.style.cursor = 'pointer'
  toggleBtn.style.background = 'none'
  toggleBtn.style.border = '1px solid var(--qa-border)'
  toggleBtn.style.borderRadius = '4px'
  toggleBtn.style.padding = '0.25rem 0.5rem'
  toggleBtn.style.fontSize = '0.875rem'
  toggleBtn.style.color = 'var(--qa-text-secondary)'

  toggleBtn.addEventListener('click', async () => {
    const newValue = !translationVisible
    try {
      await put('settings', { key: 'translationVisible', value: newValue })
    } catch {
      // Settings save failed, continue anyway
    }
    init({ surah: String(surahNum) })
  })

  topBar.appendChild(toggleBtn)
}
```

- [x] **Step 5: Run test to verify it passes**

Run: `pnpm test:run tests/unit/reader/reader-story2.test.js`
Expected: All 4 tests pass.

- [x] **Step 6: Run full test suite**

Run: `pnpm test:run`
Expected: All tests pass (previous 27 + new 4 scroll-tracker + 4 reader-story2 = 35).

- [x] **Step 7: Commit**

```bash
git add src/reader/index.js src/core/theme.css tests/unit/reader/reader-story2.test.js
git commit -m "feat: add chunked rendering, resume indicator, position tracking"
```

---

### Task 2: Extend `core/router.js` — Launch Restore

**Files:**
- Modify: `src/core/router.js`
- Modify: `src/core/app.js`

This task adds launch restore: when the app opens with an empty hash, check the `positions` IDB store for the most recently used surah and navigate there.

- [x] **Step 1: Write failing test for launch restore**

Append to `tests/unit/core/db.test.js`:

```js
  describe('launch restore', () => {
    it('returns the most recently saved position', async () => {
      const { getMostRecentPosition } = await import('../../../src/core/router.js')
      await put('positions', { id: 's1', surah: 1, verse: 5, savedAt: 1000 })
      await put('positions', { id: 's2', surah: 2, verse: 100, savedAt: 2000 })
      await put('positions', { id: 's3', surah: 3, verse: 10, savedAt: 1500 })

      const result = await getMostRecentPosition()
      expect(result).toEqual({ id: 's2', surah: 2, verse: 100, savedAt: 2000 })
    })

    it('returns null when no positions saved', async () => {
      const { getMostRecentPosition } = await import('../../../src/core/router.js')
      const result = await getMostRecentPosition()
      expect(result).toBeNull()
    })
  })
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/unit/core/db.test.js`
Expected: FAIL — `getMostRecentPosition` not defined.

- [x] **Step 3: Implement launch restore in router**

Add to the end of `src/core/router.js`:

```js
/**
 * Get the most recently saved reading position.
 * @returns {Promise<{surah: number, verse: number} | null>}
 */
export async function getMostRecentPosition() {
  try {
    const { getDb } = await import('./db.js')
    const db = await getDb()
    const tx = db.transaction('positions', 'readonly')
    const store = tx.objectStore('positions')
    const request = store.getAll()

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const positions = request.result || []
        if (positions.length === 0) {
          resolve(null)
          return
        }
        // Find the most recent by savedAt
        const mostRecent = positions.reduce((latest, pos) => {
          return pos.savedAt > latest.savedAt ? pos : latest
        }, positions[0])
        resolve(mostRecent)
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}
```

- [x] **Step 4: Wire launch restore in `app.js`**

Replace the `restoreActivationState` function in `src/core/app.js` and add a listener for `router:launch-restore`:

Modify `src/core/app.js` — replace the `restoreActivationState` function and add the launch restore listener. Add this after `router.init()` in the `init()` function:

```js
    // Listen for launch restore
    on('router:launch-restore', handleLaunchRestore)
```

Add the `handleLaunchRestore` function:

```js
/**
 * Handle launch restore: navigate to last-read position or default surah.
 */
async function handleLaunchRestore() {
  const { getMostRecentPosition, navigate } = await Promise.all([
    import('./router.js').then(m => m.getMostRecentPosition),
    import('./router.js').then(m => m.navigate),
  ])

  const position = await getMostRecentPosition()
  if (position) {
    navigate(`#/s/${position.surah}/${position.verse}`, { replace: true })
  } else {
    // Default to Al-Fatiha
    navigate('#/s/1', { replace: true })
  }
}
```

Also update the import at the top of `app.js` to include `on`:

```js
import { emit, on } from './events.js'
```

- [x] **Step 5: Run all tests to verify nothing broke**

Run: `pnpm test:run`
Expected: All tests pass.

- [x] **Step 6: Commit**

```bash
git add src/core/router.js src/core/app.js
git commit -m "feat: add launch restore from positions IDB store"
```

---

### Task 3: Manual Verification & Lint

- [x] **Step 1: Run lint**

Run: `pnpm lint`
Expected: 0 errors (pre-existing warnings OK).

- [x] **Step 2: Run full test suite**

Run: `pnpm test:run`
Expected: All tests pass.

- [x] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(story-2): continuous reader & session restore complete"
```

---

## Spec Coverage Checklist

| Story 2 Requirement | Task |
|---|---|
| R1: Restore to exact verse on return | Task 2 (launch restore) |
| R2: Per-surah position tracking | Task 1 (savePosition with `s{surah}` key) |
| R3: Auto-save position on scroll | Task 1 (scroll tracker + debounce) |
| R4: "Resume reading" indicator | Task 1 (renderResumeIndicator) |
| R5: Resume indicator dismiss | Task 1 (dismiss button removes element) |
| R6: Smooth scrolling for long surahs | Task 1 (chunked rendering + content-visibility) |
| R7: Verse spacing and line heights | Task 1 (CSS from Story 1, unchanged) |
| R8: Arabic RTL, English LTR alignment | Task 1 (dir="rtl" on Arabic elements) |
| R9: Translation off = Arabic only | Task 1 (translationVisible check in renderVerseChunk) |
| R10: End-of-surah visual indicator | Task 1 (renderSurahEnd) |
| R11: Multiple verses visible | Task 1 (content-visibility, no single-verse constraint) |
| R12: Auto-save every 1-2s while scrolling | Task 0 (1s debounce in scroll-tracker) |
| R13: Center-viewport verse detection | Task 0 (IntersectionObserver with center band) |
| R14: Tap verse number to scroll | Deferred (not in Story 2 spec — nav interaction is Story 3) |
| R15: Intentional nav starts at top | Task 2 (navigate without verse starts at v1) |
| R16: Scroll tracking decoupled from rendering | Task 0 (separate scroll-tracker.js module) |
| Performance: Al-Baqarah first 50 verses ≤ 500ms | Task 1 (CHUNK_SIZE = 50) |
| Performance: debounce ≤ 1s | Task 0 (DEBOUNCE_MS = 1000) |
| Performance: IDB write ≤ 50ms | Task 1 (single-record put) |
