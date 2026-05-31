# Search Brief Result UX Design

## Purpose

Search should help a user understand a search key across the indexed Quran, then inspect the evidence verse by verse. The current list-first output makes the user decode individual rows before they know how the query matched the indexed sources. The improved experience makes the first output a single deterministic Search Brief backed by the active Search index.

The Search Brief is not tafsir, a semantic answer, an AI assistant response, generated Quran text, or a reflection prompt. It is a source-backed evidence overview that summarizes what the Search index can prove about the query and exposes drilldown paths into every matched ayah.

## Product Direction

Use **Source-Backed Search Brief** as the core output model.

After a valid query runs, Search renders:

1. **Search Brief**
   A query-wide evidence overview computed from the full result set.
2. **Matched verses**
   Ayah-first evidence cards for every returned result window, with load-more when available.
3. **Result inspector**
   Per-result `Match`, `Explore`, and `Source` detail for deeper proof.

The brief is the compact evidence orientation. The result cards and inspector are the evidence trail, and Read remains the primary destination for sustained Quran reading.

## Capability Contract

The optimized Search output must preserve the full Search product promise:

- A user can find exact Quran text in the Hafs/Tanzil Search source through normalized Arabic text, exact word form, and exact source phrase modes.
- A user can inspect each match and see why that ayah belongs to the result set.
- A user can open mapped results in Read only through validated click-time Reader mapping.
- A user can save searches as query definitions, then reload them later against the active compatible Search index.
- A user can explore roots, morphology, same written forms, and lemmas when the morphology feature is active.
- A user can inspect wording continuations as attested following wording, not prediction or generated completion.
- A user can inspect shared indexed wording, repeated source phrases, occurs-once phrases, ayah-ending wording, index counts, and source details.
- A user can tell which evidence comes from core Search data, optional morphology data, optional graph data, or source/provenance records.

## Non-Goals

- Do not infer meanings, lessons, rulings, sabab, themes, or interpretive conclusions from lexical matches.
- Do not call shared wording a shared topic, related meaning, or equivalent interpretation.
- Do not present translation/context matches as tafsir.
- Do not present Hafs morphology as Qalun/Qaloon-native data.
- Do not enable Reader word highlighting for Hafs morphology results.
- Do not summarize the whole matched set from a paged result window.
- Do not treat `totalKnownResults` as an ayah count when result DTOs can represent multiple matches for one source ayah.
- Do not use chat UI patterns such as avatars, message bubbles, streaming text, or assistant phrasing.

## Core User Outcomes

A user should be able to answer:

- What exact key did I search, and how was it normalized?
- Can I search exact Quran text, exact word forms, or exact Arabic phrases and see the indexed Arabic match evidence?
- Which evidence type matched: reference, Arabic text, exact word form, exact phrase, translation/context, or a morphology aid such as same written form, same root, or lemma?
- How many matching source ayat, result rows, shown results, and indexed occurrences are known in the active Search index?
- Where does the key appear across the active Search index in Mushaf order and surah distribution?
- Why does each individual ayah belong to the matched set?
- Which parts are direct indexed evidence, which parts are morphology aids, and which source boundaries apply?
- Can this result safely open in Read?
- Can I save and reload this query definition without saving materialized results?

## Information Architecture

### Search Brief

The brief sits below the search controls and status row, above the result workspace. It spans the page width on desktop and tablet landscape. On mobile it remains above results but starts in a compact form.

The brief contains:

- **Key line:** raw query, normalized key or tokens, selected mode, source lane.
- **Exact text evidence:** exact matched Arabic span or phrase when the query matches Quran text.
- **Scope stats:** matched source ayat count, matched result count, occurrence count when known, shown window count, full or partial aggregate status.
- **Index-wide distribution:** surah spread, surahs with the most indexed matches, first and last matched refs in Mushaf order.
- **Match basis:** exact phrase, Arabic token, translation/context term, same written form, same root, lemma, or reference.
- **Source frame:** Hafs/Tanzil Search index, Reader opening boundary, active pack version, tokenization and boundary policy where relevant.
- **Explore evidence entry points:** roots and forms, wording continuations, shared wording, repeated phrases, occurs once, ayah endings, index counts, and source notes, shown only when backed by active packs.
- **Guardrail note:** concise source-boundary language for the active query type.

Example safe copy:

> Search key: mercy. Translation lane. 18 matching source ayat across 12 surahs in the current Search index. Translation/context matches are indexed evidence, not tafsir.

For root or morphology modes:

> Same-root results are morphology evidence from the Hafs Search index. They do not mean the verses share the same interpretation.

### Default Hierarchy

The brief should not become a dashboard. Visible by default:

- query echo and selected mode/lane
- matched source ayat count and shown result count
- first/last match or one top distribution cue
- one source-boundary note for the active query type
- one `Explore evidence` disclosure

Pack version, tokenization policy, representative refs, detailed source notes, morphology tables, graph summaries, and checksums stay behind drilldowns unless a warning must be shown immediately.

At most three summary facts, three distribution highlights, and one advanced section are open by default. Source warnings appear once per query unless the user opens `Source`.

### Drilldown Ladder

Each level answers one question:

1. **Search Brief:** What did this query match across the active Search index?
2. **Matched verse card:** Why does this ayah belong to the matched set?
3. **Match tab:** What exact source text, translation/context, position, or morphology row produced this result?
4. **Explore tab:** What related indexed patterns can be inspected for this query or selected ayah?
5. **Source tab:** Which sources, policies, mappings, licenses, versions, and boundaries govern this evidence?

### Matched Verses

Result cards become ayah-first evidence cards. Each card should be understandable without opening the inspector.

Each result should carry enough match evidence to make `Why this matched` deterministic:

- lane or evidence type
- matched query token, source token, or phrase
- normalized query tokens when normalization affected the match
- source position or word position when known
- morphology root, lemma, same written form, morphology row, and source token when relevant
- translation/context excerpt when that lane matched
- mapping state and Open in Read eligibility

Card order:

1. Reference anchor, such as `Surah 2 - Ayah 255`, plus compact mapping state.
2. Search-source Arabic text or matched source excerpt when the match is Arabic/morphology/phrase.
3. Translation/context excerpt when that lane matched.
4. Required `Why this matched` line.
5. One compact evidence strip: lane, root/lemma/form when present, source boundary, Reader highlight state when relevant.
6. Actions.

Primary action:

- `Open in Read` only when click-time mapping can resolve one safe Reader target.
- Otherwise `Inspect match`.

Secondary actions:

- `Inspect match`
- `Explore wording` when relevant and available
- `Source`
- `Copy reference` if added as a focused utility

`Save search` belongs in the search controls or status row after a valid query, not inside result cards or the inspector.

The card should not imply tafsir, thematic equivalence, or Reader-native word alignment.

### Result Inspector

The inspector remains the deeper per-result surface.

`Match` expands the selected card:

- matched passage
- Search source text
- Reader text when mapped
- translation/context evidence when available
- why this result matched

`Explore` is lazy and relevant:

- morphology evidence
- same written form
- same root
- lemma
- wording continuations / attested following wording, anchored to the query phrase
- shared indexed wording, anchored to the selected result ayah
- repeated source phrases, anchored to the query or selected phrase
- occurs-once phrases, anchored to the query or selected phrase
- ayah-ending wording, anchored to the selected source ayah
- index counts, labelled as corpus-wide, result-set-wide, or per-result

`Source` is the provenance ledger:

- source refs
- reader refs and mapping state
- mapping reason
- pack version
- pack id and content hash
- source riwayah
- source ids and notices
- license ids and required notices
- normalizer version
- query AST version
- rank version
- Hafs/Tanzil Search source note
- Qalun/Qaloon Reader boundary
- morphology/QAC provenance where relevant
- graph policy where relevant
- graph and morphology warnings
- tokenization and boundary policy where relevant

Source notes should be grouped and structured, not repeated as a wall of warnings in every panel.

## Data Flow

React must not derive index-wide claims from the visible result window. Query-wide statements require worker-computed aggregates from the full result set.

The worker `query-window` payload should extend the existing `SearchResultWindow` with a `brief` field rather than introducing an assistant-like response method.

Conceptual contract:

```ts
interface SearchBriefDto {
  query: {
    rawText: string
    normalizedText: string
    tokens: string[]
    mode: SearchQueryMode
    sourceLanes: Array<'arabic-text' | 'translation' | 'context'>
    morphologyMode?: 'same-written-form' | 'same-root' | 'lemma' | 'surah-context'
  }
  counts: {
    matchedSourceAyahCount: number | null
    matchedResultCount: number
    shownWindowCount: number
    occurrenceCount: number | null
    occurrenceCountKnown: boolean
    aggregateStatus: 'full' | 'partial' | 'unavailable'
  }
  distribution: {
    firstRef: string | null
    lastRef: string | null
    surahsWithMostIndexedMatches: Array<{ surah: number; matchedSourceAyahCount: number; occurrenceCount?: number }>
  }
  evidenceTypes: Array<
    | 'reference'
    | 'arabic-text'
    | 'exact-word-form'
    | 'exact-source-phrase'
    | 'translation-context'
    | 'same-written-form'
    | 'same-root'
    | 'lemma'
  >
  representativeRefs: Array<{ label: 'top-ranked' | 'first-in-mushaf-order' | 'different-surah-example' | 'translation-context-example' | 'arabic-text-example'; ref: string }>
  mappingStateCounts?: Record<string, number>
  featureAvailability: Array<{ section: string; status: 'available' | 'missing' | 'offline-unavailable' | 'incompatible' }>
  sourceNotes: Array<{ id: string; label: string; text: string }>
}

interface SearchResultWindowWithBrief extends SearchResultWindow {
  brief: SearchBriefDto
}
```

The brief should include enough structured fields for deterministic copy:

- raw query
- normalized key or tokens
- query mode
- source lanes
- morphology mode when present
- match basis labels
- matched source ayah count
- matched result count
- shown window count
- indexed occurrence count where the index can compute it
- aggregate status
- per-lane counts
- surah distribution
- first and last matched refs in Mushaf order
- representative refs selected by deterministic rules
- mapping-state counts where useful
- source and boundary notes keyed by policy
- available feature-pack sections

`totalKnownResults` may remain useful for pagination, but it must not be treated as a distinct ayah count unless the worker proves that the result window is deduplicated by source ayah.

Per-result DTOs should also expose structured `matchEvidence` so cards and the Match tab do not reverse-engineer explanations from labels:

```ts
interface SearchResultMatchEvidence {
  lane: SearchResultDto['matchLanes'][number]
  matchedText?: string
  matchedQueryToken?: string
  matchedSourceToken?: string
  normalizedTokens?: string[]
  sourcePosition?: number
  wordPosition?: number
  phraseLength?: number
  morphology?: {
    sourceToken: string
    root: string | null
    lemma: string | null
    rowId?: string
  }
  translationContextExcerpt?: string
  // Templated deterministic evidence copy, not generated interpretation.
  whyMatched: string
}
```

Representative matches must use deterministic labels, for example:

- `Top ranked`
- `First in Mushaf order`
- `Different surah example`
- `Translation/context example`
- `Arabic text example`

Do not use labels such as `key verse`, `main meaning`, or `best explanation`.

Advanced brief sections may hydrate lazily from optional packs:

- morphology counts
- wording graph summaries
- repeated phrases
- occurs-once phrases
- ayah endings
- counts and patterns

The core query should show feature availability and entry points only. Morphology summaries, graph summaries, repeated phrases, occurs-once phrases, ayah endings, shared wording, and pattern counts load only through explicit Explore actions or a separate lazy brief-section request.

If optional data is missing, the core brief and result list still render.

## Saved Searches

Saving remains an explicit `Save search` action in the search controls or status row after a valid query. The saved-search list remains in the existing NavDrawer Search mode or rail; it does not become part of the Search Brief, result cards, or result inspector.

Saved searches persist query intent and compatibility metadata only:

- raw query
- normalized key or tokens
- selected mode
- source lanes
- active filters
- sort
- required feature ids
- compatible pack requirements
- display preferences
- created, updated, and last-opened timestamps

Saved searches must not persist:

- result windows
- Search Brief snapshots
- representative refs
- Explore section payloads
- source/provenance snapshots

Opening a saved search recomputes the Search Brief, matched verses, source notes, and optional feature availability against the active compatible Search index. If the pack changed, the UI may state that the search was recomputed against the active Search index.

Rename and delete remain saved-search management actions. They update the saved query definition only and do not change current Reader state.

## Exact Quran Text Boundary

Exact Quran text search has three distinct source-backed modes:

- `Arabic text match`: normalized Arabic text over the Hafs/Tanzil Search source.
- `Exact word-form match`: exact indexed word form, preserving source spelling according to the active normalizer policy.
- `Exact source phrase`: exact phrase adjacency over token positions in the Hafs/Tanzil Search source.

These modes search the Search source text, not the active Reader/Qalun text. Result cards may show exact source spans, but they must not imply Reader-native word alignment or Qalun word highlighting. `Open in Read` remains verse-level unless a future validated Reader token alignment exists.

## Layout

### Mobile

- Sticky compact search controls stay at the top.
- Search Brief renders directly below the status row.
- The default brief view shows key, matched source ayah count, shown result count, source frame, and one `Explore evidence` disclosure.
- Matched verses follow immediately.
- Result detail opens as a pushed detail view with a clear back affordance that returns to the same result position.
- Explore sections load one at a time.

### Tablet

- Portrait follows mobile.
- Landscape may use the desktop split after the brief.
- No three-column tablet layout.

### Desktop

- Search Brief spans above the workspace.
- Advanced brief sections are collapsed by default so matched verses remain visible without scrolling past a dashboard.
- Below the brief, the workspace uses matched verses on the left and a sticky result inspector on the right.
- Saved searches remain in the drawer or rail and do not become a third analysis column.

## Copy And Labels

Preferred labels:

- `Search Brief`
- `Evidence overview`
- `Where this key appears`
- `Indexed matches`
- `Match distribution`
- `Representative matches`
- `Matched verses`
- `Match evidence`
- `Arabic text match`
- `Exact source phrase`
- `Exact word-form match`
- `Translation/context match`
- `Same written form`
- `Same-root morphology`
- `Same-lemma morphology`
- `Wording evidence`
- `Wording continuations`
- `Attested following wording`
- `Shared indexed wording`
- `Repeated source phrase`
- `Occurs once in this Search index`
- `Ayah-ending wording`
- `Morphology evidence`
- `Translation/context evidence`
- `Index counts`
- `Source and boundary details`

Avoid:

- `Answer`
- `Insight`
- `Meaning`
- `Hidden theme`
- `Related ayat`
- `Verses about`
- `Same theme`
- `Similar message`
- `Legal evidence`
- `Quranic insight`
- `Tafsir`
- `Ruling`
- `Why Allah says`
- `Suggested verse`
- `Semantic match`
- `Generated continuation`
- `Suggested completion`

The UI may use `theme` only for a future approved curated thematic source. Lexical, morphology, translation/context, and shared-wording results should use evidence wording instead.

Required guardrail copy patterns:

- Arabic matches are from the Hafs/Tanzil Search source. Reader opening uses validated mapping when available.
- Translation/context matches are indexed translation/context evidence, not tafsir and not a claim that Arabic wording shares one meaning.
- Same-root results are QAC morphology evidence in the Hafs Search index. Shared root does not mean shared interpretation, ruling, topic, or rhetorical purpose.
- Following wording is attested source wording after the matched phrase. It is not prediction, autocomplete, paraphrase, or generated Quran text.
- Shared wording means lexical overlap in the active Search index. It does not establish thematic or interpretive equivalence.
- `Occurs once` means once under this Search index and graph policy, not a claim about every scholarly analysis of uniqueness.

Count labels must always name the object being counted:

- `Matched source ayat`
- `Matched result rows`
- `Shown results`
- `Indexed occurrences`
- `Source word positions`
- `Pattern counts`

## Error Handling And Degraded States

The brief degrades by section.

If core query data is available:

- show the brief shell
- show matched verses
- hide or disable unavailable optional sections

If the worker cannot compute full-set aggregates:

> Showing 25 matches. Full distribution is not available for this query.

If morphology is unavailable:

> Morphology evidence is not available in the active Search index.

If graph packs are unavailable:

> Wording patterns require the graph feature pack.

If offline cache state prevents a section:

> Counts are unavailable while offline until this pack is cached.

Unsupported queries continue to use the parse-error model. Empty and unsupported states may suggest valid search keys:

- ayah reference
- Arabic word
- exact phrase
- translation/context text
- same written form
- same root
- lemma

Suggestions appear only for modes and optional feature packs available in the active Search index.

## Accessibility

- Use semantic sections for brief, matched verses, and result inspector.
- Announce brief/result count changes politely after a search completes.
- Use `dir="auto"` and bidi isolation for query echoes, Arabic text, translation/context excerpts, references, chips, and source rows.
- Do not rely on color alone for source, warning, or mapping states.
- Disclosures and tabs must be keyboard reachable with visible focus.
- Mobile pushed detail must return focus to the launching result/action.
- Source notes should be available to assistive tech without being redundantly announced for every result card.

## Verification Expectations

Implementation should verify the smallest layers that prove the behavior:

- Worker/query layer computes brief aggregates from the full result set.
- Worker/query layer distinguishes matched source ayat, matched result rows, shown results, occurrence counts, and aggregate status.
- UI renders core brief facts from the brief payload.
- UI does not invent full-set summaries from visible result windows.
- Missing optional packs degrade only their affected sections.
- Exact Quran text queries expose the matched Arabic span without implying Reader-native word alignment.
- Result cards render ayah-first evidence order and a durable why-matched line.
- Result cards and Match tab render `matchEvidence` rather than deriving explanations from lane labels alone.
- `Open in Read` remains gated by validated click-time Reader mapping.
- Saved searches preserve and restore query mode, source lane, filters, and source/version context while recomputing results and briefs.
- Graph and morphology sections load lazily through explicit Explore actions or lazy brief-section requests.
- Mobile, tablet, and desktop layouts keep the brief readable without overlap or horizontal overflow.
- Bidi text remains contained in mixed Arabic/English examples.

Automated tests are added only when explicitly requested. Visual proof is still required for implementation because the brief changes layout across viewport tiers.
