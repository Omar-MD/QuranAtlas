# React Tech Stack Refactor 12 - Curated Metadata Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build React curated metadata parity for approved reader-attached lanes without crossing dataset boundaries or reviving personal annotation/review scope.

**Architecture:** Consume existing `/dataset/knowledge/**`, tafsir, and navigation metadata through `src-react/metadata/**`, render quiet reader-attached components under `src-react/components/reader/metadata/**`, and extend Wave 11 search hooks only for verified metadata packs. Missing metadata never blocks base Quran text rendering.

**Tech Stack:** React, TypeScript, QuranAtlas runtime dataset outputs, Wave 09 reader slots, Wave 11 search extension points, Storybook, Vitest, Playwright React e2e where browser proof is needed.

---

## Dependencies And Sequencing

This plan runs after Wave 08, Wave 09, and Wave 11. It must not invent new metadata product lanes unless product/source docs promote them in the same change.

## UI And Visual Proof Rule

Before implementing each metadata component, read `DESIGN.md`, use the Wave 2 registry, choose exactly one active reference source for that component pass, and record whether it is a committed `docs/ui-references/**` image/note or an accepted current Svelte UI state from Wave 02. Storybook and Playwright proof must cover mobile `<768`, tablet `768-1179`, desktop `>=1180`, light/sepia/dark where relevant, and awkward states such as empty metadata, unavailable metadata, long passage summaries, dense ayah content, and focus rings.

## File Structure

- Create: `src-react/metadata/knowledge.ts`
- Create: `src-react/metadata/metadata-state.ts`
- Create: `src-react/metadata/search-adapter.ts`
- Create: `src-react/components/reader/metadata/MetadataLane.tsx`
- Create: `src-react/components/reader/metadata/ThemeChips.tsx`
- Create: `src-react/components/reader/metadata/PassageContext.tsx`
- Create: `src-react/components/reader/metadata/MetadataUnavailable.tsx`
- Create: `src-react/components/reader/metadata/metadata.stories.tsx`
- Modify: `src-react/components/reader/KnowledgeChips.tsx`
- Modify: `src-react/components/reader/VerseBlock.tsx`
- Modify: `src-react/search/schema.ts` and `src-react/search/search-engine.ts` only to register verified metadata lane hooks from Wave 11.
- Modify: `src-react/design-system/registry/component-registry.json`
- Create: `tests/unit/read/react-metadata-lane.test.tsx`
- Create: `tests/unit/search/react-metadata-search-adapter.test.ts`
- Extend: `tests/e2e/read/react-reader-parity.spec.js` for visible metadata states.
- Modify docs if metadata lanes, source-data contracts, registry, or current behavior changes.

## Task 1: Preflight And Dataset Boundary Check

**Files:**
- Read: required docs and Wave 08/09/11 outputs.

- [ ] **Step 1: Confirm dependencies exist**

Run:

```bash
test -f src-react/components/reader/VerseBlock.tsx
test -f src-react/metadata/reader-metadata.ts
test -f src-react/search/schema.ts
test -f src-react/design-system/registry/component-registry.json
```

Expected: all files exist. Stop if reader or search extension points are absent.

- [ ] **Step 2: Confirm no new metadata library is being introduced**

Run:

```bash
rg -n "metadata|knowledge|taxonomy|compression|parser" package.json src-react scripts/data || true
```

Expected: no new external metadata/indexing/parsing package is required. If a package is introduced, run Context7 `library` then `docs` before code.

- [ ] **Step 3: Confirm runtime code does not import build-only data**

Run:

```bash
rg -n "from ['\"](\\.\\./)*data/|/data/catalog|/data/normalized|/data/taxonomy" src-react || true
```

Expected: no output. React runtime consumes only `/dataset/**`.

## Task 2: Metadata State And Knowledge Adapter

**Files:**
- Create: `src-react/metadata/metadata-state.ts`
- Create: `src-react/metadata/knowledge.ts`
- Test: `tests/unit/read/react-metadata-lane.test.tsx`

- [ ] **Step 1: Write adapter tests**

Create `tests/unit/read/react-metadata-lane.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { loadKnowledgeForSurah } from '../../../src-react/metadata/knowledge'

describe('React metadata knowledge adapter', () => {
  it('returns empty state for missing knowledge shards without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    const result = await loadKnowledgeForSurah(1)
    expect(result.state).toBe('missing')
    expect(result.rows.size).toBe(0)
    vi.unstubAllGlobals()
  })
})
```

Expected: fails until adapter exists.

- [ ] **Step 2: Add shared state types**

Create `src-react/metadata/metadata-state.ts`:

```ts
export type MetadataState = 'available' | 'empty' | 'missing' | 'stale' | 'invalid' | 'offline' | 'unavailable'

export type VerseMetadata = {
  verseKey: string
  themes: Array<{ id: string; label: string }>
  passageSummary: string | null
}

export type SurahMetadataResult = {
  state: MetadataState
  rows: Map<string, VerseMetadata>
}
```

Expected: state vocabulary covers available, empty, missing, stale, invalid, offline, and unavailable.

- [ ] **Step 3: Implement knowledge adapter**

Create `src-react/metadata/knowledge.ts`:

```ts
import type { SurahMetadataResult, VerseMetadata } from './metadata-state'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (response.status === 404) throw new Error('missing')
  if (!response.ok) throw new Error(`metadata ${response.status}`)
  return response.json() as Promise<T>
}

export async function loadKnowledgeForSurah(surah: number): Promise<SurahMetadataResult> {
  const padded = String(surah).padStart(3, '0')
  try {
    const [ayahRows, passageRows] = await Promise.all([
      fetchJson<Array<{ key: string; themes?: Array<{ id: string; label?: string }>; passageId?: string | null }>>(`/dataset/knowledge/ayah/${padded}.json`),
      fetchJson<Array<{ id: string; summary?: string }>>(`/dataset/knowledge/passages/${padded}.json`).catch(() => []),
    ])
    const passages = new Map(passageRows.map((row) => [row.id, row.summary ?? null]))
    const rows = new Map<string, VerseMetadata>()
    for (const row of ayahRows) {
      rows.set(row.key, {
        verseKey: row.key,
        themes: (row.themes ?? []).map((theme) => ({ id: theme.id, label: theme.label ?? theme.id })),
        passageSummary: row.passageId ? passages.get(row.passageId) ?? null : null,
      })
    }
    return { state: rows.size ? 'available' : 'empty', rows }
  } catch (error) {
    if (error instanceof Error && error.message === 'missing') return { state: 'missing', rows: new Map() }
    return { state: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline', rows: new Map() }
  }
}
```

Expected: base reader can continue for every non-available state.

- [ ] **Step 4: Run adapter tests**

Run:

```bash
pnpm run test:react -- tests/unit/read/react-metadata-lane.test.tsx
```

Expected: tests pass.

## Task 3: Reader-Attached Metadata Components

**Files:**
- Create: `src-react/components/reader/metadata/MetadataLane.tsx`
- Create: `src-react/components/reader/metadata/ThemeChips.tsx`
- Create: `src-react/components/reader/metadata/PassageContext.tsx`
- Create: `src-react/components/reader/metadata/MetadataUnavailable.tsx`
- Modify: `src-react/components/reader/KnowledgeChips.tsx`
- Modify: `src-react/components/reader/VerseBlock.tsx`

- [ ] **Step 1: Add component test**

Append to `tests/unit/read/react-metadata-lane.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MetadataLane } from '../../../src-react/components/reader/metadata/MetadataLane'

it('renders quiet metadata without blocking the verse', () => {
  render(<MetadataLane state="available" metadata={{ verseKey: '2:255', themes: [{ id: 'mercy', label: 'Mercy' }], passageSummary: 'Throne verse context' }} />)
  expect(screen.getByText('Mercy')).toBeInTheDocument()
  expect(screen.getByText('Throne verse context')).toBeInTheDocument()
})
```

Expected: fails until components exist.

- [ ] **Step 2: Implement metadata components**

Create `MetadataLane.tsx`:

```tsx
import type { MetadataState, VerseMetadata } from '../../../metadata/metadata-state'
import { MetadataUnavailable } from './MetadataUnavailable'
import { PassageContext } from './PassageContext'
import { ThemeChips } from './ThemeChips'

export function MetadataLane(props: { state: MetadataState; metadata: VerseMetadata | null }) {
  if (props.state !== 'available') return <MetadataUnavailable state={props.state} />
  if (!props.metadata || (!props.metadata.themes.length && !props.metadata.passageSummary)) return null
  return (
    <aside className="qar:metadata-lane" aria-label="Verse context">
      <ThemeChips themes={props.metadata.themes} />
      <PassageContext summary={props.metadata.passageSummary} />
    </aside>
  )
}
```

Create `ThemeChips.tsx`, `PassageContext.tsx`, and `MetadataUnavailable.tsx` with simple labelled output:

```tsx
export function ThemeChips(props: { themes: Array<{ id: string; label: string }> }) {
  if (!props.themes.length) return null
  return <ul aria-label="Themes">{props.themes.map((theme) => <li key={theme.id}>{theme.label}</li>)}</ul>
}

export function PassageContext(props: { summary: string | null }) {
  return props.summary ? <p>{props.summary}</p> : null
}

export function MetadataUnavailable(props: { state: string }) {
  if (props.state === 'empty' || props.state === 'missing') return null
  return <p role="status">Metadata is {props.state} for this verse.</p>
}
```

Expected: user-visible unavailable states are explicit, while missing/empty shards stay quiet.

- [ ] **Step 3: Wire into VerseBlock**

Modify `VerseBlock.tsx` to accept:

```ts
metadataState?: MetadataState
metadata?: VerseMetadata | null
metadataOpen?: boolean
```

Render `MetadataLane` only when the verse is expanded/open or when the reader contract says metadata is visible for the active state.

Expected: Arabic and translation rendering remain independent of metadata.

- [ ] **Step 4: Run component tests**

Run:

```bash
pnpm run test:react -- tests/unit/read/react-metadata-lane.test.tsx
```

Expected: tests pass.

## Task 4: Search Metadata Extension

**Files:**
- Create: `src-react/metadata/search-adapter.ts`
- Modify: `src-react/search/schema.ts`
- Modify: `src-react/search/search-engine.ts`
- Test: `tests/unit/search/react-metadata-search-adapter.test.ts`

- [ ] **Step 1: Add search adapter test**

Create `tests/unit/search/react-metadata-search-adapter.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { metadataRowsToSearchRows } from '../../../src-react/metadata/search-adapter'

describe('metadataRowsToSearchRows', () => {
  it('exports only verified available metadata rows', () => {
    const rows = metadataRowsToSearchRows('knowledge-v1', 'available', new Map([
      ['2:255', { verseKey: '2:255', themes: [{ id: 'throne', label: 'Throne' }], passageSummary: 'Majesty and sovereignty' }],
    ]))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ lane: 'metadata', metadataPackId: 'knowledge-v1', sourceRef: { surah: 2, verse: 255 } })
  })

  it('does not expose unavailable metadata as searchable', () => {
    expect(metadataRowsToSearchRows('knowledge-v1', 'missing', new Map())).toEqual([])
  })
})
```

Expected: fails until adapter exists.

- [ ] **Step 2: Implement adapter**

Create `src-react/metadata/search-adapter.ts`:

```ts
import type { MetadataState, VerseMetadata } from './metadata-state'
import type { SearchRow } from '../search/schema'

function parseVerseKey(verseKey: string): { surah: number; verse: number } {
  const [surah, verse] = verseKey.split(':').map(Number)
  return { surah, verse }
}

export function metadataRowsToSearchRows(
  metadataPackId: string,
  state: MetadataState,
  rows: Map<string, VerseMetadata>,
): SearchRow[] {
  if (state !== 'available') return []
  return [...rows.values()].flatMap((row) => {
    const ref = parseVerseKey(row.verseKey)
    const text = [...row.themes.map((theme) => theme.label), row.passageSummary].filter(Boolean).join(' ')
    if (!text) return []
    return [{
      id: `metadata:${metadataPackId}:${row.verseKey}`,
      lane: 'metadata',
      sourceRiwayah: 'hafs',
      sourceRef: ref,
      metadataPackId,
      text,
      normalized: text.normalize('NFKC').toLowerCase(),
    }]
  })
}
```

Expected: search consumes verified metadata only.

- [ ] **Step 3: Run search adapter tests**

Run:

```bash
pnpm run test:react -- tests/unit/search/react-metadata-search-adapter.test.ts
```

Expected: tests pass.

## Task 5: Registry, Stories, Visual Proof

**Files:**
- Create: `src-react/components/reader/metadata/metadata.stories.tsx`
- Modify: `src-react/design-system/registry/component-registry.json`

- [ ] **Step 1: Add metadata stories**

Create stories for:

```text
available themes
available passage context
empty
missing
invalid
offline
mobile verse expanded
tablet verse expanded
dark reader metadata
sepia reader metadata
```

Expected: stories use real component states and do not create decorative annotation/review UI.

- [ ] **Step 2: Extend registry**

Add sorted entries for:

```text
metadata-lane
metadata-unavailable
passage-context
theme-chips
```

Expected: entries are owned by `read`, reference stories/tests, and forbid personal notes/tags/review usage.

- [ ] **Step 3: Run registry and Storybook checks**

Run:

```bash
pnpm run check:react-registry
pnpm run test:storybook:react
```

Expected: checks pass.

## Task 6: E2E, Docs, Verification, Commit

**Files:**
- Extend: `tests/e2e/read/react-reader-parity.spec.js`
- Modify docs only if source-data/product/surface behavior changes.

- [ ] **Step 1: Add browser proof**

Extend read e2e with cases:

```text
metadata available opens below verse without layout overlap
missing metadata leaves reader usable
offline/unavailable metadata shows explicit status where user-visible
```

Expected: browser proof stays under `tests/e2e/read/**`.

- [ ] **Step 2: Run verification**

Run:

```bash
pnpm run test:react -- tests/unit/read tests/unit/search
pnpm run check:react
pnpm run build:react
pnpm run test:e2e:react -- tests/e2e/read/react-reader-parity.spec.js --reporter=line
pnpm run docs:check
git diff --check
pnpm run check
```

Expected: metadata, search integration, React build, docs, whitespace, and shipped Svelte checks pass.

- [ ] **Step 3: Run data checks only if source-data contracts changed**

Run when `scripts/data/**`, `data/**`, or generated metadata/search output changed:

```bash
pnpm run data -- check
```

Expected: data checks pass. If no data/source files changed, record "not run; no data contract files changed" in the implementation handoff.

- [ ] **Step 4: Inspect changed files**

Run:

```bash
git diff --name-only
```

Expected: no hand-edited generated dataset files, specs, earlier plans, or removed-scope product branches changed.

- [ ] **Step 5: Commit**

Run:

```bash
git add src-react tests docs public/dataset
git commit -m "feat: add react curated metadata parity"
```

Expected: commit succeeds. Stage `public/dataset/**` only if generated by an approved data build and reviewed. Do not push.

## Reviewer Checklist

- Verify metadata never blocks base reader rendering.
- Verify unavailable metadata is explicit where visible and quiet where missing/empty is expected.
- Verify runtime code does not import `data/**`.
- Verify search only indexes verified metadata lanes.
