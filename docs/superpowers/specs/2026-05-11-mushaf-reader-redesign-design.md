# Mushaf Reader Redesign Design

## Summary

Redesign Mushaf mode so it behaves like a real page-image reader instead of a small framed preview.

The chosen direction is a full-viewport, theme-aware Mushaf surface with edge-swipe navigation. The page must use the real quran.ws-derived SVG geometry, preserve sharp vector rendering, and expand to the maximum usable space in the current viewport. Navigation chrome should be almost invisible until needed: transparent edge zones, subtle directional hints, and a tappable page-number chip that opens numeric page jump.

This redesign also fixes riwayah asset handling. Qaloon remains the default baseline. Hafs and Warsh are optional installable riwayah packages. A user can install either package from the app and then switch to it without breaking Verse mode or Mushaf mode.

## Problems To Solve

- Mushaf page rendering is too small. Current CSS caps the page at 760 px and reserves too much vertical space for controls, leaving large unused regions on mobile and desktop.
- The page sits inside a visible sheet/card treatment with background, border radius, and shadow. That makes Mushaf mode feel like a preview instead of the primary reader.
- The current bottom controls are too large and visually heavy for a reading surface.
- Page progression does not communicate the original Mushaf direction clearly. Reading should advance right-to-left: page 1 begins at the right side of the book, and later pages move leftward through the Mushaf.
- Light, sepia, and dark modes cannot share an unchanged black-on-light SVG treatment. Mushaf ink, ornament, and ground treatment must be theme-aware in every app theme while remaining sharp.
- Riwayah switching is unreliable when optional Hafs or Warsh text/page packs are absent. The app must expose install state, prevent broken switches, and allow users to install optional riwayat.

## Chosen Direction

### Visual Direction

Use the "recolored ink with night-paper softness" direction:

- The Mushaf page is no longer a card.
- The page fills the available reader viewport, constrained only by the page aspect ratio, safe areas, and the mobile header or desktop rail.
- The rendered page keeps crisp quran.ws vector paths. Do not rasterize, blur, screenshot, or use image-generated Mushaf text.
- Theme styling recolors the SVG ink, separators, ornaments, and page-background layer through QuranAtlas tokens in light, sepia, and dark themes.
- Dark mode uses light ink over the app reading surface with a subtle night-paper warmth, not a flat CSS inversion.
- Sepia mode is a first-class Mushaf theme, not a light-theme fallback. It should use warm sepia paper/ground, darker warm ink, and compatible ornament tones while preserving the same SVG geometry and sharpness.
- Light mode keeps a clean warm paper/ink relationship while using the same geometry and layout.

### Navigation Direction

Use "Edge Swipe" navigation:

- Swiping left, from right to left, performs `towardEnd(+1)`.
- Swiping right performs `towardStart(-1)`.
- Tapping the left edge performs `towardEnd(+1)`.
- Tapping the right edge performs `towardStart(-1)`.
- Page 1 disables `towardStart(-1)` on the right edge.
- The final page disables `towardEnd(+1)` on the left edge.
- Directional chevrons may appear on hover, focus, initial page load, or after a tap, but they do not reserve layout space.
- Code and tests should name physical actions `towardEnd` and `towardStart`, not previous/next UI order, because UI placement is RTL Mushaf-specific.

### Page Number Jump

The page-number chip is the only persistent visible control.

- It sits in the bottom safe area as a compact overlay, for example `42 / 604`.
- It does not create a full-width toolbar and does not reduce the page's layout height.
- It must avoid colliding with the rendered page content. If the fitted page reaches the chip's default bottom position, move the chip into the nearest safe overlay slot outside the page box or reserve only overlay padding for the chip, never a persistent layout row.
- Tapping or keyboard-activating the chip opens a compact numeric jump control.
- The jump control uses numeric input, clamps to `1..pageCount`, commits on Enter or Go, and closes on Escape or outside tap.
- While the jump control is open, edge tap zones and swipe navigation are temporarily suppressed so accidental page turns do not occur during input.

## Approaches Considered

### A. CSS Filter / Invert Existing SVG Image

This is the fastest path because the page can remain an `<img>`.

Rejected as the primary strategy. It does not provide reliable theme control, can distort decoration and anti-aliasing, and still treats the SVG as an opaque image that cannot participate in QuranAtlas tokens.

### B. Themeable Inline SVG Rendering

Fetch the same-origin SVG, validate it as a generated trusted dataset artifact, and render it as themeable SVG markup whose fills/strokes use CSS variables.

Chosen. It preserves vector sharpness, enables real theme-aware ink, avoids generating multiple page copies per theme, and lets Mushaf mode remain a first-class QuranAtlas surface.

### C. Per-Theme Generated Page Assets

Build separate light, sepia, and dark SVG packs.

Rejected for now. It increases page-pack size and cache complexity across 604 pages per riwayah. It also multiplies Hafs/Warsh optional install size.

## Layout Requirements

Mushaf mode owns the whole reader viewport.

- `#main-content:has(.qa-mushaf-reader)` should remove the Verse-mode reading column cap and avoid the normal bottom padding budget used by scrolling Verse content.
- The page sizing algorithm should use the available viewport rectangle:
  - source viewport: `window.visualViewport` dimensions when available, falling back to layout viewport dimensions
  - mobile: visual viewport minus mobile header, safe-area insets, and a small edge breathing margin
  - tablet/desktop: visual viewport minus desktop rail, safe-area insets, and a small edge breathing margin
- The page chooses the largest size that fits both available width and available height while preserving the actual SVG/viewBox aspect ratio.
- The aspect ratio comes from the inline SVG `viewBox`, not a hard-coded paper ratio.
- The current fixed `760px` width cap and `100dvh - 220px` height cap must be removed; there must be no replacement fixed max-width/max-height cap in the ready state.
- Controls are overlays, not grid rows that consume page height.
- Error, install, and loading states may use bounded panels, but the normal ready state must not show a card frame, sheet shadow, or bulky footer.
- The page remains centered within the available viewport, but centering cannot shrink it below the maximum fitted size.
- Acceptance at `390x844`: with ordinary mobile browser chrome collapsed, the SVG bounding box should be within 2 px of the computed largest fitted rectangle after safe-area/header/breathing budgets. It must use the bottom area formerly reserved for the footer row.
- Acceptance at `1440x1000`: the SVG bounding box should be within 2 px of the computed largest fitted rectangle after rail/safe-area/breathing budgets, and its width must exceed the old `760px` cap whenever the viewBox aspect ratio and height budget allow it.
- Pixel tolerances apply to the fitted box. The displayed width may legitimately be height-limited when the source `viewBox` is tall relative to the viewport.

## Theme-Aware SVG Rendering

The theme-aware renderer must keep text sharp and must support light, sepia, and dark as first-class render states.

- Runtime renders real SVG paths from `/dataset/mushaf-pages/{riwayah}/pages/{NNN}.svg`.
- Build-time sanitization remains the integrity gate for source SVG content.
- The Mushaf page build step must convert eligible fills/strokes to semantic tokens or CSS-custom-property values for ground, ink, ornament, and accent.
- Theme tokens should distinguish at least:
  - Mushaf ink
  - secondary ornament/border ink
  - page ground or transparent ground
  - active navigation accent
- The transform must preserve source geometry: `viewBox`, path data, element ordering relevant to paint, `fill-rule`, `clip-path`, and opacity. It may rewrite color-bearing attributes only after classification.
- The transform must reject unclassified colors, remote references, script/event attributes, and geometry-changing mutations instead of silently emitting unsafe or visually wrong output.
- Each app theme must provide explicit Mushaf token values. Sepia may not inherit light-theme ink/ground values if that creates a black-on-light page that visually ignores the sepia surface.
- The renderer must not use bitmap canvas extraction, CSS blur, low-resolution previews, or generated placeholder text.
- The `<img>` path may remain as a fallback for unsupported inline rendering states, but fallback cannot be the primary path for dark or sepia mode.
- Theme changes while Mushaf mode is mounted should update ink colors without refetching the page when possible.

Inline SVG accessibility requirements:

- The rendered page is exposed as one labeled image with the current riwayah and page number.
- Decorative internal paths, ornaments, and groups are hidden from the accessibility tree.
- Edge controls and the page chip are keyboard focusable, have visible focus states in all themes, and keep at least a 44 px touch target on coarse pointers.
- Internal SVG paths must not become individually focusable or announced.

## Navigation Behavior

`MushafControls.svelte` should be replaced or redesigned into a minimal overlay control layer.

Expected controls:

- left edge zone: `towardEnd(+1)`
- right edge zone: `towardStart(-1)`
- page chip: opens numeric jump
- optional tiny progress indicator integrated into the page chip or shown only while interacting
- no permanent scrubber occupying a footer row

Gesture behavior:

- Horizontal swipe must use a clear threshold and velocity/distance guard so vertical page movement or browser gestures do not accidentally turn pages.
- Swipe should be available on touch devices and pointer-drag-capable desktop devices.
- Keyboard parity:
  - ArrowLeft performs `towardEnd(+1)`
  - ArrowRight performs `towardStart(-1)`
  - Home opens page 1
  - End opens the final page
  - Enter on the page chip opens jump input
- Direction follows physical Mushaf progression, not LTR browser default semantics.

Animation:

- Page turns may slide in the physical direction: advancing moves content leftward.
- Motion must be disabled or simplified under `prefers-reduced-motion`.
- Animation cannot blur the SVG text at rest.
- Inline SVG page mount, theme changes, and page-turn animations must stay inside the existing reader performance budget: no long task above 50 ms during ordinary page turns on target devices, no layout thrash loops, and animation must remain transform/opacity-driven after the SVG is mounted.

## Phase Plan

Phase 1 delivers the Qaloon reader redesign:

- full-viewport layout sizing and overlay navigation
- themeable inline SVG rendering for Qaloon
- physical `towardEnd`/`towardStart` navigation naming and tests

Phase 2 delivers optional package discovery and gating:

- same-origin package index with installable/unavailable state
- settings gating that prevents unusable riwayah persistence
- install prompts for missing optional packages without adding Hafs/Warsh flows yet

Phase 3 delivers Hafs and Warsh install/remove flows:

- package install, progress, failure, retry, remove, and byte planning
- successful switch after install
- preservation of the previous active riwayah after partial or failed installs

## Riwayah Package Model

Qaloon remains the baseline riwayah and ships as the default usable package.

Hafs and Warsh are optional installable packages:

- A riwayah package is usable only after both its text corpus and Mushaf page pack have been installed or otherwise verified as locally cacheable from the same-origin package index.
- Settings must expose package state for each riwayah:
  - installed
  - installable with byte estimate
  - installing with progress
  - unavailable in the current build/deployment
  - error after a failed install or verification attempt, with retry available
- Selecting an installed riwayah switches immediately.
- Selecting an installable but uninstalled riwayah opens an install flow. Pending install state is tracked separately from `settings.riwayah`. After successful install, the app can switch to that riwayah.
- Selecting an unavailable riwayah shows a disabled/unavailable state instead of writing a broken setting.
- If stale settings or a deep link put the app on a missing riwayah, Verse and Mushaf surfaces show an install prompt and do not silently fall back to Qaloon content under a Hafs/Warsh UI state.

The asset index should become a clear source of truth for optional riwayah packages. Optional Hafs/Warsh text and page artifacts must be published as same-origin optional assets without being included in the baseline automatic offline manifest. The app should be able to plan bytes, cache the package, remove the package, and verify install state using the same route/cache definitions used by the service worker.

## Data And Cache Requirements

- Runtime must never fetch quran.ws.
- Qaloon page/text assets remain same-origin baseline assets.
- Hafs and Warsh optional package assets must be discoverable from a same-origin package index.
- Page caches remain per-riwayah, for example `qa-pages-hafs-v1`.
- Text cache membership for optional riwayat must be planned from the optional package index, not guessed from current UI state.
- `settings.riwayah` remains the active riwayah source of truth, and its writer must persist only usable installed riwayah choices. Pending installs, install errors, and desired-but-unusable package choices live in separate package-install state.
- The install flow must pre-flight storage quota before starting large page downloads.
- Failed or interrupted installs leave the previous active riwayah intact.

## Errors And Loading

Ready state:

- full-viewport page
- no card, no large toolbar
- minimal overlay controls

Loading state:

- page-sized skeleton fitted with the same sizing algorithm as the final page
- no Verse-stream skeleton

Install state:

- compact prompt explaining the missing riwayah package
- actions to install package, stay on current riwayah, or open Settings

Asset error:

- retry action
- open Verse mode action when a usable text corpus exists
- no silent fallback to another riwayah's Mushaf page

Jump input errors:

- invalid input clamps or shows a small inline correction
- page route canonicalizes through `router.navigate(pageHref(clamped), { replace: true })`

## Surface Updates

Implementation must update:

- `docs/context/surfaces/read.md` for Mushaf layout, navigation, theme behavior, and invariants.
- `docs/context/surfaces/navigate.md` if drawer or mode switching changes.
- `docs/context/surfaces/configure.md` for riwayah install/switch behavior in Settings.
- `docs/context/surfaces/infra.md` for optional package cache and service-worker behavior.
- `docs/context/architecture.md` if route, boot, or package-availability ownership changes.
- `docs/context/data-model.md` if settings shape, package index shape, or sole-writer rules change.
- `docs/context/source-data-flow.md` for themeable SVG build output and optional package artifacts.
- `docs/tech-stack.md` if build, CI, Poppler, or release packaging commands change.

Generated context fences must be updated with the repo docs command, not hand-edited.

## Testing

Unit tests:

- page direction helper: swipe/tap/keyboard direction maps to page deltas using physical Mushaf semantics
- page jump chip: opens input, validates/clamps, commits, cancels
- page sizing helper if extracted from component logic
- themeable SVG transformation preserves geometry and rejects unsafe content
- riwayah package availability and install gating
- settings writer does not persist unusable riwayah choices
- optional package byte planning and cache naming

Component tests:

- Mushaf ready state has no bulky footer controls
- page chip opens numeric input
- edge zones navigate in RTL direction
- theme change updates inline SVG classes/tokens
- missing optional riwayah shows install prompt without fallback

E2E tests:

- mobile Mushaf page fills the available viewport, including the bottom space formerly reserved for controls, with a bounding-box assertion at `390x844`
- desktop Mushaf page is not capped at 760 px and uses available width/height, with a bounding-box assertion at `1440x1000`
- ready state has no `760px` cap, no `100dvh - 220px` fitted-height behavior, no card shadow/sheet frame, and no footer row occupying layout space
- swipe left advances and swipe right returns
- left-edge tap advances; right-edge tap returns
- page chip jump routes to the requested page
- page chip avoids collision with the fitted SVG page box at mobile and desktop sizes
- dark mode renders light theme-aware Mushaf ink with sharp SVG text
- sepia mode renders warm theme-aware Mushaf ink and ground treatment with sharp SVG text
- installable Hafs/Warsh path allows package install and then riwayah switch
- unavailable optional package cannot break the active reader
- partial or failed install keeps the previous `settings.riwayah` and exposes retry/error state without switching

Visual verification:

- capture mobile and desktop screenshots before and after layout changes
- confirm the page occupies the largest fitted rectangle
- confirm text is sharp at rest
- confirm controls are minimal and do not occlude critical page content
- capture light, sepia, and dark screenshots and run pixel checks that confirm each theme uses distinct Mushaf token output rather than CSS inversion or black-on-light fallback

SVG transform tests:

- source and transformed output have the same `viewBox` and path count
- path data, `fill-rule`, `clip-path`, and opacity are preserved
- known source colors classify into ground, ink, ornament, or accent tokens
- unclassified colors, unsafe attributes, or remote references reject the transform
- emitted SVG uses theme tokens/CSS variables rather than hard-coded final theme colors

Accessibility tests:

- inline SVG exposes one labeled image for the page and hides decorative internals
- page chip is reachable in focus order, opens on Enter/Space, closes on Escape, and restores focus predictably
- edge controls are reachable, named for their action, and have visible focus states
- focus order does not enter internal SVG paths

## Non-Goals

- No tap-to-verse hit testing inside the Mushaf page.
- No translation, tafsir, or verse overlays inside the Mushaf page.
- No image-generated Mushaf text or raster screenshot replacement.
- No remote quran.ws runtime dependency.
- No permanent bottom toolbar or full-width page scrubber in the ready state.
- No silent fallback from Hafs or Warsh to Qaloon when assets are missing.
