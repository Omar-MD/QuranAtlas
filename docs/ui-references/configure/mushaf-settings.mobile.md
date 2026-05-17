Component: Mushaf Settings panel
State and viewport: Mobile portrait, full-screen settings surface opened from the reader gear while Mushaf mode is active.

Accepted visual traits: the whole mobile viewport is used, with safe-area-aware header, live Mushaf preview first, and compact ledger rows below. The preview must represent Mushaf mode without Verse typography controls. Row density, section headers, status chips, spacing, and footer controls match the Verse Settings reference. Theme and Night controls use the same placement, shape, and state language as Verse Settings. Icons are minimal and functional, never decorative clutter.

Forbidden traits: no partial-height mobile modal, no framed/shadowed Mushaf page card, no duplicated Mushaf view-mode segmented control, no extra icon cluster, no Verse-only controls, no search affordance, no decorative calligraphy, no purple gradients, no generic nested cards.

Token expectations: use QuranAtlas semantic tokens for app/sheet surfaces, Mushaf ink/ground, bronze accents, borders, disabled text, and focus ring. Keep page preview tied to real Mushaf rendering tokens rather than mock colors.

Responsive differences: mobile uses a true full-screen sheet/page. Tablet may keep the full-height sheet pattern or use a bounded dialog only if browser proof shows it remains reader-adjacent and preserves the same hierarchy. Desktop uses the right-side sidebar/drawer defined by `settings-sidebar.desktop`.

Non-goals: this assembly reference does not define exact Mushaf SVG output, page navigation controls, row order, row labels, or install-state behavior inside asset pickers. Component references and the UI plan override generated-art drift in this image.
