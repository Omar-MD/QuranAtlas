# Strong V1 Gap Map and Brainstorming Structure

## Purpose

Define a stricter "Strong V1" standard for QuranAtlas than the current shipped
Reader First baseline, then sort the remaining work into brainstorming plans
grouped by screens and components where possible.

This spec is for planning structure, not implementation detail. It establishes:

- what Strong V1 means
- which gaps are truly still open
- how those gaps should be grouped into brainstorming sessions and plans
- what order those plans should be explored

## Strong V1 Definition

Strong V1 means QuranAtlas is not merely functional as an offline-first Qur'an
reader, but coherent and convincingly complete across product substance, reader
experience, and internal data readiness.

Under this standard, V1 requires all of the following:

1. A complete and reliable Reader First experience across Verse and Mushaf
   reading, bookmarks, saved position, Daily Wird, navigation, settings, and
   search.
2. Curated metadata that is materially useful inside reading and navigation, not
   just partially scaffolded.
3. A validated import and enrichment pipeline for Qur'an text, tafsir,
   translation, and metadata assets.
4. Internal corpus readiness for future retrieval and RAG-style systems,
   including provenance, chunkability, boundaries, and citation-safe structure.
5. A polished, intentional UI across the main screens and shared components.
6. Enough performance and architectural hardening that the product feels
   trustworthy to ship, not fragile.

Strong V1 does not include user-facing AI chat, synthesis, or agent features.
It does include preparing the corpus and metadata so future retrieval systems
can be built on top of it safely.

## Gap Categories

Strong V1 gaps fall into three kinds:

### 1. Product capability gaps

These are missing or incomplete user-value features that the stronger V1 bar now
requires.

- Search is not yet complete relative to the desired scope.
- Metadata enrichment is incomplete.
- Data import and validation for the full reader corpus are incomplete.
- Retrieval and RAG preparation are incomplete.
- Some metadata-backed reading/navigation details remain partial.

### 2. Product quality gaps

These are places where the product works, but does not yet feel polished or
cohesive enough for Strong V1.

- Reader UX needs redesign and polish.
- Navigation chrome and movement patterns need refinement.
- Settings and offline/source management need clearer, calmer UX.
- Navigation screens need stronger visual and interaction consistency.

### 3. Release-hardening gaps

These are engineering and reliability issues that reduce confidence in the
release even when user-visible behavior mostly works.

- Reader performance still has known hot paths.
- Arabic rendering confidence still needs broader sweep coverage.
- Some data/schema boundaries remain too loose.
- A few architectural allowances remain that should be retired before treating
  the system as settled.

## Planning Units

Brainstorming and later implementation plans should be grouped by screens and
components where that is the primary user-facing unit, and by shared data
domains where the work is fundamentally cross-cutting.

The planning units are:

### A. Corpus and Import Pipeline

Purpose:
Establish the canonical ingestion, normalization, validation, and provenance
flow for Qur'an text, translations, tafsir, and supporting metadata assets.

Why it is its own unit:
This is the root dependency for metadata quality, search quality, and RAG
readiness.

Key outcomes:

- clear source inventory
- canonical normalized shapes
- import-stage validation rules
- provenance and version policy
- definition of what is baseline-shipped vs optional

### B. Metadata Enrichment System

Purpose:
Define and complete the curated enrichment lanes that strengthen reading and
navigation.

Includes:

- verse themes
- short meanings or summaries
- passage grouping/context
- Makki/Madani classification
- source-backed revelation/asbab metadata
- structural metadata such as juz/hizb/rub/ruku/page

Why it is its own unit:
It determines what the app actually knows beyond raw text and tafsir.

### C. RAG Preparation and Retrieval Boundaries

Purpose:
Prepare the internal corpus for future retrieval systems without adding a
user-facing AI product.

Includes:

- chunking boundaries
- citation granularity
- attribution and provenance guarantees
- separation of source classes
- retrieval-safe export/index shapes
- rules preventing unsafe blending of claims across sources

Why it is its own unit:
The user explicitly wants AI readiness to count as Strong V1, and this work is
not identical to app rendering concerns.

### D. Search Experience and Index Plan

Purpose:
Define Strong V1 search as both a product surface and a data/index capability.

Includes:

- search result types
- ranking and grouping
- Arabic / translation / tafsir / metadata coverage
- relationship between search UI and command sheet
- offline index behavior
- how enrichment feeds discovery

Why it is its own unit:
Search depends on the content-intelligence units above, but is important enough
to deserve its own plan and success criteria.

### E. Reader Screen Redesign

Purpose:
Redesign and polish the main reading experience across Verse and Mushaf screens.

Includes:

- visual hierarchy
- typography and spacing behavior
- metadata placement
- tafsir and study interaction model
- page-break and structural cues
- calmness, density, and readability of the main reading path

Why it is its own unit:
The reader is the product center of gravity and should not be buried inside a
broader generic UI plan.

### F. Navbar and Ambient Navigation Redesign

Purpose:
Redesign shared navigation chrome and movement affordances across mobile and
desktop.

Includes:

- mobile header
- desktop ambient dock
- command/search entry points
- route-mode switching
- shared navigation cues and persistent controls

Why it is its own unit:
These components shape how the product feels everywhere, and they are tightly
related but not identical to the reader screen itself.

### G. Surah, Juz, and Bookmarks Navigation Screens

Purpose:
Polish the dedicated navigation surfaces and make them feel like a coherent part
of the product.

Includes:

- nav drawer browse flows
- desktop surah directory
- juz browsing
- bookmark browsing and jump behavior
- consistency between mobile and desktop navigation surfaces

Why it is its own unit:
These are screen-level experiences with their own success criteria and can be
designed together without requiring the full reader redesign to be settled in
the same session.

### H. Settings Screen Redesign

Purpose:
Redesign the settings surface so source selection, offline control, theme, and
reading preferences feel understandable and confident instead of merely
functional.

Includes:

- settings information architecture
- source-picker UX
- storage/offline selector UX
- theme and reading controls
- visual hierarchy for advanced vs routine settings

Why it is its own unit:
Settings is complex enough to deserve a dedicated plan and can otherwise become
an afterthought.

### I. Reader Performance and Rendering Hardening

Purpose:
Resolve reader-facing performance and rendering confidence issues that would
undermine Strong V1 quality.

Includes:

- long-surah scroll hot paths
- reshape/render efficiency
- multi-riwayah Arabic rendering sweep
- confidence checks around large-reader interactions

Why it is its own unit:
This is user-facing quality work with distinct verification needs.

### J. Schema and Architecture Hardening

Purpose:
Reduce structural debt so the system is cleaner and safer to evolve after V1.

Includes:

- tighter settings-store contracts
- retirement of temporary domain-boundary allowances
- any remaining cross-domain ownership cleanup tied to active Reader First
  surfaces

Why it is its own unit:
This is not a screen redesign and should be planned as a focused engineering
lane.

## Brainstorming Clusters

To keep sessions practical, the planning units should be explored in these
brainstorming clusters:

### Cluster 1. Content Intelligence

- A. Corpus and Import Pipeline
- B. Metadata Enrichment System
- C. RAG Preparation and Retrieval Boundaries

Reason:
These three units share source-of-truth decisions, asset shapes, validation, and
provenance policy.

### Cluster 2. Search

- D. Search Experience and Index Plan

Reason:
Search depends on Cluster 1 and has enough surface plus indexing complexity to
justify a dedicated session.

### Cluster 3. Core Reading UX

- E. Reader Screen Redesign
- F. Navbar and Ambient Navigation Redesign

Reason:
These are the primary reading-time interactions and should evolve together.

### Cluster 4. Navigation Screens

- G. Surah, Juz, and Bookmarks Navigation Screens

Reason:
These screens share browse patterns, hierarchy, and visual language, but can be
designed separately from the core reader once the product direction is clear.

### Cluster 5. Settings UX

- H. Settings Screen Redesign

Reason:
Settings has unique complexity around source management and offline controls.

### Cluster 6. Release Hardening

- I. Reader Performance and Rendering Hardening
- J. Schema and Architecture Hardening

Reason:
These are release-confidence lanes that should be planned with verification in
mind after the higher-level product direction is set.

## Recommended Sequence

The recommended order for brainstorming and later implementation planning is:

1. Cluster 1. Content Intelligence
2. Cluster 2. Search
3. Cluster 3. Core Reading UX
4. Cluster 4. Navigation Screens
5. Cluster 5. Settings UX
6. Cluster 6. Release Hardening

This order is recommended because:

- content shape and provenance should settle before search design
- search scope should settle before final reader and navigation polish decisions
- reader and shared navigation should define the visual/product center
- secondary screens should then align to that center
- hardening should be scoped against the near-final product architecture

## What Counts As Done For Each Unit

Each planning unit should produce:

- a clear problem statement
- non-goals
- user-facing outcomes where relevant
- data/domain boundaries where relevant
- acceptance criteria
- verification expectations
- dependencies on earlier units

A unit is not ready for implementation planning if it still depends on undefined
source shape, undefined metadata semantics, or undefined UI hierarchy from an
earlier unit.

## Recommendation

The first brainstorming session should be Cluster 1: Content Intelligence.

That session should answer:

- what the canonical corpus inventory is
- what metadata enrichment is required for Strong V1
- what retrieval-ready structure must exist internally
- what data is baseline-shipped vs optional
- what validation and provenance guarantees are mandatory

Once Cluster 1 is stable, Search can be planned credibly, and the screen-level
UX work can be designed around real content instead of placeholders.
