# Search Result Workspace Design

## Purpose

Search results should help users understand the result set, choose the next action, and inspect proof only when needed. The current Search Brief, matched verse list, and inspector layout exposes too much result detail, source terminology, and audit metadata at once.

This design replaces that layout with a query-level workspace that preserves deterministic, source-backed Quran Search while improving pacing and clarity. Search remains non-AI, non-tafsir, Reader-aware, and grounded in the active Search index.

## Product Model

Search renders one query-level workspace after every successful query:

- `Overview`
- `Verses`
- `Explore`
- `Sources`

`Overview` orients broad and exploratory searches. It shows counts, matched ayat, primary match type, top distribution or forms, available next actions, and only the caveat required for the query type. It does not show verse cards by default.

`Verses` contains the ayah-first result list. Ayah reference queries and exact Arabic phrase queries land here immediately because the user's intent is to inspect specific ayat.

`Explore` contains query-level analysis modules such as same written form, same root, forms by count, surah distribution, attested following wording, shared wording, repeated phrases, occurs-once phrases, ayah endings, and Counts & patterns. Modules appear only when they are relevant to the query type and backed by the active Search pack.

`Sources` is the query-level provenance and audit area. It is the only default location for heavy technical source data such as pack hash, source ids, license ids, normalizer version, query AST version, rank version, tokenization policy, boundary policy, and guardrail notes.

Per-verse `Details` remains available from the `Verses` tab. It opens beside the list on wider screens and as a sheet or full-width panel on mobile.

## Adaptive Defaults

Every submitted search chooses a fresh default tab. The app does not preserve the user's previous tab across new searches.

The selected search mode controls the default:

- Ayah reference queries and reference mode default to `Verses`.
- Exact Arabic phrase mode defaults to `Verses` for all phrase result counts.
- Broad Arabic text and Arabic word searches default to `Overview`.
- Same written form, same root, lemma, and Surah context default to `Overview`.
- Translation and context modes default to `Overview`.
- `All` mode respects the parsed query shape only when needed: reference-like queries default to `Verses`; broad or mixed searches default to `Overview`.

Switching tabs does not re-run the query. Overview actions such as `View verses`, `Show distribution`, and `View forms` switch tabs or focus the relevant module while keeping the same query and result window. `Load more results` exists only in `Verses`.

## Overview

`Overview` replaces the overloaded Search Brief as a calmer orientation surface.

It includes:

- Search query.
- Interpreted query or selected mode.
- Result count.
- Matched ayat count.
- Primary match type.
- Top surah distribution for broad Arabic, translation, and context searches.
- Top forms for morphology and root searches.
- Available next actions.
- A small caveat only when needed.

It does not include by default:

- Verse cards.
- Pack hash.
- Source ids.
- License ids.
- Query AST version.
- Rank version.
- Normalizer version.
- Raw source positions.
- Source token ids.
- Full guardrail ledger.

Broad and exploratory searches show no result preview in `Overview`. The primary action is `View verses`, with secondary actions such as `View forms`, `Show distribution`, or `Open Explore` depending on query type.

Required caveats:

- Same-root and morphology searches: `Same-root matches are morphology aids. They do not imply the same interpretation.`
- Translation and context searches: `These results match indexed translation/context text, not necessarily exact Arabic wording.`

## Verses

`Verses` is the ayah-first result list.

Default card fields:

- Reference.
- Arabic/Search text snippet.
- Optional translation or context excerpt.
- Plain-language match reason.
- One match-type label.
- `Open in Read`, when `canOpenInRead` is true.
- `Details`.

Cards should not expose source positions, word positions, phrase length, normalizer version, query AST version, rank version, pack hash, source token id, or full evidence badges. Those belong in `Details` or `Sources`.

`Open in Read` appears only when `canOpenInRead` is true. If `canOpenInRead` is false, `Details` becomes the primary action. Word-level highlighting is separate from opening in Reader; `Word highlight unavailable` appears in `Details` or action help text, not as a primary card badge.

## Details

Per-verse `Details` explains why one result belongs to the set. It is result-level, not query-level.

Sections:

- `Why this matched`: plain-language explanation such as `Matched exact Arabic phrase "غفور رحيم".`, `Matched translation term "mercy".`, `Matched same root ر ح م.`, or `Matched ayah reference 2:255.`
- `Texts`: Search text, Reader text when mapped, and translation/context excerpt when relevant.
- `Reader mapping`: user-facing labels for opening, corresponding Reader ayah, Search-source-only state, and word highlighting availability.
- `Evidence`: structured match evidence from `matchEvidence`, including positions, normalized tokens, root, lemma, phrase length, or matched tokens when applicable.
- `Sources`: a concise subset of source data relevant to the selected result.

## Explore

`Explore` is query-level and adaptive.

Arabic word searches can show:

- Same written form.
- Same root.
- Surah distribution.
- Common neighboring phrases.

Phrase searches can show:

- All phrase occurrences.
- Repeated phrases.
- Attested following wording.
- Shared wording.
- Surah distribution.

Root and morphology searches can show:

- Forms by count.
- Matched ayat.
- Surah distribution.
- Morphology details.

Translation and context searches can show:

- Translation/context matches.
- Arabic source ayat.
- Source information.

Missing optional packs degrade at module level. Core Search results remain usable. Wording modules must use source-backed labels such as `Attested following wording` and `Wording observed after this phrase`. They must not use predictive or generated-answer language such as `prediction`, `autocomplete`, `suggested verse`, or `probability`.

## Sources

`Sources` is the technical provenance and audit tab for the whole query.

It includes:

- Search source.
- Reader source.
- Mapping state.
- Source ref and Reader refs.
- Pack id.
- Pack version.
- Pack hash.
- Source ids.
- License ids.
- Normalizer version.
- Query AST version.
- Rank version.
- Boundary policy.
- Tokenization policy.
- Guardrail notes.

This tab is required for transparency, but it must not be part of the default result card or default `Overview`.

## Presentation Model

The worker can keep returning the existing query-window shape:

```ts
{
  results: SearchResultDto[]
  cursor: SearchResultCursor | null
  totalKnownResults: number | null
  brief: SearchBriefDto
  rankVersion: string
}
```

The route adds a UI-only presentation layer between route state and components.

The presentation layer derives:

- `SearchOutputViewModel`: active/default tab, query label, interpreted mode, total matches, matched ayat, primary match type, caveat, tab availability, and primary actions.
- `SearchOverviewViewModel`: top surahs, top forms, occurrence labels, caveat, and available Explore modules.
- `SearchVerseCardViewModel`: ref label, primary text, optional excerpt, plain-language match reason, match type label, `canOpenInRead`, and `canHighlightWordsInRead`.
- `SearchDetailsViewModel`: why this matched, texts, Reader mapping, concise evidence rows, and per-result source subset.

Internal DTO and worker names may remain stable. User-facing labels should move away from implementation terminology.

## User-Facing Language

Use:

- `Overview`
- `Verses`
- `Details`
- `Match type`
- `Matched in`
- `Search text`
- `Word highlight unavailable`
- `Result boundary note`
- `Explore`
- `Occurrences in this search index`
- `Matching results`

Avoid default UI labels such as:

- `Search Brief`
- `Matched verses`
- `Inspect match`
- `Evidence badges`
- `Match lanes`
- `Hafs Search source`
- `Reader highlight unavailable`
- `Source-boundary note`
- `Explore evidence`
- `Indexed occurrences`
- `Matched result rows`

Internal identifiers may keep their current names where changing them would add risk without user-facing value.

## Empty And Error States

- Empty route: prompt for a word, phrase, or ayah reference.
- No results: stay on the tab that would have been selected by default and show a concise no-results state with a clear next action.
- Pack unavailable: keep the existing Search index gate.
- Mapping unavailable: hide `Open in Read`; explain the Search-source-only boundary in `Details`.
- Optional Explore pack unavailable: show a module-level unavailable state without breaking core Search.
- Word highlight unavailable: explain in `Details` or help text, not as a prominent result-card badge.

## Responsive And Accessibility Requirements

The workspace must preserve the Reader chrome and existing navigation drawer behavior.

Desktop and tablet widths show the `Verses` list and selected-result `Details` side by side. Mobile presents result details as a sheet or full-width panel so the verse list is not cramped.

Tabs, actions, and details must use accessible labels, visible focus states, and stable dimensions. Status changes remain polite live-region updates. The UI must not create horizontal overflow at phone, tablet, or desktop widths.

## Acceptance Criteria

- Broad queries do not immediately show a long verse list.
- Ayah reference queries land directly in `Verses`.
- Exact Arabic phrase queries land directly in `Verses`.
- Root, morphology, translation, context, and broad Arabic searches land in `Overview`.
- Each new search gets a fresh adaptive default tab.
- Verse cards are minimal and ayah-first.
- Technical provenance is available but not shown by default.
- Match reasons are plain-language.
- Translation/context matches are clearly distinguished from Arabic text matches.
- Same-root matches include the required morphology caveat.
- Reader opening and Reader word highlighting are treated as separate capabilities.
- Explore modules use non-predictive, source-backed language.
- Query-level `Sources` exposes the full audit/provenance details.
