# React Tech Stack Refactor 11 - Search And Index Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build React search and index parity with install-before-activate search packs, offline unavailable states, verified corpus boundaries, translation alias resolution, and golden proof.

**Architecture:** Use a project-owned JSON shard index under `/dataset/search/{packId}/...` unless a future implementer deliberately selects a library after Context7 verification. Search runtime code lives under `src-react/search/**`, UI under `src-react/components/search/**`, and React route ownership under `src-react/app/routes/search/**`; dataset build changes live under `scripts/data/search/**` and manifest/SW route definitions. Search consumes only verified same-origin assets and extends Wave 2 registry/page recipes in the same change.

**Tech Stack:** React, TypeScript, project-owned search index JSON, QuranAtlas data builders, Cache Storage pack lifecycle from Wave 08, `_verse-aliases.json`, Storybook, Vitest, Playwright React e2e.

---

## Dependencies And Sequencing

This plan runs after Wave 08, Wave 09, and Wave 10. It must finish before Wave 12 metadata search integration and Wave 13 continuity exclusion tests consume search route behavior.

## UI And Visual Proof Rule

Before implementing each search component, read `DESIGN.md`, use the Wave 2 registry, choose exactly one active reference source for that component pass, and record whether it is a committed `docs/ui-references/**` image/note or an accepted current Svelte UI state from Wave 02. Storybook and Playwright proof must cover mobile `<768`, tablet `768-1179`, desktop `>=1180`, light/sepia/dark where relevant, and awkward states such as unavailable index, offline search, no results, long snippets, Arabic directionality, focus rings, and result navigation.

## File Structure

- Create: `scripts/data/search/build.mjs` - deterministic search shard builder.
- Modify: `scripts/data/cli.mjs` - include search build only if this wave adds generated search outputs.
- Modify: `scripts/data/manifest/inventory.mjs` - inventory search files.
- Modify: `src-react/offline/search/search-pack.ts` - search install plan/status adapters.
- Create: `src-react/search/schema.ts`
- Create: `src-react/search/index-client.ts`
- Create: `src-react/search/search-engine.ts`
- Create: `src-react/search/result-aliases.ts`
- Create: `src-react/components/search/SearchPage.tsx`
- Create: `src-react/components/search/SearchBox.tsx`
- Create: `src-react/components/search/SearchResults.tsx`
- Create: `src-react/components/search/SearchIndexGate.tsx`
- Create: `src-react/components/search/search.stories.tsx`
- Create: `src-react/app/routes/search/SearchRoute.tsx`
- Create: `src-react/design-system/recipes/search-page.tsx`
- Modify: `src-react/app/router/routes.ts`
- Modify: `src-react/design-system/registry/component-registry.json`
- Modify: `src-react/infra/sw/route-defs.ts` or the React route-definition file established by Wave 08.
- Create: `docs/context/surfaces/search.md` only if a new top-level `tests/e2e/search/**` folder is created.
- Create: `tests/unit/search/react-search-engine.test.ts`
- Create: `tests/unit/search/react-search-pack.test.ts`
- Create: `tests/e2e/search/react-search.spec.js` if a search route is implemented as `#/search`.
- Modify docs for source-data flow, tech stack, repo structure, and context only when generated search outputs/scripts/routes are added.

## Task 1: Preflight, Docs, And Index Strategy

**Files:**
- Read: required docs from the spec and Wave 08/09/10 outputs.
- Read: `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`.

- [ ] **Step 1: Confirm dependency waves**

Run:

```bash
test -f src-react/offline/pack-status.ts
test -f src-react/app/routes/read/ReaderRoute.tsx
test -f src-react/components/navigation/NavDrawer.tsx
test -f src-react/design-system/registry/component-registry.json
```

Expected: all files exist. Stop if any dependency is incomplete.

- [ ] **Step 2: Record no external search dependency decision**

Run:

```bash
rg -n "minisearch|lunr|fuse|flexsearch|orama|tantivy|sqlite|opfs" package.json src-react scripts || true
```

Expected: no search/index library is already selected. This plan uses a project-owned JSON index. If implementation selects any package, run Context7 `library` then `docs` for that package before editing and update `docs/tech-stack.md`.

- [ ] **Step 3: Confirm forbidden scopes are clean**

Run:

```bash
git diff --name-only -- public/dataset docs/superpowers/specs docs/superpowers/plans
```

Expected: no generated dataset or spec/plan changes from this implementation. Generated `public/dataset/search/**` must be produced by scripts, not hand-edited.

## Task 2: Search Schema And Engine

**Files:**
- Create: `src-react/search/schema.ts`
- Create: `src-react/search/search-engine.ts`
- Create: `src-react/search/result-aliases.ts`
- Test: `tests/unit/search/react-search-engine.test.ts`

- [ ] **Step 1: Write engine tests**

Create `tests/unit/search/react-search-engine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { searchShard } from '../../../src-react/search/search-engine'
import { mapSearchResultToActiveRiwayah } from '../../../src-react/search/result-aliases'
import type { SearchShard } from '../../../src-react/search/schema'

const shard: SearchShard = {
  schemaVersion: 1,
  packId: 'baseline-v1',
  shardId: '001',
  rows: [
    { id: 'quran:1:1', lane: 'arabic', sourceRiwayah: 'qaloon', sourceRef: { surah: 1, verse: 1 }, text: 'bismillah ar-rahman', normalized: 'bismillah ar-rahman' },
    { id: 'translation:bridges:7:2', lane: 'translation', translationId: 'bridges', sourceRiwayah: 'hafs', sourceRef: { surah: 7, verse: 2 }, text: 'guidance', normalized: 'guidance' },
  ],
}

describe('React search engine', () => {
  it('returns lane, reference, snippet, and match reason', () => {
    expect(searchShard(shard, 'guidance')[0]).toMatchObject({
      lane: 'translation',
      sourceRef: { surah: 7, verse: 2 },
      matchReason: 'text',
    })
  })

  it('maps Hafs-keyed translation results through aliases for Qalun display', () => {
    const result = mapSearchResultToActiveRiwayah(
      { lane: 'translation', sourceRiwayah: 'hafs', sourceRef: { surah: 7, verse: 2 } },
      { aliases: { '7': [{ hafs: 2, warsh: [2, 3], qaloon: [2, 3] }] } },
      'qaloon',
    )
    expect(result).toEqual({ displayRef: { surah: 7, verse: 2 }, aliasRole: 'primary' })
  })
})
```

Expected: fails until schema, engine, and alias mapping exist.

- [ ] **Step 2: Add search schema**

Create `src-react/search/schema.ts`:

```ts
export type SearchLane = 'arabic' | 'translation' | 'tafsir' | 'metadata' | 'navigation'
export type SearchRef = { surah: number; verse: number }

export type SearchRow = {
  id: string
  lane: SearchLane
  sourceRiwayah: 'hafs' | 'warsh' | 'qaloon'
  sourceRef: SearchRef
  translationId?: string
  tafsirId?: string
  metadataPackId?: string
  text: string
  normalized: string
}

export type SearchShard = {
  schemaVersion: 1
  packId: string
  shardId: string
  rows: SearchRow[]
}

export type SearchResult = SearchRow & {
  snippet: string
  matchReason: 'text' | 'reference' | 'source'
}
```

Expected: schema records source lane and source reference explicitly.

- [ ] **Step 3: Add engine**

Create `src-react/search/search-engine.ts`:

```ts
import type { SearchResult, SearchShard } from './schema'

function normalizeQuery(query: string): string {
  return query.trim().normalize('NFKC').toLowerCase()
}

function makeSnippet(text: string, query: string): string {
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index < 0) return text.slice(0, 120)
  const start = Math.max(0, index - 40)
  return text.slice(start, Math.min(text.length, index + query.length + 80))
}

export function searchShard(shard: SearchShard, query: string): SearchResult[] {
  const normalized = normalizeQuery(query)
  if (!normalized) return []
  return shard.rows
    .filter((row) => row.normalized.includes(normalized) || row.text.toLowerCase().includes(normalized))
    .slice(0, 50)
    .map((row) => ({
      ...row,
      snippet: makeSnippet(row.text, query),
      matchReason: 'text' as const,
    }))
}
```

Expected: no runtime upstream fetch or uninstalled pack search occurs here.

- [ ] **Step 4: Add alias mapping**

Create `src-react/search/result-aliases.ts`:

```ts
import { resolveTranslationFor, type Riwayah, type VerseAliases } from '../data/verse-aliases'
import type { SearchRef } from './schema'

export function mapSearchResultToActiveRiwayah(
  result: { lane: string; sourceRiwayah: Riwayah; sourceRef: SearchRef },
  aliases: VerseAliases,
  activeRiwayah: Riwayah,
): { displayRef: SearchRef | null; aliasRole: string } {
  if (result.lane !== 'translation' || activeRiwayah === 'hafs') {
    return { displayRef: result.sourceRef, aliasRole: 'identity' }
  }
  const resolved = resolveTranslationFor(aliases, activeRiwayah, result.sourceRef.surah, result.sourceRef.verse)
  if (resolved.hafsVerse == null) return { displayRef: null, aliasRole: 'none' }
  return { displayRef: { surah: result.sourceRef.surah, verse: result.sourceRef.verse }, aliasRole: resolved.role }
}
```

Expected: DP-aligned surahs are covered by `_verse-aliases.json` data, not hardcoded special cases.

- [ ] **Step 5: Run engine tests**

Run:

```bash
pnpm run test:react -- tests/unit/search/react-search-engine.test.ts
```

Expected: tests pass.

## Task 3: Dataset Search Builder And Manifest Contract

**Files:**
- Create: `scripts/data/search/build.mjs`
- Modify: `scripts/data/cli.mjs`
- Modify: `scripts/data/manifest/inventory.mjs`
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Add builder smoke test command**

Run:

```bash
test -f public/dataset/surahs.json
test -f public/dataset/translations/_verse-aliases.json
test -d public/dataset/riwayat/qaloon
```

Expected: source runtime dataset inputs exist. The builder consumes only `/public/dataset/**` generated runtime files and committed normalized source files through existing builders; it does not fetch upstream.

- [ ] **Step 2: Add search builder**

Create `scripts/data/search/build.mjs` that emits:

```text
public/dataset/search/baseline-v1/manifest.json
public/dataset/search/baseline-v1/shards/001.json
...
```

The manifest shape must be:

```json
{
  "schemaVersion": 1,
  "packId": "baseline-v1",
  "version": "1",
  "deliveryMode": "install-before-activate",
  "shards": [
    { "id": "001", "url": "/dataset/search/baseline-v1/shards/001.json", "bytes": 0 }
  ],
  "lanes": ["arabic", "translation", "tafsir", "metadata", "navigation"]
}
```

Expected: generated rows include lane, source reference, source riwayah, text, normalized text, and source id where applicable.

- [ ] **Step 3: Wire builder into data CLI**

Modify `scripts/data/cli.mjs` so `pnpm run data -- build` invokes the search builder after text/knowledge outputs exist and before manifest inventory refresh.

Expected: search output is deterministic and clean-checkout tolerant.

- [ ] **Step 4: Inventory search files**

Modify `scripts/data/manifest/inventory.mjs` to include search output with lane `search` and category `search-index`.

Expected: manifest membership and byte planning can find search pack files.

- [ ] **Step 5: Run data checks**

Run:

```bash
pnpm run data -- build
pnpm run data -- check
```

Expected: generated search files are produced by scripts and data checks pass. Review generated `public/dataset/search/**`, `manifest.json`, and `provenance.json` diffs before staging.

## Task 4: Search Pack Install And Runtime Client

**Files:**
- Create: `src-react/offline/search/search-pack.ts`
- Create: `src-react/search/index-client.ts`
- Modify: React SW route definitions from Wave 08.
- Test: `tests/unit/search/react-search-pack.test.ts`

- [ ] **Step 1: Add pack tests**

Create `tests/unit/search/react-search-pack.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { planSearchPackInstall } from '../../../src-react/offline/search/search-pack'

describe('React search pack install planning', () => {
  it('plans only same-origin dataset search URLs', () => {
    const plan = planSearchPackInstall({
      packId: 'baseline-v1',
      shards: [{ id: '001', url: '/dataset/search/baseline-v1/shards/001.json', bytes: 10 }],
    })
    expect(plan.urls).toEqual(['/dataset/search/baseline-v1/shards/001.json'])
  })

  it('rejects upstream or data-directory URLs', () => {
    expect(() => planSearchPackInstall({ packId: 'bad', shards: [{ id: 'x', url: 'https://example.com/x.json', bytes: 1 }] })).toThrow(/same-origin/)
    expect(() => planSearchPackInstall({ packId: 'bad', shards: [{ id: 'x', url: '/data/search/x.json', bytes: 1 }] })).toThrow(/dataset/)
  })
})
```

Expected: fails until search pack planner exists.

- [ ] **Step 2: Implement planner**

Create `src-react/offline/search/search-pack.ts`:

```ts
export type SearchPackManifest = {
  packId: string
  shards: Array<{ id: string; url: string; bytes: number }>
}

export function planSearchPackInstall(manifest: SearchPackManifest): { packId: string; urls: string[]; totalBytes: number } {
  const urls = manifest.shards.map((shard) => {
    if (!shard.url.startsWith('/dataset/search/')) throw new Error(`Search indexes must be same-origin dataset URLs: ${shard.url}`)
    if (shard.url.includes('/../')) throw new Error(`Invalid search URL: ${shard.url}`)
    return shard.url
  })
  return {
    packId: manifest.packId,
    urls,
    totalBytes: manifest.shards.reduce((sum, shard) => sum + shard.bytes, 0),
  }
}
```

Expected: search/index packs follow install-before-activate and same-origin URL rules.

- [ ] **Step 3: Implement index client**

Create `src-react/search/index-client.ts`:

```ts
import type { SearchShard } from './schema'
import { searchShard } from './search-engine'

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Search index unavailable: ${response.status}`)
  return response.json() as Promise<T>
}

export async function loadSearchManifest(packId = 'baseline-v1') {
  return readJson<{ packId: string; shards: Array<{ id: string; url: string; bytes: number }> }>(
    `/dataset/search/${packId}/manifest.json`,
  )
}

export async function runInstalledSearch(query: string, packId = 'baseline-v1') {
  const manifest = await loadSearchManifest(packId)
  const shards = await Promise.all(manifest.shards.map((shard) => readJson<SearchShard>(shard.url)))
  return shards.flatMap((shard) => searchShard(shard, query))
}
```

Expected: missing manifest/shards bubble to explicit UI gate, not fallback search.

- [ ] **Step 4: Add SW route definition**

Add `/dataset/search/**` to the React service-worker route table with cache name prefix separate from Svelte caches and category `search-index`.

Expected: offline search works only after the pack is installed/verified.

- [ ] **Step 5: Run pack tests**

Run:

```bash
pnpm run test:react -- tests/unit/search/react-search-pack.test.ts
```

Expected: tests pass.

## Task 5: Search UI, Route, Registry, Stories

**Files:**
- Create: `src-react/components/search/SearchPage.tsx`
- Create: `src-react/components/search/SearchBox.tsx`
- Create: `src-react/components/search/SearchResults.tsx`
- Create: `src-react/components/search/SearchIndexGate.tsx`
- Create: `src-react/components/search/search.stories.tsx`
- Create: `src-react/app/routes/search/SearchRoute.tsx`
- Create: `src-react/design-system/recipes/search-page.tsx`
- Modify: `src-react/app/router/routes.ts`
- Modify: `src-react/design-system/registry/component-registry.json`

- [ ] **Step 1: Add search page recipe**

Create `src-react/design-system/recipes/search-page.tsx`:

```tsx
export function SearchPageRecipe(props: { searchBox: React.ReactNode; status: React.ReactNode; results: React.ReactNode }) {
  return (
    <section className="qar:search-page-recipe" aria-labelledby="react-search-title">
      <h1 id="react-search-title">Search</h1>
      {props.searchBox}
      <div aria-live="polite">{props.status}</div>
      {props.results}
    </section>
  )
}
```

Expected: search UI uses page recipe/registry conventions.

- [ ] **Step 2: Implement search gate**

Create `SearchIndexGate.tsx` with statuses `loading`, `ready`, `not-installed`, `stale`, `failed`, `unavailable-offline`, and buttons for Install and Manage Assets.

Expected: unavailable search index state is explicit and actionable.

- [ ] **Step 3: Implement SearchBox and SearchResults**

`SearchBox` must have a labelled input, clear button, and submit. `SearchResults` must render lane, reference, snippet, source, and navigate callback to reader routes.

Expected: Arabic snippets preserve `dir="auto"` and result rows are keyboard reachable.

- [ ] **Step 4: Register route**

Add:

```ts
{ pattern: '#/search', name: 'search', component: SearchRoute, launchable: false }
```

Expected: Wave 13 can exclude `#/search` from launch restore unless product docs later approve it as launchable.

- [ ] **Step 5: Extend registry and stories**

Add sorted registry entries for:

```text
search-box
search-index-gate
search-page
search-page-recipe
search-results
```

Stories cover default, loading, unavailable-index, no-results, populated results, offline, mobile, tablet, desktop, light, sepia, and dark.

Expected: registry validator and Storybook pass.

- [ ] **Step 6: Run registry and Storybook checks**

Run:

```bash
pnpm run check:react-registry
pnpm run test:storybook:react
```

Expected: search registry entries are valid and Search stories render without accessibility regressions.

## Task 6: E2E, Docs, Verification, Commit

**Files:**
- Create: `docs/context/surfaces/search.md` if `tests/e2e/search/**` is created.
- Create: `tests/e2e/search/react-search.spec.js`
- Modify: docs for source-data/runtime/search route changes.

- [ ] **Step 1: Add search surface dossier if needed**

If creating `tests/e2e/search/react-search.spec.js`, create `docs/context/surfaces/search.md` with frontmatter:

```yaml
---
surface: search
src_paths:
  - 'src-react/search/**'
  - 'src-react/components/search/**'
test_paths:
  unit:
    - 'tests/unit/search/**'
  e2e:
    - 'tests/e2e/search/*.spec.js'
style_paths: []
---
```

Expected: e2e top-level folder has a surface dossier.

- [ ] **Step 2: Add e2e tests**

Create `tests/e2e/search/react-search.spec.js` covering:

```text
uninstalled search index shows install/manage-assets state
installed search index returns result rows
translation result navigates through active-riwayah alias mapping
offline without installed index shows unavailable-offline
no-results state is announced
```

Expected: browser-only proof targets React via `pnpm run test:e2e:react`.

- [ ] **Step 3: Run verification**

Run:

```bash
pnpm run test:react -- tests/unit/search
pnpm run data -- check
pnpm run check:react
pnpm run check:react-registry
pnpm run test:storybook:react
pnpm run build:react
pnpm run test:e2e:react -- tests/e2e/search/react-search.spec.js --reporter=line
pnpm run docs:check
git diff --check
pnpm run check
```

Expected: search, data, React, docs, whitespace, and shipped Svelte checks pass.

- [ ] **Step 4: Inspect changed files**

Run:

```bash
git diff --name-only
```

Expected: generated dataset changes appear only from `pnpm run data -- build`; no hand-edited generated files, Svelte runtime, removed-scope branches, specs, or earlier plans changed.

- [ ] **Step 5: Commit**

Run:

```bash
git add scripts src-react tests docs public/dataset package.json pnpm-lock.yaml
git commit -m "feat: add react search index parity"
```

Expected: commit succeeds. Stage generated dataset files only if produced by the builder and reviewed. Do not push.

## Reviewer Checklist

- Verify search cannot run against missing or unverified index packs.
- Verify translation results use `_verse-aliases.json` for Warsh/Qalun display/navigation.
- Verify `/dataset/search/**` URL schema is documented and inventoried.
- Verify `#/search` is launch-restore excluded unless docs/tests explicitly promote it.
