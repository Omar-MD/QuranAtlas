# Future Direction

Provisional future direction that is useful context for planning, but is not yet a shipped capability. Move items from here into `roadmap.md` once they become agreed ship scope.

## Current baseline

QuranAtlas already ships the text lane and the first Knowledge Lane seam:

- runtime reads only `/dataset/**`
- text rendering stays independent from optional enrichment lanes
- `src/data/knowledge-dataset.ts` loads lazily and can fail without breaking reader boot

Future work should extend those boundaries rather than replace them.

## Target lane model

### Text lane

Canonical reader content:

- Arabic riwayat
- translations
- tafsir display text
- surah and juz metadata
- verse aliases
- provenance and manifest inventory

This lane stays deterministic, fast, and offline-safe.

### Knowledge lane

Structured understanding around ayat and passages beyond the current shipped phase:

- richer ayah themes
- passage structure and role-in-surah context
- concepts and divine names
- cross-references and rhetorical features
- scholarly claims in a later phase

The reader may be enriched by this lane, but must not depend on it for baseline rendering.

### Reflection lane

Curated tadabbur guidance intended to stay narrow and reader-adjacent:

- prompt lenses
- per-ayah or per-range prompts
- difficulty tags
- suggested actions, du'a prompts, or small journaling scaffolds

The default interaction stays lightweight: one prompt first, optional deeper expansion, no separate top-level surface required.

### Search / AI lane

Retrieval-first support for search and AI-assisted study:

- lexical indexes
- chunked tafsir / claims retrieval
- citation and provenance maps
- optional vector or embedding indexes later

This lane should ground answers in structured retrieval rather than raw source dumping.

## Runtime and offline guardrails

- Client runtime continues to consume only built files under `/dataset/**`; `data/catalog/**`, `data/normalized/**`, and `data/taxonomy/**` stay build-only.
- Reader boot must not require knowledge, reflection, search, or AI files.
- Knowledge and reflection load lazily after text is already usable.
- Missing optional lane files degrade gracefully: no fatal boot failure, reader still works, enhancement UI simply stays absent or unavailable.
- Manifest and offline planning should remain lane-aware so future shipped assets are represented consistently in inventory, service-worker routing, and storage estimates.

## Expected sequencing

The current preferred order is:

1. deepen the reader-facing Knowledge Lane UI on top of the existing runtime seam
2. add curated Reflection Lane prompts inside the existing ayah interaction flow
3. add claim extraction and source-backed knowledge atoms
4. add retrieval and AI-assisted study with citations

## Open planning questions

These are still planning decisions, not settled product scope:

- which surahs should remain the pilot set for future curated knowledge and reflection data
- whether reflection enters from the ayah menu, bottom sheet, or another subtle action in the existing interaction flow
- whether user-saved reflections are local-only at first
- whether AI is offline, server-side, or hybrid
- whether every AI answer must require citations and refusal guardrails for unsupported legal or creedal conclusions
