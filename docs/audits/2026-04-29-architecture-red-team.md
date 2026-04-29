# Architecture Red Team — 2026-04-29

**Snapshot:** `dev` @ `4dd00f7` · 13,934 LOC · 50 source files · 80 unit / 11 e2e suites · DB v5 · 0 build warnings.
**Lens:** pessimistic. Goal: find debt now, before `future-work.md` v1.1 → v2.2 lands and the seams that absorbed Phases 1–6 fail under audio + mushaf + sync.
**Inputs:** five parallel audits saved at `tmp/audit-{01..05}-*.md` — file paths cited inline; full evidence lives there.

---

## 1. Executive summary

**One-sentence verdict.** The current architecture is *clean today on a single-developer branch* but carries five load-bearing assumptions that absorb the next 5 future-work items only by accident; three of them — verse-grain DOM, settings god-bag, and the destructive-recreate IDB migration path — must be addressed *before* any user-visible release, not after.

**Five P0 findings (block any further v1.1 work):**

| # | finding | source | blast radius |
|---|---|---|---|
| P0-1 | **SW manifest fail-open** at `sw-handlers.js:56-58` defeats SHA-256 chain of trust the moment manifest fetch fails | A4 | every offline user; supply-chain |
| P0-2 | **`saheeh.raw.json` ships 2.1 MB of pure waste** to every client because `public/dataset/translations/saheeh.raw.json` is build-input that Vite copies verbatim | A3 | 25% of full-precache bandwidth |
| P0-3 | **`maxEntries: 200` in `src/sw.js:42`** silently LRU-evicts 459-file dataset → cache-miss on offline reads | A3 | every multi-riwayah offline user |
| P0-4 | **Rule-5 violation rate ≈60% on last 10 fixes** (recent-surahs cap-7, swipe-delete, verse-id tap, three settings-preview fixes have NO regression test) | A5 | every future regression of these surfaces |
| P0-5 | **`reshape()` MutationObserver in `app-bootstrap.ts:116-140` walks ALL verses** on every chunk-append, ~1,700 forced reflows on Al-Baqarah scroll — one-line fix | A3 | every iPhone reader |

**Five P1 findings (block v1.1 sprint kickoff):**

| # | finding | why blocking |
|---|---|---|
| P1-1 | `core/db.ts` is a god module (32+ importers; conflates connection + validation + type registry) | every new store touches it; hifz/SRS/search/plan all queue here |
| P1-2 | `settings.value: 'any'` god-bag with 16 keys; multi-writer leaks (`translationVisible`, `lastSurface`); fragile joint-ownership of `translationId` | every settings reader has its own validator (15 files) |
| P1-3 | Schema migration is destructive-recreate-only; `onupgradeneeded` has zero back-fill plumbing | first user-visible release closes this window |
| P1-4 | `tests/e2e/global-setup.ts` (Rule 7.5) **does not exist**; every e2e pays cold-boot setup tax | Rule 7.5 explicitly requires it before next setup-heavy spec |
| P1-5 | `safety/sync.ts` is a per-feature dispatcher (4 bespoke message types calcify the pattern) AND has a load-bearing import cycle with `settings/riwayah.ts` | every new persisted concept adds a `case` here; sync v2 can't deprecate cleanly |

**Composite north star.** Move from *clean by accident* (single-dev discipline) to *clean by construction* (architectural invariants enforced at compile time + test time). Concrete target: every future-work item from §1 to §16 lands in ≤5 files; §13 (audio), §14 (mushaf), §17 (sync) land in ≤15 files each because the cross-cutting layers they need exist before they arrive.

---

## 2. Cross-cutting truths

Findings that surface in **two or more** audits — these are the architectural truths, not surface bugs.

### CC-1. The verse-grain DOM model is load-bearing with no escape hatch

> **Sources:** A1 §Top-5 #2 · A5 §HALF-A #9 · A3 §Memory leak #4

`[data-verse-key]` selectors in `marks/long-press.ts:25-28`, `bookmarks/click-handler.ts`, `reader/scroll-tracker.ts`, `marks/indicator.ts` all assume the smallest interactive unit is a verse. **Word-by-word translation (#9), tajweed coloring (#11), audio verse-tick highlight (#13)** all need sub-verse granularity. There is no abstraction layer for "the user pressed *this* word in *that* verse." Audit A3 also notes the reader has *no virtualisation* — Al-Baqarah's 286 verses × 50–150 nodes each (more once words split) hits 14k–40k DOM nodes, a memory ceiling that re-tokenising will multiply by 8–12×.

**Why this is the highest-impact debt.** Three roadmap items independently require sub-verse work; none can ship cleanly until the contract exists. Fixing it after #9 lands means re-writing four files (long-press, click-handler, scroll-tracker, indicator) for the second time.

### CC-2. `core/db.ts` is a god module disguised as a primitive

> **Sources:** A1 §God modules · A2 §Settings god-bag · A2 §Schema migration · A5 §Test fixture coupling

32+ importers. The file conflates: IDB connection lifecycle (`onversionchange`, `onblocked`, retry, visibility listener), runtime schema (`_shapes`, `validateWrite`), and the type registry (`LayerName`, `MarkRecord`, `EdgeRecord`, `BookmarkRecord`, `Riwayah`). Type-only consumers (`safety/input-validator.ts`, `tag/session-bridge.ts`, `data/tag-layers.ts`, `bookmarks/indicator.ts`) drag the runtime in via TypeScript erasure. Tests duplicate the schema — `tests/e2e/fixtures/idb.js`'s `_APPLY_SCHEMA_SRC` (lines 20–60) hand-mirrors `db.ts onupgradeneeded` for v5 and is imported by 9 of 11 specs — guaranteed regression source the day v6 lands for reading-plan or hifz.

### CC-3. The `settings` store is a typeless god-bag

> **Sources:** A1 §Boundary leaks · A2 §Settings god-bag · A2 §Multi-writer violations · A2 §Race conditions

`_shapes.settings = { key: 'string', value: 'any' }` (`db.ts:271`) — *no value-type contract.* 16 keys today across theme/typography/riwayah/translation/position/recent/onboarding/quota. Each reader builds its own validator (`riwayah.ts:30 isRiwayah`, `reading-typography.ts:79 isStep`, …) — schema enforced 15× across 15 files instead of once. Multi-writer leaks: `settings.translationVisible` written by both `Panel.svelte:177` AND `panel-bridge.ts:39`; `settings.lastSurface` by both `core/router.ts:215` AND `review/Hub.svelte:407`; `translationId` by Panel + Onboarding (joint-owned). Audit A2 finds three race conditions all rooted here: theme/font fire-and-forget `put().catch()`, recentSurahs read-modify-write, riwayah DOM-before-persist. Boundary leaks compound it: NavDrawer + CommandSheet read raw IDB instead of going through a sole-reader module.

### CC-4. `safety/sync.ts` is a per-feature dispatcher pretending to be a primitive

> **Sources:** A1 §God modules · A2 §Cross-tab gaps · A1 §Cross-feature reach-throughs

Four bespoke message types (`marks:changed`, `edges:changed`, `bookmarks:changed`, `riwayah:changed`); each new persisted concept adds a `broadcast*Change` function and a `case` in `handleChannelMessage`. Coverage of every other store/key is **zero**: 12 settings keys + `meta['review']` + `recentSurahs` + `lastSurface` + `currentPosition` all silent. Latent bug today (single-tab user); structural blocker the day **multi-device sync v2 (#17)** lands — every silent store becomes a sync-engine gap and the per-store calcified types must each be deprecated. Worse, the **`safety/sync.ts` ↔ `settings/riwayah.ts` import cycle** (`module-graph.md` :229) resolves only because each side imports a *function* (lazy ESM). Audio cross-tab playback gating (#13) will want the same dance, creating cycle #2.

### CC-5. The SW chain of trust has a fail-open hole

> **Sources:** A4 §Service-worker integrity · A4 §Top-5 #1 · A3 §SW gap

`sw-handlers.js:56-58` returns `{}` on manifest-fetch failure, after which every subsequent file is cached **without verification** — fail-open. An attacker who can DoS only `/dataset/manifest.json` defeats the entire SHA-256 chain. The manifest itself is unsigned: chain of trust ends there. Combined with A4's build-script finding (`fetch-translation-saheeh.mjs` writes upstream API content with no integrity pin), the supply-chain story is: trust TLS + DNS to api.qurancdn.com, trust the build operator to notice content drift, trust the manifest fetch to never fail, trust the SW cache to be unpoisoned. Each link can break independently.

### CC-6. Schema migration is destructive-recreate

> **Sources:** A2 §Schema migration · A5 §Test fixture coupling

`onupgradeneeded` is `if (!contains(X)) createObjectStore(X)` plus the explicit destructive recreate at `db.ts:113-115` (`if (db.objectStoreNames.contains('marks')) deleteObjectStore('marks')`). No back-fill cursor, no `_shapes` versioning, no migration plumbing of any kind. **Forward projection:** hifz forces v6, SRS v7, full-text + reading-plan piggyback v6/v7, sync v8 with **per-record field add to every existing store**. A single major release moves DB v5 → v8 with an every-store mutation in v8. Acceptable now (no users); becomes blocker the day a user-visible release is gated.

### CC-7. The asset/SW strategy is a single-route monolith

> **Sources:** A3 §SW · A3 §Future asset projection · A5 §HALF-A #13/#14

Single `/dataset/*` `NetworkFirst` route, `maxEntries: 200`, 1-year maxAge. Sized for Hafs-only days (~115 files); now serves 459. **Will silently LRU-evict offline corpus** on a user reading widely across all three riwayat. **Audio (1–3 GB/reciter)** under the same prefix inherits NetworkFirst (re-validates every play, hostile) and competes for the 200-entry cap. **Page-image mushaf (30–50 MB × 3)** the same. The `CACHE_DATASET` button currently promises "everything offline" — naive expansion when audio lands = silent 3 GB precache attempt that fails on storage quota. **Per-asset-class routing + per-feature opt-in selector are prerequisites** to the first GB-scale asset class shipping.

### CC-8. Boot order is encoded as line ordering

> **Sources:** A1 §Boot-flow brittleness · A5 §HALF-A audio

`app-bootstrap.ts` is 487 lines of sequenced `init*` calls. `initRiwayah` must precede `initReadingTypography` (line-height clamp depends on it); `initSafetySync` must precede the `__qaSuppressNextVersionChange` global; routes must register before `router.init()`. Inline comments do the work a dependency graph should do. **Every future-work item adds an `init*` call here.** Audio init must run after riwayah; SRS must run after marks; sync must run last. The next contributor will eyeball line ordering and get it wrong.

### CC-9. Bridge / persistent-overlay proliferation has no factory

> **Sources:** A1 §Bridge proliferation · A5 §HALF-A audio

Six bridge files today (`core/ui-bridge`, `marks/editor-bridge`, `nav/command-sheet-bridge`, `nav/nav-drawer-bridge`, `settings/panel-bridge`, `tag/session-bridge`). Pattern: persistent component calls `register*()` in `onMount`, non-component callers import the module-level function. Uniform but unscaled — audio adds a player overlay (#13 → bridge #7), mushaf adds a viewer overlay (#14 → bridge #8), tafsir adds a sheet (#12 → bridge #9). Either codify a `core/persistent-overlay.ts` factory `createOverlayBridge<API>()` or accept linear growth.

### CC-10. Dead-event silent failures hide real data loss

> **Sources:** A2 §Dead events

22 of 49 declared events have no listener. Most damaging cluster: **silent-failure events** — `MARKS_SAVE_FAILED` (`marks/store.ts:95`), `BOOKMARKS_SAVE_FAILED` (`bookmarks/store.ts:42`), `READER_POSITION_SAVE_FAILED` (`reader/position.ts:28`), `EDGES_SAVE_FAILED` (`edges/store.ts:68`), `DB_DELETE_BLOCKED` (`db.ts:172,215` — load-bearing for the 2026-04-28 `onblocked` retry path), `APP_INIT_ERROR`, `ROUTER_ROUTE_ERROR`. **The user has no way to know writes failed.** Whole `OFFLINE_DOWNLOAD_*` + `DATASET_UPDATE_*` pipeline silent: download progress, install state, SW timeout — all emit, no listener. Vestigial settings events (`SETTINGS_THEME_CHANGED`, `SETTINGS_FONT_SIZE_CHANGED`) duplicate rune mutations at the same callsite — pure noise.

### CC-11. Vocabulary drift will compound when audio lands

> **Sources:** A1 §Naming drift

Six concept-name conflicts already present: **mark vs tag** (`marks/store.ts` writes `MarkRecord`; UI lives in `tag/`), **layer vs facet vs category**, **canonical vs canon vs slug** (`_canon` vs `canonicalize` vs `_canonKind` for edges), **verseKey vs verseRef vs ayah vs aya_no**, **riwayah vs riwayat vs reciter**, **surface vs route vs view**. Audio brings #7 (`reciter` vs textual `riwayah` — Husary recites Hafs corpus; vocabulary collision is structural). Establish the dictionary now or it lithifies.

---

## 3. Conflicts between findings (where fixes interact)

The user explicitly asked for conflict analysis. These are pairs where one finding's fix changes the shape of another finding's fix — must be sequenced or bundled.

| # | conflict | resolution |
|---|---|---|
| C-1 | **`core/db.ts` split (P1-1) ↔ schema migration plumbing (P1-3) ↔ test fixture `_APPLY_SCHEMA_SRC` (A5 #5)** — splitting db.ts into connection/types/validation moves the schema source, but the e2e fixture hand-mirrors that schema; landing in different commits drops e2e red between them. | Land all three together as a single `core/db-restructure` PR. New layout: `core/db/connection.ts` (open + retry + visibility), `core/db/migrations.ts` (versioned `_shapes` + cursor-walk back-fill helper), `core/db/types.ts` (LayerName, *Record, Riwayah). Test fixture imports `core/db/migrations.ts` directly (no hand-mirror). |
| C-2 | **Settings god-bag split (P1-2) ↔ safety/sync generalisation (P1-5)** — splitting `settings` into `readerSettings` + `readingState` + `scratchpad` invalidates the per-store `marks:changed`-style message types because "settings" is no longer one identity. | Bundle: introduce `{ store, keys, originDeviceId, lastModified }` generic broadcast in the same PR that splits settings. Old per-store types deprecated to thin wrappers, removed in next release. |
| C-3 | **Verse-grain abstraction (CC-1) ↔ reader virtualisation (A3 §Memory leak #4) ↔ marks/bookmarks indicator caches (A1 §marks/store.ts)** — virtualising the reader (recycling DOM verses) breaks the indicator cache (Map keyed by verseKey assuming DOM persistence). Word-by-word triples per-verse DOM cost simultaneously. | Define a `tokenizable-element` contract first (`data-token-key="surah:ayah[:wordIdx]"` + a `getTokenAt(x,y) → TokenKey` helper); convert long-press / click-handler / scroll-tracker / indicator to consume that contract; then virtualise; then word-by-word can ship without re-tokenising consumers. Order matters — virtualising before the contract = re-write twice. |
| C-4 | **CC-7 per-asset-class SW routing ↔ CACHE_DATASET UX promise** — current "Cache for offline" button promises full corpus. Adding audio under any precache-friendly strategy means tapping that button could trigger silent multi-GB download. | Per-feature offline opt-in selector ships **before** any GB-scale asset class. UI must render category checkboxes (Text · Audio per reciter · Mushaf images per riwayah) with size estimates. Refuse to bundle this with audio v2.0 — design and ship the selector in v1.2 alongside the SW partition. |
| C-5 | **`safety/sync.ts` ↔ `settings/riwayah.ts` import cycle (CC-4) ↔ adding any audio cross-tab broadcast** — current cycle is load-bearing because each side imports a function. Adding any top-level side-effect import deadlocks. | Invert dependency: features `register({ topic, apply })` with sync at boot. `safety/sync.ts` owns no feature knowledge — it routes envelopes by `topic`. `settings/riwayah.ts` registers `{ topic: 'settings.riwayah', apply: applyRiwayah }`. Cycle dissolves. Required before audio's playback-position broadcast. |
| C-6 | **CSP `unsafe-inline` removal ↔ Svelte `style:` directives for tag colors** — removing `'unsafe-inline'` requires every `style="background: var(--lh-{group})"` and per-tag inline color to move to CSS variables on parent or to a generated stylesheet. | Long refactor; do not block on it. Land `frame-ancestors 'none'` and CSP-via-headers immediately (P0-adjacent); plan `unsafe-inline` removal for v1.3 alongside the inline-style audit. |
| C-7 | **Dead-event deletion (CC-10) ↔ EDGES_* placeholders for v1.1** — deleting all dead events removes hooks the v1.1 edge-creation UI is supposed to land on. | Two-pass: delete only events that have NO future-work entry (`SETTINGS_THEME_CHANGED`, `SETTINGS_FONT_SIZE_CHANGED`, vestigial telemetry). Wire silent-failure events (`*_SAVE_FAILED`, `DB_DELETE_BLOCKED`) into the existing `quota-banner.svelte` toast pattern — same commit. Leave EDGES_* with `// roadmap: v1.1` markers and an explicit listener-wired test the day they emit. |
| C-8 | **Schema migration plumbing (P1-3) ↔ pre-release schema-change-freedom memory** — memory says "no users yet, schema changes free." But landing migration plumbing now adds maintenance surface even before a user exists. | Compromise: land migration plumbing as *helpers* (versioned `_shapes`, cursor-walk back-fill utility, stable `bumpVersion()` API), do not require their *use* until first user-visible release. Adds ~150 LOC of dormant infrastructure. Cheap insurance. |
| C-9 | **Settings split (P1-2) ↔ multi-writer leaks (`translationVisible`, `lastSurface`)** — fixing the multi-writer first means rewriting again when settings split lands. | Bundle: the split *is* the multi-writer fix — every key gets a sole-writer module. Stop fixing in two passes. |
| C-10 | **`saheeh.raw.json` deletion (P0-2) ↔ `scripts/build-dataset.mjs:7,47`** — the file is a build *input*; deleting from `public/` may break the build. | Move `public/dataset/translations/saheeh.raw.json` → `data/raw/saheeh.raw.json` (outside Vite's `public/`); update `build-dataset.mjs` source path. Trivial; no build break. |

---

## 4. Per-domain findings (consolidated)

Each finding cited inline with `file:line`; full evidence in `tmp/audit-NN-*.md`.

### 4.1 Module coupling + file-size — *full audit: `tmp/audit-01-coupling.md`*

- **9 files >300 LOC.** Worst offenders: `review/Hub.svelte` (782 — three modes + raw `lastSurface` write that races the router), `nav/CommandSheet.svelte` (556 — five search sources + inline commands), `app-bootstrap.ts` (487 — composition root + iOS reshape + SW lifecycle), `reader/Reader.svelte` (501 — pure translation-join logic stuck inside component), `settings/Panel.svelte` (474 — bypasses sole-writer modules to write IDB raw 4× direct), `nav/NavDrawer.svelte` (428), `core/db.ts` (370), `marks/Editor.svelte` (344 — *dead by policy per `feature-map.md` §57 yet still present*), `data/offline.ts` (314), `onboarding/Onboarding.svelte` (309 — `isComplete()` lives in `<script module>`, forcing `app-bootstrap.ts:355` to import the whole component just to read one IDB key).
- **Six bridge files** (182 LOC); `tag/session-bridge.ts` is a smell (thin rune wrapper, not persistent-overlay seam).
- **State runes leak** — `state/tag-session.svelte.ts:9-10` imports `LayerName` from `core/db`, contradicting documented "zero imports" invariant.
- **Cross-feature reach-throughs:** `reader/global-position.ts` imported by three nav/surah surfaces — should be hoisted to `state/position.ts`. `nav/NavDrawer` imports `BookmarksList` from `bookmarks/` — new edge not on the mermaid graph (doc rot).

### 4.2 State + events + IDB — *full audit: `tmp/audit-02-state-data.md`*

- **22 of 49 events dead.** Silent-failure cluster (highest priority): `MARKS_SAVE_FAILED`, `BOOKMARKS_SAVE_FAILED`, `READER_POSITION_SAVE_FAILED`, `EDGES_SAVE_FAILED`, `DB_DELETE_BLOCKED`, `APP_INIT_ERROR`, `ROUTER_ROUTE_ERROR`. Vestigial settings events (delete: `SETTINGS_THEME_CHANGED`, `SETTINGS_FONT_SIZE_CHANGED`). Whole offline-cache + dataset-update pipeline silent. `REVIEW_FILTER` declared in `constants.ts:34` but `events.md` claims emitter — doc drift.
- **3 multi-writer IDB violations:** `activationState` (client + SW shape mismatch — known per `data-model.md:184-191`), `settings.translationVisible` (Panel + bridge), `settings.lastSurface` (router + Hub).
- **6 race conditions** documented; worst is the riwayah cross-tab handler at `safety/sync.ts:154` that updates DOM but not the rune — peer tabs end up with stale `settings.riwayah`.
- **Forward-projection from future-work**: hifz forces v6, SRS v7, sync v8 with per-record field add to every store. Current `onupgradeneeded` cannot express it.
- **Cross-tab coverage:** 4 of 16+ persisted concepts broadcast.
- **Event-bus typing is one of the strongest parts of the architecture** (`core/events.ts` is fully typed against `EventPayloads` in `constants.ts:65-115`); minor wildcard-listener dead-code.
- **Clear-data is robust** (full IDB drop covers any future store automatically); `localStorage` intentionally not cleared but currently unused.

### 4.3 Performance + assets + SW — *full audit: `tmp/audit-03-perf-assets.md`*

- **Bundle is small** (~87 KB gzip total, 0 warnings, well under 500 KB budget). `Rule 8` holds.
- **`vite.config.js:90-97` `manualChunks` is dead** — five of six rules reference files that no longer exist; eager chunk inflated by ~12 KB gzip.
- **`saheeh.raw.json` ships 2.1 MB of pure waste** in `dist/` (P0).
- **`maxEntries: 200` cap vs 459 manifest files** silently LRU-evicts offline corpus (P0).
- **`reshape()` walks ALL verses on every chunk-append** (`app-bootstrap.ts:116-140`), one-line fix scoping to `mutation.addedNodes` (P0).
- **`aya_text_emlaey` field is 30% of Hafs corpus bytes** with zero readers in `src/`; drop saves ~800 KB on Hafs alone.
- **Dataset duplication ratio:** ~16% of each riwayah file is shared metadata; common-base/diff scheme not worth the complexity (~1.5 MB save).
- **No SW dispatch for AUDIO / PAGE-IMAGES future-work** (CC-7).
- **Update poller (30-min interval + visibility/focus)** thunders on multi-tab heavy users; `lastPollAt` 5-min debounce in 5 lines.
- **Reader has no virtualisation** — 14k–40k DOM nodes on Al-Baqarah (acceptable today, breaks under WBW 8–12× growth).
- **`index.html:34` Amiri-Quran warmup div is dead** (font isn't shipped); delete.

### 4.4 Security — *full audit: `tmp/audit-04-security.md`*

- **5 CodeQL alerts root-caused:** two `incomplete-multi-character-sanitization` traced to `HTML_TAG_RE = /<[^>]+>/g` plus a loose `SUP_RE` in `fetch-translation-saheeh.mjs`; `http-to-file-access` is filename-safe but exposes a missing **upstream-content pin** (supply-chain High); two unused-variable alerts trace to dead `failures` array.
- **XSS surface today is clean** — zero `{@html}`/`innerHTML`; Svelte text-interpolation throughout; footnote markers gated by `\d+` capture; `validateTagLabel` enforces 50-char + control-char reject. **One gotcha:** `MarkRecord.note` is not surfaced anywhere yet — the day a "note preview" surface ships, reviewer must enforce text-only rendering. Encode this as an explicit invariant.
- **Deep-link router validation is denylist** (`router.ts:96-138`); per-route validation only on FVR (`Hub.svelte:374`). Missing: per-surah ayah-bound check at route level (`#/s/2/99999` UX bug), `lastSurface` re-validation on launch.
- **CSP gaps:** missing `frame-ancestors 'none'` (clickjacking open); meta-only CSP, no header; `style-src 'unsafe-inline'` broad; `script-src 'sha256-…'` is a placeholder for a non-existent inline script.
- **IDB write-side validation gaps:** no length cap on note (UI 500ch, writer accepts unlimited); no per-element cap on tag arrays; bookmark `riwayah` accepts any string; settings `value: any`. **All become exploitable when MARKS IMPORT (#8) ships.**
- **BroadcastChannel** trusts `verseKeys` array elements without per-element validation — recommend `verseKeys.every(k => /^\d+:\d+$/.test(k))` + length cap.
- **SW manifest fail-open** (P0) at `sw-handlers.js:56-58`.
- **Build-script trust:** no upstream-pin on Saheeh fetch; no request-size cap; no SRI for CDN response.

### 4.5 Future-fit + tests — *full audit: `tmp/audit-05-future-fit.md`*

- **5 of 18 future-work items are clean ≤5-file drop-ins** (juz nav, memorization flag, copy/share, page-breaks, hide-drill) — bundle as v1.1.
- **8 mid-fit additive** (full-text, plan, export/import, transliteration, tajweed, tafsir, SRS, compare).
- **3 force re-architecture:** audio (#13, ~25+ files, persistent player overlay + new SW range-cache), page-image mushaf (#14, asset blowout + selection model), sync (#17, every store gains tombstone + breaks sole-writer invariant).
- **#9 word-by-word is the highest-risk "additive" feature** (CC-1).
- **#18 community contradicts no-accounts privacy stance** in `product-info.md`.
- **HALF-B test architecture:** 80 unit / 11 e2e; 635 unit cases / ~131 chromium e2e cases. Five Rule-7/9 violations found. **Rule 5 violation rate ≈60% on last 10 fixes** — six commits ship without regression test.
- **`global-setup.ts` (Rule 7.5) does not exist.** Every test pays cold-boot setup tax.
- **`journey-d-settings.spec.js` regressed Rule 7.3** (5 nested `beforeEach`).
- **Rule 7.4 mobile tag-gate inverted** — Mobile Chrome project runs every untagged spec on top of chromium; ~50 redundant cases.
- **`_APPLY_SCHEMA_SRC` in `tests/e2e/fixtures/idb.js`** is a single fixture point of failure (CC-2 / C-1).
- **Cumulative future-work test cost** ceiling: +2.7s unit / +40–50s e2e if every roadmap feature ships. Audio + mushaf + sync = 60% of e2e delta.

---

## 5. Maintainability + design-flaw risk register

Severity scale: **Critical / High / Medium / Low**. Blast-radius = number of files touched if the worst-case symptom manifests.

| ID | finding | severity | maintainability impact | blast radius | source |
|----|---|---|---|---|---|
| R-01 | SW manifest fail-open | **Critical** | every offline user can be served unverified bytes | 1 file fix; whole dataset cache integrity | A4 |
| R-02 | `saheeh.raw.json` ships to clients | **High** | bandwidth + storage; advertises pipeline | 1 file move | A3 |
| R-03 | `maxEntries: 200` vs 459 files | **High** | offline reads fail silently | 1 line | A3 |
| R-04 | `reshape()` over-walks | **High** | iPhone perf complaint surface | 1 line | A3 |
| R-05 | Rule-5 ≈60% violation rate | **High** | every regression repeat-fixed; trust erosion | continuous | A5 |
| R-06 | Verse-grain DOM no escape hatch (CC-1) | **High** | WBW + audio + tajweed all blocked or duplicated work | 6 modules at first WBW lands | A1, A5, A3 |
| R-07 | `core/db.ts` god module (CC-2) | **High** | every new store touches it; types drag runtime; e2e fixture diverges | ~32 importers; 9 fixture-coupled specs | A1, A2, A5 |
| R-08 | Settings god-bag (CC-3) | **High** | 15-file validator drift; multi-writer leaks; 3 race conditions | ~15 readers + 3 race callers | A1, A2 |
| R-09 | Schema migration absent (CC-6) | **High** | first user-visible release closes window | every store at first user-visible delta | A2 |
| R-10 | `safety/sync.ts` per-feature dispatcher + cycle (CC-4) | **High** | sync v2 deprecation churn; second cycle on audio | 4 today, 7+ at v2 | A1, A2 |
| R-11 | Asset/SW single-route monolith (CC-7) | **High** | audio/mushaf can't ship without selector | full SW + manifest model | A3 |
| R-12 | Boot order line-coded (CC-8) | **Medium** | next contributor reorders → boot break | every future `init*` call | A1 |
| R-13 | Bridge proliferation no factory (CC-9) | **Medium** | linear growth with persistent overlays | 6 today, +3 by v2 | A1 |
| R-14 | Dead-event silent failures (CC-10) | **Medium** | data loss invisible to user | 7 silent-failure events | A2 |
| R-15 | `global-setup.ts` (Rule 7.5) absent | **Medium** | suite wall-time tax compounds with every spec | every e2e test | A5 |
| R-16 | `_APPLY_SCHEMA_SRC` fixture mirror | **Medium** | red suite at every DB version bump | 9 specs | A5 |
| R-17 | Vocabulary drift (CC-11) | **Medium** | onboarding cost + audio "reciter vs riwayah" collision | conceptual; permeates docs | A1 |
| R-18 | Build-script no upstream pin | **High** *(supply-chain)* | poisoned dataset reaches users | every build | A4 |
| R-19 | CSP gaps (frame-ancestors, headers, unsafe-inline) | **Medium** | clickjacking; CSS-injection vectors | global | A4 |
| R-20 | IDB write-side length/enum gaps | **Medium → High at MARKS IMPORT** | quota-DoS via crafted import | marks + bookmarks stores | A4 |
| R-21 | BroadcastChannel element-validation gap | **Low** | proto pollution latent | downstream consumers | A4 |
| R-22 | Reader no virtualisation | **Medium** | OOM / jank under WBW 8–12× DOM growth | reader hot path | A3 |
| R-23 | manualChunks dead config | **Low** | +12 KB gzip eager | 1 file | A3 |
| R-24 | `aya_text_emlaey` 30% Hafs payload, no readers | **Medium** | bandwidth waste | 1 schema + 1 build script | A3 |
| R-25 | Boundary leaks: UI reads IDB raw | **Medium** | sole-writer rule erosion | 4 callsites | A1 |
| R-26 | Update-poll thundering-herd risk | **Low** | minor traffic on multi-tab | 5 lines | A3 |
| R-27 | Race conditions (riwayah/theme/recent) | **Medium** | divergence between IDB and rune | 4 writers | A2 |
| R-28 | Rule 7.3 regression in journey-d | **Low** | redundant setup work | 1 spec | A5 |
| R-29 | Rule 7.4 mobile tag inversion | **Medium** | ~50 redundant cases × every CI run | mobile project | A5 |
| R-30 | Marks/Editor.svelte dead-by-policy still mounted | **Low** | code duplication with TagSheet | 1 file | A1 |
| R-31 | onboarding component imported just for `isComplete()` | **Low** | +10 KB on launch path | 1 file split | A1 |
| R-32 | `connect-src` will need explicit allow-list at sync v2 | **Low → Medium** at v2 | accidental allow-all if forgotten | 1 directive | A4 |
| R-33 | No SRI on `manifest.webmanifest` icons | **Low** | latent if icons ever served from CDN | 1 file | A4 |
| R-34 | `public/index.html` Amiri-Quran dead warmup div | **Low** | confusion only | 1 element | A3 |

**34 findings; 4 Critical/High supply-chain or data-loss risks (R-01, R-18 both High; R-05 ongoing; R-11 strategic).**

---

## 6. Optimum target architecture

The architecture that absorbs every `future-work.md` item with **least blast radius, least file churn, max performance, max security**. Each layer addresses a specific cross-cutting truth from §2.

### 6.1 Layer model (target)

```
                       ┌─────────────────────────────────────────────┐
                       │           UI surfaces (Svelte 5)            │
                       │   Reader · Review · Settings · Onboarding   │
                       │   Drawer · CommandSheet · Mushaf · Audio    │
                       └──────────────┬──────────────────┬───────────┘
                                      │  read runes      │  call bridges
                       ┌──────────────▼──────────────────▼───────────┐
                       │    State runes (`state/*.svelte.ts`)         │   ← rule: zero runtime imports
                       │  reader · settings (split) · tagSession ·    │     types from `core/types` only
                       │  bookmarks · review · audio · hifz · srs ·   │
                       │  search · plan · mushaf · compare · sync     │
                       └──────────────┬──────────────────────────────┘
                                      │  emit/listen
       ┌──────────────────────────────▼──────────────────────────────┐
       │          Typed event bus (`core/events.ts`)                  │   ← already strong; keep
       │  fully-typed payloads, dev-mode unknown-event guard          │     route silent-failure events
       └──────────────────┬──────────────────────────────┬────────────┘
                          │                              │
        ┌─────────────────▼────────────┐   ┌─────────────▼────────────┐
        │  Domain stores (sole writer) │   │  Sync envelope router    │   ← inverted dep; features
        │  marks · edges · bookmarks · │◄──┤  `safety/sync.ts`         │     register({topic, apply})
        │  hifz · srs · readingPlan ·  │   │  generic `{store, keys,   │
        │  searchIndex · audio · …     │   │   originDeviceId, lm}`    │
        └─────────────────┬────────────┘   └─────────────┬────────────┘
                          │  put/get                     │  postMessage
                          │                              │
        ┌─────────────────▼──────────────────────────────▼────────────┐
        │  Core data layer (`core/db/`)                                │
        │  ├ connection.ts      (open + onversionchange + onblocked)   │
        │  ├ migrations.ts      (versioned _shapes + cursor back-fill) │
        │  ├ types.ts           (LayerName · *Record · Riwayah)        │   ← imported by state/state, tests
        │  └ validate.ts        (per-store length/enum/proto-strip)    │
        └─────────────────────────────┬────────────────────────────────┘
                                      │
        ┌─────────────────────────────▼────────────────────────────────┐
        │  Asset layer + SW                                            │
        │  - per-route strategy (text · audio · pages · search · fonts)│   ← per-asset-class
        │  - per-feature offline opt-in selector                       │
        │  - manifest signed (digest in bundle define)                 │
        │  - SHA-256 fail-CLOSED                                       │
        └──────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────────────────────┐
        │  Init dependency graph (`core/init-graph.ts`)                │   ← replaces line-order
        │  init nodes declare {name, deps, init() → cleanup}           │     in app-bootstrap.ts
        │  boot topologically sorts                                    │
        └──────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────────────────────┐
        │  Persistent overlay protocol (`core/persistent-overlay.ts`)  │   ← replaces ad-hoc bridges
        │  createOverlayBridge<API>({ open, close, isOpen })           │
        │  audio player, mushaf viewer, tafsir sheet all use this      │
        └──────────────────────────────────────────────────────────────┘
```

### 6.2 Concrete primitives to introduce (named, not code)

1. **`core/init-graph.ts`** — `register({ name, deps, init() → cleanup })`; `boot()` topologically sorts and runs. Replaces `app-bootstrap.ts:148-184` line-order. CC-8.
2. **`core/persistent-overlay.ts`** — `createOverlayBridge<API>(opts)`; replaces all six `*-bridge.ts` files with one factory + per-overlay declaration. CC-9.
3. **`core/db/{connection,migrations,types,validate}.ts`** — replaces `core/db.ts`. Type-only consumers import `core/db/types.ts` (no runtime drag). CC-2.
4. **`core/tokenisable.ts`** — defines `data-token-key="surah:ayah[:wordIdx]"` contract and `getTokenAt(x,y) → TokenKey` helper. `marks/long-press.ts`, `bookmarks/click-handler.ts`, `reader/scroll-tracker.ts`, `marks/indicator.ts`, `audio/highlight.ts` all consume this. Word-by-word, audio verse-tick, and tajweed share infrastructure. CC-1.
5. **Settings split: `state/reader-settings.svelte.ts` + `state/reading-state.svelte.ts` + `state/scratchpad.svelte.ts`**. Each typed; each backed by its own IDB record. Multi-writer leaks vanish because there's no shared `settings` store to leak into. CC-3.
6. **Generic broadcast schema in `safety/sync.ts`**: `{ topic, store?, keys?, originDeviceId, lastModified }`. Features `register({ topic, apply })` at boot. Per-store types deprecated. CC-4 + C-5.
7. **`offline/offline-selector.svelte`** — per-feature opt-in (Text · Audio per reciter · Pages per riwayah · Search index) with size estimates. Ships in v1.2 alongside the SW partition. CC-7 + C-4.
8. **`core/sw/strategies.ts`** — per-asset-class routing: `/dataset/riwayat/*` (NetworkFirst, no eviction), `/dataset/audio/{reciter}/*` (CacheFirst, per-reciter cache, range-aware), `/dataset/mushaf-pages/{riwayah}/*` (CacheFirst, content-addressed), `/dataset/search-index.json` (CacheFirst, single asset). Manifest digest baked into bundle via Vite `define`. Fail-closed. CC-5 + CC-7.
9. **`core/silent-failure-toast.ts`** — wires the seven dead silent-failure events into the existing `quota-banner.svelte` toast pattern. CC-10.
10. **`tests/e2e/global-setup.ts`** — reuses onboarded `storageState` per Rule 7.5; e2e fixture imports the *real* `core/db/migrations.ts` schema (no hand-mirror). C-1 + R-15 + R-16.

### 6.3 Invariants to encode (and enforce)

| invariant | enforcement |
|---|---|
| Every IDB store has exactly one writer module | grep test in CI: `grep -l "objectStore('STORE')\.(put\|add\|delete)" src/ \| wc -l == 1` |
| State runes have zero runtime imports (types ok) | eslint rule on `state/*.svelte.ts` |
| No `@html`, `innerHTML`, `outerHTML` in `src/` | already-passing grep; turn into eslint rule |
| User content never rendered via `@html` | dedicated lint rule + invariant in `user-journeys.md` |
| Settings reader never reads raw IDB; only via state rune | grep test on `state/reader-settings.svelte.ts` consumers |
| Every `emit(EVENT)` has at least one `on(EVENT)` listener (or roadmap marker) | dev-mode counter; CI check at `pnpm check` |
| Every `core/db/_shapes.X` has a length cap on every `string` field | unit test enumerates `_shapes` |
| Every persistent overlay uses `createOverlayBridge` | grep test against `register*()` direct callers |
| Every new init module declares `{deps}` to `core/init-graph` | type system: `core/init-graph` only accepts the declarative form |
| Footnote / Arabic / translation rendering goes through Svelte text-interp only | eslint custom rule rejecting `@html` in `reader/` files |
| `connect-src` CSP allow-list documented per future-work entry | doc linter on `docs/context/future-work.md` |

### 6.4 Performance posture

- Reader virtualisation via `IntersectionObserver` recycler keeping ±3-chunk window — caps DOM at ~150 verses. **Required before WBW.**
- Tokenisable contract enables word-level virtualisation later without re-doing consumers.
- `reshape()` scoped to `mutation.addedNodes` (P0-5).
- `manualChunks` rewritten against current paths; bootstrap split to its own chunk.
- Lazy-mount overlays in `App.svelte` on first `open*()` call; eager chunk drops ~10–15 KB gzip.
- `aya_text_emlaey` and unused `id` / `line_*` fields stripped from non-Hafs corpus → ~35% corpus reduction.
- Update-poll `lastPollAt` 5-min debounce.

### 6.5 Security posture

- SW SHA-256 chain fails CLOSED; manifest digest baked into bundle (CC-5).
- Build-script upstream pin (`scripts/saheeh-api.sha256` + `--update-pin` flag).
- CSP via HTTP headers (Cloudflare Pages `_headers`); add `frame-ancestors 'none'`; plan `unsafe-inline` removal v1.3.
- `validateWrite` enforces per-store length caps + enum constraints + `__proto__`/`constructor` strip — applied uniformly to UI writes AND import flows.
- `lastSurface` re-validated against registered route patterns at launch.
- BroadcastChannel payload schema-validated per type.
- Mark-import path runs through `validateImport(json)` with size + record-count caps.

### 6.6 Test posture

- `tests/e2e/global-setup.ts` ships **before** v1.1 sprint — reuses onboarded `storageState`, ~1–2 s saved per spec.
- Mobile Chrome project flips to `grep: /@mobile/`; ~50 cases drop.
- `_APPLY_SCHEMA_SRC` removed; fixture imports real schema from `core/db/migrations.ts` via Node-side serialisation.
- `journey-d-settings.spec.js` collapses 5 `beforeEach` to 1 + per-describe deltas.
- Rule-5 backfill: unit tests for the 6 missing-guard fixes (recent-surahs cap-7, swipe-delete, verse-id tap, three settings-preview fixes); break-and-restore-protocol verified.
- `journey-h-offline.spec.js:49` 10s `setTimeout` replaced with `waitForFunction` against SW state.

---

## 7. Priority-ordered remediation roadmap

Each tier is a sprint cluster; do not interleave. Total estimated cost in lower-bound effort.

### Tier P0 — block any further v1.1 work (~3 days)

Land as a single PR titled `chore(arch): P0 hardening`.

- [ ] **R-01** SW manifest fail-CLOSED at `sw-handlers.js:56-58`; bake manifest digest into bundle via `vite.config.js define`.
- [ ] **R-02** Move `public/dataset/translations/saheeh.raw.json` → `data/raw/saheeh.raw.json`; update `scripts/build-dataset.mjs` source path.
- [ ] **R-03** Raise `maxEntries: 200` → `500` (or remove cap; per-origin quota dominates).
- [ ] **R-04** Scope `reshape()` to `mutation.addedNodes` only; add unit test asserting only added nodes are walked.
- [ ] **R-05** Backfill 6 missing Rule-5 regression tests (5 unit, 1 e2e) for last 10 fixes; verify break-and-restore protocol on each.
- [ ] **R-19a** CSP: add `frame-ancestors 'none'` to current meta tag (header migration in P2).
- [ ] **R-23** Rewrite `vite.config.js manualChunks` against current paths; add `bootstrap` chunk.
- [ ] **R-34** Delete dead Amiri-Quran warmup div in `index.html`.

### Tier P1 — unblock v1.1 sprint (~2 weeks)

Strict sequence; later items depend on earlier. No future-work lands during this tier.

1. **`core/db.ts` split → `core/db/{connection,migrations,types,validate}.ts`** (R-07, C-1)
   - Land alongside `_APPLY_SCHEMA_SRC` removal in `tests/e2e/fixtures/idb.js` (R-16)
   - Migration plumbing: versioned `_shapes`, cursor-walk back-fill helper, stable `bumpVersion()` API (R-09)
2. **Settings split → `state/reader-settings.svelte.ts` + `state/reading-state.svelte.ts` + `state/scratchpad.svelte.ts`** (R-08, C-9)
   - Each key gets a sole-writer module; multi-writer leaks (R-08, R-27) closed in this commit
3. **Generic safety/sync envelope schema** (R-10, C-2, C-5) — `{ topic, keys?, originDeviceId, lastModified }`; features `register({ topic, apply })` at boot; cycle dissolved
4. **`core/init-graph.ts` dependency runner** (R-12) — replaces line-order in `app-bootstrap.ts`
5. **Dead-event triage** (R-14, C-7) — wire silent-failure events to `quota-banner.svelte`; delete vestigial `SETTINGS_THEME_CHANGED`/`SETTINGS_FONT_SIZE_CHANGED`/dead telemetry; add `// roadmap: v1.1` markers to EDGES_*
6. **`tests/e2e/global-setup.ts`** (R-15, Rule 7.5 prerequisite)
7. **Mobile Chrome project tag-gate flip** (R-29, Rule 7.4)
8. **Build-script upstream pin** (R-18) — `scripts/saheeh-api.sha256` + `--update-pin` flag; tighten `SUP_RE` + fixedpoint loop for the two CodeQL Medium alerts
9. **IDB write-side validation: length caps + enum on `bookmarks.riwayah` + `__proto__` strip** (R-20)
10. **Boundary-leak sweep** (R-25) — `state/recent-surahs.svelte.ts` sole-reader for `NavDrawer` + `SurahList`; same for translation-id

After Tier P1: every v1.1 future-work item drops into ≤5 files as projected in Audit 5 HALF-A.

### Tier P2 — unblock v1.2 / pre-audio (~3 weeks)

12. **Tokenisable contract** (R-06, C-3) — `core/tokenisable.ts`; convert long-press / click-handler / scroll-tracker / indicator
13. **Reader virtualisation** (R-22) — IntersectionObserver recycler keeping ±3 chunks
14. **Per-asset-class SW routing + per-feature offline opt-in selector** (R-11, C-4) — `core/sw/strategies.ts` + `offline/offline-selector.svelte`
15. **Persistent-overlay factory** (R-13) — `createOverlayBridge<API>()`; migrate 6 existing bridges
16. **Strip `aya_text_emlaey` + unused `id` / `line_*` from non-Hafs corpus** (R-24) — ~35% dataset reduction
17. **CSP migration to HTTP headers + `connect-src` per-feature allow-list framework** (R-19, R-32)
18. **Lazy-mount overlays in `App.svelte`** — eager chunk drops ~10–15 KB gzip
19. **Update-poll `lastPollAt` debounce** (R-26)
20. **Vocabulary dictionary** (R-17) — `docs/context/glossary.md`; reciter vs riwayah disambiguation locked before audio

### Tier P3 — unblock v2 (audio + sync) (open-ended)

21. **Range-request handler + media-session integration** for audio
22. **Op-log + tombstone field on every record** for sync (every existing store touched)
23. **Crypto threat model document** before any sync code lands; consider third-party crypto audit before launch
24. **`unsafe-inline` removal** (R-19c) — refactor inline `style:` to CSS variables
25. **Visual-regression linux baselines** (already in `future-work.md` §Infrastructure)

---

## 8. Conflicts that the roadmap explicitly resolves

For each conflict in §3, the tier where it lands:

| conflict | tier | resolution |
|---|---|---|
| C-1 db split + migration + fixture | P1.1 (single PR) | bundle, no in-between red |
| C-2 settings split + sync generalisation | P1.2 + P1.3 (consecutive, same sprint) | per-store types deprecated alongside split |
| C-3 verse-grain + virtualisation + indicator caches | P2.12 → P2.13 (strict order) | tokenisable first, then virtualise |
| C-4 SW partition + CACHE_DATASET UX | P2.14 | partition + selector ship together |
| C-5 sync cycle | P1.3 | invert dep before audio |
| C-6 CSP unsafe-inline | P3.24 | long refactor; not blocking |
| C-7 dead events + EDGES_* | P1.5 | two-pass: delete vestigial, wire failures, leave roadmap markers |
| C-8 migration plumbing vs pre-release freedom | P1.1 | helpers landed dormant; no migration *required* yet |
| C-9 settings split = multi-writer fix | P1.2 | one PR, not two |
| C-10 saheeh.raw.json move | P0.2 | trivial path move |

---

## 9. Final scorecard

| dimension | current state | target state | gap |
|---|---|---|---|
| **Blast radius** of avg new feature | 8–18 files (per A5 HALF-A) | ≤5 files for v1 items, ≤15 for v2 | bridge factory + tokenisable + db split + sync inversion close most of it |
| **File churn** per future-work item | growing (god modules accumulate touches) | flat (each item lands in its own dir, registers with cores) | init-graph + overlay factory + sync registration |
| **Performance ceiling** | ~30 KB gzip eager + ~14k DOM nodes max + 200-entry SW cap | ~18 KB gzip eager + virtualised ±3 chunks + per-class caches | manualChunks + lazy overlays + virtualisation + per-class strategies |
| **Security floor** | meta CSP, fail-open SW, no upstream pin, IDB length-cap gaps | header CSP + frame-ancestors, fail-closed SW, upstream pin, full IDB length/enum caps, BroadcastChannel schema | P0.R-01 + P1.8/.9 + P2.17 |
| **Test economics** | 60% Rule-5 violation; no global-setup; mobile project doubles work; fixture mirrors db.ts | Rule-5 100%; global-setup landed; mobile @-tagged; fixture imports real schema | P0.R-05 + P1.6/7 + P1.1 |
| **Architectural invariants** | line comments + memory + audit docs | enforced by eslint rules + CI grep tests | §6.3 invariant table |

---

## 10. What this audit deliberately did NOT do

- Did not measure real e2e wall-time on this commit (Rule 7's "~110s pre-audit" taken on faith from CLAUDE.md).
- Did not run accessibility-compliance or frontend-design red-teams (structural audit only).
- Did not red-team individual unit-test assertions; spot-checks confirmed Rule-9 scoping but suite-wide assertion quality is its own audit.
- Did not project costs of `Page-image rendering for authentic mushaf hands` (calligrapher selection — distinct from §14 page-anchoring; out of scope until contributor commits to asset pipeline per `future-work.md`).
- Did not propose backend architecture for §17 sync — that is a separate design exercise gated on the crypto threat model.
- Did not evaluate Cloudflare Pages / hosting-specific CSP migration mechanics — concrete deploy-config work for P2.17.

---

## 11. Bottom line

The architecture is **clean today** because a single developer carries the discipline. Three load-bearing assumptions (verse-grain DOM, settings god-bag, destructive IDB migration) and one hidden cycle (`safety/sync.ts` ↔ `settings/riwayah.ts`) absorbed Phases 1–6 by *coincidence*; the next 5 items in `future-work.md` will not be absorbed by coincidence. Tier P0 is a 3-day cleanup that removes immediate user-visible risk; Tier P1 (~2 weeks) lays the four primitives — split db, split settings, generic sync, init-graph — that determine whether v1.1 ships in a single sprint or fights its own architecture. Tier P2 builds the abstractions audio and word-by-word will collide against. Tier P3 is the open-ended v2 scope.

**Ship Tier P0 immediately. Ship Tier P1 before any v1.1 future-work commit lands.** Without that sequencing, the cost of every subsequent feature is bounded by its blast-radius into the current god modules — exactly the ceiling the roadmap was supposed to remove.

---

*Audit synthesised from five parallel red-team passes (`tmp/audit-{01..05}-*.md`). All findings cited at `file:line` against working tree at commit `4dd00f7` on branch `dev` (2026-04-29). Citations preserved verbatim; consult source audits for full reasoning.*
