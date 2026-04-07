# Story 4: Verse Marks & Tagging — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable readers to long-press any verse, assign colored tags (Favourite, Study, Reflection, Question), see indicators on marked verses, and delete marks with undo.

**Architecture:** Marks are persisted in the existing IDB `marks` store (keyPath `verseKey`). Four modules handle distinct concerns: `store.js` (CRUD + events), `tags.js` (tag registry + deletion cascade), `editor.js` (modal UI + long-press), `indicator.js` (dot rendering). The reader emits `reader:verse-rendered` so indicators can decorate verses after chunked rendering. A `validateTagLabel()` function in `safety/input-validator.js` guards tag input.

**Tech Stack:** Vanilla JS, IDB via `src/core/db.js`, pub/sub via `src/core/events.js`, Vitest + fake-indexeddb + jsdom

---

### Task 1: Add event constants

**Files:**
- Modify: `src/core/constants.js`

- [ ] **Step 1: Add mark and reader event constants**

```js
// Add to the Events object in src/core/constants.js:
MARKS_SAVED: 'marks:saved',
MARKS_DELETED: 'marks:deleted',
MARKS_UNDO: 'marks:undo',
READER_VERSE_RENDERED: 'reader:verse-rendered',
```

Open `src/core/constants.js` and add these four entries inside the `Events` object, after the existing entries.

- [ ] **Step 2: Commit**

```bash
git add src/core/constants.js
git commit -m "feat(marks): add mark and verse-rendered event constants"
```

---

### Task 2: Implement tag label validation

**Files:**
- Modify: `src/safety/input-validator.js`
- Test: `tests/unit/safety/input-validator.test.js`

- [ ] **Step 1: Write failing tests for `validateTagLabel`**

Add to `tests/unit/safety/input-validator.test.js`:

```js
import { validateTagLabel } from '../../../src/safety/input-validator.js'

describe('validateTagLabel()', () => {
  it('accepts a valid lowercase label', () => {
    expect(validateTagLabel('study')).toEqual({ valid: true, label: 'study' })
  })

  it('lowercases the label', () => {
    expect(validateTagLabel('Study')).toEqual({ valid: true, label: 'study' })
  })

  it('trims whitespace', () => {
    expect(validateTagLabel('  study  ')).toEqual({ valid: true, label: 'study' })
  })

  it('rejects empty string', () => {
    expect(validateTagLabel('')).toEqual({ valid: false, error: 'Tag label is required' })
  })

  it('rejects whitespace-only', () => {
    expect(validateTagLabel('   ')).toEqual({ valid: false, error: 'Tag label is required' })
  })

  it('rejects null/undefined', () => {
    expect(validateTagLabel(null)).toEqual({ valid: false, error: 'Tag label is required' })
    expect(validateTagLabel(undefined)).toEqual({ valid: false, error: 'Tag label is required' })
  })

  it('rejects labels over 50 chars', () => {
    const long = 'a'.repeat(51)
    expect(validateTagLabel(long)).toEqual({ valid: false, error: 'Tag label must be 50 characters or less' })
  })

  it('rejects labels with control characters', () => {
    expect(validateTagLabel('study\x00')).toEqual({ valid: false, error: 'Tag label contains invalid characters' })
    expect(validateTagLabel('study\n')).toEqual({ valid: false, error: 'Tag label contains invalid characters' })
  })

  it('accepts labels at exactly 50 chars', () => {
    const exact = 'a'.repeat(50)
    expect(validateTagLabel(exact)).toEqual({ valid: true, label: exact })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/safety/input-validator.test.js`
Expected: FAIL — `validateTagLabel` is not exported

- [ ] **Step 3: Implement `validateTagLabel`**

Add to `src/safety/input-validator.js`:

```js
/**
 * Validate and normalize a tag label.
 * @param {string} raw
 * @returns {{ valid: boolean, label?: string, error?: string }}
 */
export function validateTagLabel(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, error: 'Tag label is required' }
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return { valid: false, error: 'Tag label is required' }
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Tag label must be 50 characters or less' }
  }

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return { valid: false, error: 'Tag label contains invalid characters' }
  }

  return { valid: true, label: trimmed.toLowerCase() }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/safety/input-validator.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/safety/input-validator.js tests/unit/safety/input-validator.test.js
git commit -m "feat(safety): add validateTagLabel for mark tag input"
```

---

### Task 3: Implement marks store (IDB CRUD)

**Files:**
- Modify: `src/marks/store.js`
- Create: `tests/unit/marks/store.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/marks/store.test.js`:

```js
import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { on } from '../../../src/core/events.js'

let store

beforeEach(async () => {
  await openDB()
  store = await import('../../../src/marks/store.js')
})

describe('marks/store.js', () => {
  describe('save()', () => {
    it('creates a new mark with verseKey and tags', async () => {
      await store.save('2:255', ['favourite', 'study'])
      const mark = await store.getByVerseKey('2:255')
      expect(mark.verseKey).toBe('2:255')
      expect(mark.tags).toEqual(['favourite', 'study'])
      expect(mark.createdAt).toBeTypeOf('number')
      expect(mark.updatedAt).toBeTypeOf('number')
    })

    it('updates an existing mark (preserves createdAt, updates updatedAt)', async () => {
      await store.save('2:255', ['favourite'])
      const first = await store.getByVerseKey('2:255')

      // Small delay to ensure updatedAt differs
      await new Promise(r => setTimeout(r, 10))
      await store.save('2:255', ['favourite', 'study'])

      const updated = await store.getByVerseKey('2:255')
      expect(updated.tags).toEqual(['favourite', 'study'])
      expect(updated.createdAt).toBe(first.createdAt)
      expect(updated.updatedAt).toBeGreaterThanOrEqual(first.updatedAt)
    })

    it('emits marks:saved event', async () => {
      const received = []
      const unsub = on('marks:saved', (payload) => received.push(payload))

      await store.save('2:255', ['favourite'])
      expect(received).toHaveLength(1)
      expect(received[0].verseKey).toBe('2:255')

      unsub()
    })
  })

  describe('del()', () => {
    it('deletes a mark by verseKey', async () => {
      await store.save('2:255', ['favourite'])
      await store.del('2:255')
      const mark = await store.getByVerseKey('2:255')
      expect(mark).toBeUndefined()
    })

    it('emits marks:deleted event', async () => {
      const received = []
      const unsub = on('marks:deleted', (payload) => received.push(payload))

      await store.save('2:255', ['favourite'])
      await store.del('2:255')
      expect(received).toHaveLength(1)
      expect(received[0].verseKey).toBe('2:255')

      unsub()
    })
  })

  describe('getByVerseKey()', () => {
    it('returns undefined for non-existent mark', async () => {
      const mark = await store.getByVerseKey('999:999')
      expect(mark).toBeUndefined()
    })
  })

  describe('getAll()', () => {
    it('returns all marks', async () => {
      await store.save('1:1', ['favourite'])
      await store.save('2:255', ['study'])
      const all = await store.getAll()
      expect(all).toHaveLength(2)
    })
  })

  describe('getByTag()', () => {
    it('returns marks matching a tag via the by-tag index', async () => {
      await store.save('1:1', ['favourite'])
      await store.save('2:255', ['study'])
      await store.save('3:1', ['favourite', 'study'])

      const favs = await store.getByTag('favourite')
      expect(favs).toHaveLength(2)
      expect(favs.map(m => m.verseKey).sort()).toEqual(['1:1', '3:1'])
    })
  })

  describe('removeTagFromAll()', () => {
    it('removes a tag from all marks that have it', async () => {
      await store.save('1:1', ['favourite', 'study'])
      await store.save('2:255', ['favourite'])
      await store.save('3:1', ['study'])

      await store.removeTagFromAll('favourite')

      const m1 = await store.getByVerseKey('1:1')
      expect(m1.tags).toEqual(['study'])

      const m2 = await store.getByVerseKey('2:255')
      expect(m2.tags).toEqual([])

      const m3 = await store.getByVerseKey('3:1')
      expect(m3.tags).toEqual(['study'])
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/marks/store.test.js`
Expected: FAIL — `getByVerseKey`, `getAll`, `getByTag`, `removeTagFromAll` not exported

- [ ] **Step 3: Implement marks store**

Replace `src/marks/store.js` with:

```js
/**
 * IDB CRUD for marks.
 * All mark persistence flows through this module.
 * Emits marks:saved and marks:deleted via core/events.
 */

import { getDb } from '../core/db.js'
import { emit } from '../core/events.js'

/**
 * Save (create or update) a mark.
 * @param {string} verseKey - e.g. '2:255'
 * @param {string[]} tags - lowercased tag labels
 */
export async function save(verseKey, tags) {
  const db = await getDb()
  const existing = await getByVerseKey(verseKey)
  const now = Date.now()

  const record = {
    verseKey,
    tags,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  }

  await new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readwrite')
    const store = tx.objectStore('marks')
    const request = store.put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  emit('marks:saved', { verseKey, tags })
}

/**
 * Delete a mark by verseKey.
 * @param {string} verseKey
 */
export async function del(verseKey) {
  const db = await getDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readwrite')
    const store = tx.objectStore('marks')
    const request = store.delete(verseKey)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  emit('marks:deleted', { verseKey })
}

/**
 * Get a single mark by verseKey.
 * @param {string} verseKey
 * @returns {Promise<{verseKey: string, tags: string[], createdAt: number, updatedAt: number} | undefined>}
 */
export async function getByVerseKey(verseKey) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const store = tx.objectStore('marks')
    const request = store.get(verseKey)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all marks.
 * @returns {Promise<Array>}
 */
export async function getAll() {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const store = tx.objectStore('marks')
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all marks with a specific tag using the by-tag index.
 * @param {string} tag - lowercased tag label
 * @returns {Promise<Array>}
 */
export async function getByTag(tag) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readonly')
    const store = tx.objectStore('marks')
    const index = store.index('by-tag')
    const request = index.getAll(tag)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Remove a tag from all marks that have it (cascade on tag deletion).
 * Marks with no remaining tags are kept (untagged).
 * @param {string} tag - lowercased tag label
 */
export async function removeTagFromAll(tag) {
  const marks = await getByTag(tag)
  const db = await getDb()

  await new Promise((resolve, reject) => {
    const tx = db.transaction('marks', 'readwrite')
    const store = tx.objectStore('marks')

    let remaining = marks.length
    if (remaining === 0) { resolve(); return }

    for (const mark of marks) {
      mark.tags = mark.tags.filter(t => t !== tag)
      mark.updatedAt = Date.now()
      const request = store.put(mark)
      request.onsuccess = () => {
        remaining--
        if (remaining === 0) resolve()
      }
      request.onerror = () => reject(request.error)
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/marks/store.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/marks/store.js tests/unit/marks/store.test.js
git commit -m "feat(marks): implement marks store with IDB CRUD and events"
```

---

### Task 4: Implement tag registry with cascade deletion

**Files:**
- Modify: `src/marks/tags.js`
- Create: `tests/unit/marks/tags.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/marks/tags.test.js`:

```js
import 'fake-indexeddb/auto'
import { openDB, get } from '../../../src/core/db.js'

let tags

beforeEach(async () => {
  await openDB()
  tags = await import('../../../src/marks/tags.js')
})

describe('marks/tags.js', () => {
  describe('getDefaults()', () => {
    it('returns 4 default tags with label and color', () => {
      const defaults = tags.getDefaults()
      expect(defaults).toHaveLength(4)
      expect(defaults[0]).toEqual({ label: 'favourite', color: '#f59e0b' })
      expect(defaults[1]).toEqual({ label: 'study', color: '#3b82f6' })
      expect(defaults[2]).toEqual({ label: 'reflection', color: '#22c55e' })
      expect(defaults[3]).toEqual({ label: 'question', color: '#a855f7' })
    })
  })

  describe('getActiveTags()', () => {
    it('returns all 4 defaults when none deleted', async () => {
      const active = await tags.getActiveTags()
      expect(active).toHaveLength(4)
    })

    it('excludes deleted defaults', async () => {
      await tags.deleteTag('study')
      const active = await tags.getActiveTags()
      expect(active).toHaveLength(3)
      expect(active.find(t => t.label === 'study')).toBeUndefined()
    })
  })

  describe('deleteTag()', () => {
    it('persists deleted tag to IDB settings', async () => {
      await tags.deleteTag('favourite')
      const record = await get('settings', 'deleted-default-tags')
      expect(record.value).toContain('favourite')
    })

    it('is idempotent — deleting same tag twice does not duplicate', async () => {
      await tags.deleteTag('study')
      await tags.deleteTag('study')
      const record = await get('settings', 'deleted-default-tags')
      expect(record.value.filter(t => t === 'study')).toHaveLength(1)
    })
  })

  describe('getColorForTag()', () => {
    it('returns color for a known tag', () => {
      expect(tags.getColorForTag('favourite')).toBe('#f59e0b')
    })

    it('returns a fallback color for unknown tag', () => {
      expect(tags.getColorForTag('unknown')).toBe('#888888')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/marks/tags.test.js`
Expected: FAIL — `getActiveTags`, `deleteTag`, `getColorForTag` not exported

- [ ] **Step 3: Implement tag registry**

Replace `src/marks/tags.js` with:

```js
/**
 * Tag registry.
 * 4 default tags with colors. Users can delete defaults (persisted to IDB).
 * Custom tag creation is DEFERRED to Phase 4.
 */

import { get, put } from '../core/db.js'
import { removeTagFromAll } from './store.js'

const DEFAULT_TAGS = [
  { label: 'favourite', color: '#f59e0b' },
  { label: 'study', color: '#3b82f6' },
  { label: 'reflection', color: '#22c55e' },
  { label: 'question', color: '#a855f7' },
]

const FALLBACK_COLOR = '#888888'
const DELETED_KEY = 'deleted-default-tags'

/**
 * Get the immutable list of 4 default tags.
 * @returns {Array<{label: string, color: string}>}
 */
export function getDefaults() {
  return DEFAULT_TAGS.map(t => ({ ...t }))
}

/**
 * Get active (non-deleted) tags.
 * @returns {Promise<Array<{label: string, color: string}>>}
 */
export async function getActiveTags() {
  const deleted = await getDeletedLabels()
  return DEFAULT_TAGS
    .filter(t => !deleted.includes(t.label))
    .map(t => ({ ...t }))
}

/**
 * Delete a default tag. Cascades: removes the tag from all marks.
 * @param {string} label - lowercased tag label
 */
export async function deleteTag(label) {
  const deleted = await getDeletedLabels()
  if (!deleted.includes(label)) {
    deleted.push(label)
    await put('settings', { key: DELETED_KEY, value: deleted })
  }
  await removeTagFromAll(label)
}

/**
 * Get color for a tag label.
 * @param {string} label
 * @returns {string} hex color
 */
export function getColorForTag(label) {
  const tag = DEFAULT_TAGS.find(t => t.label === label)
  return tag ? tag.color : FALLBACK_COLOR
}

/**
 * Read the list of deleted default tag labels from IDB.
 * @returns {Promise<string[]>}
 */
async function getDeletedLabels() {
  const record = await get('settings', DELETED_KEY)
  return record?.value ?? []
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/marks/tags.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/marks/tags.js tests/unit/marks/tags.test.js
git commit -m "feat(marks): implement tag registry with cascade deletion"
```

---

### Task 5: Add `reader:verse-rendered` event to reader

**Files:**
- Modify: `src/reader/index.js`
- Modify: `tests/unit/reader/reader.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/unit/reader/reader.test.js`:

```js
import { on } from '../../../src/core/events.js'

it('emits reader:verse-rendered for each verse in chunk', async () => {
  const received = []
  const unsub = on('reader:verse-rendered', (payload) => received.push(payload))

  // Trigger a surah load (reuse existing test setup for surah 112)
  await init({ surah: '112' })

  // Surah 112 has 4 verses — expect 4 events
  expect(received.length).toBeGreaterThanOrEqual(1)
  expect(received[0]).toHaveProperty('verseKey')
  expect(received[0]).toHaveProperty('element')

  unsub()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/reader/reader.test.js`
Expected: FAIL — no `reader:verse-rendered` event emitted

- [ ] **Step 3: Emit `reader:verse-rendered` in `renderVerseChunk`**

In `src/reader/index.js`, inside the `renderVerseChunk` function, after `fragment.appendChild(verseBlock)` (around line 209), add:

```js
emit(Events.READER_VERSE_RENDERED, {
  verseKey: `${currentSurahNum}:${verseNum}`,
  element: verseBlock,
})
```

The `Events` import already exists at line 10. The `emit` import already exists at line 9.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/reader/reader.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/reader/index.js tests/unit/reader/reader.test.js
git commit -m "feat(reader): emit reader:verse-rendered event for indicator decoration"
```

---

### Task 6: Implement mark indicator (colored dots)

**Files:**
- Modify: `src/marks/indicator.js`
- Create: `tests/unit/marks/indicator.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/marks/indicator.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/marks/indicator.test.js`
Expected: FAIL — `decorateVerse` not exported

- [ ] **Step 3: Implement indicator**

Replace `src/marks/indicator.js` with:

```js
/**
 * Colored dot indicators on marked verses.
 * Subscribes to reader:verse-rendered to decorate newly rendered verses.
 * Subscribes to marks:saved / marks:deleted to update existing indicators.
 */

import { getByVerseKey } from './store.js'
import { getColorForTag } from './tags.js'
import { on } from '../core/events.js'

/**
 * Decorate a verse element with colored tag dots.
 * @param {string} verseKey - e.g. '2:255'
 * @param {HTMLElement} element - the verse DOM element
 */
export async function decorateVerse(verseKey, element) {
  const existing = element.querySelector('.qa-mark-dots')
  if (existing) existing.remove()

  const mark = await getByVerseKey(verseKey)
  if (!mark || mark.tags.length === 0) return

  const dots = document.createElement('div')
  dots.className = 'qa-mark-dots'

  for (const tag of mark.tags) {
    const dot = document.createElement('span')
    dot.className = 'qa-mark-dot'
    dot.style.backgroundColor = getColorForTag(tag)
    dots.appendChild(dot)
  }

  element.insertBefore(dots, element.firstChild)
}

/**
 * Initialize indicator listeners.
 * @returns {Function} cleanup function
 */
export function init() {
  const unsub1 = on('reader:verse-rendered', ({ verseKey, element }) => {
    decorateVerse(verseKey, element)
  })

  const unsub2 = on('marks:saved', ({ verseKey }) => {
    const el = document.querySelector(`[data-verse="${verseKey.split(':')[1]}"]`)
    if (el) decorateVerse(verseKey, el)
  })

  const unsub3 = on('marks:deleted', ({ verseKey }) => {
    const el = document.querySelector(`[data-verse="${verseKey.split(':')[1]}"]`)
    if (el) {
      const dots = el.querySelector('.qa-mark-dots')
      if (dots) dots.remove()
    }
  })

  return () => { unsub1(); unsub2(); unsub3() }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/marks/indicator.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/marks/indicator.js tests/unit/marks/indicator.test.js
git commit -m "feat(marks): implement colored dot indicators on marked verses"
```

---

### Task 7: Implement mark editor modal

**Files:**
- Modify: `src/marks/editor.js`
- Create: `tests/unit/marks/editor.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/marks/editor.test.js`:

```js
import 'fake-indexeddb/auto'
import { openDB } from '../../../src/core/db.js'
import { save, getByVerseKey } from '../../../src/marks/store.js'

let editor

beforeEach(async () => {
  await openDB()
  document.body.innerHTML = '<div id="app-shell"><main id="main-content"></main></div>'
  editor = await import('../../../src/marks/editor.js')
})

describe('marks/editor.js', () => {
  describe('openEditor()', () => {
    it('renders a modal with tag checkboxes', async () => {
      await editor.openEditor('2:255')

      const modal = document.querySelector('.qa-mark-modal')
      expect(modal).not.toBeNull()
      expect(modal.getAttribute('role')).toBe('dialog')

      const checkboxes = modal.querySelectorAll('input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThanOrEqual(4)
    })

    it('pre-fills checkboxes for an already-marked verse', async () => {
      await save('2:255', ['favourite', 'study'])
      await editor.openEditor('2:255')

      const modal = document.querySelector('.qa-mark-modal')
      const favCheckbox = modal.querySelector('input[value="favourite"]')
      expect(favCheckbox.checked).toBe(true)

      const reflectionCheckbox = modal.querySelector('input[value="reflection"]')
      expect(reflectionCheckbox.checked).toBe(false)
    })

    it('saves mark when Save button is clicked', async () => {
      await editor.openEditor('2:255')

      const modal = document.querySelector('.qa-mark-modal')
      const studyCheckbox = modal.querySelector('input[value="study"]')
      studyCheckbox.checked = true
      studyCheckbox.dispatchEvent(new Event('change'))

      const saveBtn = modal.querySelector('[data-action="save"]')
      saveBtn.click()

      // Wait for async save
      await new Promise(r => setTimeout(r, 50))

      const mark = await getByVerseKey('2:255')
      expect(mark.tags).toContain('study')
    })

    it('closes modal when Cancel button is clicked', async () => {
      await editor.openEditor('2:255')
      const cancelBtn = document.querySelector('[data-action="cancel"]')
      cancelBtn.click()

      const modal = document.querySelector('.qa-mark-modal')
      expect(modal).toBeNull()
    })
  })

  describe('delete from editor', () => {
    it('deletes mark and shows undo toast', async () => {
      await save('2:255', ['favourite'])
      await editor.openEditor('2:255')

      const deleteBtn = document.querySelector('[data-action="delete"]')
      deleteBtn.click()

      await new Promise(r => setTimeout(r, 50))

      // Modal closed
      expect(document.querySelector('.qa-mark-modal')).toBeNull()

      // Undo toast visible
      const toast = document.querySelector('.qa-undo-toast')
      expect(toast).not.toBeNull()
    })
  })

  describe('long-press handler', () => {
    it('setupLongPress attaches to a container', () => {
      const container = document.getElementById('main-content')
      const cleanup = editor.setupLongPress(container)
      expect(typeof cleanup).toBe('function')
      cleanup()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/marks/editor.test.js`
Expected: FAIL — `openEditor`, `setupLongPress` not exported

- [ ] **Step 3: Implement mark editor**

Replace `src/marks/editor.js` with:

```js
/**
 * Mark editor modal.
 * Opens on long-press (touch) or hover-icon click (mouse).
 * Allows assigning/removing tags and deleting marks.
 */

import { save, del, getByVerseKey } from './store.js'
import { getActiveTags, getColorForTag } from './tags.js'
import { emit } from '../core/events.js'

const LONG_PRESS_MS = 500
const UNDO_TIMEOUT_MS = 5000

let activeModal = null
let undoTimer = null
let undoRecord = null

/**
 * Open the mark editor modal for a verse.
 * @param {string} verseKey - e.g. '2:255'
 */
export async function openEditor(verseKey) {
  closeEditor()

  const existing = await getByVerseKey(verseKey)
  const activeTags = await getActiveTags()
  const currentTags = existing ? existing.tags : []

  const backdrop = document.createElement('div')
  backdrop.className = 'qa-mark-backdrop'
  backdrop.addEventListener('click', closeEditor)

  const modal = document.createElement('div')
  modal.className = 'qa-mark-modal'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-label', `Mark verse ${verseKey}`)

  const title = document.createElement('h2')
  title.className = 'qa-mark-title'
  title.textContent = `Verse ${verseKey}`
  modal.appendChild(title)

  const tagList = document.createElement('div')
  tagList.className = 'qa-mark-tags'

  for (const tag of activeTags) {
    const label = document.createElement('label')
    label.className = 'qa-mark-tag-label'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.value = tag.label
    checkbox.checked = currentTags.includes(tag.label)

    const swatch = document.createElement('span')
    swatch.className = 'qa-mark-tag-swatch'
    swatch.style.backgroundColor = tag.color

    const text = document.createTextNode(` ${tag.label}`)

    label.appendChild(checkbox)
    label.appendChild(swatch)
    label.appendChild(text)
    tagList.appendChild(label)
  }
  modal.appendChild(tagList)

  const actions = document.createElement('div')
  actions.className = 'qa-mark-actions'

  const saveBtn = document.createElement('button')
  saveBtn.className = 'qa-mark-save-btn'
  saveBtn.setAttribute('data-action', 'save')
  saveBtn.textContent = 'Save'
  saveBtn.addEventListener('click', async () => {
    const selected = Array.from(
      modal.querySelectorAll('input[type="checkbox"]:checked')
    ).map(cb => cb.value)
    await save(verseKey, selected)
    closeEditor()
  })

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'qa-mark-cancel-btn'
  cancelBtn.setAttribute('data-action', 'cancel')
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', closeEditor)

  actions.appendChild(saveBtn)
  actions.appendChild(cancelBtn)

  if (existing) {
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'qa-mark-delete-btn'
    deleteBtn.setAttribute('data-action', 'delete')
    deleteBtn.textContent = 'Delete'
    deleteBtn.addEventListener('click', async () => {
      undoRecord = existing
      await del(verseKey)
      closeEditor()
      showUndoToast(verseKey)
    })
    actions.appendChild(deleteBtn)
  }

  modal.appendChild(actions)

  const shell = document.getElementById('app-shell') || document.body
  shell.appendChild(backdrop)
  shell.appendChild(modal)
  activeModal = { backdrop, modal }

  // Focus trap: focus the first checkbox
  const firstCheckbox = modal.querySelector('input[type="checkbox"]')
  if (firstCheckbox) firstCheckbox.focus()

  // Escape key closes modal
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEditor()
  })
}

/**
 * Close the active editor modal.
 */
export function closeEditor() {
  if (activeModal) {
    activeModal.backdrop.remove()
    activeModal.modal.remove()
    activeModal = null
  }
}

/**
 * Show undo toast after delete.
 * @param {string} verseKey
 */
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
      await save(undoRecord.verseKey, undoRecord.tags)
      undoRecord = null
      emit('marks:undo', { verseKey })
    }
    clearUndoToast()
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

/**
 * Remove the undo toast.
 */
function clearUndoToast() {
  if (undoTimer) {
    clearTimeout(undoTimer)
    undoTimer = null
  }
  const toast = document.querySelector('.qa-undo-toast')
  if (toast) toast.remove()
}

/**
 * Create a bookmark SVG icon element (no innerHTML — safe DOM construction).
 * @returns {SVGElement}
 */
function createBookmarkIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 16 16')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M3 1h10v14l-5-3-5 3V1z')
  path.setAttribute('fill', 'currentColor')
  svg.appendChild(path)
  return svg
}

/**
 * Set up long-press detection on a container (event delegation).
 * @param {HTMLElement} container
 * @returns {Function} cleanup function
 */
export function setupLongPress(container) {
  let pressTimer = null

  function getVerseKey(element) {
    const verseEl = element.closest('[data-verse]')
    if (!verseEl) return null
    const verseNum = verseEl.getAttribute('data-verse')
    const match = location.hash.match(/#\/s\/(\d+)/)
    const surahNum = match ? match[1] : null
    if (!surahNum || !verseNum) return null
    return `${surahNum}:${verseNum}`
  }

  function onTouchStart(e) {
    const verseKey = getVerseKey(e.target)
    if (!verseKey) return
    pressTimer = setTimeout(() => {
      openEditor(verseKey)
      pressTimer = null
    }, LONG_PRESS_MS)
  }

  function onTouchEnd() {
    if (pressTimer) {
      clearTimeout(pressTimer)
      pressTimer = null
    }
  }

  function onTouchMove() {
    if (pressTimer) {
      clearTimeout(pressTimer)
      pressTimer = null
    }
  }

  function onMouseOver(e) {
    const verseEl = e.target.closest('[data-verse]')
    if (!verseEl) return
    if (verseEl.querySelector('.qa-mark-hover-icon')) return

    const icon = document.createElement('button')
    icon.className = 'qa-mark-hover-icon'
    icon.setAttribute('aria-label', 'Mark this verse')
    icon.appendChild(createBookmarkIcon())
    icon.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const vKey = getVerseKey(verseEl)
      if (vKey) openEditor(vKey)
    })
    verseEl.insertBefore(icon, verseEl.firstChild)
  }

  function onMouseOut(e) {
    const verseEl = e.target.closest('[data-verse]')
    if (verseEl) {
      const icon = verseEl.querySelector('.qa-mark-hover-icon')
      if (icon) icon.remove()
    }
  }

  container.addEventListener('touchstart', onTouchStart, { passive: true })
  container.addEventListener('touchend', onTouchEnd)
  container.addEventListener('touchmove', onTouchMove)
  container.addEventListener('mouseover', onMouseOver)
  container.addEventListener('mouseout', onMouseOut)

  return () => {
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('touchend', onTouchEnd)
    container.removeEventListener('touchmove', onTouchMove)
    container.removeEventListener('mouseover', onMouseOver)
    container.removeEventListener('mouseout', onMouseOut)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/marks/editor.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/marks/editor.js tests/unit/marks/editor.test.js
git commit -m "feat(marks): implement mark editor modal with long-press and undo"
```

---

### Task 8: Wire marks into reader init

**Files:**
- Modify: `src/reader/index.js`

- [ ] **Step 1: Import and init indicators + long-press in reader**

In `src/reader/index.js`, add imports at the top:

```js
import { init as initIndicators } from '../marks/indicator.js'
import { setupLongPress } from '../marks/editor.js'
```

Add module-level variables after the existing ones (around line 22):

```js
let cleanupIndicatorsFn = null
let cleanupLongPressFn = null
```

In the `init()` function, after `emit(Events.READER_SURAH_LOADED, ...)` (around line 138), add:

```js
cleanupIndicatorsFn = initIndicators()
cleanupLongPressFn = setupLongPress(mainContent)
```

In `cleanup()`, add before `currentSurah = null`:

```js
if (cleanupIndicatorsFn) { cleanupIndicatorsFn(); cleanupIndicatorsFn = null }
if (cleanupLongPressFn) { cleanupLongPressFn(); cleanupLongPressFn = null }
```

- [ ] **Step 2: Run all reader tests to verify no regressions**

Run: `npx vitest run tests/unit/reader/`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/reader/index.js
git commit -m "feat(reader): wire mark indicators and long-press handler"
```

---

### Task 9: Add mark indicator CSS

**Files:**
- Modify: `src/core/theme.css`

- [ ] **Step 1: Add indicator and modal styles**

Append to `src/core/theme.css`:

```css
/* Mark indicators */
.qa-mark-dots {
  display: flex;
  gap: 2px;
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
}

.qa-mark-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  display: inline-block;
}

.qa-verse {
  position: relative;
}

/* Mark editor modal */
.qa-mark-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.qa-mark-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--qa-bg-primary);
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  padding: 1.5rem;
  z-index: 101;
  max-height: 70vh;
  overflow-y: auto;
}

.qa-mark-title {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: var(--qa-text-primary);
}

.qa-mark-tags {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.qa-mark-tag-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--qa-text-primary);
}

.qa-mark-tag-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.qa-mark-actions {
  display: flex;
  gap: 0.5rem;
}

.qa-mark-save-btn {
  background: var(--qa-accent);
  color: #fff;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
}

.qa-mark-cancel-btn {
  background: var(--qa-bg-secondary);
  color: var(--qa-text-primary);
  border: 1px solid var(--qa-border);
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
}

.qa-mark-delete-btn {
  background: var(--qa-color-error);
  color: #fff;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  margin-left: auto;
}

/* Undo toast */
.qa-undo-toast {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--qa-text-primary);
  color: var(--qa-bg-primary);
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 200;
  font-size: 0.875rem;
}

.qa-undo-toast button {
  background: none;
  border: none;
  color: var(--qa-accent);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

/* Desktop hover icon */
.qa-mark-hover-icon {
  position: absolute;
  left: -24px;
  top: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--qa-text-secondary);
  padding: 2px;
  opacity: 0.6;
}

.qa-mark-hover-icon:hover {
  opacity: 1;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/theme.css
git commit -m "style(marks): add indicator, modal, and undo toast styles"
```

---

### Task 10: Run full test suite and verify

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS, no regressions

- [ ] **Step 2: Final commit if any fixups needed**

If tests fail, fix issues and commit fixups individually.
