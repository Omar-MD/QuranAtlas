# QuranAtlas Product Design Guide

This is the product style source of truth for QuranAtlas UI work. Read it before
UI redesign, refactor, iteration, visual review, component-reference work, or
image generation.

This guide defines product style and design intent. It does not override code,
semantic tokens, accessibility requirements, real Quran text rendering,
component behavior, responsive constraints, or committed component references in
`docs/ui-references/`.

`DESIGN.md` is product-style context only. It is never the active implementation
reference for a component pass.

## Product Posture

QuranAtlas is Reader First: a quiet, reliable Quran reading instrument for long
sessions, offline use, source-aware reading, and continuity across devices and
routes. The interface should feel calm, precise, durable, and reverent without
becoming decorative or ceremonial.

The product should feel more like a well-made reading tool than a content site.
Chrome supports the verse, Mushaf page, tafsir, navigation, settings, and asset
state. It should not compete with them.

## Design Principles

- Content is primary. Arabic text, Mushaf pages, translation, tafsir, and reader
  continuity are the main visual signals.
- Keep the UI dense but breathable. QuranAtlas should support repeated reading
  and scanning without feeling sparse, theatrical, or marketing-led.
- Make state visible. Installed, missing, active, loading, disabled, selected,
  unavailable, and error states should be understandable at a glance.
- Prefer restrained structure over decoration. Borders, surfaces, typography,
  spacing, and state color should carry hierarchy.
- Preserve trust. Avoid visual choices that imply sources, religious authority,
  generated text, or recitation behavior the app does not provide.
- Stay inside current product scope. Visuals must not introduce UI for
  audio/recitation, personal notes/tags/review except bookmarks,
  sharing/export/import, accounts or sync, AI chat/assistant/synthesis,
  multiple translations side by side, transliteration display, word-by-word
  translation, tajweed coloring, or qira'at beyond Hafs, Qalun, and Warsh.

## Reference Discipline

Each UI pass must name exactly one active reference source:

- One committed `docs/ui-references/` image plus its adjacent intent note.
- One accepted current UI state for narrow, non-directional fixes.

This guide, nearby components, screenshots, and exploratory generated images are
supporting constraints only. Do not average them into a blended target.

When a component reference conflicts with this guide, resolve in this order:
code behavior and accessibility, semantic tokens, committed component
reference, then product-style guidance. Update the reference or guide in the
same change when the conflict reveals stale design intent.

## Surface Postures

- **Read:** unframed, text-first, minimal chrome. Quran text, translation,
  tafsir, Mushaf page, and reading continuity dominate. Do not place decorative
  wrappers around Quran or Mushaf content.
- **Navigate:** fast movement through Surah, Juz, bookmarks, and reader mode.
  Use dense rows, current-position clarity, and direct continuation actions.
- **Configure:** operational settings and asset management. Favor ledger rows,
  tables, grouped controls, visible install/active/error states, and clear
  source-state comparison.
- **Onboard:** compact setup flow for first reading choices. It may explain
  setup choices, storage, source packs, and first reading path, but it is not a
  marketing hero or feature tour.
- **Infra overlays:** terse recovery and status UI. Preserve trust, explain the
  next safe action, and never compete with reading.

## Visual Language

The core material language is parchment, bronze, and ink:

- Parchment: warm app grounds and raised reading surfaces.
- Bronze: selected states, active rails, action emphasis, and focus.
- Ink: primary text, dark theme ground, and quiet separators.
- Soft danger and warning states should remain legible and product-like, not
  alarming unless the action is destructive.

Use semantic `--qa-*` tokens for design decisions. Surface CSS should not
consume primitive tokens directly, hardcode palette values, or introduce
one-off radii and motion values when a semantic token exists.

All styling belongs in `src/styles/` under the existing `@layer` cascade.
Surface selectors use the `qa-<surface>-<part>` grammar. Surface CSS consumes
semantic `--qa-*` tokens only; primitives, hardcoded colors, literal radii, raw
durations or eases, CSS-in-JS, Tailwind, route-local CSS, and Svelte `<style>`
blocks are forbidden unless a task explicitly changes the design-system rules.

The palette should never drift into purple-blue SaaS gradients, beige monotony,
espresso/brown heaviness, or dark-slate sameness. QuranAtlas can be warm, but it
must still have clear contrast, hierarchy, and disciplined accents.

## Typography

Arabic text is sacred content and must use the active Quran font cascade. Do not
fake Arabic, substitute generated Arabic, or use decorative calligraphy as UI
ornament.

Translation and tafsir should feel literary and readable. UI labels should stay
quiet, compact, and scannable. Avoid oversized headings inside operational
surfaces such as drawers, settings sheets, asset tables, and reader chrome.

Do not import or introduce new font families for UI, display, translation, or
Arabic styling unless the task explicitly changes the token system. Use
semantic font tokens: `--qa-font-arabic`, `--qa-font-translation`,
`--qa-font-ui`, and `--qa-font-mono`.

Letter spacing should normally be zero. Use wide tracking only for small labels
or metadata where it is already part of the local component language.

## Layout And Density

QuranAtlas is an application, not a landing page. First screens should be usable
product surfaces, not hero sections or feature explanations.

Use full-width bands, unframed layouts, sheets, drawers, and dense rows. Cards
are for repeated items, modals, and genuinely framed tools. Avoid nested card
stacks and decorative preview containers around Mushaf, Quran text, tafsir,
translation, or reading content.

For operational data such as assets, sources, settings, bookmarks, and
navigation lists, prefer rows, tables, segmented groups, and sheets over
repeated decorative cards. Cards are acceptable only when the component is
genuinely framed and does not create nested card stacks.

Touch targets must respect the app's minimum target token. Layout must hold at
mobile, real tablet, and desktop tiers:

- Mobile: below 768px.
- Tablet: 768px to 1179px.
- Desktop: 1180px and above.

Awkward states matter: 320px width, short mobile landscape, long labels, dense
ayah content, expanded panels, focus rings, and safe-area edges.

## Component Behavior

Controls should use familiar affordances:

- Icons for tool buttons when an icon communicates the action clearly.
- Segmented controls for mutually exclusive modes.
- Toggles or switches for binary settings.
- Sliders or steppers for numeric reader comfort values.
- Menus, dialogs, sheets, and drawers for option sets and flows.
- Rows and tables for asset management and source-state comparison.

Every component must define empty, loading, active, disabled, error, focus,
hover, and reduced-motion behavior when those states are reachable.

Asset and source UI must distinguish shipped, installed, missing, stale,
unavailable, active, inactive, installing, failed, and blocked states without
relying on color alone. Never show an inactive optional pack as usable before
verified install. Never imply fallback to Qalun, Hafs, or Warsh unless the
setting is explicitly changed or the baseline is verified.

Designs must prove readable contrast, visible focus, keyboard reachability,
non-color-only state communication, text fit without clipping, no horizontal
overflow, no header/control overlap, and stable touch targets via
`--qa-touch-min`. Loading and asset status changes that affect usability need
text/status affordances suitable for live regions.

## Theme Direction

Light is warm parchment. Sepia is more paper-like and reading-room oriented.
Dark is ink-based and calm, not blue-black neon. Night mode is an overlay that
composes over the active theme; do not redesign base themes around Night mode.

Theme changes should preserve hierarchy and state meaning. A component that
depends on a theme-specific visual trick must prove parity in light, sepia,
dark, and Night overlay where relevant.

## Motion

Motion is functional and quiet: sheet entry, drawer entry, hover lift, press
feedback, loading shimmer, and state transitions. It should help orientation
and never distract from reading.

Use motion tokens. Respect reduced-motion preferences. Avoid looping decorative
animation around Quran text or Mushaf content.

## Image Generation And Visual References

When using image generation for QuranAtlas UI direction:

- Use this guide as product-style context.
- Generate component-state references, not full-screen moodboards.
- Include Reader First, calm dense product UI, parchment/bronze/ink,
  semantic-token mapping, and real app surface constraints in the prompt.
- Use real app screenshots, committed Mushaf/reference assets, or abstract
  non-readable glyph blocks for Arabic/Mushaf regions. Never ask imagegen to
  generate readable Quran, Quran-like Arabic, ayah text, surah names,
  decorative calligraphy, tajweed marks, or religious inscriptions.
- Ban blobs, purple gradients, marketing heroes, fake decorative calligraphy,
  fantasy religious atmospherics, nested card stacks, and generated Quran text
  as source content.
- Treat generated Arabic or Quran-like text as visual placeholder only. It is
  never content, rendering proof, or a source of truth.
- A selected generated reference must be committed as a focused
  `docs/ui-references/<surface>/<component>.<state-or-variant>.png` with an
  adjacent `.md` intent note covering component/state/viewport, accepted traits,
  forbidden traits, token expectations, responsive differences, and non-goals.

Committed visual references in `docs/ui-references/` remain component-level
implementation targets. This guide is the product style compass around those
references, not a competing active reference.

## Do Not

- Do not add Svelte `<style>` blocks, CSS-in-JS, Tailwind, or route-local CSS.
- Do not add marketing hero layouts to app surfaces.
- Do not use ornamental religious imagery as a substitute for real Quran,
  Mushaf, translation, tafsir, or source state.
- Do not obscure primary reading content with decorative media.
- Do not average multiple visual references into one implementation target.
- Do not commit transient Playwright screenshots as design intent.
- Do not introduce new product promises through visuals.

## Implementation References

- Product scope: `docs/product-info.md`.
- UI workflow: `.agents/skills/quranatlas-ui-workflow/SKILL.md`.
- CSS architecture and tokens: `docs/context/architecture.md` and
  `src/styles/tokens/semantic.css`.
- Component visual references: `docs/ui-references/`.
