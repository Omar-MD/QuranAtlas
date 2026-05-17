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
- Prefer Playwright MCP when available for development-time browser inspection, responsive checks, focus walkthroughs, and screenshot capture while iterating.
- Any request for a new visual direction, redesign direction, or multiple visual options must use `frontend-design`, `superpowers:brainstorming`, and `imagegen` before implementation.

## Tool Roles

- Playwright MCP is a preferred development-time inspection aid, not repo infrastructure. If it is unavailable, use the local Playwright CLI, screenshots, traces, or manual browser inspection and state the fallback.
- Checked-in Playwright specs under `tests/e2e/` are the durable browser regression layer and CI proof; `quranatlas-workflow` and `tests/e2e/AGENTS.md` own test placement and verification tier decisions.
- Do not treat transient `test-output/` screenshots as the visual source of truth.
- Do not replace an existing good Playwright spec with MCP-only proof.

## UI Protocol

1. Identify the surface, active component, states, themes, and viewport tiers.
2. Decide whether this is creative direction work, existing-direction polish, or a non-visual behavior fix.
3. For creative direction work, create or select a committed `docs/ui-references/...` image plus intent note before implementation.
4. Implement one component and one visual concern at a time.
5. Re-render after each focused task, compare against the reference or existing intended UI, and fix mismatches before moving on.
6. Capture responsive proof for applicable tiers, with real tablet-sized development proof when tablet behavior can differ.
7. Use `quranatlas-workflow` and `tests/e2e/AGENTS.md` for any durable Playwright test decision.

## Visual Direction Gate

Before implementation, identify:

- Owning surface and active component.
- User task, tone, density, and state matrix.
- Existing tokens, CSS surface conventions, and nearby components.
- Relevant themes: light, sepia, dark.
- Relevant viewports: mobile, tablet, desktop, plus awkward cases when risky.
- Verification split: what will be inspected during iteration, and which browser-only invariants may need `quranatlas-workflow` / `tests/e2e/AGENTS.md` coverage.

## Component Reference Source Of Truth

For creative UI work, commit a stable component reference before implementation:

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

If `docs/ui-references/<surface>/` does not exist yet, create it as part of the work. Do not leave the workflow depending on an implied directory that is absent from the repo.

Do not require a new committed reference for narrow fit fixes, bug fixes, token corrections, or polish that preserves the existing visual direction. In those cases, treat the current accepted UI, nearby components, and surface dossier as the reference, then still capture browser proof for the changed state.

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
- After every focused task, re-render and compare the implementation screenshot against the committed reference and intent note. Prefer Playwright MCP for this loop when available; otherwise use Playwright CLI screenshots/traces or manual browser screenshots and state the fallback.
- Use browser snapshots, measured DOM checks, and computed-style inspection to inspect overflow, overlap, clipping, focus order, and token-resolved styles while the component is in motion.
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

Do not treat phone plus desktop as implied tablet coverage. Run a real tablet-sized development proof pass whenever the component can materially differ at the tablet breakpoint or in landscape. This is manual/development proof unless a checked-in tablet Playwright project or spec is added through the owning workflow.

Add awkward checks when relevant:

- `320x568`.
- `768x1024` or another real tablet-sized viewport.
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

- Prefer Playwright MCP for active proof during implementation when available: screenshots, accessibility snapshots, focus walks, and measured checks where layout can fail. If unavailable, use Playwright CLI, browser devtools, or manual browser proof and name the fallback.
- Required when applicable: horizontal overflow, header/control overlap, touch target size, text fit/clipping, responsive containment, theme/color state proof, and surface-specific invariants such as unframed Mushaf layout.
- For durable regression coverage, hand off to `quranatlas-workflow` and `tests/e2e/AGENTS.md`. Typical candidates: real layout constraints, keyboard traversal, gesture behavior, service-worker effects, reload persistence, or layout measurements that would regress silently.
- When visual proof becomes an e2e spec, refer to `tests/e2e/AGENTS.md`; this skill does not decide test placement or verification tiers.
- If a Playwright spec captures screenshots, treat them as test artifacts unless the spec also uses committed baselines or other checked-in assertions. Artifacts do not replace `docs/ui-references/...`.
- Completion requires reference handling appropriate to the change, comparison after each focused task, responsive proof for relevant tiers including development-time tablet proof when applicable, and final integration screenshots as ephemeral review evidence. Summarize in the final response which fallback/tooling was used, which tiers/states were checked, and whether durable Playwright coverage was added, skipped, or delegated to the owning workflow.
