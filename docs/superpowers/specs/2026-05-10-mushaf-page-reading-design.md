# Mushaf Page Reading Design

## Summary

Add a dedicated Mushaf page-reading mode to QuranAtlas. Mushaf mode renders self-hosted quran.ws vector page assets for the active riwayah and keeps the existing Verse reader for translation, tafsir, study, and per-verse interaction.

The first version is page-navigation only. It does not map page taps to verses and does not render translation, tafsir, or overlays inside the Mushaf page.

## Decisions

- Mushaf mode is a sibling reader mode, not a replacement for the current Verse reader.
- Desktop navigation exposes two reader-mode entries:
  - book icon: Mushaf mode
  - loop icon: Verse mode
- Mobile keeps the current margin header unchanged. The mode switch lives inside the hamburger drawer.
- Mushaf route shape is `#/m/:page`.
- The active page asset follows `settings.riwayah`; riwayah is not encoded in the URL.
- Switching Verse to Mushaf opens the Mushaf page containing the currently centered verse.
- Switching Mushaf to Verse opens the first verse on the current page.
- quran.ws is the primary asset source.
- QuranAtlas imports and self-hosts quran.ws vector page assets for the app's current riwayat only: Hafs, Warsh, and Qaloon.

## Source Assets

Use quran.ws as the source of truth for Mushaf page assets.

- `https://pdf.quran.ws/` provides vector page PDFs for every qira'a, including Hafs, Warsh, and Qaloon. The site describes the files as vector PDFs rendered from King Fahd Complex masters, not scanned images.
- quran.ws font/layout resources remain the broader reference for Quran fonts, scripts, layouts, decorative assets, and page construction data.

The app should not depend on quran.ws at runtime. Imported page assets live under the same origin as the PWA, for CSP, offline support, and reliability.

Expected dataset shape:

```text
public/dataset/mushaf-pages/
  hafs/
    manifest.json
    pages/001.svg
    pages/002.svg
  warsh/
    manifest.json
    pages/001.svg
  qaloon/
    manifest.json
    pages/001.svg
```

Runtime page assets are optimized same-origin SVG files generated from quran.ws vector PDFs. The import pipeline may archive or record the source PDF URLs, but the app renders SVG at runtime to avoid cross-browser PDF embedding differences while preserving vector quality.

Each manifest is authoritative for:

- riwayah key
- page count
- page asset paths
- source attribution
- byte size per page for offline inventory
- content hash per page when the dataset inventory format supports hashes
- first verse reference per page for Mushaf to Verse fallback

## Architecture

The read surface gains a reader-mode split:

- Verse mode keeps the current route family: `#/s/:surah/:ayah?`.
- Mushaf mode adds `#/m/:page`.

Both modes are owned by the read surface because both are primary reading experiences and share active riwayah, reading position, and navigation chrome.

Mushaf mode mounts a dedicated component lane instead of adding page rendering to `Reader.svelte`.

Core components and helpers:

- `MushafReader.svelte`: owns the route page number, active riwayah, page loading state, controls, and viewport layout.
- `MushafPage.svelte`: renders a single vector page asset and its loading/error states.
- `MushafControls.svelte`: owns previous, next, page-number display, and a lightweight page scrubber.
- Mushaf dataset loader: reads the active riwayah manifest and resolves page asset paths.
- Reader-mode navigation helper: maps the current centered Verse-mode ayah to its Mushaf page and routes to `#/m/:page`.
- Page-to-verse helper: maps a Mushaf page to its first verse reference for Mushaf to Verse switching.

## Navigation And UX

### Desktop

The existing 56 px left rail remains the primary desktop navigation host.

The rail exposes Verse and Mushaf as explicit reader modes:

- loop icon for Verse mode
- book icon for Mushaf mode

The active mode is highlighted using the existing rail active-state treatment. The rail should otherwise preserve its current density, parchment tone, tooltip style, bottom crumb/more behavior, and fixed width.

### Mobile

The current mobile margin header stays unchanged:

- hamburger on the left
- centered Arabic surah or page label
- gear on the right

The mode switch lives inside the hamburger drawer. It should feel like a first-class reader mode switch, not a cramped fourth source tab. The existing drawer structure remains:

- product row
- top-level Read / Study tabs
- Daily Wird card
- reader mode switch
- source controls such as Surah / Juz / Bookmarks for Verse mode

When Mushaf mode is active, the drawer should show Mushaf as the current reader mode and provide page-oriented continuation controls without duplicating the full page canvas inside the drawer.

### Mushaf Viewport

Mushaf mode renders a single page at a time.

The page is centered on the existing parchment app surface. It should use the maximum practical viewport height without colliding with the mobile header, safe areas, or desktop rail.

Controls are restrained:

- previous page
- next page
- current page number
- lightweight page scrubber

Controls update the `#/m/:page` route. They do not mutate Verse-mode state.

## Data Flow

1. Route `#/m/:page` mounts `MushafReader`.
2. `MushafReader` reads `settings.riwayah`.
3. The Mushaf loader fetches `/dataset/mushaf-pages/{riwayah}/manifest.json`.
4. The route page is validated against the manifest's page count.
5. `MushafPage` renders the resolved same-origin vector asset.
6. Prev, next, and scrubber controls update the page route.
7. If the active riwayah changes while on `#/m/:page`, the same page number re-renders using the new riwayah manifest and asset path.

Verse to Mushaf flow:

1. Read the current centered verse key from the existing reader state.
2. Resolve that verse in the active riwayah dataset.
3. Read its `page` metadata.
4. Route to `#/m/{page}`.

Mushaf to Verse flow:

1. Read the current page number.
2. Resolve the page's first verse reference from the active riwayah manifest.
3. Route to `#/s/{surah}/{ayah}`.

## Offline And Caching

Mushaf page assets are same-origin dataset assets.

The existing service-worker page category should become active for this feature instead of roadmap-only:

- route pattern: `/dataset/mushaf-pages/{riwayah}/...`
- cache category: pages
- offline selector row: pages per riwayah

Offline behavior is per-riwayah. A user may cache Hafs pages without caching Warsh or Qaloon pages.

The manifest includes byte totals for offline inventory. If hashes are already part of the dataset inventory pattern at implementation time, page assets follow that pattern too.

## Errors And Loading

Mushaf mode fails independently from Verse mode.

Loading states:

- show a neutral page-shaped skeleton inside the Mushaf viewport
- do not reuse the verse-stream skeleton

Error states:

- missing page asset: show retry and an "Open Verse mode" fallback
- missing manifest: show a compact Mushaf unavailable state
- invalid page route: replace the hash with the nearest valid page based on the active manifest
- offline missing asset: show "Page not available offline" with retry; fetch normally when network is available

Page boundaries:

- page 1 disables previous
- final page disables next
- manifest page count is authoritative

## Non-Goals

- No tap-to-verse hit testing in v1.
- No verse overlays in Mushaf mode.
- No translation or tafsir inside Mushaf mode.
- No all-qira'at import; only Hafs, Warsh, and Qaloon.
- No runtime dependency on quran.ws.
- No runtime font/layout page reconstruction in v1. Any conversion happens in the import pipeline before assets ship.

## Testing

Unit coverage:

- route page parsing and clamping
- manifest loading and active-riwayah asset resolution
- Verse to Mushaf page mapping from centered verse metadata
- Mushaf to Verse first-reference mapping
- boundary behavior for first and final pages
- missing or invalid manifest entries

Component coverage:

- `MushafReader` loading state
- successful vector page render
- missing asset state
- offline-missing state
- invalid page route handling
- controls update the page route without touching Verse-mode state

E2E coverage:

- desktop rail switches between loop Verse mode and book Mushaf mode
- mobile drawer mode switch opens Mushaf
- Verse to Mushaf lands on the centered verse's page
- Mushaf to Verse opens the first verse on the current page
- prev, next, and scrubber navigation work
- changing riwayah re-renders the same page number with the new asset path
- page taps do not trigger verse behavior

Visual checks:

- mobile page fits below the existing margin header without overlap
- desktop page is centered with the existing rail unchanged
- loading and error states match the QuranAtlas parchment styling
- UI remains restrained and avoids card-heavy or marketing-style layouts

## Documentation Updates

Implementation must update:

- `docs/context/surfaces/read.md` for reader reach, behavior, data, invariants, and regression guards.
- `docs/context/architecture.md` for the new `#/m/:page` route and mode split.
- `docs/context/data-model.md` if page manifests affect store ownership or persisted reader position semantics.
- `docs/context/csp-allowlist.md` if any asset import step or runtime origin policy changes.
- `docs/context/source-data-flow.md` for quran.ws page asset import and normalization.
- offline documentation or inventories affected by enabling the pages category.

Generated context inventories should be regenerated through the repo's existing docs command after implementation changes.
