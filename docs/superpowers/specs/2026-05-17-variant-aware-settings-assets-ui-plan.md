# Variant-Aware Settings And Assets UI Plan

## Decision

Use a mode-aware, reader-adjacent settings model plus a dedicated asset route. Mobile settings are true full-screen surfaces, not partial-height modals. Retire the all-purpose Settings sheet and the Command Sheet/Search promise from current navigation. The selected visual direction is a calm parchment ledger: Arabic/Mushaf content first, bronze for active/action emphasis, compact rows, hairline separators, matching Theme/Night controls across modes, and no decorative marketing treatment.

Selected assembly references:

- `docs/ui-references/configure/verse-settings.mobile.png`
- `docs/ui-references/configure/mushaf-settings.mobile.png`
- `docs/ui-references/configure/asset-management.mobile.png`
- `docs/ui-references/configure/asset-management.desktop.png`

Selected component references for implementation:

- `docs/ui-references/configure/settings-shell.mobile.png`
- `docs/ui-references/configure/verse-preview.mobile.png`
- `docs/ui-references/configure/mushaf-preview.mobile.png`
- `docs/ui-references/configure/verse-settings-rows.mobile.png`
- `docs/ui-references/configure/theme-night-controls.mobile.png`
- `docs/ui-references/configure/settings-sidebar.desktop.png`
- `docs/ui-references/configure/asset-row-states.mobile.png`
- `docs/ui-references/configure/asset-table-states.desktop.png`
- `docs/ui-references/configure/asset-status-live-region.mobile.png`

Adjacent `.md` intent notes define accepted traits, forbidden traits, token expectations, responsive differences, and non-goals. The component references are the implementation source of truth for hierarchy, density, rhythm, material feel, and emphasis. The assembly references remain useful for signed-off composition and page-level relationships but are not authoritative for row labels, state copy, actions, desktop settings shape, or generated placeholder details. Generated Arabic/Quran text is never source content or rendering proof; real implementation must use QuranAtlas tokens, real Quran/Mushaf rendering, and the current surface contracts.

This plan and the component intent notes are the redesign authority until implementation updates the surface dossiers. Existing `configure`, `read`, and `navigate` dossiers still describe the old all-purpose settings sheet, centered desktop modal, storage accordion, and command-sheet paths; treat those as current-state context to be changed, not as design authority for this redesign.

## Ownership

- `configure` owns Verse Settings, Mushaf Settings, settings persistence controls, source/asset pickers, and the `#/assets` Asset Management page.
- `read` owns the reader gear entry, reader-mode detection, restored focus to the opener, and the desktop AmbientDock Settings entry after Command Sheet removal.
- `navigate` owns removal of Command Sheet, command/search keyboard shortcuts, Search rail entry, command docs, and related tests.
- `packs`, `data`, and `infra` own variant-aware install/status/delete truth. UI may display status but must not infer installed state from old cache names or `offlineCategories`.

Implementation must read and update `docs/context/surfaces/configure.md`, `docs/context/surfaces/read.md`, and `docs/context/surfaces/navigate.md` in the same change as the behavior lands. Asset-state implementation must also inspect the relevant `src/packs/**`, `src/data/**`, and `src/infra/**` contracts before wiring status, install, verify, set-active, or delete behavior.

## Verse Settings Panel

Entry: reader gear in Verse mode. The panel title is "Verse Settings" and the subtitle names the active riwayah and text style.

Mobile shape: full-screen safe-area-aware sheet/page using the entire viewport, matching `settings-shell.mobile`. It keeps the same header, section rhythm, row density, status chip style, action treatment, and Theme/Night footer controls as Mushaf Settings.

Hierarchy:

1. Preview band: follows `verse-preview.mobile`; small label, Arabic sample using reader typography, optional translation line that preserves height when hidden, close button, active riwayah/text-style label, and visible response to font size, reading flow, translation visibility, and theme.
2. Reading: follows `verse-settings-rows.mobile`; Font Size and Reading Flow controls with stable row height.
3. Quran text: Active Riwayah and Quran Text Style rows. Rows open nested pickers with install/status affordances.
4. Meaning and study: Translation Source, Show Translation, and Tafsir Source rows.
5. Appearance: follows `theme-night-controls.mobile`; compact Theme swatches and Night Mode segmented control, identical in structure and placement to Mushaf Settings.
6. Footer action: Manage Assets closes the panel and navigates to `#/assets`.

Theme/Night placement: Theme and Night Mode remain visible in the same footer band used by Mushaf Settings on normal mobile heights. On short screens they remain reachable after one body scroll, never buried behind storage controls. Night Mode is a three-state control: Off, On, Auto.

## Mushaf Settings Panel

Entry: reader gear in Mushaf mode. The panel title is "Mushaf Settings" and the subtitle names the active riwayah and Mushaf edition.

Mobile shape: full-screen safe-area-aware sheet/page using the entire viewport, matching `settings-shell.mobile`. It keeps the same header, section rhythm, row density, status chip style, action treatment, and Theme/Night footer controls as Verse Settings.

Hierarchy:

1. Unframed Mushaf page preview following `mushaf-preview.mobile`, token-colored like the live Mushaf surface, with active page/edition context and no Verse typography controls.
2. Active riwayah row.
3. Active Mushaf edition row.
4. Appearance: follows `theme-night-controls.mobile`; compact Theme swatches and Night Mode segmented control, identical in structure and placement to Verse Settings.
5. Footer action: Manage Assets closes the panel and navigates to `#/assets`.

Mushaf view mode stays in pinned Mushaf chrome. Do not duplicate Auto/Page/Width in this panel unless later user testing proves discoverability failure and live sync is explicitly designed. Avoid extra icon clusters; Mushaf and Verse panels should differ by preview and mode-specific rows, not by a separate visual language.

## Desktop Settings Entry

After Command Sheet removal, desktop settings open from the AmbientDock Settings entry or More menu as a right-side sidebar matching `settings-sidebar.desktop`. Do not use the old centered settings modal for the redesigned mode-aware settings. The sidebar keeps reader content visible to the left, restores focus to the opener on close, and uses the same preview, row, Manage Assets, and Theme/Night grammar as mobile.

## Asset Management Page

Route: `#/assets`. It is a real route, excluded from `lastSurface` and launch restore. Manage Assets navigates here after closing any open panel. Back uses browser history when present; direct entry shows a Back to Reader CTA to `#/s/1`.

Mobile layout:

1. Sticky compact header: Back, page heading, optional reload/verify action.
2. Active variant summary: active riwayah, Quran text style, Mushaf edition.
3. Status live region: install progress, verification errors, and completed actions.
4. Sections: Quran Text Styles, Mushaf Editions, Translations, Tafsir, then other cacheable v1 assets only when real.
5. Asset rows: follow `asset-row-states.mobile`; one primary action, secondary metadata, overflow secondary/destructive actions, and disabled reason text inline.

Desktop layout:

1. AmbientDock keeps Verse and Mushaf entries, removes Search, and exposes Settings through a labelled Settings item or More menu path.
2. Main `#/assets` content uses a two-pane operational layout: left summary/navigation, right grouped asset tables.
3. Tables expose status, active compatibility, size/progress, and actions without card nesting, following `asset-table-states.desktop`.

Tablet behavior: default to the mobile full-height structure at higher density for settings and assets. A bounded tablet dialog/drawer is allowed only if implementation proof shows the full-height structure fails line length, action wrapping, or reader adjacency. Tablet must be explicitly screenshot-checked at `768x1024` before changing away from the mobile structure.

## Cross-Mode Consistency

Verse Settings and Mushaf Settings share one component grammar:

- same full-screen mobile shell, safe-area header, close/back treatment, section label style, row height, dividers, status chips, and footer rhythm;
- same Theme swatches and Night Mode segmented-control placement, shape, pressed state, labels, and focus behavior;
- same Manage Assets row/action language;
- same nested picker behavior, disabled-state treatment, and progress/error live region style.

Only the mode content changes. Verse includes typography, reading flow, text style, translation, and tafsir controls. Mushaf includes Mushaf page preview, riwayah, and Mushaf edition controls; it does not show Verse typography controls or decorative icon groups.

The Verse control inventory is exact: Font Size, Reading Flow, Active Riwayah, Quran Text Style, Translation Source, Show Translation, Tafsir Source, and Manage Assets. Do not duplicate Active Riwayah, add Mushaf Edition to Verse Settings, or introduce placeholder controls from generated art.

Generated assembly-art drift is explicitly non-authoritative. Ignore any assembly image detail that conflicts with component references or this plan, including Reset controls, centered desktop dialogs, route-header settings gears, version/update-required compatibility copy, Install buttons on Shipped assets, pause-only install controls, or row labels that differ from the exact inventory.

## Asset Row State Matrix

| State | Visual treatment | Primary action | Secondary action | Disabled/assistive copy |
| --- | --- | --- | --- | --- |
| Shipped | Muted baseline chip; no install emphasis | Set Active if compatible and not active | None | "Included with app" |
| Cached | Cache chip with verified timestamp/size when known | Set Active if compatible | Delete cache if not active and optional | "Verified in browser cache" |
| Installed | Stronger installed chip | Set Active if not active | Delete if optional and inactive | "Ready offline" |
| Incomplete | Amber warning chip + missing count/bytes | Reinstall/Retry | Delete partial cache | "Download did not finish" |
| Incompatible | Disabled row tone, compatibility reason | None | None | "Requires active riwayah: {name}" |
| Unavailable | Error/unavailable chip | Retry/Check again when online | None | "Not available in this build/offline" |
| Active delete disabled | Active spine/check; Delete disabled | Active | Disabled Delete | "Switch to another compatible asset before deleting" |
| Install in progress | Progress bar, row actions locked except cancel when supported | Installing... | Cancel only if supported by pack API | `aria-live` progress "{done} of {total}" |
| Set Active available | Bronze outline/solid action depending row importance | Set Active | Delete if installed and inactive | "Installed and compatible" |

Install never changes active settings. Set Active appears only after verified usability. Delete is blocked for active optional assets until another compatible verified asset is active.

Use the exact active-delete disabled reason everywhere: "Switch to another compatible asset before deleting." Shorter variants such as "Switch active asset before deleting" are rejected as generated-reference shorthand.

Asset row implementation uses `asset-row-states.mobile` and `asset-table-states.desktop` as the visual state references. The route-level live region uses `asset-status-live-region.mobile`; desktop may place the same status near the page header or table toolbar.

## Known Implementation Hazards

- **Stale dossiers are expected before implementation.** `configure`, `read`, and `navigate` still describe the old modal/settings/search behavior. Use this plan and component references for the redesign, then update those dossiers when code changes land.
- **`#/assets` must not persist as launch surface.** Current continuity code skips `#/onboarding` and `#/settings`; implementation must add `#/assets` to the skipped `lastSurface`/launch-restore behavior and cover direct-entry fallback to `#/s/1`.
- **Night Mode changes data shape.** Current `settings.nightMode` is boolean. The redesign requires `Off | On | Auto`, so implementation must add a migration/normalization path, update the sole writer, and keep existing keyboard/night behavior coherent.
- **Qalun label and `qaloon` runtime key differ.** User-facing UI says Qalun; persisted/runtime keys may remain `qaloon`. Do not "correct" one into the other without a data migration.
- **Asset state needs a UI view model.** Before rendering rows, define a single adapter from `packs`, `data`, and `infra` status into the UI state matrix. Do not let rows infer installed/compatible/delete-disabled state from old `offlineCategories` or legacy cache names.
- **Desktop live status reuses the mobile status grammar.** There is no separate desktop status-strip reference; place the same `asset-status-live-region.mobile` semantics near the desktop page header or table toolbar and prove it in desktop screenshots.

## Accessibility

- Settings panels are labelled dialogs with focus trap, Escape/backdrop dismissal, reduced-motion-safe transitions, and restored focus to the gear or desktop Settings opener.
- Nested pickers trap focus within the picker while open. Escape closes the nested picker first; a second Escape closes the parent panel.
- `#/assets` has a page heading, section landmarks, keyboard-operable rows/actions, visible focus indicators, and no keyboard-only hidden route actions.
- Install progress and errors use an `aria-live="polite"` status region; destructive/delete failures use assertive only when user action has failed.
- Disabled buttons expose visible reason text and programmatic descriptions via `aria-describedby`.
- Interactive targets meet the existing `--qa-touch-min` 44px target in mobile/tablet and remain keyboard focusable on desktop.
- Theme and Night controls expose pressed/current state, not color alone.

## Browser Proof And Tests

Development proof before implementation acceptance:

- Screenshot Verse Settings and Mushaf Settings at `390x844`, `320x568`, `768x1024`, and desktop `1280x800`; compare the two mode panels side-by-side against `settings-shell.mobile`, `verse-preview.mobile`, `mushaf-preview.mobile`, `verse-settings-rows.mobile`, `theme-night-controls.mobile`, and `settings-sidebar.desktop`.
- Screenshot `#/assets` at `390x844`, `320x568`, `768x1024`, and `1440x900`; compare row states against `asset-row-states.mobile`, `asset-table-states.desktop`, and `asset-status-live-region.mobile`.
- Check light/sepia/dark plus Night overlay placement for both panels and the asset page.
- Use Playwright MCP or Playwright CLI to verify no horizontal overflow, no overlapping header/actions, 44px touch targets, focus restoration, nested picker Escape order, and live progress/error announcement nodes.

Durable coverage candidates:

- Unit/component tests for mode-aware gear opening, panel content differences, Theme/Night presence, Manage Assets navigation, row state rendering, disabled reasons, and Set Active/Delete gating.
- Route tests for `#/assets` excluded launch restore, direct-entry Back to Reader CTA, and history Back behavior.
- E2E/browser-only tests for correct panel by reader mode, focus trap/restored focus, nested picker focus, `aria-live` progress/errors, responsive no-overflow checks, and service-worker/cache install/delete states where unit tests cannot prove browser Cache Storage behavior.

Verification for this docs/reference phase: `pnpm run docs:check` and `git diff --check`.
