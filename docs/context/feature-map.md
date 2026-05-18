# Feature map

> AUTO-GENERATED index of surface dossiers. Each dossier owns its own surface inventory + behavior + invariants. Run `pnpm run docs` to regenerate.

<!-- AUTO-GENERATED:dossier-index START -->
| Surface | Dossier | Purpose |
| --- | --- | --- |
| **configure** | [`surfaces/configure.md`](surfaces/configure.md) | Mode-aware Verse Settings, Mushaf Settings, and About page for Reader First preferences: theme, night mode, typography, qira'ah/riwayah source, translation, tafsir, active Quran text style, active Mushaf edition, and clear-all-data. Pack-state policy now lives in `src/packs/**`; configure consumes those APIs and only changes active source settings once a pack is verified usable or explicitly switched back to the verified baseline. Audio is removed product scope pending source cleanup. |
| **infra** | [`surfaces/infra.md`](surfaces/infra.md) | Cross-cutting Reader First infrastructure. Service worker, offline asset-pack handling, install-state verification, manifest membership, byte planning, provenance, build-time validation, cross-tab safety, and update/clear-data banners. Audio cache routes are removed product scope pending source cleanup. |
| **listen** | [`surfaces/listen.md`](surfaces/listen.md) | Surface: listen |
| **mark** | [`surfaces/mark.md`](surfaces/mark.md) | Surface: mark |
| **navigate** | [`surfaces/navigate.md`](surfaces/navigate.md) | Reader navigation — command sheet, nav drawer, Surah/Juz browsing, bookmarks, reader mode switching, shortcuts, search entry, and Daily Wird entry points. Search grouping stays surface-owned in `src/navigate/search-contract.ts`, while bookmark persistence and resume validation are consumed from `src/continuity/**`. |
| **onboard** | [`surfaces/onboard.md`](surfaces/onboard.md) | First-run wizard + session-restore decision. Reading setup screens cover Welcome, Theme, Riwayah, Translation, Shortcuts, and Start Reading. Source choices call the same configure/packs-backed writers used after onboarding; the surface does not own separate source policy, and optional sources stay visibly unavailable until their pack is usable. Sets `settings.onboardingComplete` then routes to `#/s/1`. On warm boot, when `onboardingComplete` is set, the router restores `settings.lastSurface` instead. |
| **read** | [`surfaces/read.md`](surfaces/read.md) | Reader First core — Verse reader, Mushaf reader, ambient reader chrome, reader typography, bookmarks integration, tafsir, curated metadata display, page indicators, cross-surah scroll, and Daily Wird. Pack availability, continuity validation, and optional-metadata policy now live in `src/packs/**`, `src/continuity/**`, and `src/metadata/**`; the read surface consumes those domains while staying focused on rendering and interaction. |
| **review** | [`surfaces/review.md`](surfaces/review.md) | Surface: review |
<!-- AUTO-GENERATED:dossier-index END -->
