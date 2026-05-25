# React Tech Stack Refactor 13 - Continuity And Bookmarks Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve React launch restore, saved reader position, route exclusions, riwayah-scoped bookmarks, landing pulse, reload behavior, and same-device cross-tab coherence.

**Architecture:** Implement continuity helpers under `src-react/continuity/**` on top of the Wave 08 Dexie v7 schema mirror and Wave 09 `data-token-key` reader contract. UI bookmark components compose Wave 10 navigation components, while browser-only reload/cross-tab proof lives in Playwright surface folders. No IDB schema migration is allowed.

**Tech Stack:** React, TypeScript, Dexie v7 compatibility, BroadcastChannel, QuranAtlas hash router, Vitest/fake-indexeddb, Playwright React e2e.

---

## Dependencies And Sequencing

This plan runs after Wave 08, Wave 09, Wave 10, and Wave 11. Wave 14 must compose with these continuity APIs without changing bookmark scope or launch restore rules.

## UI And Visual Proof Rule

Before implementing bookmark or continuity-visible UI, read `DESIGN.md`, use the Wave 2 registry, choose exactly one active reference source for that component pass, and record whether it is a committed `docs/ui-references/**` image/note or an accepted current Svelte UI state from Wave 02. Storybook and Playwright proof must cover mobile `<768`, tablet `768-1179`, desktop `>=1180`, light/sepia/dark where relevant, and awkward states such as empty bookmarks, grouped bookmarks, landing pulse, reload restore, cross-tab updates, and focus rings.

## File Structure

- Create: `src-react/continuity/launch-restore.ts`
- Create: `src-react/continuity/last-surface.ts`
- Create: `src-react/continuity/current-position.ts`
- Create: `src-react/continuity/bookmarks/store.ts`
- Create: `src-react/continuity/bookmarks/pulse.ts`
- Create: `src-react/continuity/bookmarks/sync.ts`
- Create: `src-react/components/navigation/bookmarks/BookmarkToggle.tsx`
- Create: `src-react/components/navigation/bookmarks/BookmarkIndicator.tsx`
- Create: `src-react/components/navigation/bookmarks/BookmarkLandingPulse.tsx`
- Modify: `src-react/components/navigation/BookmarksList.tsx`
- Modify: `src-react/app/router/routes.ts`
- Modify: `src-react/app/providers/**` or app bootstrap equivalent for launch restore and cross-tab subscriptions.
- Modify: `src-react/design-system/registry/component-registry.json`
- Create: `tests/unit/react-continuity/launch-restore.test.ts`
- Create: `tests/unit/react-continuity/current-position.test.ts`
- Create: `tests/unit/react-continuity/bookmarks-store.test.ts`
- Create: `tests/unit/react-continuity/bookmark-sync.test.ts`
- Create: `tests/e2e/read/react-continuity.spec.js`
- Create: `tests/e2e/navigate/react-bookmarks.spec.js`
- Create: `tests/e2e/infra/react-cross-tab.spec.js`
- Modify docs only if current behavior/ownership changes.

## Task 1: Preflight And Schema Guard

**Files:**
- Read: required docs, including `docs/context/events.md`, and Wave 08/09/10/11 outputs.

- [ ] **Step 1: Confirm dependency outputs**

Run:

```bash
test -f src-react/storage/db.ts
test -f src-react/components/reader/VerseBlock.tsx
test -f src-react/components/navigation/BookmarksList.tsx
test -f src-react/app/routes/search/SearchRoute.tsx
```

Expected: files exist. If Wave 11 intentionally did not add `#/search`, record that in the handoff and exclude search from route tests by name.

- [ ] **Step 2: Confirm existing DB v7 bookmark key path**

Run:

```bash
rg -n "bookmarks|keyPath: \\['riwayah', 'verseKey'\\]|by-riwayah" src/core/db/migrations.js src-react/storage/schema.ts docs/context/data-model.md docs/context/surfaces/navigate.md
```

Expected: code confirms compound key path `[riwayah, verseKey]`. If docs still describe an `id` key, update docs in this implementation after confirming code wins.

- [ ] **Step 3: Confirm forbidden migration scope**

Run:

```bash
rg -n "QURAN_ATLAS_DB_VERSION|DB_VERSION|version\\(8\\)|createObjectStore" src-react src/core/db
```

Expected: React opens version 7 only and this plan does not add a DB migration.

## Task 2: Launch Restore And Last Surface

**Files:**
- Create: `src-react/continuity/launch-restore.ts`
- Create: `src-react/continuity/last-surface.ts`
- Test: `tests/unit/react-continuity/launch-restore.test.ts`

- [ ] **Step 1: Write launch restore tests**

Create `tests/unit/react-continuity/launch-restore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveLaunchRoute, shouldPersistLastSurface } from '../../src-react/continuity/launch-restore'

describe('React launch restore', () => {
  it('routes incomplete onboarding first', () => {
    expect(resolveLaunchRoute({ onboardingComplete: false, lastSurface: '#/s/2', currentPosition: { surah: 3, verse: 4 } })).toBe('#/onboarding')
  })

  it('uses valid launchable lastSurface before saved position', () => {
    expect(resolveLaunchRoute({ onboardingComplete: true, lastSurface: '#/m/12', currentPosition: { surah: 3, verse: 4 } })).toBe('#/m/12')
  })

  it('excludes operational routes from launch surfaces', () => {
    expect(shouldPersistLastSurface('#/assets')).toBe(false)
    expect(shouldPersistLastSurface('#/settings')).toBe(false)
    expect(shouldPersistLastSurface('#/onboarding')).toBe(false)
    expect(shouldPersistLastSurface('#/search')).toBe(false)
  })

  it('falls back to currentPosition then Al-Fatihah', () => {
    expect(resolveLaunchRoute({ onboardingComplete: true, lastSurface: '#/assets', currentPosition: { surah: 2, verse: 255 } })).toBe('#/s/2/255')
    expect(resolveLaunchRoute({ onboardingComplete: true })).toBe('#/s/1')
  })
})
```

Expected: fails until launch restore exists.

- [ ] **Step 2: Implement launch restore**

Create `src-react/continuity/launch-restore.ts`:

```ts
export type SavedPosition = { surah: number; verse: number }

const EXCLUDED = new Set(['#/onboarding', '#/settings', '#/assets', '#/search'])

export function isValidReaderHash(hash: string): boolean {
  return /^#\/s\/(?:[1-9]|[1-9]\d|10\d|11[0-4])(?:\/\d{1,3})?$/.test(hash)
    || /^#\/m\/(?:[1-9]\d{0,2})$/.test(hash)
    || hash === '#/surahs'
    || hash === '#/bookmarks'
    || hash === '#/about'
}

export function shouldPersistLastSurface(hash: string): boolean {
  if (EXCLUDED.has(hash)) return false
  return isValidReaderHash(hash)
}

function validPosition(position?: SavedPosition): position is SavedPosition {
  return !!position
    && Number.isInteger(position.surah)
    && Number.isInteger(position.verse)
    && position.surah >= 1
    && position.surah <= 114
    && position.verse >= 1
}

export function resolveLaunchRoute(input: {
  onboardingComplete?: boolean
  lastSurface?: string
  currentPosition?: SavedPosition
}): string {
  if (!input.onboardingComplete) return '#/onboarding'
  if (input.lastSurface && shouldPersistLastSurface(input.lastSurface)) return input.lastSurface
  if (validPosition(input.currentPosition)) return `#/s/${input.currentPosition.surah}/${input.currentPosition.verse}`
  return '#/s/1'
}
```

Expected: operational routes and search route are excluded unless later docs/tests approve otherwise.

- [ ] **Step 3: Implement last-surface persistence**

Create `src-react/continuity/last-surface.ts`:

```ts
import { openReactDb } from '../storage/db'
import { shouldPersistLastSurface } from './launch-restore'

export async function persistLastSurface(hash: string): Promise<void> {
  if (!shouldPersistLastSurface(hash)) return
  const db = await openReactDb()
  await db.settings.put({ key: 'lastSurface', value: hash })
}

export async function loadLastSurface(): Promise<string | null> {
  const db = await openReactDb()
  const record = await db.settings.get('lastSurface')
  return typeof record?.value === 'string' ? record.value : null
}
```

Expected: only launchable surfaces persist.

- [ ] **Step 4: Run launch restore tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-continuity/launch-restore.test.ts
```

Expected: tests pass.

## Task 3: Current Position

**Files:**
- Create: `src-react/continuity/current-position.ts`
- Test: `tests/unit/react-continuity/current-position.test.ts`

- [ ] **Step 1: Write current position tests**

Create `tests/unit/react-continuity/current-position.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeCurrentPosition } from '../../src-react/continuity/current-position'

describe('React current position', () => {
  it('accepts valid Quran refs and rejects invalid values', () => {
    expect(normalizeCurrentPosition({ surah: 2, verse: 255 })).toEqual({ surah: 2, verse: 255 })
    expect(normalizeCurrentPosition({ surah: 0, verse: 1 })).toBeNull()
    expect(normalizeCurrentPosition({ surah: 115, verse: 1 })).toBeNull()
    expect(normalizeCurrentPosition({ surah: 2, verse: 0 })).toBeNull()
  })
})
```

Expected: fails until helper exists.

- [ ] **Step 2: Implement current position helper**

Create `src-react/continuity/current-position.ts`:

```ts
import { openReactDb } from '../storage/db'

export type CurrentPosition = { surah: number; verse: number }

export function normalizeCurrentPosition(value: unknown): CurrentPosition | null {
  const candidate = value as Partial<CurrentPosition> | null
  if (!candidate) return null
  if (!Number.isInteger(candidate.surah) || !Number.isInteger(candidate.verse)) return null
  if (candidate.surah < 1 || candidate.surah > 114 || candidate.verse < 1) return null
  return { surah: candidate.surah, verse: candidate.verse }
}

export async function loadCurrentPosition(): Promise<CurrentPosition | null> {
  const db = await openReactDb()
  const record = await db.settings.get('currentPosition')
  return normalizeCurrentPosition(record?.value)
}

export async function saveCurrentPosition(position: CurrentPosition): Promise<void> {
  const normalized = normalizeCurrentPosition(position)
  if (!normalized) throw new Error('Invalid current position')
  const db = await openReactDb()
  await db.settings.put({ key: 'currentPosition', value: normalized })
}
```

Expected: saved-position fallback validates before routing.

- [ ] **Step 3: Run current position tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-continuity/current-position.test.ts
```

Expected: tests pass.

## Task 4: Riwayah-Scoped Bookmarks

**Files:**
- Create: `src-react/continuity/bookmarks/store.ts`
- Create: `src-react/components/navigation/bookmarks/BookmarkToggle.tsx`
- Create: `src-react/components/navigation/bookmarks/BookmarkIndicator.tsx`
- Modify: `src-react/components/navigation/BookmarksList.tsx`
- Test: `tests/unit/react-continuity/bookmarks-store.test.ts`

- [ ] **Step 1: Write bookmark store tests**

Create `tests/unit/react-continuity/bookmarks-store.test.ts`:

```ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearReactDbForTests } from '../utils/react-db-test-utils'
import { getBookmarksForRiwayah, toggleBookmark } from '../../src-react/continuity/bookmarks/store'

describe('React bookmarks store', () => {
  beforeEach(async () => {
    await clearReactDbForTests()
  })

  it('scopes bookmarks by active riwayah', async () => {
    await toggleBookmark({ riwayah: 'hafs', verseKey: '2:255', surah: 2 })
    await toggleBookmark({ riwayah: 'qaloon', verseKey: '2:255', surah: 2 })
    expect(await getBookmarksForRiwayah('hafs')).toHaveLength(1)
    expect(await getBookmarksForRiwayah('qaloon')).toHaveLength(1)
    await toggleBookmark({ riwayah: 'hafs', verseKey: '2:255', surah: 2 })
    expect(await getBookmarksForRiwayah('hafs')).toHaveLength(0)
    expect(await getBookmarksForRiwayah('qaloon')).toHaveLength(1)
  })
})
```

Expected: add `tests/unit/utils/react-db-test-utils.ts` if Wave 08 did not already provide a helper; do not clear unrelated stores in production code.

- [ ] **Step 2: Implement bookmark store**

Create `src-react/continuity/bookmarks/store.ts`:

```ts
import { openReactDb } from '../../storage/db'

export type Riwayah = 'hafs' | 'warsh' | 'qaloon'
export type Bookmark = {
  riwayah: Riwayah
  verseKey: string
  surah: number
  createdAt: number
}

export async function getBookmark(riwayah: Riwayah, verseKey: string): Promise<Bookmark | undefined> {
  const db = await openReactDb()
  return db.bookmarks.get([riwayah, verseKey])
}

export async function getBookmarksForRiwayah(riwayah: Riwayah): Promise<Bookmark[]> {
  const db = await openReactDb()
  return db.bookmarks.where('riwayah').equals(riwayah).toArray()
}

export async function toggleBookmark(input: { riwayah: Riwayah; verseKey: string; surah: number }): Promise<'saved' | 'deleted'> {
  const db = await openReactDb()
  const existing = await db.bookmarks.get([input.riwayah, input.verseKey])
  if (existing) {
    await db.bookmarks.delete([input.riwayah, input.verseKey])
    return 'deleted'
  }
  await db.bookmarks.put({ ...input, createdAt: Date.now() })
  return 'saved'
}
```

Expected: store uses v7 compound key `[riwayah, verseKey]` and does not add an `id` field requirement.

- [ ] **Step 3: Implement bookmark toggle and indicator**

Create `BookmarkToggle.tsx` and `BookmarkIndicator.tsx` that read `data-token-key` from the closest verse row passed by event handlers and call `toggleBookmark({ riwayah, verseKey, surah })`.

Expected: no new React bookmark code reads legacy `data-verse-key`.

- [ ] **Step 4: Run bookmark tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-continuity/bookmarks-store.test.ts
```

Expected: tests pass.

## Task 5: Landing Pulse And Cross-Tab Coherence

**Files:**
- Create: `src-react/continuity/bookmarks/pulse.ts`
- Create: `src-react/continuity/bookmarks/sync.ts`
- Create: `src-react/components/navigation/bookmarks/BookmarkLandingPulse.tsx`
- Test: `tests/unit/react-continuity/bookmark-sync.test.ts`

- [ ] **Step 1: Write sync tests**

Create `tests/unit/react-continuity/bookmark-sync.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { BOOKMARKS_TOPIC, createBookmarkSyncMessage } from '../../src-react/continuity/bookmarks/sync'

describe('React bookmark sync', () => {
  it('uses the shared sync topic envelope', () => {
    expect(createBookmarkSyncMessage(['2:255'])).toEqual({ topic: BOOKMARKS_TOPIC, payload: { verseKeys: ['2:255'] } })
  })
})
```

Expected: fails until sync helper exists.

- [ ] **Step 2: Implement sync helper**

Create `src-react/continuity/bookmarks/sync.ts`:

```ts
export const SYNC_CHANNEL_NAME = 'quran-atlas:sync'
export const BOOKMARKS_TOPIC = 'bookmarks:changed'

export function createBookmarkSyncMessage(verseKeys: string[]) {
  return { topic: BOOKMARKS_TOPIC, payload: { verseKeys } }
}

export function broadcastBookmarkChange(verseKeys: string[]): void {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(SYNC_CHANNEL_NAME)
  try {
    channel.postMessage(createBookmarkSyncMessage(verseKeys))
  } finally {
    channel.close()
  }
}
```

Expected: cross-tab messages use the shared envelope rather than ad hoc channels.

- [ ] **Step 3: Implement landing pulse helper**

Create `src-react/continuity/bookmarks/pulse.ts`:

```ts
export function bookmarkPulseSelector(verseKey: string): string {
  return `[data-token-key="${CSS.escape(verseKey)}"]`
}

export function pulseBookmarkLanding(verseKey: string, root: ParentNode = document): boolean {
  const target = root.querySelector(bookmarkPulseSelector(verseKey))
  if (!(target instanceof HTMLElement)) return false
  target.dataset.bookmarkPulse = 'true'
  window.setTimeout(() => { delete target.dataset.bookmarkPulse }, 1000)
  return true
}
```

Expected: pulse targets the Wave 09 `data-token-key` contract.

- [ ] **Step 4: Run sync tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-continuity/bookmark-sync.test.ts
```

Expected: tests pass.

## Task 6: Router/App Integration And Registry

**Files:**
- Modify: `src-react/app/router/routes.ts`
- Modify: React app provider/bootstrap file from Wave 01.
- Modify: `src-react/design-system/registry/component-registry.json`

- [ ] **Step 1: Wire launch restore into empty hash boot**

Modify React bootstrap so empty hash calls `resolveLaunchRoute` with `onboardingComplete`, `lastSurface`, and `currentPosition`, then navigates with replace semantics.

Expected: reload after onboarding restores valid launchable surface; invalid/excluded routes fall through safely.

- [ ] **Step 2: Persist lastSurface on successful route changes**

After route mount succeeds, call `persistLastSurface(hash)`.

Expected: `#/assets`, `#/settings`, `#/onboarding`, and `#/search` are not persisted.

- [ ] **Step 3: Register bookmark components**

Add sorted registry entries for:

```text
bookmark-indicator
bookmark-landing-pulse
bookmark-toggle
```

Expected: entries reference unit/e2e proof and forbid notes/tags/review usage.

## Task 7: E2E, Docs, Verification, Commit

**Files:**
- Create: `tests/e2e/read/react-continuity.spec.js`
- Create: `tests/e2e/navigate/react-bookmarks.spec.js`
- Create: `tests/e2e/infra/react-cross-tab.spec.js`
- Modify docs if schema/doc mismatch is corrected.

- [ ] **Step 1: Add e2e proof**

Add tests for:

```text
fresh boot with onboarding incomplete routes to #/onboarding
reload restores #/m/12 or #/s/2/255 when lastSurface is valid
reload with #/assets lastSurface falls back to currentPosition
bookmark toggle is riwayah-scoped
bookmark jump lands and pulses the target verse
cross-tab bookmark update refreshes list/indicator
clear-data/version-change banner remains visible in peer tab
```

Expected: cross-tab and reload proof lives in e2e, not unit tests.

- [ ] **Step 2: Run verification**

Run:

```bash
pnpm run test:react -- tests/unit/react-continuity
pnpm run check:react
pnpm run build:react
pnpm run test:e2e:react -- tests/e2e/read/react-continuity.spec.js tests/e2e/navigate/react-bookmarks.spec.js tests/e2e/infra/react-cross-tab.spec.js --reporter=line
pnpm run docs:check
git diff --check
pnpm run check
```

Expected: continuity, cross-tab, React build, docs, whitespace, and shipped Svelte checks pass.

- [ ] **Step 3: Inspect changed files**

Run:

```bash
git diff --name-only
```

Expected: no IDB migration, Svelte runtime, generated dataset, spec, or earlier Wave plan changes unless docs were corrected to match existing code.

- [ ] **Step 4: Commit**

Run:

```bash
git add src-react tests docs
git commit -m "feat: add react continuity and bookmark parity"
```

Expected: commit succeeds. Do not push.

## Reviewer Checklist

- Verify launch restore order is onboarding, launchable lastSurface, currentPosition, `#/s/1`.
- Verify operational routes and search are excluded.
- Verify bookmark writes use `[riwayah, verseKey]` and remain reading continuity only.
- Verify same-device cross-tab sync uses shared envelope and no account/sync product claim appears.
