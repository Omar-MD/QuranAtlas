Component: Verse Settings panel
State and viewport: Mobile portrait, full-screen settings surface opened from the reader gear while Verse mode is active.

Accepted visual traits: the whole mobile viewport is used, with safe-area-aware header, live Verse preview first, and compact ledger rows below. The preview must visibly reflect Verse-mode changes: Arabic typography, reading flow, active riwayah/text style, translation visibility, and theme. Row density, section headers, status chips, spacing, and footer controls match the Mushaf Settings reference. Theme and Night controls use the same placement, shape, and state language as Mushaf Settings.

Forbidden traits: no partial-height mobile modal, no all-purpose Settings inventory, no search or quick-jump promise, no one-off Verse-only theme control, no purple gradients, no floating blob decoration, no fake decorative calligraphy, no nested generic card stack, and no marketing header.

Token expectations: use QuranAtlas semantic tokens for parchment surfaces, ink text, bronze accent/borders, focus ring, touch size, and sheet elevation. Generated reference colors are directional only; implementation must resolve through `--qa-*` tokens and existing settings/reader typography conventions.

Responsive differences: mobile uses a true full-screen sheet/page. Tablet may keep the full-height sheet pattern or use a bounded dialog only if browser proof shows it remains reader-adjacent and preserves the same hierarchy. Desktop uses the right-side sidebar/drawer defined by `settings-sidebar.desktop`.

Non-goals: this assembly reference does not define exact row labels, Quran text rendering, picker internals, install logic, or final icon artwork. Component references override generated-art drift in this image; `verse-settings-rows.mobile` is authoritative for row labels and inventory.
