# Related Ayat Thematic Search Design

## Summary

Phase 4 adds source-backed thematic retrieval to QuranAtlas Search through a visible `Related ayat` mode. The feature retrieves ayat from approved curated theme/topic data only. It is deterministic, offline-capable after its optional pack is installed, and transparent about why every ayah appears.

The feature extends Search without turning it into an AI assistant, tafsir reader, semantic answer engine, RAG surface, or generated interpretation UI. Future AI assistance may propose query understanding, but authoritative thematic retrieval must still resolve to approved theme ids and source-backed ayah-theme rows before results are shown as thematic.

## Scope

Phase 4 v1 ships:

- A visible `Related ayat` Search mode.
- An optional thematic Search feature pack loaded only when needed.
- Query matching against approved theme labels and aliases.
- Result ranking from approved ayah-theme weight, certainty, and deterministic tie-breakers.
- `Best matches` as the default results view.
- `By theme` as the grouped exploration view.
- Thematic evidence on every result.
- A separated lexical fallback section when no approved theme matches.
- Saved `Related ayat` searches as intent records, not stored results.

Out of Phase 4 v1:

- Blending thematic results into `All` mode.
- Audience tags as a shipping dataset.
- Speech-act tags as a shipping dataset.
- Tafsir-reference indexing or tafsir reader UI.
- AI query understanding, generated summaries, generated Quran text, semantic answer UI, or RAG.
- Unreviewed or experimental tags in shipped thematic results.

Audience tags, speech-act tags, tafsir-reference evidence, AI-assisted query understanding, and optional related-context indexes are documented as future extension points only.

## Product Contract

`Related ayat` is an intentional thematic mode. Lexical Search remains precise and unchanged, and `All` does not include thematic results in v1.

The user-facing promise is:

- Results come from approved curated theme/topic data.
- The UI explains which approved theme caused each match.
- Theme matches are retrieval aids, not tafsir, rulings, sabab al-nuzul, or final interpretation.
- If no approved theme matches the query, the app says so and keeps lexical fallback results separate.

Required note:

> Theme matches are curated retrieval aids. They do not by themselves establish tafsir, legal rulings, sabab al-nuzul, or final interpretation.

Use product language such as:

- `Related ayat`
- `Best matches`
- `By theme`
- `Matched theme`
- `Curated theme`
- `Theme evidence`
- `No approved theme matched this query`
- `Lexical matches`

Avoid:

- `AI Search`
- `Semantic answer`
- `Meaning match`
- `Hidden meaning`
- `Generated insight`
- `Tafsir generator`
- `Ask`
- `Chat`

## Source Data

Thematic Search v1 is seeded from existing approved knowledge and taxonomy inputs:

- `data/taxonomy/themes.json`
- `data/normalized/knowledge/ayah-themes.json`

`themes.json` supplies approved theme ids, English and Arabic labels, aliases, parent or related ids, and descriptions. `ayah-themes.json` supplies ayah-to-theme rows with weight, certainty, and an allowed curated source value.

Generated knowledge indexes such as `theme-to-ayah` may be reused as build inputs or validation references, but runtime Search consumes the Search thematic pack. Search runtime code must not directly import `data/**` or rely on `/dataset/knowledge/**` for query execution.

Only approved curated theme data can produce thematic results in v1. Deterministic derived matches, morphology evidence, translation evidence, related themes, parent themes, and unreviewed experimental tags do not produce Phase 4 v1 thematic matches.

## Pack Architecture

The thematic index ships as an optional Search feature pack, not as part of the core lexical Search pack. Core Search remains usable when the thematic pack is absent.

Opening `Related ayat` triggers loading of the optional thematic feature. Missing, incompatible, corrupt, or offline-unavailable thematic data produces a scoped unavailable state for `Related ayat` while lexical Search remains available.

The thematic pack should include compact feature shards for:

- theme dictionary: theme id, labels, aliases, descriptions, parent ids, related ids
- theme postings: theme id to ayah ids with weight and certainty
- query expansion dictionary: normalized approved label or alias to theme id
- thematic rank config: rank version, score inputs, and tie-break policy
- thematic provenance: source dataset versions, checksums, review policy, and source notes

Feature ids and manifest metadata should make thematic pack requirements explicit so saved searches can declare compatibility without storing result windows.

## Query Matching

`Related ayat` matches a user query by normalizing the input with the Search normalizer policy and looking up approved theme labels and aliases.

V1 matching rules:

- Exact approved label match is allowed.
- Approved alias match is allowed.
- Arabic and English labels can both match when present in the approved theme dictionary.
- Theme descriptions are display/source context only and do not produce matches.
- Parent and related themes do not expand matches in v1.
- Unreviewed, rule-derived, generated, or experimental concepts do not produce matches.

If the query matches multiple approved themes, the worker retrieves ayah postings for each matched theme and combines evidence per result. If the query matches no approved themes, the thematic result state is empty and the UI may show separated lexical fallback results from core Search.

## Ranking

Thematic ranking is deterministic and versioned. Every result has a stable result id, rank version, and evidence list.

Suggested v1 ranking order:

1. Exact approved label match outranks approved alias match.
2. Higher ayah-theme weight outranks lower weight.
3. Higher certainty outranks lower certainty.
4. Lower source ref order breaks remaining ties.
5. Stable result id breaks final ties.

Certainty order is `high`, then `medium`, then `low`.

The result evidence should answer why the ayah appeared without interpreting the ayah:

```ts
type ThematicResultEvidence = {
  lane: 'theme'
  themeId: string
  label: string
  matchedBy: 'label' | 'alias'
  matchedValue: string
  weight: number
  certainty: 'high' | 'medium' | 'low'
  source: 'curated'
}
```

Result cards may summarize this as `Matched theme: Guidance · curated · high certainty`.

## Result Views

`Related ayat` has two result views.

`Best matches` is the default view. It shows a deduplicated ranked list. If an ayah matches multiple themes, it appears once with combined evidence.

`By theme` groups results under each matched approved theme. Each group shows the theme label and short approved description. An ayah may appear under multiple theme groups in this view if it has evidence for multiple matched themes. The grouped view must make that duplication understandable through the group labels.

Result cards keep existing Search behavior:

- source reference
- snippet
- mapping state
- `Open in Read` only when mapping validates a single reader target
- evidence/source area
- Hafs Search source versus Qalun Reader text separation where applicable

The result UI must not imply that a theme tag is a complete explanation of the ayah.

## Lexical Fallback

No approved theme match is a normal empty thematic state, not an error.

When a query has no approved theme match, `Related ayat` shows:

- `No approved theme matched this query`
- a separate `Lexical matches` section when core Search finds lexical results
- no blended thematic result cards

Fallback lexical results keep their normal Search lane evidence and source notes. They must not be labeled as related ayat.

## Saved Searches

Saved `Related ayat` searches use the existing saved-search model: store user intent and compatibility metadata, not materialized results.

Saved intent includes:

- query text
- query mode `related-ayat`
- query AST version
- filters
- sort
- required feature id for the thematic pack
- compatible pack requirements
- display preferences
- timestamps

Matched theme ids and result groups are derived at runtime from the active compatible thematic pack. Opening a saved `Related ayat` search recomputes query understanding, ranking, groups, and fallback results against the active compatible packs.

Saved search compatibility must account for the core pack and the optional thematic pack when both are required for a complete result surface.

## Worker Behavior

The existing Search worker protocol should extend `query(request)` rather than adding chat-like methods.

`Related ayat` queries:

- require the thematic feature pack
- load thematic shards on demand
- return typed missing-feature or incompatible-feature errors when needed
- support request ids, worker epochs, cancellation, stale response suppression, and pack identity in responses
- return DTO windows and groups, not shard buffers

The worker response for thematic queries should include:

- matched approved themes
- result DTOs
- optional grouped result DTOs or group references
- source notes
- rank version
- cursor information for the default ranked list

The worker must preserve core Search behavior when thematic feature loading fails.

## Builder Validation

The thematic builder fails before shipping a pack when:

- theme ids are missing, duplicated, or malformed
- label data is missing
- aliases are malformed
- parent or related ids point to missing themes
- ayah-theme rows reference unknown themes
- ayah-theme rows reference missing ayat
- duplicate theme ids appear on one ayah
- weight is not a finite number from 0 to 1
- certainty is not `high`, `medium`, or `low`
- source is not `curated` or another source value explicitly allowed by the Phase 4 v1 source policy
- generated shards exceed declared byte or memory budgets
- provenance checksums are missing

The builder emits deterministic dictionaries, postings, query expansion entries, rank config, provenance, checksums, byte counts, and feature metadata.

## Future Extensions

Audience tags and speech-act tags can become additional approved curated datasets in a later phase. They should use the same trust model: source-backed rows, visible evidence, review status, deterministic ranking, and scoped feature pack loading.

Tafsir-reference indexing can later provide retrieval evidence, but it must not become a tafsir reader UI unless that is separately designed. The allowed language would be `Tafsir reference supports this topic tag`, not generated tafsir.

AI-assisted query understanding can later propose theme candidates, synonyms, or query interpretations. It must remain upstream of the deterministic retrieval boundary: shipped thematic results require approved theme ids and approved ayah-theme evidence. AI output alone must not create authoritative thematic matches.

An optional related-context or semantic pack can be considered after deterministic thematic retrieval works. It should not embed or return generated Quran text, and it should be named in product language that preserves the source-backed retrieval contract.

## Verification Plan

Docs-only implementation of this design requires:

- `pnpm run docs:check`
- `git diff --check`

Implementation planning should include the smallest gates that prove behavior:

- builder validation for theme dictionaries, ayah postings, query expansion, provenance, and byte budgets
- worker coverage for label matching, alias matching, no-theme fallback, deterministic ranking, grouped results, missing-pack degradation, and cancellation
- UI coverage for `Related ayat`, `Best matches`, `By theme`, source notes, lexical fallback separation, missing-pack state, and saved-search recomputation
- existing Search pack lifecycle checks for optional feature compatibility

Per QuranAtlas repo rules, automated tests should be added or changed only when explicitly requested during implementation planning.
