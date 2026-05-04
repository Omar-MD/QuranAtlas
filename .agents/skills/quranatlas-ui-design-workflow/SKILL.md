---
name: quranatlas-ui-design-workflow
description: Use whenever changing, redesigning, styling, visually reviewing, or screenshot-checking any QuranAtlas UI, including layout, density, navigation, components, responsive behavior, visual polish, or user-facing frontend states.
---

# QuranAtlas UI Design Workflow

Use this skill for UI work that needs taste, restraint, and visual proof.

## Required Companion Skills

- Use `quranatlas-surface-workflow` for surface ownership and dossier updates.
- Use `quranatlas-testing` for the smallest valid verification path.
- Use `frontend-design` for visual craft and frontend design decisions.
- Use `superpowers:brainstorming` before creative UI changes.

## Non-Negotiable Flow

1. Read the owning surface dossier in `docs/context/surfaces/*.md`.
2. Identify the audience, primary task, tone, UI density, and existing component constraints.
3. Establish a design direction before coding. If the user supplied references or screenshots, use them. If not, infer from the current QuranAtlas UI and state the direction briefly.
4. Define explicit constraints before editing: what to preserve, what to avoid, responsive requirements, accessibility requirements, and which existing components or tokens to use.
5. Implement the smallest coherent UI change for that direction.
6. Run the app when the change needs browser rendering proof.
7. Capture desktop and mobile screenshots with Playwright or the existing e2e tooling.
8. Critique the screenshots before declaring completion. Check hierarchy, spacing, alignment, contrast, density, empty space, text fit, touch targets, mobile layout, and whether the result looks generic.
9. Fix material visual issues found in critique. Repeat screenshot and critique if the layout changed materially.
10. Update the owning surface dossier when behavior, reach, or invariants changed.
11. Run the verification command selected by `quranatlas-testing`.

## Design Defaults

- Prefer calm, dense, product-grade UI over marketing layouts.
- Use the existing design system, components, icons, spacing, and tokens before inventing new ones.
- Keep UI surfaces scannable: clear hierarchy, predictable controls, stable dimensions, and restrained ornament.
- Use real icons for icon actions, tooltips for unfamiliar icon-only controls, and semantic controls for form state.
- Avoid generic AI patterns: purple/blue gradients, floating decorative blobs, nested cards, oversized hero sections for app surfaces, vague empty-state illustrations, and one-note palettes.
- Avoid documenting pixel trivia in dossiers; document user-visible behavior, reach, and load-bearing invariants.

## Screenshot Critique Checklist

Before final response, answer these privately and fix any "no":

- Is the primary action or reading path obvious within three seconds?
- Does text fit at mobile and desktop widths without overlap or awkward truncation?
- Are spacing and alignment consistent with nearby QuranAtlas surfaces?
- Is the screen too sparse, too card-heavy, or visually generic?
- Are contrast, focus states, and target sizes usable?
- Does the UI still work with realistic QuranAtlas content length?

## Completion Standard

Do not claim the UI is complete until there is concrete visual evidence or a clear reason screenshots were not possible. If screenshots or browser verification could not be run, say exactly what blocked them and which non-visual checks passed.
