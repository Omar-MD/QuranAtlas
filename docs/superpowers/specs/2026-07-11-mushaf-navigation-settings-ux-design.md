# Mushaf Navigation And Reader Settings UX Design

## Purpose

This specification defines the reader interaction and settings redesign for QuranAtlas. It fixes the Mushaf Single + Fit width scroll failure, replaces the fragile page-swipe behavior with a native-feeling interaction model, preserves both Single and Scroll Mushaf layouts, establishes one canonical reading-view toggle, and rebuilds Settings on the owned design system.

The implementation must treat these changes as one coordinated reader experience. Gesture ownership, page loading, route updates, nested scrolling, overlay behavior, responsive settings, and tokens affect each other and must not be patched independently.

## Problem Statement

The current reader has four related failures:

1. Single + Fit width creates a vertically overflowing Mushaf stage, but the JavaScript interaction model treats only Scroll mode as scrollable. Full-surface pointer capture and invisible tap-zone buttons can therefore prevent native touch scrolling and leave only the top of the page reachable.
2. Single-mode swiping uses a distance-only threshold, captures too early, previews the wrong physical page direction, resets before route navigation settles, and does not handle fast flicks, boundaries, interruptions, or rapid gestures coherently.
3. Scroll mode replaces a three-page window after a fixed cooldown. That can discard visible-page updates, clear already loaded neighbors, and move the user's scroll anchor while the route changes.
4. Reading view is exposed both in the topbar and Settings. Settings uses a custom modal, fixed regions, overlapping CSS generations, weak grouping, and low-contrast structure. On constrained screens, important controls are compressed or separated by unused space.

## Goals

- Make every Mushaf page fully reachable in every supported layout, viewport, orientation, and input mode.
- Make Single-mode touch navigation feel immediate, predictable, and physically coherent on mobile.
- Preserve and strengthen Scroll mode as a native vertical reading experience.
- Keep one reading-view action in the reader topbar and remove all duplicate or out-of-context copies.
- Show only settings belonging to the active reader mode, while preserving shared reading and appearance settings.
- Rebuild Settings as an accessible adaptive sheet using approved components and semantic design tokens.
- Add durable unit and real-browser regression coverage for the failures and edge cases.

## Non-Goals

- Changing public reader hashes or the current verse-to-Mushaf mapping contract.
- Replacing the shipped Mushaf edition or reader asset profile.
- Adding a third reader mode, two-page spread, pinch zoom, freeform zoom, or page thumbnails.
- Introducing a gesture library, carousel dependency, or general-purpose animation framework.
- Adding horizontal wheel or trackpad page-turn gestures; trackpads retain native vertical stage scrolling.
- Changing the meaning or storage keys of existing reader preferences.
- Redesigning Navigation, Search, About, or the verse-reading surface beyond what is required to remove the out-of-context reading-view toggle and integrate Settings correctly.

## Decision Summary

- Build a dedicated Mushaf gesture state machine rather than extending the existing pointer handlers.
- Let the stage own vertical scrolling in both Single + Fit width and Scroll mode.
- Remove viewport-covering edge and center buttons; use direct stage hit testing for taps without intercepting vertical input.
- Use a bounded, retained page cache and a stable rendered window instead of clearing adjacent pages on every route update.
- Commit horizontal navigation only after the settle phase and reset the new page's nested scroll container to the top.
- Replace the custom Settings modal with an adaptive variant of the owned `Sheet` component.
- Keep one icon-only `ReadingViewToggle` in reader chrome, using clearer view glyphs and action labels.
- Add settings and Mushaf interaction tokens to the semantic token layer; consolidate feature CSS rather than appending selector patches.

## Product Interaction Contract

### Mushaf mode matrix

| Navigation setting | Fit width off | Fit width on | Primary touch behavior |
| --- | --- | --- | --- |
| Single | The complete page scales inside the available stage. | The page fills the stage width and the stage scrolls vertically until the complete page is reachable. | Horizontal page swipe after horizontal intent locks; native vertical pan whenever the stage can scroll. |
| Scroll | A vertical stack of complete fit-page images. | A vertical stack of full-width images. | Native vertical scrolling only; horizontal movement never changes the page route. |

The preferences stay independent: `mushafViewMode` owns Single versus Scroll, while `mushafFitWidth` owns Fit page versus Fit width. The compatibility value `auto` resolves to effective Single mode and is displayed as Single. User changes write `fit-page` or `continuous`; legacy `fit-width` continues normalizing to Single plus `mushafFitWidth=true`.

Compact landscape continues to default to effective Fit width while honoring the existing explicit Fit-width-off choice for the current landscape session. This policy never changes Single versus Scroll. Rotating into or out of compact landscape must keep the current page reachable in both navigation modes.

### Physical page direction

QuranAtlas keeps the approved Mushaf direction:

- finger moves right: advance to the higher page number;
- finger moves left: return to the lower page number;
- left edge tap and `ArrowLeft`: advance;
- right edge tap and `ArrowRight`: return;
- vertical scrolling downward in Scroll mode reaches higher page numbers.

During a rightward drag, the higher-numbered page must already be visible entering from the left. During a leftward drag, the lower-numbered page must enter from the right. A gesture must never preview one page and commit another.

### Navigation outcomes

- A completed Single-mode navigation animates to the adjacent page and commits one route change.
- A cancelled drag animates back to the current page without changing the route.
- A new Single page starts at vertical offset zero after swipe, edge tap, keyboard navigation, or direct route navigation.
- Page 1 and the final page resist outward dragging and settle back without showing an empty page.
- Scroll mode retains a stable visual anchor while its dominant page and hash advance.
- Reader overlays disable page gestures while open and cancel any gesture that was already tracking.

## Mushaf Interaction Architecture

### Responsibility split

The reader implementation must separate three concerns:

1. Pure gesture decisions: axis intent, recent velocity, completion, direction, and boundary resistance.
2. Pointer lifecycle and animation state: pointer ownership, capture, transform, settle, cancellation, and compatibility-click suppression.
3. Page window and route coordination: retained asset loading, rendered page order, route commit, visible-page reconciliation, and scroll anchoring.

`MushafPageViewer` remains the rendering boundary, but the pure decisions and pointer lifecycle move into focused reader modules/hooks so the component is not a second routing and gesture controller.

### Gesture state machine

The Single-mode state machine has these meaningful states:

```text
idle
  -> tracking
      -> vertical-intent -> idle
      -> horizontal-intent
          -> settling-complete -> committed -> idle
          -> settling-cancel -> cancelled -> idle
```

- `idle`: no active pointer or transform.
- `tracking`: record the primary pointer, start coordinates, time, stage width, and recent movement samples. Do not capture or prevent default yet.
- `vertical-intent`: native scrolling owns the interaction. The reader never calls `preventDefault`, never captures the pointer, and clears tracking.
- `horizontal-intent`: the reader captures the pointer, follows the finger, prevents horizontal browser handling, and suppresses the later compatibility click.
- `settling-complete`: animate to the adjacent-page resting position, then emit exactly one navigation intent.
- `settling-cancel`: animate back to zero and keep the current route.
- `committed` and `cancelled`: transient cleanup states that release capture, clear samples, remove drag styles, and return to `idle`.

`pointercancel`, lost pointer capture, overlay opening, external route replacement, unmounting, viewport resize, and orientation change all use the same cancellation path. Non-primary pointers, secondary mouse buttons, and gestures that begin on an interactive control are ignored. New pointer input is ignored only during settling and the atomic route handoff; the next gesture is accepted as soon as the new centered page is ready.

### Intent and completion rules

The implementation uses distance and recent velocity, not distance alone:

- wait for a small movement slop before choosing an axis;
- lock horizontal only when horizontal displacement clearly dominates vertical displacement;
- yield to native vertical scrolling when vertical displacement clearly dominates;
- keep sampling briefly when the movement remains ambiguous instead of prematurely stealing it;
- complete when the drag crosses the responsive distance threshold or a deliberate fast flick crosses the velocity threshold with a minimum travel distance;
- cancel slow, short drags;
- apply reduced translation at an unavailable boundary.

The implementation plan freezes the tuning constants next to the pure gesture module, beginning from the proven repository pattern: an 8 CSS pixel intent slop, a responsive distance threshold, recent-velocity completion near 0.45 CSS pixels per millisecond with minimum deliberate travel, 600 ms compatibility-click suppression, and reduced translation at unavailable edges. The browser scenarios are the contract; tests must not expose or assert the numeric constants directly. Behavioral thresholds are typed constants, not CSS tokens. Visual timing and easing use motion tokens.

### Native vertical scrolling

The Mushaf stage is the only internal vertical scroll owner. Its flex/grid ancestors must permit shrinking (`min-height: 0` where required), and its available height must be derived from the reader shell rather than an arbitrary page height.

- Single + Fit page normally has no vertical overflow.
- Single + Fit width uses `overflow-y: auto`, `touch-action: pan-y`, and contained overscroll so the complete image remains reachable.
- Scroll mode uses the same native vertical stage, with a vertical stack and no horizontal gesture recognizer.
- The stage is focusable and named whenever it can scroll.
- `ArrowUp`, `ArrowDown`, `PageUp`, `PageDown`, `Home`, and `End` scroll the internal stage where applicable. Single-mode left/right page keys remain available without taking over editable controls or open overlays.
- Wheel and trackpad input target the stage directly and are not covered by transparent controls.
- Horizontal wheel/trackpad deltas do not turn pages.

The route layer resets the actual stage scroll owner, not `window`, when Single navigation commits. It performs the reset in the same visual handoff that installs the incoming page so stale offsets cannot appear for a frame.

### Direct tap handling

Viewport-covering edge and center `Button` elements are removed. For non-interactive stage targets, a click that was not produced by a drag is interpreted by its horizontal position:

- left edge: advance;
- center: toggle reader chrome;
- right edge: return.

This click interpretation never runs for bookmark controls, topbar controls, links, or form controls. A stage tap is valid only when the primary pointer ends within tap slop, the stage scroll offset did not change, and the interaction never entered horizontal or vertical intent. Horizontal drags, vertical pans, cancellation, and lost capture suppress the resulting compatibility click.

Direct stage hit testing is a pointer convenience only. Real focusable actions composed from the owned `Button` or `IconButton` primitive remain available outside the stage hit surface, named `Next Mushaf page` and `Previous Mushaf page`, with disabled boundary states, visible focus, and token-sized touch targets. They appear with the page/chrome controls rather than as transparent viewport overlays. Swipes and coordinate-based edge taps are never the only assistive-technology path.

### Page strip and settle animation

Single mode renders the three physical cells in the order needed by the approved direction:

```text
[higher-numbered next page] [current page] [lower-numbered previous page]
```

The current page begins centered. The strip follows the finger during horizontal intent. Completion settles one full stage width in the drag direction; cancellation settles to zero. The route changes only after completion reaches its resting position. The incoming page must be ready before the gesture is committable, so route synchronization replaces the centered page without a blank or backwards flash.

Animations use a Mushaf page-turn semantic duration and easing derived from shared motion primitives. Reduced-motion mode removes the travel animation while preserving atomic state and route changes.

### Page cache and loading

The route keeps a bounded asset map keyed by edition, riwayah, and page. It retains the current page plus up to two pages on either side, for a maximum normal window of five pages. The cache is updated incrementally and is not cleared while replacement neighbors load.

- Single mode renders current plus immediate previous/next cells from that retained map.
- Scroll mode renders the bounded ordered window so vertical momentum can continue across more than one boundary.
- An adjacent page is swipe-committable only when its asset is ready. While it is loading or failed, a drag may reveal a non-navigable loading/error treatment, but release settles back, the current page and hash remain unchanged, and gesture state returns to idle. A later preload retry enables navigation.
- A failed neighbor load does not discard the current or other retained pages. Direct navigation still uses the existing reader asset error state if the requested page itself cannot load.
- Stale async results are ignored after an edition/riwayah change, route replacement, or unmount.
- Old pages are pruned only after the incoming edge exists. Before mutating the rendered Scroll window, capture an anchor page and its viewport-relative top; after render, adjust `scrollTop` by that anchor's measured rectangle delta, including gaps and responsive layout changes.
- Page 1 and the manifest page count define boundaries; no placeholder cell is presented as a destination.

### Continuous visible-page reconciliation

The fixed 500 ms route cooldown is removed. Scroll events schedule at most one reconciliation per animation frame:

1. Measure the stage viewport and rendered page cells.
2. Select the cell with the greatest visible area, using distance to the viewport center as a deterministic tie-breaker.
3. Update the route only when that dominant page changes.
4. Retain the measured anchor while the bounded page window shifts.

Programmatic anchor restoration is explicitly marked so it does not recursively trigger route changes. A final reconciliation runs after scrolling settles, resize, orientation change, and page-asset layout changes. This preserves route accuracy without dropping momentum events.

Continuous reconciliation performs a replace-style route update that atomically updates both App route state and the canonical hash without adding browser-history entries. Explicit Single page turns and direct navigations retain ordinary history behavior. Every route update preserves protected intent such as Daily Wird query state and retains the existing continuity and Wird advancement rules.

### Explicit interaction gating

Gesture availability is passed as reader state rather than inferred only from global DOM queries. Settings, Navigation, and other modal owners expose whether reader interaction is suspended. Opening one of them cancels tracking or settling before the overlay accepts input. Closing restores reader input without replaying the cancelled action.

## Reading View Toggle

`ReadingViewToggle` is the one canonical reading-view action and is composed into `ReaderChrome` only on actual Verse and Mushaf reader routes.

- Verse displays the action that switches to Mushaf, represented by a recognizable open-page glyph.
- Mushaf displays the action that switches to Verse, represented by stacked verse lines with an ayah marker.
- The accessible label describes the action: `Switch to Mushaf view` or `Switch to Verse view`.
- The owned `Tooltip` repeats that destination-action copy on hover and keyboard focus while the topbar remains icon-only at rest.
- It is an action button, not a two-option settings control, so it does not use a persistent `aria-pressed` state.
- The unexplained dot, mirrored glyph treatment, and Mushaf-only pressed styling are removed.
- Settings, About, Search, and other non-reader routes do not render this action.

The existing route-mapping helpers remain responsible for preserving reading position when switching views. Removing the Settings copy also removes Settings-only route mutation and hidden reader remount behavior.

## Settings Information Architecture

### Active-mode contract

Settings receives its mode from the reader route that opened it. Mode is read-only within the sheet. When opened from Search, About, direct `#/settings`, or direct `#/assets`, it resolves mode from the preserved last readable route and falls back to Verse at `#/s/1`; opening Settings never silently switches reading mode. Direct `#/assets` opens Included reading assets expanded and reachable.

- The title is `Verse settings` or `Mushaf settings`.
- Verse settings mount only Verse reading controls.
- Mushaf settings mount only Mushaf layout controls.
- Shared continuity, Appearance, and Included reading assets groups appear in both.
- No Reader mode segmented control or reader-view toggle appears in Settings.

Existing saved values for the inactive mode remain persisted and are restored when the user later switches views from the reader topbar.

### Adaptive sheet

Settings uses the owned `Sheet` primitive so focus trapping, modal semantics, background isolation, Escape handling, outside dismissal, and focus restoration come from the approved Radix boundary.

- Small phones and short/narrow landscape viewports use a full-viewport sheet.
- Larger tablets and desktops use a right-side sheet with a bounded readable width.
- The header remains stable while one content region scrolls naturally.
- There is no fixed Appearance footer and no requirement that the content body avoid scrolling.
- Safe-area insets are included at the top and bottom.
- Closing returns focus to the Settings button that opened the sheet.

`SettingsShell` must compose an `adaptive-settings` variant of the owned `Sheet`. The owned API must provide structured header/body slots and a return-focus contract for controlled sheets that open without a colocated `Sheet` trigger. Settings open requests carry the opener id/ref; the owned layer handles close autofocus explicitly instead of relying on Radix to find an absent trigger. If no live opener exists, closing restores the readable route and focuses its Settings action, falling back to the reader main landmark. Product code must not import Radix directly.

Preference changes continue previewing in the mounted reader behind the modal while overlay interaction remains suspended. Closing Settings preserves the reader's visible anchor across typography, translation, and Mushaf layout changes.

### Group structure

The content order is:

1. `Page layout` in Mushaf or `Verse reading` in Verse.
2. `Reading continuity` for Daily Wird visibility.
3. `Appearance` for Theme and Night mode.
4. `Included reading assets`, collapsed by default on compact screens and expandable by a correctly named disclosure button.

Rows use a consistent label, supporting description, and control alignment. Groups use distinct surfaces and borders rather than relying on large empty gaps. Appearance options are allowed to wrap into columns that maintain usable target widths. All interactive targets are at least 44 by 44 CSS pixels.

Included asset rows remain read-only. They display the asset icon, source label, and Included status, but remove the chevron that currently implies navigation.

## Design Token Contract

All visual implementation flows through existing primitives or centralized semantic tokens. No one-off color literals, arbitrary shadows, isolated spacing values, or repeated media-query patches are added to feature selectors.

### Shared primitives

Existing spacing, radii, type families, fast motion, and standard easing remain the base. A new motion duration or easing primitive is allowed only if both the Mushaf settle interaction and other deliberate page/sheet transitions can semantically reuse it. Touch target sizing should be represented by a reusable control-size primitive rather than repeated `44px` literals.

### Settings semantics

The semantic layer adds a coherent Settings family, mapped deliberately for default/light, sepia, and dark appearances:

- backdrop;
- sheet surface;
- header surface and divider;
- group surface and group border;
- row divider;
- selected-control surface and selected-control text;
- secondary/muted text;
- sheet/group shadow where elevation is needed.

The token values may derive from global canvas, surface, border, accent, and text tokens with `color-mix`, but the feature CSS consumes the Settings semantics rather than borrowing unrelated Navigation tokens.

Night mode continues to compose over the resolved theme through the existing appearance system; it must not introduce a separate set of sporadic component colors.

### Mushaf interaction semantics

The semantic layer owns:

- Mushaf stage ground, ink, and boundary treatment;
- page-turn duration and easing;
- boundary/settle feedback where the approved implementation uses it.

Behavioral values such as axis slop, velocity threshold, distance threshold, and resistance factor remain typed interaction constants because they do not describe visual design.

### CSS organization

The implementation replaces the overlapping Settings rule generations with one coherent Settings section and consolidates Mushaf stage/strip rules into one coherent Mushaf section. Responsive changes are expressed at the component/layout level with a small set of named breakpoints. Old selectors, stale footer rules, mode-card rules, and transparent hit-zone rules are removed rather than overridden later in the stylesheet.

Add the `adaptive-settings` Sheet variant and its structured slots to `component-registry.json`, with matching stories and modal-behavior tests. Register `ReadingViewToggle` as a product component with its real export, read-surface ownership, `ReaderChrome` consumer boundary, both destination states, theme/focus stories, and accessible action-label test. Update the `SettingsShell` registry entry to describe its grouped adaptive states and proofs.

## Accessibility Contract

- The Settings sheet has an accessible title, modal behavior, contained focus, Escape dismissal, outside dismissal, and explicit return-focus behavior.
- Setting groups use real headings and controls retain explicit accessible names.
- Reading-view actions describe their destination view.
- The Mushaf scroll stage is named and keyboard focusable whenever it owns overflow.
- Pointer gestures are conveniences; every page-navigation outcome remains available through keyboard and labeled controls.
- Gesture handling ignores editable and interactive descendants.
- Focus indicators use the semantic focus token and remain visible in every theme.
- Normal text meets 4.5:1 contrast; large text meets 3:1; focus indicators, selected states, and essential control boundaries meet 3:1 against adjacent colors. Decorative dividers may be lower only when they are not needed to identify structure or state. Representative light, sepia, dark, auto-resolved, and night states are checked with axe plus browser-rendered contrast inspection.
- Reduced motion preserves state clarity without full-page travel.
- Touch targets meet the 44 CSS pixel minimum without relying on invisible elements layered over content.

## Responsive And Interruption Contract

The reader and Settings must be verified in:

- narrow phone portrait;
- short phone landscape;
- common tablet portrait and landscape;
- desktop widths with mouse, wheel, and trackpad behavior;
- touch-capable browser contexts at phone and tablet sizes.

Orientation and viewport changes cancel active horizontal gestures, recompute stage dimensions, and preserve a reachable current page. A Single + Fit width page may return to the top only when page navigation occurred; resizing the same page or changing effective Fit width clamps the existing vertical offset rather than resetting it. Scroll mode preserves its dominant page and visual anchor through the resize.

## State And Data Compatibility

- Public hashes remain `#/s/:surah/:ayah?` and `#/m/:page`.
- `mushafViewMode` and `mushafFitWidth` remain independently persisted.
- Existing legacy normalization remains supported; no destructive preference migration is required.
- Opening Settings does not change the underlying reader route.
- Appearance and mode-specific settings continue using the queued settings writer and existing preference-change notification.
- Failed preference reads fall back to existing defaults; a UI change is reflected optimistically and queued as today.
- Removing Settings mode switching also removes its `verseHash` bookkeeping and Settings-only route conversion helpers from `App` where no longer needed.

## Error Handling

- Requested-page asset failure uses the existing visible reader error state.
- Adjacent-page preload failure leaves the current page operable and permits retry through a later load request; it never turns an empty cell into a navigable page.
- Gesture cancellation is idempotent and safe after unmount or lost capture.
- Preference and included-asset inventory failures retain their current fallback data behavior.
- No promise rejection from preload, view mapping, or settings persistence may leave the gesture state locked or the sheet impossible to close.

## Verification Strategy

### Unit and component coverage

Durable tests cover:

- named pure decisions for clear vertical intent, a deliberate fast flick, and a slow short cancellation;
- physical next/previous mapping;
- boundary resistance and cancellation;
- state-machine cleanup after cancel, lost capture, and interruption;
- reading-view callback and accessible action label;
- effective Single behavior for stored `auto` and legacy `fit-width` normalization;
- Settings absence of Reader mode controls;
- active-mode-only settings content;
- persistence callbacks for Single/Scroll, Fit width, Verse controls, continuity, and appearance;
- adaptive Sheet modal behavior at the owned component boundary where browser layout is not required.

Tests assert accessible roles, names, callbacks, state, persisted values, and routes. They do not assert exported gesture constants, icon internals, CSS class strings, DOM placement, physical geometry in jsdom, or styling-only data attributes. Actual travel distances, timing, pointer capture, scrolling, and viewport behavior belong only in Playwright.

### Real-browser Mushaf coverage

Playwright coverage uses real browser outcomes and a touch-capable context for gesture cases. The suite proves:

- Single + Fit width can reach the bottom of a page in portrait and short landscape without changing routes;
- the same layout remains reachable at phone, tablet, and desktop-sized viewports;
- wheel/trackpad-style vertical input reaches the complete page on desktop;
- right swipe previews and commits the higher page; left swipe previews and commits the lower page;
- a short fast flick completes while a short slow drag cancels;
- diagonal vertical intent scrolls without navigating;
- rapid consecutive swipes advance one page per settled gesture without stale content or lost input;
- page 1 and the final page resist and settle without blank destinations;
- focusable Next/Previous Mushaf page actions navigate and expose correct disabled boundaries without covering the stage;
- completed navigation starts the incoming Single page at the top;
- `pointercancel`, lost capture, overlay opening, resize, and orientation changes restore an idle usable reader;
- Scroll mode handles sustained vertical momentum, advances the dominant-page hash, and shifts its page window without a visible jump;
- repeated Scroll-mode dominant-page changes preserve protected route intent and do not make browser Back replay every scrolled page;
- Fit page and Fit width both work in Single and Scroll modes;
- rotation into and out of compact landscape preserves its Fit-width default/session opt-out contract in Single and Scroll modes;
- reduced-motion mode commits the same route outcomes without travel animation.

Browser-only assertions may use stable test hooks to initiate CDP touch input or identify page cells, but primary assertions must be visible scroll reachability, rendered page identity, and route behavior.

### Real-browser Settings coverage

The Settings suite proves:

- the reader topbar is the only reading-view toggle;
- Settings title and controls match the active reader mode;
- inactive-mode controls are absent;
- Search/About/direct Settings derive the preserved last reader mode without rendering their own view toggle;
- direct `#/assets` opens the asset disclosure expanded and direct-route close follows the defined focus fallback;
- all groups are reachable by natural sheet scrolling on small portrait and short landscape screens;
- tablet and desktop use the intended side-sheet presentation;
- focus is trapped, Escape closes, and focus returns to the opener;
- touch targets meet minimum size in browser layout;
- Appearance remains usable in light, sepia, dark, automatic, and night combinations;
- Included reading assets expands/collapses and inert rows do not imply navigation.

### Visual and repository verification

- Update Settings and reading-toggle stories.
- Commit a rendered reference image and adjacent current-state intent note under `docs/ui-references/configure/settings-shell/`, then name the active reference in the style map.
- Commit a rendered reference image and adjacent intent note under `docs/ui-references/read/reading-view-toggle/` for the new glyph/action treatment.
- Inspect Mushaf and Settings in the in-app browser across the responsive/theme matrix.
- Run focused unit and E2E specs first.
- Run `pnpm run check` for the static gate.
- Run `pnpm run validate` because reader routing, shared settings, and browser behavior are release-sensitive.
- Run documentation checks and `git diff --check` after context updates.

## Documentation And Registry Updates

The implementation updates current-state documentation for:

- Read: the four-mode Mushaf matrix, physical swipe direction, page reset, and continuous route behavior.
- Configure: active-mode-only Settings, adaptive sheet behavior, and the single topbar reading-view action.
- Navigate/About: no reading-view action outside actual reader routes.
- Data model: independent `mushafViewMode` and `mushafFitWidth` preferences.
- Style map and implemented surface summary: Settings grouping, semantic tokens, reference artifact, and owned component variants.
- Architecture: controlled Sheet ownership, return-focus routing, explicit overlay-to-reader interaction suspension, and replace-style continuous route synchronization.

If documentation contains generated fences, the repository docs command regenerates them; generated regions are never edited manually.

## Acceptance Criteria

- [ ] Every Single + Fit width page can be scrolled from top to bottom with touch, wheel, trackpad-style input, and keyboard where supported.
- [ ] Fit page and Fit width both work in Single and Scroll navigation modes across the responsive matrix.
- [ ] Vertical intent never accidentally changes a Single-mode page.
- [ ] Horizontal swipes follow the finger, preview the correct adjacent page, and use both distance and velocity.
- [ ] Successful, cancelled, interrupted, boundary, and rapid repeated gestures always return to a coherent idle state.
- [ ] Rightward navigation advances exactly one page and leftward navigation returns exactly one page.
- [ ] Newly navigated Single pages start at the top; resize of the same page does not reset needlessly.
- [ ] Scroll mode updates the dominant-page route without cooldown losses or visible anchor jumps.
- [ ] Scroll-mode route synchronization preserves protected intent and does not create one browser-history entry per visible page.
- [ ] Adjacent loading is retained and bounded; failures do not blank the current page.
- [ ] The only reading-view action is the clearer icon-only action in actual reader topbars.
- [ ] Settings contains no reading-view control and mounts only active-mode controls plus shared groups.
- [ ] Settings uses the owned adaptive Sheet with natural scrolling, focus containment, focus restoration, safe areas, and usable touch targets.
- [ ] Appearance is part of the normal Settings flow and Included reading assets is a truthful disclosure.
- [ ] Settings and Mushaf styling use centralized primitives and semantic tokens in all themes, with stale overlapping selectors removed.
- [ ] Registry, stories, reference artifact, context docs, unit tests, and real-browser tests describe and prove the new contract.
- [ ] Focused verification, `pnpm run check`, `pnpm run validate`, documentation checks, and whitespace checks pass.

## Resolved Decisions

- Technical approach: dedicated gesture state machine and adaptive owned Sheet.
- Reading-view control: one improved icon-only action in reader chrome.
- Settings layout: grouped, naturally scrolling adaptive sheet.
- Physical Mushaf direction: swipe right advances to the higher page number.
- Styling constraint: app design tokens are mandatory; shared tokens may be improved, but sporadic CSS rules are not permitted.
- Compatibility constraint: both horizontal Single navigation and vertical Scroll navigation must remain fully functional.

No product decision remains open for implementation planning.
