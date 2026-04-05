# Story 3: Navigation (Surah Browsing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a slide-in nav panel with surah browsing, live search/filter, current surah highlight, and name-based input validation — completing Phase 1.

**Architecture:** The nav panel renders into the existing `#nav-surface` element. `nav/index.js` owns all UI (surah list, search, hamburger toggle). `safety/input-validator.js` is extended with name-based lookup using surah data from `dataset.js`. The hamburger button is injected into `#top-bar` by the nav module. Cross-module communication uses `core/events.js` pub/sub.

**Tech Stack:** Vanilla JS, Vitest + jsdom + fake-indexeddb, CSS custom properties (`--qa-*`)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/safety/input-validator.js` | Modify | Add name-based surah lookup with verse count validation |
| `tests/unit/safety/input-validator.test.js` | Modify | Add name lookup + verse validation tests |
| `src/nav/index.js` | Rewrite | Nav panel UI, search, filter, highlight, hamburger, responsive close |
| `src/core/theme.css` | Modify | Add nav panel styles (slide animation, backdrop, highlight, search) |
| `tests/unit/nav/nav.test.js` | Create | Integration tests for nav panel |
| `src/core/app.js` | Modify | Wire nav init on app bootstrap |
| `src/nav/nav.stories.js` | Modify | Update to use real `init()` |

---

### Task 1: Extend input-validator with name-based surah lookup

**Files:**
- Modify: `tests/unit/safety/input-validator.test.js`
- Modify: `src/safety/input-validator.js`

The current `parseNavigationInput()` handles numeric input but stubs out name lookup. We need to:
1. Accept a `surahs` array parameter for name matching
2. Match case-insensitively against surah `name` field (strict, no fuzzy)
3. Strip common prefix "Al-" for matching convenience (e.g., "Baqarah" matches "Al-Baqarah")
4. Validate verse number against surah's `count` field

- [ ] **Step 1: Write failing tests for name-based lookup**

Add to `tests/unit/safety/input-validator.test.js`:

```javascript
import { parseNavigationInput } from '../../../src/safety/input-validator.js'

const SURAHS = [
  { n: 1, name: 'Al-Fatihah', count: 7 },
  { n: 2, name: 'Al-Baqarah', count: 286 },
  { n: 9, name: 'At-Tawbah', count: 129 },
  { n: 36, name: 'Ya-Sin', count: 83 },
  { n: 114, name: 'An-Nas', count: 6 },
]

describe('parseNavigationInput with surahs list', () => {
  it('matches surah by full name (case-insensitive)', () => {
    const result = parseNavigationInput('al-baqarah', SURAHS)
    expect(result).toEqual({ surah: 2, valid: true })
  })

  it('matches surah by name without Al- prefix', () => {
    const result = parseNavigationInput('baqarah', SURAHS)
    expect(result).toEqual({ surah: 2, valid: true })
  })

  it('matches surah name with verse number', () => {
    const result = parseNavigationInput('Baqarah 255', SURAHS)
    expect(result).toEqual({ surah: 2, verse: 255, valid: true })
  })

  it('rejects unknown surah name', () => {
    const result = parseNavigationInput('xyz', SURAHS)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unknown surah')
  })

  it('rejects out-of-range verse for named surah', () => {
    const result = parseNavigationInput('Baqarah 300', SURAHS)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('does not exist')
  })

  it('validates verse against count for numeric input', () => {
    const result = parseNavigationInput('2:300', SURAHS)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('does not exist')
  })

  it('accepts valid verse for numeric input with surahs', () => {
    const result = parseNavigationInput('2:255', SURAHS)
    expect(result).toEqual({ surah: 2, verse: 255, valid: true })
  })

  it('works without surahs param (backward compatible)', () => {
    const result = parseNavigationInput('2')
    expect(result).toEqual({ surah: 2, valid: true })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/safety/input-validator.test.js`
Expected: 8 new tests FAIL (name lookup returns `{ valid: false }`, verse validation not checked)

- [ ] **Step 3: Implement name-based lookup**

Replace `src/safety/input-validator.js` with:

```javascript
/**
 * Input validation for navigation and tag parameters.
 * Permitted cross-module import (safety exception).
 */

/**
 * Parse navigation input.
 * Accepts: "2", "2:255", "Al-Baqarah", "Baqarah 255"
 * @param {string} input
 * @param {Array<{n: number, name: string, count: number}>} [surahs] - Surah list for name lookup and verse validation
 * @returns {{ surah?: number, verse?: number, valid: boolean, error?: string }}
 */
export function parseNavigationInput(input, surahs) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input is required' }
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return { valid: false, error: 'Input is empty' }
  }

  // Numeric surah: "2" or "2:255"
  const numericMatch = trimmed.match(/^(\d+)(?::(\d+))?$/)
  if (numericMatch) {
    const surah = parseInt(numericMatch[1], 10)
    const verse = numericMatch[2] ? parseInt(numericMatch[2], 10) : undefined

    if (surah < 1 || surah > 114) {
      return { valid: false, error: `Surah ${surah} does not exist` }
    }
    if (verse !== undefined && (verse < 1 || !Number.isInteger(verse))) {
      return { valid: false, error: `Invalid verse number: ${verse}` }
    }

    // Validate verse against surah's ayah count if surahs provided
    if (verse !== undefined && surahs) {
      const meta = surahs.find(s => s.n === surah)
      if (meta && verse > meta.count) {
        return {
          valid: false,
          error: `Verse ${verse} does not exist in ${meta.name} (${meta.count} verses)`,
        }
      }
    }

    return { surah, verse, valid: true }
  }

  // Surah name: "Al-Baqarah" or "Baqarah 255"
  const nameMatch = trimmed.match(/^([a-zA-Z\s'-]+?)(?:\s+(\d+))?$/)
  if (nameMatch && surahs) {
    const rawName = nameMatch[1].trim()
    const verse = nameMatch[2] ? parseInt(nameMatch[2], 10) : undefined

    const match = findSurahByName(rawName, surahs)
    if (!match) {
      return { valid: false, error: `Unknown surah: "${rawName}"` }
    }

    if (verse !== undefined) {
      if (verse < 1 || !Number.isInteger(verse)) {
        return { valid: false, error: `Invalid verse number: ${verse}` }
      }
      if (verse > match.count) {
        return {
          valid: false,
          error: `Verse ${verse} does not exist in ${match.name} (${match.count} verses)`,
        }
      }
    }

    return { surah: match.n, verse, valid: true }
  }

  if (nameMatch && !surahs) {
    return { valid: false, error: `Unknown surah: "${trimmed}"` }
  }

  return { valid: false, error: `Invalid input: "${trimmed}"` }
}

/**
 * Find a surah by name (case-insensitive, with/without "Al-" prefix).
 * @param {string} query
 * @param {Array<{n: number, name: string}>} surahs
 * @returns {{n: number, name: string, count: number} | null}
 */
function findSurahByName(query, surahs) {
  const q = query.toLowerCase().replace(/^al[- ]/, '')

  for (const s of surahs) {
    const name = s.name.toLowerCase()
    const nameStripped = name.replace(/^al[- ]/, '')
    if (name === query.toLowerCase() || nameStripped === q) {
      return s
    }
  }

  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/safety/input-validator.test.js`
Expected: ALL tests PASS (existing + new)

- [ ] **Step 5: Commit**

```bash
git add src/safety/input-validator.js tests/unit/safety/input-validator.test.js
git commit -m "feat(safety): add name-based surah lookup and verse validation to parseNavigationInput"
```

---

### Task 2: Add nav panel CSS styles

**Files:**
- Modify: `src/core/theme.css`

- [ ] **Step 1: Add nav panel styles to theme.css**

Add after the existing `#nav-surface` block (after line 83). These rules cascade onto the existing `#nav-surface` base styles:

```css
/* Nav panel */
#nav-surface {
  width: 85%;
  max-width: 320px;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
}

#nav-surface.qa-nav-open {
  transform: translateX(0);
}

.qa-nav-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 199;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.qa-nav-backdrop.qa-nav-open {
  opacity: 1;
  pointer-events: auto;
}

.qa-nav-search {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--qa-border);
  border-radius: 4px;
  background: var(--qa-bg-secondary);
  color: var(--qa-text-primary);
  font-size: 0.875rem;
}

.qa-nav-search[aria-invalid="true"] {
  border-color: #ef4444;
  outline-color: #ef4444;
}

.qa-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.qa-nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--qa-border);
  cursor: pointer;
}

.qa-nav-item:hover {
  background: var(--qa-bg-secondary);
}

.qa-nav-current {
  border-left: 3px solid var(--qa-accent);
  background: var(--qa-bg-secondary);
}

.qa-nav-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--qa-bg-secondary);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--qa-text-secondary);
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.qa-nav-info {
  flex: 1;
  min-width: 0;
}

.qa-nav-item-name {
  font-size: 0.875rem;
  color: var(--qa-text-primary);
}

.qa-nav-item-meta {
  font-size: 0.75rem;
  color: var(--qa-text-secondary);
}

.qa-nav-item-arabic {
  font-family: 'KFGQPC Uthman Taha Naskh', 'Traditional Arabic', serif;
  font-size: 1.1rem;
  color: var(--qa-text-secondary);
  direction: rtl;
  margin-left: 0.5rem;
  flex-shrink: 0;
}

/* Hamburger toggle button */
.qa-nav-toggle {
  background: none;
  border: none;
  color: var(--qa-text-primary);
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0.25rem;
  line-height: 1;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/theme.css
git commit -m "style(nav): add nav panel slide, backdrop, list, highlight, and search styles"
```

---

### Task 3: Implement nav/index.js — core nav panel

**Files:**
- Create: `tests/unit/nav/nav.test.js`
- Rewrite: `src/nav/index.js`

- [ ] **Step 1: Write failing integration tests**

Create `tests/unit/nav/nav.test.js`:

```javascript
import { beforeEach, describe, it, expect, vi } from 'vitest'
import * as events from '../../../src/core/events.js'

const MOCK_SURAHS = [
  { n: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', type: 'Meccan', count: 7, juz: 1 },
  { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286, juz: 1 },
  { n: 36, name: 'Ya-Sin', arabic: 'يس', type: 'Meccan', count: 83, juz: 22 },
  { n: 114, name: 'An-Nas', arabic: 'الناس', type: 'Meccan', count: 6, juz: 30 },
]

vi.mock('../../../src/data/dataset.js', () => ({
  getSurah: vi.fn().mockResolvedValue({ ar: ['test'], en: ['test'] }),
  getSurahs: vi.fn().mockResolvedValue(MOCK_SURAHS),
}))

vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(),
  openDB: vi.fn().mockResolvedValue({}),
}))

describe('nav/index.js', () => {
  beforeEach(() => {
    document.body.innerHTML = [
      '<div id="app-shell">',
      '<header id="top-bar"></header>',
      '<main id="main-content"></main>',
      '<nav id="nav-surface" hidden></nav>',
      '<footer id="bottom-nav"></footer>',
      '</div>',
    ].join('')
    events.clear()
  })

  it('renders surah list into #nav-surface', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const navSurface = document.getElementById('nav-surface')
    const items = navSurface.querySelectorAll('.qa-nav-item')
    expect(items.length).toBe(4)
    expect(items[0].textContent).toContain('Al-Fatihah')
    expect(items[1].textContent).toContain('Al-Baqarah')
  })

  it('renders search input', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const search = document.querySelector('.qa-nav-search')
    expect(search).toBeTruthy()
    expect(search.type).toBe('search')
  })

  it('filters surah list on search input', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const search = document.querySelector('.qa-nav-search')
    search.value = 'ba'
    search.dispatchEvent(new Event('input'))

    const visibleItems = document.querySelectorAll('.qa-nav-item:not([hidden])')
    expect(visibleItems.length).toBe(1)
    expect(visibleItems[0].textContent).toContain('Al-Baqarah')
  })

  it('highlights current surah on reader:position-changed', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    events.emit('reader:position-changed', { surah: 2, verse: 1 })

    const current = document.querySelector('.qa-nav-current')
    expect(current).toBeTruthy()
    expect(current.getAttribute('data-surah')).toBe('2')
  })

  it('emits navigation:navigate on surah click', async () => {
    const navFn = vi.fn()
    events.on('navigation:navigate', navFn)

    const { init } = await import('../../../src/nav/index.js')
    await init()

    const firstItem = document.querySelector('.qa-nav-item')
    firstItem.click()

    expect(navFn).toHaveBeenCalledWith({ surah: 1 })
  })

  it('adds hamburger toggle to top-bar', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const toggle = document.querySelector('.qa-nav-toggle')
    expect(toggle).toBeTruthy()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens nav panel on hamburger click', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    const toggle = document.querySelector('.qa-nav-toggle')
    toggle.click()

    const navSurface = document.getElementById('nav-surface')
    expect(navSurface.classList.contains('qa-nav-open')).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  it('closes nav on Escape key', async () => {
    const { init } = await import('../../../src/nav/index.js')
    await init()

    // Open nav first
    const toggle = document.querySelector('.qa-nav-toggle')
    toggle.click()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    const navSurface = document.getElementById('nav-surface')
    expect(navSurface.classList.contains('qa-nav-open')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/nav/nav.test.js`
Expected: ALL tests FAIL (nav/index.js is a stub)

- [ ] **Step 3: Implement nav/index.js**

Replace `src/nav/index.js` with the full implementation. The module:
- Fetches surahs from `dataset.js` on init
- Renders surah list into `#nav-surface` using DOM methods (textContent only, no innerHTML with data)
- Creates search input with live filter and Enter-to-navigate
- Injects hamburger button into `#top-bar`
- Manages open/close state with CSS classes (`qa-nav-open`)
- Creates backdrop overlay for tap-to-close
- Listens for `reader:position-changed` and `reader:surah-loaded` events to update highlight
- Emits `navigation:navigate` events on surah selection
- Handles Escape key to close
- Checks `matchMedia('(max-width: 768px)')` for responsive auto-close

```javascript
/**
 * Nav panel: surah list, search, filter, dispatch.
 * Renders into #nav-surface. Hamburger toggle injected into #top-bar.
 */

import { getSurahs } from '../data/dataset.js'
import { emit, on } from '../core/events.js'
import { parseNavigationInput } from '../safety/input-validator.js'

let surahs = []
let currentSurah = null
let isOpen = false
let shouldAutoClose = false
let backdrop = null
let unsubPosition = null

/**
 * Initialize the nav panel.
 */
export async function init() {
  surahs = await getSurahs()
  shouldAutoClose = window.matchMedia('(max-width: 768px)').matches

  renderNavPanel()
  renderHamburgerToggle()
  setupEventListeners()

  window.matchMedia('(max-width: 768px)').addEventListener('change', (e) => {
    shouldAutoClose = e.matches
  })
}

/**
 * Render the nav panel into #nav-surface.
 */
function renderNavPanel() {
  const navSurface = document.getElementById('nav-surface')
  if (!navSurface) { return }

  navSurface.removeAttribute('hidden')

  while (navSurface.firstChild) {
    navSurface.removeChild(navSurface.firstChild)
  }

  // Search section
  const searchWrap = document.createElement('div')
  searchWrap.style.cssText = 'padding:1rem;border-bottom:1px solid var(--qa-border);'

  const searchInput = document.createElement('input')
  searchInput.type = 'search'
  searchInput.className = 'qa-nav-search'
  searchInput.placeholder = 'Search surah or verse'
  searchInput.setAttribute('aria-label', 'Search surah or verse')

  searchInput.addEventListener('input', () => {
    filterSurahList(searchInput.value)
    searchInput.removeAttribute('aria-invalid')
  })

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(searchInput.value)
    }
  })

  searchWrap.appendChild(searchInput)
  navSurface.appendChild(searchWrap)

  // Surah list
  const list = document.createElement('ul')
  list.className = 'qa-nav-list'
  list.setAttribute('role', 'navigation')
  list.setAttribute('aria-label', 'Surah list')

  surahs.forEach(s => {
    list.appendChild(createSurahItem(s))
  })

  navSurface.appendChild(list)

  // Backdrop
  backdrop = document.createElement('div')
  backdrop.className = 'qa-nav-backdrop'
  backdrop.addEventListener('click', closeNav)
  document.body.appendChild(backdrop)
}

function createSurahItem(s) {
  const li = document.createElement('li')
  li.className = 'qa-nav-item'
  li.setAttribute('data-surah', String(s.n))
  li.setAttribute('tabindex', '0')
  li.setAttribute('role', 'link')

  const num = document.createElement('span')
  num.className = 'qa-nav-number'
  num.textContent = String(s.n)

  const info = document.createElement('div')
  info.className = 'qa-nav-info'

  const name = document.createElement('div')
  name.className = 'qa-nav-item-name'
  name.textContent = s.name

  const meta = document.createElement('div')
  meta.className = 'qa-nav-item-meta'
  meta.textContent = `${s.count} verses \u00B7 ${s.type}`

  info.appendChild(name)
  info.appendChild(meta)

  const arabic = document.createElement('span')
  arabic.className = 'qa-nav-item-arabic'
  arabic.textContent = s.arabic

  li.appendChild(num)
  li.appendChild(info)
  li.appendChild(arabic)

  li.addEventListener('click', () => {
    emit('navigation:navigate', { surah: s.n })
    if (shouldAutoClose) { closeNav() }
  })

  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      emit('navigation:navigate', { surah: s.n })
      if (shouldAutoClose) { closeNav() }
    }
  })

  if (currentSurah === s.n) {
    li.classList.add('qa-nav-current')
  }

  return li
}

function filterSurahList(query) {
  const items = document.querySelectorAll('.qa-nav-item')
  const q = query.toLowerCase().trim()

  items.forEach(item => {
    if (!q) {
      item.removeAttribute('hidden')
      return
    }

    const surahNum = item.getAttribute('data-surah')
    const name = item.querySelector('.qa-nav-item-name')?.textContent?.toLowerCase() || ''

    if (surahNum.startsWith(q) || name.includes(q)) {
      item.removeAttribute('hidden')
    } else {
      item.setAttribute('hidden', '')
    }
  })
}

function handleSearchSubmit(value) {
  const searchInput = document.querySelector('.qa-nav-search')
  const result = parseNavigationInput(value, surahs)

  if (result.valid) {
    searchInput.removeAttribute('aria-invalid')
    emit('navigation:navigate', { surah: result.surah, verse: result.verse })
    if (shouldAutoClose) { closeNav() }
    if (!shouldAutoClose) {
      searchInput.value = ''
      filterSurahList('')
    }
  } else {
    searchInput.setAttribute('aria-invalid', 'true')
  }
}

function renderHamburgerToggle() {
  const topBar = document.getElementById('top-bar')
  if (!topBar) { return }

  const toggle = document.createElement('button')
  toggle.className = 'qa-nav-toggle'
  toggle.setAttribute('aria-label', 'Open navigation')
  toggle.setAttribute('aria-expanded', 'false')
  toggle.textContent = '\u2630'

  toggle.addEventListener('click', () => {
    if (isOpen) {
      closeNav()
    } else {
      openNav()
    }
  })

  topBar.insertBefore(toggle, topBar.firstChild)
}

function openNav() {
  const navSurface = document.getElementById('nav-surface')
  const toggle = document.querySelector('.qa-nav-toggle')

  if (navSurface) { navSurface.classList.add('qa-nav-open') }
  if (backdrop) { backdrop.classList.add('qa-nav-open') }
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'true')
    toggle.setAttribute('aria-label', 'Close navigation')
  }

  isOpen = true

  const current = document.querySelector('.qa-nav-current')
  if (current && typeof current.scrollIntoView === 'function') {
    current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

function closeNav() {
  const navSurface = document.getElementById('nav-surface')
  const toggle = document.querySelector('.qa-nav-toggle')

  if (navSurface) { navSurface.classList.remove('qa-nav-open') }
  if (backdrop) { backdrop.classList.remove('qa-nav-open') }
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false')
    toggle.setAttribute('aria-label', 'Open navigation')
  }

  isOpen = false
}

function updateHighlight(surahNum) {
  currentSurah = surahNum

  document.querySelectorAll('.qa-nav-current').forEach(el => {
    el.classList.remove('qa-nav-current')
  })

  const item = document.querySelector(`.qa-nav-item[data-surah="${surahNum}"]`)
  if (item) {
    item.classList.add('qa-nav-current')
    if (isOpen && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
}

function setupEventListeners() {
  if (unsubPosition) { unsubPosition() }
  unsubPosition = on('reader:position-changed', ({ surah }) => {
    updateHighlight(surah)
  })

  on('reader:surah-loaded', ({ surah }) => {
    updateHighlight(surah)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeNav()
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/nav/nav.test.js`
Expected: ALL tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/nav/index.js tests/unit/nav/nav.test.js
git commit -m "feat(nav): implement nav panel with surah list, search, filter, and highlight"
```

---

### Task 4: Wire nav into app bootstrap and handle navigation events

**Files:**
- Modify: `src/core/app.js`

- [ ] **Step 1: Add nav initialization and navigation handler to app.js**

In `src/core/app.js`, after the reader routes are registered (after line 32), add:

```javascript
// Initialize nav panel
const { init: initNav } = await import('../nav/index.js')
await initNav()

// Handle navigation events from nav panel
on('navigation:navigate', ({ surah, verse }) => {
  if (verse) {
    router.navigate(`#/s/${surah}/${verse}`)
  } else {
    router.navigate(`#/s/${surah}`)
  }
})
```

- [ ] **Step 2: Run all tests**

Run: `pnpm vitest run`
Expected: ALL tests PASS

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: 0 errors (warning for existing console.log is fine)

- [ ] **Step 4: Commit**

```bash
git add src/core/app.js
git commit -m "feat(app): wire nav panel init and navigation event handler"
```

---

### Task 5: Update Storybook to use real nav init()

**Files:**
- Modify: `src/nav/nav.stories.js`

- [ ] **Step 1: Update nav stories to use real init()**

Replace `src/nav/nav.stories.js`:

```javascript
import { setupMockFetch } from '../../stories/mock-data.js'

/** @type {import('@storybook/html').Meta} */
export default {
  title: 'Components/Nav Panel',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

async function renderNav() {
  setupMockFetch(1)

  const { init } = await import('./index.js')
  await init()

  // Open the nav panel so it's visible in the story
  const navSurface = document.getElementById('nav-surface')
  if (navSurface) {
    navSurface.classList.add('qa-nav-open')
  }
  const backdrop = document.querySelector('.qa-nav-backdrop')
  if (backdrop) {
    backdrop.classList.add('qa-nav-open')
  }

  return document.getElementById('app-shell')
}

/** Default — nav panel open with all surahs */
export const Default = {
  render: renderNav,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/nav/nav.stories.js
git commit -m "feat(storybook): update nav stories to use real init()"
```

---

### Task 6: Full verification

- [ ] **Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: ALL tests PASS

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: 0 errors

- [ ] **Step 3: Run production build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Run Storybook build**

Run: `pnpm build-storybook`
Expected: Build succeeds

- [ ] **Step 5: Manual testing checklist**

1. `pnpm dev` - open app - hamburger button visible in top bar
2. Click hamburger - nav slides in from left with backdrop
3. 114 surahs listed with Arabic names, transliterations, verse counts
4. Type "ba" in search - only Al-Baqarah visible
5. Clear search - all surahs visible
6. Type "2:255" + Enter - navigates to Al-Baqarah verse 255
7. Type "xyz" + Enter - input highlights red, no navigation
8. Click a surah - reader loads that surah
9. On mobile viewport: nav auto-closes after selection
10. Press Escape - nav closes
11. Click backdrop - nav closes
12. Current surah highlighted with accent bar
13. Open nav - current surah auto-scrolled into view
