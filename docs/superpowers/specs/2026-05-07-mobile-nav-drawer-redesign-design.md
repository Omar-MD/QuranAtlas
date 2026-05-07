# Mobile Nav Drawer Redesign Design

## Scope

Redesign the QuranAtlas mobile nav drawer as one `navigate` surface unit with the adjacent `read` surface hooks needed for the Daily Wird card. The redesign covers the drawer chrome, Read-mode Daily Wird summary, source controls, Surah/Juz/Bookmarks list rows, and the related loading, empty, and no-results states.

This spec is design-only. It does not authorize implementation until reviewed and approved.

## Product Direction

The drawer should feel like a compact QuranAtlas reading instrument: parchment surfaces, bronze/amber accent, ink text, quiet tactile elevation, restrained separators, and stable mobile ergonomics. It must not look like a generic SaaS sheet or marketing card stack.

The mobile drawer remains a functional navigation surface, not a landing page. The first screen should make the daily reading task visible, then expose list navigation without decorative filler.

Avoid:

- purple or blue gradients
- blobs, decorative ornaments, emojis, stars, sound/speaker icons, or decorative control icons
- heavy bordered-button styling
- nested cards inside cards
- labels that only work at one viewport width
- hidden behavior that depends on layout shifts

## Locked Choices

### Element 1: Header Chrome

Header chrome is locked to imagegen V2 Variant A.

Use:

- compact horizontal logo plus QuranAtlas wordmark
- refined About icon button in the product header area
- separate Close icon button
- compact product-themed header proportions
- restrained parchment/bronze treatment with subtle separators

Do not use:

- the later arrow-border V3 direction
- oversized header height
- decorative header symbols
- close/about controls that collapse into each other on narrow phones

The header must preserve stable touch targets at `320px` and `390px`. The wordmark may truncate before icon controls shrink. Close remains an independent control.

### Element 2: Daily Wird Card

Daily Wird is locked to Variant A.

Use:

- one tappable ledger card directly below the header chrome
- stable progress dimensions
- concise no-plan, active, complete, and loading states
- restrained tactile elevation
- row-like card density rather than a large marketing summary panel

The card must be fully responsive. Text may wrap only where intended and must not overflow at `320px` or `390px`. Progress bars, rings, or summary meters must keep stable dimensions between states.

The card opens the existing in-drawer Daily Wird detail flow. It should not replace source navigation or bookmarks, and it should not write progress from render alone.

### Element 3: Source Controls

Source controls are locked to Variant B from the revised hierarchy.

Use:

- `Surah`, `Juz`, and `Bookmarks` as peer list sources
- Surah-only search
- Surah-only `All | Recent`
- stable Juz and Bookmarks modes without disabled decorative controls
- product-themed segmented controls that are tactile but not heavy bordered buttons

Rules:

- `Surah`, `Juz`, and `Bookmarks` are peers.
- Bookmarks is not a top-level `Browse` equivalent. It is just another list source.
- Only Surah uses search and `All | Recent`.
- Remove the useless decorative control icon.
- Switching sources must not create a layout jump that changes row/control dimensions unexpectedly.

### Element 4: Surah, Juz, Bookmarks Rows And States

List rows and states are locked to Variant A.

Use the current app list structures as the base. Do not invent new row fields.

Surah row fields:

- surah number
- English name
- verse count
- Arabic name
- row tap/open chevron
- current-surah state

Juz row fields:

- `Juz {n}`
- start reference such as `2:142`
- starting surah English name
- Arabic surah name when available
- `Current` text marker
- `Wird` text marker
- row tap/open chevron

Bookmarks list:

- grouped by surah name
- count badge in the group header
- rows with verse reference such as `2:255`
- truncated Arabic snippet
- row tap/open chevron
- swipe-left reveal with text `Delete`

Bookmark empty copy remains exactly:

```text
Tap a verse number in the reader to bookmark it.
```

List state requirements:

- loading uses neutral skeleton rows and text, with no row chevrons
- Surah no-results state uses concise no-match copy
- Bookmarks empty state uses the exact copy above
- group headers must not gain fake expand/collapse arrows

Variant A means ledger rows with raised parchment surfaces, a thin bronze current spine, compact chevrons on tappable rows only, subtle separators, and stable row heights. At `320px`, Surah rows must still expose the Arabic name without overflow, using an intentional second line or compact layout rather than hiding required data.

## Theme Token Audit

Theme-token audit applies to the entire redesign, not only Element 4.

Before implementation, audit the approved designs against the current token system:

- `src/styles/tokens/primitives.css`
- `src/styles/tokens/semantic.css`
- existing `src/styles/surfaces/nav.css` usage
- current light, sepia, and dark theme overrides

If an approved visual role is missing, weak, or visually unsuitable in one theme, refine or add theme tokens instead of forcing the design through a poor existing token. Surface CSS must consume semantic `--qa-*` roles; primitives remain behind semantic tokens.

Audit these roles across all locked elements:

- drawer/header surfaces
- row surfaces
- Daily Wird card surface
- selected source control surface
- unselected source control surface
- current-surah/Juz spine
- current and Wird markers
- progress meter fill and track
- count badges
- row chevrons
- separators and hairlines
- loading skeletons
- empty and no-results panels
- swipe Delete danger surface and text
- focus rings
- shadows and tactile elevation
- primary, muted, dim, Arabic, and danger text hierarchy

Theme acceptance criteria:

- light, sepia, and dark all look intentionally designed
- dark is not a low-contrast inversion of the parchment design
- sepia preserves the parchment/ledger feel without muddying separators
- accent/current states are visible without becoming loud
- danger/Delete is clear but not visually dominant when hidden behind a swiped row
- skeletons are visible in all themes without looking like disabled controls
- no local hardcoded colors are copied from imagegen boards into surface CSS

## Responsive And Layout Requirements

The final drawer must be verified at `320px` and `390px` widths.

Requirements:

- no horizontal scrolling
- no text overflow outside row/control bounds
- no cramped labels in source controls
- no layout jumps when switching Surah, Juz, and Bookmarks
- stable row heights for normal, current, marked, loading, empty, and delete-reveal states
- stable control dimensions for source controls and Surah-only search/filter controls
- close, About, source tabs, rows, and delete actions remain comfortable touch targets
- Arabic names/snippets truncate or wrap intentionally
- Bookmarks swipe-left must not conflict with drawer swipe-close behavior

If `320px` and `390px` need slightly different row composition, both must preserve the same information architecture and the same visible state semantics.

## Behavior Requirements

The drawer keeps the existing opening and dismissal behavior:

- hamburger opens mobile drawer
- backdrop, close, Escape, and drawer swipe close where currently supported
- Bookmarks row swipe-left reveals Delete
- Bookmark row tap jumps to the verse and closes the drawer
- Surah row tap opens that surah
- Juz row tap navigates to the Juz start reference and closes the drawer

Source behavior:

- Surah source shows search and `All | Recent`
- Juz source hides Surah-only search/filter controls without leaving fake disabled ornament
- Bookmarks source shows the grouped bookmark list
- Current state follows the active reader position, with fallback to saved current position when the reader is not mounted
- Wird marker in Juz follows the active Daily Wird next reference

Daily Wird behavior:

- card appears in Read mode above the source controls
- card opens the existing Daily Wird detail subview
- card states must reflect no-plan, active, complete, and loading/metadata-fallback states
- card does not replace ordinary resume navigation
- card does not write Daily Wird progress from render

Study mode behavior is outside the redesign except that the header chrome remains consistent and Read-only elements remain hidden in Study mode.

## Accessibility Requirements

Use semantic controls:

- header wordmark/About as a button or link with clear accessible name
- Close as an icon button with accessible name
- source controls as a grouped tab/segmented-control pattern with selected state
- Surah, Juz, and Bookmark rows as tappable row controls
- Delete as a real button revealed by swipe

Required states:

- selected source exposed programmatically
- current Surah/Juz markers visible and available to assistive technology where useful
- loading states announced politely where they replace list content
- no-results and empty states readable without relying on icons
- focus states use the audited theme focus token
- reduced-motion mode must not depend on animation for state clarity

## Files Expected To Change Later

Implementation is expected to touch these files later:

- `src/navigate/NavDrawer.svelte`
- `src/navigate/JuzList.svelte`
- `src/navigate/bookmarks/BookmarksList.svelte`
- `src/styles/surfaces/nav.css`
- `src/styles/tokens/primitives.css` if primitive palette additions are justified by the theme audit
- `src/styles/tokens/semantic.css` for any new or refined semantic theme roles
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/read.md`

The implementation plan should preserve existing user work in the dirty tree and should not revert unrelated NavDrawer/Wird edits.

## Testing And Visual Verification

Verification must include both behavior and visual proof.

Token/theme checks:

- run the repo token/style gates selected by the existing validation workflow
- verify any new semantic token has light, sepia, and dark behavior
- confirm surface CSS does not consume primitive tokens directly

Responsive visual checks:

- mobile drawer at `320px` in light, sepia, and dark
- mobile drawer at `390px` in light, sepia, and dark
- header, Daily Wird card, source controls, Surah rows, Juz rows, Bookmarks rows, loading, empty, no-results, and delete reveal

Behavior checks:

- opening and closing drawer
- switching `Surah`, `Juz`, and `Bookmarks`
- Surah search and `All | Recent` staying Surah-only
- Surah row navigation
- Juz row navigation
- Bookmark row navigation
- Bookmark swipe Delete reveal
- Daily Wird card opens detail

Before completion, update the owning context dossiers and run the verification command required by QuranAtlas project instructions for the final implementation scope.
