# Implemented

What QuranAtlas does today. Surface-grouped overview; per-surface invariants
and data shapes live in `surfaces/<name>.md`.

## Read

- Verse reader routes `#/s/:surah` and `#/s/:surah/:ayah`.
- Mushaf page reader route `#/m/:page` for the default Qaloon Mushaf.
- Reader-first continuity restore through validated `lastSurface` and
  `currentPosition`.
- Qaloon text/font and Qaloon Mushaf as the single MVP reader asset profile.
- Bridges translation with visibility toggle.
- Reader typography controls, ambient chrome, and Daily Wird.

## Navigate

- Mobile nav drawer with Surahs, Juz, Hizb, and Bookmarks.
- Desktop `#/surahs` and `#/bookmarks` surfaces.
- Riwayah-scoped bookmarks with cross-tab sync and landing pulse.
- Reader keyboard shortcuts and shortcuts sheet.

## Search

- `#/search` route for deterministic reference, Arabic text, translation/context, exact word form, exact phrase, same written form, same root, lemma, and Surah context search.
- Lazy core Search pack install/verify/activate on Search entry, with Search packs cached under `/search-packs/**` by the dedicated Search cache owner.
- Route-scoped lazy worker client; Reader cold launch does not fetch Search packs, decode Search graphs, or start the Search worker.
- Source-backed morphology details in Explore and Source panels, including Hafs-source labels, same-root interpretation warnings, and no Qalun word-level highlighting.
- Result list, result detail tabs for Match, Explore, and Source, and `Open in Read` only for validated single Reader mappings.
- Saved searches store user-created query definitions only; result windows are recomputed against the active compatible Search index.

## Configure

- Settings sheet for theme, night mode, reading typography, translation visibility, and Mushaf view mode.
- Read-only Asset Management and Settings inventory for the default Qaloon text/font, Qaloon Mushaf, and Bridges profile, using runtime asset-index labels.
- About page with clear-data flow.

## Onboard

- First-run onboarding is retired in the MVP contract.
- Cold launch shows a short splash, silently applies the one-time default-asset reset if needed, and enters or restores the reader.
- Legacy `#/onboarding` links redirect through the launch path without source choices.

## Infra

- IDB `quran-atlas` v8 with active stores: `settings`, `activationState`,
  `datasetMeta`, `bookmarks`, `savedSearches`, `searchPackActivations`, and `searchPackStaging`.
- Store schema through `src/storage/schema.ts` and Dexie helpers in `src/storage/**`.
- Vite PWA service worker and offline runtime dataset cache.
- Same-device bookmark sync and clear-data safety behavior.
- Generated dataset manifests, provenance, and package metadata.

## Removed scope

- Audio/listen runtime is absent.
- Personal marks/tags/review/edges runtime is absent.
- The app source is React-only.
