# Feature map

> AUTO-GENERATED index of surface dossiers. Each dossier owns its own surface inventory + behavior + invariants. Run `pnpm docs:derive` to regenerate.

<!-- AUTO-GENERATED:dossier-index START -->
| Surface | Dossier | Purpose |
| --- | --- | --- |
| **configure** | [`surfaces/configure.md`](surfaces/configure.md) | Settings sheet (full-screen mobile + tablet, modal desktop) + About page. Reading section (font size, reading flow), Sources section (recitation = riwayah, translation), Theme footer, night-mode toggle, clear-all-data on About footer. Future absorption: tafsir picker, export/import, clear-cache, offline-opt-in selector, audio settings surfaces, storage section. |
| **infra** | [`surfaces/infra.md`](surfaces/infra.md) | Cross-cutting non-UI invariants. Service worker (offline reload, update banner, fail-closed manifest, per-asset-class cache partitions), cross-tab coherence (BroadcastChannel + IDB versionchange), dataset manifest fetch + apply, future sync v2. |
| **listen** | [`surfaces/listen.md`](surfaces/listen.md) | Audio recitation. Single global `<audio>` element + IDB position store + cross-tab gating + media-session + mini-bar + full-overlay + reader verse-tick highlight + smart-defer autoscroll. Architecture landed 2026-04-30. Future ship-blocking work (reciter dataset, settings UI surfaces, A-B loop, "Play from here" entry, e2e specs) tracked in `future-work.md` §Audio recitation §v2. |
| **mark** | [`surfaces/mark.md`](surfaces/mark.md) | Per-verse tagging. Fast-tag inline panel + deep TagSheet (12-layer editor) + marks IDB persistence + cross-tab sync. |
| **navigate** | [`surfaces/navigate.md`](surfaces/navigate.md) | Cross-surface navigation. Command sheet (⌘K), nav drawer (mobile full-screen tabbed), surah directory (desktop standalone, mobile via drawer), bookmarks (Reading mode + drawer Bookmarks tab), keyboard shortcuts. |
| **onboard** | [`surfaces/onboard.md`](surfaces/onboard.md) | First-run wizard + session-restore decision. 6 screens (Welcome → Theme → Riwayah → Translation → Shortcuts → Tags-intro). Sets `settings.onboardingComplete` then routes to `#/s/1`. On warm boot, when `onboardingComplete` is set, the router restores `settings.lastSurface` instead. |
| **read** | [`surfaces/read.md`](surfaces/read.md) | Reader chrome — verse rendering, ambient dock + pill + margin header, surah header + bismillah, cross-surah scroll, typography knobs, scroll-position persistence. NOT the marking flow (that's `mark` surface) — but excludes `reader/VerseTagPanel.svelte` which the `mark` dossier owns. |
| **review** | [`surfaces/review.md`](surfaces/review.md) | Aggregations + filters over marks. Review hub (12-layer selector + group-by + value chips + flat card list), FVR (Filtered-Verse Review) deep-link layer-value pages. Future absorption: typo-merge review, orphan-edges filter, SRS queue, hifz dashboard, edge-clusters, atlas routes, semantic-graph view, compare mode, community/shared collections. |
<!-- AUTO-GENERATED:dossier-index END -->
