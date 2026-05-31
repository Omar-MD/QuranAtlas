# Search Result Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Search Brief, matched-verses list, and inspector layout with the approved query-level `Overview`, `Verses`, `Explore`, and `Sources` workspace.

**Architecture:** Keep the existing Search worker query-window contract and add a UI-only presentation layer that derives workspace tabs, scoped count labels, minimal verse cards, result-level details, query-level sources, and query-level Explore states. Route state owns the fresh adaptive default tab for every submitted query; React components render the tab workspace while preserving Reader First launch, lazy Explore loading, saved-search recomputation, and conservative `Open in Read` mapping.

**Tech Stack:** React 19, TypeScript, Vite, owned `src/components/ui` primitives, Radix only inside `src/components/ui`, Search worker DTOs, `src/design-system/index.css`, Storybook Search states, QuranAtlas docs derivation.

---

## Required Reads

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `DESIGN.md`
- `docs/context/repo-structure.md`
- `docs/context/surfaces/search.md`
- `docs/context/style-map.md`
- `docs/superpowers/specs/2026-06-01-search-result-workspace-design.md`

## Current Working Tree Caution

The repo already contains active uncommitted Search implementation work. Do not revert it. Build on it carefully.

Preserve these untracked files unless the implementation deliberately renames them:

- `src/components/search/SearchBrief.tsx`
- `src/components/search/search-result-evidence.ts`
- `src/search-worker/search-brief.ts`

Preserve active edits in Search contracts, worker, route, components, CSS, stories, docs, and tests. If a touched file has unrelated edits, read it first and work with the current content.

## Test Policy

Do not add, move, or materially update automated tests unless the user explicitly grants test coverage approval. This plan includes verification commands and optional test targets, but implementation workers must stop before editing `tests/**` unless approval is given.

## File Map

- Modify: `src/components/ui/button.tsx`
  - Forward refs through the owned `Button` primitive so mobile Details can restore focus to the originating trigger.
- Modify: `src/components/ui/menus.tsx`
  - Add controlled `Tabs` support through owned UI primitives.
- Create: `src/components/search/search-presentation-model.ts`
  - Pure view-model derivation for workspace tabs, Overview, Verse cards, Details, Sources, and Explore module availability.
- Modify: `src/components/search/useSearchRouteState.ts`
  - Add `activeWorkspaceTab`, fresh default tab selection, explicit Explore seed state, focused Explore module state, and detail selection state.
- Create: `src/components/search/SearchWorkspace.tsx`
  - Query-level `Overview`, `Verses`, `Explore`, and `Sources` tab shell.
- Create or rename: `src/components/search/SearchOverview.tsx`
  - Replace default `Search Brief` UI with a scoped Overview orientation view.
- Modify: `src/components/search/SearchShell.tsx`
  - Render `SearchWorkspace` instead of directly composing brief/list/detail.
- Modify: `src/components/search/SearchResultList.tsx`
  - Treat this as the `Verses` tab body.
- Modify: `src/components/search/SearchResultCard.tsx`
  - Make result cards minimal and ayah-first.
- Modify: `src/components/search/SearchResultDetail.tsx`
  - Rework as per-result `Details` sections, not `Match / Explore / Source` tabs.
- Modify: `src/components/search/SearchExplorePanel.tsx`
  - Make query-level Explore explicit and selected-token/result exploration explicit.
- Modify: `src/components/search/SearchSourcePanel.tsx`
  - Split query-level sources from result-level source subset.
- Modify: `src/components/search/search-labels.ts`
  - Replace banned default labels and add workspace labels.
- Modify: `src/components/search/search.stories.tsx`
  - Update Search stories to workspace states.
- Modify: `src/design-system/index.css`
  - Replace brief/list/inspector layout styles with workspace/overview/tabs/details styles.
- Modify: `src/design-system/registry/component-registry.json`
  - Update Search component slots, story states, and accessibility notes.
- Modify: `docs/context/surfaces/search.md`
  - Update current-state Search behavior after implementation; never hand-edit generated fences.
- Modify only if current-state product text is stale after implementation: `docs/context/implemented.md`, `docs/product-info.md`

## Task 1: Update Owned UI Primitives

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/menus.tsx`

- [ ] **Step 1: Read the current owned primitives**

Run:

```bash
sed -n '1,120p' src/components/ui/button.tsx
sed -n '1,120p' src/components/ui/menus.tsx
```

Expected: `Button` is a plain function component and `TabsProps` has `label`, `items`, and optional `defaultValue`.

- [ ] **Step 2: Forward refs through `Button`**

In `src/components/ui/button.tsx`, update the React import and `Button` export:

```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
```

```tsx
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { asChild = false, className, unstyled = false, variant, size, type = 'button', ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(unstyled ? undefined : buttonVariants({ variant, size }), className)} ref={ref} type={asChild ? undefined : type} {...props} />
})
```

- [ ] **Step 3: Extend `TabsProps` with controlled values**

Replace the existing `TabsProps` and `Tabs` function with this shape while keeping the surrounding exports unchanged:

```tsx
export type TabsProps = {
  label: string
  items: Array<{ label: string; value: string; content: ReactNode; disabled?: boolean }>
  defaultValue?: string
  onValueChange?: (value: string) => void
  value?: string
}

export function Tabs({ label, items, defaultValue, onValueChange, value }: TabsProps) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue ?? items[0]?.value} onValueChange={onValueChange} value={value}>
      <TabsPrimitive.List aria-label={label} className="qar:inline-flex qar:rounded-control qar:border qar:border-border qar:bg-surface qar:p-1">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="qar:min-h-9 qar:rounded-control qar:px-3 qar:text-sm qar:data-[state=active]:bg-accent qar:data-[state=active]:text-surface qar:data-[disabled]:opacity-50"
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content aria-label={item.label} className="qar:pt-3 qar:text-sm qar:text-text" key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}
```

- [ ] **Step 4: Run static verification for this primitive change**

Run:

```bash
pnpm run check
```

Expected: command exits `0`.

- [ ] **Step 5: Commit this primitive change**

Run:

```bash
git add src/components/ui/button.tsx src/components/ui/menus.tsx
git commit -m "feat(search): support controlled workspace primitives"
```

## Task 2: Create Search Presentation Model

**Files:**
- Create: `src/components/search/search-presentation-model.ts`
- Read: `src/components/search/search-result-evidence.ts`
- Read: `src/components/search/search-labels.ts`
- Read: `src/search/query-parser.ts`
- Read: `src/search/schema.ts`

- [ ] **Step 1: Create the presentation-model file**

Create `src/components/search/search-presentation-model.ts` with pure helpers. Use this structure and keep implementation deterministic:

```ts
import type { ParsedSearchQuery, SearchBriefDto, SearchQueryMode, SearchResultDto } from '../../search/schema'
import { formatSearchReference, laneLabel, mappingLabel, modeLabel } from './search-labels'
import { getResultMatchEvidence } from './search-result-evidence'

export type SearchWorkspaceTab = 'overview' | 'verses' | 'explore' | 'sources'
export type SearchExploreModuleId =
  | 'surah-distribution'
  | 'forms-by-count'
  | 'query-level-morphology-summary'
  | 'translation-context-terms'
  | 'source-boundary'
  | 'following-wording'
  | 'shared-wording'
  | 'repeated-phrases'
  | 'occurs-once'
  | 'ayah-endings'
  | 'counts-patterns'
  | 'selected-token'

export type SearchOverviewAction = {
  label: string
  target: SearchWorkspaceTab
  focusModule?: SearchExploreModuleId
}

export type SearchOverviewFact = {
  label: string
  scope: 'all indexed matches' | 'known results' | 'shown results'
  value: string
}

export type SearchOverviewRankedRow = {
  label: string
  scope: 'all indexed matches' | 'known results' | 'shown results'
  value: string
}

export type SearchOverviewViewModel = {
  actions: SearchOverviewAction[]
  caveat: string | null
  facts: SearchOverviewFact[]
  interpretedAs: string
  primaryMatchType: string
  queryLabel: string
  topForms: SearchOverviewRankedRow[]
  topSurahs: SearchOverviewRankedRow[]
}

export type SearchVerseCardViewModel = {
  canHighlightWordsInRead: boolean
  canOpenInRead: boolean
  id: string
  matchReason: string
  matchTypeLabel: string
  primaryText: string
  refLabel: string
  result: SearchResultDto
  secondaryText: string | null
}

export type SearchDetailsViewModel = {
  alsoMatched: string[]
  evidenceRows: Array<{ label: string; value: string }>
  readerMappingRows: Array<{ label: string; value: string }>
  result: SearchResultDto
  sourceRows: Array<{ label: string; value: string }>
  textRows: Array<{ label: string; value: string }>
  title: string
  whyMatched: string
}

export type SearchSourcesViewModel = {
  mappingSummary: Array<{ label: string; value: string }>
  sourceNotes: Array<{ label: string; value: string }>
  sourceRows: Array<{ label: string; value: string }>
}

export type SearchOutputViewModel = {
  defaultTab: SearchWorkspaceTab
  details: SearchDetailsViewModel | null
  exploreModules: SearchExploreModuleId[]
  overview: SearchOverviewViewModel | null
  sources: SearchSourcesViewModel | null
  tabs: Array<{ label: string; value: SearchWorkspaceTab }>
  verseCards: SearchVerseCardViewModel[]
}
```

- [ ] **Step 2: Add default-tab derivation**

Add these helpers below the types:

```ts
export function defaultTabForParsedSearch(parsed: ParsedSearchQuery, mode: SearchQueryMode): SearchWorkspaceTab {
  if (parsed.reference) return 'verses'
  if (mode === 'phrase') return 'verses'
  if (mode === 'all' && isExplicitPhraseShape(parsed)) return 'verses'
  return 'overview'
}

function isExplicitPhraseShape(parsed: ParsedSearchQuery): boolean {
  const raw = parsed.ast.rawText.trim()
  const hasQuotePair = /^["'“‘].+["'”’]$/.test(raw)
  return hasQuotePair && parsed.phraseTokens.length >= 2
}
```

This preserves the intentional product constraints: phrase mode always opens `Verses`, including high-volume phrase queries, and every submitted search receives a fresh adaptive default. Do not default `exact-word-form` to `Verses`; treat it as an Arabic word search that opens `Overview` unless a future spec changes that rule. Do not treat `parsed.phraseTokens` alone as exact-phrase intent because the current parser also fills that field for broad multi-token Arabic searches.

- [ ] **Step 3: Add overview derivation with scoped counts**

Add:

```ts
export function toOverviewViewModel(brief: SearchBriefDto | null, hasMoreResults: boolean, results: SearchResultDto[]): SearchOverviewViewModel | null {
  if (!brief) return null
  const facts: SearchOverviewFact[] = []
  if (brief.counts.occurrenceCountKnown && brief.counts.occurrenceCount !== null) {
    facts.push({ label: 'Occurrences in this search index', scope: 'all indexed matches', value: String(brief.counts.occurrenceCount) })
  } else {
    facts.push({ label: 'Known results', scope: 'known results', value: String(brief.counts.matchedResultCount) })
  }
  if (brief.counts.matchedSourceAyahCount !== null) {
    facts.push({ label: 'Matched ayat', scope: 'all indexed matches', value: String(brief.counts.matchedSourceAyahCount) })
  }
  facts.push({
    label: 'Shown results',
    scope: 'shown results',
    value: hasMoreResults ? `${brief.counts.shownWindowCount} shown; more available` : String(brief.counts.shownWindowCount),
  })

  return {
    actions: overviewActionsForBrief(brief),
    caveat: caveatForBrief(brief),
    facts,
    interpretedAs: modeLabel(brief.query.mode),
    primaryMatchType: brief.evidenceTypes[0] ? evidenceLabel(brief.evidenceTypes[0]) : 'Search match',
    queryLabel: brief.query.rawText,
    topForms: topFormsForShownResults(results),
    topSurahs: brief.distribution.surahsWithMostIndexedMatches.slice(0, 4).map((item) => ({
      label: `Surah ${item.surah}`,
      scope: 'all indexed matches',
      value: `${item.matchedSourceAyahCount} matched ayat`,
    })),
  }
}

function overviewActionsForBrief(brief: SearchBriefDto): SearchOverviewAction[] {
  const actions: SearchOverviewAction[] = [{ label: 'View verses', target: 'verses' }]
  if (brief.distribution.surahsWithMostIndexedMatches.length > 0) {
    actions.push({ label: 'Show distribution', target: 'explore', focusModule: 'surah-distribution' })
  }
  if (brief.evidenceTypes.some((type) => type === 'same-root' || type === 'lemma' || type === 'same-written-form')) {
    actions.push({ label: 'View forms', target: 'explore', focusModule: 'forms-by-count' })
  }
  actions.push({ label: 'Open Explore', target: 'explore' })
  return actions
}
```

- [ ] **Step 4: Add card, details, sources, and output derivation**

Add:

```ts
export function toVerseCardViewModel(result: SearchResultDto): SearchVerseCardViewModel {
  const evidence = getResultMatchEvidence(result)
  return {
    canHighlightWordsInRead: result.canHighlightWordsInRead,
    canOpenInRead: result.canOpenInRead,
    id: result.resultId,
    matchReason: evidence.whyMatched,
    matchTypeLabel: laneLabel(evidence.lane),
    primaryText: result.sourceText || result.snippet,
    refLabel: formatSearchReference(result.sourceRef),
    result,
    secondaryText: evidence.translationContextExcerpt ?? null,
  }
}

export function toDetailsViewModel(result: SearchResultDto | null): SearchDetailsViewModel | null {
  if (!result) return null
  const evidence = getResultMatchEvidence(result)
  const evidenceRows: Array<{ label: string; value: string }> = [
    { label: 'Matched in', value: laneLabel(evidence.lane) },
  ]
  if (evidence.sourcePosition !== undefined) evidenceRows.push({ label: 'Source word position', value: String(evidence.sourcePosition) })
  if (evidence.sourcePositions?.length) evidenceRows.push({ label: 'Source word positions', value: evidence.sourcePositions.join(', ') })
  if (evidence.wordPosition !== undefined) evidenceRows.push({ label: 'Morphology word position', value: String(evidence.wordPosition) })
  if (evidence.morphology?.root) evidenceRows.push({ label: 'Root', value: evidence.morphology.root })
  if (evidence.morphology?.lemma) evidenceRows.push({ label: 'Lemma', value: evidence.morphology.lemma })

  return {
    alsoMatched: result.matchLanes.filter((lane) => lane !== evidence.lane).map(laneLabel),
    evidenceRows,
    readerMappingRows: [
      { label: 'Opens in Reader', value: result.canOpenInRead ? 'Available' : 'Search source only' },
      { label: 'Corresponding ayah in Reader', value: result.readerRefs.length > 0 ? result.readerRefs.join(', ') : 'No validated Reader target' },
      { label: 'Word highlight', value: result.canHighlightWordsInRead ? 'Available' : 'Word highlight unavailable' },
    ],
    result,
    sourceRows: [
      { label: 'Source ref', value: result.sourceRef },
      { label: 'Reader refs', value: result.readerRefs.length > 0 ? result.readerRefs.join(', ') : 'No validated Reader target' },
      { label: 'Mapping state', value: mappingLabel(result.mappingState) },
    ],
    textRows: [
      { label: 'Search text', value: result.sourceText },
      ...(result.readerText ? [{ label: 'Reader text', value: result.readerText }] : []),
      ...(evidence.translationContextExcerpt ? [{ label: 'Translation/context excerpt', value: evidence.translationContextExcerpt }] : []),
    ],
    title: formatSearchReference(result.sourceRef),
    whyMatched: evidence.whyMatched,
  }
}

export function toSourcesViewModel(brief: SearchBriefDto | null): SearchSourcesViewModel | null {
  if (!brief) return null
  const frame = brief.sourceFrame
  return {
    mappingSummary: Object.entries(brief.mappingStateCounts ?? {}).map(([label, value]) => ({ label, value: String(value) })),
    sourceNotes: brief.sourceNotes.map((note) => ({ label: note.label, value: note.text })),
    sourceRows: [
      { label: 'Pack id', value: frame.packId },
      { label: 'Pack version', value: frame.packVersion },
      { label: 'Pack hash', value: frame.contentHash },
      { label: 'Search source', value: frame.sourceRiwayah },
      { label: 'Source ids', value: frame.sourceIds.join(', ') },
      { label: 'License ids', value: frame.licenseIds.join(', ') },
      { label: 'Normalizer version', value: String(frame.normalizerVersion) },
      { label: 'Query AST version', value: String(frame.queryAstVersion) },
      { label: 'Rank version', value: frame.rankVersion },
      { label: 'Tokenization policy', value: `Search normalizer/tokenizer policy v${frame.normalizerVersion}` },
      { label: 'Boundary policy', value: 'Search matches and graph windows are bounded to indexed source ayah policy.' },
    ],
  }
}

export function deriveSearchOutputViewModel(input: {
  brief: SearchBriefDto | null
  defaultTab: SearchWorkspaceTab
  hasMoreResults: boolean
  results: SearchResultDto[]
  selectedResult: SearchResultDto | null
}): SearchOutputViewModel {
  return {
    defaultTab: input.defaultTab,
    details: toDetailsViewModel(input.selectedResult),
    exploreModules: exploreModulesForBrief(input.brief),
    overview: toOverviewViewModel(input.brief, input.hasMoreResults, input.results),
    sources: toSourcesViewModel(input.brief),
    tabs: [
      { label: 'Overview', value: 'overview' },
      { label: 'Verses', value: 'verses' },
      { label: 'Explore', value: 'explore' },
      { label: 'Sources', value: 'sources' },
    ],
    verseCards: input.results.map(toVerseCardViewModel),
  }
}
```

- [ ] **Step 5: Add local helper functions**

Add:

```ts
function caveatForBrief(brief: SearchBriefDto): string | null {
  if (brief.evidenceTypes.includes('translation-context')) {
    return 'These results match indexed translation/context text, not necessarily exact Arabic wording.'
  }
  if (brief.evidenceTypes.some((type) => type === 'same-root' || type === 'lemma' || type === 'same-written-form')) {
    return 'Same-root matches are morphology aids. They do not imply the same interpretation.'
  }
  return null
}

function evidenceLabel(type: string): string {
  if (type === 'exact-source-phrase') return 'Exact phrase'
  if (type === 'translation-context') return 'Translation/context'
  if (type === 'same-root') return 'Same root'
  if (type === 'same-written-form') return 'Same written form'
  if (type === 'arabic-text') return 'Arabic text'
  return type
}

function exploreModulesForBrief(brief: SearchBriefDto | null): SearchExploreModuleId[] {
  if (!brief) return []
  const modules: SearchExploreModuleId[] = []
  if (brief.distribution.surahsWithMostIndexedMatches.length > 0) modules.push('surah-distribution')
  if (brief.evidenceTypes.some((type) => type === 'same-root' || type === 'lemma' || type === 'same-written-form')) {
    modules.push('forms-by-count', 'query-level-morphology-summary')
  }
  if (brief.evidenceTypes.includes('translation-context')) modules.push('translation-context-terms')
  for (const feature of brief.featureAvailability) {
    if (feature.status !== 'available') continue
    if (feature.section === 'following-wording') modules.push('following-wording')
    if (feature.section === 'shared-wording') modules.push('shared-wording')
    if (feature.section === 'repeated-phrases') modules.push('repeated-phrases')
    if (feature.section === 'occurs-once') modules.push('occurs-once')
    if (feature.section === 'ayah-endings') modules.push('ayah-endings')
    if (feature.section === 'counts-patterns') modules.push('counts-patterns')
  }
  return Array.from(new Set(modules))
}

function topFormsForShownResults(results: SearchResultDto[]): SearchOverviewRankedRow[] {
  const counts = new Map<string, number>()
  for (const result of results) {
    const form = result.morphology?.sourceToken
    if (!form) continue
    counts.set(form, (counts.get(form) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([label, count]) => ({ label, scope: 'shown results', value: `${count} shown result${count === 1 ? '' : 's'}` }))
}
```

- [ ] **Step 6: Run static verification**

Run:

```bash
pnpm run check
```

Expected: command exits `0`.

- [ ] **Step 7: Commit the presentation model**

Run:

```bash
git add src/components/search/search-presentation-model.ts
git commit -m "feat(search): add result workspace view models"
```

## Task 3: Add Workspace Tab State To Search Route

**Files:**
- Modify: `src/components/search/useSearchRouteState.ts`

- [ ] **Step 1: Import presentation-model helpers**

Add imports near the existing Search imports:

```ts
import { defaultTabForParsedSearch, type SearchExploreModuleId, type SearchWorkspaceTab } from './search-presentation-model'
```

- [ ] **Step 2: Extend route state types**

Add to `SearchRouteState`:

```ts
  activeWorkspaceTab: SearchWorkspaceTab
  defaultWorkspaceTab: SearchWorkspaceTab
  exploreSeedResult: SearchResultDto | null
  focusedExploreModule: SearchExploreModuleId | null
  openResultExplore: (result: SearchResultDto, module?: SearchExploreModuleId) => void
  setActiveWorkspaceTab: (tab: SearchWorkspaceTab) => void
  setExploreSeedResult: (result: SearchResultDto | null) => void
  setFocusedExploreModule: (module: SearchExploreModuleId | null) => void
```

- [ ] **Step 3: Add state values inside `useSearchRouteState`**

Add state near the existing result state:

```ts
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<SearchWorkspaceTab>('overview')
  const [defaultWorkspaceTab, setDefaultWorkspaceTab] = useState<SearchWorkspaceTab>('overview')
  const [exploreSeedResult, setExploreSeedResult] = useState<SearchResultDto | null>(null)
  const [focusedExploreModule, setFocusedExploreModule] = useState<SearchExploreModuleId | null>(null)
```

- [ ] **Step 4: Reset workspace state when clearing evidence**

Inside `resetEvidenceState`, after clearing `activeQueryRef.current`, add:

```ts
    setActiveWorkspaceTab('overview')
    setDefaultWorkspaceTab('overview')
    setExploreSeedResult(null)
    setFocusedExploreModule(null)
```

- [ ] **Step 5: Set a fresh default tab for every submitted query**

Inside `submitSearch`, after `parseSearchQuery` succeeds and before `client.query`, add:

```ts
    const nextDefaultTab = defaultTabForParsedSearch(parsed, effectiveMode)
    setDefaultWorkspaceTab(nextDefaultTab)
    setActiveWorkspaceTab(nextDefaultTab)
    setExploreSeedResult(null)
    setFocusedExploreModule(null)
```

This must run for every submitted search, including saved-search loads. Do not preserve the previous active tab.

- [ ] **Step 6: Preserve selected result behavior for `Verses` and `Details`**

Keep the current first-result selection after a query:

```ts
      selectedResultRef.current = window.results[0] ?? null
      setSelectedResult(window.results[0] ?? null)
```

Do not use `selectedResult` as the implicit seed for query-level `Explore`.

- [ ] **Step 7: Add explicit result Explore action**

Add this callback near `setSearchSelectedResult`:

```ts
  const openResultExplore = useCallback((result: SearchResultDto, module: SearchExploreModuleId = 'selected-token') => {
    selectedResultRef.current = result
    setSelectedResult(result)
    setExploreSeedResult(result)
    setFocusedExploreModule(module)
    setActiveWorkspaceTab('explore')
  }, [])
```

Selected-result or selected-token Explore must only use `exploreSeedResult`, which is set by this explicit action. It must not silently follow `selectedResult`.

- [ ] **Step 8: Return the new route state values**

Add to the returned object:

```ts
    activeWorkspaceTab,
    defaultWorkspaceTab,
    exploreSeedResult,
    focusedExploreModule,
    openResultExplore,
    setActiveWorkspaceTab,
    setExploreSeedResult,
    setFocusedExploreModule,
```

- [ ] **Step 9: Run static verification**

Run:

```bash
pnpm run check
```

Expected: command exits `0`.

- [ ] **Step 10: Commit route-state changes**

Run:

```bash
git add src/components/search/useSearchRouteState.ts
git commit -m "feat(search): track workspace tab defaults"
```

## Task 4: Create The Query-Level Workspace Shell

**Files:**
- Create: `src/components/search/SearchWorkspace.tsx`
- Modify: `src/components/search/SearchShell.tsx`

- [ ] **Step 1: Create `SearchWorkspace.tsx`**

Create a component that receives the view model, tab state, and existing callbacks:

```tsx
import { useMemo, useRef } from 'react'

import type { SearchResultDto } from '../../search/schema'
import { Tabs } from '../ui'
import { SearchExplorePanel } from './SearchExplorePanel'
import { SearchOverview } from './SearchOverview'
import { SearchResultDetail } from './SearchResultDetail'
import { SearchResultList } from './SearchResultList'
import { SearchSourcePanel } from './SearchSourcePanel'
import { deriveSearchOutputViewModel, type SearchExploreModuleId, type SearchWorkspaceTab } from './search-presentation-model'
import type { SearchExploreGraphState } from './useSearchRouteState'

type SearchWorkspaceProps = {
  activeTab: SearchWorkspaceTab
  brief: Parameters<typeof deriveSearchOutputViewModel>[0]['brief']
  canLoadMore: boolean
  defaultTab: SearchWorkspaceTab
  emptyMessage: string
  exploreGraph: SearchExploreGraphState
  exploreSeedResult: SearchResultDto | null
  focusedExploreModule: SearchExploreModuleId | null
  hasMore: boolean
  onActiveTabChange: (tab: SearchWorkspaceTab) => void
  onFocusExploreModule: (module: SearchExploreModuleId | null) => void
  onLoadExploreGraph: (result: SearchResultDto) => void
  onLoadMore: () => void
  onOpenInRead: (result: SearchResultDto) => void
  onOpenResultExplore: (result: SearchResultDto, module?: SearchExploreModuleId) => void
  onSelectResult: (result: SearchResultDto | null) => void
  packVersion?: string
  resultCountMessage: string
  results: SearchResultDto[]
  selectedResult: SearchResultDto | null
}
```

- [ ] **Step 2: Implement the workspace body**

Add the component body:

```tsx
export function SearchWorkspace(props: SearchWorkspaceProps) {
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const viewModel = useMemo(() => deriveSearchOutputViewModel({
    brief: props.brief,
    defaultTab: props.defaultTab,
    hasMoreResults: props.hasMore,
    results: props.results,
    selectedResult: props.selectedResult,
  }), [props.brief, props.defaultTab, props.hasMore, props.results, props.selectedResult])

  function openTab(tab: SearchWorkspaceTab, focusModule?: SearchExploreModuleId) {
    props.onActiveTabChange(tab)
    props.onFocusExploreModule(focusModule ?? null)
  }

  return (
    <section aria-label="Search result workspace" className="qar-search-workspace">
      <Tabs
        label="Search result views"
        onValueChange={(value) => openTab(value as SearchWorkspaceTab)}
        value={props.activeTab}
        items={[
          {
            label: 'Overview',
            value: 'overview',
            content: (
              <SearchOverview
                overview={viewModel.overview}
                onAction={(action) => openTab(action.target, action.focusModule)}
              />
            ),
          },
          {
            label: 'Verses',
            value: 'verses',
            content: (
              <div className="qar-search-verses-panel">
                {props.resultCountMessage ? <p className="qar-search-result-count">{props.resultCountMessage}</p> : null}
                <SearchResultList
                  canLoadMore={props.canLoadMore}
                  cards={viewModel.verseCards}
                  emptyMessage={props.emptyMessage}
                  hasMore={props.hasMore}
                  onDetailsTrigger={(node) => { detailsTriggerRef.current = node }}
                  onLoadMore={props.onLoadMore}
                  onOpenInRead={props.onOpenInRead}
                  onSelect={props.onSelectResult}
                  selectedResultId={props.selectedResult?.resultId}
                />
                <SearchResultDetail
                  details={viewModel.details}
                  onClose={() => {
                    props.onSelectResult(null)
                    detailsTriggerRef.current?.focus()
                  }}
                  onOpenExplore={props.onOpenResultExplore}
                />
              </div>
            ),
          },
          {
            label: 'Explore',
            value: 'explore',
            content: (
              <SearchExplorePanel
                focusedModule={props.focusedExploreModule}
                graph={props.exploreGraph}
                modules={viewModel.exploreModules}
                onLoadGraph={props.onLoadExploreGraph}
                seedResult={props.exploreSeedResult}
              />
            ),
          },
          {
            label: 'Sources',
            value: 'sources',
            content: <SearchSourcePanel packVersion={props.packVersion} sources={viewModel.sources} />,
          },
        ]}
      />
    </section>
  )
}
```

If `SearchResultList`, `SearchResultDetail`, `SearchExplorePanel`, or `SearchSourcePanel` do not yet accept these props, keep this file aligned with the planned prop updates in later tasks.

- [ ] **Step 3: Update `SearchShell.tsx` imports**

Remove:

```ts
import { SearchBrief } from './SearchBrief'
import { SearchResultDetail } from './SearchResultDetail'
import { SearchResultList } from './SearchResultList'
```

Add:

```ts
import { SearchWorkspace } from './SearchWorkspace'
```

- [ ] **Step 4: Replace the old brief/list/detail render**

Replace the `SearchBrief` and `qar-search-workspace` block with:

```tsx
            <SearchWorkspace
              activeTab={search.activeWorkspaceTab}
              brief={search.brief}
              canLoadMore={search.canLoadMoreResults}
              defaultTab={search.defaultWorkspaceTab}
              emptyMessage={search.emptyResultMessage}
              exploreGraph={search.exploreGraph}
              exploreSeedResult={search.exploreSeedResult}
              focusedExploreModule={search.focusedExploreModule}
              hasMore={search.hasMoreResults}
              onActiveTabChange={search.setActiveWorkspaceTab}
              onFocusExploreModule={search.setFocusedExploreModule}
              onLoadExploreGraph={search.loadExploreGraph}
              onLoadMore={search.loadMoreResults}
              onOpenInRead={openInRead}
              onOpenResultExplore={search.openResultExplore}
              onSelectResult={search.setSelectedResult}
              packVersion={search.packVersion}
              resultCountMessage={search.resultCountMessage}
              results={search.results}
              selectedResult={search.selectedResult}
            />
```

- [ ] **Step 5: Run static verification**

Run:

```bash
pnpm run check
```

Expected: command exits `0` after the later component tasks are completed. If this task is executed alone, TypeScript may fail until Tasks 5-8 update component props.

- [ ] **Step 6: Commit when component prop updates are complete**

Do not commit this task by itself if TypeScript is red. Commit with Tasks 5-8:

```bash
git add src/components/search/SearchWorkspace.tsx src/components/search/SearchShell.tsx
git commit -m "feat(search): add result workspace shell"
```

## Task 5: Replace Search Brief With Overview

**Files:**
- Create or rename: `src/components/search/SearchOverview.tsx`
- Stop importing: `src/components/search/SearchBrief.tsx`

- [ ] **Step 1: Create `SearchOverview.tsx`**

Use this component shape:

```tsx
import { Button, Badge } from '../ui'
import type { SearchOverviewAction, SearchOverviewViewModel } from './search-presentation-model'

type SearchOverviewProps = {
  onAction: (action: SearchOverviewAction) => void
  overview: SearchOverviewViewModel | null
}

export function SearchOverview({ onAction, overview }: SearchOverviewProps) {
  if (!overview) {
    return <p className="qar-search-results-empty">Enter a word, phrase, or ayah reference.</p>
  }

  return (
    <section aria-labelledby="search-overview-title" className="qar-search-overview">
      <div className="qar-search-overview-head">
        <div>
          <p className="qar-search-overview-eyebrow">Overview</p>
          <h2 className="qar-search-overview-title" id="search-overview-title" dir="auto">
            <bdi>{overview.queryLabel}</bdi>
          </h2>
          <p className="qar-search-overview-mode">{overview.interpretedAs}</p>
        </div>
        <Badge>{overview.primaryMatchType}</Badge>
      </div>

      <dl className="qar-search-overview-facts">
        {overview.facts.map((fact) => (
          <div key={`${fact.label}:${fact.scope}`}>
            <dt>{fact.label}</dt>
            <dd><bdi>{fact.value}</bdi></dd>
            <small>{fact.scope}</small>
          </div>
        ))}
      </dl>

      {overview.topSurahs.length > 0 ? (
        <section aria-label="Top surah distribution" className="qar-search-overview-list">
          <h3>Top Surahs</h3>
          {overview.topSurahs.map((row) => (
            <p key={row.label}><span>{row.label}</span><bdi>{row.value}</bdi><small>{row.scope}</small></p>
          ))}
        </section>
      ) : null}

      {overview.topForms.length > 0 ? (
        <section aria-label="Top forms" className="qar-search-overview-list">
          <h3>Forms by count</h3>
          {overview.topForms.map((row) => (
            <p key={row.label}><span>{row.label}</span><bdi>{row.value}</bdi><small>{row.scope}</small></p>
          ))}
        </section>
      ) : null}

      {overview.caveat ? <p className="qar-search-overview-note">{overview.caveat}</p> : null}

      <div className="qar-search-overview-actions">
        {overview.actions.map((action, index) => (
          <Button key={action.label} onClick={() => onAction(action)} size="sm" variant={index === 0 ? 'primary' : 'secondary'}>
            {action.label}
          </Button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Remove default UI references to banned brief labels**

Ensure default UI no longer renders these labels:

```text
Search Brief
Explore evidence
Indexed occurrences
Matched result rows
Hafs Search source
Reader highlight unavailable
```

Use `rg` to check:

```bash
rg -n "Search Brief|Explore evidence|Indexed occurrences|Matched result rows|Hafs Search source|Reader highlight unavailable" src/components/search
```

Expected: no default workspace component renders those strings. Source/provenance labels may still appear in result Details or query Sources only when they match the spec.

- [ ] **Step 3: Commit with workspace shell**

Commit together with Task 4 if needed:

```bash
git add src/components/search/SearchOverview.tsx src/components/search/SearchWorkspace.tsx src/components/search/SearchShell.tsx
git commit -m "feat(search): replace brief with overview tab"
```

## Task 6: Make Verses Cards Minimal

**Files:**
- Modify: `src/components/search/SearchResultList.tsx`
- Modify: `src/components/search/SearchResultCard.tsx`

- [ ] **Step 1: Update `SearchResultList` props**

Change the list to accept `cards` from the presentation model:

```tsx
import type { SearchResultDto } from '../../search/schema'
import { Button } from '../ui'
import { SearchResultCard } from './SearchResultCard'
import type { SearchVerseCardViewModel } from './search-presentation-model'

export function SearchResultList({
  canLoadMore,
  cards,
  emptyMessage,
  hasMore,
  onDetailsTrigger,
  onLoadMore,
  onOpenInRead,
  onSelect,
  selectedResultId,
}: {
  canLoadMore?: boolean
  cards: SearchVerseCardViewModel[]
  emptyMessage?: string
  hasMore?: boolean
  onDetailsTrigger?: (node: HTMLButtonElement | null) => void
  onLoadMore?: () => void
  onOpenInRead: (result: SearchResultDto) => void
  onSelect: (result: SearchResultDto) => void
  selectedResultId?: string
}) {
  if (cards.length === 0) {
    return <p className="qar-search-results-empty">{emptyMessage ?? 'Enter a word, phrase, or ayah reference.'}</p>
  }
  return (
    <section aria-label="Verses" className="qar-search-result-list">
      {cards.map((card) => (
        <SearchResultCard
          card={card}
          key={card.id}
          onDetailsTrigger={onDetailsTrigger}
          onOpenInRead={onOpenInRead}
          onSelect={onSelect}
          selected={card.id === selectedResultId}
        />
      ))}
      {hasMore ? (
        <Button disabled={!canLoadMore} onClick={onLoadMore} type="button" variant="secondary">
          {canLoadMore ? 'Load more results' : 'Loading more results'}
        </Button>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 2: Update `SearchResultCard` props and labels**

Replace the current card implementation with:

```tsx
import type { SearchResultDto } from '../../search/schema'
import { Badge, Button } from '../ui'
import type { SearchVerseCardViewModel } from './search-presentation-model'

export function SearchResultCard({
  card,
  onDetailsTrigger,
  onOpenInRead,
  onSelect,
  selected,
}: {
  card: SearchVerseCardViewModel
  onDetailsTrigger?: (node: HTMLButtonElement | null) => void
  onOpenInRead: (result: SearchResultDto) => void
  onSelect: (result: SearchResultDto) => void
  selected?: boolean
}) {
  const primaryIsOpen = card.canOpenInRead
  return (
    <article
      aria-label={`Search result ${card.refLabel}`}
      aria-current={selected ? 'true' : undefined}
      className="qar-search-result-row"
      data-selected={selected ? 'true' : undefined}
    >
      <div className="qar-search-result-row-head">
        <p className="qar-search-result-ref" dir="auto">{card.refLabel}</p>
        <Badge>{card.matchTypeLabel}</Badge>
      </div>
      <div className="qar-search-result-passages">
        <p className="qar-search-result-snippet" dir="auto"><bdi>{card.primaryText}</bdi></p>
        {card.secondaryText ? <p className="qar-search-result-context" dir="auto"><bdi>{card.secondaryText}</bdi></p> : null}
      </div>
      <p className="qar-search-result-why" dir="auto">
        <span>Matched:</span> <bdi>{card.matchReason}</bdi>
      </p>
      <div className="qar-search-result-actions">
        {primaryIsOpen ? (
          <Button onClick={() => onOpenInRead(card.result)} size="sm" variant="primary">Open in Read</Button>
        ) : null}
        <Button
          ref={onDetailsTrigger}
          onClick={() => onSelect(card.result)}
          size="sm"
          variant={primaryIsOpen ? 'secondary' : 'primary'}
        >
          Details
        </Button>
      </div>
    </article>
  )
}
```

- [ ] **Step 3: Run copy audit**

Run:

```bash
rg -n "Inspect match|Hafs Search source|Reader highlight unavailable|Source token" src/components/search/SearchResultCard.tsx
```

Expected: no matches.

- [ ] **Step 4: Run static verification**

Run:

```bash
pnpm run check
```

Expected: command exits `0` after dependent tasks compile.

- [ ] **Step 5: Commit card/list updates**

Run:

```bash
git add src/components/search/SearchResultList.tsx src/components/search/SearchResultCard.tsx
git commit -m "feat(search): simplify verse result cards"
```

## Task 7: Rework Per-Result Details

**Files:**
- Modify: `src/components/search/SearchResultDetail.tsx`
- Modify: `src/components/search/SearchSourcePanel.tsx`

- [ ] **Step 1: Replace nested result tabs with sections**

Update `SearchResultDetail` to accept `details` from the presentation model:

```tsx
import type { ReactNode } from 'react'

import { Button } from '../ui'
import type { SearchDetailsViewModel, SearchExploreModuleId } from './search-presentation-model'

export function SearchResultDetail({
  details,
  onClose,
  onOpenExplore,
}: {
  details: SearchDetailsViewModel | null
  onClose?: () => void
  onOpenExplore?: (result: SearchDetailsViewModel['result'], module?: SearchExploreModuleId) => void
}) {
  if (!details) {
    return (
      <aside aria-label="Search result detail" className="qar-search-result-detail">
        <p className="qar:m-0 qar:text-sm qar:text-muted">Choose a verse and open Details to inspect why it matched.</p>
      </aside>
    )
  }

  return (
    <aside aria-label={`Details for ${details.title}`} className="qar-search-result-detail">
      <div className="qar:flex qar:items-start qar:justify-between qar:gap-3">
        <div>
          <p className="qar:m-0 qar:text-xs qar:font-semibold qar:uppercase qar:text-muted">Details</p>
          <h3 className="qar:m-0 qar:text-lg qar:leading-tight" dir="auto"><bdi>{details.title}</bdi></h3>
        </div>
        {onClose ? <Button onClick={onClose} size="sm" variant="ghost">Close</Button> : null}
      </div>
      <DetailSection title="Why this matched">
        <p className="qar:m-0" dir="auto"><bdi>{details.whyMatched}</bdi></p>
        {details.alsoMatched.length > 0 ? (
          <p className="qar:m-0 qar:text-sm qar:text-muted" dir="auto">Also matched: <bdi>{details.alsoMatched.join(', ')}</bdi></p>
        ) : null}
        {onOpenExplore ? (
          <Button onClick={() => onOpenExplore(details.result, 'selected-token')} size="sm" variant="secondary">
            Explore selected result
          </Button>
        ) : null}
      </DetailSection>
      <DetailRows title="Texts" rows={details.textRows} />
      <DetailRows title="Reader mapping" rows={details.readerMappingRows} />
      <DetailRows title="Evidence" rows={details.evidenceRows} />
      <DetailRows title="Sources" rows={details.sourceRows} />
    </aside>
  )
}
```

- [ ] **Step 2: Add local detail helpers**

Append to the same file:

```tsx
function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="qar:grid qar:gap-2">
      <h4 className="qar:m-0 qar:text-sm qar:font-semibold">{title}</h4>
      {children}
    </section>
  )
}

function DetailRows({ rows, title }: { rows: Array<{ label: string; value: string }>; title: string }) {
  if (rows.length === 0) return null
  return (
    <DetailSection title={title}>
      <dl className="qar:grid qar:gap-2">
        {rows.map((row) => (
          <div className="qar:grid qar:gap-1" key={`${title}:${row.label}`}>
            <dt className="qar:text-xs qar:text-muted">{row.label}</dt>
            <dd className="qar:m-0" dir="auto"><bdi>{row.value}</bdi></dd>
          </div>
        ))}
      </dl>
    </DetailSection>
  )
}
```

- [ ] **Step 3: Split `SearchSourcePanel` into query-level sources**

Change `SearchSourcePanel` props to accept `sources`:

```tsx
import type { SearchSourcesViewModel } from './search-presentation-model'

export function SearchSourcePanel({
  sources,
}: {
  packVersion?: string
  sources: SearchSourcesViewModel | null
}) {
  if (!sources) {
    return <p className="qar-search-results-empty">Run a search to inspect query sources.</p>
  }
  return (
    <div className="qar-search-source-panel">
      <SourceRows title="Search index" rows={sources.sourceRows} />
      <SourceRows title="Reader mapping summary" rows={sources.mappingSummary} />
      <SourceRows title="Result boundary notes" rows={sources.sourceNotes} />
    </div>
  )
}
```

- [ ] **Step 4: Add `SourceRows` helper**

Append:

```tsx
function SourceRows({ rows, title }: { rows: Array<{ label: string; value: string }>; title: string }) {
  if (rows.length === 0) return null
  return (
    <section className="qar:grid qar:gap-2 qar:text-sm">
      <h3 className="qar:m-0 qar:text-sm qar:font-semibold">{title}</h3>
      <dl className="qar:grid qar:gap-2">
        {rows.map((row) => (
          <div className="qar:grid qar:gap-1" key={`${title}:${row.label}`}>
            <dt className="qar:text-muted">{row.label}</dt>
            <dd className="qar:m-0" dir="auto"><bdi>{row.value}</bdi></dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
```

- [ ] **Step 5: Run static verification**

Run:

```bash
pnpm run check
```

Expected: command exits `0` after dependent tasks compile.

- [ ] **Step 6: Commit Details/Sources split**

Run:

```bash
git add src/components/search/SearchResultDetail.tsx src/components/search/SearchSourcePanel.tsx
git commit -m "feat(search): split result details from query sources"
```

## Task 8: Make Explore Query-Level And Explicit

**Files:**
- Modify: `src/components/search/SearchExplorePanel.tsx`
- Modify only if labels are needed: `src/components/search/search-labels.ts`

- [ ] **Step 1: Update Explore props**

Change `SearchExplorePanel` props:

```tsx
import type { SearchResultDto } from '../../search/schema'
import { SearchMorphologyPanel } from './SearchMorphologyPanel'
import { SearchGraphExplore } from './SearchGraphExplore'
import type { SearchExploreModuleId } from './search-presentation-model'
import type { SearchExploreGraphState } from './useSearchRouteState'

export function SearchExplorePanel({
  focusedModule,
  graph,
  modules,
  onLoadGraph,
  seedResult,
}: {
  focusedModule?: SearchExploreModuleId | null
  graph?: SearchExploreGraphState
  modules: SearchExploreModuleId[]
  onLoadGraph?: (result: SearchResultDto) => void
  seedResult?: SearchResultDto | null
}) {
  const graphState = graph ?? { error: null, loading: false, resultId: null, sections: [] }
  if (modules.length === 0) {
    return <p className="qar-search-results-empty">No Explore modules are available for this query.</p>
  }
  return (
    <div className="qar-search-explore-panel" data-focused-module={focusedModule ?? undefined}>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Explore is query-level unless a selected-token action is opened from Details.
      </p>
      <ExploreModuleList modules={modules} />
      {seedResult ? (
        <section aria-label="Selected-token morphology details" className="qar:grid qar:gap-2">
          <h3 className="qar:m-0 qar:text-sm qar:font-semibold">Selected-token morphology details</h3>
          <SearchMorphologyPanel result={seedResult} />
        </section>
      ) : null}
      {seedResult && hasGraphModule(modules) ? (
        <SearchGraphExplore graph={graphState} onLoad={onLoadGraph} result={seedResult} />
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Add Explore helpers**

Append:

```tsx
function ExploreModuleList({ modules }: { modules: SearchExploreModuleId[] }) {
  return (
    <ul className="qar-search-explore-modules">
      {modules.map((module) => (
        <li key={module}>{exploreModuleLabel(module)}</li>
      ))}
    </ul>
  )
}

function exploreModuleLabel(module: SearchExploreModuleId): string {
  if (module === 'surah-distribution') return 'Surah distribution'
  if (module === 'forms-by-count') return 'Forms by count'
  if (module === 'query-level-morphology-summary') return 'Query-level morphology summary'
  if (module === 'translation-context-terms') return 'Matched translation/context terms'
  if (module === 'source-boundary') return 'Source/context boundary'
  if (module === 'following-wording') return 'Attested following wording'
  if (module === 'shared-wording') return 'Shared wording'
  if (module === 'repeated-phrases') return 'Repeated phrases'
  if (module === 'occurs-once') return 'Occurs once'
  if (module === 'ayah-endings') return 'Ayah endings'
  if (module === 'counts-patterns') return 'Counts & patterns'
  return 'Selected-token morphology details'
}

function hasGraphModule(modules: SearchExploreModuleId[]): boolean {
  return modules.some((module) => (
    module === 'following-wording'
    || module === 'shared-wording'
    || module === 'repeated-phrases'
    || module === 'occurs-once'
    || module === 'ayah-endings'
    || module === 'counts-patterns'
  ))
}
```

- [ ] **Step 3: Preserve lazy graph behavior and explicit seeds**

Do not change the worker `explore` protocol in this task. Keep graph loading behind explicit user action in `SearchGraphExplore`; query-level Explore may list modules and source boundaries before graph sections load. `SearchExplorePanel` must only pass a result to `SearchMorphologyPanel` or `SearchGraphExplore` when `seedResult` was set by the explicit Details action from Task 7.

- [ ] **Step 4: Run static verification**

Run:

```bash
pnpm run check
```

Expected: command exits `0`.

- [ ] **Step 5: Commit Explore changes**

Run:

```bash
git add src/components/search/SearchExplorePanel.tsx src/components/search/search-labels.ts
git commit -m "feat(search): make explore workspace explicit"
```

## Task 9: Update Labels, Stories, Registry, And CSS

**Files:**
- Modify: `src/components/search/search-labels.ts`
- Modify: `src/components/search/search.stories.tsx`
- Modify: `src/design-system/index.css`
- Modify: `src/design-system/registry/component-registry.json`

- [ ] **Step 1: Update labels**

In `search-labels.ts`, make user-facing labels match the spec:

```ts
if (lane === 'surah-context') return 'Morphology-based Surah distribution'
```

Keep `Hafs Search source` out of default card labels. Use source-boundary wording only inside Details/Sources.

- [ ] **Step 2: Replace brief CSS names with overview/workspace names**

In `src/design-system/index.css`, replace `.qar-search-brief*` selectors with `.qar-search-overview*` selectors. Keep the same calm density, semantic tokens, and responsive constraints.

Add styles for:

```css
.qar-search-workspace { min-width: 0; }
.qar-search-overview { display: grid; gap: 10px; min-width: 0; }
.qar-search-overview-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 6px; }
.qar-search-verses-panel { display: grid; gap: 10px; min-width: 0; }
.qar-search-explore-panel { display: grid; gap: 10px; min-width: 0; }
.qar-search-source-panel { display: grid; gap: 12px; min-width: 0; }
.qar-search-explore-modules { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
```

- [ ] **Step 3: Adjust responsive details layout**

Keep mobile Details full-width or sheet-like and tablet/desktop side-by-side for `Verses + Details`. Preserve nav-open exceptions.

Use these selectors as the implementation target:

```css
@media (min-width: 768px) {
  .qar-search-verses-panel {
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.72fr);
    align-items: start;
  }
}

@media (min-width: 1180px) {
  .qar-search-verses-panel {
    grid-template-columns: minmax(0, 1fr) 25rem;
  }
}
```

- [ ] **Step 4: Update stories**

In `search.stories.tsx`, replace `Brief*` story names with workspace states:

```text
OverviewBroad
OverviewMorphology
VersesReference
VersesPhrase
ExploreMissingPacks
Sources
DetailsNoMapping
MobileDetails
```

Stories should render the new components using fixture `SearchBriefDto` and `SearchResultDto` data. Do not add automated assertions in this task.

- [ ] **Step 5: Update registry**

In `component-registry.json`, update the Search component slots from:

```json
"brief",
"matchedVerses",
"inspector"
```

to:

```json
"workspaceTabs",
"overview",
"verses",
"explore",
"sources",
"details",
"mobileDetails"
```

Update story states to match the new Storybook exports.

- [ ] **Step 6: Run static verification**

Run:

```bash
pnpm run check
```

Expected: command exits `0`.

- [ ] **Step 7: Commit UI support updates**

Run:

```bash
git add src/components/search/search-labels.ts src/components/search/search.stories.tsx src/design-system/index.css src/design-system/registry/component-registry.json
git commit -m "feat(search): style result workspace states"
```

## Task 10: Update Current-State Docs

**Files:**
- Modify: `docs/context/surfaces/search.md`
- Modify if stale: `docs/context/implemented.md`
- Modify if stale: `docs/product-info.md`

- [ ] **Step 1: Update Search surface behavior prose**

In `docs/context/surfaces/search.md`, update non-generated behavior paragraphs to describe:

```text
Search renders a query-level workspace with Overview, Verses, Explore, and Sources.
Every submitted query receives a fresh adaptive default tab.
Exact phrase queries and ayah reference queries default to Verses.
Broad Arabic, morphology, translation, and context queries default to Overview.
Verse cards are minimal and ayah-first.
Per-result Details contains result evidence, Reader mapping, and result-level sources.
Query-level Sources contains query/search-pack provenance and aggregate mapping summary.
Explore remains lazy and source-backed.
```

Do not edit generated inventory/test/data/event fences by hand.

- [ ] **Step 2: Check implemented/product docs**

Run:

```bash
rg -n "Search Brief|Matched verses|Phase 1|root|wording graph|Explore" docs/context/implemented.md docs/product-info.md
```

If any current-state text contradicts the shipped Search workspace or current morphology/graph Search behavior, update only that current-state text.

- [ ] **Step 3: Regenerate generated docs if inventories changed**

Run:

```bash
pnpm run docs
```

Expected: command exits `0`. Generated fences may update if new Search files were created.

- [ ] **Step 4: Verify docs**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit docs**

Run:

```bash
git add docs/context/surfaces/search.md docs/context/implemented.md docs/product-info.md .docs-derive-manifest.json
git commit -m "docs(search): document result workspace"
```

## Task 11: Browser Proof And Final Static Gate

**Files:**
- No required source edits.
- Use local dev server or Storybook for proof.

- [ ] **Step 1: Run final static gate**

Run:

```bash
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 2: Start a local browser target**

For app proof, run:

```bash
pnpm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 3: Browser-proof workspace states**

Use the in-app Browser or Playwright CLI development proof. Check:

```text
390x844: broad query defaults to Overview; no verse preview in Overview.
320x568: Details opens without horizontal overflow; closing Details returns focus to Details trigger.
768x1024: Verses + Details layout is usable; nav drawer open does not overlap controls.
1280x800: Sources tab shows query/search-pack provenance, not per-result source refs as global facts.
Phrase query: defaults to Verses, including high-volume phrase query.
Saved search load: reruns query and receives a fresh adaptive default tab.
Explore missing modules: Explore tab remains visible and shows empty/unavailable state.
```

- [ ] **Step 4: Stop the dev server**

Stop the server process from Step 2. Do not leave long-running sessions open.

- [ ] **Step 5: Optional automated tests only with explicit approval**

If the user grants test update approval, read `tests/unit/AGENTS.md` or `tests/e2e/AGENTS.md` before editing tests. Likely targets:

```bash
pnpm exec vitest run tests/unit/react-search/search-route.test.tsx --reporter=dot
PLAYWRIGHT_SKIP_BUILD=1 pnpm run test:e2e:preview -- tests/e2e/search/react-search.spec.ts --reporter=line
PLAYWRIGHT_SKIP_BUILD=1 pnpm run test:e2e:preview -- --include-offline tests/e2e/search/react-search-offline.spec.ts --reporter=line
```

Without explicit approval, do not edit tests.

- [ ] **Step 6: Final commit if browser proof required polish**

If proof required source edits, commit them:

```bash
git add src/components/search src/design-system/index.css src/design-system/registry/component-registry.json docs/context/surfaces/search.md .docs-derive-manifest.json
git commit -m "fix(search): polish result workspace proof"
```

## Self-Review Checklist

- [ ] Spec coverage: every requirement in `docs/superpowers/specs/2026-06-01-search-result-workspace-design.md` maps to a task above.
- [ ] Product constraints: exact phrase queries always default to `Verses`, and every submitted query receives a fresh adaptive default tab.
- [ ] Worker contract: existing `SearchResultWindow` shape remains usable; no worker changes are required for the UI-only workspace unless implementation discovers missing data.
- [ ] Source split: query-level `Sources` contains query/search-pack provenance; result source refs, Reader refs, mapping state, and morphology row details remain in per-result `Details`.
- [ ] Count scope: Overview and view models label `Occurrences`, `Matched ayat`, `Known results`, and `Shown results` correctly.
- [ ] Explore scope: query-level Explore does not silently depend on selected result; selected-token exploration is explicit.
- [ ] Test policy: no automated test edits happen unless the user explicitly approves test coverage.
- [ ] Dirty tree: active pre-existing Search changes and untracked Search files are preserved unless deliberately renamed by the implementation.
