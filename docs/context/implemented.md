# Implemented

What QuranAtlas does today. Surface-grouped overview; per-surface invariants
and data shapes live in `surfaces/<name>.md`.

## Read

- Verse reader routes `#/s/:surah` and `#/s/:surah/:ayah`.
- Mushaf page reader route `#/m/:page` for the default Qaloon Mushaf.
- Reader-first continuity restore through validated `lastSurface` and
  `currentPosition`.
- Qaloon text/font and Bridges translation with a default quran.ws Mushaf profile; first or cleared storage makes exactly one Mushaf edition selection from the current compatible availability index.
- Bridges translation with visibility toggle.
- Single/Scroll Mushaf navigation with independent Fit page/Fit width, retained page loading, native vertical movement, and physical horizontal page gestures.
- Reader typography controls, ambient chrome with one reader-only reading-view action, and Daily Wird.

## Navigate

- Mobile nav drawer with Surahs, Juz, Hizb, and Bookmarks.
- Desktop `#/surahs` and `#/bookmarks` surfaces.
- Riwayah-scoped bookmarks with cross-tab sync and landing pulse.
- Reader keyboard shortcuts and shortcuts sheet.

## Search

- `#/search` route for deterministic reference, Arabic text, translation/context, exact word form, exact phrase, same written form, same root, lemma, and Surah context search.
- Lazy core Search pack install/verify/activate on Search entry, with Search packs cached under `/search-packs/**` by the dedicated Search cache owner.
- Route-scoped lazy worker client; Reader cold launch does not fetch Search packs, decode Search graphs, or start the Search worker.
- Query-level Search workspace with `Overview`, `Verses`, `Explore`, and `Sources`; each submitted query receives a fresh adaptive default tab.
- Source-backed morphology details from explicit selected-result Explore actions, including same-root interpretation warnings and no Qalun word-level highlighting.
- Lazy memory-graph Explore sections for attested following wording, shared wording, repeated phrases, occurs-once phrases, ayah endings, and Counts & patterns, with source/boundary policy notes and panel-level missing-pack degradation.
- Minimal ayah-first verse cards, per-result Details, query-level Sources provenance, and `Open in Read` only for validated single Reader mappings.
- Saved searches store user-created query definitions only; result windows are recomputed against the active compatible Search index.

## Configure

- Adaptive grouped Settings sheet with active-mode-only Verse reading or Mushaf Page layout controls, shared Reading continuity and Appearance groups, natural scrolling, and controlled focus restoration.
- Independent Single/Scroll and Fit page/Fit width controls in Mushaf Settings; typography and translation controls in Verse Settings.
- Read-only Asset Management and Settings inventory for the default Qaloon text/font, Qaloon Mushaf, and Bridges profile, using runtime asset-index labels.
- About page with clear-data flow.

## Onboard

- Valid pre-setup profiles migrate to the quran.ws selection without clearing settings, bookmarks, or continuity; incompatible contracts still reset before setup.
- Cold launch shows a short splash, resolves the one-time edition setup if required, and enters or restores the reader.
- Completed selections whose edition is no longer indexed show an About > Clear All Data recovery state rather than remapping old page bookmarks.
- Legacy `#/onboarding` links redirect through the launch path without riwayah, translation, theme, storage, import, or routine controls.

## Infra

- IDB `quran-atlas` v8 with active stores: `settings`, `activationState`,
  `datasetMeta`, `bookmarks`, `savedSearches`, `searchPackActivations`, and `searchPackStaging`.
- Store schema through `src/storage/schema.ts` and Dexie helpers in `src/storage/**`.
- Vite PWA service worker and offline runtime dataset cache, with a NetworkFirst mutable Mushaf availability index and cached offline fallback.
- Same-device bookmark sync and clear-data safety behavior.
- Generated dataset manifests, provenance, and package metadata.

## Removed scope

- Audio/listen runtime is absent.
- Personal marks/tags/review/edges runtime is absent.
- The app source is React-only.
