---
name: quranatlas-ui-workflow
description: Use when changing, redesigning, styling, visually reviewing, screenshot-checking, or polishing QuranAtlas UI visual quality, layout, density, responsive behavior, or frontend states.
---

# QuranAtlas UI Workflow

Use this only for QuranAtlas UI visual judgment: layout, styling, density, responsive behavior, screenshots, visual critique, component reference workflow, and polish. This skill does not own surface routing, dossier ownership, test placement, or verification tiers.

## Companion Skills

- Use `quranatlas-workflow` for surface ownership, docs, tests, and verification.
- Use `frontend-design` for craft, constrained by QuranAtlas identity.
- Use `superpowers:brainstorming` before creative UI changes.
- Use `imagegen` for creative visual suggestions, new visual directions, or major visual redesign decisions.
- Any request for a new visual direction, redesign direction, or multiple visual options must use `frontend-design`, `superpowers:brainstorming`, and `imagegen` before implementation.

## Visual Direction Gate

Before implementation, identify:

- Owning surface and active component.
- User task, tone, density, and state matrix.
- Existing tokens, CSS surface conventions, and nearby components.
- Relevant themes: light, sepia, dark.
- Relevant viewports: mobile, tablet, desktop, plus awkward cases when risky.

## Component Reference Source Of Truth

For creative UI work:

1. Split the design into components.
2. Generate visual options per component/state with `imagegen`, not full-screen mixed moodboards.
3. Select one reference before implementation.
4. Commit it under `docs/ui-references/<surface>/<component>.<state-or-variant>.png`.
5. Add the adjacent intent note `docs/ui-references/<surface>/<component>.<state-or-variant>.md`.

The intent note must briefly state:

- Component, state, and viewport.
- Accepted visual traits.
- Forbidden traits.
- Token expectations.
- Responsive differences.
- Non-goals.

The committed reference image plus intent note is the component visual source of truth for hierarchy, density, rhythm, material feel, and emphasis. It does not override QuranAtlas tokens, accessibility, real Quran text rendering, interaction behavior, or responsive constraints.

## Image Generation Guardrails

- Generated references must answer what should be implemented differently.
- Prefer component-state references over fantasy app composites.
- Prompts must include QuranAtlas constraints: Reader First, calm dense product UI, parchment/bronze/ink feel, Arabic/Mushaf as primary content.
- Ban blobs, purple gradients, nested card stacks, marketing heroes, fake decorative calligraphy, and religious moodboard atmospherics.
- Generated Quran/Arabic text is never source content or rendering proof.
- Do not keep rejected options unless documenting a real tradeoff.

## Single-Component Implementation Loop

- Implement one component at a time.
- Break work into multiple concise tasks.
- Each task targets one aspect only: structure, spacing, typography, selected state, hover/focus, empty state, mobile fit, theme parity, or a similarly narrow concern.
- All tasks stay on the same component.
- After every focused task, re-render and compare the implementation screenshot against the committed reference and intent note.
- Fix mismatch before starting the next task.
- Move to the next component only after the current component is visually proven.

Ban:

- One-shot full-screen implementation from a composite mockup.
- Implementing several components from one option board.
- Batching multiple visual tasks with only one final comparison.
- Broad opportunistic polish outside the active component.

## Responsive Proof

Every changed component needs responsive visual proof for applicable tiers:

- Mobile: `<768`.
- Tablet: `768-1179`.
- Desktop: `>=1180`.

Add awkward checks when relevant:

- `320x568`.
- Mobile landscape.
- Short sheets/drawers.
- Long labels.
- Dense ayah content.
- Expanded panels.
- Safe-area or sticky-header cases.

If a component intentionally differs by viewport, commit separate references, for example:

- `docs/ui-references/navigate/drawer-header.mobile.png`.
- `docs/ui-references/navigate/drawer-header.desktop.png`.

## Proof And Completion

- Use screenshots plus measured checks where layout can fail.
- Required when applicable: horizontal overflow, header/control overlap, touch target size, text fit/clipping, responsive containment, theme/color state proof, and surface-specific invariants such as unframed Mushaf layout.
- When visual proof becomes an e2e spec, refer to `tests/e2e/AGENTS.md` rather than duplicating its mechanics.
- Completion requires a committed reference image and intent note for creative work, comparison after each focused task, responsive proof for relevant tiers, final integration screenshots after the component is complete, or a clear blocker if browser proof could not run.
