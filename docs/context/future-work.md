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

- **User-personal alias overrides** — local IDB store lets user add custom aliases on top of shipped `src/data/aliases.json`. Guardrail: refuses to alias any label in `excludeFromAliasing` (protects muminin/muslimin/muttaqin/etc. rank distinctions).
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
- **Community-curated aliases** — shared alias artifact with review/approval workflow. Lets communities ratify that `believers` → `muminin` in a specific cultural convention, without imposing globally. (See also §Sharing, export, sync — Community / shared collections.)
- **Subordinate-rank hierarchy metadata** — dataset ships `subordinateOf` / `partOf` relations per classical tafsir (muhsinin ⊂ muminin ⊂ muslimin). Filters offer "include subordinate ranks" toggle. Graph renders hierarchy visually.
- **Pillars layer** — revisit as a dedicated layer only if organic usage shows users forming a "pillar" tag convention. Alternatively extend threads seed palette.
- **Mark-level flags (`hasQuestion`, `hasApplication`)** — shipped briefly in the 2026-04-20 data-model but pulled from UI + schema during tagging polish (empty-mark guard made them redundant; tags cover the same intents). Re-consider if post-launch usage shows users wanting a first-class "revisit later" / "to apply" toggle outside the tag layers.
- **Teaching / share-export flag** — marks verses user intends to share in halaqa / dawah. Bundles naturally with future sharing layer (see §Sharing, export, sync).
- **Source citation layer** — free-form or structured references to tafsir, hadith, scholar names. Distinct from edge evidence; applies to verse itself. (See also §Tafsir.)
- **Certainty note flag** — optional `uncertain: boolean` on the note field (lightweight "still working this out" marker). Ships if post-MVP usage data shows demand.
- **Orphan edges filter** — review hub filter showing edges whose endpoints no longer have marks.
- **Bookmark collections** — group bookmarks into named, curated study sets (e.g. "Surah Yaseen routine"). MVP bookmarks (shipped 2026-04-28, riwayah-scoped, verse-id single-tap toggle) cover the flat list; collections layer on top.
- **AI assistant mode** — summarize verse clusters, suggest tags, detect possible themes, find related verses, help organize notes, reflection prompts. Always shows **why** it suggested something; never authoritative over the text.

(Per-verse memorization-status flag, formerly listed here, has been promoted to §Memorization (hifz) §v1.1 — was re-scoped 2026-04-29 from "deferred" to a near-term cheap unlock.)
(Community layer, formerly listed here, has been promoted to §Sharing, export, sync §v2+.)

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

## Reading core

### v1.1 — near-MVP

- **Juz / hizb / rubʿ / ruku navigation.** Static metadata tables (juz boundaries are 30 fixed `surah:verse` pairs; hizb / rubʿ / ruku boundaries are similarly small fixed tables). Add jump-to-juz action in command sheet, surah header chip, and nav drawer. Cheap unlock for "1 juz/day = khatm in Ramadan" daily-routine reading. Highest cheap-ROI item among Tier 1.

- **Full-text Arabic + translation search.** MiniSearch / Lunr static index built at translation-pack precache time (~1 MB gzip across 6,236 verses). Wire into existing command-sheet search; new result group "Verse text". Today the command sheet only resolves refs / surahs / tags — readers who recall a phrase but not a reference are blocked.

- **Reading plan / khatm tracker / streak.** New IDB store `readingPlan` (target verses or pages per day, started date, completed count, completed verseKeys set). Daily-target progress card on Surah list + About stat grid. Streak counter from days that hit target. Habit-forming retention loop, no external deps.

### v1.2

- **Page-break indicators (Hafs first).** KFGQPC publishes per-verse page numbers for the standard 604-page Madinah Mushaf; embed as `pageNumber` on Hafs verse records. Render thin gold rule + page number between verses on page boundary. Jump-to-page in command sheet. Lightweight subset of full page-image rendering — see §Page-based Mushaf layout.

### v2+ — longer horizon

- **Verse comparison view (parallel passages).** Side-by-side reader for parallel passages (Musa across 7 / 20 / 26 / 28). Derive candidates from layer overlap (`people + places + events ≥ 2`). Diff-highlight differing tokens. Builds on the 12-layer marks system; partly captured under §Tag/verse multi-layer §v2+ "Compare mode" — converge once both items mature.

---

## Memorization (hifz)

### v1.1 — near-MVP

- **Memorization status flag (per-verse).** Status enum `none | learning | memorized | review`. Add to mark record (or new `hifz` store keyed by `riwayah` + `verseKey`). Toggle chip in fast-tag panel + filter in Review hub. Foundation for every other hifz feature. Schema-add only — pre-release schema-change discipline (no users yet) keeps this cheap. Promoted from §Tag/verse multi-layer §v2+ on 2026-04-29 once "go-to memorization app" was named as product north star.

### v1.2

- **Hide-drill / cover-text mode.** Toggle CSS attribute on `<html>` (`data-drill="arabic-hidden" | "translation-hidden"`) with per-verse blur + tap-to-reveal. New shortcut + menu entry. Practice queue surfaces verses where `memorization ∈ {learning, review}`. Depends on memorization status flag.

### v2+ — longer horizon

- **Spaced-repetition review queue (SRS).** FSRS or SM-2 algorithm; per-verse review history store; daily due-queue UI; dashboard (cards due / mature / leeches). Pairs with memorization status + hide-drill. Differentiator vs every other Quran app. Largest hifz lift; treat as v2 milestone.

---

## Audio recitation

### v2 — milestone (architecture landed 2026-04-30; ship-blocking work remaining)

Architecture, runtime, IDB schema, cross-tab gating, media-session wiring, mini-bar + full-overlay components, reader verse-tick highlight + smart-defer autoscroll all landed 2026-04-30 against `docs/superpowers/specs/2026-04-30-audio-design.md`. The audio surface is mounted in `App.svelte` and wired into the boot path (`initAudio` after `initRiwayah`); audio routes are partitioned in the SW (`/dataset/audio/{reciter}/{NNN}.mp3` → CacheFirst per-reciter namespace). What ships when this milestone closes is **dataset + UX polish**:

- **Reciter dataset acquisition pipeline.** Forced-alignment via whisperX / Montreal forced aligner produces per-(reciter, surah) word-level timing JSON. Pipeline is its own design+plan (separate spec when work begins). At minimum 3 Hafs reciters (Alafasy, Husary, Sudais) for v2.0 launch; Warsh + Qaloon parity once a forced-alignment run is staffed.
- **`workbox-range-requests` plugin.** Currently the SW serves cached audio with full 200 OK; modern browsers tolerate but do not exploit Range arithmetic from cached responses. Add the plugin (returns 206 Partial) when audio data ships and verify on real devices. ~5 LOC code change + dep add.
- **Settings UI surfaces.** `settings/audio.ts` setters wired but not surfaced in `Panel.svelte`. Land:
  - Sources → Reciter picker (radio list, manifest-loaded).
  - Reading → Speed default (chip row), Repeat default (chip row), Auto-scroll mode (segmented), Pre-fetch next surah (toggle).
  - Storage → per-reciter audio cache MB used + "Clear {reciter} audio" button.
- **Reader long-press menu — "Play from here" entry.** Requires extending the existing fast-tag double-tap menu in `marks/long-press.ts::setupTapGestures` rather than adding a new gesture (per `user-journeys.md` C6 invariant: mark editor is the sole per-verse-tap action surface). ~30 LOC.
- **Audio brand artwork PNG assets.** `public/icons/audio-art-{96,256,512}.png` referenced by `audio/media-session.ts::setMetadata`. Three sizes; static QuranAtlas brand mark.
- **A-B loop UX + Repeat-N drill mode UI.** API surface defined (`setLoopRange`, `setRepeat('verse', N)`); discoverability and affordance design owned by overlay-UI follow-up.
- **`audio:reciter-changed` listener for reader.** `setReciterMidPlayback` emits the event; reader currently has no UI tie-in. Wire to a transient toast or chip update.
- **E2e specs (Rule 8 9-criterion gate).** `tests/e2e/journey-h-audio.spec.js` (NEW journey letter): real `<audio>.play()` lifecycle in `@offline` project, cross-tab gate via two `BrowserContext`s, range-request 206-from-cache path. Lock-screen control = manual smoke on real device.
- **CSP `media-src`.** Currently inherits `'self'`. If reciter dataset offloads to CDN (Cloudflare Pages 25 MB single-file cap is a concern with full-surah mp3s up to ~30 MB for al-Baqarah), explicitly add the CDN host.
- **Tajweed coloring × audio.** Tajweed (#11) is v1.3, audio is v2.0 — composition lands as part of whichever ships second; covered separately under §Language aids.

---

## Page-based Mushaf layout

Distinct from §"Page-image rendering for authentic mushaf hands" above (which is about *calligrapher* selection — Tarabulsi, Indo-Pak, etc.). This section is about *page anchoring* for hifz workflows where students memorize by visual page position in the standard 604-page Madinah Mushaf.

- **Page-break indicators.** See §Reading core §v1.2.
- **Page-image Mushaf rendering (full).** Pipeline already designed in §"Page-image rendering for authentic mushaf hands" (KFGQPC PDF → per-page PNG @ 2× DPR, ~30–50 MB per riwayah, SW precache, invisible Unicode overlay for selection / tap-to-mark). Per-riwayah toggle in Settings → Reading. Subsumes page-break indicators if shipped. Asset budget is the biggest blocker.

---

## Language aids

### v1.3 — once Reading core ships

- **Word-by-word translation.** Quran.com qdc API has word-aligned data; build pipeline mirroring the Saheeh fetch. Schema: per-verse `words: [{ar, en, root}]`. Render Arabic line as spans; tap / hover reveals gloss. Significant touch on `reader/Verse.svelte` — re-tokenisation has knock-on effects for translation footnote markers, long-press, and selection.

- **Transliteration.** New translation-pack-like store; Quran.com qdc serves it. Render line under Arabic, gated by `settings.transliterationVisible`. Architecture parallels the existing translation-pack flow.

- **Tajweed coloring.** Tajweed-rule annotation dataset (KFGQPC tajweed-marked corpus, or quran.com tajweed JSON). Render colored spans over Arabic glyphs without breaking riwayah orthography. Toggle in Settings → Reading. Standalone value medium; pairs strongly with §Audio recitation for full recitation-learning loop.

---

## Sharing, export, sync

### v1.1 — cheap unlocks

- **Copy verse to clipboard + share.** `navigator.clipboard.writeText` + Web Share API. Add to fast-tag panel `⛶` row or verse long-press menu. Half-day implementation; standard quote-to-friend flow.

### v1.2

- **Marks + bookmarks export / import.** JSON export of all marks, bookmarks, settings; import flow with merge / replace choice. Backup + device-migration without committing to multi-device sync. Pairs with the privacy stance: data is portable, leaves only on user demand.

### v2+ — longer horizon

- **Multi-device sync.** End-to-end-encrypted sync (account-less, device-pair via QR / passphrase). Resolves the "no accounts" privacy stance with sync the server cannot read. Substantial backend lift; defer until single-device experience is complete.

- **Community / shared collections.** Public / shared collections, curated thematic paths, follow study sets from trusted users, contribute optional classifications, compare interpretations or tag systems. Promoted from §Tag/verse multi-layer §v2+ on 2026-04-29. Large surface; captured here as a placeholder until product direction firms.

---

## Tafsir

### v1.3 onward

- **External tafsir packs.** Beyond Saheeh's inline footnotes (1,903 shipped). Candidates with redistribution clarity: Tafsir Ibn Kathir (English abridged, public domain), Maududi's Tafhim (Islamic Publications copyright — verify), Tafsir al-Jalalayn (English, Royal Aal al-Bayt — license check). Pack format mirrors translation-pack architecture; render in a verse-detail bottom sheet, not inline. Tafsir selection lives in Settings → Sources alongside the riwayah and translation pickers.

---

## Recommended ship sequence

Effort × ROI ordering as analysed 2026-04-29 against the "go-to Quran reading + memorization app" north star. Move items into active plans roughly in this order — not a contract; re-evaluate when each tier ships.

**v1.1 — Tier 1 cheap wins (~1 sprint total).** Juz / hizb / rubʿ / ruku nav · per-verse memorization status flag · copy + share verse · reading plan / khatm tracker / streak · full-text Arabic + translation search.

**v1.2 — Tier 2 medium lift.** Hide-drill / cover-text mode · page-break indicators (Hafs) · marks + bookmarks export / import.

**v1.3.** Word-by-word translation · transliteration · tajweed coloring · external tafsir packs (start with one).

**v2.0 — single-feature milestone.** Audio recitation + reciter picker + verse loop. Single biggest leverage in the entire roadmap.

**v2.1.** Page-image Mushaf rendering (per-riwayah) · spaced-repetition review queue.

**v2.2.** Verse comparison view · multi-device sync · community / shared collections.

Cross-cutting: every shipped tier moves its entries out of this doc per the §"Adding to this doc" rule.

---

## Infrastructure

### Before v1.0 launch — IDB migration plumbing (deferred from N10 / audit C-8)

Schema migrations are destructive-recreate today (`core/db/migrations.js::applySchema` drops + recreates `marks` on every upgrade; new stores guard with `if (!contains)`). Acceptable while there are no users and the project memory `project_pre_release` documents the schema-changes-free posture.

When a user-visible release is scheduled:
- Add versioned `_shapes` (`_shapes_v5`, `_shapes_v6`, …) so new fields can land without dropping the store.
- Add a cursor-walk back-fill helper for adding fields to existing rows.
- Stable `bumpVersion()` API that wraps `DB_VERSION = N + 1` plus the diff function.
- ~150 LOC of dormant infrastructure — the cheap insurance audit C-8 asked for; land alongside the first release-train milestone, not under the time pressure of an actual schema change.

### Audio sub-design (N30 — landed 2026-04-30)

The audio architecture, IDB schema (`audioPosition` store, DB v6), runtime, cross-tab gating, mini-bar + full-overlay shells, reader verse-tick + smart-defer autoscroll, and SW per-reciter cache partition all landed 2026-04-30 against `docs/superpowers/specs/2026-04-30-audio-design.md` (the post-brainstorm spec that supersedes the gitignored skeleton). Remaining ship-blocking work tracked under §Audio recitation §v2 above. Companion items: `core/tokenisable.ts` shipped narrow audio scope (verse-grain DOM contract via `data-token-key` on `.qa-verse`); reader virtualisation (N20) + WBW migration of long-press / click-handler / scroll-tracker / indicator from `data-verse-key` to `data-token-key` remain deferred for WBW's own design pass.

### Sync v2 sub-design + crypto threat model (N31 skeleton, audit C-8 / R-10)

Multi-device sync (`#17`) is v2.2. Skeleton sub-design at `docs/superpowers/specs/2026-04-29-sync-v2-design-SKELETON.md`. Crypto threat model drafted at `docs/superpowers/specs/2026-04-29-sync-v2-crypto-threat-model.md` covering identity, key exchange, transport, replay, equivocation, account-recovery. Both gitignored. The generic sync envelope landed in N12 (`safety/sync.ts::registerTopic` + `broadcast`), so each future store can plug into sync v2 by registering its topic — no per-store deprecation churn when the engine arrives.

### Remove `'unsafe-inline'` from `style-src` (audit C-6 / R-19c)

`style-src 'unsafe-inline'` is the broad permission Svelte's inline `style:` directives currently rely on (per-tag colour hue, per-row computed surfaces, etc.). Removing it means moving every inline `style="…"` to either CSS variables on a parent element or a generated nonce-stamped stylesheet. Long refactor with no security gain unless we also tighten the rest of the CSP. Schedule alongside the v1.3 inline-style audit, after audio + WBW have landed and the inline-style surface is stable.

### tests/e2e/global-setup.ts + storageState reuse (audit R-15 / Rule 6.5)

CLAUDE.md Rule 6.5 mandates a `tests/e2e/global-setup.ts` that walks onboarding once and saves the authenticated state to `tests/e2e/.auth/onboarded.json`. Specs whose first action is "skip onboarding" then opt in via `test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })` instead of paying the `markOnboardingComplete + clearAllData + cold-boot` tax (~1–2 s per test).

Deferred from N15. Building global-setup right requires choosing the canonical onboarded settings (theme + riwayah + translation defaults) and walking each acceptance gate; subsequent spec migrations then need eyeball verification per spec. Together it is a ~1 day's work and the e2e suite isn't currently the bottleneck on a single-developer pre-release project. Land alongside the next setup-heavy spec or when CI wall time exceeds two minutes.

`journey-d-settings.spec.js`'s 5 nested `beforeEach` blocks (audit R-28) collapse into the outer one as part of the same refactor — both are deferred together.

### `core/tokenisable.ts` sub-verse contract + reader virtualisation (audit R-06 / R-22 / C-3)

Step 1 of the audit prescription landed 2026-04-30 in narrow audio-driven scope: `core/tokenisable.ts` exports `parseTokenKey`, `formatTokenKey`, `getTokenAt(x, y)`, and `verseTokenSelector(surah, ayah)`. `Verse.svelte` emits `data-token-key={verseKey}` alongside the existing `data-verse-key` so the contract is satisfied at verse grain without disturbing existing consumers. Audio's `reader/audio-highlight.ts` reads via `verseTokenSelector` — picks up word-level spans automatically when WBW lands.

Steps 2 and 3 are still deferred:
- **Step 2** — migrate `marks/long-press.ts`, `bookmarks/click-handler.ts`, `reader/scroll-tracker.ts`, `marks/indicator.ts` from `data-verse-key` to `data-token-key`. Each consumer has a stable selector today; the migration is a search-and-replace plus updating tests. Land alongside WBW (`#9`) when sub-verse consumers actually need word-grain (today they only ever ask "which verse").
- **Step 3** — reader virtualisation via IntersectionObserver recycling ±3 chunks (audit R-22). Caps DOM at ~150 verses; required before WBW lands or Al-Baqarah's 286 verses × 50–150 nodes hits 14k–40k DOM nodes.

Order still matters: virtualise BEFORE the consumer migration = re-write twice (the consumer cache invalidation interacts with DOM recycling). Single brainstorm + plan pass before WBW (`#9`) starts.

### `core/persistent-overlay.ts` factory + lazy mount (audit R-13 / CC-9 / N22 + N25)

The factory landed 2026-04-30 alongside the audio milestone (audio player overlay = first new consumer). Six existing bridges (`core/ui-bridge`, `marks/editor-bridge`, `nav/command-sheet-bridge`, `nav/nav-drawer-bridge`, `settings/panel-bridge`, `tag/session-bridge`) are still hand-rolled and have NOT been migrated to the factory — that's the remaining N22 work. Each migration is mechanical: replace ~5 LOC of `register*()` + module-state with `createOverlayBridge<API>({ name })`, validate with eyeball check + existing tests. Land alongside the next overlay touch (e.g. tafsir bottom-sheet `#12`).

N25 (lazy-mount on first `open()`) is unaffected by the factory landing — it still requires per-overlay surgery in `App.svelte` and component-side import-on-demand. Worth ~10–15 KB gzip out of the entry bundle once all six existing overlays migrate. Schedule when the entry-bundle size becomes a real bottleneck (today: ~38 KB gzip, well under budget).

### Per-asset-class SW partition + offline opt-in selector UI (audit R-11 / C-4 / N21)

The audio half of N21 landed 2026-04-30 directly in `src/sw.js` (per-reciter `qa-audio-{reciter}-v1` cache namespace, timing JSON cache, audio meta NetworkFirst route). The `cleanupStaleCaches` helper in `sw-handlers.js` was extended to preserve `qa-audio-*` and `qa-fonts-*` caches by prefix. The dedicated `core/sw/strategies.ts` aggregator module from the audit is unstarted — current routes live in-line in `sw.js`. Remaining N21 work:

- **Mushaf-pages route** (`/dataset/mushaf-pages/{riwayah}/*` CacheFirst, content-addressed) — lands when page-image mushaf (`#14`) starts.
- **Search-index route** — lands when full-text search (Reading core §v1.1) starts.
- **`offline/offline-selector.svelte`** — per-feature opt-in UI with size estimates (Text · Audio per reciter · Pages per riwayah · Search index). Lands alongside Settings Storage section work.
- **Move audio routes from `sw.js` to `core/sw/strategies.ts` aggregator** — refactor for clarity once 3+ asset-class routes co-exist; today (2 routes) inline is fine.

Deferred to v1.2 (per audit ship sequence). The audio prefix has shipped early to unblock audio; mushaf + search ship under the same partition pattern when their work begins.

---

## Adding to this doc

When a future feature is agreed on but not scheduled:

1. Find the relevant domain/surface section (create a new top-level `## section` if none exists).
2. Place under the right horizon subhead: `### v1.1`, `### v2+`, `### Dataset enrichment roadmap`, or `### Dropped / not on roadmap`.
3. One short paragraph: what it is + why it matters + what blocks it from being MVP-ready if applicable. Avoid pasting entire design discussions — link to related docs if needed.
4. When a feature starts active work, move it into the live plan and delete the entry here. When it ships, it is recorded in the code + git + the relevant context doc (`data-model.md`, `events.md`, etc.) — delete from here.
