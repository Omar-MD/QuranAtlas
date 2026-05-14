# Feature map

> AUTO-GENERATED index of surface dossiers. Each dossier owns its own surface inventory + behavior + invariants. Run `pnpm run docs` to regenerate.

<!-- AUTO-GENERATED:dossier-index START -->
| Surface | Dossier | Purpose |
| --- | --- | --- |
| **configure** | [`surfaces/configure.md`](surfaces/configure.md) | Settings sheet and About page for Reader First preferences: theme, typography, qira'ah/riwayah source, translation, tafsir, curated metadata/storage packs, offline install state, night mode, and clear-all-data. Audio is removed product scope pending source cleanup. |
| **infra** | [`surfaces/infra.md`](surfaces/infra.md) | Cross-cutting Reader First infrastructure. Service worker, offline asset-pack handling, install-state verification, manifest membership, byte planning, provenance, build-time validation, cross-tab safety, and update/clear-data banners. Audio cache routes are removed product scope pending source cleanup. |
| **listen** | [`surfaces/listen.md`](surfaces/listen.md) | Removed product scope pending source cleanup. This dossier documents audio implementation that currently exists so cleanup can be done safely. Do not use it as a roadmap, v2 promise, or active product surface. |
| **mark** | [`surfaces/mark.md`](surfaces/mark.md) | Removed personal-layer implementation pending source cleanup. This dossier documents existing mark/tag code, persistence, and tests so cleanup can be done safely. Personal marks, user tags, notes, and tag review are not current product scope. |
| **navigate** | [`surfaces/navigate.md`](surfaces/navigate.md) | Reader navigation — command sheet, nav drawer, Surah/Juz browsing, bookmarks, reader mode switching, shortcuts, search entry, and Daily Wird entry points. Tag/review navigation is existing removed-scope implementation pending cleanup, not active product value. |
| **onboard** | [`surfaces/onboard.md`](surfaces/onboard.md) | First-run wizard + session-restore decision. Reading setup screens cover Welcome, Theme, Riwayah, Translation, Shortcuts, and Start Reading. Sets `settings.onboardingComplete` then routes to `#/s/1`. On warm boot, when `onboardingComplete` is set, the router restores `settings.lastSurface` instead. |
| **read** | [`surfaces/read.md`](surfaces/read.md) | Reader First core — Verse reader, Mushaf reader, ambient reader chrome, reader typography, saved position, bookmarks integration, tafsir, curated metadata display, page indicators, cross-surah scroll, and Daily Wird. Personal annotation creation is removed product scope pending source cleanup; existing mark indicators are implementation inventory only while the code remains. |
| **review** | [`surfaces/review.md`](surfaces/review.md) | Removed personal-layer implementation pending source cleanup. This dossier documents review/FVR/edges code that currently exists. Future personal annotations belong only in `docs/context/future.md` until separately approved and must stay separate from curated QuranAtlas metadata. |
<!-- AUTO-GENERATED:dossier-index END -->
