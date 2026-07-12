---
surface: onboard
src_paths:
  - 'src/app/routes/onboarding/**'
  - 'src/components/launch/**'
  - 'src/launch/**'
  - 'src/continuity/launch-restore.ts'
test_paths:
  unit:
    - 'tests/unit/react-shell/**'
    - 'tests/unit/react-navigate/onboarding-flow.test.ts'
  e2e:
    - 'tests/e2e/onboard/*.spec.ts'
style_paths:
  - 'src/design-system/**'
---

# Surface: onboard

> Launch restore, compatibility migration, and one-time Mushaf edition setup.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Empty hash | app boot | Restore last readable surface or open `#/s/1` |
| Fresh or cleared profile | app boot | Choose an available Mushaf edition, then resume the requested reader route |
| Existing valid profile without setup marker | app boot | Atomically retain the quran.ws edition and mark setup complete without clearing continuity |
| `#/onboarding` | compatibility URL | Run launch restore and enter the selected reader route |
| Stale asset contract | app boot | Reset unsupported local profile state before reader mounts |
| Completed unavailable edition | app boot | Show the unavailable state and send the reader to About > Clear All Data |
| Valid reader hash | app boot | Mount the requested reader route |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/app/routes/onboarding/OnboardingRoute.tsx` | _(no leading comment)_ |
| `src/app/routes/onboarding/onboarding-flow.ts` | _(no leading comment)_ |
| `src/components/launch/LaunchSplash.tsx` | _(no leading comment)_ |
| `src/continuity/launch-restore.ts` | _(no leading comment)_ |
| `src/launch/asset-contract-reset.ts` | _(no leading comment)_ |
| `src/launch/mushaf-edition-setup.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

`src/continuity/launch-restore.ts` preserves the requested reader hash while it resolves the initial route from the current hash, `lastSurface`, and `currentPosition`. `src/launch/asset-contract-reset.ts` records whether the current asset contract was already valid before resetting incompatible state. `src/launch/mushaf-edition-setup.ts` then keeps existing valid profiles on quran.ws, classifies fresh/cleared storage into setup, and rejects a completed edition that is absent from the current availability index. The edition selection and setup marker share one IndexedDB transaction.

`OnboardingRoute` has exactly one first/cleared-install choice: Mushaf edition. A sole compatible edition is selected automatically; multiple editions use the owned `Select` and one Continue action. It never presents riwayah, translation, theme, storage, import, routine switching, or a feature tour. Changing a completed selection still requires About > Clear All Data, so old page bookmarks are never silently reassigned. `LaunchSplash` is a short transition state while restore/reset work resolves.

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

- Setup choices are limited to fresh or cleared profile state and the current compatible Mushaf availability index.
- A valid pre-setup profile migrates without deleting settings, bookmarks, or continuity.
- A missing completed edition never reopens setup over old bookmarks.
- The default profile is Qaloon text/font, Qaloon Mushaf, and Bridges translation.
- Launch restore must not destroy valid reader hashes.

## Regression Guards

<!-- AUTO-GENERATED:tests START -->
**Unit (5):**

- `tests/unit/react-navigate/onboarding-flow.test.ts`
- `tests/unit/react-shell/App.test.tsx`
- `tests/unit/react-shell/about-route.test.tsx`
- `tests/unit/react-shell/routes.test.ts`
- `tests/unit/react-shell/settings-route.test.tsx`

**E2E (1):**

- `tests/e2e/onboard/react-golden.spec.ts`
<!-- AUTO-GENERATED:tests END -->
