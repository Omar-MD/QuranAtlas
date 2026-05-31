# Search Brief Result UX Design

## Purpose

Search should help a user understand a search key across the indexed Quran, then inspect the evidence verse by verse. The current list-first output makes the user decode individual rows before they know what the query means in the result set. The improved experience makes the first output a single deterministic Search Brief backed by the active Search index.

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

The brief is the coherent response. The result cards and inspector are the evidence trail.

## Non-Goals

- Do not infer meanings, lessons, rulings, sabab, themes, or interpretive conclusions from lexical matches.
- Do not call shared wording a shared topic, related meaning, or equivalent interpretation.
- Do not present translation/context matches as tafsir.
- Do not present Hafs morphology as Qalun/Qaloon-native data.
- Do not enable Reader word highlighting for Hafs morphology results.
- Do not summarize the whole matched set from a paged result window.
- Do not use chat UI patterns such as avatars, message bubbles, streaming text, or assistant phrasing.

## Core User Outcomes

A user should be able to answer:

- What exact key did I search, and how was it normalized?
- Which source lane matched: Arabic text, translation/context, phrase, root, lemma, same written form, or reference?
- How many source ayat matched in the active Search index?
- Where does the key appear across the Quran in Mushaf order and surah distribution?
- Why does each individual ayah belong to the matched set?
- Which parts are direct indexed evidence, which parts are morphology aids, and which source boundaries apply?
- Can this result safely open in Read?

## Information Architecture

### Search Brief

The brief sits below the search controls and status row, above the result workspace. It spans the page width on desktop and tablet landscape. On mobile it remains above results but starts in a compact form.

The brief contains:

- **Key line:** raw query, normalized key or tokens, selected mode, source lane.
- **Scope stats:** matched ayat count, occurrence count when available, shown window count, full or partial status.
- **Quran-wide map:** surah spread, densest surahs, first and last matched refs in Mushaf order.
- **Match basis:** exact phrase, Arabic token, translation/context term, same written form, same root, lemma, or reference.
- **Source frame:** Hafs/Tanzil Search index, Reader opening boundary, active pack version, tokenization and boundary policy where relevant.
- **Pattern entry points:** occurrences, morphology, wording, counts, and source notes, shown only when backed by active packs.
- **Guardrail note:** concise source-boundary language for the active query type.

Example safe copy:

> Search key: mercy. Translation lane. 18 matching source ayat across 12 surahs in the current Search index. Translation/context matches are indexed evidence, not tafsir.

For root or morphology modes:

> Same-root results are morphology evidence from the Hafs Search index. They do not mean the verses share the same interpretation.

### Matched Verses

Result cards become ayah-first evidence cards. Each card should be understandable without opening the inspector.

Card order:

1. Reference anchor, such as `Surah 2 - Ayah 255`, plus compact mapping state.
2. Search-source Arabic text or meaningful excerpt when the match is Arabic/morphology/phrase.
3. Translation/context excerpt when that lane matched.
4. Plain-language match reason.
5. Compact evidence strip: lane, root/lemma/form when present, source boundary, Reader highlight state when relevant.
6. Actions.

Primary action:

- `Open in Read` only when click-time mapping can resolve one safe Reader target.
- Otherwise `Inspect match`.

Secondary actions:

- `Inspect match`
- `Explore wording` when relevant and available
- `Source`
- `Copy reference` if added as a focused utility

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
- attested following wording
- shared wording
- repeated phrases
- occurs once
- ayah endings
- counts and patterns

`Source` is the provenance ledger:

- source refs
- reader refs and mapping state
- pack version
- source ids and notices
- Hafs/Tanzil Search source note
- Qalun/Qaloon Reader boundary
- graph and morphology warnings
- tokenization and boundary policy where relevant

Source notes should be grouped and structured, not repeated as a wall of warnings in every panel.

## Data Flow

React must not derive whole-Quran claims from the visible result window. Query-wide statements require worker-computed aggregates from the full result set.

The query response should conceptually include:

- `brief`: query-wide evidence summary
- `results`: current result window
- `cursor`: load-more cursor
- `totalKnownResults`
- `rankVersion`
- pack id and pack version metadata

The brief should include enough structured fields for deterministic copy:

- raw query
- normalized key or tokens
- query mode
- source lanes
- morphology mode when present
- match basis labels
- total matched ayat
- total occurrences where the index can compute them
- per-lane counts
- surah distribution
- first and last matched refs in Mushaf order
- representative refs selected by deterministic rules
- mapping-state counts where useful
- source and boundary notes keyed by policy
- available feature-pack sections

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

If optional data is missing, the core brief and result list still render.

## Layout

### Mobile

- Sticky compact search controls stay at the top.
- Search Brief renders directly below the status row.
- The default brief view shows key, count, source frame, and one `Patterns` disclosure.
- Matched verses follow immediately.
- Result detail opens as a pushed detail view or full-height panel.
- Explore sections load one at a time.

### Tablet

- Portrait follows mobile.
- Landscape may use the desktop split after the brief.
- No three-column tablet layout.

### Desktop

- Search Brief spans above the workspace.
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
- `Wording evidence`
- `Morphology evidence`
- `Translation/context evidence`
- `Source and boundary notes`

Avoid:

- `Answer`
- `Insight`
- `Meaning`
- `Hidden theme`
- `Related ayat`
- `Quranic insight`
- `Tafsir`
- `Ruling`
- `Why Allah says`
- `Suggested verse`
- `Semantic match`

The UI may use `theme` only for a future approved curated thematic source. Lexical, morphology, translation/context, and shared-wording results should use evidence wording instead.

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
- UI renders core brief facts from the brief payload.
- UI does not invent full-set summaries from visible result windows.
- Missing optional packs degrade only their affected sections.
- Result cards render ayah-first evidence order and a durable why-matched line.
- `Open in Read` remains gated by validated click-time Reader mapping.
- Mobile, tablet, and desktop layouts keep the brief readable without overlap or horizontal overflow.
- Bidi text remains contained in mixed Arabic/English examples.

Automated tests are added only when explicitly requested. Visual proof is still required for implementation because the brief changes layout across viewport tiers.
