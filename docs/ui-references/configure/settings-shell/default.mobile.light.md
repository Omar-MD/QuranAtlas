## Component

SettingsShell assembly for Verse reader settings.

## State and viewport

Default mobile state at 375 × 812 in the light theme with night mode off. The body is at its initial scroll position and Included reading assets continues below the viewport.

## Accepted visual traits

- The title and close action remain topmost above reader chrome.
- Verse reading, Reading continuity, Appearance, and Included reading assets form one ordered grouped hierarchy.
- Opaque group surfaces, strong text contrast, clear boundaries, and compact control rows keep the dense settings legible.
- The single scrolling body preserves the fixed shell header and reaches every group.

## Forbidden traits

- Duplicate reader-mode or reading-view toggles inside Settings.
- Transparent group overlays, reader chrome painted above the shell, or clipped content without a valid scroll range.
- Source-management, install, delete, or active-pack controls in Included reading assets.
- A fixed appearance footer or separate nested settings scroller.

## Token expectations

Use the owned `--qa-react-settings-*` surface, group, divider, muted-text, spacing, shadow, and backdrop semantics with shared control touch-target, focus, radius, text, and accent tokens.

## Responsive differences

Mobile and short landscape fill the viewport. Tablet and desktop use the same grouped architecture as a right-side rail no wider than 448px; only available height and scrolling change.

## Non-goals

This reference does not lock Mushaf-specific controls, dark/sepia/night colors, exact copy wrapping, or the scrolled Included reading assets rows.
