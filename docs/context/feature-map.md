# Feature map

> AUTO-GENERATED index of surface dossiers. Each dossier owns its own surface inventory + behavior + invariants. Run `pnpm run docs` to regenerate.

<!-- AUTO-GENERATED:dossier-index START -->
| Surface | Dossier | Purpose |
| --- | --- | --- |
| **configure** | [`surfaces/configure.md`](surfaces/configure.md) | Settings sheet (full-screen mobile + tablet, modal desktop) + About page. Reading section (font size, reading flow), Sources section (recitation = riwayah, translation), Storage section (per-feature offline opt-in selector), Theme footer, night-mode toggle, clear-all-data on About footer. |
| **infra** | [`surfaces/infra.md`](surfaces/infra.md) | Cross-cutting non-UI invariants. Service worker (offline reload, update banner, manifest-membership caching, per-asset-class cache partitions), cross-tab coherence (BroadcastChannel + IDB versionchange), dataset manifest fetch + apply, future sync v2. |
| **listen** | [`surfaces/listen.md`](surfaces/listen.md) | Audio recitation. Single global `<audio>` element + IDB position store + cross-tab gating + media-session + mini-bar + full-overlay + reader verse-tick highlight + smart-defer autoscroll. Future ship-blocking work (reciter dataset, settings UI surfaces, A-B loop, "Play from here" entry, e2e specs) tracked in `roadmap.md` §Listen. |
| **mark** | [`surfaces/mark.md`](surfaces/mark.md) | Per-verse tagging. Fast-tag inline panel + deep TagSheet (12-layer editor) + marks IDB persistence + cross-tab sync. |
| **navigate** | [`surfaces/navigate.md`](surfaces/navigate.md) | Cross-surface navigation. Command sheet (⌘K), nav drawer (mobile full-screen tabbed), surah directory (desktop standalone, mobile via drawer), bookmarks (Reading mode + drawer Bookmarks tab), keyboard shortcuts. |
| **onboard** | [`surfaces/onboard.md`](surfaces/onboard.md) | First-run wizard + session-restore decision. 6 screens (Welcome → Theme → Riwayah → Translation → Shortcuts → Tags-intro). Sets `settings.onboardingComplete` then routes to `#/s/1`. On warm boot, when `onboardingComplete` is set, the router restores `settings.lastSurface` instead. |
| **read** | [`surfaces/read.md`](surfaces/read.md) | Reader chrome — verse rendering, ambient dock + pill + margin header, surah header + bismillah, cross-surah scroll, typography knobs, scroll-position persistence. NOT the marking flow (that's the `mark` surface). |
| **review** | [`surfaces/review.md`](surfaces/review.md) | Aggregations + filters over marks. Review hub (12-layer selector + group-by + value chips + flat card list), FVR (Filtered-Verse Review) deep-link layer-value pages. |
<!-- AUTO-GENERATED:dossier-index END -->
