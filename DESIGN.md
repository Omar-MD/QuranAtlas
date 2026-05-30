# QuranAtlas Design

QuranAtlas is a Reader First product. The interface should feel calm, dense, and durable: a focused Quran reading surface with enough operational clarity for navigation, settings, bookmarks, Daily Wird, and offline asset state.

## Visual Direction

- Use a parchment, bronze, and ink material language through semantic tokens, not raw palette classes.
- Keep reading content primary. Quran text and Mushaf pages are never decorative previews or framed marketing visuals.
- Prefer quiet, scan-friendly product density over hero composition, nested cards, or large ornamental panels.
- Use restrained motion for state changes, drawer entry, progress, and focus feedback. Respect reduced-motion preferences.
- Keep theme parity across light, sepia, dark, and night modes.

## Layout Rules

- One component pass should name one active rendered state or committed reference source.
- Layout ownership belongs to the surface component and `src/design-system/index.css`; feature components should not introduce competing global styles.
- Use stable dimensions for route chrome, drawers, sheets, icon buttons, segmented controls, and reader rows so state changes do not shift the page.
- Protect mobile, tablet, and desktop viewports explicitly. Tablet behavior is not implied by phone and desktop checks.
- Avoid horizontal overflow, hidden text, clipped controls, and overlapping sticky or fixed chrome.

## Component Rules

- Feature components compose approved primitives from `src/components/ui`.
- Direct Radix imports stay inside `src/components/ui`.
- Register approved composition components in `src/design-system/registry/component-registry.json`.
- Use `qar:` utilities and `--qa-react-*` semantic tokens. Primitive `--qar-*` tokens stay private to token files.
- Keep removed or future product scope visibly inactive in shipped routes.

## Accessibility

- Keep browser zoom enabled.
- Preserve visible focus states, semantic landmarks, labelled icon buttons, and keyboard-dismiss behavior for overlays.
- Do not rely on color alone for current, success, warning, or destructive states.
