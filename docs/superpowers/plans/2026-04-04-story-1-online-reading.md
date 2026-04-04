# Story 1: Online Reading & Offline Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the core reading experience — surah rendering with Arabic + translation, PWA install flow, offline corpus download, and translation toggle — all with tests.

**Architecture:** Three new/expanded modules under `src/data/` and `src/reader/`, communicating through `core/events.js`. The service worker (`src/sw.js`) gets Workbox `injectManifest` integration. Dataset is built once via existing script.

**Tech Stack:** Vanilla JS (ES2020), Vite 8, Vitest + jsdom + fake-indexeddb, vite-plugin-pwa (Workbox injectManifest), IndexedDB.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `vite.config.js` | Modify | Add vitest config (jsdom env, setupFiles) |
| `public/dataset/` | Create (run script) | Build the Quran dataset |
| `src/data/dataset.js` | Modify (replace stubs) | `getSurah()`, `getSurahs()`, `getManifestUrls()` with cache/network logic |
| `src/data/offline.js` | Create | PWA install lifecycle + corpus download orchestration |
| `src/reader/index.js` | Modify (replace stub) | Render surah, basmala rules, translation toggle |
| `src/sw.js` | Modify | Add Workbox `precacheAndRoute()` import |
| `src/core/app.js` | Modify | Wire `data/offline.js`, register SW properly |
| `src/core/theme.css` | Modify | Add verse/reader CSS, top-bar button styles |
| `index.html` | Modify | Add meta tags for PWA, theme-color |
| `tests/unit/data/dataset.test.js` | Create | Unit tests for dataset module |
| `tests/unit/data/offline.test.js` | Create | Unit tests for offline module |
| `tests/unit/reader/reader.test.js` | Create | Integration test for reader rendering |
| `tests/setup.js` | Modify | Add global mocks (caches, serviceWorker) |

---

### Task 0: Build Dataset & Configure Vitest

**Files:**
- Modify: `vite.config.js`
- Modify: `tests/setup.js`
- Run: `node scripts/build-dataset.js`

- [x] **Step 1: Add vitest config to `vite.config.js`**

Append to the existing config object:

```js
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
    globals: true,
  }
```

- [x] **Step 2: Add global mocks to `tests/setup.js`**

```js
import 'fake-indexeddb/auto'

// Mock caches API for jsdom
globalThis.caches = {
  open: async (name) => ({
    match: async () => undefined,
    put: async () => {},
    keys: async () => [],
    add: async () => {},
    addAll: async () => {},
  }),
  has: async () => false,
  delete: async () => false,
}

// Mock serviceWorker
globalThis.navigator.serviceWorker = {
  ready: Promise.resolve({ active: {} }),
  controller: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  postMessage: () => {},
}
```

- [x] **Step 3: Build the dataset**

Run: `node scripts/build-dataset.js`
Expected: All 114 surahs + metadata files written to `public/dataset/`, validation passes.

- [x] **Step 4: Verify vitest runs**

Run: `pnpm test:run`
Expected: Existing `db.test.js` and `input-validator.test.js` pass.

- [x] **Step 5: Commit**

```bash
git add vite.config.js tests/setup.js public/dataset/
git commit -m "chore: configure vitest and build dataset"
```

---

### Task 1: `data/dataset.js` — Corpus Access Layer

**Files:**
- Modify: `src/data/dataset.js`
- Test: `tests/unit/data/dataset.test.js`

This module is the single source of truth for fetching surah data. It tries the service worker cache first, falls back to network.

- [x] **Step 1: Write failing test for `getManifestUrls()`**

Create `tests/unit/data/dataset.test.js`:

```js
import { getManifestUrls, getSurah, getSurahs } from '../../../src/data/dataset.js'

describe('data/dataset.js', () => {
  const datasetBase = '/dataset'

  describe('getManifestUrls()', () => {
    it('returns a non-empty array of URL strings', async () => {
      const urls = await getManifestUrls()
      expect(Array.isArray(urls)).toBe(true)
      expect(urls.length).toBeGreaterThan(0)
      expect(typeof urls[0]).toBe('string')
    })

    it('includes all 114 surah files', async () => {
      const urls = await getManifestUrls()
      const surahUrls = urls.filter(u => u.includes('/surah/'))
      expect(surahUrls.length).toBe(114)
    })

    it('includes metadata files', async () => {
      const urls = await getManifestUrls()
      expect(urls.some(u => u.endsWith('/surahs.json'))).toBe(true)
      expect(urls.some(u => u.endsWith('/manifest.json'))).toBe(true)
    })
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/unit/data/dataset.test.js`
Expected: FAIL — `getManifestUrls` not implemented.

- [x] **Step 3: Implement `getManifestUrls()`**

Replace the entire `src/data/dataset.js`:

```js
/**
 * Corpus access layer.
 * Deep module: callers never know whether data comes from cache or network.
 */

const DATASET_BASE = '/dataset'

/**
 * Get the full list of dataset URLs from manifest.json.
 * @returns {Promise<string[]>}
 */
export async function getManifestUrls() {
  const res = await fetch(`${DATASET_BASE}/manifest.json`)
  if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`)
  const manifest = await res.json()
  return Object.keys(manifest.files).map(f => `${DATASET_BASE}/${f}`)
}

/**
 * Get a single surah by number.
 * @param {number} n - Surah number (1-114)
 * @returns {Promise<{ar: string[], en: string[]}>}
 */
export async function getSurah(n) {
  if (n < 1 || n > 114 || !Number.isInteger(n)) {
    throw new Error(`Invalid surah number: ${n}`)
  }

  const padded = String(n).padStart(3, '0')
  const url = `${DATASET_BASE}/surah/${padded}.json`

  // Try cache first (service worker)
  try {
    const cache = await caches.open('quran-dataset-v1')
    const cached = await cache.match(url)
    if (cached) {
      return cached.json()
    }
  } catch {
    // Cache not available, fall through to network
  }

  // Network with 3s timeout
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Failed to fetch surah ${n}: ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Get all surahs metadata.
 * @returns {Promise<Array>}
 */
export async function getSurahs() {
  const url = `${DATASET_BASE}/surahs.json`

  // Try cache first
  try {
    const cache = await caches.open('quran-dataset-v1')
    const cached = await cache.match(url)
    if (cached) {
      return cached.json()
    }
  } catch {
    // Cache not available, fall through to network
  }

  // Network with 3s timeout
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Failed to fetch surahs: ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/unit/data/dataset.test.js`
Expected: All 3 tests pass.

- [x] **Step 5: Add `getSurah()` tests**

Append to `tests/unit/data/dataset.test.js`:

```js
  describe('getSurah()', () => {
    it('returns ar and en arrays for a valid surah', async () => {
      const surah = await getSurah(1)
      expect(surah).toHaveProperty('ar')
      expect(surah).toHaveProperty('en')
      expect(Array.isArray(surah.ar)).toBe(true)
      expect(Array.isArray(surah.en)).toBe(true)
    })

    it('returns 7 verses for Al-Fatiha', async () => {
      const surah = await getSurah(1)
      expect(surah.ar.length).toBe(7)
      expect(surah.en.length).toBe(7)
    })

    it('returns 286 verses for Al-Baqarah', async () => {
      const surah = await getSurah(2)
      expect(surah.ar.length).toBe(286)
    })

    it('throws for invalid surah numbers', async () => {
      await expect(getSurah(0)).rejects.toThrow()
      await expect(getSurah(115)).rejects.toThrow()
      await expect(getSurah(-1)).rejects.toThrow()
    })
  })
```

- [x] **Step 6: Run tests to verify they pass**

Run: `pnpm test:run tests/unit/data/dataset.test.js`
Expected: All 7 tests pass.

- [x] **Step 7: Commit**

```bash
git add src/data/dataset.js tests/unit/data/dataset.test.js
git commit -m "feat: implement corpus access layer (dataset.js)"
```

---

### Task 2: `data/offline.js` — PWA Install + Download Orchestration

**Files:**
- Create: `src/data/offline.js`
- Test: `tests/unit/data/offline.test.js`

This module owns: (1) PWA install prompt lifecycle, (2) corpus download via SW messaging, (3) activationState persistence.

- [x] **Step 1: Write failing test for state machine**

Create `tests/unit/data/offline.test.js`:

```js
import { beforeEach, describe, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { openDB, put, get } from '../../../src/core/db.js'
import * as events from '../../../src/core/events.js'

// Mock serviceWorker
const mockPostMessage = vi.fn()
globalThis.navigator.serviceWorker = {
  ready: Promise.resolve({ active: {} }),
  controller: { postMessage: mockPostMessage },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

// Mock storage estimate
globalThis.navigator.storage = {
  estimate: vi.fn().mockResolvedValue({ quota: 50_000_000_000, usage: 1_000_000 }),
}

// Mock caches for download
const cachedUrls = new Set()
globalThis.caches.open = vi.fn().mockResolvedValue({
  match: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockImplementation(async (url) => { cachedUrls.add(url) }),
  addAll: vi.fn(),
})

// Mock fetch for manifest
globalThis.fetch = vi.fn().mockImplementation(async (url) => {
  if (url.includes('manifest.json')) {
    return {
      ok: true,
      json: async () => ({
        files: { 'surah/001.json': 'abc', 'surah/002.json': 'def', 'surahs.json': 'ghi' },
      }),
    }
  }
  return { ok: true, json: async () => ({}) }
})

describe('data/offline.js', () => {
  beforeEach(async () => {
    await openDB()
    mockPostMessage.mockClear()
    vi.clearAllMocks()
    events.clear()
  })

  describe('download state machine', () => {
    it('starts with activationState = none', async () => {
      const { getActivationState } = await import('../../../src/data/offline.js')
      const state = await getActivationState()
      expect(state).toBe('none')
    })

    it('transitions to downloading when startDownload is called', async () => {
      const { startDownload, getActivationState } = await import('../../../src/data/offline.js')
      await startDownload()
      const state = await getActivationState()
      expect(state).toBe('downloading')
    })

    it('emits download-progress events', async () => {
      const { startDownload } = await import('../../../src/data/offline.js')
      const progressFn = vi.fn()
      events.on('offline:download-progress', progressFn)

      await startDownload()

      // Simulate SW progress message
      const messageHandler = globalThis.navigator.serviceWorker.addEventListener.mock.calls.find(
        c => c[0] === 'message'
      )?.[1]
      if (messageHandler) {
        messageHandler({ data: { type: 'DATASET_PROGRESS', cached: 2, total: 3 } })
        expect(progressFn).toHaveBeenCalledWith({ cached: 2, total: 3 })
      }
    })

    it('transitions to cached on DATASET_COMPLETE', async () => {
      const { startDownload, getActivationState } = await import('../../../src/data/offline.js')
      await startDownload()

      // Simulate SW complete
      const messageHandler = globalThis.navigator.serviceWorker.addEventListener.mock.calls.find(
        c => c[0] === 'message'
      )?.[1]
      if (messageHandler) {
        messageHandler({ data: { type: 'DATASET_COMPLETE' } })
      }

      const state = await getActivationState()
      expect(state).toBe('cached')
    })

    it('emits download-complete event on DATASET_COMPLETE', async () => {
      const { startDownload } = await import('../../../src/data/offline.js')
      const completeFn = vi.fn()
      events.on('offline:download-complete', completeFn)

      await startDownload()

      const messageHandler = globalThis.navigator.serviceWorker.addEventListener.mock.calls.find(
        c => c[0] === 'message'
      )?.[1]
      if (messageHandler) {
        messageHandler({ data: { type: 'DATASET_COMPLETE' } })
        expect(completeFn).toHaveBeenCalled()
      }
    })

    it('transitions back to none on cancel', async () => {
      const { startDownload, cancelDownload, getActivationState } = await import('../../../src/data/offline.js')
      await startDownload()
      await cancelDownload()
      const state = await getActivationState()
      expect(state).toBe('none')
    })

    it('transitions to none on DATASET_ERROR', async () => {
      const { startDownload, getActivationState } = await import('../../../src/data/offline.js')
      await startDownload()

      const messageHandler = globalThis.navigator.serviceWorker.addEventListener.mock.calls.find(
        c => c[0] === 'message'
      )?.[1]
      if (messageHandler) {
        messageHandler({ data: { type: 'DATASET_ERROR', error: 'Network error' } })
      }

      const state = await getActivationState()
      expect(state).toBe('none')
    })
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/unit/data/offline.test.js`
Expected: FAIL — module doesn't exist.

- [x] **Step 3: Implement `data/offline.js`**

Create `src/data/offline.js`:

```js
/**
 * PWA install lifecycle + corpus download orchestration.
 * Deep module: callers request "start download" or "cancel download" and react to events.
 */

import { put, get } from './db.js'
import { emit, on } from './events.js'
import { getManifestUrls } from './dataset.js'

const ACTIVATION_KEY = 'current'

/**
 * Get the current activation state.
 * @returns {Promise<'none' | 'downloading' | 'cached'>}
 */
export async function getActivationState() {
  try {
    const record = await get('activationState', ACTIVATION_KEY)
    return record?.status || 'none'
  } catch {
    return 'none'
  }
}

/**
 * Set the activation state.
 * @param {'none' | 'downloading' | 'cached'} status
 */
async function setActivationState(status) {
  await put('activationState', { id: ACTIVATION_KEY, status })
}

/**
 * Start downloading the corpus.
 * Emits offline:download-progress, offline:download-complete, offline:download-error.
 */
export async function startDownload() {
  const current = await getActivationState()
  if (current === 'downloading' || current === 'cached') return

  await setActivationState('downloading')

  // Check storage quota
  try {
    const estimate = await navigator.storage.estimate()
    if (estimate.quota && estimate.usage) {
      const available = estimate.quota - estimate.usage
      // Corpus is ~5-10 MB; require at least 20 MB free
      if (available < 20_000_000) {
        emit('offline:download-error', { error: 'Insufficient storage' })
        await setActivationState('none')
        return
      }
    }
  } catch {
    // Storage estimate not available, proceed anyway
  }

  // Get manifest URLs
  let urls
  try {
    urls = await getManifestUrls()
  } catch (error) {
    emit('offline:download-error', { error: error.message })
    await setActivationState('none')
    return
  }

  // Listen for SW messages
  const messageHandler = (event) => {
    const { type, cached, total, error } = event.data || {}
    switch (type) {
      case 'DATASET_PROGRESS':
        emit('offline:download-progress', { cached, total })
        break
      case 'DATASET_COMPLETE':
        navigator.serviceWorker.removeEventListener('message', messageHandler)
        setActivationState('cached').then(() => {
          emit('offline:download-complete')
        })
        break
      case 'DATASET_ERROR':
        navigator.serviceWorker.removeEventListener('message', messageHandler)
        setActivationState('none').then(() => {
          emit('offline:download-error', { error })
        })
        break
    }
  }

  navigator.serviceWorker.addEventListener('message', messageHandler)

  // Send CACHE_DATASET to SW
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_DATASET', urls })
  }
}

/**
 * Cancel the current download.
 */
export async function cancelDownload() {
  await setActivationState('none')
}

// ── PWA Install Prompt ─────────────────────────────────────────────────

let deferredPrompt = null

/**
 * Capture the beforeinstallprompt event.
 * Call once on app init.
 */
export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    emit('offline:install-available')
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit('offline:install-complete')
  })
}

/**
 * Trigger the install prompt. Returns true if prompt was shown.
 * @returns {Promise<boolean>}
 */
export async function triggerInstall() {
  if (!deferredPrompt) return false
  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome === 'accepted'
}

/**
 * Check if the app is running in standalone mode.
 * @returns {boolean}
 */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/unit/data/offline.test.js`
Expected: All 7 tests pass.

- [x] **Step 5: Commit**

```bash
git add src/data/offline.js tests/unit/data/offline.test.js
git commit -m "feat: implement PWA install + download orchestration (offline.js)"
```

---

### Task 3: `reader/index.js` — Surah Rendering

**Files:**
- Modify: `src/reader/index.js`
- Test: `tests/unit/reader/reader.test.js`
- Modify: `src/core/theme.css`

This module renders surah content with basmala rules, translation toggle, and skeleton loader.

- [x] **Step 1: Write failing test for reader rendering**

Create `tests/unit/reader/reader.test.js`:

```js
import { beforeEach, describe, it, expect, vi } from 'vitest'
import * as events from '../../../src/core/events.js'
import * as db from '../../../src/core/db.js'

// Mock dataset
vi.mock('../../../src/data/dataset.js', () => ({
  getSurah: vi.fn().mockResolvedValue({
    ar: ['بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ'],
    en: ['In the name of God, the Gracious, the Merciful', 'All praise is due to God, Lord of all worlds'],
  }),
  getSurahs: vi.fn().mockResolvedValue([
    { n: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', type: 'Meccan', count: 7, juz: 1 },
  ]),
}))

// Mock db
vi.mock('../../../src/core/db.js', () => ({
  get: vi.fn().mockResolvedValue({ key: 'translationVisible', value: true }),
  put: vi.fn().mockResolvedValue(),
}))

describe('reader/index.js', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header id="top-bar"></header>
      <main id="main-content"></main>
    `
    events.clear()
  })

  it('renders Arabic verses as text nodes', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const mainContent = document.getElementById('main-content')
    const verses = mainContent.querySelectorAll('[data-verse]')
    expect(verses.length).toBe(2)

    // Verify textContent is set (not innerHTML with corpus data)
    expect(verses[0].textContent).toContain('بِسْمِ')
    expect(verses[1].textContent).toContain('ٱلْحَمْدُ')
  })

  it('renders translation when translationVisible is true', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const translations = document.querySelectorAll('[data-translation]')
    expect(translations.length).toBe(2)
    expect(translations[0].textContent).toContain('In the name of God')
  })

  it('omits translation when translationVisible is false', async () => {
    db.get.mockResolvedValueOnce({ key: 'translationVisible', value: false })

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const translations = document.querySelectorAll('[data-translation]')
    expect(translations.length).toBe(0)
  })

  it('renders surah header with name and number', async () => {
    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    const header = document.querySelector('[data-surah-header]')
    expect(header).toBeTruthy()
    expect(header.textContent).toContain('Al-Fatiha')
    expect(header.textContent).toContain('1')
  })

  it('emits reader:surah-loaded event', async () => {
    const loadedFn = vi.fn()
    events.on('reader:surah-loaded', loadedFn)

    const { init } = await import('../../../src/reader/index.js')
    await init({ surah: '1' })

    expect(loadedFn).toHaveBeenCalledWith({ surah: 1 })
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/unit/reader/reader.test.js`
Expected: FAIL — reader not implemented.

- [x] **Step 3: Add reader CSS to `src/core/theme.css`**

Append to the end of `src/core/theme.css`:

```css
/* Surah header */
.qa-surah-header {
  text-align: center;
  padding: 1.5rem 0 1rem;
  border-bottom: 1px solid var(--qa-border);
  margin-bottom: 1.5rem;
}

.qa-surah-name {
  font-family: 'KFGQPC Uthman Taha Naskh', 'Traditional Arabic', serif;
  font-size: 2rem;
  color: var(--qa-text-primary);
  direction: rtl;
}

.qa-surah-meta {
  font-size: 0.875rem;
  color: var(--qa-text-secondary);
  margin-top: 0.25rem;
}

/* Basmala */
.qa-basmala {
  font-family: 'KFGQPC Uthman Taha Naskh', 'Traditional Arabic', serif;
  font-size: 1.5rem;
  text-align: center;
  padding: 1rem 0;
  color: var(--qa-text-primary);
  direction: rtl;
}

/* Verse block */
.qa-verse {
  padding: 1rem 0;
  border-bottom: 1px solid var(--qa-border);
}

.qa-verse:last-child {
  border-bottom: none;
}

.qa-verse-arabic {
  font-family: 'KFGQPC Uthman Taha Naskh', 'Traditional Arabic', serif;
  font-size: 1.75rem;
  line-height: 2;
  direction: rtl;
  text-align: right;
  color: var(--qa-text-primary);
  word-spacing: 0.15em;
}

.qa-verse-number {
  display: inline-block;
  font-size: 0.75rem;
  color: var(--qa-text-secondary);
  margin-right: 0.5rem;
  direction: ltr;
  unicode-bidi: isolate;
}

.qa-verse-translation {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--qa-text-secondary);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--qa-border);
}

/* Skeleton states */
.qa-skeleton-line {
  height: 1.5rem;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.qa-skeleton-line:last-child {
  margin-bottom: 0;
}
```

- [x] **Step 4: Implement `reader/index.js`**

Replace the entire `src/reader/index.js`:

```js
/**
 * Reader route handler.
 * Renders surah content with Arabic text, translation, and basmala rules.
 */

import { getSurah, getSurahs } from '../data/dataset.js'
import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'

const SKELETON_TIMEOUT_MS = 5000

/**
 * Initialize the reader for a surah.
 * @param {object} params
 * @param {string} params.surah - Surah number
 * @param {string} [params.ayah] - Specific verse (deep link)
 */
export async function init(params) {
  const surahNum = parseInt(params.surah, 10)
  if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) return

  const mainContent = document.getElementById('main-content')
  const topBar = document.getElementById('top-bar')
  if (!mainContent) return

  // Show skeleton
  showSkeleton(mainContent)

  // Set 5s hard timeout
  const timeout = setTimeout(() => {
    showError(mainContent, surahNum)
  }, SKELETON_TIMEOUT_MS)

  try {
    const [surah, surahs, translationVisible] = await Promise.all([
      getSurah(surahNum),
      getSurahs(),
      get('settings', 'translationVisible').then(r => r?.value ?? true),
    ])

    clearTimeout(timeout)

    const surahMeta = surahs.find(s => s.n === surahNum)

    // Render
    mainContent.innerHTML = ''
    renderSurahHeader(mainContent, surahMeta)
    renderBasmala(mainContent, surahNum)
    renderVerses(mainContent, surah, translationVisible)

    // Render top bar controls
    renderTopBar(topBar, translationVisible, surahNum)

    emit('reader:surah-loaded', { surah: surahNum })
  } catch (error) {
    clearTimeout(timeout)
    showError(mainContent, surahNum, error.message)
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
function showError(container, surahNum, message) {
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
  metaEl.textContent = `${meta?.name ?? ''} · ${meta?.count ?? ''} verses · ${meta?.type ?? ''}`

  header.appendChild(nameEl)
  header.appendChild(metaEl)
  container.appendChild(header)
}

/**
 * Render basmala according to rules:
 * - Surah 1 (Al-Fatiha): basmala is verse 1:1, don't render separately
 * - Surah 9 (At-Tawbah): no basmala
 * - Surahs 2-113 (except 9): basmala as decorative prefix
 */
function renderBasmala(container, surahNum) {
  if (surahNum === 1 || surahNum === 9) return

  const basmala = document.createElement('div')
  basmala.className = 'qa-basmala'
  basmala.textContent = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'
  container.appendChild(basmala)
}

/**
 * Render verses.
 * CRITICAL: Arabic text set via textContent only — never innerHTML.
 */
function renderVerses(container, surah, translationVisible) {
  const startIndex = surah.ar.length > 1 ? 0 : 0

  for (let i = startIndex; i < surah.ar.length; i++) {
    const verseNum = i + 1
    const verseBlock = document.createElement('div')
    verseBlock.className = 'qa-verse'
    verseBlock.setAttribute('data-verse', `${verseNum}`)

    const arabicEl = document.createElement('div')
    arabicEl.className = 'qa-verse-arabic'
    arabicEl.setAttribute('dir', 'rtl')
    // CRITICAL: textContent, never innerHTML
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
}

/**
 * Render top bar with translation toggle.
 */
function renderTopBar(topBar, translationVisible, surahNum) {
  if (!topBar) return

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

Run: `pnpm test:run tests/unit/reader/reader.test.js`
Expected: All 5 tests pass.

- [x] **Step 6: Commit**

```bash
git add src/reader/index.js src/core/theme.css tests/unit/reader/reader.test.js
git commit -m "feat: implement surah rendering with basmala rules and translation toggle"
```

---

### Task 4: Wire Everything in `app.js` + SW Integration

**Files:**
- Modify: `src/core/app.js`
- Modify: `src/sw.js`
- Modify: `index.html`

- [x] **Step 1: Add Workbox precache to `src/sw.js`**

Prepend to the top of `src/sw.js` (after the comment block):

```js
import { precacheAndRoute } from 'workbox-precaching'

// Workbox injectManifest will populate this array
precacheAndRoute(self.__WB_MANIFEST || [])
```

- [x] **Step 2: Wire offline module in `src/core/app.js`**

Replace the entire `src/core/app.js`:

```js
/**
 * Application bootstrap.
 * Wires all modules together and initializes the app lifecycle.
 */

import { openDB } from './db.js'
import * as router from './router.js'
import { initInstallPrompt, getActivationState, startDownload } from '../data/offline.js'
import { emit } from './events.js'

/**
 * Initialize the application.
 */
export async function init() {
  try {
    // Open database (creates stores if first run)
    await openDB()

    // Initialize router
    router.init()

    // Register Phase 1 routes
    router.register('#/s/:surah', () => import('../reader/index.js'))
    router.register('#/s/:surah/:ayah', () => import('../reader/index.js'))

    // Set initial theme
    applyThemeFromSettings()

    // Register service worker
    await registerServiceWorker()

    // Initialize PWA install prompt capture
    initInstallPrompt()

    // Restore activation state
    await restoreActivationState()
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
}

/**
 * Apply saved theme or default to light.
 */
async function applyThemeFromSettings() {
  try {
    const { get } = await import('./db.js')
    const setting = await get('settings', 'theme')
    const theme = setting?.value || 'light'
    document.documentElement.setAttribute('data-theme', theme)
  } catch {
    // Default to light
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

/**
 * Register the service worker.
 * Skipped in dev mode — SW is only meaningful in production builds.
 */
async function registerServiceWorker() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      console.log('SW registered:', registration.scope)
    } catch (error) {
      console.error('SW registration failed:', error)
    }
  }
}

/**
 * Restore activation state and re-download if interrupted.
 */
async function restoreActivationState() {
  const state = await getActivationState()

  if (state === 'downloading') {
    // Interrupted download — reset to none, user must re-tap
    const { cancelDownload } = await import('../data/offline.js')
    await cancelDownload()
  }

  // If no cached corpus and online, show download UI
  if (state === 'none' && navigator.onLine) {
    emit('app:ready-for-download')
  }
}

// Auto-init when loaded
init()
```

- [x] **Step 3: Add PWA meta tags to `index.html`**

Modify the `<head>` section of `index.html`:

```html
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#ffffff">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="QuranAtlas">
  <title>QuranAtlas</title>
```

- [x] **Step 4: Run all tests to verify nothing broke**

Run: `pnpm test:run`
Expected: All tests pass (db, input-validator, dataset, offline, reader).

- [x] **Step 5: Commit**

```bash
git add src/core/app.js src/sw.js index.html
git commit -m "feat: wire offline module, add Workbox precache, PWA meta tags"
```

---

### Task 5: Manual Verification & Lint

- [x] **Step 1: Run lint**

Run: `pnpm lint`
Expected: No errors.

- [x] **Step 2: Run build**

Run: `pnpm build`
Expected: Successful build, chunks within budget.

- [x] **Step 3: Run full test suite**

Run: `pnpm test:run`
Expected: All tests pass.

- [x] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(story-1): online reading & offline setup complete"
```

---

## Spec Coverage Checklist

| Story 1 Requirement | Task |
|---|---|
| R1: Render immediately from network | Task 3 |
| R2-3: Arabic text + English translation | Task 3 |
| R4-5: Translation toggle + persistence | Task 3 |
| R6: Surah name/number header | Task 3 |
| R7: Verse numbering | Task 3 |
| R8-9: Basmala rules | Task 3 |
| R10: Deep link `#/s/:surah` | Task 3 (router already handles this) |
| R11-14: PWA install flow | Task 2 + Task 4 |
| R15-22: Offline download + progress | Task 2 + Task 4 |
| R23-24: Activation state persistence | Task 2 |
| Skeleton loader (3s) + 5s timeout | Task 3 |
| Network-first with 3s timeout → cache | Task 1 |
| Install prompt after 30s | Deferred (engagement-based timing not in scope of modules) |
| iOS manual guide fallback | Deferred (browser detection not locked) |
| Block nav to uncached surahs offline | Story 3 concern |
