# QuranAtlas Design-System and Interface Refactor Plan

## Context

Refactor the complete QuranAtlas interface as a refined evolution of its current calm reading identity, while permitting deliberate workflow improvements in onboarding, navigation, search, reader controls, and settings. The end state is one token-driven, accessible, responsive UI system used by every route and overlay: launch/onboarding, verse reader, Mushaf, Surahs, Bookmarks, Search, Settings/Assets, About, Unsupported, the navigation drawer, and all loading/empty/error/offline/disabled/selected/focus states. Preserve Quran data behavior, route grammar, persistence contracts, and offline architecture; change interaction structure only where this plan explicitly does so.

The authorized visual-design seat is `ui-director`. Its access was restored during this run and produced the binding brief at `.scratch/director-brief-v1.md`; that brief is the visual source of truth for the completed milestones and remaining implementation.

## Progress checkpoint

This plan is **in progress**. The checkpoint commit saves all current tracked and untracked implementation work on `dev`; it does not claim the full refactor is complete.

### Completed

- **Step 1 — binding brief:** director access was restored; the exact milestone brief was produced and used as the authority for implementation. The brief remains in ignored `.scratch/` by repository convention.
- **Step 2 — registry enforcement:** registry schema versioning, recursive schema validation, dependency/path checks, reverse public-export coverage, stale-path repairs, recipe ownership, and primitive ownership entries are implemented.
- **Step 3 — tokens and primitives:** semantic theme tokens, unified `data-swatch` rules, reduced-motion bindings, `Status`, `ListRow`, `ListRowActions`, `Card`, pill buttons, radiogroup `SegmentedControl`, and the `Sheet` navigation-drawer variant are implemented with stories. The `ListRow` optional `num` contract is implemented.
- **Milestone 1 review:** visual QA and correctness review completed with repairs for token bindings, theme-chip layout, drawer geometry, touch targets, nested row interaction, current-route semantics, Sheet SSR/control behavior, and registry honesty.
- **Step 4 partial — shared shell:** all four page recipes were strengthened; `ChromeFrame` and the shared drawer composition were added; Reader, Search, About, navigation routes, and the App route host were partially migrated; the drawer uses the approved Sheet primitive and Destination radiogroup.

### Remaining

- **Finish Step 4 before advancing:** complete the App route wiring and final shared-shell verification. The current checkpoint still has unresolved integration items reported by `mise run check`: `ChromeFrameRoute`, `readHref`, `DRAWER_DESKTOP_QUERY`, and a stale `currentLabel` prop, plus unused/formatting diagnostics. Re-run the browser smoke after the existing port-5173 listener is resolved.
- **Step 5 — launch/onboarding/unsupported:** migrate launch and onboarding compositions to the recipe/status system and complete retry, storage-failure, and unsupported-route recovery states.
- **Step 6 — Reader/Mushaf:** complete the reader and Mushaf recipe, chrome, controls, loading/recovery, typography, and state migration without changing reading or asset contracts.
- **Step 7 — navigation:** complete Surahs, Bookmarks, drawer panels, swipe/delete consolidation, Wird visual consolidation, and verified dead-code removal.
- **Step 8 — Search:** complete responsive master-detail/mobile details flow, state coverage, and the defined-viewport Storybook matrix.
- **Step 9 — Settings/Assets/About:** complete settings information architecture, persisted theme/radiogroup behavior, actionable write failures, asset states, About, destructive confirmation, and old control cutover.
- **Step 10 — CSS ownership cleanup:** remove migrated duplicate/dead selectors and route-local raw visual styling screen by screen.
- **Step 11 — Storybook matrix:** finish route-family and observable-state stories for every remaining migration.
- **Step 12 — E2E coverage:** add only the retained user-level onboarding, drawer/focus, navigation, bookmark, Search, Settings, About, Unsupported, reader, Mushaf, and offline contracts.
- **Step 13 — final loop:** complete milestone reviews, final static/build/smoke/offline/release verification, and final director review with visual sign-off.

### Checkpoint verification

- `mise run storybook:build` passed for the current tree.
- `mise run build:ui` passed for the current tree.
- `mise run check` currently fails on the unresolved Step 4 integration items listed above; no claim of a green checkpoint is made.
- `mise run smoke` was not completed at this checkpoint because the existing `127.0.0.1:5173` listener prevented the task's server setup.
- `git diff --check` was clean before this plan-only update.

### Checkpoint history

- All current source changes, stories, registry/token work, shared-shell work, and this plan update are saved together in the checkpoint commit created after this update.


## Approach

### 1. Produce the binding milestone brief before editing UI code

1. Ensure the `ui-director` seat can run (bindings live in `modelRoles` in `.omp/config.yml`). If execution still returns an account or balance error, stop UI implementation as blocked; do not ask any non-design seat to choose visual direction.
2. Start `mise run dev` through a hub-managed `qa-dev` process and have `ui-director` inspect the live application at `1280x900` and `375x812`, in light, sepia, and dark themes. The director must inspect every route and overlay listed in this plan, plus the token files, registry, recipes, and owned primitives required by `skill://ui-design`.
3. Require one binding brief that defines, without implementer discretion:
   - the retained QuranAtlas visual qualities and the refined hierarchy for application chrome, page headings, content surfaces, cards, lists, controls, feedback, and Arabic/Latin typography;
   - exact existing tokens to use and any exact new primitive or semantic tokens, with light/sepia/dark values and reduced-motion behavior;
   - desktop and mobile composition for every screen in Steps 5–9;
   - exact hover, pressed, selected, disabled, focus-visible, loading, empty, error, offline, and destructive-confirmation treatments;
   - motion durations/easings and which transitions become immediate under `prefers-reduced-motion`;
   - a component/state matrix mapping every visible pattern to an existing `src/components/ui/**` primitive or to one explicitly specified primitive extension.
4. Treat the resulting brief as the visual source of truth for all later steps. The implementer must apply it exactly; advisors are off by default, so enable a bounded independent review only when it adds evidence beyond the implementer's own checks. A missing choice returns to `ui-director`; the implementer must not invent styling.

### 2. Make the registry enforce the system being migrated

1. Update `src/design-system/registry/component-registry.schema.json`, `src/design-system/registry/component-registry.json`, and `scripts/check-react-component-registry.mjs` together so the registry validates its own schema version, allowed maturity values, unique component keys, valid dependency keys, recipe/page-recipe classification, and existence of every declared source, story, and test path.
2. Add reverse-coverage validation for owned exports under `src/components/ui/**` and recipes under `src/design-system/recipes/**`: each public primitive/recipe must have one registry owner, while private helpers remain inside their owning module and are not separately registered.
3. Register the existing `NavigationPageRecipe` and every live shared product component that the director’s component matrix identifies as a system-owned reusable pattern. Correct stale story/test paths instead of manufacturing placeholder files.
4. Keep Radix imports restricted to `src/components/ui/**`; keep route and product components dependent on registry-approved primitives and recipes. Preserve the existing guardrail scripts for literal values and ownership boundaries rather than creating a second enforcement path.

### 3. Normalize the token pipeline and primitive contracts

1. Keep the single existing namespace chain: `src/design-system/tokens/primitives.css` (`--qar-*`) → `semantic.css` (`--qa-react-*` theme mappings) → `tailwind-theme.css` (`qar:` utilities). Do not add another token namespace or bypass this chain with route-local variables.
2. Add only the primitive/semantic tokens named by the director brief. Define all three theme mappings together and remove superseded/orphaned tokens only after repository references show zero consumers.
3. Replace the known hardcoded typography, scrim, color, radius, spacing, and shadow literals in `src/design-system/index.css` with the chosen tokens. Unify the light/sepia/dark theme-swatch implementation under the existing `data-swatch="light|sepia|dark"` contract rather than parallel chip selectors.
4. Extend existing components in `src/components/ui/**` for the exact missing states from the brief—selection groups, status/gate surfaces, page chrome, and responsive overlay behavior—before migrating consumers. Use ARIA radiogroup/radio semantics for mutually exclusive choices; reserve `aria-pressed` for true toggle buttons.
5. Keep primitive APIs small and state-oriented. Do not expose CSS-class escape hatches or route-specific variants. Update each affected colocated Storybook story to demonstrate its public states as the primitive changes.

### 4. Consolidate recipes and the shared application frame

1. Strengthen the existing recipes in `src/design-system/recipes/{reader-page,navigation-page,onboarding-page,settings-page}.tsx`; do not create competing page-shell conventions. Each recipe must own the director-specified page width, gutters, heading placement, content rhythm, desktop/mobile breakpoints, and safe-area behavior for its page family.
2. Remove the duplicated app-chrome/drawer host wiring from `src/components/reader/ReaderPageShell.tsx`, `src/components/search/SearchShell.tsx`, and `src/app/routes/settings/AboutRoute.tsx`. Route these surfaces through one shared, registry-owned chrome composition using the existing approved primitives and recipes.
3. The unified drawer must trap focus while open, close on Escape and backdrop activation, restore focus to the invoking control, expose the active destination, and prevent background interaction. On mobile it behaves as the brief’s modal navigation surface; on desktop it uses the brief’s persistent/overlay composition without changing route URLs.
4. Preserve `src/app/App.tsx` hash parsing/clamping, launch gate, last-surface restoration, Settings/Assets background-route preservation, reader anchor restoration, and focus-return contracts. Keep all existing route `data-testid` hooks because the retained Playwright fixtures consume them.
5. Standardize one visible heading hierarchy and one status/live-region pattern across routes. Keep existing announcements and add no duplicate announcements when a page transitions between loading, loaded, empty, error, and offline states.

### 5. Refactor launch, onboarding, and unsupported entry states

1. Apply `OnboardingPageRecipe` to `src/app/routes/onboarding/OnboardingRoute.tsx` and the launch components under `src/components/launch/**`. Use the director-defined step hierarchy, selectable edition/source cards, progress/requirements feedback, primary action placement, and compact mobile composition.
2. Keep the existing asset-contract reset, Mushaf-edition setup, storage writes, and route transition behavior. UI reorganization must not change which selection is required or when setup is complete.
3. Make missing assets, storage failures, and retry actions use the shared status/gate surface. Retry must retain or move focus to the newly relevant control and must not leave an inert loading state.
4. Give the unsupported route the same application identity, readable cause, and explicit recovery/navigation action as other gate states; do not leave it as an unstyled exception.

### 6. Refactor verse reader and Mushaf without changing reading engines

1. Migrate `src/app/routes/read/ReaderRoute.tsx`, `src/components/reader/**`, and `src/components/reader/ReaderPageShell.tsx` to `ReaderPageRecipe`, the unified chrome, and the brief’s typography/content rhythm. Preserve verse identity, Arabic directionality, translation/source content, current-position persistence, route anchors, and all existing live-region behavior.
2. Consolidate repeated badges, header/chrome buttons, selection states, and feedback into the approved primitives. Keep reader controls reachable by keyboard and touch, with a minimum touch target defined by the brief and a visible focus state in every theme.
3. Preserve reader-chrome auto-hide timing and triggers. Interaction with a control must not accidentally toggle page chrome, and reduced motion must remove only animation—not state changes.
4. Migrate `src/app/routes/read/MushafRoute.tsx` and its visible controls/statuses to the same shell and state language. Preserve page-window loading/recovery, pinning, gesture thresholds, keyboard navigation, current-page persistence, and riwayah/dataset subscriptions exactly; this refactor must not alter Mushaf asset addressing or lazy loading.
5. Unify verse-reader and Mushaf loading, missing-pack, offline, and recovery surfaces while keeping their distinct recovery actions. No dataset, search-pack, or Mushaf page media may be added to app-shell precaching.

### 7. Refactor Surahs, Bookmarks, and the navigation drawer into one discovery system

1. Apply `NavigationPageRecipe` to `src/app/routes/navigation/SurahsRoute.tsx` and `BookmarksRoute.tsx`. Give both first-class page headings, responsive list density, consistent metadata hierarchy, selected/current-location treatment, and shared empty/error surfaces.
2. Recompose the navigation drawer panels under `src/components/navigation/**`—Read/Search destinations, Wird, Surah, Juz, Hizb, Bookmarks, and saved searches—using the same list-row, count/badge, progress, section-heading, and selected-state primitives as the full pages.
3. Extract the duplicated swipe-to-delete behavior in `BookmarksList` and `SavedSearchesNavPanel` into one shared navigation interaction with the existing swipe distance/velocity constants, pointer cancellation rules, keyboard-accessible delete action, and destructive confirmation behavior unchanged.
4. Consolidate duplicated Wird rings/meters into one visual component while preserving advancement and reset logic. The UI may improve comprehension and reset confirmation, but must not modify wird calculations, persistence, or progression rules.
5. Before deleting `BookmarkToggle`, `BookmarkIndicator`, `BookmarkLandingPulse`, `ShortcutSheet`, `WirdResetConfirm`, or `WirdProgressMeter`, use LSP references plus a repository text search. If a candidate has zero runtime, story, and test consumers, delete its file, exports, registry entry, and CSS in the same cutover; if it has a consumer, migrate that consumer to the selected replacement first. Leave no compatibility alias.

### 8. Rework Search as responsive master-detail while preserving search contracts

1. Refactor `src/app/routes/search/SearchRoute.tsx`, `src/components/search/SearchShell.tsx`, and `src/components/search/**` into the brief’s desktop master-detail composition and mobile list→details flow. Desktop keeps query/results and selected-result detail simultaneously where space permits; mobile gives results and details distinct, reversible states with a visible back action and restored result focus/scroll.
2. Preserve search hash serialization, query parsing, cancellation, result ranking, saved-search behavior, pack availability gates, worker/session lifecycle, and route restoration. No visual refactor may invoke a second search or change result ordering.
3. Unify query input, filters, result rows, match metadata, empty query, no-results, pack-missing, downloading, offline, and worker-error states with the approved primitives and live-region pattern.
4. Correct the Search `MobileDetails` Storybook configuration to use a defined viewport. Add story coverage for query entry, populated results, selected detail, no results, missing pack, offline/error, desktop, and mobile without screenshot assertions.

### 9. Rework Settings, Assets, About, and destructive data actions

1. Apply `SettingsPageRecipe` to `src/app/routes/settings/SettingsRoute.tsx` and components under `src/components/settings/**`. Preserve the overlay’s reader background, deep-link anchor, close/back behavior, persisted preferences, theme/riwayah dataset subscriptions, and focus restoration.
2. Organize Verse, Mushaf, continuity, appearance, and assets controls into the director-defined sections with one row/control anatomy. Use radiogroups for theme and other exclusive selections, switches for independent booleans, and buttons only for actions. Every group must expose a programmatic label, selection state, disabled reason where applicable, and inline save/error feedback.
3. Use the unified `data-swatch` theme control with accurate light/sepia/dark previews. Applying a theme must update the visible app immediately and persist through the existing settings writer; a failed IndexedDB write must remain visibly actionable rather than silently appearing saved.
4. Integrate `#/assets` into the same settings information architecture while retaining its route and anchor semantics. Express installed/downloading/missing/offline/error states with the shared status/gate and progress components; keep actual pack lifecycle and cache policy unchanged.
5. Refactor `src/app/routes/settings/AboutRoute.tsx` onto the unified app chrome and page hierarchy. Present app/version/source/license information as readable content, not settings controls, with the same navigation/focus behavior as other routes.
6. Keep clear-data on the owned Dialog primitive. The destructive action must have explicit consequence copy, initial focus on the safe action, Escape/cancel support, busy/error states, and deterministic focus restoration after cancel or failure.
7. Before deleting `ThemeChips`, `SourcePicker`, or `SourcePickerRow`, confirm zero remaining references as in Step 7, migrate all consumers to the chosen settings controls, then remove files, exports, registry entries, and selectors in one cutover.

### 10. Complete CSS and ownership migration screen by screen

1. Migrate product styling from `src/design-system/index.css` into recipe composition and token-backed `qar:` utilities in this order: shared chrome/states, onboarding, reader/Mushaf, navigation/Surahs/Bookmarks, Search, Settings/Assets/About, then unsupported/gate remnants. A screen is not complete until desktop/mobile and all three themes use no route-specific raw visual literals or `!important` overrides.
2. After each screen family migrates, remove only its now-unreferenced selectors from `index.css`; do not carry parallel old/new selectors. Retain `index.css` only for imports, global normalization, and truly shared reader typography that cannot live in a component/recipe without duplicating Quran text rules.
3. Eliminate the known duplicate/dead selectors and parallel pressed/radio/chip systems as their consumers migrate. Keep one implementation for each pattern selected by the director brief.
4. Do not move product components into `src/components/ui/**` merely to evade the Radix boundary. Only reusable, route-agnostic primitives belong there; route compositions stay in their current product groups.

### 11. Build the state matrix and Storybook evidence alongside each migration

1. For every registry-owned primitive and each route-family composition, update or add colocated stories covering only observable public states needed by the director matrix: default, interactive selection, disabled, loading, empty, error/offline, destructive confirmation where applicable, light/sepia/dark, and desktop/mobile compositions.
2. Reuse realistic existing fixtures and providers so stories exercise actual text direction, long labels, Quran metadata, and persisted-setting shapes. Do not add mock-only component APIs or stories that merely prove a prop is forwarded.
3. Keep screenshots transient and manual. Add no visual snapshot files, `toHaveScreenshot` calls, DOM-shape assertions, CSS-class assertions, or persisted browser profiles.

### 12. Preserve behavior with focused end-to-end coverage

1. Update `e2e/fixtures/app.ts` only where reusable user-level actions are needed for the reworked flows; keep fixtures expressed through roles, accessible names, URLs, persisted state, and visible outcomes rather than CSS/DOM details.
2. Expand `e2e/core-smoke.spec.ts` to retain the existing reader/search/settings journey and cover the now-reworked contracts that could plausibly regress:
   - onboarding selection completes setup and lands on the expected reader URL;
   - drawer keyboard open/close traps focus, Escape closes it, and focus returns to the invoker;
   - Surahs navigation selects a chapter and reaches its reader URL;
   - bookmark creation appears on Bookmarks, keyboard deletion follows the confirmation contract, and cancellation preserves it;
   - Search mobile results open details, Back restores the selected result, and the hash remains canonical;
   - Settings opened over each reader mode preserves the background, applies/persists a theme, closes to the same reader anchor, and restores focus;
   - About and Unsupported expose their heading and recovery/navigation action;
   - reader chrome and Mushaf keyboard/gesture behavior retain their current observable outcomes.
3. Update `e2e/offline-lifecycle.spec.ts` only for visible offline-state changes introduced by the refactor. Preserve its service-worker/network assertions and desktop reader/search coverage; do not broaden Mushaf media into ordinary offline CI.

### 13. Run the mandated feedback loop at every coherent milestone

1. Execute coherent milestones in this sequence: system/registry/primitives; shared shell; onboarding; reader/Mushaf; navigation/Surahs/Bookmarks; Search; Settings/Assets/About/Unsupported; final integration.
2. For each screen milestone: implement through the `ui-implementer` seat, enabling a bounded independent review only when it adds evidence; launch named OMP browser tabs at `1280x900` and `375x812`; exercise light, sepia, dark, reduced-motion, and the milestone’s transient states; then send transient screenshots to `ui-visual-reviewer`.
3. Resolve every visible delta against the binding director brief, re-render the affected states, and repeat visual QA until the reviewer reports no remaining visible mismatch.
4. Because navigation, focus, selection semantics, persistence feedback, and responsive flows change, run `ui-correctness-reviewer` after each affected milestone. Resolve TypeScript, state, event, focus, routing, and accessibility findings without asking the correctness reviewer to choose styling.
5. After all checks and repairs, run one final `ui-director` review over every route at both viewports and all three themes. Final sign-off is required before the refactor closes.

## Critical files & anchors

- `src/app/App.tsx` — hash-router switch, launch gate, last-surface restoration, and Settings/Assets overlay host; preserve these contracts while centralizing chrome.
- `src/design-system/index.css` — 4,033-line legacy concentration point; shrink incrementally only after each consumer family moves to tokens/recipes.
- `src/design-system/registry/component-registry.json` — authoritative component ownership and dependency map to repair before migrations.
- `src/components/reader/ReaderPageShell.tsx` — existing reader host and one of three duplicated chrome/drawer compositions.
- `src/components/search/SearchShell.tsx` — responsive search host and second duplicated chrome/drawer composition; becomes the master-detail consumer of the shared frame.

## Verification

Run from `/Users/omarduadu/dev/QuranAtlas` with the repository-pinned mise tools installed.

1. **Static/system gates after each milestone:** `mise run check`. The component-registry, literal-value, ownership, TypeScript, Biome, and workflow checks must all pass with no stale paths, unregistered owned exports, raw visual literals, or forbidden Radix imports.
2. **Component build after primitive/recipe and story changes:** `mise run storybook:build`, followed by `mise run build:ui`. Expected: all stories, including Search `MobileDetails`, build with defined viewports and no missing registry references.
3. **Manual browser matrix:** start `qa-dev` with `mise run dev`; use OMP browser tabs at `1280x900` and `375x812`. Visit launch/onboarding, `#/s/1/1`, a non-default verse anchor, `#/m/1`, Surahs, Bookmarks empty and populated, Search empty/results/details/missing-pack/error, Settings from verse and Mushaf, Assets, About, Unsupported, and every drawer panel. At each, verify light/sepia/dark, keyboard-only navigation, visible focus, touch-sized controls, long text, Arabic directionality, loading/empty/error/offline/disabled/selected states, and reduced motion. Expected: no horizontal overflow, obscured focus, trapped background interaction, theme-specific unreadable state, duplicate live announcement, console error, or failed unexpected request.
4. **Concrete interaction proof:** on mobile Search, enter a query with known results, open a result, activate Back, and observe the same result focused/visible with the canonical search hash unchanged. Open Settings over verse and Mushaf, change theme, close, reload, and observe the same reader URL/anchor plus the persisted theme. Open the drawer by keyboard, Tab through it, press Escape, and observe focus restored to the opener.
5. **Core regression proof:** `mise run smoke`. Expected: all desktop and mobile core journeys pass, including the added onboarding, navigation, bookmark, responsive Search, overlay restoration, About/Unsupported, reader-chrome, and Mushaf interaction assertions.
6. **Offline proof because offline/gate presentation changes:** `mise run offline`. Expected: cached reader/search behavior and network outcomes remain unchanged while the new visible offline states and recovery actions remain operable.
7. **Release rendering:** `mise run build:release`; start hub-managed `mise run preview` on port `4173` and repeat the route/theme viewport spot-check for onboarding, verse reader, Mushaf, Search details, and Settings overlay. Expected: production rendering and service-worker registration introduce no layout or interaction difference from the verified dev behavior.

## Assumptions & contingencies

- Visual direction is a refined evolution, not a brand replacement: retain QuranAtlas’s calm reading-first identity while making hierarchy and component behavior visibly more coherent.
- Key flows may be reworked only as specified above. Route grammar/clamping, data/search engines, pack lifecycle, reader/Mushaf persistence, Mushaf page-window recovery, wird calculations, and settings-anchor implementation remain behaviorally unchanged.
- If the `ui-director` seat cannot run, implementation remains blocked after all non-visual inventory work; there is no authorized fallback design seat.
- If LSP and text search disagree about a dead-code candidate, treat it as live, identify the dynamic/exported consumer, and migrate that consumer before deletion. Never delete on filename inference alone.
- If a proposed shared primitive requires route-specific props, keep the route composition in its product directory and add only the smallest route-agnostic primitive state needed by the binding brief.