---
surface: onboard
src_paths:
  - 'src/onboard/**'
test_paths:
  unit:
    - 'tests/unit/onboard/**'
  e2e:
    - 'tests/e2e/onboard/*.spec.js'
---

# Surface: onboard

> First-run wizard + session-restore decision. 6 screens (Welcome → Theme → Riwayah → Translation → Shortcuts → Tags-intro). Sets `settings.onboardingComplete` then routes to `#/s/1`. On warm boot, when `onboardingComplete` is set, the router restores `settings.lastSurface` instead.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| App boot, `settings.onboardingComplete` not set | passive | router redirects to `#/onboarding` |
| App boot, `onboardingComplete` set, hash present | passive | router restores `settings.lastSurface` (replace) |

Routes: `#/onboarding`. No other entry — once `onboardingComplete = true`, the surface is unreachable until Clear-data (configure surface).

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

### First-run flow (A1)

Launch with clean IDB (or cleared data). The onboarding promise is reading setup: welcome, theme, qira'ah/riwayah, translation, tafsir or reader source awareness when present, core navigation/search shortcuts, reading preferences, offline expectations, and Daily Wird entry. It must not introduce marks/tags/review as v1 product value.

1. Boot → `handleLaunchRestore` checks `settings.onboardingComplete`, finds nothing → navigates `#/onboarding`.
2. Screen 1 (Welcome): wordmark, blessing, **Begin** CTA, progress dot 1 lit. No dock, no pill, no MarginHeader chrome.
3. Tap **Begin** → Screen 2 (Theme): 4 swatches (Light / Sepia / Dark / Auto), Skip button appears with a comfortable mobile hit area.
4. Pick theme (e.g. Dark) → applied live → tap **Continue** → Screen 3 (Choose Riwayah): three radio cards — Ḥafṣ ʿan ʿĀṣim · Warsh ʿan Nāfiʿ · Qālūn ʿan Nāfiʿ. Default-selected: **Qālūn**. Tap **Continue** to persist + advance; tap **Skip** to leave default unchanged + advance. Persists `settings['riwayah']` (sole writer `settings/riwayah.ts`).
5. Tap **Continue** → Screen 4 (Translation): options derived from dataset's `provenance.json` at render time — picker never surfaces options not present in corpus. With a single shipped pack (Bridges), screen shows it as non-interactive row + Continue advances immediately. Picker becomes interactive once second translation lands.
6. Tap **Continue** → Screen 5 (Shortcuts): teaches core shortcuts in curated rows: `/` search, `?` cheatsheet, `j`/`k`/`]`/`[` verse/surah nav, `m` tafsir, `t` translation toggle, `+`/`-`/`0` font, `g h` continue reading, double-tap gesture. Lede reminds users they can press `?` anywhere for full list. Desktop (≥1180 px): 2-col grid; mobile: stacks single-col. Tap **Continue** → Screen 6.
7. Screen 6 (Start reading): reinforces Verse/Mushaf reading, search/navigation, bookmarks, Daily Wird, and offline-ready reader assets. Tap **Open Al-Fatihah** to set `settings.onboardingComplete = true`, route `#/s/1`, and restore ambient chrome.

**Alt paths:**
- Any screen from 2 onward → tap **Skip** → same completion write, land on `#/s/1`.
- Screen 5 → tap **Browse all surahs** → completion write, land on `#/surahs`.

**Landscape phone / short viewport** (height <500 px): page drops `72vh` min-height, top-aligns content with reduced hero padding so no content clips off-screen.

### Reload stays on last surface (A2)

Any route other than `#/onboarding`:

1. Browser refresh → hash cleared → `ROUTER_LAUNCH_RESTORE` fires.
2. Onboarding check passes → `settings.lastSurface` read → router navigates there with replace.

Reads `settings.lastSurface` (written by router after every successful mount).

### Power-up (A4)

Onboarding shortcuts screen (Screen 5 of A1). Same content as cheatsheet but shown one-time during onboarding.

## Data

<!-- AUTO-GENERATED:data-owned START -->
_(none)_
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

`onboard` writes `settings.onboardingComplete` (sole writer: `src/onboard/state.ts`) on completion or skip. Reads + sets several other `settings` keys via the configure-surface writers (theme, riwayah, translationId — these remain `configure`'s sole-writer responsibility; onboarding calls those writers, doesn't bypass them).

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

- **Sole writer of `settings.onboardingComplete`: `src/onboard/state.ts`.**
- **Default Riwayah on first run: Qālūn** (not Hafs). Picker pre-selects Qālūn radio.
- **Translation picker derives options from `provenance.json` at render time** — never hardcoded list.
- **Once `onboardingComplete = true`, the surface is unreachable** until Clear-data fully resets IDB.

## Regression guards

<!-- AUTO-GENERATED:tests START -->
**Unit (0):**

_(none)_

**E2E (2):**

- `tests/e2e/onboard/first-run.spec.js`
- `tests/e2e/onboard/session-restore.spec.js`
<!-- AUTO-GENERATED:tests END -->
