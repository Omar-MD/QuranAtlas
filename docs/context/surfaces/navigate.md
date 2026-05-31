---
surface: navigate
src_paths:
  - 'src/app/routes/navigation/**'
  - 'src/components/navigation/**'
  - 'src/continuity/bookmarks/**'
  - 'src/continuity/recent-surahs.ts'
owns_stores:
  - bookmarks
test_paths:
  unit:
    - 'tests/unit/react-navigate/**'
    - 'tests/unit/react-continuity/**'
  e2e:
    - 'tests/e2e/navigate/*.spec.ts'
style_paths:
  - 'src/design-system/**'
---

# Surface: navigate

> Reader navigation: nav drawer, Surah/Juz/Hizb browsing, bookmarks, recent Surahs, shortcuts, and Daily Wird entry points.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Reader chrome menu | tap/click | Opens nav drawer |
| Drawer Search tab | tap/click | Routes to the Search surface |
| `#/surahs` | URL | Opens standalone Surah directory |
| `#/bookmarks` | URL | Opens standalone bookmarks view |
| Surah row | tap/click | Routes to the Surah or saved recent ayah |
| Juz/Hizb row | tap/click | Routes to the start reference in Verse mode or resolved Mushaf page |
| Bookmark row | tap/click | Routes to verse or Mushaf page bookmark target |
| Bookmark delete | button/swipe | Deletes bookmark through the bookmarks owner |
| `?` | keyboard | Opens shortcuts sheet |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/app/routes/navigation/BookmarksRoute.tsx` | _(no leading comment)_ |
| `src/app/routes/navigation/SurahsRoute.tsx` | _(no leading comment)_ |
| `src/components/navigation/BookmarksList.tsx` | _(no leading comment)_ |
| `src/components/navigation/HizbList.tsx` | _(no leading comment)_ |
| `src/components/navigation/JuzList.tsx` | _(no leading comment)_ |
| `src/components/navigation/NavDrawer.tsx` | _(no leading comment)_ |
| `src/components/navigation/ShortcutSheet.tsx` | _(no leading comment)_ |
| `src/components/navigation/SurahList.tsx` | _(no leading comment)_ |
| `src/components/navigation/bookmarks/BookmarkIndicator.tsx` | _(no leading comment)_ |
| `src/components/navigation/bookmarks/BookmarkLandingPulse.tsx` | _(no leading comment)_ |
| `src/components/navigation/bookmarks/BookmarkToggle.tsx` | _(no leading comment)_ |
| `src/components/navigation/nav-drawer-controller.ts` | _(no leading comment)_ |
| `src/components/navigation/navigation.stories.tsx` | _(no leading comment)_ |
| `src/components/navigation/wird/WirdDetail.tsx` | _(no leading comment)_ |
| `src/components/navigation/wird/WirdPlanEditor.tsx` | _(no leading comment)_ |
| `src/components/navigation/wird/WirdReminderControl.tsx` | _(no leading comment)_ |
| `src/components/navigation/wird/WirdResetConfirm.tsx` | _(no leading comment)_ |
| `src/components/navigation/wird/wird.stories.tsx` | _(no leading comment)_ |
| `src/continuity/bookmarks/page-bookmark.ts` | _(no leading comment)_ |
| `src/continuity/bookmarks/pulse.ts` | _(no leading comment)_ |
| `src/continuity/bookmarks/store.ts` | _(no leading comment)_ |
| `src/continuity/bookmarks/sync.ts` | _(no leading comment)_ |
| `src/continuity/bookmarks/use-bookmarks.ts` | _(no leading comment)_ |
| `src/continuity/recent-surahs.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

`NavDrawer` is the primary navigation surface on reader and Search routes. It shows the product header, top-level Read/Search mode tabs, Read source tabs with dense source rows, optional Daily Wird summary/detail, Search saved-search rows when the Search mode is active, and close/dismiss controls. Phone widths use a full-screen drawer; Search tablet and desktop layouts open the same drawer on the left and keep Search content visible to the right.

`SurahList`, `JuzList`, and `HizbList` load runtime indexes from `/dataset/**`, mark current/recent state, and route through the current reader mode. Surah search and All/Recent filtering belong only to the Surah tab.

`BookmarksList` is presentational. Bookmark persistence and sync are owned by `src/continuity/bookmarks/**`; route containers pass jump/delete callbacks. Verse bookmarks and Mushaf page bookmarks share the same riwayah-scoped store.

`ShortcutSheet` is the in-app keyboard/gesture reference. It is reachable from `?`, closes with Esc/dismiss controls, and does not introduce hidden product scope.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| _(no files match `style_paths`)_ | |
<!-- AUTO-GENERATED:style-inventory END -->

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `bookmarks`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `bookmarks`

The current MVP writes Qaloon-scoped verse and Mushaf page bookmarks. The compound identity preserves future separation by riwayah.

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

- Navigation row actions must route directly; disabled decorative rows are not acceptable.
- The top-level Search tab must route to `#/search` without importing or preparing Search runtime code on Reader cold launch.
- The top-level Read tab in Search mode must route back to the Reader through the same drawer tabs.
- Surah search/filter controls appear only in the Surah source.
- Saved searches belong inside the Search mode of `NavDrawer`, not in a separate Search rail, sheet, or route card.
- Bookmarks are owned by `src/continuity/bookmarks/**`; other files must not write the store directly.
- Bookmarks remain reader-continuity data.
- Daily Wird detail belongs in the drawer; the reader itself shows only compact status.

## Regression Guards

<!-- AUTO-GENERATED:tests START -->
**Unit (3):**

- `tests/unit/react-continuity/continuity-wave3.test.ts`
- `tests/unit/react-navigate/navigation-wave3.test.tsx`
- `tests/unit/react-navigate/onboarding-flow.test.ts`

**E2E (1):**

- `tests/e2e/navigate/react-golden.spec.ts`
<!-- AUTO-GENERATED:tests END -->
