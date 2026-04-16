# Command Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hamburger drawer and the `⌕` dock stopgap with a single unified **Command Sheet** (`⌘K`) — a blurred-scrim overlay with a large search input and scoped result groups (Surahs, Verses, Actions) per §4.4 of the design spec.

**Architecture:** One new module, one new style block, one big subtraction.
- `src/nav/command-sheet.js` — mounts a hidden overlay (scrim + sheet) in `<body>`, exposes `openCommandSheet()` / `closeCommandSheet()`. Renders scoped result groups based on query. Fires `Events.NAVIGATION_NAVIGATE` for surah/verse results; triggers static actions (Jump to Review / Settings) directly. Handles ⌘K (Cmd/Ctrl+K) globally, Esc to close, ↑/↓ to move selection, Enter to activate.
- `src/nav/ambient-dock.js` — the `⌕` glyph switches from `.qa-nav-toggle.click()` to `openCommandSheet()`.
- `src/core/app.js` — removes `initNav` (drawer) and adds `initCommandSheet`. Keeps the existing `NAVIGATION_NAVIGATE` handler because the sheet re-uses it.
- `src/nav/index.js`, `tests/unit/nav/nav.test.js` — deleted.
- `index.html` — removes the `<nav id="nav-surface">` element, since no module owns it anymore.
- `src/core/theme.css` — deletes `#nav-surface`, `.qa-nav-*`, `.qa-nav-toggle`, `.qa-nav-backdrop` rules plus their desktop-grid overrides; updates `#app-shell` to a 3-row single-column grid (topbar/main/footer); adds `.qa-cmd-*` ambient-token styles for the new sheet.

**Tech Stack:** Vitest (unit, jsdom), Vite (bundler), vanilla JS modules, mitt event bus, CSS custom properties (consumes `--qa-ambient-*` tokens from Plan #1).

---

## Files

- **Create:** `src/nav/command-sheet.js` — overlay surface + resolver + keyboard
- **Create:** `tests/unit/nav/command-sheet.test.js` — unit tests (mount, resolver, keyboard, activation)
- **Modify:** `src/nav/ambient-dock.js:41-48` — replace `.qa-nav-toggle.click()` stopgap with `openCommandSheet()` import + call
- **Modify:** `tests/unit/nav/ambient-dock.test.js:398-409` — flip the stopgap test to assert `openCommandSheet` is invoked instead of clicking the hamburger
- **Modify:** `src/core/app.js:16-17,77-78` — add `initCommandSheet` import + call, remove `initNav` import + call
- **Modify:** `index.html:33` — remove the `<nav id="nav-surface">` element
- **Modify:** `src/core/theme.css:317,570-739,2002-2029` — drop all `.qa-nav-*` + `#nav-surface` rules; simplify desktop `#app-shell` grid; append `.qa-cmd-*` styles
- **Delete:** `src/nav/index.js`
- **Delete:** `tests/unit/nav/nav.test.js`

Scope is the **command sheet MVP** — Surahs group, Verses (direct-ref) group, Actions group (Jump to Review / Settings). Tags and Marks result groups, theme-switch commands, and the direct-ref verse preview card (§4.4) are explicitly **deferred** to a later plan (they require tag infrastructure and reader-data fetches that don't yet have stable shapes here).

---

## Task 1: Command sheet shell — mount / open / close / destroy

**Files:**
- Create: `src/nav/command-sheet.js`
- Test: `tests/unit/nav/command-sheet.test.js`

Create the overlay scaffold: a `.qa-cmd-scrim` that covers the viewport and a `.qa-cmd-sheet` anchored near the top containing an input + a results container. Both start hidden with `.qa-cmd--hidden`. `openCommandSheet()` removes the hidden class and focuses the input. `closeCommandSheet()` re-adds it. Clicking the scrim or pressing Escape while open closes the sheet. Destroy removes the DOM and unbinds listeners.

This task builds only the shell — no resolver yet. Query handling lands in Task 2.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/nav/command-sheet.test.js` with this content:

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const MOCK_SURAHS = [
  { n: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', type: 'Meccan', count: 7 },
  { n: 2, name: 'Al-Baqarah', arabic: 'البقرة', type: 'Medinan', count: 286 },
  { n: 67, name: 'Al-Mulk', arabic: 'الملك', type: 'Meccan', count: 30 },
  { n: 114, name: 'An-Nas', arabic: 'الناس', type: 'Meccan', count: 6 },
]

vi.mock('../../../src/data/dataset.js', () => ({
  getSurahs: vi.fn().mockResolvedValue(MOCK_SURAHS),
}))

vi.mock('../../../src/data/surah-meanings.js', () => ({
  getMeaning: vi.fn((n) => ({ 1: 'The Opening', 2: 'The Cow', 67: 'The Sovereignty', 114: 'Mankind' })[n] || ''),
}))

function setupShell() {
  while (document.body.firstChild) { document.body.removeChild(document.body.firstChild) }
  const topBar = document.createElement('header')
  topBar.id = 'top-bar'
  document.body.appendChild(topBar)
}

describe('nav/command-sheet.js — shell', () => {
  beforeEach(() => {
    vi.resetModules()
    setupShell()
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/command-sheet.js')
    mod.destroyCommandSheet()
  })

  it('mounts a hidden scrim + sheet into <body>', async () => {
    const { initCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    const scrim = document.querySelector('.qa-cmd-scrim')
    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(scrim).toBeTruthy()
    expect(sheet).toBeTruthy()
    expect(scrim.classList.contains('qa-cmd--hidden')).toBe(true)
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
    expect(sheet.getAttribute('role')).toBe('dialog')
    expect(sheet.getAttribute('aria-modal')).toBe('true')
  })

  it('renders a search input and a results container', async () => {
    const { initCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    const input = document.querySelector('.qa-cmd-input')
    const results = document.querySelector('.qa-cmd-results')
    expect(input).toBeTruthy()
    expect(input.getAttribute('type')).toBe('search')
    expect(input.getAttribute('placeholder')).toBe('Search surah, verse, tag, or command')
    expect(results).toBeTruthy()
    expect(results.getAttribute('role')).toBe('listbox')
  })

  it('openCommandSheet reveals the sheet and focuses the input', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    openCommandSheet()

    const scrim = document.querySelector('.qa-cmd-scrim')
    const sheet = document.querySelector('.qa-cmd-sheet')
    const input = document.querySelector('.qa-cmd-input')
    expect(scrim.classList.contains('qa-cmd--hidden')).toBe(false)
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(false)
    expect(document.activeElement).toBe(input)
  })

  it('closeCommandSheet hides the sheet', async () => {
    const { initCommandSheet, openCommandSheet, closeCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    openCommandSheet()
    closeCommandSheet()

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('clicking the scrim closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    openCommandSheet()
    document.querySelector('.qa-cmd-scrim').click()

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('pressing Escape while open closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    openCommandSheet()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('destroyCommandSheet removes DOM and detaches listeners', async () => {
    const { initCommandSheet, destroyCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    destroyCommandSheet()

    expect(document.querySelector('.qa-cmd-scrim')).toBeFalsy()
    expect(document.querySelector('.qa-cmd-sheet')).toBeFalsy()

    // Post-destroy open is a no-op and must not throw
    expect(() => openCommandSheet()).not.toThrow()
    expect(document.querySelector('.qa-cmd-sheet')).toBeFalsy()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/unit/nav/command-sheet.test.js`
Expected: FAIL with `Failed to load url .../src/nav/command-sheet.js` (module does not exist yet).

- [ ] **Step 3: Write the shell module**

Create `src/nav/command-sheet.js` with this content:

```javascript
/**
 * Command sheet — ⌘K surface, single unified search/actions overlay.
 * Replaces the old hamburger drawer.
 * Subsequent tasks extend this file with query resolution and keyboard navigation.
 */

let scrim = null
let sheet = null
let input = null
let results = null
let isOpen = false
let escapeHandler = null

export async function initCommandSheet() {
  destroyCommandSheet()

  scrim = document.createElement('div')
  scrim.className = 'qa-cmd-scrim qa-cmd--hidden'
  scrim.addEventListener('click', closeCommandSheet)

  sheet = document.createElement('div')
  sheet.className = 'qa-cmd-sheet qa-cmd--hidden'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Command sheet')

  const inputRow = document.createElement('div')
  inputRow.className = 'qa-cmd-input-row'

  const glyph = document.createElement('span')
  glyph.className = 'qa-cmd-input-glyph'
  glyph.setAttribute('aria-hidden', 'true')
  glyph.textContent = '\u2315'

  input = document.createElement('input')
  input.type = 'search'
  input.className = 'qa-cmd-input'
  input.setAttribute('placeholder', 'Search surah, verse, tag, or command')
  input.setAttribute('aria-label', 'Search surah, verse, tag, or command')
  input.setAttribute('autocomplete', 'off')
  input.maxLength = 50

  const hint = document.createElement('span')
  hint.className = 'qa-cmd-input-hint'
  hint.textContent = 'esc'

  inputRow.appendChild(glyph)
  inputRow.appendChild(input)
  inputRow.appendChild(hint)

  results = document.createElement('div')
  results.className = 'qa-cmd-results'
  results.setAttribute('role', 'listbox')

  sheet.appendChild(inputRow)
  sheet.appendChild(results)

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  escapeHandler = (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault()
      closeCommandSheet()
    }
  }
  document.addEventListener('keydown', escapeHandler)

  return destroyCommandSheet
}

export function openCommandSheet() {
  if (!sheet || !scrim || !input) { return }
  scrim.classList.remove('qa-cmd--hidden')
  sheet.classList.remove('qa-cmd--hidden')
  isOpen = true
  input.value = ''
  input.focus()
}

export function closeCommandSheet() {
  if (!sheet || !scrim) { return }
  scrim.classList.add('qa-cmd--hidden')
  sheet.classList.add('qa-cmd--hidden')
  isOpen = false
}

export function destroyCommandSheet() {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler)
    escapeHandler = null
  }
  if (scrim && scrim.parentNode) { scrim.parentNode.removeChild(scrim) }
  if (sheet && sheet.parentNode) { sheet.parentNode.removeChild(sheet) }
  scrim = null
  sheet = null
  input = null
  results = null
  isOpen = false
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/unit/nav/command-sheet.test.js`
Expected: PASS (7 tests green).

- [ ] **Step 5: Commit**

```bash
git add src/nav/command-sheet.js tests/unit/nav/command-sheet.test.js
git commit -m "feat(nav): add command sheet shell (mount/open/close/destroy)"
```

---

## Task 2: Query resolver + result rendering

**Files:**
- Modify: `src/nav/command-sheet.js` (add resolver + renderer; wire to input)
- Modify: `tests/unit/nav/command-sheet.test.js` (append resolver/rendering tests)

The resolver turns a query string + cached surah list into an ordered list of **groups**, where each group has a title, a count, and a list of items. Non-empty groups render in this order:

| Query form                        | Groups rendered                                                    |
|-----------------------------------|--------------------------------------------------------------------|
| empty                             | Actions: "Open Review", "Open Settings"                            |
| bare integer (e.g. `67`)          | Surahs (by number)                                                 |
| reference (e.g. `2:255`)          | Verses (direct-ref, single item)                                   |
| text (e.g. `baqarah`, `mulk`)     | Surahs (by name / meaning substring, max 6 results)                |

Each surah item activates by emitting `Events.NAVIGATION_NAVIGATE { surah }`. A verse item emits `{ surah, verse }`. Action items call `router.navigate` directly (they don't traverse through surah payloads). All three also close the sheet.

The input `input` event re-renders results on every keystroke (no debounce — the result set is at most 114 items).

- [ ] **Step 1: Append failing tests**

First, add a new import line at the top of `tests/unit/nav/command-sheet.test.js` — place it directly below the existing `import { describe, … } from 'vitest'` line:

```javascript
import * as events from '../../../src/core/events.js'
```

Then append the following `describe` block to the end of the same file (below the final `})` of the shell tests):

```javascript
describe('nav/command-sheet.js — resolver + rendering', () => {
  beforeEach(() => {
    vi.resetModules()
    setupShell()
    events.clear()
    window.location.hash = ''
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/command-sheet.js')
    mod.destroyCommandSheet()
  })

  async function typeQuery(q) {
    const input = document.querySelector('.qa-cmd-input')
    input.value = q
    input.dispatchEvent(new Event('input', { bubbles: true }))
    // Allow any async getSurahs resolution to settle
    await new Promise(r => setTimeout(r, 0))
  }

  it('renders an Actions group on empty query with Open Review and Open Settings', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('')

    const groups = document.querySelectorAll('.qa-cmd-group')
    expect(groups.length).toBeGreaterThanOrEqual(1)
    const titles = Array.from(groups).map(g => g.querySelector('.qa-cmd-group-title')?.textContent)
    expect(titles).toContain('Actions')

    const items = document.querySelectorAll('.qa-cmd-item')
    const labels = Array.from(items).map(el => el.querySelector('.qa-cmd-item-label')?.textContent)
    expect(labels).toContain('Open Review')
    expect(labels).toContain('Open Settings')
  })

  it('renders a Surahs group matching by number', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('67')

    const items = document.querySelectorAll('.qa-cmd-item[data-kind="surah"]')
    expect(items).toHaveLength(1)
    expect(items[0].getAttribute('data-surah')).toBe('67')
    expect(items[0].textContent).toContain('Al-Mulk')
  })

  it('renders a Surahs group matching by name substring, capped at 6', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('al')

    const items = document.querySelectorAll('.qa-cmd-item[data-kind="surah"]')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(6)
    const names = Array.from(items).map(el => el.textContent)
    expect(names.some(n => n.includes('Al-Fatihah'))).toBe(true)
  })

  it('renders a Verses group on direct-ref like 2:255', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('2:255')

    const groups = document.querySelectorAll('.qa-cmd-group')
    const titles = Array.from(groups).map(g => g.querySelector('.qa-cmd-group-title')?.textContent)
    expect(titles).toContain('Verses')

    const item = document.querySelector('.qa-cmd-item[data-kind="verse"]')
    expect(item).toBeTruthy()
    expect(item.getAttribute('data-surah')).toBe('2')
    expect(item.getAttribute('data-verse')).toBe('255')
    expect(item.textContent).toContain('2:255')
    expect(item.textContent).toContain('Al-Baqarah')
  })

  it('shows an empty state when the query has no matches', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('zzzzz')

    expect(document.querySelectorAll('.qa-cmd-item')).toHaveLength(0)
    const empty = document.querySelector('.qa-cmd-empty')
    expect(empty).toBeTruthy()
    expect(empty.textContent).toMatch(/no matches/i)
  })

  it('activating a surah item emits NAVIGATION_NAVIGATE { surah } and closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    const { Events } = await import('../../../src/core/constants.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('67')

    const navFn = vi.fn()
    events.on(Events.NAVIGATION_NAVIGATE, navFn)

    const item = document.querySelector('.qa-cmd-item[data-kind="surah"]')
    item.click()

    expect(navFn).toHaveBeenCalledWith({ surah: 67 })
    expect(document.querySelector('.qa-cmd-sheet').classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('activating a verse item emits NAVIGATION_NAVIGATE { surah, verse }', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    const { Events } = await import('../../../src/core/constants.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('2:255')

    const navFn = vi.fn()
    events.on(Events.NAVIGATION_NAVIGATE, navFn)

    const item = document.querySelector('.qa-cmd-item[data-kind="verse"]')
    item.click()

    expect(navFn).toHaveBeenCalledWith({ surah: 2, verse: 255 })
  })

  it('activating Open Review changes hash to #/review and closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('')

    const item = Array.from(document.querySelectorAll('.qa-cmd-item'))
      .find(el => el.textContent.includes('Open Review'))
    expect(item).toBeTruthy()
    item.click()

    expect(window.location.hash).toBe('#/review')
    expect(document.querySelector('.qa-cmd-sheet').classList.contains('qa-cmd--hidden')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/unit/nav/command-sheet.test.js`
Expected: FAIL on every resolver/rendering test (no resolver wired up yet).

- [ ] **Step 3: Extend the command sheet module**

Replace the contents of `src/nav/command-sheet.js` with this extended version:

```javascript
/**
 * Command sheet — ⌘K surface, single unified search/actions overlay.
 * Renders scoped result groups (Surahs, Verses, Actions) based on query.
 */

import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { getSurahs } from '../data/dataset.js'
import { getMeaning } from '../data/surah-meanings.js'

const MAX_SURAH_MATCHES = 6

let scrim = null
let sheet = null
let input = null
let results = null
let isOpen = false
let escapeHandler = null
let inputHandler = null
let surahCache = null

export async function initCommandSheet() {
  destroyCommandSheet()

  scrim = document.createElement('div')
  scrim.className = 'qa-cmd-scrim qa-cmd--hidden'
  scrim.addEventListener('click', closeCommandSheet)

  sheet = document.createElement('div')
  sheet.className = 'qa-cmd-sheet qa-cmd--hidden'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Command sheet')

  const inputRow = document.createElement('div')
  inputRow.className = 'qa-cmd-input-row'

  const glyph = document.createElement('span')
  glyph.className = 'qa-cmd-input-glyph'
  glyph.setAttribute('aria-hidden', 'true')
  glyph.textContent = '\u2315'

  input = document.createElement('input')
  input.type = 'search'
  input.className = 'qa-cmd-input'
  input.setAttribute('placeholder', 'Search surah, verse, tag, or command')
  input.setAttribute('aria-label', 'Search surah, verse, tag, or command')
  input.setAttribute('autocomplete', 'off')
  input.maxLength = 50

  const hint = document.createElement('span')
  hint.className = 'qa-cmd-input-hint'
  hint.textContent = 'esc'

  inputRow.appendChild(glyph)
  inputRow.appendChild(input)
  inputRow.appendChild(hint)

  results = document.createElement('div')
  results.className = 'qa-cmd-results'
  results.setAttribute('role', 'listbox')

  sheet.appendChild(inputRow)
  sheet.appendChild(results)

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  escapeHandler = (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault()
      closeCommandSheet()
    }
  }
  document.addEventListener('keydown', escapeHandler)

  inputHandler = () => { render() }
  input.addEventListener('input', inputHandler)

  surahCache = await getSurahs()

  return destroyCommandSheet
}

export function openCommandSheet() {
  if (!sheet || !scrim || !input) { return }
  scrim.classList.remove('qa-cmd--hidden')
  sheet.classList.remove('qa-cmd--hidden')
  isOpen = true
  input.value = ''
  render()
  input.focus()
}

export function closeCommandSheet() {
  if (!sheet || !scrim) { return }
  scrim.classList.add('qa-cmd--hidden')
  sheet.classList.add('qa-cmd--hidden')
  isOpen = false
}

export function destroyCommandSheet() {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler)
    escapeHandler = null
  }
  if (input && inputHandler) {
    input.removeEventListener('input', inputHandler)
    inputHandler = null
  }
  if (scrim && scrim.parentNode) { scrim.parentNode.removeChild(scrim) }
  if (sheet && sheet.parentNode) { sheet.parentNode.removeChild(sheet) }
  scrim = null
  sheet = null
  input = null
  results = null
  isOpen = false
  surahCache = null
}

function render() {
  if (!results) { return }
  const query = (input?.value || '').trim()
  const groups = resolve(query, surahCache || [])

  while (results.firstChild) { results.removeChild(results.firstChild) }

  if (groups.length === 0 || groups.every(g => g.items.length === 0)) {
    const empty = document.createElement('div')
    empty.className = 'qa-cmd-empty'
    empty.textContent = 'No matches'
    results.appendChild(empty)
    return
  }

  for (const group of groups) {
    if (group.items.length === 0) { continue }
    results.appendChild(renderGroup(group))
  }
}

function renderGroup(group) {
  const wrap = document.createElement('div')
  wrap.className = 'qa-cmd-group'

  const head = document.createElement('div')
  head.className = 'qa-cmd-group-head'

  const title = document.createElement('span')
  title.className = 'qa-cmd-group-title'
  title.textContent = group.title

  const count = document.createElement('span')
  count.className = 'qa-cmd-group-count'
  count.textContent = String(group.items.length)

  head.appendChild(title)
  head.appendChild(count)
  wrap.appendChild(head)

  for (const item of group.items) {
    wrap.appendChild(renderItem(item))
  }
  return wrap
}

function renderItem(item) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'qa-cmd-item'
  el.setAttribute('role', 'option')
  el.setAttribute('data-kind', item.kind)
  if (item.surah != null) { el.setAttribute('data-surah', String(item.surah)) }
  if (item.verse != null) { el.setAttribute('data-verse', String(item.verse)) }

  const glyph = document.createElement('span')
  glyph.className = 'qa-cmd-item-glyph'
  glyph.setAttribute('aria-hidden', 'true')
  glyph.textContent = item.glyph || ''

  const body = document.createElement('span')
  body.className = 'qa-cmd-item-body'

  const label = document.createElement('span')
  label.className = 'qa-cmd-item-label'
  label.textContent = item.label

  body.appendChild(label)

  if (item.meta) {
    const meta = document.createElement('span')
    meta.className = 'qa-cmd-item-meta'
    meta.textContent = item.meta
    body.appendChild(meta)
  }

  el.appendChild(glyph)
  el.appendChild(body)

  el.addEventListener('click', () => { activate(item) })

  return el
}

function activate(item) {
  closeCommandSheet()
  if (item.kind === 'surah') {
    emit(Events.NAVIGATION_NAVIGATE, { surah: item.surah })
  } else if (item.kind === 'verse') {
    emit(Events.NAVIGATION_NAVIGATE, { surah: item.surah, verse: item.verse })
  } else if (item.kind === 'action') {
    if (item.href) { window.location.hash = item.href }
  }
}

function resolve(query, surahs) {
  if (!query) { return [{ title: 'Actions', items: defaultActions() }] }

  const numericRef = query.match(/^(\d+):(\d+)$/)
  if (numericRef) {
    const s = parseInt(numericRef[1], 10)
    const v = parseInt(numericRef[2], 10)
    const meta = surahs.find(x => x.n === s)
    if (!meta || s < 1 || s > 114 || v < 1 || v > meta.count) { return [] }
    return [{
      title: 'Verses',
      items: [{
        kind: 'verse',
        glyph: `${s}:${v}`,
        surah: s,
        verse: v,
        label: `${s}:${v} \u00B7 ${meta.name}`,
        meta: getMeaning(s) || '',
      }],
    }]
  }

  const numericOnly = query.match(/^(\d+)$/)
  if (numericOnly) {
    const s = parseInt(numericOnly[1], 10)
    const meta = surahs.find(x => x.n === s)
    if (!meta) { return [] }
    return [{
      title: 'Surahs',
      items: [surahItem(meta)],
    }]
  }

  const q = query.toLowerCase()
  const matches = surahs.filter(s => {
    const name = (s.name || '').toLowerCase()
    const meaning = (getMeaning(s.n) || '').toLowerCase()
    return name.includes(q) || meaning.includes(q)
  }).slice(0, MAX_SURAH_MATCHES)

  if (matches.length === 0) { return [] }
  return [{ title: 'Surahs', items: matches.map(surahItem) }]
}

function surahItem(s) {
  return {
    kind: 'surah',
    glyph: String(s.n),
    surah: s.n,
    label: s.name,
    meta: getMeaning(s.n) || '',
  }
}

function defaultActions() {
  return [
    { kind: 'action', glyph: '\u2726', label: 'Open Review',   href: '#/review' },
    { kind: 'action', glyph: '\u22EF', label: 'Open Settings', href: '#/settings' },
  ]
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run tests/unit/nav/command-sheet.test.js`
Expected: PASS (all tests green — 7 shell + 8 resolver/rendering = 15 tests).

- [ ] **Step 5: Commit**

```bash
git add src/nav/command-sheet.js tests/unit/nav/command-sheet.test.js
git commit -m "feat(nav): add resolver + scoped result groups to command sheet"
```

---

## Task 3: Keyboard navigation (↑ / ↓ / Enter) + global ⌘K binding

**Files:**
- Modify: `src/nav/command-sheet.js`
- Modify: `tests/unit/nav/command-sheet.test.js`

Add:
1. **Arrow navigation** — `↓` moves selection to the next item, `↑` to the previous. Selected item gets `.qa-cmd-item--active` and `aria-selected="true"`. The input keeps focus (no DOM focus move — we virtualize the selection).
2. **Enter** — activates the current selection.
3. **Global ⌘K / Ctrl+K** — when the sheet is mounted (regardless of open/closed), `Cmd+K` (Mac) or `Ctrl+K` (Linux/Windows) toggles the sheet open and prevents default.

Selection is re-initialized to the first item on every re-render. If there are no items, selection is null.

- [ ] **Step 1: Append failing tests**

Append this `describe` block to `tests/unit/nav/command-sheet.test.js`:

```javascript
describe('nav/command-sheet.js — keyboard', () => {
  beforeEach(() => {
    vi.resetModules()
    setupShell()
    events.clear()
    window.location.hash = ''
  })

  afterEach(async () => {
    const mod = await import('../../../src/nav/command-sheet.js')
    mod.destroyCommandSheet()
  })

  async function typeQuery(q) {
    const input = document.querySelector('.qa-cmd-input')
    input.value = q
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(r => setTimeout(r, 0))
  }

  it('first item is active on render', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('al')

    const items = document.querySelectorAll('.qa-cmd-item')
    expect(items[0].classList.contains('qa-cmd--active')).toBe(true)
    expect(items[0].getAttribute('aria-selected')).toBe('true')
  })

  it('ArrowDown moves selection to the next item', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('al')

    const input = document.querySelector('.qa-cmd-input')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    const items = document.querySelectorAll('.qa-cmd-item')
    expect(items[0].classList.contains('qa-cmd--active')).toBe(false)
    expect(items[1].classList.contains('qa-cmd--active')).toBe(true)
  })

  it('ArrowUp on the first item wraps to the last', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('al')

    const input = document.querySelector('.qa-cmd-input')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))

    const items = document.querySelectorAll('.qa-cmd-item')
    expect(items[items.length - 1].classList.contains('qa-cmd--active')).toBe(true)
  })

  it('Enter activates the currently selected item', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    const { Events } = await import('../../../src/core/constants.js')
    await initCommandSheet()
    openCommandSheet()
    await typeQuery('67')

    const navFn = vi.fn()
    events.on(Events.NAVIGATION_NAVIGATE, navFn)

    const input = document.querySelector('.qa-cmd-input')
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    expect(navFn).toHaveBeenCalledWith({ surah: 67 })
    expect(document.querySelector('.qa-cmd-sheet').classList.contains('qa-cmd--hidden')).toBe(true)
  })

  it('global Cmd+K opens the sheet', async () => {
    const { initCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(false)
  })

  it('global Ctrl+K opens the sheet', async () => {
    const { initCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(false)
  })

  it('Cmd+K while open closes the sheet', async () => {
    const { initCommandSheet, openCommandSheet } = await import('../../../src/nav/command-sheet.js')
    await initCommandSheet()
    openCommandSheet()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))

    const sheet = document.querySelector('.qa-cmd-sheet')
    expect(sheet.classList.contains('qa-cmd--hidden')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/unit/nav/command-sheet.test.js`
Expected: 7 new tests FAIL (keyboard logic not implemented).

- [ ] **Step 3: Extend the command sheet module**

Make these edits to `src/nav/command-sheet.js`:

**Edit A — add state:** after the existing `let surahCache = null` line, add:

```javascript
let activeIndex = 0
let flatItems = []
let keyHandler = null
```

**Edit B — install the keyboard handler in `initCommandSheet`:** after the `document.addEventListener('keydown', escapeHandler)` line, add:

```javascript
keyHandler = onKeydown
document.addEventListener('keydown', keyHandler)
```

**Edit C — detach the handler in `destroyCommandSheet`:** after the `document.removeEventListener('keydown', escapeHandler)` block, add:

```javascript
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler)
    keyHandler = null
  }
```

and reset the state at the bottom of `destroyCommandSheet`:

```javascript
  activeIndex = 0
  flatItems = []
```

**Edit D — replace `render` so it rebuilds `flatItems` and marks the active one:**

```javascript
function render() {
  if (!results) { return }
  const query = (input?.value || '').trim()
  const groups = resolve(query, surahCache || [])

  while (results.firstChild) { results.removeChild(results.firstChild) }
  flatItems = []

  if (groups.length === 0 || groups.every(g => g.items.length === 0)) {
    const empty = document.createElement('div')
    empty.className = 'qa-cmd-empty'
    empty.textContent = 'No matches'
    results.appendChild(empty)
    activeIndex = 0
    return
  }

  for (const group of groups) {
    if (group.items.length === 0) { continue }
    results.appendChild(renderGroup(group))
  }

  activeIndex = 0
  applyActive()
}

function applyActive() {
  for (let i = 0; i < flatItems.length; i++) {
    const el = flatItems[i].el
    const on = i === activeIndex
    el.classList.toggle('qa-cmd--active', on)
    el.setAttribute('aria-selected', on ? 'true' : 'false')
  }
}
```

**Edit E — in `renderItem`, push every rendered item into `flatItems` before returning:** insert this line just before `return el`:

```javascript
  flatItems.push({ el, item })
```

**Edit F — add `onKeydown` at the bottom of the file:**

```javascript
function onKeydown(e) {
  const isK = e.key === 'k' || e.key === 'K'
  if (isK && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    if (isOpen) { closeCommandSheet() } else { openCommandSheet() }
    return
  }
  if (!isOpen) { return }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (flatItems.length === 0) { return }
    activeIndex = (activeIndex + 1) % flatItems.length
    applyActive()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (flatItems.length === 0) { return }
    activeIndex = (activeIndex - 1 + flatItems.length) % flatItems.length
    applyActive()
  } else if (e.key === 'Enter') {
    if (flatItems.length === 0) { return }
    e.preventDefault()
    activate(flatItems[activeIndex].item)
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run tests/unit/nav/command-sheet.test.js`
Expected: PASS (22 tests green — 7 shell + 8 resolver + 7 keyboard).

- [ ] **Step 5: Commit**

```bash
git add src/nav/command-sheet.js tests/unit/nav/command-sheet.test.js
git commit -m "feat(nav): add keyboard nav (↑↓/enter) + global ⌘K toggle"
```

---

## Task 4: Wire dock ⌕ to command sheet; remove the hamburger stopgap

**Files:**
- Modify: `src/nav/ambient-dock.js:41-48`
- Modify: `tests/unit/nav/ambient-dock.test.js:398-409`

The ⌕ glyph currently forwards to `.qa-nav-toggle.click()`. Swap that for a direct `openCommandSheet()` call. Update the dock test so it verifies the sheet opens instead of verifying the hamburger gets clicked.

- [ ] **Step 1: Update the failing stopgap test**

Open `tests/unit/nav/ambient-dock.test.js`. Replace the existing test block that starts:

```javascript
  it('search glyph triggers a click on the existing hamburger toggle (stopgap)', async () => {
```

and ends with its closing `})`, with this updated block:

```javascript
  it('search glyph opens the command sheet', async () => {
    const openSpy = vi.fn()
    vi.doMock('../../../src/nav/command-sheet.js', () => ({
      initCommandSheet: vi.fn().mockResolvedValue(() => {}),
      openCommandSheet: openSpy,
      closeCommandSheet: vi.fn(),
      destroyCommandSheet: vi.fn(),
    }))
    vi.resetModules()
    setupShell()
    const { initAmbientDock } = await import('../../../src/nav/ambient-dock.js')
    await initAmbientDock()

    const search = document.querySelector('#bottom-nav [data-tab="search"]')
    search.click()

    expect(openSpy).toHaveBeenCalledTimes(1)
  })
```

Also remove the now-obsolete `.qa-nav-toggle` element from the `setupShell()` helper — change the block that currently reads:

```javascript
  const topBar = document.createElement('header')
  topBar.id = 'top-bar'
  const toggle = document.createElement('button')
  toggle.className = 'qa-nav-toggle'
  toggle.setAttribute('aria-label', 'Open navigation')
  toggle.textContent = '\u2630'
  topBar.appendChild(toggle)
```

to:

```javascript
  const topBar = document.createElement('header')
  topBar.id = 'top-bar'
```

- [ ] **Step 2: Run the dock test to verify it fails**

Run: `pnpm vitest run tests/unit/nav/ambient-dock.test.js`
Expected: FAIL — the dock still calls `.qa-nav-toggle.click()`, so `openSpy` is never called.

- [ ] **Step 3: Swap the stopgap for the real call in ambient-dock.js**

Edit `src/nav/ambient-dock.js`. Add this import at the top of the file, immediately below the existing `import { get } from '../core/db.js'`:

```javascript
import { openCommandSheet } from './command-sheet.js'
```

Then replace this block (lines 41-48):

```javascript
    else if (t.id === 'search') {
      a.href = '#'
      a.addEventListener('click', (e) => {
        e.preventDefault()
        const toggle = document.querySelector('.qa-nav-toggle')
        if (toggle) { toggle.click() }
      })
    }
```

with:

```javascript
    else if (t.id === 'search') {
      a.href = '#'
      a.addEventListener('click', (e) => {
        e.preventDefault()
        openCommandSheet()
      })
    }
```

- [ ] **Step 4: Run the dock test to verify it passes**

Run: `pnpm vitest run tests/unit/nav/ambient-dock.test.js`
Expected: PASS (all 10 dock tests green).

- [ ] **Step 5: Commit**

```bash
git add src/nav/ambient-dock.js tests/unit/nav/ambient-dock.test.js
git commit -m "feat(nav): wire dock ⌕ glyph to command sheet (replaces hamburger stopgap)"
```

---

## Task 5: Remove the legacy drawer — JS, tests, HTML element

**Files:**
- Delete: `src/nav/index.js`
- Delete: `tests/unit/nav/nav.test.js`
- Modify: `src/core/app.js:16-17,77-78`
- Modify: `index.html:33`

`src/nav/index.js` owned the hamburger toggle, the `#nav-surface` surah list drawer, and the in-drawer search. Every piece has a replacement: the command sheet replaces search, and the surah list is reachable by name/number from the same sheet. No module populates `#nav-surface` after this task, so we drop it from `index.html` too.

- [ ] **Step 1: Delete the drawer module and its test file**

Run:

```bash
rm src/nav/index.js tests/unit/nav/nav.test.js
```

- [ ] **Step 2: Update `src/core/app.js` imports**

Open `src/core/app.js`. Change the import line at line 16:

```javascript
import { initAmbientDock } from '../nav/ambient-dock.js'
import { initAmbientPill } from '../nav/ambient-pill.js'
```

to:

```javascript
import { initAmbientDock } from '../nav/ambient-dock.js'
import { initAmbientPill } from '../nav/ambient-pill.js'
import { initCommandSheet } from '../nav/command-sheet.js'
```

- [ ] **Step 3: Update the bootstrap block**

In `src/core/app.js`, replace this block (lines 76-83):

```javascript
    // Initialize nav panel
    const { init: initNav } = await import('../nav/index.js')
    bootCleanups.push(await initNav())

    // Initialize settings gear panel and ambient nav chrome (pill + dock)
    bootCleanups.push(await initSettingsPanel())
    bootCleanups.push(await initAmbientDock())
    bootCleanups.push(await initAmbientPill())
```

with:

```javascript
    // Initialize settings gear panel, command sheet, and ambient nav chrome (pill + dock)
    bootCleanups.push(await initSettingsPanel())
    bootCleanups.push(await initCommandSheet())
    bootCleanups.push(await initAmbientDock())
    bootCleanups.push(await initAmbientPill())
```

Keep the existing `on(Events.NAVIGATION_NAVIGATE, …)` handler block unchanged — the command sheet emits the same event the drawer used to emit, so app-level routing still works through it.

- [ ] **Step 4: Remove the unused `<nav id="nav-surface">` element from `index.html`**

Open `index.html`. Delete this line:

```html
    <nav id="nav-surface" role="navigation" aria-label="Surah navigation" hidden></nav>
```

The `#app-shell` DOM afterwards contains only `<header id="top-bar">`, `<main id="main-content">`, and `<footer id="bottom-nav">`.

- [ ] **Step 5: Run the full test suite to catch regressions**

Run: `pnpm vitest run`
Expected: PASS on every remaining test. Any file that imported `src/nav/index.js` or `../../../src/nav/index.js` will surface as a Vite / Vitest module-resolution error — there shouldn't be any after Step 1, but the suite is the backstop.

- [ ] **Step 6: Commit**

```bash
git add src/core/app.js src/nav/index.js tests/unit/nav/nav.test.js index.html
git commit -m "refactor(nav): remove legacy drawer — command sheet replaces it"
```

---

## Task 6: CSS — command sheet styles, remove drawer rules, collapse desktop grid

**Files:**
- Modify: `src/core/theme.css:317` (top-bar grid-area declaration for `.qa-nav-toggle`)
- Modify: `src/core/theme.css:570-739` (entire "Navigation Surface (Sidebar/Drawer)" block)
- Modify: `src/core/theme.css:1986-2029` (desktop grid: drop nav column + related rules)
- Modify: `src/core/theme.css` (append command-sheet styles)

The drawer-era CSS is ~170 lines across two locations. After this task, no `.qa-nav-*` or `#nav-surface` class remains. The desktop grid simplifies from a two-column (`nav | main`) layout to a single-column shell (`topbar / main / footer`).

- [ ] **Step 1: Delete the drawer's `#top-bar .qa-nav-toggle` rule**

In `src/core/theme.css`, delete line 317:

```css
#top-bar .qa-nav-toggle { grid-area: ham; justify-self: start; }
```

- [ ] **Step 2: Delete the entire "Navigation Surface (Sidebar/Drawer)" block**

In `src/core/theme.css`, delete from line 570 (the `/* ==========…` comment above `#nav-surface`) through line 739 (the closing `}` of `.qa-nav-toggle:focus-visible`). That removes every rule with a `qa-nav-*` or `#nav-surface` selector in this section — 13 selectors total. After deletion, the lines immediately preceding it (e.g. top-bar block) should be followed directly by the `/* ==========…   Quran Reading Typography & Layout   …========== */` header.

- [ ] **Step 3: Simplify the desktop grid**

In `src/core/theme.css`, find the media query block that starts around line 1986 (`@media (min-width: 768px) {`). Replace the `#app-shell` rule plus every subsequent desktop rule that targets `#nav-surface`, `.qa-nav-backdrop`, or `.qa-nav-toggle`.

Change this:

```css
@media (min-width: 768px) {
  /* App shell: switch from flex-column to two-column grid */
  #app-shell {
    display: grid;
    grid-template-columns: 280px 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      "topbar topbar"
      "nav    main"
      "nav    footer";
  }

  #top-bar {
    grid-area: topbar;
  }

  /* Nav becomes a persistent sidebar — leave the fixed-overlay behind */
  #nav-surface {
    grid-area: nav;
    position: relative;   /* back into document flow */
    height: 100%;
    max-height: none;
    width: 100%;
    max-width: none;
    transform: none;      /* always visible */
    transition: none;
    box-shadow: none;
    border-right: 1px solid var(--qa-border);
    overflow-y: auto;
  }

  /* Keep open class a no-op so JS toggle doesn't re-hide the nav */
  #nav-surface.qa-nav-open {
    transform: none;
  }

  /* Backdrop and hamburger are not needed when nav is always visible */
  .qa-nav-backdrop {
    display: none;
  }

  .qa-nav-toggle {
    display: none;
  }

  #main-content {
    grid-area: main;
    padding: 2rem 1.5rem;
  }

  #bottom-nav {
    grid-area: footer;
  }
```

to:

```css
@media (min-width: 768px) {
  /* App shell: single-column grid; dock + pill + command sheet carry all nav */
  #app-shell {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      "topbar"
      "main"
      "footer";
  }

  #top-bar {
    grid-area: topbar;
  }

  #main-content {
    grid-area: main;
    padding: 2rem 1.5rem;
  }

  #bottom-nav {
    grid-area: footer;
  }
```

Leave the rest of the media query (mark-modal rule and anything below) untouched.

- [ ] **Step 4: Append command-sheet styles**

Append this block to the very end of `src/core/theme.css`:

```css
/* ==========================================================================
   Command sheet — ⌘K overlay
   ========================================================================== */

.qa-cmd-scrim {
  position: fixed;
  inset: 0;
  z-index: 299;
  background: rgba(14, 14, 12, 0.62);
  backdrop-filter: blur(6px);
  opacity: 1;
  transition: opacity 0.18s ease;
}

.qa-cmd-sheet {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: min(640px, calc(100vw - 24px));
  max-height: calc(100dvh - 24px);
  z-index: 300;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--qa-ambient-accent-soft);
  border-radius: 16px;
  background-color: var(--qa-ambient-surface);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.qa-cmd--hidden {
  opacity: 0;
  pointer-events: none;
}

.qa-cmd-sheet.qa-cmd--hidden {
  transform: translateX(-50%) translateY(-6px);
}

.qa-cmd-input-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--qa-ambient-border);
}

.qa-cmd-input-glyph {
  font-size: 1.125rem;
  color: var(--qa-ambient-dim);
  line-height: 1;
}

.qa-cmd-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--qa-ambient-parchment);
  font-size: 1rem;
  line-height: 1.4;
  min-width: 0;
}

.qa-cmd-input::placeholder {
  color: var(--qa-ambient-dim);
}

.qa-cmd-input-hint {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  color: var(--qa-ambient-dim);
  border: 1px solid var(--qa-ambient-accent-soft);
  border-radius: 4px;
  padding: 1px 6px;
}

.qa-cmd-results {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.qa-cmd-group {
  padding: 0.375rem 0 0.5rem;
}

.qa-cmd-group-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 1rem 0.375rem;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--qa-ambient-dim);
}

.qa-cmd-group-count {
  font-variant-numeric: tabular-nums;
  color: var(--qa-ambient-dim);
}

.qa-cmd-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.625rem 1rem;
  border: none;
  background: transparent;
  color: var(--qa-ambient-parchment);
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: background-color 0.12s ease;
}

.qa-cmd-item:hover,
.qa-cmd-item.qa-cmd--active {
  background-color: var(--qa-ambient-accent-soft);
}

.qa-cmd-item-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background-color: var(--qa-ambient-accent-soft);
  color: var(--qa-ambient-accent);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.qa-cmd-item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.qa-cmd-item-label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--qa-ambient-parchment);
}

.qa-cmd-item-meta {
  font-size: 0.75rem;
  color: var(--qa-ambient-dim);
}

.qa-cmd-empty {
  padding: 1.25rem 1rem;
  text-align: center;
  color: var(--qa-ambient-dim);
  font-size: 0.875rem;
}
```

- [ ] **Step 5: Sanity-check the full test suite**

Run: `pnpm vitest run`
Expected: PASS on every test — CSS changes don't hit unit tests, but we want a clean run before smoke-testing.

- [ ] **Step 6: Commit**

```bash
git add src/core/theme.css
git commit -m "style(nav): add command sheet CSS; remove drawer rules; collapse desktop grid"
```

---

## Task 7: Build verification + smoke test

**Files:**
- None modified; this task is verification-only.

- [ ] **Step 1: Run the production build**

Run: `pnpm build`
Expected: Build succeeds with no unresolved-import warnings. There should be no reference to `src/nav/index.js` in the output — that file no longer exists.

- [ ] **Step 2: Start the dev server**

Run: `pnpm dev`
Expected: Server starts on `http://localhost:5173` (or similar). Open it in a browser.

- [ ] **Step 3: Manual smoke checks**

Open DevTools console. Open `http://localhost:5173/#/s/67` (Al-Mulk).

Verify:
- **No hamburger button** in the top bar. The top bar shows only the brand wordmark and the settings gear.
- **No persistent sidebar** on desktop. The reader fills the full width below the top bar.
- **⌘K (or Ctrl+K on Windows/Linux) opens the command sheet.** A blurred scrim covers the viewport; a sheet is anchored near the top with the input focused.
- **Empty state:** with the input empty, two Actions are shown — "Open Review" and "Open Settings".
- **Number search:** type `67`. A single Surahs result for "Al-Mulk" appears. ↓ does nothing extra; ↑ wraps to the same item. Enter navigates to `#/s/67` and closes the sheet.
- **Name search:** reopen with ⌘K, type `baqarah`. "Al-Baqarah" appears under Surahs. Click it → route changes to `#/s/2`, sheet closes.
- **Direct-ref:** reopen with ⌘K, type `2:255`. A Verses group appears with one item reading `2:255 · Al-Baqarah`. Enter → route becomes `#/s/2/255`, the reader scrolls to ayah 255.
- **No matches:** type `zzzzz`. The body shows "No matches". No items rendered.
- **Actions:** clear the input, click "Open Review". Route becomes `#/review`, sheet closes.
- **Esc** closes the sheet. Backdrop click closes the sheet. Clicking inside the sheet (on the input or between items) does **not** close it.
- **Dock ⌕ glyph** on the bottom bar opens the same command sheet.
- **No console errors** — the console should have zero errors or warnings mentioning `nav/index`, `qa-nav-toggle`, or `command-sheet`.

- [ ] **Step 4: Stop the dev server**

Hit `Ctrl+C` in the dev-server terminal.

- [ ] **Step 5: Commit**

No files changed — skip the commit step for this task.

---

## Post-Plan Note (for downstream plans)

With the drawer gone, several legacy concepts are no longer referenced anywhere:
- `Events.NAVIGATION_NAVIGATE` has exactly one emitter (command sheet) and one subscriber (app.js bootstrap). If the standalone surah-list surface (§4.3, Plan #4) is added and wants the same routing hook, it can emit the same event — no shape change needed.
- The command sheet currently renders a minimal Actions group ("Open Review", "Open Settings"). When Tags / Marks infrastructure lands, add:
  - A **Tags** group (semantic color dot leading, label is the tag name) — filters marks by tag → deep-links to `#/t/:tag`.
  - A **Marks** group (verse excerpts with highlighted term) — opens the reader at that verse.
  - A **Commands** expansion — theme switches, font-size bump, etc.
- The `⌘K` hint on the reader pill (`src/nav/ambient-pill.js`) is already in place; clicking the pill is currently a no-op. Plan #4 or #5 should wire the pill click to `openCommandSheet()` to complete the "one unified surface" story from §4.4.
- The Open Review action currently does a direct `window.location.hash` assignment rather than routing through `Events.NAVIGATION_NAVIGATE` (which only understands surah/verse payloads). If a new router event for non-surah destinations is introduced, migrate the action-activation branch to use it instead.
