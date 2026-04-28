# Future Work

Tracks features, enrichments, and design directions that have been agreed on but are **not in an active plan**. This is the single place where deferred scope lives — not scattered across plan archives, code comments, or memory.

**Rule of use.** Any feature that is:
- discussed and agreed as a future direction, but
- not in a currently executing plan or committed code

…belongs here. When work starts, the item moves from here into an active plan. When it ships, the item is deleted from here (the lasting record lives in code + git + the other context docs).

Organize semantically by surface/domain, not by date. Roadmap horizon (v1.1, v2+, dataset, dropped) lives as a header per item — this is a living roadmap, not a changelog.

---

## Tag/verse multi-layer system

Context: core data-model overhaul brainstormed 2026-04-20. Introduces 12 free-form user-tagged layers (threads, subjects, audience, speaker, quotedSpeaker, mode, form, tone, people, places, events, divineNames), mark-level flags (hasQuestion, hasApplication), and a separate `edges` store for verse-to-verse relationships. Canonicalization pipeline resolves cross-script drift while preserving Quranic rank distinctions via `excludeFromAliasing`.

### v1.1 — near-MVP

- **User-personal alias overrides** — local IDB store lets user add custom aliases on top of shipped `data/aliases.json`. Guardrail: refuses to alias any label in `excludeFromAliasing` (protects muminin/muslimin/muttaqin/etc. rank distinctions).
- **Edge creation UI** — "Link this verse to…" action in verse detail + edge list chip row on marked verses. Bundled with auto-suggest below (shipping edge-UI without suggestions = too much manual work for too little reward).
- **Auto-suggested edges from layer overlap** — system surfaces suggestions like "Verse A and Verse B share people=musa + places=sinai + events=exodus → possible `same-story` edge?". One-tap accept/dismiss. Killer tadabbur feature — reveals connections user didn't consciously notice.
- **Per-edge-kind reflection prompt** — creating `parallel` edge asks "What differs in this telling?", `contrast` asks "What opposite is shown?", `fulfills` asks "What was promised / realized?". Drives depth of edge-level note capture.
- **Typo merge review surface** — system lists likely typo pairs (Levenshtein ≤2 against canonical), user batch-approves merges. Never auto-merges.

### v2+ — longer horizon

- **Semantic graph view** — force-directed visualization of verse nodes + edges + shared-layer clusters. Core atlas-metaphor surface. Distinct node rendering per named-entity layer (person/place/event icons). Aliases resolve to unified nodes; rank/quality distinctions stay as separate nodes.
- **Compare mode** — side-by-side verse comparison by shared audience, shared thread, shared speaker, or shared named entity. Highlights what differs across same-story retellings (e.g. Musa across 7, 20, 26, 28).
- **Named edge-paths (atlas "routes")** — user curates multi-hop sequences of edges into named journeys. "Musa's life" = 20:9→20:25→28:7→28:15→28:29… Sequenced ordered collection of edges. Matches atlas/route metaphor and vision's "curated thematic paths".
- **Edge revisit log** — timestamp every time user re-opens an edge. Most-revisited edges = user's insight attractors. Weight in graph rendering + dedicated "your most-returned connections" surface.
- **Edge clusters / meta-reflection groups** — user groups related edges (e.g. "these 5 abrogation edges show legal evolution toward mercy") with cluster-level note. Edge-of-edges reflection layer.
- **Edge structured-evidence field** — structured citations (tafsir, hadith, scholar name + reference) supporting why the edge exists. MVP uses free-text edge note; v2+ promotes to typed reference store.
- **Community-curated aliases** — shared alias artifact with review/approval workflow. Lets communities ratify that `believers` → `muminin` in a specific cultural convention, without imposing globally.
- **Subordinate-rank hierarchy metadata** — dataset ships `subordinateOf` / `partOf` relations per classical tafsir (muhsinin ⊂ muminin ⊂ muslimin). Filters offer "include subordinate ranks" toggle. Graph renders hierarchy visually.
- **Pillars layer** — revisit as a dedicated layer only if organic usage shows users forming a "pillar" tag convention. Alternatively extend threads seed palette.
- **Mark-level flags (`hasQuestion`, `hasApplication`)** — shipped briefly in the 2026-04-20 data-model but pulled from UI + schema during tagging polish (empty-mark guard made them redundant; tags cover the same intents). Re-consider if post-launch usage shows users wanting a first-class "revisit later" / "to apply" toggle outside the tag layers.
- **Memorization flag** — status enum (not-started / learning / memorized / needs-review). Rabbit-hole-adjacent (spaced-repetition = own product); deferred until clear need.
- **Teaching / share-export flag** — marks verses user intends to share in halaqa / dawah. Bundles naturally with future sharing layer.
- **Source citation layer** — free-form or structured references to tafsir, hadith, scholar names. Distinct from edge evidence; applies to verse itself.
- **Certainty note flag** — optional `uncertain: boolean` on the note field (lightweight "still working this out" marker). Ships if post-MVP usage data shows demand.
- **Orphan edges filter** — review hub filter showing edges whose endpoints no longer have marks.
- **Bookmark collections** — group bookmarks into named, curated study sets (e.g. "Surah Yaseen routine"). MVP bookmarks (shipped 2026-04-28, riwayah-scoped, verse-id single-tap toggle) cover the flat list; collections layer on top.
- **Community layer** — public/shared collections, curated thematic paths, follow study sets from trusted users, contribute optional classifications, compare interpretations or tag systems. Large surface; captured here as a placeholder.
- **AI assistant mode** — summarize verse clusters, suggest tags, detect possible themes, find related verses, help organize notes, reflection prompts. Always shows **why** it suggested something; never authoritative over the text.

### Dataset enrichment roadmap

These land as **read-only reference data shipped with the dataset**, not as user-tagged layers. They appear in verse detail as authoritative chips (e.g. "Madani · revealed during X incident") and power filters/graph queries without user noise.

- **Revelation context** — Makki/Madani (verse-level, handles exceptions within surah), era classification (early/late Makki, early/late Madani), asbab an-nuzul summaries.
- **Arabic roots** — pre-computed 3-letter roots per word / verse. Powers "all verses sharing this root" queries and root-cluster graph regions.
- **Key phrases catalog** — curated list of recurring Qur'anic phrases (e.g. "وَاللَّهُ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", "وَمَا أَنتَ عَلَيْهِمْ بِوَكِيلٍ") with occurrence maps.
- **Muhkam / mutashabih classification** — scholarly clear/allegorical tagging per verse.
- **Literary devices (pre-computed)** — iltifat, metaphor, chiasmus, parallelism, repetition, etc. Distinct from `form` user layer (which remains for user's own literary-device tagging).
- **Hierarchy/rank metadata** — subordinate-of relations for audience categories (feeds the v2+ hierarchy UI).

### Dropped / not on roadmap

Items discussed and rejected, recorded here so they're not re-litigated without new evidence:

- **Category layer** (legal/ethical/narrative/spiritual) — redundant with `mode` + `form` + `threads` stack; coarse-grained duplication adds no graph signal.
- **Certainty as user-tag layer** — conflated three ideas (tag confidence, interpretation confidence, source citation); better homes exist (note-level flag, source-citation layer).

---

## Page-image rendering for authentic mushaf hands

Each riwayah renders in its own KFGQPC Uthmanic mushaf cut (Hafs v22, Warsh V21, Qaloon V21) — the official KSA Madinah Mushaf hand authored against each riwayah's orthography. What is *not* preserved is any other calligrapher's hand — Tarabulsi (Libyan Jamahiriya Mushaf), Indo-Pak Hafs / Saleem cuts, or any other named mushaf calligrapher. None of these alternative hands is available as a public webfont with full Quranic mark coverage that renders cross-engine.

The industry-standard fix is page-image rendering of pre-typeset Mushaf pages — used by Tarteel, quran.com, quran-android, Mushaf Mecca, AAYAAT, Quranflash for the same reason. Pipeline: (a) source the official PDF for the desired mushaf (KFGQPC Madinah Mushaf via `nashr.qurancomplex.gov.sa`; Libyan Jamahiriya via Libya's General Authority for Religious Affairs; etc.), (b) extract per-page PNG (or SVG outlines via `pdftocairo -svg`) at 2× DPR for retina, (c) ship under `public/dataset/mushaf-pages/{mushaf-id}/{NNN}.png`, ~30-50 MB per mushaf after compression — precache via SW, (d) overlay invisible Unicode text per ayah for selection / copy / verse-tap-to-mark. Surface as an optional per-riwayah toggle ("Render with authentic mushaf typesetting") in Settings → Reading. Out of scope until a contributor commits to the asset pipeline build + size budget.

---

## Translation packs

Saheeh International (id `saheeh`, 6236 verses, 1903 footnotes) ships as the default English pack since 2026-04-27 — pipeline + loader + footnote rendering live; see `data-model.md` §Translation packs and `docs/context/architecture.md` §Translation pipeline. The remaining work below is incremental enrichment, not foundational.

- **Per-surah intros (M4).** The pack schema reserves `intro: string[]` per surah but ships empty arrays today. Saheeh's printed introductions are not in the Quran.com qdc API; Maududi's Tafhim intros are exposed via `/chapters/{id}/info` but Islamic Publications retains copyright and free redistribution is unconfirmed. Resolve licensing before importing; render above verse 1 below the bismillah block. Should toggle with `settings.translationVisible` so intros disappear alongside verse translations.
- **Translation picker UI (M5).** `dataset.ts::getTranslations()` already maps `provenance.translations[]` to a UI-shaped list and the Settings translation-picker subview is wired; only the Settings entry is hidden today because there is one shipped pack. When a second pack lands, expose the picker plus migrate `settings.translationId` cleanly (pre-release schema-change discipline still applies).
- **Additional translations.** Strong candidates with clear redistribution status: Bridges' Translation (id 149 on Quran.com qdc, CC BY-ND, includes qiraat-aware footnotes that complement QuranAtlas's riwayat-aware corpus); Mufti Taqi Usmani (id 84, copyright held by Maktaba Ma'ariful Quran — verify license before fetching); Abdel Haleem (Oxford, fully copyrighted — would need a licensed source). Mustafa Khattab's *The Clear Quran* — originally targeted as the first pack — is no longer served by Quran.com's public API and has no other free redistribution channel; revisit if `theclearquran.org` exposes a licensed feed.

---

## Infrastructure

### Visual regression — linux baselines

Current 45 baselines under `tests/e2e/visual/baseline.spec.js-snapshots/` are darwin-captured. CI (linux) excludes the `visual` project because font rendering + anti-aliasing differ past the 5% `maxDiffPixelRatio` threshold. Local-only gate via `pnpm test:e2e:visual` until linux baselines are captured (via Docker `mcr.microsoft.com/playwright` or an ephemeral CI artifact-and-commit flow) and committed alongside the darwin set.

---

## Adding to this doc

When a future feature is agreed on but not scheduled:

1. Find the relevant domain/surface section (create a new top-level `## section` if none exists).
2. Place under the right horizon subhead: `### v1.1`, `### v2+`, `### Dataset enrichment roadmap`, or `### Dropped / not on roadmap`.
3. One short paragraph: what it is + why it matters + what blocks it from being MVP-ready if applicable. Avoid pasting entire design discussions — link to related docs if needed.
4. When a feature starts active work, move it into the live plan and delete the entry here. When it ships, it is recorded in the code + git + the relevant context doc (`data-model.md`, `events.md`, etc.) — delete from here.
