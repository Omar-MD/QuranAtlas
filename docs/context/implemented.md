# Implemented

What QuranAtlas does today. Surface-grouped overview; per-surface invariants
and data shapes live in `surfaces/<name>.md`.

## Read

- Verse reader routes `#/s/:surah` and `#/s/:surah/:ayah`.
- Mushaf page reader route `#/m/:page` for the active riwayah.
- Reader-first continuity restore through validated `lastSurface` and
  `currentPosition`.
- Qalun baseline corpus with optional Hafs and Warsh packs.
- Translation overlay, tafsir preview/sheet, and curated knowledge lane.
- Reader typography controls, ambient chrome, and Daily Wird.

## Navigate

- Mobile nav drawer with Surahs, Juz, and Bookmarks.
- Desktop `#/surahs` and `#/bookmarks` surfaces.
- Riwayah-scoped bookmarks with cross-tab sync and landing pulse.
- Reader keyboard shortcuts and shortcuts sheet.

## Configure

- Settings sheet for theme, reading typography, sources, and storage.
- Offline controls for text, pages, search, and optional source packs.
- About page with clear-data flow.
- Qalun-first onboarding and source selection.

## Onboard

- Reader-first first-run flow.
- Theme, riwayah, translation, shortcuts, and finish screens.
- `onboardingComplete` gates launch restore and default entry.

## Infra

- IDB `quran-atlas` v7 with active stores: `settings`, `activationState`,
  `datasetMeta`, and `bookmarks`.
- Store validation through `src/core/db/validate.ts`.
- Service worker and offline/update lifecycle.
- Cross-tab bookmark sync and clear-data/update safety banner.
- Generated dataset manifests, provenance, and package metadata.

## Removed scope

- Audio/listen runtime is deleted.
- Personal marks/tags/review/edges runtime is deleted.
- Legacy removed-scope tests were deleted with the source cleanup.
