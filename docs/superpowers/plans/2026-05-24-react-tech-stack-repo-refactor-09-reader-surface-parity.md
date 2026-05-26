# React Tech Stack Refactor 09 - Reader Surface Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build React Verse and Mushaf reader parity while preserving public reader routes, verified asset rendering, translation aliasing, reader chrome, settings entry points, virtualization, accessibility, and visual proof.

**Architecture:** Implement reader routes under `src-react/app/routes/read/**`, product reader components under `src-react/components/reader/**`, and typed reader data adapters under `src-react/data/**`, `src-react/packs/**`, and `src-react/metadata/**` only where Wave 08 contracts do not already provide them. Extend the Wave 2 component registry and page recipes in the same change that adds reader product components. Keep Svelte shipped as default and do not touch Svelte reader behavior except for separately approved baseline fixes.

**Tech Stack:** React, TypeScript, TanStack Virtual (`@tanstack/react-virtual`), QuranAtlas React tokens/Tailwind constraints, owned Radix/shadcn-style components, Storybook, Vitest, React Testing Library, Playwright React e2e, Cache Storage/Dexie adapters from Wave 08.

---

## Dependencies And Sequencing

This plan runs after Wave 02, 06, 07, 08, and 08A are implemented and committed. It must finish before Wave 10, 11, 12, 13, and 14 consume reader route/component hooks.

Do not rebuild mark/review/listen/audio/notes/tags/AI branches. Bookmarks are represented only through the `data-token-key` verse identity hook that Wave 13 consumes.

## UI And Visual Proof Rule

Before implementing each reader component, read `DESIGN.md`, use the Wave 2 registry, choose exactly one active reference source for that component pass, and record whether it is a committed `docs/ui-references/**` image/note or an accepted current Svelte UI state from Wave 02. Storybook and Playwright proof must cover mobile `<768`, tablet `768-1179`, desktop `>=1180`, light/sepia/dark where relevant, and awkward reader states such as dense ayah content, unavailable packs, focus rings, and sticky/control overlap.

## File Structure

Create or modify these files during implementation:

- Create: `src-react/app/routes/read/ReaderRoute.tsx` - `#/s/:surah/:ayah?` route container.
- Create: `src-react/app/routes/read/MushafRoute.tsx` - `#/m/:page` route container.
- Modify: `src-react/app/router/routes.ts` - register reader route matchers without changing shipped Svelte routes.
- Create: `src-react/components/reader/ReaderPageShell.tsx` - reader page recipe shell.
- Create: `src-react/components/reader/ReaderAssetGate.tsx` - explicit unavailable/stale/install/switch state renderer.
- Create: `src-react/components/reader/VerseBlock.tsx` - Arabic, translation, tafsir, metadata slot, and `data-token-key`.
- Create: `src-react/components/reader/VerseNumber.tsx` - accessible verse toggle/edge-indicator trigger.
- Create: `src-react/components/reader/TranslationFootnote.tsx` - inline footnote disclosure.
- Create: `src-react/components/reader/TafsirPreview.tsx` - inline tafsir preview.
- Create: `src-react/components/reader/TafsirSheet.tsx` - full tafsir sheet using owned `Sheet`.
- Create: `src-react/components/reader/KnowledgeChips.tsx` - metadata extension slots for Wave 12.
- Create: `src-react/components/reader/VirtualVerseList.tsx` - TanStack Virtual-backed verse list.
- Create: `src-react/components/reader/MushafPageViewer.tsx` - sanitized edition-aware SVG page renderer.
- Create: `src-react/components/reader/MushafModeControl.tsx` - Auto/Fit page/Fit width control.
- Create: `src-react/components/reader/ReaderChrome.tsx` - reader chrome and settings/nav entry hooks.
- Create: `src-react/components/reader/reader.stories.tsx` - Storybook states for reader components.
- Create: `src-react/design-system/recipes/reader-page.tsx` - `ReaderPageRecipe`.
- Modify: `src-react/design-system/registry/component-registry.json` - add reader product components and page recipe entries.
- Create: `src-react/data/reader-corpus.ts` - active text/translation/tafsir fetch adapters.
- Create: `src-react/data/verse-aliases.ts` - `_verse-aliases.json` loader/resolver for React.
- Create: `src-react/metadata/reader-metadata.ts` - non-blocking metadata adapter interface for Wave 12.
- Create: `tests/unit/read/react-reader-route.test.tsx`
- Create: `tests/unit/read/react-verse-aliases.test.ts`
- Create: `tests/unit/read/react-virtual-verse-list.test.tsx`
- Create: `tests/unit/read/react-mushaf-route.test.tsx`
- Create: `tests/e2e/read/react-reader-parity.spec.js`
- Create or modify: React visual regression fixture list selected by Wave 05.
- Modify docs only if behavior, scripts, package dependencies, registry shape, or current context changes: `docs/tech-stack.md`, `docs/context/architecture.md`, `docs/context/surfaces/read.md`, `docs/context/style-map.md`.

## Task 1: Preflight And Current Docs

**Files:**
- Read: `AGENTS.md`
- Read: `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- Read: `DESIGN.md`
- Read: `docs/context/repo-structure.md`
- Read: `docs/context/architecture.md`
- Read: `docs/context/data-model.md`
- Read: `docs/context/source-data-flow.md`
- Read: `docs/context/style-map.md`
- Read: `docs/context/surfaces/read.md`
- Read: `docs/context/surfaces/navigate.md`
- Read: `docs/context/surfaces/configure.md`
- Read: `docs/tech-stack.md`
- Read: `tests/unit/AGENTS.md`
- Read: `tests/e2e/AGENTS.md`
- Read: Wave 02, 06, 07, 08, and 08A implementation plans and their completed outputs.

- [ ] **Step 1: Confirm dependency waves are present**

Run:

```bash
test -f src-react/components/ui/index.ts
test -f src-react/design-system/registry/component-registry.json
test -f src-react/storage/db.ts
test -f src-react/offline/pack-status.ts
test -f src-react/packs/mushaf-paths.ts
rg -n "\"test:react\"|\"test:e2e:react\"|\"build:react\"|\"check:react\"" package.json
```

Expected: all commands exit `0`. Stop if any dependency output is missing; finish the owning earlier wave first.

- [ ] **Step 2: Reconfirm TanStack Virtual docs if the installed version differs from the spec appendix**

Run outside Codex's default sandbox only if `@tanstack/react-virtual` is absent or its major version differs from the Wave 09 spec appendix:

```bash
npx ctx7@latest library "TanStack Virtual" "How should TanStack Virtual be used in React for long variable-height reader surfaces, row measurement, scroll restoration, overscan, and avoiding layout jumps?"
npx ctx7@latest docs /tanstack/virtual "How should TanStack Virtual be used in React for long variable-height reader surfaces, row measurement, scroll restoration, overscan, and avoiding layout jumps?"
```

Expected: implementation uses current `useVirtualizer` API facts. If Context7 quota-blocks, stop and ask the user to run `npx ctx7@latest login` or set `CONTEXT7_API_KEY`.

- [ ] **Step 3: Install TanStack Virtual only if missing**

Run:

```bash
node -e "const p=require('./package.json'); if (!p.dependencies?.['@tanstack/react-virtual'] && !p.devDependencies?.['@tanstack/react-virtual']) process.exit(1)"
```

Expected: exits `0` when Wave 00/09 dependency is already present. If it exits `1`, run:

```bash
pnpm add @tanstack/react-virtual@latest
```

Expected: `package.json` and `pnpm-lock.yaml` change only for TanStack Virtual. Update `docs/tech-stack.md` in the same task and keep Svelte default scripts unchanged.

- [ ] **Step 4: Confirm forbidden scopes are clean**

Run:

```bash
git diff --name-only -- src public/dataset docs/superpowers/specs docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-0[0-8]*.md
```

Expected: no output from this implementation. Treat existing unrelated output as another worker's changes and do not revert it.

## Task 2: Reader Data And Alias Adapters

**Files:**
- Create: `src-react/data/reader-corpus.ts`
- Create: `src-react/data/verse-aliases.ts`
- Create: `src-react/metadata/reader-metadata.ts`
- Test: `tests/unit/read/react-verse-aliases.test.ts`

- [ ] **Step 1: Add translation alias resolver tests**

Create `tests/unit/read/react-verse-aliases.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resolveTranslationFor, type VerseAliases } from '../../../src-react/data/verse-aliases'

const aliases: VerseAliases = {
  aliases: {
    '1': [{ hafs: 1, warsh: null, qaloon: null }],
    '7': [
      { hafs: 1, warsh: 1, qaloon: 1 },
      { hafs: 2, warsh: [2, 3], qaloon: [2, 3] },
      { hafs: 3, warsh: null, qaloon: null },
    ],
  },
}

describe('React verse alias resolution', () => {
  it('returns identity for Hafs translation references', () => {
    expect(resolveTranslationFor(aliases, 'hafs', 7, 2)).toEqual({ role: 'identity', hafsVerse: 2 })
  })

  it('maps primary and continuation roles for Qalun merged boundaries', () => {
    expect(resolveTranslationFor(aliases, 'qaloon', 7, 2)).toEqual({ role: 'primary', hafsVerse: 2 })
    expect(resolveTranslationFor(aliases, 'qaloon', 7, 3)).toEqual({ role: 'continuation', hafsVerse: 2 })
  })

  it('returns none for Surah 1 Bismillah carve-out in non-Hafs riwayat', () => {
    expect(resolveTranslationFor(aliases, 'warsh', 1, 1)).toEqual({ role: 'none', hafsVerse: null })
  })
})
```

Expected: test fails until the resolver exists.

- [ ] **Step 2: Implement alias resolver**

Create `src-react/data/verse-aliases.ts`:

```ts
export type Riwayah = 'hafs' | 'warsh' | 'qaloon'

export type VerseAliasEntry = {
  hafs: number
  warsh: number | number[] | null
  qaloon: number | number[] | null
}

export type VerseAliases = {
  aliases: Record<string, VerseAliasEntry[]>
}

export type TranslationAliasResolution =
  | { role: 'identity'; hafsVerse: number }
  | { role: 'merged'; hafsVerse: number }
  | { role: 'primary'; hafsVerse: number }
  | { role: 'continuation'; hafsVerse: number }
  | { role: 'none'; hafsVerse: null }

export async function loadVerseAliases(): Promise<VerseAliases> {
  const response = await fetch('/dataset/translations/_verse-aliases.json')
  if (!response.ok) throw new Error(`Unable to load verse aliases: ${response.status}`)
  return response.json() as Promise<VerseAliases>
}

function asArray(value: number | number[] | null): number[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

export function resolveTranslationFor(
  aliases: VerseAliases,
  riwayah: Riwayah,
  surah: number,
  verse: number,
): TranslationAliasResolution {
  if (riwayah === 'hafs') return { role: 'identity', hafsVerse: verse }
  const rows = aliases.aliases[String(surah)] ?? []
  const row = rows.find((entry) => asArray(entry[riwayah]).includes(verse))
  if (!row) return { role: 'none', hafsVerse: null }
  const mapped = asArray(row[riwayah])
  if (mapped.length > 1) {
    return mapped[0] === verse
      ? { role: 'primary', hafsVerse: row.hafs }
      : { role: 'continuation', hafsVerse: row.hafs }
  }
  return row.hafs === verse ? { role: 'identity', hafsVerse: row.hafs } : { role: 'merged', hafsVerse: row.hafs }
}
```

Expected: resolver covers identity, merged, primary, continuation, and none roles.

- [ ] **Step 3: Add reader corpus adapter**

Create `src-react/data/reader-corpus.ts`:

```ts
import { resolveTranslationFor, type Riwayah, type VerseAliases } from './verse-aliases'

export type QuranVerse = { key: string; surah: number; verse: number; text: string }
export type TranslationVerse = { key: string; text: string }
export type TranslationPack = {
  translationId: string
  surahNo: number
  verses: TranslationVerse[]
  footnotes: Record<string, string>
}

export type ReaderVersePayload = QuranVerse & {
  translation: { role: ReturnType<typeof resolveTranslationFor>['role']; text: string | null; hafsVerse: number | null }
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Dataset request failed: ${url} ${response.status}`)
  return response.json() as Promise<T>
}

export async function loadReaderSurah(input: {
  riwayah: Riwayah
  quranTextStyleId: string
  translationId: string
  surah: number
  aliases: VerseAliases
}): Promise<ReaderVersePayload[]> {
  const surahPath = String(input.surah).padStart(3, '0')
  const arabic = await readJson<{ verses: QuranVerse[] }>(
    `/dataset/quran-text/${input.riwayah}/${input.quranTextStyleId}/${surahPath}.json`,
  )
  const translation = await readJson<TranslationPack>(`/dataset/translations/${input.translationId}/${surahPath}.json`)
  const translationByHafs = new Map(
    translation.verses.map((verse) => [Number(verse.key.split(':')[1]), verse.text]),
  )
  return arabic.verses.map((verse) => {
    const alias = resolveTranslationFor(input.aliases, input.riwayah, input.surah, verse.verse)
    return {
      ...verse,
      translation: {
        role: alias.role,
        hafsVerse: alias.hafsVerse,
        text: alias.hafsVerse == null ? null : translationByHafs.get(alias.hafsVerse) ?? null,
      },
    }
  })
}
```

Expected: adapter never falls back to another riwayah/text style. Asset gate code handles missing fetches.

- [ ] **Step 4: Add metadata adapter interface**

Create `src-react/metadata/reader-metadata.ts`:

```ts
export type MetadataLaneState = 'available' | 'empty' | 'missing' | 'stale' | 'invalid' | 'offline' | 'unavailable'

export type ReaderMetadataForVerse = {
  verseKey: string
  state: MetadataLaneState
  themes: Array<{ id: string; label: string }>
  passageSummary: string | null
}

export async function loadReaderMetadataForSurah(surah: number): Promise<Map<string, ReaderMetadataForVerse>> {
  const surahPath = String(surah).padStart(3, '0')
  try {
    const response = await fetch(`/dataset/knowledge/ayah/${surahPath}.json`)
    if (response.status === 404) return new Map()
    if (!response.ok) throw new Error(`metadata ${response.status}`)
    const rows = (await response.json()) as Array<{ key: string; themes?: Array<{ id: string; label?: string }> }>
    return new Map(rows.map((row) => [
      row.key,
      {
        verseKey: row.key,
        state: row.themes?.length ? 'available' : 'empty',
        themes: (row.themes ?? []).map((theme) => ({ id: theme.id, label: theme.label ?? theme.id })),
        passageSummary: null,
      },
    ]))
  } catch {
    return new Map()
  }
}
```

Expected: metadata load is non-blocking and never prevents base reader rendering.

- [ ] **Step 5: Run reader data tests**

Run:

```bash
pnpm run test:react -- tests/unit/read/react-verse-aliases.test.ts
```

Expected: tests pass.

## Task 3: Verse Reader Route And Virtualized List

**Files:**
- Create: `src-react/app/routes/read/ReaderRoute.tsx`
- Create: `src-react/components/reader/ReaderPageShell.tsx`
- Create: `src-react/components/reader/ReaderAssetGate.tsx`
- Create: `src-react/components/reader/VirtualVerseList.tsx`
- Create: `src-react/components/reader/VerseBlock.tsx`
- Create: `src-react/components/reader/VerseNumber.tsx`
- Create: `src-react/components/reader/TranslationFootnote.tsx`
- Test: `tests/unit/read/react-virtual-verse-list.test.tsx`

- [ ] **Step 1: Write virtualization behavior test**

Create `tests/unit/read/react-virtual-verse-list.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VirtualVerseList } from '../../../src-react/components/reader/VirtualVerseList'

const verses = Array.from({ length: 80 }, (_, index) => ({
  key: `2:${index + 1}`,
  surah: 2,
  verse: index + 1,
  text: `ayah-${index + 1}`,
  translation: { role: 'identity' as const, text: `translation-${index + 1}`, hafsVerse: index + 1 },
}))

describe('VirtualVerseList', () => {
  it('renders stable verse identity attributes for bookmark and pulse consumers', () => {
    render(<VirtualVerseList verses={verses} initialVerse={1} translationVisible />)
    expect(screen.getByTestId('react-verse-2:1')).toHaveAttribute('data-token-key', '2:1')
  })
})
```

Expected: fails until the list and verse block exist.

- [ ] **Step 2: Implement asset gate component**

Create `src-react/components/reader/ReaderAssetGate.tsx`:

```tsx
import { Button } from '../ui'

export type ReaderAssetGateState = 'loading' | 'ready' | 'not-installed' | 'stale' | 'failed' | 'unavailable-offline'

export function ReaderAssetGate(props: {
  state: ReaderAssetGateState
  label: string
  onInstall?: () => void
  onManageAssets?: () => void
  children: React.ReactNode
}) {
  if (props.state === 'ready') return <>{props.children}</>
  if (props.state === 'loading') return <div role="status">Loading {props.label}</div>
  const copy = {
    'not-installed': `${props.label} is not installed on this device.`,
    stale: `${props.label} needs verification before it can be used.`,
    failed: `${props.label} could not be loaded.`,
    'unavailable-offline': `${props.label} is unavailable while offline.`,
  }[props.state]
  return (
    <section aria-live="polite" aria-label={`${props.label} unavailable`}>
      <p>{copy}</p>
      {props.onInstall ? <Button onClick={props.onInstall}>Install</Button> : null}
      {props.onManageAssets ? <Button variant="secondary" onClick={props.onManageAssets}>Manage Assets</Button> : null}
    </section>
  )
}
```

Expected: no fallback content renders behind an unavailable active label.

- [ ] **Step 3: Implement verse block**

Create `src-react/components/reader/VerseBlock.tsx` and `src-react/components/reader/VerseNumber.tsx`:

```tsx
import { VerseNumber } from './VerseNumber'
import type { ReaderVersePayload } from '../../data/reader-corpus'

export function VerseBlock(props: {
  verse: ReaderVersePayload
  translationVisible: boolean
  onVerseNumber: (verseKey: string) => void
}) {
  const continuation = props.verse.translation.role === 'continuation'
  return (
    <article
      className="qar:reader-verse"
      data-token-key={props.verse.key}
      data-testid={`react-verse-${props.verse.key}`}
      aria-labelledby={`verse-${props.verse.key}-label`}
    >
      <VerseNumber verseKey={props.verse.key} verse={props.verse.verse} onPress={props.onVerseNumber} />
      <p className="qar:reader-arabic" dir="rtl">{props.verse.text}</p>
      {props.translationVisible && props.verse.translation.text ? (
        <p className="qar:reader-translation">
          {continuation ? `continued from verse ${props.verse.translation.hafsVerse}` : props.verse.translation.text}
        </p>
      ) : null}
    </article>
  )
}
```

```tsx
export function VerseNumber(props: { verseKey: string; verse: number; onPress: (verseKey: string) => void }) {
  return (
    <button
      id={`verse-${props.verseKey}-label`}
      className="qar:reader-verse-number"
      type="button"
      aria-label={`Verse ${props.verse}`}
      onClick={() => props.onPress(props.verseKey)}
    >
      {props.verse}
    </button>
  )
}
```

Expected: `data-token-key` is the only verse identity contract exposed for bookmark/pulse/gesture consumers.

- [ ] **Step 4: Implement virtual list**

Create `src-react/components/reader/VirtualVerseList.tsx`:

```tsx
import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { VerseBlock } from './VerseBlock'
import type { ReaderVersePayload } from '../../data/reader-corpus'

export function VirtualVerseList(props: {
  verses: ReaderVersePayload[]
  initialVerse: number
  translationVisible: boolean
  onVerseNumber?: (verseKey: string) => void
}) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const virtualizer = useVirtualizer({
    count: props.verses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 8,
    initialOffset: Math.max(0, props.initialVerse - 1) * 220,
  })

  return (
    <div ref={parentRef} className="qar:reader-scrollport" data-testid="react-reader-scrollport">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => {
          const verse = props.verses[item.index]
          return (
            <div
              key={verse.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{ position: 'absolute', transform: `translateY(${item.start}px)`, width: '100%' }}
            >
              <VerseBlock
                verse={verse}
                translationVisible={props.translationVisible}
                onVerseNumber={props.onVerseNumber ?? (() => undefined)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Expected: the only inline styles are measured virtualization layout values. If Wave 03 design-literal checks require allowlisting, add a narrow entry to `src-react/design-system/docs/measured-layout-allowlist.json`.

- [ ] **Step 5: Implement Verse route container**

Create `src-react/app/routes/read/ReaderRoute.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { loadReaderSurah, type ReaderVersePayload } from '../../../data/reader-corpus'
import { loadVerseAliases } from '../../../data/verse-aliases'
import { ReaderAssetGate, type ReaderAssetGateState } from '../../../components/reader/ReaderAssetGate'
import { VirtualVerseList } from '../../../components/reader/VirtualVerseList'

export function ReaderRoute(props: {
  surah: number
  ayah?: number
  riwayah: 'hafs' | 'warsh' | 'qaloon'
  quranTextStyleId: string
  translationId: string
  translationVisible: boolean
}) {
  const [state, setState] = useState<ReaderAssetGateState>('loading')
  const [verses, setVerses] = useState<ReaderVersePayload[]>([])

  useEffect(() => {
    let cancelled = false
    setState('loading')
    Promise.all([loadVerseAliases(), Promise.resolve()])
      .then(([aliases]) => loadReaderSurah({ ...props, aliases }))
      .then((payload) => {
        if (!cancelled) {
          setVerses(payload)
          setState('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setState(navigator.onLine ? 'not-installed' : 'unavailable-offline')
      })
    return () => { cancelled = true }
  }, [props.surah, props.riwayah, props.quranTextStyleId, props.translationId])

  return (
    <ReaderAssetGate state={state} label={`${props.riwayah} reader text`}>
      <VirtualVerseList verses={verses} initialVerse={props.ayah ?? 1} translationVisible={props.translationVisible} />
    </ReaderAssetGate>
  )
}
```

Expected: live settings changes re-run data load without requiring a route reload and missing active assets show a gate.

- [ ] **Step 6: Run reader route unit tests**

Run:

```bash
pnpm run test:react -- tests/unit/read/react-virtual-verse-list.test.tsx
```

Expected: test passes.

## Task 4: Mushaf Route And Page Viewer

**Files:**
- Create: `src-react/app/routes/read/MushafRoute.tsx`
- Create: `src-react/components/reader/MushafPageViewer.tsx`
- Create: `src-react/components/reader/MushafModeControl.tsx`
- Test: `tests/unit/read/react-mushaf-route.test.tsx`

- [ ] **Step 1: Write Mushaf path/focus test**

Create `tests/unit/read/react-mushaf-route.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MushafModeControl } from '../../../src-react/components/reader/MushafModeControl'

describe('MushafModeControl', () => {
  it('exposes Auto, Fit page, and Fit width modes as a segmented control', () => {
    render(<MushafModeControl value="auto" onChange={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Fit page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fit width' })).toBeInTheDocument()
  })
})
```

Expected: fails until the control exists.

- [ ] **Step 2: Implement Mushaf mode control**

Create `src-react/components/reader/MushafModeControl.tsx`:

```tsx
export type MushafViewMode = 'auto' | 'fit-page' | 'fit-width'

const options: Array<{ value: MushafViewMode; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'fit-page', label: 'Fit page' },
  { value: 'fit-width', label: 'Fit width' },
]

export function MushafModeControl(props: { value: MushafViewMode; onChange: (value: MushafViewMode) => void }) {
  return (
    <div role="group" aria-label="Mushaf view mode" className="qar:mushaf-mode-control">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={props.value === option.value}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

Expected: ready-state controls stay limited to page chip and this mode control.

- [ ] **Step 3: Implement SVG page viewer**

Create `src-react/components/reader/MushafPageViewer.tsx`:

```tsx
import { useEffect, useState } from 'react'

function sanitizeSvg(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  doc.querySelectorAll('script, foreignObject').forEach((node) => node.remove())
  for (const element of Array.from(doc.querySelectorAll('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name) || /javascript:|data:|https?:/i.test(attribute.value)) {
        element.removeAttribute(attribute.name)
      }
    }
  }
  const root = doc.documentElement
  if (root.nodeName.toLowerCase() !== 'svg') throw new Error('Mushaf asset is not SVG')
  return new XMLSerializer().serializeToString(root)
}

export function MushafPageViewer(props: { pageUrl: string; page: number }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(props.pageUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Mushaf page failed: ${response.status}`)
        return response.text()
      })
      .then((text) => !cancelled && setSvg(sanitizeSvg(text)))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Mushaf page failed'))
    return () => { cancelled = true }
  }, [props.pageUrl])
  if (error) return <div role="alert">{error}</div>
  if (!svg) return <div role="status">Loading page {props.page}</div>
  return <figure className="qar:mushaf-page" aria-label={`Mushaf page ${props.page}`} dangerouslySetInnerHTML={{ __html: svg }} />
}
```

Expected: runtime fetches same-origin SVG only; no quran.ws runtime fetch exists.

- [ ] **Step 4: Implement Mushaf route**

Create `src-react/app/routes/read/MushafRoute.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { mushafPageUrl } from '../../../packs/mushaf-paths'
import { ReaderAssetGate } from '../../../components/reader/ReaderAssetGate'
import { MushafModeControl, type MushafViewMode } from '../../../components/reader/MushafModeControl'
import { MushafPageViewer } from '../../../components/reader/MushafPageViewer'

export function MushafRoute(props: {
  page: number
  pageCount: number
  riwayah: 'hafs' | 'warsh' | 'qaloon'
  mushafEditionId: string
  assetState: 'ready' | 'not-installed' | 'stale' | 'failed' | 'unavailable-offline'
  onViewModeChange?: (mode: MushafViewMode) => void
}) {
  const [mode, setMode] = useState<MushafViewMode>('auto')
  const clampedPage = Math.min(props.pageCount, Math.max(1, props.page))
  const pageUrl = useMemo(
    () => mushafPageUrl({ riwayah: props.riwayah, mushafEditionId: props.mushafEditionId }, clampedPage),
    [props.riwayah, props.mushafEditionId, clampedPage],
  )
  return (
    <ReaderAssetGate state={props.assetState} label={`${props.riwayah} Mushaf pages`}>
      <main className="qar:mushaf-reader" data-view-mode={mode}>
        <div className="qar:mushaf-ready-controls">
          <button type="button" aria-label={`Jump from page ${clampedPage}`}>Page {clampedPage}</button>
          <MushafModeControl value={mode} onChange={(next) => { setMode(next); props.onViewModeChange?.(next) }} />
        </div>
        <MushafPageViewer pageUrl={pageUrl} page={clampedPage} />
      </main>
    </ReaderAssetGate>
  )
}
```

Expected: route uses edition-aware paths from Wave 08A and never legacy per-riwayah Mushaf paths.

- [ ] **Step 5: Run Mushaf tests**

Run:

```bash
pnpm run test:react -- tests/unit/read/react-mushaf-route.test.tsx tests/unit/react-packs/mushaf-paths.test.ts
```

Expected: mode control and path contract tests pass.

## Task 5: Reader Chrome, Settings Entry Points, Registry, Stories

**Files:**
- Create: `src-react/components/reader/ReaderChrome.tsx`
- Create: `src-react/components/reader/TafsirPreview.tsx`
- Create: `src-react/components/reader/TafsirSheet.tsx`
- Create: `src-react/components/reader/KnowledgeChips.tsx`
- Create: `src-react/components/reader/reader.stories.tsx`
- Create: `src-react/design-system/recipes/reader-page.tsx`
- Modify: `src-react/design-system/registry/component-registry.json`
- Modify: `src-react/design-system/registry/component-registry.schema.json` only if Wave 07 schema requires new recipe metadata fields.

- [ ] **Step 1: Add reader page recipe**

Create `src-react/design-system/recipes/reader-page.tsx`:

```tsx
export function ReaderPageRecipe(props: { chrome: React.ReactNode; content: React.ReactNode; overlay?: React.ReactNode }) {
  return (
    <div className="qar:reader-page-recipe">
      {props.chrome}
      <div className="qar:reader-page-content">{props.content}</div>
      {props.overlay ?? null}
    </div>
  )
}
```

Expected: product pages compose a recipe instead of ad hoc layout.

- [ ] **Step 2: Add minimal reader chrome**

Create `src-react/components/reader/ReaderChrome.tsx`:

```tsx
export function ReaderChrome(props: {
  mode: 'verse' | 'mushaf'
  label: string
  onOpenNavigation: () => void
  onOpenSettings: (mode: 'verse' | 'mushaf') => void
  onSwitchMode: (mode: 'verse' | 'mushaf') => void
}) {
  return (
    <nav className="qar:reader-chrome" aria-label="Reader">
      <button type="button" aria-label="Open navigation" onClick={props.onOpenNavigation}>Menu</button>
      <span aria-live="polite">{props.label}</span>
      <button type="button" aria-label="Verse reader" aria-pressed={props.mode === 'verse'} onClick={() => props.onSwitchMode('verse')}>Verse</button>
      <button type="button" aria-label="Mushaf reader" aria-pressed={props.mode === 'mushaf'} onClick={() => props.onSwitchMode('mushaf')}>Mushaf</button>
      <button type="button" aria-label="Open reader settings" onClick={() => props.onOpenSettings(props.mode)}>Settings</button>
    </nav>
  )
}
```

Expected: settings entry point passes the active reader mode for Wave 10.

- [ ] **Step 3: Add Storybook coverage**

Create `src-react/components/reader/reader.stories.tsx` with stories named:

```tsx
export const VerseDefault = {}
export const VerseUnavailablePack = {}
export const VerseLongAyah = {}
export const VerseTafsirOpen = {}
export const MushafReadyMobile = {}
export const MushafReadyTablet = {}
export const MushafUnavailablePack = {}
export const DarkReader = {}
export const SepiaReader = {}
```

Expected: each story renders real components, uses abstract non-readable glyph blocks where a full Quran fixture is not available, and references committed UI refs from `docs/ui-references/read/**` where visual direction is involved.

- [ ] **Step 4: Extend registry**

Modify `src-react/design-system/registry/component-registry.json` with sorted entries for:

```text
knowledge-chips
mushaf-mode-control
mushaf-page-viewer
reader-asset-gate
reader-chrome
reader-page-recipe
reader-page-shell
tafsir-preview
tafsir-sheet
translation-footnote
verse-block
verse-number
virtual-verse-list
```

Expected: each entry has `maturity` of `product` or `page-recipe`, `owner.surface` of `read`, stories/tests/proof references, and forbidden uses that block raw reader layout or silent fallback labels.

- [ ] **Step 5: Run registry and Storybook checks**

Run:

```bash
pnpm run check:react-registry
pnpm run test:storybook:react
```

Expected: registry is sorted and Storybook renders reader stories without a11y regressions.

## Task 6: Router Integration And Browser Proof

**Files:**
- Modify: `src-react/app/router/routes.ts`
- Test: `tests/unit/read/react-reader-route.test.tsx`
- Test: `tests/e2e/read/react-reader-parity.spec.js`

- [ ] **Step 1: Add route parsing unit tests**

Create `tests/unit/read/react-reader-route.test.tsx` with assertions for:

```ts
expect(matchReactRoute('#/s/2')).toMatchObject({ name: 'reader', params: { surah: '2' } })
expect(matchReactRoute('#/s/2/255')).toMatchObject({ name: 'reader', params: { surah: '2', ayah: '255' } })
expect(matchReactRoute('#/m/12')).toMatchObject({ name: 'mushaf', params: { page: '12' } })
expect(matchReactRoute('#/m/999')).toMatchObject({ name: 'mushaf', params: { page: '999' } })
```

Expected: fails until the React router exposes or already has a testable matcher.

- [ ] **Step 2: Register routes**

Modify `src-react/app/router/routes.ts` so these routes resolve to the new containers:

```ts
{ pattern: '#/s/:surah', name: 'reader', component: ReaderRoute }
{ pattern: '#/s/:surah/:ayah', name: 'reader', component: ReaderRoute }
{ pattern: '#/m/:page', name: 'mushaf', component: MushafRoute }
```

Expected: route sanitization and hash contract match the Svelte public contract. Svelte router files remain untouched.

- [ ] **Step 3: Add e2e proof**

Create `tests/e2e/read/react-reader-parity.spec.js` with React-specific config usage and assertions for:

```js
test('React verse reader renders verified text or an explicit asset gate', async ({ page }) => {
  await page.goto('/#/s/1')
  await expect(page.locator('[data-testid="react-reader-scrollport"], [aria-label$="unavailable"]')).toBeVisible()
})

test('React Mushaf reader ready state is unframed', async ({ page }) => {
  await page.goto('/#/m/1')
  await expect(page.getByRole('group', { name: 'Mushaf view mode' })).toBeVisible()
  await expect(page.locator('.qar\\:mushaf-page')).toBeVisible()
  await expect(page.locator('.qar\\:mushaf-page').locator('xpath=ancestor::*[contains(@class, "card")]')).toHaveCount(0)
})
```

Expected: browser-only proof lives under `tests/e2e/read/**` and targets React via `pnpm run test:e2e:react`, not the Svelte dev server.

- [ ] **Step 4: Run reader e2e at required viewport tiers**

Run:

```bash
pnpm run test:e2e:react -- tests/e2e/read/react-reader-parity.spec.js --reporter=line
```

Expected: mobile, tablet, and desktop projects or fixtures selected by the React Playwright config pass. If tablet is not configured, run a local tablet viewport pass and record it in the implementation handoff.

## Task 7: Documentation, Verification, Commit

**Files:**
- Modify if current behavior changes: `docs/context/surfaces/read.md`
- Modify if registry/style ownership changes: `docs/context/style-map.md`
- Modify if package/script changes: `docs/tech-stack.md`

- [ ] **Step 1: Update docs only for current-state changes**

Run:

```bash
pnpm run docs
```

Expected: run only if generated context inventories need regeneration after changed source/tests/styles. Never hand-edit auto-generated fences.

- [ ] **Step 2: Run targeted and broad verification**

Run:

```bash
pnpm run test:react -- tests/unit/read
pnpm run check:react
pnpm run build:react
pnpm run check:react-mushaf-assets
pnpm run docs:check
git diff --check
```

Expected: all commands pass. `check:react-mushaf-assets` confirms `dist-react/` contains no Mushaf SVG bodies or legacy React Mushaf paths.

- [ ] **Step 3: Run Svelte safety gate**

Run:

```bash
pnpm run check
```

Expected: shipped Svelte static checks remain green.

- [ ] **Step 4: Inspect changed files**

Run:

```bash
git diff --name-only
```

Expected: changes are limited to React reader/source files, tests, registry/stories/recipes, docs required by those changes, package/lockfile only if TanStack Virtual was installed. No `src/**`, `public/dataset/**`, spec files, or earlier Wave plans changed.

- [ ] **Step 5: Commit**

Run:

```bash
git add src-react tests docs package.json pnpm-lock.yaml
git commit -m "feat: add react reader surface parity"
```

Expected: commit succeeds. Stage only files that exist and changed. Do not push.

## Reviewer Checklist

- Verify no silent fallback from Hafs/Warsh/Qalun asset failures to another active label.
- Verify `data-token-key` is present on verse rows and no new React code reads `data-verse-key` for verse-grain behavior.
- Verify Mushaf React paths are edition-aware only.
- Verify virtualized rows preserve focus, deep links, and accessible labels.
- Verify product components and `ReaderPageRecipe` extend the registry in the same commit.
