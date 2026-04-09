# Product Health Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 7 P2 and 3 P3 findings from the 2026-04-09 product health report, raising the weighted score from 7.6 toward 8.5+.

**Architecture:** Fix architecture boundary violations by centralizing marks wiring in `core/app.js` via dependency injection. Align the dataset update pipeline to a single `status` FSM field and bridge SW messages to the client event bus. Harden release guardrails with coverage enforcement, SW handler tests, performance budget assertions, and console-noise capture.

**Tech Stack:** Vanilla JS, Vitest (unit), Playwright (E2E), fake-indexeddb, pnpm, GitHub Actions CI

---

## File Structure

### Files to Create

| File | Purpose |
|------|---------|
| `src/sw-handlers.js` | Extracted SW handler logic with injectable deps for testability |
| `tests/unit/sw-handlers.test.js` | Unit tests for SW handlers |
| `tests/unit/perf/idb-budgets.test.js` | IDB operation timing assertions |
| `tests/e2e/performance-budgets.spec.js` | Render/UX timing assertions (Playwright) |
| `tests/e2e/sw-integration.spec.js` | E2E tests for SW message handlers |

### Files to Modify

| File | Key Changes |
|------|-------------|
| `src/core/app.js` | Import marks modules, pass hooks via `router.register()` |
| `src/core/router.js` | Accept `hooks` in `register()`, forward to `module.init(params, hooks)` |
| `src/reader/index.js` | Accept `{ initIndicators, setupLongPress }` from hooks, remove `../marks/` imports, clear undo toast in `cleanup()` |
| `src/review/hub.js` | Accept `{ openEditor }` from hooks, store unsub handles with idempotency guard, call them in `cleanup()` |
| `src/marks/editor.js` | Remove redundant `NAVIGATION_NAVIGATE` undo-clear listener |
| `src/offline/dataset-updater.js` | Single `status` FSM field replaces dual `status`/`state` |
| `src/data/offline.js` | Bridge Story 8 SW message types to event bus |
| `src/core/db.js` | No schema change needed (already `['id', 'status']`) |
| `src/offline/manifest-fetcher.js` | Add 10s `AbortController` timeout |
| `src/settings/theme.js` | Emit `{ from, to }` instead of `{ theme }` |
| `src/sw.js` | Thin shell delegating to `sw-handlers.js` |
| `.github/workflows/ci.yml` | `test:run` → `test:coverage` |
| `playwright.config.js` | Add 768px tablet project with `grep: /@tablet/` |
| `tests/setup.js` | Console-noise capture + logger silencing |
| `docs/specs/story-8-dataset-updates.md` | Align spec to implementation |
| `docs/tech-stack.md` | Update module communication rules |
| `src/core/router.js` | Migrate `console.*` → `logger.*` |
| `src/safety/sync.js` | Migrate `console.*` → `logger.*` |
| `src/marks/store.js` | Migrate `console.*` → `logger.*` |
| `src/data/offline.js` | Migrate `console.*` → `logger.*` |
| `src/review/hub.js` | Migrate `console.*` → `logger.*` |
| `src/core/app.js` | Migrate `console.*` → `logger.*` |
| `src/settings/theme.js` | Migrate `console.*` → `logger.*` |
| `src/core/db.js` | Migrate `console.*` → `logger.*` |

---

## Decisions Reference

| # | Question | Decision |
|---|----------|----------|
| Q1 | Story 8 spec vs code | Update spec to match implementation |
| Q2 | `activationState` shape | Single `status` FSM field (not dual `status`/`state`) |
| Q3 | SW→client event bridge | Extend `data/offline.js` |
| Q4 | `reader/`→`marks/` boundary | Centralize wiring in `core/app.js` via DI |
| Q5 | `review/hub.js` listener leak | Unsubscribe handles + idempotency guard |
| Q6 | Undo toast clearing | Clear in `reader/cleanup()`, remove redundant listener |
| Q7 | Manifest fetch timeout | 10s AbortController, no retry |
| Q8 | Theme event payload | Emit `{ from, to }` per Story 9 spec |
| Q9 | SW handler tests | Extract handlers + unit tests + E2E integration |
| Q10 | CI coverage | Replace `test:run` with `test:coverage` |
| Q11 | Performance budgets | Playwright for render, Vitest for IDB |
| Q12 | Tablet E2E | Tagged subset at 768px |
| Q13 | Console noise | Fail on unexpected `console.error`/`console.warn` |
| Q14 | Logger expansion | Expand `logger` to all client-side modules (SW keeps `console.*`) |
| Q15 | Marks DI pattern | Pass hooks as `init()` second argument |

---

## Phase 1: Architecture Contract (P2 #1, #2)

### Task 1: Centralize marks wiring in app.js — remove boundary violations

**Findings addressed:** P2 #1 (cross-feature imports bypass module communication rules)

**Files:**
- Modify: `src/core/router.js:21-22,108-125,183-192`
- Modify: `src/core/app.js:1-16,42-57`
- Modify: `src/reader/index.js:1-15,37-38,167-170`
- Modify: `src/review/hub.js:1-15,29-30`
- Modify: `tests/unit/reader/reader.test.js`
- Modify: `tests/unit/review/hub.test.js`
- Modify: `tests/unit/core/app.test.js`

- [ ] **Step 1: Update router.register() to accept hooks**

In `src/core/router.js`, change the `routes` Map to store `{ loader, hooks }` objects and update `register()`, `matchRoute()`, and `handleRoute()`:

```javascript
// register() — line 21
export function register(pattern, loader, hooks = {}) {
  routes.set(pattern, { loader, hooks })
}
```

```javascript
// matchRoute() — line 183
function matchRoute(hash) {
  for (const [pattern, { loader, hooks }] of routes) {
    const params = extractParams(pattern, hash)
    if (params) {
      return { loader, params, hooks }
    }
  }
  return null
}
```

```javascript
// handleRoute() — line 108, destructure hooks and pass to init
const match = matchRoute(hash)
if (match) {
  const { loader, params, hooks } = match

  if (currentModule && currentModule.cleanup) {
    currentModule.cleanup()
    currentModule = null
  }

  const module = await loader()
  currentModule = module

  if (module.init) {
    try {
      const sanitizedParams = sanitizeParams(params)
      if (sanitizedParams === null) {
        console.error(`Route ${hash} rejected: invalid parameters`)
        emit(Events.ROUTER_ROUTE_ERROR, { route: hash, error: new Error('Invalid parameters') })
        showNotFound()
        return
      }
      await module.init(sanitizedParams, hooks)
      await put('settings', { key: 'lastSurface', value: hash })
    } catch (error) {
      console.error(`Route ${hash} failed:`, error)
      emit(Events.ROUTER_ROUTE_ERROR, { route: hash, error })
    }
  }
}
```

- [ ] **Step 2: Wire marks hooks into app.js route registration**

In `src/core/app.js`, add marks imports and pass hooks:

```javascript
// Add after existing imports (after line 16)
import { init as initIndicators } from '../marks/indicator.js'
import { setupLongPress, openEditor } from '../marks/editor.js'
```

Update route registrations (replace lines 42-57):

```javascript
// Reader routes — inject marks hooks
router.register('#/s/:surah', () => import('../reader/index.js'), {
  initIndicators,
  setupLongPress,
})
router.register('#/s/:surah/:ayah', () => import('../reader/index.js'), {
  initIndicators,
  setupLongPress,
})

// Review routes — inject editor hook
router.register('#/review', () => import('../review/hub.js'), {
  openEditor,
})

// Settings + About — no hooks needed
router.register('#/settings', () => import('../settings/index.js'))
router.register('#/about', () => import('../about/index.js'))

// Tag deep link route — inject editor hook
router.register('#/t/:tag', () => import('../review/hub.js'), {
  openEditor,
})
```

- [ ] **Step 3: Update reader/index.js to receive hooks instead of importing marks**

Remove direct marks imports (lines 13-14):

```javascript
// DELETE these lines:
// import { init as initIndicators } from '../marks/indicator.js'
// import { setupLongPress } from '../marks/editor.js'
```

Update `init()` signature (line 37) to destructure hooks from second arg:

```javascript
export async function init(params, { initIndicators, setupLongPress, savePosition: shouldSavePosition = true } = {}) {
```

The body of `init()` already calls `initIndicators()` and `setupLongPress(mainContent)` — those references now resolve to the injected functions instead of imported ones. No other changes needed inside the function body.

- [ ] **Step 4: Update review/hub.js to receive editor hook instead of importing marks/editor**

Remove the `openEditor` import (line 12):

```javascript
// DELETE this line:
// import { openEditor } from '../marks/editor.js'
```

Add module-scoped variable and update `init()` signature:

```javascript
let _openEditor = null

export async function init(params = {}, { openEditor } = {}) {
  _openEditor = openEditor || null
  // ... rest of init unchanged
```

Update the card click handler inside `renderMarkCard()` to use `_openEditor`:

```javascript
card.addEventListener('click', (e) => {
  if (e.target.closest('button')) return
  if (_openEditor) _openEditor(mark.verseKey)
})
```

Add `_openEditor = null` to `cleanup()`.

- [ ] **Step 5: Update tests for new init signatures**

In `tests/unit/reader/reader.test.js`, wherever `reader.init()` is called, pass mock hooks:

```javascript
const mockHooks = {
  initIndicators: vi.fn().mockReturnValue(() => {}),
  setupLongPress: vi.fn().mockReturnValue(() => {}),
}
// Change all: await reader.init({ surah: '1' })
// To:         await reader.init({ surah: '1' }, mockHooks)
```

In `tests/unit/review/hub.test.js`, pass mock hook:

```javascript
// Change all: await hub.init()
// To:         await hub.init({}, { openEditor: vi.fn() })
```

In `tests/unit/core/app.test.js`, update any mocks that assert `router.register()` calls to expect 3 arguments.

- [ ] **Step 6: Run tests**

```bash
pnpm run test:run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/core/app.js src/core/router.js src/reader/index.js src/review/hub.js tests/unit/reader/ tests/unit/review/ tests/unit/core/
git commit -m "refactor: centralize marks wiring in app.js bootstrap via DI (P2 #1)"
```

**Verification checklist:**
- [ ] `grep -rn "from '../marks/" src/reader/index.js` returns **zero** results
- [ ] `grep -rn "from '../marks/editor" src/review/hub.js` returns **zero** results
- [ ] `grep -rn "from '../marks/store" src/review/hub.js` still returns the **permitted** store import (data access exception)
- [ ] `pnpm run test:run` — all tests pass, zero failures
- [ ] `pnpm run lint` — no new lint errors
- [ ] Manual: open app → navigate to `#/s/2` → long-press a verse → editor modal opens
- [ ] Manual: navigate to `#/review` → click a mark card → editor modal opens

---

### Task 2: Fix review/hub.js event listener leak

**Findings addressed:** P2 #2 (review hub registers listeners that cleanup never unsubscribes)

**Files:**
- Modify: `src/review/hub.js:27-28,55-71,153-168`
- Modify: `tests/unit/review/hub.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/unit/review/hub.test.js`, add:

```javascript
it('cleanup() unsubscribes event listeners so they do not fire after teardown', async () => {
  const { emit } = await import('../../../src/core/events.js')
  await hub.init({}, { openEditor: vi.fn() })
  hub.cleanup()

  // After cleanup, emitting SYNC_UPDATE_RECEIVED should NOT trigger hub re-render
  const mainContent = document.getElementById('main-content')
  mainContent.textContent = 'sentinel'
  emit('sync:update-received', { verseKeys: [] })

  // Wait a tick for any async handlers
  await new Promise(r => setTimeout(r, 50))
  expect(mainContent.textContent).toBe('sentinel')
})

it('double init() does not register duplicate listeners', async () => {
  const { emit } = await import('../../../src/core/events.js')
  const renderSpy = vi.fn()

  // Init twice (simulates rapid navigation)
  await hub.init({}, { openEditor: vi.fn() })
  await hub.init({}, { openEditor: vi.fn() })
  hub.cleanup()

  const mainContent = document.getElementById('main-content')
  mainContent.textContent = 'sentinel'
  emit('sync:update-received', { verseKeys: [] })

  await new Promise(r => setTimeout(r, 50))
  // Should NOT re-render — all listeners cleaned up
  expect(mainContent.textContent).toBe('sentinel')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/review/hub.test.js
```

Expected: FAIL — handler fires after cleanup because unsubscribe is never called.

- [ ] **Step 3: Implement the fix**

In `src/review/hub.js`, add module-scoped variables:

```javascript
let unsubSyncUpdate = null
let unsubVisibilityVisible = null
```

At the beginning of the listener registration section inside `init()` (before the `on(Events.SYNC_UPDATE_RECEIVED, ...)` call), add idempotency guards:

```javascript
  // Idempotency guard — unsubscribe any prior listeners before re-registering
  if (unsubSyncUpdate) { unsubSyncUpdate(); unsubSyncUpdate = null }
  if (unsubVisibilityVisible) { unsubVisibilityVisible(); unsubVisibilityVisible = null }

  unsubSyncUpdate = on(Events.SYNC_UPDATE_RECEIVED, async () => {
    await reloadMarks()
    const mc = document.getElementById('main-content')
    if (mc) { render(mc) }
  })

  unsubVisibilityVisible = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    await reloadMarks()
    const mc = document.getElementById('main-content')
    if (mc) { render(mc) }
  })
```

Update `cleanup()` to unsubscribe:

```javascript
export function cleanup() {
  if (unsubSyncUpdate) { unsubSyncUpdate(); unsubSyncUpdate = null }
  if (unsubVisibilityVisible) { unsubVisibilityVisible(); unsubVisibilityVisible = null }
  _openEditor = null
  clearUndoToast()
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer)
    filterDebounceTimer = null
  }
  const mainContent = document.getElementById('main-content')
  if (mainContent) { mainContent.textContent = '' }
  currentState = null
  allMarks = []
  sortedMarks = []
  filteredMarks = []
  displayedCount = 0
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run tests/unit/review/hub.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/review/hub.js tests/unit/review/hub.test.js
git commit -m "fix: unsubscribe event listeners in review/hub cleanup (P2 #2)"
```

**Verification checklist:**
- [ ] `pnpm vitest run tests/unit/review/hub.test.js` — all pass including new listener cleanup tests
- [ ] `pnpm run test:run` — full suite green
- [ ] Grep `src/review/hub.js` for bare `on(Events.` calls that don't store return value → none
- [ ] Grep `src/review/hub.js cleanup()` for `unsubSyncUpdate()` and `unsubVisibilityVisible()` → both present
- [ ] Manual: open `#/review` → navigate to `#/s/1` → navigate back to `#/review` → repeat 5x → no "Maximum call stack" or duplicated DOM in console

---

## Phase 2: Dataset Update Pipeline (P2 #3)

### Task 3: Unify activationState to single `status` field

**Findings addressed:** P2 #3 (dataset update state and lifecycle contract drift)

**Files:**
- Modify: `src/offline/dataset-updater.js:76-80,113-168,197-202`
- Modify: `tests/unit/offline/dataset-updater.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/unit/offline/dataset-updater.test.js`, add:

```javascript
it('writes activationState with status as canonical FSM field, no separate state field', async () => {
  await put('datasetMeta', { id: 'current', version: '1.0.0' })
  await put('activationState', { id: 'current', status: 'idle' })

  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      packageVersion: '1.0.1',
      files: {},
    }),
    clone: function() { return this },
    arrayBuffer: async () => new ArrayBuffer(0),
  })

  await updater.checkForUpdate()

  const record = await get('activationState', 'current')
  // Must NOT have a separate 'state' field
  expect(record).not.toHaveProperty('state')
  // 'status' must be the real FSM value, not hardcoded 'cached'
  expect(record.status).not.toBe('cached')
  expect(['idle', 'downloading', 'verifying', 'pending-confirmation', 'applying', 'failed'])
    .toContain(record.status)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/offline/dataset-updater.test.js
```

Expected: FAIL — `record.state` exists and `record.status === 'cached'`

- [ ] **Step 3: Rewrite setState() to use single status field**

In `src/offline/dataset-updater.js`, replace `setState()`:

```javascript
async function setState(stateObj) {
  const record = { id: 'current', status: stateObj.status }
  if (stateObj.version !== undefined) record.version = stateObj.version
  if (stateObj.progress !== undefined) record.progress = stateObj.progress
  if (stateObj.error !== undefined) record.error = stateObj.error
  if (stateObj.stagedAt !== undefined) record.stagedAt = stateObj.stagedAt
  await idbPut('activationState', record)
  await postToClients(`DATASET_${stateObj.status.toUpperCase().replace(/-/g, '_')}`, stateObj)
}
```

Update all `setState()` call sites in `checkForUpdate()` — replace `state:` key with `status:`:

- Line ~113: `await setState({ status: 'downloading', version: targetVersion, progress: 0 })`
- Line ~131: `await setState({ status: 'downloading', version: targetVersion, progress: ... })`
- Line ~148: `await setState({ status: 'failed', version: targetVersion, error: error.message })`
- Line ~156: `await setState({ status: 'failed', version: targetVersion, error: ... })`
- Line ~165: `await setState({ status: 'verifying', version: targetVersion })`
- Line ~168: `await setState({ status: 'pending-confirmation', version: targetVersion, stagedAt: Date.now() })`

Update `applyUpdate()`:

- Line ~197: `await setState({ status: 'applying', version })`
- Line ~202: `await setState({ status: 'idle', version })`

- [ ] **Step 4: Update existing tests that assert `state:` to use `status:`**

In all existing dataset-updater tests, find assertions like `expect(record.state).toBe('idle')` and change to `expect(record.status).toBe('idle')`.

- [ ] **Step 5: Run all tests**

```bash
pnpm run test:run
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/offline/dataset-updater.js tests/unit/offline/dataset-updater.test.js
git commit -m "refactor: unify activationState to single status FSM field (P2 #3a)"
```

**Verification checklist:**
- [ ] `pnpm vitest run tests/unit/offline/dataset-updater.test.js` — all pass
- [ ] `grep -n "state:" src/offline/dataset-updater.js` inside `setState()` calls → **zero** results (only `status:` used)
- [ ] `grep -n "status: 'cached'" src/offline/dataset-updater.js` → **zero** results (no more hardcoded 'cached')
- [ ] `pnpm run test:run` — full suite green
- [ ] Read `src/core/db.js` validateWrite schema for `activationState` — confirms `['id', 'status']` still valid
- [ ] Read `src/data/offline.js getActivationState()` — confirms it reads `record?.status` which now returns real FSM values

---

### Task 4: Bridge Story 8 SW messages to client event bus

**Findings addressed:** P2 #3 (no client-side bridge for Story 8 SW messages)

**Files:**
- Modify: `src/data/offline.js:149-180` (currentMessageHandler switch)
- Modify: `tests/unit/data/offline.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/unit/data/offline.test.js`, add a new describe block:

```javascript
describe('Story 8 SW message bridge', () => {
  it('bridges DATASET_PENDING_CONFIRMATION to event bus', async () => {
    const offline = await import('../../../src/data/offline.js')
    const received = []
    const unsub = events.on('dataset:pending-confirmation', (payload) => received.push(payload))

    await offline.startDownload()

    // Find the message handler that was registered with addEventListener
    const addEventListenerCalls = globalThis.navigator.serviceWorker.addEventListener.mock.calls
    const messageHandler = addEventListenerCalls.find(c => c[0] === 'message')?.[1]
    expect(messageHandler).toBeDefined()

    // Simulate SW sending DATASET_PENDING_CONFIRMATION
    messageHandler({ data: { type: 'DATASET_PENDING_CONFIRMATION', from: '1.0.0', to: '2.0.0' } })

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ from: '1.0.0', to: '2.0.0' })
    unsub()
  })

  it('bridges DATASET_APPLIED to event bus', async () => {
    const offline = await import('../../../src/data/offline.js')
    const received = []
    const unsub = events.on('dataset:applied', (payload) => received.push(payload))

    await offline.startDownload()

    const addEventListenerCalls = globalThis.navigator.serviceWorker.addEventListener.mock.calls
    const messageHandler = addEventListenerCalls.find(c => c[0] === 'message')?.[1]

    messageHandler({ data: { type: 'DATASET_APPLIED', version: '2.0.0' } })

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ version: '2.0.0' })
    unsub()
  })

  it('bridges DATASET_UPDATE_FAILED to event bus', async () => {
    const offline = await import('../../../src/data/offline.js')
    const received = []
    const unsub = events.on('dataset:update-failed', (payload) => received.push(payload))

    await offline.startDownload()

    const addEventListenerCalls = globalThis.navigator.serviceWorker.addEventListener.mock.calls
    const messageHandler = addEventListenerCalls.find(c => c[0] === 'message')?.[1]

    messageHandler({ data: { type: 'DATASET_UPDATE_FAILED', error: 'network timeout' } })

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({ error: 'network timeout' })
    unsub()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/data/offline.test.js
```

Expected: FAIL — no handler for Story 8 message types.

- [ ] **Step 3: Add Story 8 cases to the SW message handler**

In `src/data/offline.js`, inside the `currentMessageHandler` function's switch statement (after the `case 'DATASET_ERROR':` block), add:

```javascript
      case 'DATASET_PENDING_CONFIRMATION':
        emit(Events.DATASET_PENDING_CONFIRMATION, { from: event.data.from, to: event.data.to })
        break
      case 'DATASET_APPLIED':
        emit(Events.DATASET_APPLIED, { version: event.data.version })
        break
      case 'DATASET_UPDATE_FAILED':
        emit(Events.DATASET_UPDATE_FAILED, { error: event.data.error })
        break
      case 'DATASET_UPDATE_AVAILABLE':
        emit(Events.DATASET_UPDATE_AVAILABLE, { from: event.data.from, to: event.data.to })
        break
      case 'DATASET_DOWNLOADING':
        emit(Events.DATASET_DOWNLOAD_PROGRESS, { progress: event.data.progress })
        break
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run tests/unit/data/offline.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/offline.js tests/unit/data/offline.test.js
git commit -m "feat: bridge Story 8 SW messages to client event bus (P2 #3b)"
```

**Verification checklist:**
- [ ] `pnpm vitest run tests/unit/data/offline.test.js` — all pass including new Story 8 bridge tests
- [ ] `pnpm run test:run` — full suite green
- [ ] `grep -n "DATASET_PENDING_CONFIRMATION\|DATASET_APPLIED\|DATASET_UPDATE_FAILED\|DATASET_UPDATE_AVAILABLE" src/data/offline.js` → all 4 types have case handlers
- [ ] Confirm `src/core/constants.js` already defines all `Events.DATASET_*` constants — verified from earlier exploration

---

### Task 5: Add manifest-fetcher timeout

**Findings addressed:** P2 #3 (no timeout on manifest fetch)

**Files:**
- Modify: `src/offline/manifest-fetcher.js`
- Modify: `tests/unit/offline/manifest-fetcher.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/unit/offline/manifest-fetcher.test.js`, add:

```javascript
it('aborts fetch after 10 seconds', async () => {
  vi.useFakeTimers()

  let rejectFetch
  globalThis.fetch = vi.fn().mockImplementation(() => new Promise((_resolve, reject) => {
    rejectFetch = reject
  }))

  // Need fresh import to get module with our mocked fetch
  vi.resetModules()
  const { fetchManifest } = await import('../../../src/offline/manifest-fetcher.js')

  const promise = fetchManifest()

  // Advance past the 10s timeout
  vi.advanceTimersByTime(10_001)

  // The AbortController should have aborted the fetch
  await expect(promise).rejects.toThrow()

  vi.useRealTimers()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/offline/manifest-fetcher.test.js
```

Expected: FAIL — no timeout, promise hangs.

- [ ] **Step 3: Add AbortController timeout**

Replace the full content of `src/offline/manifest-fetcher.js`:

```javascript
/**
 * Fetch the dataset manifest.
 * Always bypasses cache to get latest version info.
 * Aborts after 10 seconds to prevent hanging on slow/blocked networks.
 */

const TIMEOUT_MS = 10_000

/**
 * Fetch and parse /dataset/manifest.json.
 * @returns {Promise<{ packageVersion: string, files: object }>}
 * @throws {Error} on network error, non-200 response, or timeout
 */
export async function fetchManifest() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch('/dataset/manifest.json', {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Manifest fetch failed: ${response.status}`)
    }
    return response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run tests/unit/offline/manifest-fetcher.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/offline/manifest-fetcher.js tests/unit/offline/manifest-fetcher.test.js
git commit -m "feat: add 10s AbortController timeout to manifest fetch (P2 #3c)"
```

**Verification checklist:**
- [ ] `pnpm vitest run tests/unit/offline/manifest-fetcher.test.js` — all pass including timeout test
- [ ] `pnpm run test:run` — full suite green
- [ ] Read `src/offline/manifest-fetcher.js` — confirm `AbortController` with `setTimeout` and `clearTimeout` in `finally`
- [ ] Read `src/offline/manifest-fetcher.js` — confirm `signal: controller.signal` is passed to `fetch()`

---

### Task 6: Update Story 8 spec and tech-stack docs

**Findings addressed:** P2 #3 (contract drift), P2 #1 (architecture rules)

**Files:**
- Modify: `docs/specs/story-8-dataset-updates.md`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Update Story 8 spec to match implementation**

In `docs/specs/story-8-dataset-updates.md`:

1. Remove the "Simplified from original spec" paragraph (lines ~30-33) about no staging cache / no SHA-256 / no hash-diff
2. Update the state machine to include `verifying` and `applying`:
   ```
   idle → downloading → verifying → idle                         (minor/patch — auto)
   idle → downloading → verifying → pending-confirmation          (major — awaits user)
                          pending-confirmation → applying → idle
                          → idle (user dismisses)
   Any state → failed (on error)
   ```
3. Update the IDB `activationState` shape to use single `status` field:
   ```js
   {
     id: "current",
     status: 'idle' | 'downloading' | 'verifying' | 'pending-confirmation' | 'applying' | 'failed',
     version: target packageVersion string | null,
     progress: 0.0–1.0 | null,
     error: string | null,
     stagedAt: timestamp | null
   }
   ```
4. Update the modules section to reference actual file paths:
   - `src/offline/dataset-updater.js` (not `src/data/dataset-updater.js`)
   - `src/offline/manifest-fetcher.js` (not `src/data/manifest-fetcher.js`)
   - Add `src/offline/staging-cache.js` and `src/offline/sha256-verifier.js`
5. Note that `manifest-fetcher.js` has a 10-second AbortController timeout
6. Note that files are verified with SHA-256 via `sha256-verifier.js` before caching
7. Note that downloads go through a staging cache before being promoted to live

- [ ] **Step 2: Update tech-stack.md module communication rules**

In `docs/tech-stack.md`, update the module communication rules section:

1. State that `core/app.js` is the wiring layer — it provides marks hooks to reader and review via dependency injection (second arg to `init()`)
2. Remove `review/ → marks/store.js` as a sibling-import exception (it remains but `review/ → marks/editor.js` and `reader/ → marks/` are now handled via DI)
3. Clarify: feature modules must not import from other feature modules. All cross-feature wiring happens in `core/app.js`.
4. Keep: `safety/` and `a11y/` may be imported directly by any module (unchanged)

- [ ] **Step 3: Commit**

```bash
git add docs/specs/story-8-dataset-updates.md docs/tech-stack.md
git commit -m "docs: align Story 8 spec and tech-stack rules to implementation"
```

**Verification checklist:**
- [ ] Read `docs/specs/story-8-dataset-updates.md` — confirm `status` field (not `state`), 6 states listed, staging cache documented
- [ ] Read `docs/tech-stack.md` — confirm DI wiring rule documented, no `review/ → marks/editor.js` exception
- [ ] `pnpm run lint` — pass (no lint for md, but check anyway)
- [ ] `pnpm run test:run` — pass (docs changes don't affect tests, but confirm)

---

## Phase 3: Reader UX Polish (P2 #4)

### Task 7: Clear undo toast on all route cleanup paths

**Findings addressed:** P2 #4 (undo toast not cleared on all navigation paths)

**Files:**
- Modify: `src/reader/index.js:1-5,160-175`
- Modify: `src/marks/editor.js:11,17,239-248`
- Modify: `tests/unit/reader/reader.test.js`
- Modify: `tests/unit/marks/editor.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/unit/reader/reader.test.js`, add:

```javascript
it('cleanup() clears any active undo toast', async () => {
  const { showUndoToast } = await import('../../../src/core/ui.js')

  await reader.init({ surah: '1' }, mockHooks)

  // Simulate an active undo toast
  showUndoToast({
    verseKey: '1:1',
    record: { verseKey: '1:1', tags: ['favourite'] },
    onUndo: vi.fn(),
    onComplete: vi.fn(),
  })
  expect(document.querySelector('.qa-undo-toast')).not.toBeNull()

  reader.cleanup()
  expect(document.querySelector('.qa-undo-toast')).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/reader/reader.test.js
```

Expected: FAIL — cleanup() doesn't clear undo toast.

- [ ] **Step 3: Add undo toast clearing to reader cleanup()**

In `src/reader/index.js`, add import:

```javascript
import { clearUndoToast, clearUndoRecord } from '../core/ui.js'
```

Add to beginning of `cleanup()`:

```javascript
function cleanup() {
  clearUndoToast()
  clearUndoRecord()
  unobserve()
  // ... rest unchanged
```

- [ ] **Step 4: Remove the redundant NAVIGATION_NAVIGATE listener from marks/editor.js**

In `src/marks/editor.js`, inside `setupLongPress()`, remove the undo toast clearing block:

```javascript
// DELETE these lines from setupLongPress():
  unsubNavNavigate = on(Events.NAVIGATION_NAVIGATE, () => {
    clearUndoToast()
    clearUndoRecord()
    currentUndoRecord = null
  })
```

Remove the `clearUndoRecord` import (keep `clearUndoToast` — it's still used in `openEditor()`):

```javascript
// Change:
import { showUndoToast, clearUndoToast, clearUndoRecord } from '../core/ui.js'
// To:
import { showUndoToast, clearUndoToast } from '../core/ui.js'
```

Remove the `unsubNavNavigate` module variable declaration and its call in the returned cleanup function. The returned cleanup function becomes:

```javascript
  return () => {
    container.removeEventListener('touchstart', onTouchStart)
    container.removeEventListener('touchend', onTouchEnd)
    container.removeEventListener('touchmove', onTouchMove)
    container.removeEventListener('mouseover', onMouseOver)
    container.removeEventListener('mouseout', onMouseOut)
  }
```

- [ ] **Step 5: Update editor tests if any assert on nav listener**

In `tests/unit/marks/editor.test.js`, remove or update any tests that assert `clearUndoToast` is called on `NAVIGATION_NAVIGATE`. Add a test that verifies undo toast is NOT cleared by `setupLongPress` on nav (since reader cleanup now handles it).

- [ ] **Step 6: Run all tests**

```bash
pnpm run test:run
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/reader/index.js src/marks/editor.js tests/unit/reader/reader.test.js tests/unit/marks/editor.test.js
git commit -m "fix: clear undo toast on all route cleanup paths (P2 #4)"
```

**Verification checklist:**
- [ ] `pnpm run test:run` — all pass
- [ ] `grep -n "NAVIGATION_NAVIGATE" src/marks/editor.js` — **zero** results (listener removed)
- [ ] `grep -n "clearUndoToast\|clearUndoRecord" src/reader/index.js` — both present in `cleanup()`
- [ ] Manual: open `#/s/2` → long-press a verse → delete it → undo toast appears → type `#/s/3` in address bar → navigate → toast is gone
- [ ] Manual: on reader with undo toast → press browser back → toast is gone

---

## Phase 4: Release Guardrails (P2 #5, #6, #7)

### Task 8: Extract SW handlers and add unit tests

**Findings addressed:** P2 #5 (sw.js handlers lack dedicated automated tests)

**Files:**
- Create: `src/sw-handlers.js`
- Modify: `src/sw.js`
- Create: `tests/unit/sw-handlers.test.js`

- [ ] **Step 1: Create sw-handlers.js with extracted handler logic**

Create `src/sw-handlers.js` with injectable dependencies:

```javascript
/**
 * Service worker handler logic, extracted for testability.
 * Each handler receives its dependencies so it can be tested with mocks.
 */

const RETRY_DELAYS = [1000, 2000, 5000]
const MAX_RETRIES = 3

export async function fetchWithRetry(url, fetchFn, attempt = 0) {
  try {
    const response = await fetchFn(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw error
    }
    const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
    await new Promise(resolve => setTimeout(resolve, delay))
    return fetchWithRetry(url, fetchFn, attempt + 1)
  }
}

function postToAll(clients, type, payload = {}) {
  for (const client of clients) {
    client.postMessage({ type, ...payload })
  }
}

/**
 * Download corpus files to cache with SHA-256 verification.
 * @param {object} deps - { cacheName, cacheOpen, clientsMatchAll, fetchFn, verifyFn }
 * @param {string[]} urls - File URLs to cache
 */
export async function handleCacheDataset(deps, urls) {
  const { cacheName, cacheOpen, clientsMatchAll, fetchFn, verifyFn } = deps
  const cache = await cacheOpen(cacheName)
  const clients = await clientsMatchAll()

  // Build hash map from manifest for integrity checks
  const hashMap = {}
  try {
    const manifestResponse = await fetchFn('/dataset/manifest.json', { cache: 'no-store' })
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json()
      if (manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files)) {
        for (const [filename, sha256] of Object.entries(manifest.files)) {
          hashMap[`/dataset/${filename}`] = sha256
        }
      }
    }
  } catch {
    // Graceful degradation: proceed without verification
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const expectedHash = hashMap[url]

    const cached = await cache.match(url)
    if (cached) {
      if (expectedHash) {
        const buffer = await cached.clone().arrayBuffer()
        const valid = await verifyFn(buffer, expectedHash)
        if (valid) {
          postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
          continue
        }
        await cache.delete(url)
      } else {
        postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
        continue
      }
    }

    try {
      const response = await fetchWithRetry(url, fetchFn)
      if (expectedHash) {
        const buffer = await response.clone().arrayBuffer()
        const valid = await verifyFn(buffer, expectedHash)
        if (!valid) {
          postToAll(clients, 'DATASET_ERROR', { url, error: 'SHA-256 mismatch: file may be corrupted in transit' })
          return
        }
      }
      await cache.put(url, response)
    } catch (error) {
      postToAll(clients, 'DATASET_ERROR', { url, error: error.message })
      return
    }

    postToAll(clients, 'DATASET_PROGRESS', { cached: i + 1, total: urls.length })
  }

  postToAll(clients, 'DATASET_COMPLETE')
}

/**
 * Delete stale caches.
 * @param {object} deps - { expectedCaches, cachesKeys, cachesDelete }
 */
export async function cleanupStaleCaches(deps) {
  const { expectedCaches, cachesKeys, cachesDelete } = deps
  const allCacheNames = await cachesKeys()
  await Promise.all(
    allCacheNames
      .filter(name => !name.startsWith('workbox-precache') && !expectedCaches.has(name))
      .map(name => cachesDelete(name))
  )
}

/**
 * Purge the dataset cache and notify clients.
 * @param {object} deps - { cacheName, cachesDelete, clientsMatchAll }
 */
export async function handlePurgeCache(deps) {
  const { cacheName, cachesDelete, clientsMatchAll } = deps
  await cachesDelete(cacheName)
  const clients = await clientsMatchAll()
  postToAll(clients, 'DATASET_PURGED')
}
```

- [ ] **Step 2: Update sw.js to delegate to sw-handlers.js**

Replace the inline implementations in `src/sw.js` with calls to the extracted functions, passing real deps:

```javascript
import { handleCacheDataset, cleanupStaleCaches, handlePurgeCache } from './sw-handlers.js'
import { verify } from './offline/sha256-verifier.js'

// In handleCacheDataset wrapper:
async function onCacheDataset(event, urls) {
  await handleCacheDataset({
    cacheName: CACHE_DATASET,
    cacheOpen: (name) => caches.open(name),
    clientsMatchAll: () => self.clients.matchAll(),
    fetchFn: (url, opts) => fetch(url, opts),
    verifyFn: verify,
  }, urls)
}

// In activate handler:
async function onCleanupStaleCaches() {
  await cleanupStaleCaches({
    expectedCaches: new Set([CACHE_DATASET]),
    cachesKeys: () => caches.keys(),
    cachesDelete: (name) => caches.delete(name),
  })
}

// In purge handler:
async function onPurgeCache() {
  await handlePurgeCache({
    cacheName: CACHE_DATASET,
    cachesDelete: (name) => caches.delete(name),
    clientsMatchAll: () => self.clients.matchAll(),
  })
}
```

Keep the `fetchWithRetry` and `postToAll` from`sw.js` removed since they now live in `sw-handlers.js`.

- [ ] **Step 3: Write unit tests for sw-handlers.js**

Create `tests/unit/sw-handlers.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleCacheDataset, cleanupStaleCaches, handlePurgeCache, fetchWithRetry } from '../../src/sw-handlers.js'

describe('sw-handlers', () => {
  describe('handleCacheDataset()', () => {
    it('caches all URLs and sends DATASET_COMPLETE', async () => {
      const clients = [{ postMessage: vi.fn() }]
      const cacheStore = new Map()
      const deps = {
        cacheName: 'test-cache',
        cacheOpen: vi.fn().mockResolvedValue({
          match: vi.fn().mockResolvedValue(undefined),
          put: vi.fn(async (url, resp) => cacheStore.set(url, resp)),
          delete: vi.fn(),
        }),
        clientsMatchAll: vi.fn().mockResolvedValue(clients),
        fetchFn: vi.fn().mockImplementation(async (url) => {
          if (url.includes('manifest.json')) {
            return { ok: true, json: async () => ({ files: {} }) }
          }
          return {
            ok: true,
            clone: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
          }
        }),
        verifyFn: vi.fn().mockResolvedValue(true),
      }

      await handleCacheDataset(deps, ['/dataset/surahs.json'])

      const messages = clients[0].postMessage.mock.calls.map(c => c[0].type)
      expect(messages).toContain('DATASET_PROGRESS')
      expect(messages[messages.length - 1]).toBe('DATASET_COMPLETE')
    })

    it('sends DATASET_ERROR on SHA-256 mismatch for fresh download', async () => {
      const clients = [{ postMessage: vi.fn() }]
      const deps = {
        cacheName: 'test-cache',
        cacheOpen: vi.fn().mockResolvedValue({
          match: vi.fn().mockResolvedValue(undefined),
          put: vi.fn(),
          delete: vi.fn(),
        }),
        clientsMatchAll: vi.fn().mockResolvedValue(clients),
        fetchFn: vi.fn().mockImplementation(async (url) => {
          if (url.includes('manifest.json')) {
            return {
              ok: true,
              json: async () => ({ files: { 'surahs.json': 'expected_hash' } }),
            }
          }
          return {
            ok: true,
            clone: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
          }
        }),
        verifyFn: vi.fn().mockResolvedValue(false), // SHA mismatch
      }

      await handleCacheDataset(deps, ['/dataset/surahs.json'])

      const messages = clients[0].postMessage.mock.calls.map(c => c[0].type)
      expect(messages).toContain('DATASET_ERROR')
      expect(messages).not.toContain('DATASET_COMPLETE')
    })

    it('re-downloads corrupted cached files', async () => {
      const clients = [{ postMessage: vi.fn() }]
      let verifyCallCount = 0
      const deps = {
        cacheName: 'test-cache',
        cacheOpen: vi.fn().mockResolvedValue({
          match: vi.fn().mockResolvedValue({
            clone: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
          }),
          put: vi.fn(),
          delete: vi.fn(),
        }),
        clientsMatchAll: vi.fn().mockResolvedValue(clients),
        fetchFn: vi.fn().mockImplementation(async (url) => {
          if (url.includes('manifest.json')) {
            return {
              ok: true,
              json: async () => ({ files: { 'surahs.json': 'correct_hash' } }),
            }
          }
          return {
            ok: true,
            clone: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
          }
        }),
        verifyFn: vi.fn().mockImplementation(async () => {
          verifyCallCount++
          // First call: cached copy fails. Second call: fresh download succeeds.
          return verifyCallCount > 1
        }),
      }

      await handleCacheDataset(deps, ['/dataset/surahs.json'])

      const messages = clients[0].postMessage.mock.calls.map(c => c[0].type)
      expect(messages).toContain('DATASET_COMPLETE')
      // Cache.delete should have been called to remove corrupted entry
      expect(deps.cacheOpen.mock.results[0].value.delete).toHaveBeenCalled()
    })

    it('skips already-cached files with valid SHA-256', async () => {
      const clients = [{ postMessage: vi.fn() }]
      const deps = {
        cacheName: 'test-cache',
        cacheOpen: vi.fn().mockResolvedValue({
          match: vi.fn().mockResolvedValue({
            clone: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
          }),
          put: vi.fn(),
          delete: vi.fn(),
        }),
        clientsMatchAll: vi.fn().mockResolvedValue(clients),
        fetchFn: vi.fn().mockImplementation(async (url) => {
          if (url.includes('manifest.json')) {
            return {
              ok: true,
              json: async () => ({ files: { 'surahs.json': 'correct_hash' } }),
            }
          }
          throw new Error('Should not fetch — file is cached')
        }),
        verifyFn: vi.fn().mockResolvedValue(true), // cached copy is valid
      }

      await handleCacheDataset(deps, ['/dataset/surahs.json'])

      const messages = clients[0].postMessage.mock.calls.map(c => c[0].type)
      expect(messages).toContain('DATASET_COMPLETE')
      // fetch should only be called for manifest, not for the actual file
      const nonManifestFetches = deps.fetchFn.mock.calls.filter(c => !c[0].includes('manifest'))
      expect(nonManifestFetches).toHaveLength(0)
    })
  })

  describe('cleanupStaleCaches()', () => {
    it('deletes non-expected, non-workbox caches', async () => {
      const deleteFn = vi.fn().mockResolvedValue(true)
      const deps = {
        expectedCaches: new Set(['quran-dataset-v1']),
        cachesKeys: vi.fn().mockResolvedValue([
          'quran-dataset-v1',
          'workbox-precache-v2',
          'stale-old-cache',
        ]),
        cachesDelete: deleteFn,
      }

      await cleanupStaleCaches(deps)
      expect(deleteFn).toHaveBeenCalledWith('stale-old-cache')
      expect(deleteFn).not.toHaveBeenCalledWith('quran-dataset-v1')
      expect(deleteFn).not.toHaveBeenCalledWith('workbox-precache-v2')
    })

    it('does nothing when all caches are expected', async () => {
      const deleteFn = vi.fn()
      const deps = {
        expectedCaches: new Set(['quran-dataset-v1']),
        cachesKeys: vi.fn().mockResolvedValue(['quran-dataset-v1', 'workbox-precache-v2']),
        cachesDelete: deleteFn,
      }

      await cleanupStaleCaches(deps)
      expect(deleteFn).not.toHaveBeenCalled()
    })
  })

  describe('handlePurgeCache()', () => {
    it('deletes cache and posts DATASET_PURGED to all clients', async () => {
      const clients = [{ postMessage: vi.fn() }, { postMessage: vi.fn() }]
      const deps = {
        cacheName: 'quran-dataset-v1',
        cachesDelete: vi.fn().mockResolvedValue(true),
        clientsMatchAll: vi.fn().mockResolvedValue(clients),
      }

      await handlePurgeCache(deps)
      expect(deps.cachesDelete).toHaveBeenCalledWith('quran-dataset-v1')
      expect(clients[0].postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'DATASET_PURGED' }))
      expect(clients[1].postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'DATASET_PURGED' }))
    })
  })

  describe('fetchWithRetry()', () => {
    it('returns response on success', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ ok: true })
      const result = await fetchWithRetry('/test', fetchFn)
      expect(result).toEqual({ ok: true })
      expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    it('retries up to 3 times on failure', async () => {
      vi.useFakeTimers()
      const fetchFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockRejectedValueOnce(new Error('fail 3'))
        .mockRejectedValue(new Error('final fail'))

      const promise = fetchWithRetry('/test', fetchFn)
      // Advance through retry delays (1s, 2s, 5s)
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(5000)

      await expect(promise).rejects.toThrow('final fail')
      expect(fetchFn).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
      vi.useRealTimers()
    })
  })
})
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run tests/unit/sw-handlers.test.js
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add src/sw-handlers.js src/sw.js tests/unit/sw-handlers.test.js
git commit -m "refactor: extract SW handlers for testability + add unit tests (P2 #5)"
```

**Verification checklist:**
- [ ] `pnpm vitest run tests/unit/sw-handlers.test.js` — all 8+ tests pass
- [ ] `pnpm run test:run` — full suite green
- [ ] `pnpm run build` — no build errors (sw.js import resolution still works)
- [ ] `src/sw.js` is now a thin shell — handler bodies live in `sw-handlers.js`
- [ ] `src/sw-handlers.js` has zero references to `self`, `caches`, `fetch` globals — all injected

---

### Task 9: Enforce coverage thresholds in CI

**Findings addressed:** P2 #7 (coverage thresholds not enforced in CI)

**Files:**
- Modify: `.github/workflows/ci.yml:56`

- [ ] **Step 1: Update CI test command**

In `.github/workflows/ci.yml`, change the test job's run command from:

```yaml
      - name: Run tests
        run: pnpm run test:run
```

To:

```yaml
      - name: Run tests with coverage
        run: pnpm run test:coverage
```

- [ ] **Step 2: Verify locally**

```bash
pnpm run test:coverage
```

Expected: Tests pass and coverage thresholds (lines 80%, branches 70%, functions 75%) are met.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: enforce coverage thresholds by running test:coverage (P2 #7)"
```

**Verification checklist:**
- [ ] `pnpm run test:coverage` — passes locally with thresholds met
- [ ] Read `.github/workflows/ci.yml` — confirm `test:coverage` (not `test:run`) in the test job
- [ ] `grep -n "test:run" .github/workflows/ci.yml` → **zero** results
- [ ] `grep -n "test:coverage" .github/workflows/ci.yml` → exactly 1 result

---

### Task 10: Add performance budget assertions

**Findings addressed:** P2 #6 (performance budgets not regression-tested)

**Files:**
- Create: `tests/unit/perf/idb-budgets.test.js`
- Create: `tests/e2e/performance-budgets.spec.js`

- [ ] **Step 1: Create IDB performance budget tests (Vitest)**

Create `tests/unit/perf/idb-budgets.test.js`:

```javascript
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { openDB, put, get } from '../../../src/core/db.js'
import { save, del, getAll } from '../../../src/marks/store.js'

beforeEach(async () => {
  await openDB()
})

describe('IDB operation performance budgets', () => {
  it('mark save completes in < 200ms', async () => {
    const start = performance.now()
    await save('2:255', ['favourite'])
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(200)
  })

  it('mark delete completes in < 200ms', async () => {
    await save('2:255', ['favourite'])
    const start = performance.now()
    await del('2:255')
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(200)
  })

  it('position save completes in < 50ms', async () => {
    const start = performance.now()
    await put('positions', { id: 's1', surah: 1, verse: 5, savedAt: Date.now() })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(50)
  })

  it('settings read completes in < 50ms', async () => {
    await put('settings', { key: 'theme', value: 'dark' })
    const start = performance.now()
    await get('settings', 'theme')
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(50)
  })

  it('cross-tab re-read of 30 marks completes in < 300ms', async () => {
    for (let i = 1; i <= 30; i++) {
      await save(`1:${i}`, ['favourite'])
    }
    const start = performance.now()
    const marks = await getAll()
    const elapsed = performance.now() - start
    expect(marks).toHaveLength(30)
    expect(elapsed).toBeLessThan(300)
  })
})
```

- [ ] **Step 2: Create render performance budget tests (Playwright)**

Create `tests/e2e/performance-budgets.spec.js`:

```javascript
import { test, expect } from '@playwright/test'

test.describe('Performance budgets', () => {
  test('Al-Baqarah initial render ≤ 500ms (first verse visible)', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse="1"]')

    const renderTime = await page.evaluate(async () => {
      const mainContent = document.getElementById('main-content')
      mainContent.innerHTML = ''

      const start = performance.now()
      window.location.hash = '#/s/2'

      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.querySelector('[data-verse="1"]')) {
            observer.disconnect()
            resolve()
          }
        })
        observer.observe(mainContent, { childList: true, subtree: true })
        setTimeout(resolve, 2000) // safety timeout
      })

      return performance.now() - start
    })

    expect(renderTime).toBeLessThan(500)
  })

  test('surah load + position restore within 500ms', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse="1"]')

    const loadTime = await page.evaluate(async () => {
      const start = performance.now()
      window.location.hash = '#/s/3'

      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.querySelector('[data-verse="1"]')) {
            observer.disconnect()
            resolve()
          }
        })
        observer.observe(document.getElementById('main-content'), {
          childList: true,
          subtree: true,
        })
        setTimeout(resolve, 2000)
      })

      return performance.now() - start
    })

    expect(loadTime).toBeLessThan(500)
  })
})
```

- [ ] **Step 3: Run Vitest perf tests**

```bash
pnpm vitest run tests/unit/perf/idb-budgets.test.js
```

Expected: All pass.

- [ ] **Step 4: Run Playwright perf tests**

```bash
pnpm exec playwright test tests/e2e/performance-budgets.spec.js
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/perf/idb-budgets.test.js tests/e2e/performance-budgets.spec.js
git commit -m "test: add performance budget assertions for IDB and render (P2 #6)"
```

**Verification checklist:**
- [ ] `pnpm vitest run tests/unit/perf/idb-budgets.test.js` — all 5 IDB budget tests pass
- [ ] `pnpm exec playwright test tests/e2e/performance-budgets.spec.js` — all render budget tests pass
- [ ] Budgets match documented spec values: save <200ms, position <50ms, re-read <300ms, render <500ms
- [ ] `pnpm run test:run` — full unit suite still green (perf tests included)

---

## Phase 5: P3 Fixes

### Task 11: Add console-noise regression capture to test setup

**Findings addressed:** P3 #1 (console error/warn regression capture absent)

**Files:**
- Modify: `tests/setup.js`

- [ ] **Step 1: Add console spies and logger silencing to tests/setup.js**

Append to `tests/setup.js`:

```javascript
// ── Console-noise regression capture ────────────────────────────────────
// Fail tests that emit unexpected console.error/warn.
// Tests that intentionally trigger errors should mock console explicitly:
//   vi.spyOn(console, 'error').mockImplementation(() => {})

const _origError = console.error
const _origWarn = console.warn

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    // Allow React/jsdom internal warnings to pass through
    _origError(...args)
    throw new Error(`Unexpected console.error: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`)
  })
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    _origWarn(...args)
    throw new Error(`Unexpected console.warn: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
```

- [ ] **Step 2: Silence logger in tests to prevent console noise from loglevel**

Add near the top of `tests/setup.js` (after global mocks):

```javascript
// Silence structured logger in tests — loglevel delegates to console.*
// which would trigger the noise capture above. Tests that need to verify
// logging should spy on logger methods directly.
import { logger } from '../src/core/logger.js'
logger.setLevel('silent')
```

- [ ] **Step 3: Run all tests and fix failures**

```bash
pnpm run test:run
```

Expected: Some tests will fail because they trigger `console.error`/`console.warn` without mocking. For each:

- **If the test is exercising an error path:** Add `vi.spyOn(console, 'error').mockImplementation(() => {})` in that test's setup
- **If the console call is accidental noise:** Fix the source

This is iterative — run tests, fix the first batch of failures, run again, repeat until green.

- [ ] **Step 4: Commit**

```bash
git add tests/setup.js
git commit -m "test: fail on unexpected console.error/warn in unit tests (P3 #1)"
```

**Verification checklist:**
- [ ] `pnpm run test:run` — all tests pass (no unexpected console noise)
- [ ] Adding `console.error('test leak')` to any module → causes test failure
- [ ] Tests that mock `console.error` explicitly still pass (mock suppresses the throw)
- [ ] `grep -n "logger.setLevel" tests/setup.js` → present

---

### Task 12: Add tablet viewport to Playwright

**Findings addressed:** P3 #2 (tablet-width E2E coverage gap)

**Files:**
- Modify: `playwright.config.js`
- Modify: `tests/e2e/navigation-panel.spec.js`

- [ ] **Step 1: Add tablet project to playwright.config.js**

Add after the `Mobile Chrome` project entry:

```javascript
    {
      name: 'Tablet',
      use: {
        viewport: { width: 768, height: 1024 },
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      grep: /@tablet/,
    },
```

- [ ] **Step 2: Tag tablet-sensitive tests in navigation-panel.spec.js**

In `tests/e2e/navigation-panel.spec.js`, add `@tablet` to test titles that exercise navigation panel responsive behavior:

```javascript
test('navigation panel is visible at tablet width @tablet', async ({ page }) => {
  await page.goto('/#/s/1')
  await page.waitForSelector('[data-verse="1"]')
  // Assert navigation panel behavior at 768px breakpoint
  // (specific assertions depend on existing nav panel behavior)
})
```

- [ ] **Step 3: Run E2E tests**

```bash
pnpm exec playwright test
```

Expected: All pass including the new tablet project.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.js tests/e2e/navigation-panel.spec.js
git commit -m "test: add 768px tablet viewport project to Playwright (P3 #2)"
```

**Verification checklist:**
- [ ] `pnpm exec playwright test --list` — shows Tablet project with `@tablet` tests
- [ ] `pnpm exec playwright test --project='Tablet'` — tagged tests run at 768px viewport
- [ ] `pnpm exec playwright test` — full suite passes including tablet tests
- [ ] Read `playwright.config.js` — Tablet project has `grep: /@tablet/` and 768x1024 viewport

---

### Task 13: Fix theme-changed event payload

**Findings addressed:** P3 #3 (theme-change event payload does not match Story 9 contract)

**Files:**
- Modify: `src/settings/theme.js:53-57`
- Modify: `tests/unit/settings/settings-page.test.js`

- [ ] **Step 1: Write the failing test**

In `tests/unit/settings/settings-page.test.js`, add:

```javascript
it('emits settings:theme-changed with { from, to } payload', async () => {
  const { setTheme, initTheme } = await import('../../../src/settings/theme.js')
  const { on } = await import('../../../src/core/events.js')

  // Initialize to known state
  await initTheme() // Sets 'light' as default

  const received = []
  const unsub = on('settings:theme-changed', (payload) => received.push(payload))

  await setTheme('dark')

  expect(received).toHaveLength(1)
  expect(received[0]).toHaveProperty('from', 'light')
  expect(received[0]).toHaveProperty('to', 'dark')
  expect(received[0]).not.toHaveProperty('theme') // old payload shape
  unsub()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/unit/settings/settings-page.test.js
```

Expected: FAIL — payload has `{ theme }` not `{ from, to }`

- [ ] **Step 3: Update setTheme() to emit { from, to }**

In `src/settings/theme.js`, modify `setTheme()`:

```javascript
export async function setTheme(theme) {
  if (!THEME_OPTIONS.includes(theme)) {
    console.warn('Invalid theme:', theme)
    return false
  }

  // Capture previous theme before applying
  const from = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME

  applyTheme(theme)
  emit(Events.SETTINGS_THEME_CHANGED, { from, to: theme })

  put('settings', { key: 'theme', value: theme }).catch((error) => {
    console.error('Failed to save theme:', error)
  })

  return true
}
```

- [ ] **Step 4: Update any existing tests that assert `{ theme }` shape**

Search tests for assertions on `SETTINGS_THEME_CHANGED` payload with `{ theme: ... }` and update to `{ from: ..., to: ... }`.

- [ ] **Step 5: Run all tests**

```bash
pnpm run test:run
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/settings/theme.js tests/unit/settings/settings-page.test.js
git commit -m "fix: emit { from, to } in theme-changed event per Story 9 spec (P3 #3)"
```

**Verification checklist:**
- [ ] `pnpm vitest run tests/unit/settings/settings-page.test.js` — all pass
- [ ] `pnpm run test:run` — full suite green
- [ ] `grep -n "{ theme }" src/settings/theme.js` in emit call → **zero** results
- [ ] `grep -n "{ from" src/settings/theme.js` in emit call → present with `from` and `to`
- [ ] Read `docs/specs/story-9-settings-about.md` — confirm payload matches `{ from, to }`

---

## Phase 6: Logger Migration

### Task 14: Migrate all client-side console.* calls to structured logger

**Findings addressed:** Open Question #3 (logger inconsistency — decision: expand app-wide)

**Files to migrate (client-side only — 19 calls across 8 files):**

| File | `console.error` | `console.warn` | Total |
|------|-----------------|----------------|-------|
| `src/core/router.js` | 2 | 4 | 6 |
| `src/data/offline.js` | 1 | 2 | 3 |
| `src/review/hub.js` | 2 | 0 | 2 |
| `src/core/app.js` | 2 | 0 | 2 |
| `src/safety/sync.js` | 2 | 0 | 2 |
| `src/marks/store.js` | 2 | 0 | 2 |
| `src/settings/theme.js` | 1 | 2 | 3 |
| `src/core/db.js` | 1 | 0 | 1 |

**Files to leave unchanged (SW context — cannot import logger):**
- `src/sw.js` (1 call)
- `src/offline/dataset-updater.js` (3 calls)

- [ ] **Step 1: Add logger import and replace calls in each file**

For each client-side file:

1. Add `import { logger } from './logger.js'` (or `'../core/logger.js'` for files outside `core/`)
2. Replace `console.error(msg, val)` → `logger.error(msg, { detail: val })` (or `logger.error(msg, val)` if val is already an object)
3. Replace `console.warn(msg, val)` → `logger.warn(msg, { detail: val })`

**`src/core/router.js`:**
```javascript
import { logger } from './logger.js'

// Line 74: console.warn('Router: rejected param with XSS pattern:', key)
logger.warn('Router: rejected param with XSS pattern', { key })
// Line 79: console.warn('Router: rejected param with HTML tags:', key)
logger.warn('Router: rejected param with HTML tags', { key })
// Line 84: console.warn('Router: rejected oversized param:', key)
logger.warn('Router: rejected oversized param', { key })
// Line 89: console.warn('Router: rejected param with protocol scheme:', key)
logger.warn('Router: rejected param with protocol scheme', { key })
// Line 118: console.error(`Route ${hash} rejected: invalid parameters`)
logger.error('Route rejected: invalid parameters', { route: hash })
// Line 124: console.error(`Route ${hash} failed:`, error)
logger.error('Route failed', { route: hash, error: error.message })
```

**`src/data/offline.js`:**
```javascript
import { logger } from '../core/logger.js'

// Line 33: console.error('Failed to get activation state:', error)
logger.error('Failed to get activation state', { error: error.message })
// Line 133: console.warn('Storage estimate unavailable...', error)
logger.warn('Storage estimate unavailable, proceeding with download', { error: error.message })
// Line 86: console.warn('Storage quota check failed:', error)
logger.warn('Storage quota check failed', { error: error.message })
```

**`src/review/hub.js`:**
```javascript
import { logger } from '../core/logger.js'

// Line 44: console.error('Failed to load surahs for Review Hub:', error)
logger.error('Failed to load surahs for Review Hub', { error: error.message })
// Line 101: console.error('Failed to load surahs for tag deep link:', error)
logger.error('Failed to load surahs for tag deep link', { error: error.message })
```

**`src/core/app.js`:**
```javascript
// Already imports logger. Replace:
// Line 111: console.error('Failed to initialize app:', error)
logger.error('Failed to initialize app', { error: error.message })
// Line 153: console.error('SW registration failed:', error)
logger.error('SW registration failed', { error: error.message })
```

**`src/safety/sync.js`:**
```javascript
import { logger } from '../core/logger.js'

// Line 115: console.error('Sync handler error:', error)
logger.error('Sync handler error', { error: error.message })
// Line 127: console.error('Safety sync: no valid container found')
logger.error('Safety sync: no valid container found')
```

**`src/marks/store.js`:**
```javascript
import { logger } from '../core/logger.js'

// Line 47: console.error('Failed to save mark:', { verseKey, error: error.message })
logger.error('Failed to save mark', { verseKey, error: error.message })
// Line 66: console.error('Failed to delete mark:', { verseKey, error: error.message })
logger.error('Failed to delete mark', { verseKey, error: error.message })
```

**`src/settings/theme.js`:**
```javascript
import { logger } from '../core/logger.js'

// Line 24: console.error('Failed to load theme:', error)
logger.error('Failed to load theme', { error: error.message })
// Line 37: console.warn('Invalid theme:', theme)
logger.warn('Invalid theme', { theme })
// Line 55: console.warn('Invalid theme:', theme)
logger.warn('Invalid theme', { theme })
// Line 64: console.error('Failed to save theme:', error)
logger.error('Failed to save theme', { error: error.message })
```

**`src/core/db.js`:**
```javascript
import { logger } from './logger.js'

// Line 230: console.error('Failed to get most recent position:', error)
logger.error('Failed to get most recent position', { error: error.message })
```

- [ ] **Step 2: Ensure tests setup silences logger**

Verify `tests/setup.js` has `logger.setLevel('silent')` (added in Task 11).

- [ ] **Step 3: Run all tests**

```bash
pnpm run test:run
```

Expected: All pass. Logger is silenced in tests, so no console noise capture triggers.

- [ ] **Step 4: Commit**

```bash
git add src/core/router.js src/data/offline.js src/review/hub.js src/core/app.js src/safety/sync.js src/marks/store.js src/settings/theme.js src/core/db.js
git commit -m "refactor: migrate client-side console.* calls to structured logger"
```

**Verification checklist:**
- [ ] `pnpm run test:run` — all pass
- [ ] `pnpm run lint` — no new lint errors
- [ ] `grep -rn "console\.error\|console\.warn" src/ --include='*.js' | grep -v sw.js | grep -v dataset-updater.js | grep -v node_modules` → **zero** results
- [ ] `grep -rn "console\.error\|console\.warn" src/sw.js src/offline/dataset-updater.js` → still present (SW context, expected)
- [ ] `grep -rn "import.*logger" src/core/router.js src/data/offline.js src/review/hub.js src/safety/sync.js src/marks/store.js src/settings/theme.js src/core/db.js` → all 7 files import logger

---

## Phase 7: E2E Integration Tests for SW

### Task 15: Add E2E integration tests for SW message handlers

**Findings addressed:** P2 #5 (complements Task 8 unit tests with real integration coverage)

**Files:**
- Create: `tests/e2e/sw-integration.spec.js`

- [ ] **Step 1: Write E2E tests**

Create `tests/e2e/sw-integration.spec.js`:

```javascript
import { test, expect } from '@playwright/test'

test.describe('Service Worker integration', () => {
  test('SW registers and claims the page on first load', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('#main-content')

    const swActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const reg = await navigator.serviceWorker.ready
      return !!reg.active
    })
    expect(swActive).toBe(true)
  })

  test('PURGE_DATASET_CACHE clears corpus cache and notifies client', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('#main-content')

    const purged = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!reg.active) return false

      return new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'DATASET_PURGED') {
            resolve(true)
          }
        })
        reg.active.postMessage({ type: 'PURGE_DATASET_CACHE' })
        setTimeout(() => resolve(false), 5000)
      })
    })
    expect(purged).toBe(true)
  })

  test('SKIP_WAITING activates waiting SW', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('#main-content')

    const skipped = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!reg.active) return false

      // Send skip waiting and check that the SW remains active
      reg.active.postMessage({ type: 'SKIP_WAITING' })

      // Wait a tick and verify SW is still controlling
      await new Promise(r => setTimeout(r, 500))
      return !!navigator.serviceWorker.controller
    })
    expect(skipped).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
pnpm exec playwright test tests/e2e/sw-integration.spec.js
```

Expected: Pass (requires production build for SW registration — the Playwright webServer uses Vite which may or may not register the SW depending on config).

Note: If tests fail because SW doesn't register in dev mode, add a build step to the test or mark as `test.skip` in dev and run only in CI with the build server.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/sw-integration.spec.js
git commit -m "test: add E2E integration tests for SW message handlers (P2 #5b)"
```

**Verification checklist:**
- [ ] `pnpm exec playwright test tests/e2e/sw-integration.spec.js` — all pass (or marked for CI-only if SW needs prod build)
- [ ] Tests exercise real SW message flow, not mocks
- [ ] Each test has a safety timeout to prevent hangs

---

## Final Verification

After all 15 tasks are complete, run the full verification suite:

```bash
# 1. Full unit test suite with coverage
pnpm run test:coverage

# 2. Full E2E test suite
pnpm exec playwright test

# 3. Lint
pnpm run lint

# 4. Build
pnpm run build

# 5. Chunk size check
pnpm run check-chunks
```

### Architecture verification:

```bash
# No boundary violations — reader and review don't import marks directly
grep -rn "from '../marks/" src/reader/index.js src/review/hub.js | grep -v "// permitted"

# activationState uses single status field
grep -n "state:" src/offline/dataset-updater.js | grep -v "activationState\|//\|status"

# All Story 8 message types bridged
grep -c "DATASET_PENDING_CONFIRMATION\|DATASET_APPLIED\|DATASET_UPDATE_FAILED\|DATASET_UPDATE_AVAILABLE" src/data/offline.js

# Console calls only in SW context
grep -rn "console\.error\|console\.warn" src/ --include='*.js' | grep -v sw.js | grep -v dataset-updater.js | wc -l
# Expected: 0
```

### Manual smoke test:

1. Open app → navigate to `#/s/2` → long-press verse → editor modal opens → mark a verse → save
2. Delete the mark → undo toast appears → navigate to `#/s/3` → toast is gone
3. Navigate to `#/review` → mark cards visible → click a card → editor opens
4. Refresh page → navigate between surahs 5x → no console errors
5. Open DevTools → Application → Service Workers → verify SW is active

---

*End of plan.*
