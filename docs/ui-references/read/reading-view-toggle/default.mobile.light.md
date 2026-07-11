## Component

ReadingViewToggle as consumed by ReaderChrome.

## State and viewport

Verse reader destination action at mobile width in the light theme. The visible open-book glyph and accessible action both mean `Switch to Mushaf view`.

## Accepted visual traits

- One compact circular IconButton occupies the reader topbar.
- The code-native open-book glyph communicates the Mushaf destination without selected-state decoration.
- The semantic surface, border, tooltip, focus treatment, and 44px target match the other owned reader actions.
- The action remains visually balanced and high-contrast without competing with reading content.

## Forbidden traits

- Duplicate reading-view actions in ReaderChrome, navigation, Search, About, or Settings.
- Selection dots, asymmetric mode colors, `aria-pressed`, or copy that describes the current mode instead of the destination.
- Transparent or unlabelled hit areas, mirrored glyphs, or a hamburger/navigation glyph.

## Token expectations

Use the owned IconButton and Tooltip primitives with semantic reader surface, border, text, accent, focus-ring, radius, motion, and control touch-target tokens. Keep the glyph code-native and color-inheriting.

## Responsive differences

The same single destination action remains in ReaderChrome across reader viewports. Spacing may follow topbar density, but the target stays at least 44px and the action is absent from non-reader routes.

## Non-goals

This reference does not define a reader-mode selector, the Mushaf-to-Verse glyph state, Mushaf page controls, tooltip placement, or the rest of the topbar composition.
