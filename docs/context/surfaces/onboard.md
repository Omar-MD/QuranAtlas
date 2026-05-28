---
surface: onboard
src_paths:
  - 'src/onboard/**'
test_paths:
  unit:
    - 'tests/unit/onboard/**'
  e2e:
    - 'tests/e2e/onboard/*.spec.js'
style_paths:
  - 'src/styles/surfaces/onboard/**'
---

# Surface: onboard

> Retired first-run wizard route plus session-restore decision. The current MVP launch shows a short splash, silently applies the default reader asset reset when needed, and enters or restores the reader. Legacy `#/onboarding` hashes redirect through the same launch path without source choices.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| App boot, empty or legacy onboarding hash | passive | launch splash, then reader restore or `#/s/1` |
| App boot, valid reader hash present | passive | reader route mounts directly after launch reset |

Routes: `#/onboarding` is compatibility-only and no longer presents a setup wizard.

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/onboard/Onboarding.svelte` | Onboarding — 6-screen first-run flow. |
| `src/onboard/OnboardingScreen.svelte` | OnboardingScreen — single-screen shell. |
| `src/onboard/screens.ts` | Onboarding screen data types. |
| `src/onboard/state.ts` | Module-level helpers callable without mounting Onboarding.svelte. |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

### Launch path (A1)

Launch with clean IDB or cleared data:

1. `handleLaunchRestore` applies the MVP asset-contract reset when the stored marker is missing or stale.
2. The launch splash announces the reader is opening.
3. Valid launchable `settings.lastSurface` or `settings.currentPosition` restores; otherwise the router navigates to `#/s/1`.
4. No source picker, theme wizard, shortcuts wizard, or `settings.onboardingComplete` gate appears.

Unsupported older local choices such as Hafs, non-Bridges translation, tafsir, and stale bookmarks are cleared once by the reset helper before the reader mounts.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| `src/styles/surfaces/onboard/shell.css` | Onboarding shell styles moved from flat surfaces. |
<!-- AUTO-GENERATED:style-inventory END -->

### Reload stays on last surface (A2)

Any route other than operational routes (`#/onboarding`, `#/settings`, `#/assets`):

1. Browser refresh → hash cleared → `ROUTER_LAUNCH_RESTORE` fires.
2. `settings.lastSurface` read → router navigates there with replace.

Reads `settings.lastSurface` (written by router after every successful mount).

### Power-up (A4)

The one-time onboarding shortcuts screen is retired. The cheatsheet remains available from reader/navigation shortcuts.

## Data

<!-- AUTO-GENERATED:data-owned START -->
_(none)_
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

`onboard` no longer writes setup/source settings. The retired `settings.onboardingComplete` key may exist in old local data but is ignored by launch restore and cleared by the MVP asset-contract reset.

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

- **No current source wizard.** Legacy `#/onboarding` never exposes riwayah, translation, tafsir, or Mushaf edition choices.
- **Default reader profile on first run: Qaloon + Bridges.** The reset helper owns this contract before the reader mounts.
- **`settings.onboardingComplete` is ignored.** It is retained only as legacy local data cleanup context.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (0):**

_(none)_

**E2E (2):**

- `tests/e2e/onboard/first-run.spec.js`
- `tests/e2e/onboard/session-restore.spec.js`
<!-- AUTO-GENERATED:tests END -->
