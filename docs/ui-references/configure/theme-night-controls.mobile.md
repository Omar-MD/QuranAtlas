Component: Shared Theme and Night controls
State and viewport: Mobile-width footer/control module reused by Verse Settings and Mushaf Settings.

Accepted visual traits: Theme and Night Mode controls are identical across Verse and Mushaf. The approved image may show the two modes side by side to prove parity, but implementation uses one reusable control grammar. Theme exposes Light, Sepia, Dark, and Auto swatches with a visible selected state. Night Mode exposes Off, On, and Auto as a compact segmented control. Current state is not communicated by color alone.

Forbidden traits: no mode-specific variants, no extra theme choices, no hidden Night control, no decorative icon clutter, no purple gradient swatches, and no separate Verse-only or Mushaf-only footer behavior.

Token expectations: use semantic tokens for swatch borders, selected bronze state, focus rings, text, and minimum touch targets. Swatches may preview theme palettes but implementation must still resolve app colors through tokens.

Responsive differences: mobile uses this compact footer module. Tablet and desktop reuse the same control grammar even if the container width changes.

Non-goals: this reference does not define separate Verse/Mushaf implementations, the global theme persistence API, or final icon set.
