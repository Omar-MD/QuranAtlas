# Implemented

What QuranAtlas does today. Surface-grouped overview; per-surface invariants
and data shapes live in `surfaces/<name>.md`.

## Read

- Multi-riwayah corpus (Hafs / Warsh / Qaloon, KFGQPC Uthmanic) — `src/data/dataset.ts`.
- Translation overlay — Saheeh International default; `[N]` markers expand inline panels (`src/reader/translation-tokens.ts`).
- Translation-riwayah alignment via per-ayah Hafs↔Warsh↔Qaloon equivalence table (`public/dataset/translations/_verse-aliases.json`).
- Typography — 5-step font-size + 5-step reading-flow sliders, reset-to-default pill.
- Surah header + bismillah — collapsible per-user preference.
- Cross-surah swap — pull-past-edge / continue link with 114↔1 wrap.
- Reader virtualisation — chunked recycler, ±1 chunk window (max 60 verses live).
- Token-key DOM contract — `data-token-key` is the sole verse-identity attr.
- Ambient chrome — desktop AmbientDock, mobile MarginHeader auto-hide on scroll.
- Position persistence — `meta` store; warm-resume only restores when scroller at top.

## Mark

- Fast-tag inline panel — double-tap (touch) / right-click (desktop) / `m` keyboard sole entries.
- Deep TagSheet — escalation via panel `⛶`, `⌘/Ctrl+Enter`, or programmatic bridge.
- 12-layer schema — Speech / Narrative / Themes / Entities groups; `_canon` computed inside `marks/store.ts::save()` only.
- Empty-mark guard — ≥1 tag across the 12 layers required to persist.
- Cross-tab mark sync via BroadcastChannel.
- Delete with undo toast.

## Review

- `#/review` hub — 12-layer selector + group-by (Value / Surah / Date) + value chips + flat card list.
- `#/<layer>/:value` filtered-verse review (FVR) deep-link route.
- Activation state — last-viewed mark per filter persists across reload (`activationState` store).
- Multi-value OR filter on desktop ≥1180 px.
- Edges store (`edges` IDB store) — verse-to-verse relationships scaffold.

## Navigate

- Hash router — lazy-loaded modules, param sanitisation.
- Hamburger drawer (mobile) — full-screen, Surahs + Bookmarks + Study tabs; sole entry to full surah list on mobile.
- Command sheet `⌘K` — refs / surahs / tags resolve, inline verse preview.
- Surah directory `#/surahs` — desktop ≥1180 px standalone; mobile redirects to drawer.
- Bookmarks — single-tap toggle, riwayah-scoped (`bookmarks` store, ID `<riwayah>:<surah>:<verse>`).
- Bookmark jump pulse animation on landing.
- Keyboard shortcuts — `j`/`k`/`[`/`]`, `g`-chord nav, `?` cheatsheet, `+`/`-`/`0` font, `t`/`n`/`d`/`m` reader.

## Listen

- Audio architecture — single global `<audio>` (`audio/state.svelte.ts::getOrCreateAudioElement`).
- IDB `audioPosition` store — per-(reciter, surah) position + lastPlayedAt.
- Cross-tab playback gate — newest-press-wins via BroadcastChannel.
- Media-session metadata — lock-screen / Bluetooth / car controls; updates on surah/reciter change only.
- Mini-bar + full-overlay UI shells.
- Reader verse-tick highlight (via `data-token-key^="{S}:{V}"` selector).
- Smart-defer auto-scroll — yields to manual scroll for 5 s.
- SW per-reciter cache partition (CacheFirst).
- *(Reciter dataset, settings UI surfaces, A-B loop, "Play from here", e2e gated — see `roadmap.md`.)*

## Configure

- Settings sheet — full-viewport (mobile + tablet) / centered modal (desktop).
- Three sections: Reading (font size, reading flow) · Sources (recitation, translation) · Storage (offline opt-in selector) + Theme footer.
- Live preview band — Sūrat ar-Raḥmān 1–4 in active riwayah, theme-true colors.
- Theme — Light / Sepia / Dark / Auto; `<meta theme-color>` retints.
- Night-mode overlay — composes over any base theme.
- Storage — per-feature offline opt-in (text / audio / pages / search) with quota pre-flight.
- One writer per `settings` key.
- Clear-all-data link on About footer.

## Onboard

- 6-screen first-run flow — Welcome / Theme / Riwayah / Translation / Shortcuts / Tags-intro.
- Default Riwayah on first run = Qālūn.
- Translation picker derived from `provenance.json` at render time.
- Once `onboardingComplete = true`, surface unreachable until Clear-data.

## Infra

- IDB `quran-atlas` v6 — 8 stores: `settings`, `meta`, `marks`, `activationState`, `datasetMeta`, `edges`, `bookmarks`, `audioPosition`.
- Write gate — `src/core/db/validate.ts::validateWrite()` checks field presence + types.
- Compile-time `StoreRecords` map — `src/core/db/types.ts`.
- Service worker — Workbox, manifest-pinned dataset (SHA-256 chain, fail-closed).
- Generic sync envelope — `safety/sync.ts::registerTopic` + `broadcast`; topics for marks / edges / bookmarks / riwayah.
- Persistent-overlay factory — `src/core/persistent-overlay.ts`.
- SW route aggregator — `src/core/sw/route-defs.ts` + `strategies.ts`; per-asset-class cache partitions; `cleanupStaleCaches` preserves prefixes from `CACHE_PREFIXES`.
- Per-feature offline opt-in — `src/offline/offline-selector.svelte` + `src/data/offline.ts::startCategoryDownload`.
- CSP allowlist registry — `csp-allowlist.md` + `public/_headers` (regression guard `tests/unit/safety/csp-headers.test.ts`).
- Update banner — `controllerchange` → `APP_UPDATE_AVAILABLE` → `UpdateBanner.svelte`.
- Cross-tab clear-data banner — `versionchange` → "Data was cleared in another tab".
