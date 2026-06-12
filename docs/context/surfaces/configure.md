---
surface: configure
src_paths:
  - 'src/app/routes/settings/**'
  - 'src/components/settings/**'
  - 'src/components/sources/**'
  - 'src/storage/settings-writer.ts'
  - 'src/storage/clear-data.ts'
owns_stores:
  - settings
test_paths:
  unit:
    - 'tests/unit/react-shell/**'
    - 'tests/unit/react-storage/**'
  e2e:
    - 'tests/e2e/configure/*.spec.ts'
style_paths:
  - 'src/design-system/**'
---

# Surface: configure

> Settings, source identity, included asset inventory, About, install prompt, and clear-all-data behavior.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Reader chrome settings | tap/click | Opens settings over the current reader |
| `#/settings` | URL | Opens settings over the previous readable route |
| `#/assets` | URL | Compatibility opener for settings asset inventory |
| Reader mode toggle | tap/click | Switches Verse/Mushaf settings panel and reader mode |
| About route | `#/about` | Shows mission, attribution, install, version, app update check, and clear-data |
| Clear data | confirmation dialog | Clears Cache Storage and IndexedDB, then reloads root |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/app/routes/settings/AboutRoute.tsx` | _(no leading comment)_ |
| `src/app/routes/settings/SettingsRoute.tsx` | _(no leading comment)_ |
| `src/app/routes/settings/pwa-install.ts` | _(no leading comment)_ |
| `src/app/routes/settings/pwa-updates.ts` | _(no leading comment)_ |
| `src/app/routes/settings/useClearDataDialog.ts` | _(no leading comment)_ |
| `src/components/settings/IncludedAssetsSection.tsx` | _(no leading comment)_ |
| `src/components/settings/MushafSettings.tsx` | _(no leading comment)_ |
| `src/components/settings/SettingsShell.tsx` | _(no leading comment)_ |
| `src/components/settings/SourcePicker.tsx` | _(no leading comment)_ |
| `src/components/settings/ThemeNightControls.tsx` | _(no leading comment)_ |
| `src/components/settings/VerseSettings.tsx` | _(no leading comment)_ |
| `src/components/settings/settings.stories.tsx` | _(no leading comment)_ |
| `src/components/settings/useSettingsForm.ts` | _(no leading comment)_ |
| `src/components/sources/SourcePickerRow.tsx` | _(no leading comment)_ |
| `src/storage/clear-data.ts` | _(no leading comment)_ |
| `src/storage/settings-writer.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

`SettingsRoute` and settings overlay events open `SettingsShell` without losing the current reader route or scroll state. Verse reader scroll-derived position writes pause while the settings overlay is open, and the visible verse is re-anchored across typography and translation layout changes. The shell contains a reader-mode toggle, mode-specific controls, Daily Wird visibility controls, included assets, and footer appearance controls.

Verse settings own font size, reading flow, and translation visibility. Daily Wird visibility is a separate settings section; disabling it hides reader/navigation Wird status and disables the active plan's reminder without deleting the plan. Mushaf settings own the visible page/width/continuous mode control while accepting stored `auto` values for compatibility. Theme and night mode apply globally and are reached through the same Reader chrome settings entry from Reader and Search surfaces.

`IncludedAssetsSection` is read-only in the current MVP. It resolves names from runtime indexes for the included Qaloon text/font, Qaloon Mushaf, and Bridges translation profile. It can collapse on compact settings sheets so the core controls remain visible without scrolling. It does not expose install, delete, switch, verify, retry, or optional source-pack actions.

`AboutRoute` owns mission/attribution, install prompt affordance, app version, app update check, and clear-data entry. It renders Reader chrome and the shared navigation drawer so users can leave About through the same Read/Search navigation affordances as the rest of the app. Its app update action asks the current service-worker registration to fetch the latest app files, activates a pending worker when one exists, and reloads into the new app shell. `useClearDataDialog` requires exact `DELETE`; `src/storage/clear-data.ts` clears app caches and the shared database, then reloads.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| _(no files match `style_paths`)_ | |
<!-- AUTO-GENERATED:style-inventory END -->

## Data

<!-- AUTO-GENERATED:data-owned START -->
- `settings`
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

### `settings`

Settings is a key-value store. Writers are key-scoped and should go through `src/storage/settings-writer.ts` or a surface-owned helper that preserves the same invariants.

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

- Settings must preserve the mounted reader state when opened from a reader route.
- Included assets are read-only in the current MVP.
- Included assets may be hidden or shown, but the toggle must not introduce source-management actions.
- The active reader profile remains Qaloon text/font, Qaloon Mushaf, and Bridges translation.
- Direct settings writes must preserve key ownership and schema compatibility.
- Clear data is destructive and requires explicit confirmation.

## Regression Guards

<!-- AUTO-GENERATED:tests START -->
**Unit (8):**

- `tests/unit/react-shell/App.test.tsx`
- `tests/unit/react-shell/about-route.test.tsx`
- `tests/unit/react-shell/routes.test.ts`
- `tests/unit/react-shell/settings-route.test.tsx`
- `tests/unit/react-storage/clear-data.test.ts`
- `tests/unit/react-storage/db-schema.test.ts`
- `tests/unit/react-storage/pack-lifecycle.test.ts`
- `tests/unit/react-storage/search-schema.test.ts`

**E2E (1):**

- `tests/e2e/configure/react-golden.spec.ts`
<!-- AUTO-GENERATED:tests END -->
