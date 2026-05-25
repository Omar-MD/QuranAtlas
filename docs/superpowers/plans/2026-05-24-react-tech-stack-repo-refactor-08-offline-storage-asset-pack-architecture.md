# React Tech Stack Refactor 08 - Offline Storage And Asset Pack Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define and implement the React storage, Cache Storage, service-worker isolation, and generic asset-pack contracts before reader, settings, search, or source-selection parity work starts.

**Architecture:** Add React-only storage/offline modules under `src-react/**` that mirror the existing `quran-atlas` IndexedDB v7 contract, derive pack state from generated indexes and Cache Storage, and keep app-shell/service-worker/cache behavior isolated from the shipped Svelte app. No rich pack status is persisted into existing v7 stores unless a later migration spec creates a compatible store.

**Tech Stack:** React TypeScript modules, Dexie, IndexedDB v7 compatibility, Cache Storage planning, Workbox/vite-plugin-pwa docs-gated service-worker isolation, Vitest with fake-indexeddb, Playwright only for browser/service-worker proof when needed.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/surfaces/infra.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/read.md`
- `docs/tech-stack.md`
- `package.json`
- `src/core/db/**`
- `src/configure/variant-bundle.ts`
- `src/configure/assets/asset-view-model.ts`
- `src/infra/service-worker/sw.js`
- `src/infra/sw/route-defs.ts`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-07-component-registry-agent-rules-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md`
- Wave 1 plan `01` and Wave 2 plan `07`

## Dependency Gates

This plan depends on Wave 1 plan `01` and Wave 2 plan `07`.

- React app build output must already be isolated to `dist-react/`.
- React registry and `validate:react` must already exist.
- Do not change current Svelte service-worker scope, cache names, DB schema, or deploy artifact.
- Child spec `08A` refines Mushaf page handling. This plan defines generic contracts and must not contradict the 08A edition-aware, install-on-demand Mushaf rules.

## File Structure

Create:

- `src-react/storage/schema.ts` - existing IndexedDB v7 store names and Dexie schema mirror.
- `src-react/storage/db.ts` - Dexie open/close helpers without schema upgrade beyond v7.
- `src-react/storage/types.ts` - validator-compatible record shapes used by React.
- `src-react/storage/settings-writer.ts` - atomic reader asset bundle writer facade.
- `src-react/storage/storage-errors.ts` - quota and blocked/open error helpers.
- `src-react/offline/pack-status.ts` - canonical status vocabulary.
- `src-react/offline/pack-lifecycle.ts` - transition helpers and activation guards.
- `src-react/offline/asset-index.ts` - generic asset index types and URL boundary validators.
- `src-react/offline/cache-plan.ts` - Cache Storage install-plan helpers.
- `src-react/offline/cache-names.ts` - React-specific cache-name builder.
- `src-react/offline/quota.ts` - storage-estimate helpers and quota status mapping.
- `src-react/offline/service-worker-contract.ts` - typed installer messages and events.
- `src-react/offline/ui-state.ts` - UI-facing offline state contract for registered components.
- `src-react/data/runtime-boundary.ts` - runtime URL guard for same-origin `/dataset/**`.
- `tests/unit/react-storage/db-schema.test.ts`
- `tests/unit/react-storage/pack-lifecycle.test.ts`
- `tests/unit/react-offline/asset-index.test.ts`
- `tests/unit/react-offline/cache-plan.test.ts`

Modify:

- `package.json` - add Dexie dependency and React storage check script if needed.
- `docs/tech-stack.md` - document Dexie and React offline/storage commands.
- `docs/context/repo-structure.md` - document `src-react/storage/**`, `src-react/offline/**`, and `src-react/data/**`.
- `docs/context/architecture.md`, `docs/context/data-model.md`, `docs/context/source-data-flow.md`, and `docs/context/surfaces/infra.md` only if implementation changes current documented architecture.

Do not modify:

- `src/**` Svelte runtime code
- `src/core/db/**` migrations or DB version
- existing Svelte service-worker files
- current `pnpm run build -> dist/`
- `public/dataset/**` unless a separate asset-pack data contract change is explicitly made and data gates run
- Wave plan/spec files

## Task 1: Preflight And Current Docs

**Files:**
- Read: files listed in Required Context

- [ ] **Step 1: Confirm dependencies**

Run:

```bash
test -f vite.react.config.js
test -f src-react/design-system/registry/component-registry.json
rg -n "\"validate:react\"" package.json
```

Expected: React dual-build and registry gates exist. Stop if they do not.

- [ ] **Step 2: Confirm Dexie docs appendix is present**

Run:

```bash
rg -n "Dexie|quran-atlas|version 7" docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md
```

Expected: Dexie current-doc facts are recorded and not quota-blocked.

- [ ] **Step 3: Fetch current Workbox/VitePWA docs before service-worker code**

If this execution writes React service-worker registration, VitePWA config, or Workbox strategy code, run outside Codex's default sandbox before editing:

```bash
npx ctx7@latest library Workbox "How should Workbox isolate app-shell precache, runtime Cache Storage routes, cache names, quota handling, and message-driven asset installation for a Vite PWA during a dual-build migration?"
npx ctx7@latest docs /googlechrome/workbox "How should Workbox isolate app-shell precache, runtime Cache Storage routes, cache names, quota handling, and message-driven asset installation for a Vite PWA during a dual-build migration?"
npx ctx7@latest docs /vite-pwa/vite-plugin-pwa "How should vite-plugin-pwa injectManifest configure a React-only Vite PWA service worker with isolated scope, output, and dev testing?"
```

Expected: current API details are confirmed. If implementation only adds typed contracts and no service-worker config/code, record that no Workbox API details were changed.

- [ ] **Step 4: Confirm forbidden current-state files stay untouched**

Run:

```bash
git diff --name-only -- src public/dataset docs/superpowers/plans docs/superpowers/specs
```

Expected: no output from this plan. Do not revert unrelated worker edits.

## Task 2: Dexie Dependency And IDB v7 Schema Mirror

**Files:**
- Create: `src-react/storage/schema.ts`
- Create: `src-react/storage/types.ts`
- Create: `src-react/storage/db.ts`
- Modify: `package.json`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Install Dexie**

Run:

```bash
pnpm add dexie@latest
```

Expected: `package.json` and `pnpm-lock.yaml` update for Dexie only. If install fails from sandbox DNS/network errors, rerun with approval outside the sandbox.

- [ ] **Step 2: Add storage types**

Create `src-react/storage/types.ts`:

```ts
export type SettingsKey =
  | 'onboardingComplete'
  | 'theme'
  | 'fontSize'
  | 'riwayah'
  | 'quranTextStyleId'
  | 'mushafEditionId'
  | 'currentPosition'
  | 'lastSurface'
  | 'wirdPlan'

export type SettingRecord = {
  key: SettingsKey | string
  value: unknown
}

export type Riwayah = 'hafs' | 'warsh' | 'qaloon'
export type ActivationStatus =
  | 'none'
  | 'idle'
  | 'downloading'
  | 'cached'
  | 'pending-confirmation'
  | 'applying'
  | 'failed'

export type ActivationStateRecord = {
  id: 'current'
  status: ActivationStatus
  version?: string
  progress?: number
  error?: string
  stagedAt?: number
}

export type DatasetMetaRecord = {
  id: string
  version?: string
  [key: string]: unknown
}

export type BookmarkRecord = {
  riwayah: Riwayah
  verseKey: string
  surah: number
  createdAt: number
}

export type StoreRecords = {
  settings: SettingRecord
  activationState: ActivationStateRecord
  datasetMeta: DatasetMetaRecord
  bookmarks: BookmarkRecord
}

export type StoreName = keyof StoreRecords
```

Expected: types are compatible wrappers around existing v7 shapes; they do not introduce a new store or version.

- [ ] **Step 3: Add schema mirror**

Create `src-react/storage/schema.ts`:

```ts
export const QURAN_ATLAS_DB_NAME = 'quran-atlas'
export const QURAN_ATLAS_DB_VERSION = 7

export const QURAN_ATLAS_V7_STORES = {
  settings: 'key',
  activationState: 'id',
  datasetMeta: 'id',
  bookmarks: '[riwayah+verseKey], [riwayah+surah], riwayah',
} as const

export type QuranAtlasStoreName = keyof typeof QURAN_ATLAS_V7_STORES
```

Expected: schema mirrors `src/core/db/migrations.js`: `settings` keyPath `key`, `activationState` keyPath `id`, `datasetMeta` keyPath `id`, and `bookmarks` compound keyPath `[riwayah, verseKey]` with `by-riwayah-surah` and `by-riwayah` equivalents. If docs disagree with migrations, code wins and the context docs must be corrected in this same implementation.

- [ ] **Step 4: Add Dexie open helper**

Create `src-react/storage/db.ts`:

```ts
import Dexie, { type Table } from 'dexie'
import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_DB_VERSION, QURAN_ATLAS_V7_STORES } from './schema'
import type { ActivationStateRecord, BookmarkRecord, DatasetMetaRecord, Riwayah, SettingRecord } from './types'

export class QuranAtlasReactDb extends Dexie {
  settings!: Table<SettingRecord, string>
  activationState!: Table<ActivationStateRecord, string>
  datasetMeta!: Table<DatasetMetaRecord, string>
  bookmarks!: Table<BookmarkRecord, [Riwayah, string]>

  constructor() {
    super(QURAN_ATLAS_DB_NAME)
    this.version(QURAN_ATLAS_DB_VERSION).stores(QURAN_ATLAS_V7_STORES)
  }
}

let db: QuranAtlasReactDb | undefined

export function getReactDb(): QuranAtlasReactDb {
  if (!db) db = new QuranAtlasReactDb()
  return db
}

export async function openReactDb(): Promise<QuranAtlasReactDb> {
  const instance = getReactDb()
  if (!instance.isOpen()) await instance.open()
  return instance
}

export function closeReactDb(): void {
  db?.close()
  db = undefined
}
```

Expected: React opens v7 only and does not define v8 or migration code.

- [ ] **Step 5: Document Dexie**

Update `docs/tech-stack.md` with Dexie as React-only storage during dual-build and state that React mirrors the existing `quran-atlas` v7 schema without bumping DB version.

Expected: tech-stack docs match package changes.

## Task 3: Approved Writers And Storage Errors

**Files:**
- Create: `src-react/storage/settings-writer.ts`
- Create: `src-react/storage/storage-errors.ts`

- [ ] **Step 1: Add storage error helpers**

Create `src-react/storage/storage-errors.ts`:

```ts
export type ReactStorageErrorCode = 'quota-exceeded' | 'blocked' | 'open-failed' | 'validation-failed'

export class ReactStorageError extends Error {
  constructor(
    public readonly code: ReactStorageErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'ReactStorageError'
  }
}

export function toReactStorageError(error: unknown): ReactStorageError {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new ReactStorageError('quota-exceeded', 'Browser storage quota was exceeded.', error)
  }
  if (error instanceof Error) {
    return new ReactStorageError('open-failed', error.message, error)
  }
  return new ReactStorageError('open-failed', 'Unknown storage failure.', error)
}
```

Expected: quota failures map to an explicit code for UI and lifecycle state.

- [ ] **Step 2: Add atomic asset bundle writer facade**

Create `src-react/storage/settings-writer.ts`:

```ts
import { openReactDb } from './db'
import { ReactStorageError, toReactStorageError } from './storage-errors'

export type ReaderAssetBundle = {
  riwayah: 'hafs' | 'warsh' | 'qaloon'
  quranTextStyleId: string
  mushafEditionId: string
}

const VARIANT_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-v\d+$/
const SYNC_CHANNEL_NAME = 'quran-atlas:sync'

function assertReaderAssetBundle(bundle: ReaderAssetBundle): void {
  if (bundle.riwayah !== 'hafs' && bundle.riwayah !== 'warsh' && bundle.riwayah !== 'qaloon') {
    throw new ReactStorageError('validation-failed', `Invalid riwayah: ${bundle.riwayah}`)
  }
  if (!VARIANT_ID_RE.test(bundle.quranTextStyleId)) {
    throw new ReactStorageError('validation-failed', `Invalid Quran text style id: ${bundle.quranTextStyleId}`)
  }
  if (!VARIANT_ID_RE.test(bundle.mushafEditionId)) {
    throw new ReactStorageError('validation-failed', `Invalid Mushaf edition id: ${bundle.mushafEditionId}`)
  }
}

function broadcastActiveVariantBundle(bundle: ReaderAssetBundle): void {
  if (typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(SYNC_CHANNEL_NAME)
  try {
    channel.postMessage({ topic: 'settings.riwayah', payload: bundle })
  } finally {
    channel.close()
  }
}

export async function writeReaderAssetBundle(bundle: ReaderAssetBundle): Promise<void> {
  try {
    assertReaderAssetBundle(bundle)
    const db = await openReactDb()
    await db.transaction('rw', db.settings, async () => {
      await db.settings.put({ key: 'riwayah', value: bundle.riwayah })
      await db.settings.put({ key: 'quranTextStyleId', value: bundle.quranTextStyleId })
      await db.settings.put({ key: 'mushafEditionId', value: bundle.mushafEditionId })
    })
    broadcastActiveVariantBundle(bundle)
  } catch (error) {
    if (error instanceof ReactStorageError) throw error
    throw toReactStorageError(error)
  }
}
```

Expected: the three active reader asset settings validate and change together, and the existing `settings.riwayah` BroadcastChannel topic receives the same active-bundle payload shape as the Svelte writer. This facade is the only approved React writer for these keys during dual-build. If plan `01` or a later extraction has created a framework-neutral variant-bundle writer, replace the transaction body with that writer instead of duplicating the contract.

- [ ] **Step 3: Add warning comment to prevent raw writes**

Add this file-level comment at the top of `settings-writer.ts`:

```ts
// React writes must preserve the existing QuranAtlas one-writer-per-key contract.
// Add new writers only with data-model and owning dossier updates.
```

Expected: future writer expansion is review-visible.

## Task 4: Pack Status And Lifecycle

**Files:**
- Create: `src-react/offline/pack-status.ts`
- Create: `src-react/offline/pack-lifecycle.ts`
- Create: `tests/unit/react-storage/pack-lifecycle.test.ts`

- [ ] **Step 1: Add canonical status vocabulary**

Create `src-react/offline/pack-status.ts`:

```ts
export const PACK_STATUSES = [
  'not-installed',
  'queued',
  'installing',
  'installed',
  'verifying',
  'verified',
  'active',
  'incomplete',
  'incompatible',
  'stale',
  'failed',
  'update-available',
  'storage-full',
  'unavailable-offline',
] as const

export type PackStatus = (typeof PACK_STATUSES)[number]

export function isPackStatus(value: string): value is PackStatus {
  return (PACK_STATUSES as readonly string[]).includes(value)
}
```

Expected: vocabulary matches the master and 08 specs exactly.

- [ ] **Step 2: Add lifecycle helpers**

Create `src-react/offline/pack-lifecycle.ts`:

```ts
import type { PackStatus } from './pack-status'

const allowedTransitions: Record<PackStatus, PackStatus[]> = {
  'not-installed': ['queued', 'unavailable-offline'],
  queued: ['installing', 'failed'],
  installing: ['installed', 'incomplete', 'storage-full', 'failed'],
  installed: ['verifying', 'failed'],
  verifying: ['verified', 'incomplete', 'failed'],
  verified: ['active', 'stale', 'update-available'],
  active: ['stale', 'update-available'],
  incomplete: ['queued', 'installing', 'failed'],
  incompatible: ['queued', 'not-installed'],
  stale: ['queued', 'active'],
  failed: ['queued', 'not-installed'],
  'update-available': ['queued', 'active'],
  'storage-full': ['queued', 'not-installed'],
  'unavailable-offline': ['queued', 'not-installed'],
}

export function canTransitionPackStatus(from: PackStatus, to: PackStatus): boolean {
  return allowedTransitions[from].includes(to)
}

export function assertCanActivate(status: PackStatus): void {
  if (status !== 'verified' && status !== 'active') {
    throw new Error(`Cannot activate pack from status ${status}. Pack must be verified first.`)
  }
}

export function statusForInstallFailure(errorCode: 'quota-exceeded' | 'offline' | 'interrupted' | 'fetch-failed'): PackStatus {
  if (errorCode === 'quota-exceeded') return 'storage-full'
  if (errorCode === 'offline') return 'unavailable-offline'
  if (errorCode === 'interrupted') return 'incomplete'
  return 'failed'
}
```

Expected: install, verify, and activate remain separate phases.

- [ ] **Step 3: Add lifecycle tests**

Create `tests/unit/react-storage/pack-lifecycle.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { assertCanActivate, canTransitionPackStatus, statusForInstallFailure } from '../../../src-react/offline/pack-lifecycle'
import { PACK_STATUSES } from '../../../src-react/offline/pack-status'

describe('React pack lifecycle', () => {
  it('keeps the canonical status vocabulary stable', () => {
    expect(PACK_STATUSES).toEqual([
      'not-installed',
      'queued',
      'installing',
      'installed',
      'verifying',
      'verified',
      'active',
      'incomplete',
      'incompatible',
      'stale',
      'failed',
      'update-available',
      'storage-full',
      'unavailable-offline',
    ])
  })

  it('does not allow activation before verification', () => {
    expect(() => assertCanActivate('installed')).toThrow(/verified/)
    expect(() => assertCanActivate('verified')).not.toThrow()
  })

  it('maps install failures to explicit states', () => {
    expect(statusForInstallFailure('quota-exceeded')).toBe('storage-full')
    expect(statusForInstallFailure('offline')).toBe('unavailable-offline')
    expect(statusForInstallFailure('interrupted')).toBe('incomplete')
    expect(statusForInstallFailure('fetch-failed')).toBe('failed')
  })

  it('allows the required install-before-activate path', () => {
    expect(canTransitionPackStatus('not-installed', 'queued')).toBe(true)
    expect(canTransitionPackStatus('queued', 'installing')).toBe(true)
    expect(canTransitionPackStatus('installing', 'installed')).toBe(true)
    expect(canTransitionPackStatus('installed', 'verifying')).toBe(true)
    expect(canTransitionPackStatus('verifying', 'verified')).toBe(true)
    expect(canTransitionPackStatus('verified', 'active')).toBe(true)
  })
})
```

Expected: tests lock the status vocabulary and install-before-activate model.

## Task 5: Runtime Dataset Boundary, Asset Indexes, And Cache Plans

**Files:**
- Create: `src-react/data/runtime-boundary.ts`
- Create: `src-react/offline/asset-index.ts`
- Create: `src-react/offline/cache-names.ts`
- Create: `src-react/offline/cache-plan.ts`
- Create: `src-react/offline/quota.ts`
- Create: `tests/unit/react-offline/asset-index.test.ts`
- Create: `tests/unit/react-offline/cache-plan.test.ts`

- [ ] **Step 1: Add runtime URL guard**

Create `src-react/data/runtime-boundary.ts`:

```ts
export function assertRuntimeDatasetUrl(url: string): void {
  const parsed = new URL(url, 'https://quranatlas.local')
  if (parsed.origin !== 'https://quranatlas.local') {
    throw new Error(`Runtime asset URL must be same-origin: ${url}`)
  }
  if (!parsed.pathname.startsWith('/dataset/')) {
    throw new Error(`Runtime asset URL must stay under /dataset/**: ${url}`)
  }
  if (parsed.pathname.startsWith('/data/')) {
    throw new Error(`Build-only data path is forbidden at runtime: ${url}`)
  }
}
```

Expected: React runtime code cannot plan `data/**`, catalog, normalized, taxonomy, or upstream URLs.

- [ ] **Step 2: Add generic asset index contract**

Create `src-react/offline/asset-index.ts`:

```ts
import { assertRuntimeDatasetUrl } from '../data/runtime-boundary'

export type AssetDeliveryMode = 'app-shell' | 'runtime-cache' | 'on-demand-pack'

export type AssetIndexEntry = {
  packId: string
  kind: 'quran-text' | 'translation' | 'tafsir' | 'mushaf-pages' | 'knowledge' | 'search-index'
  label: string
  version: string
  totalBytes: number
  urls: string[]
  deliveryMode: AssetDeliveryMode
  provenance: string
  available: boolean
}

export function validateAssetIndexEntry(entry: AssetIndexEntry): AssetIndexEntry {
  if (entry.totalBytes < 0) throw new Error(`${entry.packId}: totalBytes must be non-negative`)
  if (entry.deliveryMode === 'on-demand-pack' && entry.urls.length === 0) {
    throw new Error(`${entry.packId}: on-demand packs require concrete URL membership`)
  }
  for (const url of entry.urls) assertRuntimeDatasetUrl(url)
  return entry
}
```

Expected: pack planning uses generated indexes and explicit URL membership.

- [ ] **Step 3: Add React cache names**

Create `src-react/offline/cache-names.ts`:

```ts
export const REACT_CACHE_PREFIX = 'quran-atlas-react'

export function reactAppShellCacheName(version: string): string {
  return `${REACT_CACHE_PREFIX}-app-shell-${version}`
}

export function reactRuntimeCacheName(kind: string, version: string): string {
  return `${REACT_CACHE_PREFIX}-runtime-${kind}-${version}`
}

export function reactAssetPackCacheName(packId: string, version: string): string {
  return `${REACT_CACHE_PREFIX}-pack-${packId}-${version}`
}

export function isReactCacheName(cacheName: string): boolean {
  return cacheName.startsWith(`${REACT_CACHE_PREFIX}-`)
}
```

Expected: React cache names are separate from Svelte caches.

- [ ] **Step 4: Add install-plan helper**

Create `src-react/offline/cache-plan.ts`:

```ts
import type { AssetIndexEntry } from './asset-index'
import { validateAssetIndexEntry } from './asset-index'
import { reactAssetPackCacheName } from './cache-names'

export type AssetInstallPlan = {
  packId: string
  cacheName: string
  version: string
  totalBytes: number
  urls: string[]
}

export function createAssetInstallPlan(entry: AssetIndexEntry): AssetInstallPlan {
  const valid = validateAssetIndexEntry(entry)
  if (!valid.available) {
    throw new Error(`${valid.packId}: pack is not available in this environment`)
  }
  if (valid.deliveryMode !== 'on-demand-pack') {
    throw new Error(`${valid.packId}: only on-demand packs can be installed`)
  }
  return {
    packId: valid.packId,
    cacheName: reactAssetPackCacheName(valid.packId, valid.version),
    version: valid.version,
    totalBytes: valid.totalBytes,
    urls: valid.urls,
  }
}
```

Expected: runtime cache presence is not enough to create an install plan.

- [ ] **Step 5: Add quota helper**

Create `src-react/offline/quota.ts`:

```ts
export type StorageEstimateLike = {
  quota?: number
  usage?: number
}

export type QuotaPreflightResult =
  | { ok: true; remainingBytes: number | null }
  | { ok: false; reason: 'storage-full'; remainingBytes: number }
  | { ok: false; reason: 'estimate-unavailable'; remainingBytes: null }

export function preflightQuota(requiredBytes: number, estimate: StorageEstimateLike | undefined): QuotaPreflightResult {
  if (!estimate || typeof estimate.quota !== 'number' || typeof estimate.usage !== 'number') {
    return { ok: false, reason: 'estimate-unavailable', remainingBytes: null }
  }
  const remainingBytes = estimate.quota - estimate.usage
  if (remainingBytes < requiredBytes) {
    return { ok: false, reason: 'storage-full', remainingBytes }
  }
  return { ok: true, remainingBytes }
}
```

Expected: quota handling is explicit and maps to pack statuses.

- [ ] **Step 6: Add asset/cache tests**

Create tests proving:

```ts
import { describe, expect, it } from 'vitest'
import { assertRuntimeDatasetUrl } from '../../../src-react/data/runtime-boundary'
import { validateAssetIndexEntry } from '../../../src-react/offline/asset-index'
import { createAssetInstallPlan } from '../../../src-react/offline/cache-plan'
import { isReactCacheName } from '../../../src-react/offline/cache-names'

describe('React asset indexes', () => {
  it('allows only same-origin dataset URLs', () => {
    expect(() => assertRuntimeDatasetUrl('/dataset/indexes/source-assets.json')).not.toThrow()
    expect(() => assertRuntimeDatasetUrl('/data/catalog/sources.json')).toThrow(/dataset/)
    expect(() => assertRuntimeDatasetUrl('https://quran.ws/page.svg')).toThrow(/same-origin/)
  })

  it('creates on-demand install plans from explicit URL membership', () => {
    const plan = createAssetInstallPlan({
      packId: 'translation-bridges',
      kind: 'translation',
      label: 'Bridges',
      version: 'v1',
      totalBytes: 100,
      urls: ['/dataset/translations/bridges/001.json'],
      deliveryMode: 'on-demand-pack',
      provenance: 'public/dataset/indexes/source-assets.json',
      available: true,
    })
    expect(plan.cacheName).toBe('quran-atlas-react-pack-translation-bridges-v1')
    expect(isReactCacheName(plan.cacheName)).toBe(true)
  })

  it('rejects unavailable or app-shell packs for install', () => {
    expect(() => validateAssetIndexEntry({
      packId: 'bad',
      kind: 'search-index',
      label: 'Bad',
      version: 'v1',
      totalBytes: 0,
      urls: [],
      deliveryMode: 'on-demand-pack',
      provenance: 'fixture',
      available: true,
    })).toThrow(/URL membership/)
  })
})
```

Expected: tests prove runtime boundary, generated-index planning, and React cache prefix behavior.

## Task 6: Service-Worker Installer Contract And UI State

**Files:**
- Create: `src-react/offline/service-worker-contract.ts`
- Create: `src-react/offline/ui-state.ts`

- [ ] **Step 1: Add service-worker message contract**

Create `src-react/offline/service-worker-contract.ts`:

```ts
import type { PackStatus } from './pack-status'

export type AssetInstallerRequest =
  | {
      type: 'qa-react-pack-install'
      requestId: string
      packId: string
      cacheName: string
      manifestUrl: string
      version: string
      totalBytes: number
      urls: string[]
    }
  | { type: 'qa-react-pack-cancel'; requestId: string; packId: string }
  | { type: 'qa-react-pack-verify'; requestId: string; packId: string; cacheName: string; version: string; urls: string[] }
  | { type: 'qa-react-pack-purge'; requestId: string; packId: string; cacheName: string }

export type AssetInstallerEvent =
  | { type: 'qa-react-pack-progress'; requestId: string; packId: string; completedFiles: number; totalFiles: number; completedBytes: number; totalBytes: number }
  | { type: 'qa-react-pack-status'; requestId: string; packId: string; status: PackStatus }
  | { type: 'qa-react-pack-error'; requestId: string; packId: string; status: PackStatus; message: string }

export function assertInstallRequestHasMembership(request: AssetInstallerRequest): void {
  if (request.type !== 'qa-react-pack-install') return
  if (request.urls.length === 0) throw new Error(`${request.packId}: install request requires URL membership`)
  if (request.totalBytes < 0) throw new Error(`${request.packId}: install request requires a non-negative byte plan`)
}
```

Expected: the window requests installs; the service worker owns large Cache Storage writes.

- [ ] **Step 2: Add UI state contract**

Create `src-react/offline/ui-state.ts`:

```ts
import type { PackStatus } from './pack-status'

export type OfflinePackAction = 'install' | 'resume' | 'repair' | 'verify' | 'activate' | 'switch' | 'remove' | 'purge-stale'

export type OfflinePackUiState = {
  packId: string
  label: string
  status: PackStatus
  active: boolean
  byteLabel: string
  actions: OfflinePackAction[]
  message: string
}

export function actionsForPackStatus(status: PackStatus, active: boolean): OfflinePackAction[] {
  if (active && (status === 'verified' || status === 'active')) return ['switch']
  switch (status) {
    case 'not-installed':
      return ['install']
    case 'incomplete':
      return ['resume', 'repair', 'remove']
    case 'failed':
      return ['install', 'remove']
    case 'storage-full':
      return ['remove']
    case 'stale':
    case 'update-available':
      return ['install', 'purge-stale']
    case 'verified':
      return ['activate', 'remove']
    case 'unavailable-offline':
      return ['switch']
    default:
      return []
  }
}
```

Expected: offline UI consumes typed state and action vocabulary, not ad hoc labels.

## Task 7: DB Compatibility Tests

**Files:**
- Create: `tests/unit/react-storage/db-schema.test.ts`

- [ ] **Step 1: Add schema tests**

Create `tests/unit/react-storage/db-schema.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { closeReactDb, openReactDb } from '../../../src-react/storage/db'
import { QURAN_ATLAS_DB_NAME, QURAN_ATLAS_DB_VERSION, QURAN_ATLAS_V7_STORES } from '../../../src-react/storage/schema'

describe('React IndexedDB schema mirror', () => {
  afterEach(() => {
    closeReactDb()
    indexedDB.deleteDatabase(QURAN_ATLAS_DB_NAME)
  })

  it('opens the existing QuranAtlas database name at version 7', async () => {
    const db = await openReactDb()
    expect(db.name).toBe(QURAN_ATLAS_DB_NAME)
    expect(db.verno).toBe(QURAN_ATLAS_DB_VERSION)
  })

  it('declares only the existing active stores', () => {
    expect(Object.keys(QURAN_ATLAS_V7_STORES).sort()).toEqual(['activationState', 'bookmarks', 'datasetMeta', 'settings'])
    expect(QURAN_ATLAS_V7_STORES.bookmarks).toBe('[riwayah+verseKey], [riwayah+surah], riwayah')
  })
})
```

Expected: fake-indexeddb proves React opens the v7 schema mirror without adding stores.

- [ ] **Step 2: Confirm no DB migration code was added**

Run:

```bash
rg -n "version\\((8|9|10)|upgrade\\(" src-react/storage src-react/offline
```

Expected: no output. React must not bump DB version in this plan.

## Task 8: Docs And Scripts

**Files:**
- Modify: `package.json`
- Modify: `docs/tech-stack.md`
- Modify: `docs/context/repo-structure.md`
- Modify only if current state changed: `docs/context/architecture.md`, `docs/context/data-model.md`, `docs/context/source-data-flow.md`, `docs/context/surfaces/infra.md`

- [ ] **Step 1: Add React storage script**

Patch `package.json`:

```json
{
  "scripts": {
    "check:react-storage": "pnpm run test:react -- tests/unit/react-storage tests/unit/react-offline",
    "validate:react": "pnpm run check:react && pnpm run check:react-registry && pnpm run check:react-ui-patterns && pnpm run check:react-storage && pnpm run test:react && pnpm run test:storybook:react && pnpm run build:react && pnpm run docs:check"
  }
}
```

Expected: `validate:react` remains non-deploy and still targets `dist-react/`.

- [ ] **Step 2: Update docs**

Update:

- `docs/tech-stack.md`: Dexie, React storage script, Cache Storage planning, and dual-build DB compatibility.
- `docs/context/repo-structure.md`: `src-react/storage/**`, `src-react/offline/**`, and `src-react/data/**`.
- `docs/context/data-model.md`: only if React storage modules are now current-state architecture, state that React mirrors v7 and does not own schema migrations during dual-build.
- `docs/context/source-data-flow.md`: only if this plan changes asset index contracts.
- `docs/context/surfaces/infra.md`: only if service-worker/cache behavior is implemented rather than just typed.

Expected: docs remain current-state and do not claim React is shipped.

## Task 9: Verification, Commit, And Handoff

**Files:**
- Verify: all files created or modified by this plan

- [ ] **Step 1: Run targeted tests**

Run:

```bash
pnpm run check:react-storage
```

Expected: React storage/offline tests pass.

- [ ] **Step 2: Run React gates**

Run:

```bash
pnpm run check:react
pnpm run validate:react
pnpm run build:react
```

Expected: React storage code typechecks, registry checks still pass, and React builds to `dist-react/`.

- [ ] **Step 3: Run Svelte and docs safety gates**

Run:

```bash
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: shipped Svelte checks and docs checks remain clean.

- [ ] **Step 4: Run data gate only if asset indexes or dataset contracts changed**

Run when this plan modifies `public/dataset/**`, data builders, source-data docs tied to generated asset indexes, or release dataset behavior:

```bash
pnpm run data -- check
```

Expected: data/source-pack checks pass. If no such files changed, record "not run; no data contract files changed" in the implementation handoff.

- [ ] **Step 5: Review diff scope**

Run:

```bash
git diff --name-only
```

Expected: no Svelte runtime, Svelte service-worker, Svelte build/deploy, `public/dataset/**`, or Wave plan/spec files changed unless explicitly covered by a data-contract gate.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml docs/tech-stack.md docs/context/repo-structure.md docs/context/architecture.md docs/context/data-model.md docs/context/source-data-flow.md docs/context/surfaces/infra.md src-react/storage src-react/offline src-react/data tests/unit/react-storage tests/unit/react-offline
git commit -m "feat: add react offline storage contracts"
```

Expected: commit succeeds. Stage only files that exist and changed. Do not push.

## Handoff To Plan 08A

Plan `08A` must refine this generic architecture for Mushaf page packs. In particular, it must enforce edition-aware Mushaf URLs, no legacy React Mushaf paths, no Mushaf SVG bodies in `dist-react/`, service-worker-owned large pack writes, quota handling, and install-before-activate proof without widening existing v7 stores.
