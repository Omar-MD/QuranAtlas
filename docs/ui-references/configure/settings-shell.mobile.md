Component: Shared Settings shell
State and viewport: Mobile portrait full-screen shell used by Verse Settings and Mushaf Settings.

Accepted visual traits: the shell fills the mobile viewport, respects safe-area insets, keeps a compact header, reserves a clear scroll body, and provides a stable lower area for shared Theme/Night controls. Header actions are plain and functional, not decorative.

Forbidden traits: no partial-height modal, no centered desktop modal treatment on mobile, no search or command affordance, no oversized hero header, no decorative icon cluster, and no nested card stack.

Token expectations: use QuranAtlas semantic tokens for app/sheet surfaces, ink text, bronze actions, borders, focus ring, z-index, and touch target sizing.

Responsive differences: mobile is full-screen. Tablet may remain full-height or become bounded only after browser proof. Desktop uses the right-sidebar reference instead of this shell.

Non-goals: this reference does not define the exact mode title copy, row content, preview content, picker behavior, or any reset behavior.
