# Reader Ambient Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 3-tab `bottom-nav` (Read / Review / About) with an ambient 4-glyph dock (📖 Read · ⌕ Search · ✦ Review · ⋯ More) and add a top **reference pill** that displays `surah:verse · Surah Name` while reading — the two surfaces that carry all nav on the Reader route per §4.1 of the design spec.

**Architecture:** Two new focused modules, one shared DOM shell.
- `src/nav/ambient-dock.js` — owns the bottom dock; reuses the existing `<footer id="bottom-nav">` mount point (no HTML change) but replaces the class vocabulary with `qa-dock-*`. Auto-hide semantics match the current bottom-nav (hide on scroll-down > 40px, show on scroll-up > 40px, always show near top).
- `src/nav/ambient-pill.js` — owns a new top reference pill, appended to `#top-bar`. Subscribes to `Events.READER_SURAH_LOADED` (to cache surah metadata) and `Events.READER_POSITION_CHANGED` (to update the displayed verse). Hidden on non-reader routes via hashchange.
- The old `src/nav/bottom-nav.js` is deleted outright; `src/core/app.js` replaces `initBottomNav()` with `initAmbientDock()` + `initAmbientPill()`. The `⌕` glyph opens the **existing hamburger drawer** as a stopgap — Plan #3 will swap that for the command sheet. The hamburger toggle button in the top bar stays, because the drawer still needs a way to open on desktop; it'll be removed alongside the drawer in Plan #3.

**Tech Stack:** Vitest (unit, jsdom), Vite (bundler), vanilla JS modules, CSS custom properties (consumes `--qa-ambient-*` tokens from Plan #1).

---

## Files

- **Create:** `src/nav/ambient-pill.js` — top reference pill
- **Create:** `src/nav/ambient-dock.js` — 4-glyph bottom dock
- **Create:** `tests/unit/nav/ambient-pill.test.js` — unit tests for pill
- **Create:** `tests/unit/nav/ambient-dock.test.js` — unit tests for dock
- **Modify:** `src/core/app.js:16,81` — swap `initBottomNav` import and call for the two new init functions
- **Modify:** `src/core/theme.css:331-379,1987-1989` — delete `#bottom-nav` + `.qa-bnav-*` rules; add `.qa-dock` + `.qa-pill-ref` rules using `--qa-ambient-*` tokens
- **Delete:** `src/nav/bottom-nav.js` — no longer referenced

No test file for `bottom-nav.js` exists today, so no test deletion is needed. `tests/unit/nav/nav.test.js` references `<footer id="bottom-nav"></footer>` in its fixture DOM and will keep working unchanged (the dock reuses that same element).

---

## Task 1: Ambient reference pill — module + tests

**Files:**
- Create: `src/nav/ambient-pill.js`
- Test: `tests/unit/nav/ambient-pill.test.js`

The pill sits at the top of the reader view showing the current reading position (`67:14 · Al-Mulk`) plus a `⌘K` hint on the right. It registers two subscriptions on init:
1. `Events.READER_SURAH_LOADED { surah }` → fetch `getSurahs()` once, cache the surah metadata lookup table, set the surah name.
2. `Events.READER_POSITION_CHANGED { surah, verse }` → update the verse number.

On non-reader routes (hash that does not start with `#/s/`), the pill is hidden via `.qa-pill-ref--hidden`. A `hashchange` handler toggles that class.

The pill is a button-role element (keyboard-focusable) that currently does nothing on click — it's a display affordance in this plan. Plan #3 will wire the click to open the command sheet.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/nav/ambient-pill.test.js` with this content:

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as events from '../../../src/core/events.js'
import { Events } from '../../../src/core/constants.js'

const MOCK_SURAHS = [
  { n: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', type: 'Meccan', count: 7 },
  { n: 67, name: 'Al-Mulk', arabic: 'الملك', type: 'Meccan', count: 30 },
  { n: 114, name: 'An-Nas', arabic: 'الناس', type: 'Meccan', count: 6 },
]

vi.mock('../../../src/data/dataset.js', () => ({
  getSurahs: vi.fn().mockResolvedValue(MOCK_SURAHS),
}))

function setupShell() {
  while (document.body.firstChild) { document.body.removeChild(document.body.firstChild) }
  const topBar = document.createElement('header')
  topBar.id = 'top-bar'
  const main = document.createElement('main')
  main.id = 'main-content'
  document.body.appendChild(topBar)
  document.body.appendChild(main)
}

describe('nav/ambient-pill.js', () => {
  beforeEach(() => {
    setupShell()
    events.clear()
    window.location.hash = '#/s/67'
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/ambient-pill.js')
    mod.destroyAmbientPill()
    window.location.hash = ''
  })

  it('appends a .qa-pill-ref element into #top-bar', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    const pill = document.querySelector('#top-bar .qa-pill-ref')
    expect(pill).toBeTruthy()
    expect(pill.getAttribute('role')).toBe('button')
    expect(pill.getAttribute('aria-label')).toBe('Current reading position')
  })

  it('renders the verse reference and surah name from READER_SURAH_LOADED + READER_POSITION_CHANGED', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    events.emit(Events.READER_SURAH_LOADED, { surah: 67 })
    await new Promise(r => setTimeout(r, 0))
    events.emit(Events.READER_POSITION_CHANGED, { surah: 67, verse: 14 })

    const ref = document.querySelector('.qa-pill-ref-text')
    expect(ref.textContent).toBe('67:14 · Al-Mulk')
  })

  it('defaults to verse 1 before a position event arrives', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    events.emit(Events.READER_SURAH_LOADED, { surah: 1 })
    await new Promise(r => setTimeout(r, 0))

    const ref = document.querySelector('.qa-pill-ref-text')
    expect(ref.textContent).toBe('1:1 · Al-Fatihah')
  })

  it('shows a ⌘K hint on the right', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    const hint = document.querySelector('.qa-pill-ref-hint')
    expect(hint).toBeTruthy()
    expect(hint.textContent).toBe('\u2318K')
  })

  it('hides the pill when the route is not a reader route', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    window.location.hash = '#/review'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    const pill = document.querySelector('.qa-pill-ref')
    expect(pill.classList.contains('qa-pill-ref--hidden')).toBe(true)
  })

  it('shows the pill again when navigating back into a reader route', async () => {
    const { initAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()

    window.location.hash = '#/review'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    window.location.hash = '#/s/67/14'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    const pill = document.querySelector('.qa-pill-ref')
    expect(pill.classList.contains('qa-pill-ref--hidden')).toBe(false)
  })

  it('destroyAmbientPill removes the pill and its listeners', async () => {
    const { initAmbientPill, destroyAmbientPill } = await import('../../../src/nav/ambient-pill.js')
    await initAmbientPill()
    destroyAmbientPill()

    expect(document.querySelector('.qa-pill-ref')).toBeFalsy()

    events.emit(Events.READER_POSITION_CHANGED, { surah: 1, verse: 1 })
    expect(document.querySelector('.qa-pill-ref')).toBeFalsy()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/unit/nav/ambient-pill.test.js`
Expected: FAIL with `Failed to load url .../src/nav/ambient-pill.js` (module does not exist yet).

- [ ] **Step 3: Write the pill module**

Create `src/nav/ambient-pill.js` with this content:

```javascript
/**
 * Ambient reference pill — top of reader route.
 * Shows "{surah}:{verse} · {Surah Name}" with a ⌘K hint.
 * Hides on non-reader routes.
 */

import { getSurahs } from '../data/dataset.js'
import { on } from '../core/events.js'
import { Events } from '../core/constants.js'

let pillEl = null
let refTextEl = null
let surahsById = null
let currentSurah = null
let currentVerse = 1
let unsubLoaded = null
let unsubPosition = null
let hashHandler = null

export async function initAmbientPill() {
  const topBar = document.getElementById('top-bar')
  if (!topBar) { return () => {} }

  destroyAmbientPill()

  pillEl = document.createElement('div')
  pillEl.className = 'qa-pill-ref'
  pillEl.setAttribute('role', 'button')
  pillEl.setAttribute('tabindex', '0')
  pillEl.setAttribute('aria-label', 'Current reading position')

  refTextEl = document.createElement('span')
  refTextEl.className = 'qa-pill-ref-text'
  refTextEl.textContent = ''

  const hint = document.createElement('span')
  hint.className = 'qa-pill-ref-hint'
  hint.textContent = '\u2318K'

  pillEl.appendChild(refTextEl)
  pillEl.appendChild(hint)
  topBar.appendChild(pillEl)

  unsubLoaded = on(Events.READER_SURAH_LOADED, async ({ surah }) => {
    await ensureSurahCache()
    currentSurah = surah
    currentVerse = 1
    render()
  })

  unsubPosition = on(Events.READER_POSITION_CHANGED, ({ surah, verse }) => {
    currentSurah = surah
    currentVerse = verse
    render()
  })

  hashHandler = applyRouteVisibility
  window.addEventListener('hashchange', hashHandler)
  applyRouteVisibility()

  return destroyAmbientPill
}

export function destroyAmbientPill() {
  if (unsubLoaded) { unsubLoaded(); unsubLoaded = null }
  if (unsubPosition) { unsubPosition(); unsubPosition = null }
  if (hashHandler) {
    window.removeEventListener('hashchange', hashHandler)
    hashHandler = null
  }
  if (pillEl && pillEl.parentNode) {
    pillEl.parentNode.removeChild(pillEl)
  }
  pillEl = null
  refTextEl = null
  currentSurah = null
  currentVerse = 1
}

async function ensureSurahCache() {
  if (surahsById) { return }
  const list = await getSurahs()
  surahsById = new Map(list.map(s => [s.n, s]))
}

function render() {
  if (!refTextEl || !currentSurah) { return }
  const meta = surahsById?.get(currentSurah)
  const name = meta?.name || ''
  refTextEl.textContent = name
    ? `${currentSurah}:${currentVerse} \u00B7 ${name}`
    : `${currentSurah}:${currentVerse}`
}

function applyRouteVisibility() {
  if (!pillEl) { return }
  const hash = window.location.hash || ''
  const isReader = hash.startsWith('#/s/')
  pillEl.classList.toggle('qa-pill-ref--hidden', !isReader)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/unit/nav/ambient-pill.test.js`
Expected: PASS (7 tests green).

- [ ] **Step 5: Commit**

```bash
git add src/nav/ambient-pill.js tests/unit/nav/ambient-pill.test.js
git commit -m "feat(nav): add ambient reference pill for reader surface"
```

---

## Task 2: Ambient dock — module + tests

**Files:**
- Create: `src/nav/ambient-dock.js`
- Test: `tests/unit/nav/ambient-dock.test.js`

The dock reuses the existing `<footer id="bottom-nav">` element (kept in `index.html`) but renders four glyphs instead of three. Click behavior:

| Glyph | Action |
|-------|--------|
| 📖 Read (active in reader) | Navigate to last-read surah (`#/s/{lastSurah}`) |
| ⌕ Search | **Stopgap:** trigger click on `.qa-nav-toggle` (opens existing drawer). Plan #3 replaces this with the command sheet. |
| ✦ Review | Navigate to `#/review` |
| ⋯ More | Navigate to `#/settings` |

Auto-hide mirrors the current bottom-nav logic: hide on scroll-down delta > 40px within `#main-content`, show on scroll-up delta > 40px or when `scrollTop < 20`. Active-tab detection matches the current hash and toggles `.qa-dock-item--active`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/nav/ambient-dock.test.js` with this content:

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(),
  openDB: vi.fn().mockResolvedValue({}),
}))

function setupShell() {
  while (document.body.firstChild) { document.body.removeChild(document.body.firstChild) }
  const topBar = document.createElement('header')
  topBar.id = 'top-bar'
  const toggle = document.createElement('button')
  toggle.className = 'qa-nav-toggle'
  toggle.setAttribute('aria-label', 'Open navigation')
  toggle.textContent = '\u2630'
  topBar.appendChild(toggle)

  const main = document.createElement('main')
  main.id = 'main-content'
  main.style.overflow = 'auto'
  main.style.height = '300px'

  const footer = document.createElement('footer')
  footer.id = 'bottom-nav'

  document.body.appendChild(topBar)
  document.body.appendChild(main)
  document.body.appendChild(footer)
}

describe('nav/ambient-dock.js', () => {
  beforeEach(() => {
    vi.resetModules()
    setupShell()
    window.location.hash = '#/s/1'
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/ambient-dock.js')
    mod.destroyAmbientDock()
    window.location.hash = ''
  })

  it('renders 4 dock items with read, search, review, more tabs', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const items = document.querySelectorAll('#bottom-nav .qa-dock-item')
    expect(items).toHaveLength(4)
    const ids = Array.from(items).map(el => el.getAttribute('data-tab'))
    expect(ids).toEqual(['read', 'search', 'review', 'more'])
  })

  it('marks the read tab active when on a reader route', async () => {
    window.location.hash = '#/s/1'
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const read = document.querySelector('#bottom-nav [data-tab="read"]')
    expect(read.classList.contains('qa-dock-item--active')).toBe(true)
  })

  it('marks the review tab active when on a review route', async () => {
    window.location.hash = '#/review'
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const review = document.querySelector('#bottom-nav [data-tab="review"]')
    expect(review.classList.contains('qa-dock-item--active')).toBe(true)
  })

  it('updates active tab on hashchange', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    window.location.hash = '#/review'
    window.dispatchEvent(new HashChangeEvent('hashchange'))

    const review = document.querySelector('#bottom-nav [data-tab="review"]')
    expect(review.classList.contains('qa-dock-item--active')).toBe(true)
    const read = document.querySelector('#bottom-nav [data-tab="read"]')
    expect(read.classList.contains('qa-dock-item--active')).toBe(false)
  })

  it('search glyph triggers a click on the existing hamburger toggle (stopgap)', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const toggle = document.querySelector('.qa-nav-toggle')
    const clickSpy = vi.fn()
    toggle.addEventListener('click', clickSpy)

    const search = document.querySelector('#bottom-nav [data-tab="search"]')
    search.click()
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('read glyph navigates to the last-read surah stored in settings', async () => {
    vi.resetModules()
    vi.doMock('../../../src/core/db.js', () => ({
      get: vi.fn().mockImplementation((store, key) => {
        if (store === 'settings' && key === 'lastSurface') {
          return Promise.resolve({ key, value: '#/s/67/14' })
        }
        return Promise.resolve(null)
      }),
      put: vi.fn().mockResolvedValue(),
      openDB: vi.fn().mockResolvedValue({}),
    }))
    setupShell()
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const read = document.querySelector('#bottom-nav [data-tab="read"]')
    expect(read.getAttribute('href')).toBe('#/s/67')
  })

  it('defaults read href to surah 1 when no last-read exists', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const read = document.querySelector('#bottom-nav [data-tab="read"]')
    expect(read.getAttribute('href')).toBe('#/s/1')
  })

  it('hides dock when user scrolls down past threshold in #main-content', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const footer = document.getElementById('bottom-nav')
    const main = document.getElementById('main-content')

    Object.defineProperty(main, 'scrollTop', { value: 200, writable: true, configurable: true })
    main.dispatchEvent(new Event('scroll'))

    expect(footer.classList.contains('qa-dock--hidden')).toBe(true)
  })

  it('shows dock again when user scrolls back up past threshold', async () => {
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const footer = document.getElementById('bottom-nav')
    const main = document.getElementById('main-content')

    Object.defineProperty(main, 'scrollTop', { value: 200, writable: true, configurable: true })
    main.dispatchEvent(new Event('scroll'))
    expect(footer.classList.contains('qa-dock--hidden')).toBe(true)

    Object.defineProperty(main, 'scrollTop', { value: 100, writable: true, configurable: true })
    main.dispatchEvent(new Event('scroll'))
    expect(footer.classList.contains('qa-dock--hidden')).toBe(false)
  })

  it('destroyAmbientDock empties the footer and removes listeners', async () => {
    const { initAmbientDock, destroyAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()
    destroyAmbientDock()

    const footer = document.getElementById('bottom-nav')
    expect(footer.children).toHaveLength(0)
    expect(footer.classList.contains('qa-dock--hidden')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/unit/nav/ambient-dock.test.js`
Expected: FAIL with `Failed to load url .../src/nav/ambient-dock.js` (module does not exist yet).

- [ ] **Step 3: Write the dock module**

Create `src/nav/ambient-dock.js` with this content:

```javascript
/**
 * Ambient 4-glyph dock — replaces the old Read/Review/About bottom nav.
 * Reuses the <footer id="bottom-nav"> mount point from index.html.
 * Auto-hides on scroll-down in #main-content, reveals on scroll-up / near top.
 */

import { get } from '../core/db.js'

const HIDE_DELTA = 40
const SHOW_NEAR_TOP = 20

let scrollTarget = null
let scrollHandler = null
let hashHandler = null
let lastTop = 0

const TABS = [
  { id: 'read',   label: 'Read',   icon: '\uD83D\uDCD6', matches: (h) => h.startsWith('#/s/') || h === '' || h === '#' },
  { id: 'search', label: 'Search', icon: '\u2315',       matches: () => false },
  { id: 'review', label: 'Review', icon: '\u2726',       matches: (h) => h.startsWith('#/review') || h.startsWith('#/t/') },
  { id: 'more',   label: 'More',   icon: '\u22EF',       matches: (h) => h.startsWith('#/settings') || h.startsWith('#/about') },
]

export async function initAmbientDock() {
  const footer = document.getElementById('bottom-nav')
  if (!footer) { return () => {} }

  destroyAmbientDock()

  const lastSurah = await getLastSurah()

  for (const t of TABS) {
    const a = document.createElement('a')
    a.className = 'qa-dock-item'
    a.setAttribute('data-tab', t.id)
    a.setAttribute('aria-label', t.label)

    if (t.id === 'read')   { a.href = `#/s/${lastSurah}` }
    else if (t.id === 'review') { a.href = '#/review' }
    else if (t.id === 'more')   { a.href = '#/settings' }
    else if (t.id === 'search') {
      a.href = '#'
      a.addEventListener('click', (e) => {
        e.preventDefault()
        const toggle = document.querySelector('.qa-nav-toggle')
        if (toggle) { toggle.click() }
      })
    }

    const icon = document.createElement('span')
    icon.className = 'qa-dock-icon'
    icon.textContent = t.icon

    const label = document.createElement('span')
    label.className = 'qa-dock-label'
    label.textContent = t.label

    a.appendChild(icon)
    a.appendChild(label)
    footer.appendChild(a)
  }

  hashHandler = () => updateActive(footer)
  updateActive(footer)
  window.addEventListener('hashchange', hashHandler)

  scrollTarget = document.getElementById('main-content')
  if (scrollTarget) {
    scrollHandler = () => {
      const top = scrollTarget.scrollTop
      const delta = top - lastTop
      if (top < SHOW_NEAR_TOP) {
        footer.classList.remove('qa-dock--hidden')
      } else if (delta > HIDE_DELTA) {
        footer.classList.add('qa-dock--hidden')
        lastTop = top
      } else if (delta < -HIDE_DELTA) {
        footer.classList.remove('qa-dock--hidden')
        lastTop = top
      }
      if (Math.abs(delta) > HIDE_DELTA) { lastTop = top }
    }
    scrollTarget.addEventListener('scroll', scrollHandler, { passive: true })
  }

  return destroyAmbientDock
}

export function destroyAmbientDock() {
  if (scrollTarget && scrollHandler) {
    scrollTarget.removeEventListener('scroll', scrollHandler)
  }
  if (hashHandler) {
    window.removeEventListener('hashchange', hashHandler)
  }
  scrollTarget = null
  scrollHandler = null
  hashHandler = null
  lastTop = 0

  const footer = document.getElementById('bottom-nav')
  if (footer) {
    while (footer.firstChild) { footer.removeChild(footer.firstChild) }
    footer.classList.remove('qa-dock--hidden')
  }
}

function updateActive(footer) {
  const hash = window.location.hash || ''
  for (const el of footer.querySelectorAll('.qa-dock-item')) {
    const tab = TABS.find(t => t.id === el.getAttribute('data-tab'))
    const active = tab?.matches(hash)
    el.classList.toggle('qa-dock-item--active', !!active)
    if (active) { el.setAttribute('aria-current', 'page') } else { el.removeAttribute('aria-current') }
  }
}

async function getLastSurah() {
  try {
    const rec = await get('settings', 'lastSurface')
    const val = rec?.value || ''
    const m = val.match(/^#\/s\/(\d+)/)
    if (m) { return parseInt(m[1], 10) }
  } catch { /* ignore */ }
  return 1
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/unit/nav/ambient-dock.test.js`
Expected: PASS (10 tests green).

- [ ] **Step 5: Commit**

```bash
git add src/nav/ambient-dock.js tests/unit/nav/ambient-dock.test.js
git commit -m "feat(nav): add ambient 4-glyph dock to replace Read/Review/About bottom nav"
```

---

## Task 3: Wire new modules into app bootstrap; delete old bottom-nav

**Files:**
- Modify: `src/core/app.js:16,81`
- Delete: `src/nav/bottom-nav.js`

Swap the single `initBottomNav()` call for `initAmbientDock()` + `initAmbientPill()`. Keep both cleanup functions in `bootCleanups`. Delete the old module.

- [ ] **Step 1: Update the app.js import line**

In `src/core/app.js`, change line 16 from:

```javascript
import { initBottomNav } from '../nav/bottom-nav.js'
```

to:

```javascript
import { initAmbientDock } from '../nav/ambient-dock.js'
import { initAmbientPill } from '../nav/ambient-pill.js'
```

- [ ] **Step 2: Update the bootstrap call**

In `src/core/app.js`, change the block around line 79-81 from:

```javascript
    // Initialize settings gear panel and mobile bottom nav
    bootCleanups.push(await initSettingsPanel())
    bootCleanups.push(await initBottomNav())
```

to:

```javascript
    // Initialize settings gear panel and ambient nav chrome (pill + dock)
    bootCleanups.push(await initSettingsPanel())
    bootCleanups.push(await initAmbientDock())
    bootCleanups.push(await initAmbientPill())
```

- [ ] **Step 3: Delete the old bottom-nav module**

Run:

```bash
rm src/nav/bottom-nav.js
```

- [ ] **Step 4: Run the full test suite to catch regressions**

Run: `pnpm vitest run`
Expected: PASS on every existing test. Nothing should reference `bottom-nav.js`; a broken import would surface as a Vite resolution error.

- [ ] **Step 5: Commit**

```bash
git add src/core/app.js src/nav/bottom-nav.js
git commit -m "refactor(app): replace bottom-nav with ambient pill + dock"
```

---

## Task 4: CSS — ambient dock + pill styles, remove old bottom-nav rules

**Files:**
- Modify: `src/core/theme.css:331-379` (remove old `.qa-bnav-*` and `#bottom-nav` styles)
- Modify: `src/core/theme.css:1987-1989` (keep desktop grid override — verify untouched)
- Modify: `src/core/theme.css` (append new ambient styles)

- [ ] **Step 1: Delete the old bottom-nav CSS block**

In `src/core/theme.css`, delete the block starting at line 331 (`#bottom-nav {`) through line 379 (the closing `}` after `.qa-bnav-active`). This removes 9 rules in one contiguous block: `#bottom-nav`, `#bottom-nav:empty`, `#bottom-nav.qa-bnav-hidden`, `.qa-bnav-item`, `.qa-bnav-item:hover`, `.qa-bnav-icon`, `.qa-bnav-label`, `.qa-bnav-active`.

After deletion, the lines immediately before (`#main-content` ending at `max-width: 800px; }`) should be followed directly by the `/* Settings gear + popover */` section header.

- [ ] **Step 2: Add the new ambient styles**

Append the following block to `src/core/theme.css` (put it right after the deleted section, before the `Settings gear + popover` header so the file stays grouped by feature):

```css
/* ==========================================================================
   Ambient pill (top reference) + dock (bottom 4-glyph nav)
   ========================================================================== */

.qa-pill-ref {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  margin-left: auto;
  border-radius: var(--qa-ambient-pill-radius);
  background-color: var(--qa-ambient-accent-soft);
  color: var(--qa-ambient-parchment);
  font-size: 0.75rem;
  line-height: 1;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.qa-pill-ref:focus-visible {
  outline: 2px solid var(--qa-ambient-accent);
  outline-offset: 2px;
}

.qa-pill-ref--hidden {
  opacity: 0;
  transform: translateY(-6px);
  pointer-events: none;
}

.qa-pill-ref-text {
  font-weight: 600;
  letter-spacing: 0.01em;
}

.qa-pill-ref-hint {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  color: var(--qa-ambient-dim);
  border: 1px solid var(--qa-ambient-accent-soft);
  border-radius: 4px;
  padding: 1px 5px;
}

#bottom-nav {
  position: sticky;
  bottom: 0;
  z-index: 100;
  background-color: var(--qa-ambient-surface);
  border-top: 1px solid var(--qa-ambient-border);
  display: flex;
  justify-content: space-around;
  padding: 0.5rem 0 max(0.5rem, env(safe-area-inset-bottom));
  transition: transform 0.25s ease;
  backdrop-filter: blur(12px);
}

#bottom-nav:empty { display: none; }

#bottom-nav.qa-dock--hidden {
  transform: translateY(110%);
}

.qa-dock-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0.375rem 0.25rem;
  color: var(--qa-ambient-dim);
  text-decoration: none;
  font-size: 0.75rem;
  min-height: 44px;
  transition: color 0.15s;
}

.qa-dock-item:hover {
  color: var(--qa-ambient-accent);
  text-decoration: none;
}

.qa-dock-icon {
  font-size: 1.125rem;
  line-height: 1;
}

.qa-dock-label {
  font-size: 0.6875rem;
  letter-spacing: 0.02em;
}

.qa-dock-item--active {
  color: var(--qa-ambient-accent);
  font-weight: 600;
}
```

- [ ] **Step 3: Verify the desktop grid override is intact**

In `src/core/theme.css`, confirm this block around line ~1940 (line number will shift after the earlier deletion) still exists unchanged:

```css
  #bottom-nav {
    grid-area: footer;
  }
```

If you accidentally deleted it in Step 1, re-add it inside the desktop media query.

- [ ] **Step 4: Sanity-check the full test suite still passes**

Run: `pnpm vitest run`
Expected: PASS on every existing test. CSS changes don't affect unit tests; we verify nothing regressed in the suite.

- [ ] **Step 5: Commit**

```bash
git add src/core/theme.css
git commit -m "style(nav): replace bottom-nav CSS with ambient dock + pill"
```

---

## Task 5: Build verification + smoke test

**Files:**
- None modified; this is a verification-only task.

- [ ] **Step 1: Run the production build**

Run: `pnpm build`
Expected: Build succeeds with no warnings about unresolved imports. Look specifically for any stray reference to `bottom-nav.js` — there should be none.

- [ ] **Step 2: Start the dev server**

Run: `pnpm dev`
Expected: Server starts on `http://localhost:5173` (or similar). Open it in a browser.

- [ ] **Step 3: Manual smoke checks**

Open DevTools console. Open the page at `http://localhost:5173/#/s/67` (Al-Mulk, Verse 1).

Verify:
- **Top pill visible:** shows `67:1 · Al-Mulk` with a `⌘K` hint on the right.
- **Bottom dock visible:** four glyphs in order: 📖 Read (highlighted) · ⌕ Search · ✦ Review · ⋯ More.
- **Scroll behavior:** scroll down in the reader by ~80px. The dock auto-hides on scroll-down (pill is route-bound, not scroll-bound, so it stays). Scroll back up — dock reappears.
- **Position updates the pill:** scroll deep enough to reach verse 10+. The pill text updates to `67:N · Al-Mulk` where N is the currently visible verse. This works because the reader emits `READER_POSITION_CHANGED` as the user scrolls.
- **Search stopgap:** click ⌕. The existing hamburger drawer should slide open. (Plan #3 will replace this with the command sheet.)
- **Review tab:** click ✦. Route changes to `#/review`, ✦ becomes active, pill disappears (not a reader route).
- **More tab:** click ⋯. Route changes to `#/settings`, ⋯ becomes active.
- **Return to reader:** click 📖. Route jumps to the last-read surah; pill reappears.
- **No console errors:** the console should have no errors or warnings related to nav, dock, or pill modules.

- [ ] **Step 4: Stop the dev server**

Hit `Ctrl+C` in the dev-server terminal.

- [ ] **Step 5: Commit**

No files changed — skip the commit step for this task.

---

## Post-Plan Note (for Plan #3)

The `⌕` dock glyph currently calls `.qa-nav-toggle.click()` as a stopgap. When Plan #3 (Command Sheet) lands:
- Remove that click handler and replace with `openCommandSheet()`.
- Delete the `.qa-nav-toggle` hamburger button in `src/nav/index.js`.
- Delete `src/nav/index.js`'s drawer rendering (the command sheet replaces it entirely).

The old drawer stays fully functional throughout the Plan #2 → Plan #3 transition so the app never has a broken search affordance in a commit.
