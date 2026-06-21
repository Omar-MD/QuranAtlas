---
surface: read
src_paths:
  - 'src/app/routes/read/**'
  - 'src/components/reader/**'
  - 'src/data/reader-corpus.ts'
  - 'src/data/verse-aliases.ts'
  - 'src/packs/**'
test_paths:
  unit:
    - 'tests/unit/react-read/**'
  e2e:
    - 'tests/e2e/read/*.spec.ts'
    - 'tests/e2e/react-visual/*.spec.ts'
style_paths:
  - 'src/design-system/**'
---

# Surface: read

> Reader First core: Verse reader, Mushaf reader, reader chrome, typography, bookmarks integration, page movement, translation, knowledge lane, and Daily Wird progress.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| `#/s/:surah` | URL | Verse reader opens the Surah |
| `#/s/:surah/:ayah` | URL | Verse reader opens and focuses the ayah |
| `#/m/:page` | URL | Mushaf reader opens the page |
| Reader mode control | tap/click | Bridges the current Verse reference and Mushaf page |
| Settings control | tap/click | Opens the settings shell without losing reader state |
| Verse number | tap/click | Toggles the riwayah-scoped bookmark |
| Verse body | tap/click | Toggles the knowledge lane when metadata exists |
| Mushaf page edge/key | tap/swipe/keyboard | Turns pages using physical Mushaf direction |
| Daily Wird status | tap/click | Opens the navigation drawer Daily Wird detail |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/app/routes/read/MushafRoute.tsx` | _(no leading comment)_ |
| `src/app/routes/read/ReaderRoute.tsx` | _(no leading comment)_ |
| `src/components/reader/KnowledgeChips.tsx` | _(no leading comment)_ |
| `src/components/reader/MushafModeControl.tsx` | _(no leading comment)_ |
| `src/components/reader/MushafPageViewer.tsx` | _(no leading comment)_ |
| `src/components/reader/ReaderAssetGate.tsx` | _(no leading comment)_ |
| `src/components/reader/ReaderChrome.tsx` | _(no leading comment)_ |
| `src/components/reader/ReaderPageShell.tsx` | _(no leading comment)_ |
| `src/components/reader/ReaderVerseSurface.tsx` | _(no leading comment)_ |
| `src/components/reader/SurahContinuityButton.tsx` | _(no leading comment)_ |
| `src/components/reader/TranslationFootnote.tsx` | _(no leading comment)_ |
| `src/components/reader/VerseBlock.tsx` | _(no leading comment)_ |
| `src/components/reader/VerseNumber.tsx` | _(no leading comment)_ |
| `src/components/reader/VirtualVerseList.tsx` | _(no leading comment)_ |
| `src/components/reader/metadata/MetadataLane.tsx` | _(no leading comment)_ |
| `src/components/reader/metadata/MetadataUnavailable.tsx` | _(no leading comment)_ |
| `src/components/reader/metadata/PassageContext.tsx` | _(no leading comment)_ |
| `src/components/reader/metadata/ThemeChips.tsx` | _(no leading comment)_ |
| `src/components/reader/metadata/metadata.stories.tsx` | _(no leading comment)_ |
| `src/components/reader/reader-mode-routing.ts` | _(no leading comment)_ |
| `src/components/reader/reader.stories.tsx` | _(no leading comment)_ |
| `src/components/reader/useReaderPositionSync.ts` | _(no leading comment)_ |
| `src/components/reader/useVerseInteractionReducer.ts` | _(no leading comment)_ |
| `src/components/reader/wird/DailyWirdCard.tsx` | _(no leading comment)_ |
| `src/components/reader/wird/ReaderWirdStatusIndicator.tsx` | _(no leading comment)_ |
| `src/components/reader/wird/WirdProgressMeter.tsx` | _(no leading comment)_ |
| `src/data/reader-corpus.ts` | _(no leading comment)_ |
| `src/data/verse-aliases.ts` | _(no leading comment)_ |
| `src/packs/mushaf-cache.ts` | _(no leading comment)_ |
| `src/packs/mushaf-fixtures.ts` | _(no leading comment)_ |
| `src/packs/mushaf-index.ts` | _(no leading comment)_ |
| `src/packs/mushaf-install-plan.ts` | _(no leading comment)_ |
| `src/packs/mushaf-page-asset.ts` | _(no leading comment)_ |
| `src/packs/mushaf-paths.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Verse Mode

`ReaderRoute` loads the current Surah corpus through `src/data/reader-corpus.ts`. The corpus joins Qaloon text, Bridges translation, verse aliases, footnotes, and optional knowledge metadata. Translation visibility and typography preferences apply live through settings writes and root-level presentation state; the corpus is not refetched for simple presentation changes.

`ReaderVerseSurface` renders a document-scroll Surah surface with a clear Surah header, Basmala where applicable, verse rows, translation rows, footnote disclosures, optional knowledge chips, and continuity controls. `VerseBlock` owns row state, `VerseNumber` owns bookmark affordance semantics, and `useVerseInteractionReducer` owns local expanded-state behavior. Verse number controls always expose the bookmark affordance; when the active riwayah has no verse bookmarks, the first rendered verse shows one inline `tap to bookmark` hint that disappears after any verse bookmark is created.

### Mushaf Mode

`MushafRoute` resolves the active `riwayah` and `mushafEditionId`, validates the edition-aware manifest and page asset path, sanitizes the page SVG, and passes sanitized markup to `MushafPageViewer`. The page is rendered as one labeled image without decorative framing. Single mode fits the complete page into the chrome-aware viewport when Fit width is off; with Fit width on, the current page fills available width without exposing adjacent pages or horizontal document overflow. Compact landscape defaults Mushaf pages to Fit width while still allowing the user to switch it off from settings for the current landscape session. Page turns keep the route canonicalized to `#/m/:page`, warm adjacent pages where possible, and preserve the hidden/visible chrome state during internal movement. Desktop left/right arrow keys, viewport-height left/right hit zones, and horizontal swipe/drag move between adjacent pages only in Single mode. Scroll mode stacks previous/current/next pages vertically in the Mushaf stage, lets wheel/touch scroll move the stage first, and updates the route when an adjacent page becomes dominant. Settings and navigation overlays gate Mushaf keyboard and wheel handlers. The page counter shows only the current page at bottom center, the Arabic Surah label sits separately near the top edge, and both reserve space around the page even when reader chrome is hidden. The bookmark target sits away from the counter and page content and remains part of hideable reader chrome; Escape or focus reveals it again.

Mushaf page bookmarks use the same bookmarks store as verse bookmarks with `kind: 'page'` and a synthetic `verseKey` of `m:<page>`.

### Reader Chrome

`ReaderChrome` is compact and mode-aware: navigation drawer, reader mode, settings, and Daily Wird status when enabled. It avoids center titles that compete with the reading surface. The compact Daily Wird status reports today's assigned progress only; full-plan progress and remaining completion gap stay in the navigation drawer. Mobile and tablet chrome protects safe areas and hides/reveals based on reader movement where appropriate.

### Daily Wird

Daily Wird progress lives under `src/continuity/wird/**` and persists in the `settings.wirdPlan` key. Reader-derived progress advances only from explicit Wird continuation routes that carry the protected `?wird=1` intent and only within the current daily assignment; ordinary navigation, search jumps, and unrelated page movement still update reader continuity without changing the Wird plan. The reader shows only the compact status indicator for the current daily assignment; plan creation, full-plan progress, and completion gap detail live in the navigation drawer.

### Translation And Knowledge

Translations are global-on/off through settings. Footnote markers disclose inline panels per verse. Knowledge metadata is optional: missing, stale, or failed knowledge shards leave the base reader intact.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| _(no files match `style_paths`)_ | |
<!-- AUTO-GENERATED:style-inventory END -->

## Data

<!-- AUTO-GENERATED:data-owned START -->
_(none)_
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| _(none)_ | | |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| _(none)_ | | |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- Reader content is unframed; Quran text and Mushaf pages are never decorative previews.
- Runtime dataset requests stay under same-origin `/dataset/**`.
- The current MVP profile is Qaloon text/font, Qaloon Mushaf, and Bridges translation.
- Page SVG bodies remain runtime assets and must not be embedded into JS bundles.
- Bookmarks are reader continuity, not study annotations.
- Daily Wird progress is monotonic; backward movement must not reduce completion.

## Regression Guards

<!-- AUTO-GENERATED:tests START -->
**Unit (1):**

- `tests/unit/react-read/reader-wave3.test.tsx`

**E2E (3):**

- `tests/e2e/react-visual/shell.spec.ts`
- `tests/e2e/read/mushaf-responsive.spec.ts`
- `tests/e2e/read/react-golden.spec.ts`
<!-- AUTO-GENERATED:tests END -->
