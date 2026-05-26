---
name: quranatlas-ui-workflow
description: Use when changing, redesigning, styling, visually reviewing, screenshot-checking, or polishing QuranAtlas UI visual quality, layout, density, responsive behavior, or frontend states.
---

# QuranAtlas UI Workflow

Use this only for QuranAtlas UI visual judgment: layout, styling, density, responsive behavior, screenshots, visual critique, component reference workflow, and polish. This skill does not own surface routing, dossier ownership, test placement, or verification tiers.

## Companion Skills

- Use `quranatlas-workflow` for surface ownership, docs, tests, and verification.
- Any UI-facing use of this skill must also invoke `frontend-design` in the same turn. This includes implementation, polish, redesign, styling, layout, and visual review work. Do not treat it as optional craft support.
- Use `superpowers:brainstorming` before creative UI changes.
- Use `imagegen` for creative visual suggestions, new visual directions, or major visual redesign decisions.
- Use whatever browser-proof path is available for development-time inspection, responsive checks, focus walkthroughs, and screenshot capture while iterating. Playwright MCP is optional, not required.
- Any request for a new visual direction, redesign direction, or multiple visual options must use `frontend-design`, `superpowers:brainstorming`, and `imagegen` before implementation.
- Read root `DESIGN.md` before UI redesign, refactor, iteration, visual review, component-reference work, or image generation. It is the QuranAtlas product style guide.
- Read `docs/context/style-map.md` and the owning surface dossier before editing so the active component, source file, CSS partial, and proof coverage are explicit.
- For React UI work, read `src-react/design-system/registry/component-registry.json` and compose approved primitives from `src-react/components/ui` before adding or styling new React feature components.

## Hard Rules

- `frontend-design` is a mandatory companion skill for every UI-facing use of `quranatlas-ui-workflow`. If this workflow is selected and `frontend-design` is not also selected, the workflow was not followed.
- `DESIGN.md` must be used as product-style context for every UI-facing pass. It is a style guide, not the single active component reference source.
- Implementation must name exactly one active reference source at a time: either one committed component reference plus intent note, or one existing accepted UI state for narrow non-directional fixes. Zero active references and multiple active references both violate the workflow.
- One implementation loop owns one active component, one active reference source, and one visual concern at a time. Surrounding components may supply constraints, but they do not become active references until the current loop is complete and visually proven.
- A focused task is not complete until the component is re-rendered, compared against the same active reference source, and mismatches are fixed. Do not start the next focused task first.

## Tool Roles

- Browser-proof tooling is an implementation aid, not repo infrastructure. Use the best available option for the task: Playwright MCP when configured, the local Playwright CLI, browser devtools, screenshots, traces, or manual browser inspection. State the fallback when you are not using checked-in Playwright coverage.
- Checked-in Playwright specs under `tests/e2e/` are the durable browser regression layer and CI proof; `quranatlas-workflow` and `tests/e2e/AGENTS.md` own test placement and verification tier decisions.
- Do not treat transient `test-output/` screenshots as the visual source of truth.
- Do not replace an existing good Playwright spec with MCP-only proof.

## UI Protocol

1. Read `DESIGN.md` for product style constraints.
2. Identify the surface, active component, states, themes, and viewport tiers. For React UI, identify the registry entry or add/update one in the same change.
3. Decide whether this is creative direction work, existing-direction polish, structural refactor work, or a non-visual behavior fix.
4. Invoke `frontend-design` before implementation work begins, even for polish or salvage passes, so the component craft pass is explicit.
5. For creative direction work, create or select a committed `docs/ui-references/...` image plus intent note before implementation.
6. Select and name exactly one active reference source for the pass. Treat `DESIGN.md` as supporting style context, not as the active component reference. Treat any other references as out of scope until this component is complete.
7. Implement one component and one visual concern at a time.
8. Re-render after each focused task, compare against the same single active reference source, and fix mismatches before moving on to the next focused task.
9. Capture responsive proof for applicable tiers, with real tablet-sized development proof when tablet behavior can differ.
10. Use `quranatlas-workflow` and `tests/e2e/AGENTS.md` for any durable Playwright test decision.

## Visual Direction Gate

Before implementation, identify:

- The relevant `DESIGN.md` constraints for the pass.
- Owning surface and active component.
- The single active reference source for this pass.
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
4. Commit it under `docs/ui-references/<surface>/<component>/<state>.<viewport>[.<theme>].png`.
5. Add the adjacent intent note `docs/ui-references/<surface>/<component>/<state>.<viewport>[.<theme>].md`.

The intent note must briefly state:

- Component, state, and viewport.
- Accepted visual traits.
- Forbidden traits.
- Token expectations.
- Responsive differences.
- Non-goals.

The committed reference image plus intent note is the component visual source of truth for hierarchy, density, rhythm, material feel, and emphasis. It does not override QuranAtlas tokens, accessibility, real Quran text rendering, interaction behavior, or responsive constraints.

If `docs/ui-references/<surface>/<component>/` does not exist yet, create it as part of the work. Do not leave the workflow depending on an implied directory that is absent from the repo.

Do not require a new committed reference for narrow fit fixes, bug fixes, token corrections, or polish that preserves the existing visual direction. In those cases, choose one accepted current UI state as the active reference source, use nearby components and the surface dossier only as supporting constraints, and still capture browser proof for the changed state.

Even in those narrow-fix cases, keep exactly one active reference source at a time. "Nearby components" may inform constraints, but they must not become a multi-reference implementation bundle.

## Image Generation Guardrails

- Generated references must answer what should be implemented differently.
- Prefer component-state references over fantasy app composites.
- Prompts must use `DESIGN.md` as product-style context and include QuranAtlas constraints: Reader First, calm dense product UI, parchment/bronze/ink feel, semantic-token mapping, and real app surface constraints.
- For Arabic/Mushaf regions, prompts must use real app screenshots, committed Mushaf/reference assets, or abstract non-readable glyph blocks. Do not ask imagegen to generate readable Quran, Quran-like Arabic, ayah text, surah names, decorative calligraphy, tajweed marks, or religious inscriptions.
- Ban blobs, purple gradients, nested card stacks, marketing heroes, fake decorative calligraphy, and religious moodboard atmospherics.
- Generated Quran/Arabic text is never source content or rendering proof.
- Do not keep rejected options unless documenting a real tradeoff.

## Single-Component Implementation Loop

- Implement one component at a time.
- Use exactly one active reference source at a time.
- Break work into multiple concise tasks.
- Each task targets one aspect only: structure, spacing, typography, selected state, hover/focus, empty state, mobile fit, theme parity, or a similarly narrow concern.
- All tasks stay on the same component.
- After every focused task, re-render and compare the implementation screenshot against the same active reference source. If that source is a committed reference, also compare against its intent note. Use the best available browser-proof loop for the task and state the fallback when it is not obvious from context.
- Use browser snapshots, measured DOM checks, and computed-style inspection to inspect overflow, overlap, clipping, focus order, and token-resolved styles while the component is in motion.
- Fix mismatch before starting the next task. If the reference source needs to change, finish the current compare/fix step first, then begin a new pass with a newly named single active reference source.
- Move to the next component only after the current component is visually proven.

Ban:

- One-shot full-screen implementation from a composite mockup.
- Pulling multiple component references into one implementation pass.
- Comparing against several component references and informally averaging them into one result.
- Implementing several components from one option board.
- Starting a second focused task before the prior task has gone through re-render, compare, and mismatch fixing.
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

- `docs/ui-references/navigate/nav-drawer-header/read.mobile.light.png`.
- `docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.png`.

## Proof And Completion

- Use active browser proof during implementation: screenshots, accessibility snapshots, focus walks, and measured checks where layout can fail. Playwright MCP is optional when configured; Playwright CLI, browser devtools, or manual browser proof are all valid. Name the fallback when it is not already clear from the task context.
- Required when applicable: horizontal overflow, header/control overlap, touch target size, text fit/clipping, responsive containment, theme/color state proof, and surface-specific invariants such as unframed Mushaf layout.
- For durable regression coverage, hand off to `quranatlas-workflow` and `tests/e2e/AGENTS.md`. Typical candidates: real layout constraints, keyboard traversal, gesture behavior, service-worker effects, reload persistence, or layout measurements that would regress silently.
- When visual proof becomes an e2e spec, refer to `tests/e2e/AGENTS.md`; this skill does not decide test placement or verification tiers.
- If a Playwright spec captures screenshots, treat them as test artifacts unless the spec also uses committed baselines or other checked-in assertions. Artifacts do not replace `docs/ui-references/...`.
- Completion requires reference handling appropriate to the change, comparison after each focused task, responsive proof for relevant tiers including development-time tablet proof when applicable, and final integration screenshots as ephemeral review evidence. Summarize in the final response which fallback/tooling was used, which tiers/states were checked, and whether durable Playwright coverage was added, skipped, or delegated to the owning workflow.
