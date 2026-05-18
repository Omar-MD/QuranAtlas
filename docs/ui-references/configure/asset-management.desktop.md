Component: Asset Management page
State and viewport: Desktop route at `#/assets`, width at or above the AmbientDock breakpoint.

Accepted visual traits: AmbientDock remains Reader First and replaces the removed Search/Command entry with a Settings/More path. Main content is dense and operational: left-side variant summary/navigation, right-side grouped asset tables with status, compatibility, size, actions, and route-level status live region. Rows are calm, scan-friendly, and use bronze only for active or primary actions.

Forbidden traits: no desktop Search rail entry, no retired command hints, no Install action for Shipped rows, no app-version/update-required compatibility copy, no marketing hero, no decorative calligraphy, no purple gradients, no nested card stack, and no excessive empty dashboard whitespace.

Token expectations: use existing `--qa-*` app, raised, border, accent, focus, danger/error, and touch-size tokens. Any new state roles should be semantic aliases, not hardcoded colors in surface CSS.

Responsive differences: desktop uses a two-pane/table composition. Tablet may keep the mobile route structure but increase row density; do not introduce a third tablet-only navigation model unless browser proof shows the single-column route fails.

Non-goals: this assembly reference does not finalize route chrome internals, table column widths, or permanent copy for disabled reasons. `asset-table-states.desktop` and `asset-status-live-region.mobile` are authoritative for row states and live status behavior.
