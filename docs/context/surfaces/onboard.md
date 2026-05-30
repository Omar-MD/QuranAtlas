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

> Launch restore and compatibility onboarding path. The current MVP does not present a setup wizard.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| Empty hash | app boot | Restore last readable surface or open `#/s/1` |
| `#/onboarding` | compatibility URL | Run launch restore and enter the reader |
| Stale asset contract | app boot | Reset unsupported local profile state before reader mounts |
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
<!-- AUTO-GENERATED:inventory END -->

## Behavior

`src/continuity/launch-restore.ts` resolves the initial route from the current hash, `lastSurface`, and `currentPosition`. `src/launch/asset-contract-reset.ts` ensures unsupported local profile state cannot alter the current default MVP profile.

`OnboardingRoute` is compatibility-only. It does not show source choices, theme setup, shortcuts, storage choices, or a feature tour. `LaunchSplash` is a short transition state while restore/reset work resolves.

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

- No current source wizard exists.
- Legacy onboarding hashes never expose setup choices.
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
