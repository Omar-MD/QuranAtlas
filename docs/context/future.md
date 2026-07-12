# Future Direction

Provisional future direction that is useful context for planning, but is not yet shipped capability or agreed roadmap scope. Move items from here into `roadmap.md` only after a product decision.

## Current baseline

QuranAtlas already ships a Reader First runtime shape:

- runtime reads only `/dataset/**`
- text rendering stays independent from optional enrichment lanes
- the current default reader profile is Qaloon text/font, quran.ws Mushaf, and Bridges translation; one Mushaf edition is selected only during fresh or cleared setup
- future qira'ah/riwayah, translation, tafsir, curated metadata, Mushaf page, and optional advanced search/index assets can share one install-before-activate rule after the multiple-profile contract returns
- `src/metadata/knowledge.ts` and reader corpus helpers load curated knowledge lazily and can fail without breaking reader boot

Future work should extend those boundaries rather than replace them.

## Asset pipeline quality

Future reader and retrieval work depends on source assets that are clean, provenance-rich, validated, versioned, and indexable. The pipeline should preserve source provenance, build-time structural validation, manifest membership, byte planning, and install-state checks for every shipped or optional pack.

Runtime code should consume built files under `/dataset/**`. `data/catalog/**`, `data/normalized/**`, and `data/taxonomy/**` stay build-only.

## Curated metadata expansion

Curated QuranAtlas metadata is distinct from user-authored personal annotations. Possible future curated expansion includes:

- richer ayah themes
- passage structure and role-in-surah context
- Arabic roots
- concepts and divine names
- cross-references and rhetorical features
- scholarly claims after source and review rules are defined

Reader boot must not require optional curated metadata files. Missing optional metadata should leave enhancement UI absent or unavailable while Arabic text remains readable.

## Retrieval and AI readiness

The shipped `#/search` route covers deterministic lexical Search, source-backed morphology modes for same written form, same root, lemma, and Surah context, and a bounded memory graph for attested following wording, shared wording, repeated phrase exploration, occurs-once phrases, ayah endings, and Counts & patterns. Future retrieval infrastructure may add chunked tafsir and claims retrieval, citation/provenance maps, optional vector or embedding indexes, and richer graph navigation. This work should ground future answers in structured retrieval and citations.

Future answer, assistant, chat, or guided-study products are allowed product directions when they are citation-first, source-bounded, and explicit about evidence limits. They must not generate Quran text or present unsupported theological claims as sourced results.

## Future personal layer

Future user-authored data must stay separate from QuranAtlas curated metadata. A later personal layer may include:

- user meanings
- user tags
- comments
- notes
- edges or layer systems

Bookmarks remain current reading-continuity data and are not part of this future annotation layer.

## Deferred language and display aids

Transliteration display, word-by-word translation, and tajweed coloring remain deferred. Transliteration may still support search/indexing before any reader display feature is approved.
