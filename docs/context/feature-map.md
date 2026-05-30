# Feature map

> AUTO-GENERATED index of surface dossiers. Each dossier owns its own surface inventory + behavior + invariants. Run `pnpm run docs` to regenerate.

<!-- AUTO-GENERATED:dossier-index START -->
| Surface | Dossier | Purpose |
| --- | --- | --- |
| **configure** | [`surfaces/configure.md`](surfaces/configure.md) | Mode-aware Verse Settings, Mushaf Settings, inline read-only asset inventory, and About page for Reader First preferences: theme, night mode, typography, translation visibility, Mushaf view mode, and clear-all-data. The current MVP has one default reader profile: Qaloon text/font, Qaloon Mushaf, and Bridges translation. Source pickers, tafsir choices, and optional-pack controls are future work. |
| **infra** | [`surfaces/infra.md`](surfaces/infra.md) | Cross-cutting Reader First infrastructure. Service worker, default reader asset handling, manifest membership, byte planning, provenance, build-time validation, cross-tab safety, and update/clear-data banners. Optional install/activate asset-pack lifecycle is future multiple-profile work. |
| **listen** | [`surfaces/listen.md`](surfaces/listen.md) | Surface: listen |
| **mark** | [`surfaces/mark.md`](surfaces/mark.md) | Surface: mark |
| **navigate** | [`surfaces/navigate.md`](surfaces/navigate.md) | Reader navigation — nav drawer, Surah/Juz/Hizb browsing, bookmarks, reader mode switching, shortcuts, and Daily Wird entry points. Bookmark persistence and resume validation are consumed from `src/continuity/**`. |
| **onboard** | [`surfaces/onboard.md`](surfaces/onboard.md) | Retired first-run wizard route plus session-restore decision. The current MVP launch shows a short splash, silently applies the default reader asset reset when needed, and enters or restores the reader. Legacy `#/onboarding` hashes redirect through the same launch path without source choices. |
| **read** | [`surfaces/read.md`](surfaces/read.md) | Reader First core — Verse reader, Mushaf reader, ambient reader chrome, reader typography, bookmarks integration, page indicators, cross-surah scroll, and Daily Wird. The current MVP reads the default Qaloon text/font, Qaloon Mushaf, and Bridges translation profile. Tafsir UI and optional source packs are future work. |
| **review** | [`surfaces/review.md`](surfaces/review.md) | Surface: review |
<!-- AUTO-GENERATED:dossier-index END -->
