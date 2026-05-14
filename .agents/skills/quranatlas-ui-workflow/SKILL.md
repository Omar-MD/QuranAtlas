---
name: quranatlas-ui-workflow
description: Use when changing, redesigning, styling, visually reviewing, screenshot-checking, or polishing QuranAtlas UI, layout, density, responsive behavior, or frontend states.
---

# QuranAtlas UI Workflow

Use this only for UI work that needs visual judgment or browser proof.

## Required Companion Skills

- Use `quranatlas-workflow` for surface ownership, dossier updates, testing, and verification.
- Use `frontend-design` for visual craft and frontend design decisions.
- Use `superpowers:brainstorming` before creative UI changes.

## Flow

1. Read the owning surface dossier and the relevant source files.
2. Identify audience, primary task, tone, density, existing components, tokens, and accessibility constraints.
3. Establish a design direction before coding. If references or screenshots exist, use them; otherwise infer from current QuranAtlas UI and state the direction briefly.
4. Preserve existing design system, components, icons, spacing, and tokens unless the change requires a documented exception.
5. Implement the smallest coherent UI change for the direction.
6. Run the app when rendering proof matters.
7. Capture desktop and mobile screenshots with Playwright or existing e2e tooling.
8. Critique hierarchy, spacing, alignment, contrast, density, text fit, touch targets, mobile layout, and generic-looking patterns.
9. Fix material visual issues, then repeat screenshot and critique when layout changes materially.
10. Update the owning dossier only for changed behavior, reach, or invariants.
11. Run the verification selected by `quranatlas-workflow`.

## Design Defaults

- Prefer calm, dense, product-grade UI over marketing layouts.
- Keep surfaces scannable with clear hierarchy, predictable controls, stable dimensions, and restrained ornament.
- Use real icons for icon actions, tooltips for unfamiliar icon-only controls, and semantic controls for form state.
- Avoid generic AI patterns: purple/blue gradients, floating decorative blobs, nested cards, oversized app-surface heroes, vague empty-state illustrations, and one-note palettes.
- Do not document pixel trivia in dossiers.

## Completion Standard

Do not claim UI work is complete without concrete visual evidence or a clear reason screenshots were impossible. If browser proof could not run, state the blocker and which non-visual checks passed.
