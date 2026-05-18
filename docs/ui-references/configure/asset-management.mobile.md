Component: Asset Management page
State and viewport: Mobile portrait route at `#/assets`.

Accepted visual traits: compact route header with reader-return action, an active variant summary strip, route-level status live region, and grouped asset rows for Quran Text Styles, Mushaf Editions, Translations, and Tafsir. Rows use ledger density, status chips, concise disabled reasons, progress bars, and one primary action per row. Secondary/destructive actions live in the row overflow menu with visible disabled reasons when unavailable.

Forbidden traits: no marketing hero, no search fast-navigation command surface, no settings gear in the route header unless separately designed, no stacked card-in-card layout, no purple gradients, no blob decoration, no app-version/update-required compatibility copy, and no oversized explanatory copy.

Token expectations: use QuranAtlas semantic tokens for parchment background, raised row surfaces, bronze active/action states, muted ink metadata, warning/error surfaces, focus rings, and 44px touch target sizing. Generated status colors are directional only and must map to tokenized state roles.

Responsive differences: mobile is a single scroll column with sticky compact header and section headers. Tablet may widen rows and expose more metadata inline while keeping one column. Desktop gets a two-pane/table layout in the paired desktop reference.

Non-goals: this assembly reference does not prescribe final asset labels, byte values, exact provider copy, actual install progress numbers, or complete state behavior. `asset-row-states.mobile` and `asset-status-live-region.mobile` are authoritative for row states and live status behavior.
