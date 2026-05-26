# React Tech Stack Refactor 08A - Mushaf Install-On-Demand Asset Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the React offline architecture for Mushaf page packs so React ships no Mushaf SVG bodies in its app artifact, supports edition-aware paths only, and installs verified page packs on demand through a service-worker-owned protocol.

**Architecture:** Build React-only Mushaf pack contracts, validators, fixture indexes, asset-output checks, and installer protocol tests on top of plan `08`. The shipped Svelte app and its legacy compatibility paths remain untouched until later migration/removal specs.

**Tech Stack:** React TypeScript modules, Cache Storage install-plan contracts, Workbox/vite-plugin-pwa docs-gated service-worker protocol, Node.js asset scanners, Vitest, optional Playwright offline proof, existing QuranAtlas data gates.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/product-info.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/infra.md`
- `docs/tech-stack.md`
- `package.json`
- `src-react/offline/**`
- `src-react/storage/**`
- `src-react/data/runtime-boundary.ts`
- `public/dataset/indexes/mushaf-assets.json` if present
- `scripts/data/mushaf-pages/**`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08-offline-storage-asset-pack-architecture-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08a-mushaf-install-on-demand-asset-strategy-spec.md`
- Wave 1 plan `01` and Wave 2 plan `08`

## Dependency Gates

This plan refines plan `08` and depends on it.

- Plan `08` must have created generic pack status, Cache Storage planning, runtime URL guards, service-worker message contracts, and React storage boundaries.
- Do not contradict plan `08`: install, verify, and activate remain separate; rich statuses are not persisted into existing v7 stores.
- React Mushaf supports only edition-aware paths.
- Current Svelte legacy paths and compatibility outputs remain current-state until a separate migration/removal spec owns deletion.

## File Structure

Create:

- `src-react/packs/mushaf-paths.ts` - edition-aware Mushaf URL and legacy-path rejection helpers.
- `src-react/packs/mushaf-index.ts` - Mushaf asset index contract.
- `src-react/packs/mushaf-install-plan.ts` - install-plan builder from indexes.
- `src-react/packs/mushaf-cache.ts` - edition-aware React cache-name builder.
- `src-react/packs/mushaf-fixtures.ts` - tiny fixture pack index for tests and Storybook.
- `src-react/offline/mushaf-service-worker-protocol.ts` - Mushaf-specific installer request helpers.
- `scripts/check-react-mushaf-assets.mjs` - static checker for React legacy paths and SVG bodies in `dist-react/`.
- `scripts/check-react-mushaf-indexes.mjs` - release/index checker for edition-aware manifests and page URLs.
- `tests/unit/react-packs/mushaf-paths.test.ts`
- `tests/unit/react-packs/mushaf-install-plan.test.ts`
- `tests/unit/react-packs/check-react-mushaf-assets.test.mjs`
- `tests/unit/react-packs/check-react-mushaf-indexes.test.mjs`
- optional: `tests/e2e/infra/react-mushaf-offline.spec.ts` only after React service-worker installer code exists.

Modify:

- `package.json` - add `check:react-mushaf-assets` and wire it into `validate:react`.
- `docs/tech-stack.md` - document React Mushaf asset checks.
- `docs/context/source-data-flow.md` - document React's edition-aware-only install-on-demand contract if current-state React asset contracts now exist.
- `docs/context/surfaces/read.md`, `docs/context/surfaces/configure.md`, and `docs/context/surfaces/infra.md` only if UI/service-worker behavior is implemented now.
- React Vite/VitePWA config only to preserve React app-shell public asset isolation.

Do not modify:

- existing Svelte app behavior
- existing Svelte service worker or cache names
- shared Svelte legacy Mushaf routes or generated compatibility output
- production deploy routing
- `public/dataset/**` by hand
- Wave plan/spec files

## Task 1: Preflight And Docs

**Files:**
- Read: files listed in Required Context

- [ ] **Step 1: Confirm plan 08 outputs exist**

Run:

```bash
test -f src-react/offline/pack-status.ts
test -f src-react/offline/cache-plan.ts
test -f src-react/offline/service-worker-contract.ts
test -f src-react/data/runtime-boundary.ts
```

Expected: generic offline contracts exist. Stop if plan `08` is incomplete.

- [ ] **Step 2: Verify Workbox/VitePWA docs before writing service-worker code**

If this execution writes or changes React service-worker implementation, VitePWA config, or Workbox strategy options, run outside Codex's default sandbox:

```bash
npx ctx7@latest library Workbox "What is the recommended Workbox pattern for a Vite PWA using injectManifest, app-shell precaching, runtime caching, service-worker-owned on-demand asset pack installation, Cache Storage verification, and quota handling?"
npx ctx7@latest docs /googlechrome/workbox "What is the recommended Workbox pattern for a Vite PWA using injectManifest, app-shell precaching, runtime caching, service-worker-owned on-demand asset pack installation, Cache Storage verification, and quota handling?"
npx ctx7@latest docs /vite-pwa/vite-plugin-pwa "How does vite-plugin-pwa injectManifest configure a custom React Vite service worker without copying large public assets into the app shell?"
```

Expected: current APIs are confirmed. If this plan adds only typed contracts and static checks, do not fetch more docs.

- [ ] **Step 3: Confirm React public asset isolation from plan 01**

Run:

```bash
rg -n "publicDir|dist-react|src-react/public" vite.react.config.js docs/tech-stack.md
```

Expected: React Vite config does not use root `public/` as an unfiltered `publicDir`.

## Task 2: Mushaf Path, Index, And Cache Contracts

**Files:**
- Create: `src-react/packs/mushaf-paths.ts`
- Create: `src-react/packs/mushaf-index.ts`
- Create: `src-react/packs/mushaf-cache.ts`
- Create: `tests/unit/react-packs/mushaf-paths.test.ts`

- [ ] **Step 1: Add edition-aware path helpers**

Create `src-react/packs/mushaf-paths.ts`:

```ts
export const MUSHAF_PAGE_COUNT = 604

export type MushafPackIdentity = {
  riwayah: string
  mushafEditionId: string
}

export function mushafManifestUrl({ riwayah, mushafEditionId }: MushafPackIdentity): string {
  return `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/manifest.json`
}

export function mushafPageUrl({ riwayah, mushafEditionId }: MushafPackIdentity, page: number): string {
  if (!Number.isInteger(page) || page < 1 || page > MUSHAF_PAGE_COUNT) {
    throw new Error(`Invalid Mushaf page number: ${page}`)
  }
  return `/dataset/mushaf-pages/${riwayah}/${mushafEditionId}/pages/${String(page).padStart(3, '0')}.svg`
}

function mushafPathname(url: string): string {
  return new URL(url, 'https://quranatlas.local').pathname
}

export function isLegacyMushafPageUrl(url: string): boolean {
  return /^\/dataset\/mushaf-pages\/[^/]+\/(?:manifest\.json|pages\/\d{3}\.svg)$/.test(mushafPathname(url))
}

export function assertReactMushafUrl(url: string): void {
  if (isLegacyMushafPageUrl(url)) {
    throw new Error(`React Mushaf paths must be edition-aware: ${url}`)
  }
  if (!/^\/dataset\/mushaf-pages\/[^/]+\/[^/]+\/(?:manifest\.json|pages\/\d{3}\.svg)$/.test(mushafPathname(url))) {
    throw new Error(`Invalid React Mushaf URL: ${url}`)
  }
}
```

Expected: React accepts only `/dataset/mushaf-pages/{riwayah}/{mushafEditionId}/...`.

- [ ] **Step 2: Add Mushaf index contract**

Create `src-react/packs/mushaf-index.ts`:

```ts
import { assertReactMushafUrl, type MushafPackIdentity } from './mushaf-paths'

export type MushafAssetIndexEntry = MushafPackIdentity & {
  packId: string
  label: string
  manifestUrl: string
  pageCount: number
  totalBytes: number
  version: string
  provenance: string
  pageUrlTemplate?: string
  pageUrls?: string[]
  integrity?: Record<string, string>
  deliveryMode: 'on-demand-pack'
  availability: 'available' | 'unavailable' | 'not-built'
}

export function validateMushafAssetIndexEntry(entry: MushafAssetIndexEntry): MushafAssetIndexEntry {
  if (entry.deliveryMode !== 'on-demand-pack') throw new Error(`${entry.packId}: Mushaf pages are on-demand packs`)
  if (entry.pageCount !== 604) throw new Error(`${entry.packId}: expected 604 pages`)
  if (entry.totalBytes < 0) throw new Error(`${entry.packId}: totalBytes must be non-negative`)
  assertReactMushafUrl(entry.manifestUrl)
  for (const url of entry.pageUrls ?? []) assertReactMushafUrl(url)
  if (!entry.pageUrls?.length && !entry.pageUrlTemplate) {
    throw new Error(`${entry.packId}: index requires page URLs or a deterministic page URL template`)
  }
  if (entry.pageUrlTemplate) {
    assertReactMushafUrl(entry.pageUrlTemplate.replace('{page}', '001'))
  }
  return entry
}
```

Expected: index entries distinguish availability, installation, and activation.

- [ ] **Step 3: Add edition-aware cache names**

Create `src-react/packs/mushaf-cache.ts`:

```ts
import { REACT_CACHE_PREFIX } from '../offline/cache-names'
import type { MushafPackIdentity } from './mushaf-paths'

export function reactMushafPackCacheName(identity: MushafPackIdentity & { version: string }): string {
  return `${REACT_CACHE_PREFIX}-mushaf-pages-${identity.riwayah}--${identity.mushafEditionId}--${identity.version}`
}

export function assertReactMushafCacheName(cacheName: string): void {
  const escapedPrefix = REACT_CACHE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!new RegExp(`^${escapedPrefix}-mushaf-pages-(hafs|warsh|qaloon)--[a-z0-9]+(?:-[a-z0-9]+)*-v\\d+--[a-z0-9]+(?:-[a-z0-9]+)*$`).test(cacheName)) {
    throw new Error(`React Mushaf cache names must include riwayah, edition, and version: ${cacheName}`)
  }
}
```

Expected: React Mushaf caches cannot omit edition id.

- [ ] **Step 4: Add path/cache tests**

Create `tests/unit/react-packs/mushaf-paths.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { assertReactMushafCacheName, reactMushafPackCacheName } from '../../../src-react/packs/mushaf-cache'
import { assertReactMushafUrl, isLegacyMushafPageUrl, mushafManifestUrl, mushafPageUrl } from '../../../src-react/packs/mushaf-paths'

describe('React Mushaf paths', () => {
  it('builds edition-aware manifest and page URLs', () => {
    const identity = { riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1' }
    expect(mushafManifestUrl(identity)).toBe('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json')
    expect(mushafPageUrl(identity, 1)).toBe('/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg')
  })

  it('rejects legacy React Mushaf URLs', () => {
    expect(isLegacyMushafPageUrl('/dataset/mushaf-pages/qaloon/manifest.json')).toBe(true)
    expect(() => assertReactMushafUrl('/dataset/mushaf-pages/qaloon/pages/001.svg')).toThrow(/edition-aware/)
  })

  it('requires edition-aware cache names', () => {
    const cacheName = reactMushafPackCacheName({ riwayah: 'qaloon', mushafEditionId: 'qalun-quran-ws-v1', version: 'v1' })
    expect(cacheName).toBe('quran-atlas-react-mushaf-pages-qaloon--qalun-quran-ws-v1--v1')
    expect(() => assertReactMushafCacheName('quran-atlas-react-mushaf-pages-qaloon-v1')).toThrow(/edition/)
  })
})
```

Expected: tests lock the React-only path contract.

## Task 3: Install Plans And Fixture Packs

**Files:**
- Create: `src-react/packs/mushaf-install-plan.ts`
- Create: `src-react/packs/mushaf-fixtures.ts`
- Create: `src-react/offline/mushaf-service-worker-protocol.ts`
- Create: `tests/unit/react-packs/mushaf-install-plan.test.ts`

- [ ] **Step 1: Add install-plan builder**

Create `src-react/packs/mushaf-install-plan.ts`:

```ts
import type { AssetInstallPlan } from '../offline/cache-plan'
import { reactMushafPackCacheName } from './mushaf-cache'
import { MUSHAF_PAGE_COUNT, mushafPageUrl } from './mushaf-paths'
import { validateMushafAssetIndexEntry, type MushafAssetIndexEntry } from './mushaf-index'

export function createMushafInstallPlan(entry: MushafAssetIndexEntry): AssetInstallPlan {
  const valid = validateMushafAssetIndexEntry(entry)
  if (valid.availability !== 'available') {
    throw new Error(`${valid.packId}: Mushaf pack is not available for install`)
  }
  const urls = valid.pageUrls ?? Array.from({ length: MUSHAF_PAGE_COUNT }, (_, index) =>
    valid.pageUrlTemplate
      ? valid.pageUrlTemplate.replace('{page}', String(index + 1).padStart(3, '0'))
      : mushafPageUrl(valid, index + 1),
  )
  for (const url of urls) {
    if (url.includes('/dataset/mushaf-pages/') && !url.includes(`/${valid.mushafEditionId}/`)) {
      throw new Error(`${valid.packId}: URL is missing Mushaf edition id: ${url}`)
    }
  }
  return {
    packId: valid.packId,
    cacheName: reactMushafPackCacheName({ riwayah: valid.riwayah, mushafEditionId: valid.mushafEditionId, version: valid.version }),
    version: valid.version,
    totalBytes: valid.totalBytes,
    urls,
  }
}
```

Expected: install plans come from indexes, not filesystem scans.

- [ ] **Step 2: Add tiny fixture pack**

Create `src-react/packs/mushaf-fixtures.ts`:

```ts
import type { MushafAssetIndexEntry } from './mushaf-index'

export const TINY_QALOON_MUSHAF_FIXTURE: MushafAssetIndexEntry = {
  packId: 'mushaf-pages-qaloon-qalun-quran-ws-v1-fixture',
  riwayah: 'qaloon',
  mushafEditionId: 'qalun-quran-ws-v1',
  label: 'Qalun fixture Mushaf pages',
  manifestUrl: '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
  pageCount: 604,
  totalBytes: 2048,
  version: 'fixture-v1',
  provenance: 'src-react/packs/mushaf-fixtures.ts',
  pageUrls: [
    '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg',
    '/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/002.svg'
  ],
  deliveryMode: 'on-demand-pack',
  availability: 'available'
}
```

Expected: unit/Storybook development can use tiny fixtures without full page packs.

- [ ] **Step 3: Add Mushaf installer request helper**

Create `src-react/offline/mushaf-service-worker-protocol.ts`:

```ts
import type { AssetInstallerRequest } from './service-worker-contract'
import { assertInstallRequestHasMembership } from './service-worker-contract'
import type { AssetInstallPlan } from './cache-plan'

export function createMushafInstallRequest(requestId: string, manifestUrl: string, plan: AssetInstallPlan): AssetInstallerRequest {
  const request: AssetInstallerRequest = {
    type: 'qa-react-pack-install',
    requestId,
    packId: plan.packId,
    cacheName: plan.cacheName,
    manifestUrl,
    version: plan.version,
    totalBytes: plan.totalBytes,
    urls: plan.urls,
  }
  assertInstallRequestHasMembership(request)
  return request
}
```

Expected: the window sends typed install requests; service worker performs Cache Storage writes.

- [ ] **Step 4: Add install-plan tests**

Create `tests/unit/react-packs/mushaf-install-plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createMushafInstallRequest } from '../../../src-react/offline/mushaf-service-worker-protocol'
import { TINY_QALOON_MUSHAF_FIXTURE } from '../../../src-react/packs/mushaf-fixtures'
import { createMushafInstallPlan } from '../../../src-react/packs/mushaf-install-plan'

describe('React Mushaf install plans', () => {
  it('creates service-worker-owned install requests from fixture indexes', () => {
    const plan = createMushafInstallPlan(TINY_QALOON_MUSHAF_FIXTURE)
    const request = createMushafInstallRequest('req-1', TINY_QALOON_MUSHAF_FIXTURE.manifestUrl, plan)

    expect(request.type).toBe('qa-react-pack-install')
    expect(request.urls).toEqual(TINY_QALOON_MUSHAF_FIXTURE.pageUrls)
    expect(request.cacheName).toContain('qalun-quran-ws-v1')
  })

  it('does not treat unavailable packs as installable', () => {
    expect(() => createMushafInstallPlan({ ...TINY_QALOON_MUSHAF_FIXTURE, availability: 'not-built' })).toThrow(/not available/)
  })
})
```

Expected: install plans preserve index-driven, service-worker-owned installation.

## Task 4: React Artifact And Legacy-Path Static Checks

**Files:**
- Create: `scripts/check-react-mushaf-assets.mjs`
- Create: `tests/unit/react-packs/check-react-mushaf-assets.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add React artifact/static checker**

Create `scripts/check-react-mushaf-assets.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const legacyPathPattern = /\/dataset\/mushaf-pages\/[^/\s"']+\/(?:manifest\.json|pages\/\d{3}\.svg)/
const svgBodyPattern = /<svg[\s>][\s\S]{0,500}?(?:quran|mushaf|page)/i

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(fullPath))
    else files.push(fullPath)
  }
  return files
}

export function findReactMushafAssetViolations(root = repoRoot) {
  const violations = []
  const sourceFiles = walkFiles(path.join(root, 'src-react')).filter((file) => /\.(ts|tsx|js|jsx|json)$/.test(file))
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, 'utf8')
    if (legacyPathPattern.test(text)) violations.push(`${path.relative(root, file)}: legacy Mushaf path`)
  }

  const distFiles = walkFiles(path.join(root, 'dist-react'))
  for (const file of distFiles) {
    const relative = path.relative(root, file)
    if (/dist-react\/dataset\/mushaf-pages\/.+\.svg$/.test(relative)) {
      violations.push(`${relative}: Mushaf SVG copied into React artifact`)
      continue
    }
    if (/\.(html|js|css|json|svg)$/.test(file)) {
      const text = fs.readFileSync(file, 'utf8')
      if (legacyPathPattern.test(text)) violations.push(`${relative}: legacy Mushaf path in React artifact`)
      if (relative.endsWith('.svg') && svgBodyPattern.test(text)) violations.push(`${relative}: possible Mushaf SVG body in React artifact`)
    }
  }
  return violations.sort()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const violations = findReactMushafAssetViolations()
  if (violations.length > 0) {
    console.error(violations.join('\n'))
    process.exit(1)
  }
}
```

Expected: checker blocks React legacy paths and Mushaf SVG bodies in `dist-react/`, without scanning or deleting Svelte `public/dataset/**`.

- [ ] **Step 2: Add checker tests**

Create `tests/unit/react-packs/check-react-mushaf-assets.test.mjs` with fixtures that:

- pass when `src-react` contains edition-aware paths only;
- fail when `src-react` contains `/dataset/mushaf-pages/qaloon/pages/001.svg`;
- fail when `dist-react/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/001.svg` exists.

Expected: static checker protects both source contracts and built React artifact.

- [ ] **Step 3: Add script**

Patch `package.json`:

```json
{
  "scripts": {
    "check:react-mushaf-assets": "node scripts/check-react-mushaf-assets.mjs",
    "validate:react": "pnpm run check:react && pnpm run check:react-registry && pnpm run check:react-ui-patterns && pnpm run check:react-storage && pnpm run check:react-mushaf-assets && pnpm run test:react && pnpm run test:storybook:react && pnpm run build:react && pnpm run check:react-mushaf-assets && pnpm run docs:check"
  }
}
```

Expected: `check:react-mushaf-assets` runs before and after `build:react` inside `validate:react`.

## Task 5: Release Asset-Pack Index Checker

**Files:**
- Create: `scripts/check-react-mushaf-indexes.mjs`
- Create: `tests/unit/react-packs/check-react-mushaf-indexes.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add index checker**

Create `scripts/check-react-mushaf-indexes.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultIndex = 'public/dataset/indexes/mushaf-assets.json'
const editionAware = /^\/?dataset\/mushaf-pages\/[^/]+\/[^/]+\/(?:manifest\.json|pages\/\d{3}\.svg)$/
const legacy = /^\/?dataset\/mushaf-pages\/[^/]+\/(?:manifest\.json|pages\/\d{3}\.svg)$/

function pathnameForIndexUrl(url) {
  return new URL(url, 'https://quranatlas.local').pathname
}

export function validateReactMushafIndex(root = repoRoot, relativePath = defaultIndex) {
  const fullPath = path.join(root, relativePath)
  if (!fs.existsSync(fullPath)) return []
  const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  const entries = Array.isArray(json) ? json : json.assets ?? json.packs ?? json.entries ?? []
  const errors = []
  for (const entry of entries) {
    const label = entry.packId ?? entry.id ?? ([entry.riwayah, entry.mushafEditionId].filter(Boolean).join('/') || 'unknown')
    const fileUrls = Array.isArray(entry.files) ? entry.files.map((file) => file.url).filter(Boolean) : []
    const urls = [entry.manifestUrl, ...(entry.pageUrls ?? []), ...fileUrls].filter(Boolean)
    for (const url of urls) {
      const pathname = pathnameForIndexUrl(url)
      if (legacy.test(pathname)) errors.push(`${label}: legacy URL ${url}`)
      if (pathname.includes('/mushaf-pages/') && !editionAware.test(pathname)) errors.push(`${label}: non-edition-aware URL ${url}`)
    }
    if (entry.deliveryMode && entry.deliveryMode !== 'on-demand-pack') {
      errors.push(`${label}: Mushaf deliveryMode must be on-demand-pack`)
    }
  }
  return errors
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validateReactMushafIndex()
  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exit(1)
  }
}
```

Expected: checker validates generated indexes when present and is clean-checkout tolerant when page-pack index output is absent.

- [ ] **Step 2: Add index checker tests**

Create `tests/unit/react-packs/check-react-mushaf-indexes.test.mjs` with fixtures for valid edition-aware entries and invalid legacy entries.

Expected: release-index checker fails on React-incompatible Mushaf URLs.

- [ ] **Step 3: Add optional release index script**

Patch `package.json`:

```json
{
  "scripts": {
    "check:react-mushaf-indexes": "node scripts/check-react-mushaf-indexes.mjs"
  }
}
```

Expected: future release/data gates can run the index check explicitly.

## Task 6: React App-Shell Proof

**Files:**
- Verify: `vite.react.config.js`
- Verify: `dist-react/**`

- [ ] **Step 1: Build React app shell**

Run:

```bash
pnpm run build:react
pnpm run check:react-mushaf-assets
```

Expected: React build succeeds and `check:react-mushaf-assets` prints no violations. `dist-react/` contains no `dataset/mushaf-pages/**` SVG bodies.

- [ ] **Step 2: Prove ordinary React development avoids page count scaling**

Run:

```bash
rg -n "readdir|glob|mushaf-pages" src-react vite.react.config.js .storybook scripts/check-react-mushaf-assets.mjs
```

Expected: no runtime/dev-server code enumerates all Mushaf SVG page bodies. Static check scripts may mention `mushaf-pages`.

## Task 7: Optional Browser Proof After Installer Exists

**Files:**
- Create only after React service-worker installer implementation exists: `tests/e2e/infra/react-mushaf-offline.spec.ts`

- [ ] **Step 1: Add e2e only when browser-only behavior exists**

If the React service-worker installer is implemented in this execution, add a Playwright spec under `tests/e2e/infra/` that proves:

- React app shell loads without Mushaf SVG bodies in `dist-react/`.
- a tiny fixture Mushaf pack appears installable from the index;
- service worker receives a `qa-react-pack-install` request;
- interrupted install reports `incomplete`;
- quota failure reports `storage-full`;
- offline uninstalled pack reports `unavailable-offline`;
- legacy page URLs do not succeed through React install plans.

Expected: use `PLAYWRIGHT_USE_PREVIEW=1` or a React preview config only when a real service worker is required. Do not add e2e for pure type/helper behavior.

## Task 8: Docs Updates

**Files:**
- Modify: `docs/tech-stack.md`
- Modify as applicable: `docs/context/source-data-flow.md`, `docs/context/surfaces/read.md`, `docs/context/surfaces/configure.md`, `docs/context/surfaces/infra.md`

- [ ] **Step 1: Update tech-stack docs**

Document:

- `check:react-mushaf-assets`;
- `check:react-mushaf-indexes`;
- React app artifact excludes Mushaf SVG bodies;
- Mushaf page packs are same-origin, edition-aware, install-on-demand assets;
- checks are React-only during dual-build.

Expected: package/script changes are documented in the same change.

- [ ] **Step 2: Update source-data and surface docs only for current behavior**

If this plan creates current React asset contracts, update:

- `docs/context/source-data-flow.md`: React consumes edition-aware Mushaf indexes and no legacy React paths.
- `docs/context/surfaces/read.md`: React reader must block missing active Mushaf packs and not silently fall back.
- `docs/context/surfaces/configure.md`: React source/storage settings activate only verified packs.
- `docs/context/surfaces/infra.md`: React service-worker installer owns large Cache Storage writes if implemented.

Expected: docs distinguish current Svelte compatibility from React-only future contracts.

## Task 9: Verification, Commit, And Handoff

**Files:**
- Verify: all files created or modified by this plan

- [ ] **Step 1: Run targeted unit tests**

Run:

```bash
pnpm run test:react -- tests/unit/react-packs
```

Expected: Mushaf path, install-plan, asset checker, and index checker tests pass.

- [ ] **Step 2: Run React asset gates**

Run:

```bash
pnpm run build:react
pnpm run check:react-mushaf-assets
pnpm run check:react-mushaf-indexes
pnpm run validate:react
```

Expected: React app artifact has no Mushaf SVG bodies or legacy React paths, and React validation remains non-deploy.

- [ ] **Step 3: Run data gates only if generated indexes, builders, source-data flow, or release page pack behavior changed**

Run when applicable:

```bash
pnpm run data -- check
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
```

Expected: data checks and strict baseline page-pack build pass. If no dataset builders or generated outputs changed, record "not run; no data files changed" in the implementation handoff.

- [ ] **Step 4: Run docs and Svelte safety checks**

Run:

```bash
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: current shipped Svelte static checks and docs checks remain clean.

- [ ] **Step 5: Review diff scope**

Run:

```bash
git diff --name-only
```

Expected: no Svelte runtime, Svelte service-worker, production deploy, hand-edited `public/dataset/**`, or Wave plan/spec files changed.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml docs/tech-stack.md docs/context/source-data-flow.md docs/context/surfaces/read.md docs/context/surfaces/configure.md docs/context/surfaces/infra.md src-react/packs src-react/offline/mushaf-service-worker-protocol.ts scripts/check-react-mushaf-assets.mjs scripts/check-react-mushaf-indexes.mjs tests/unit/react-packs tests/e2e/infra/react-mushaf-offline.spec.ts
git commit -m "feat: enforce react mushaf on-demand packs"
```

Expected: commit succeeds. Stage only files that exist and changed. Do not push.

## Handoff To Later Specs

Child spec `09` must build the React Mushaf reader against these contracts: edition-aware URLs only, service-worker-owned installation, verified pack activation, and no silent fallback to legacy paths or opportunistic runtime cache. Child spec `16` must prove the split between the React app artifact and same-origin asset-pack publish root before cutover. Child spec `18` may remove Svelte legacy asset code only after production has flipped and a post-flip cleanup gate approves removal.
