# UI Refactor Workflow

## Preflight

Run `git status --short`, read the owning surface dossier, and confirm the single active UI reference before editing.

## Find Ownership

Use `docs/context/style-map.md` first, then the surface dossier style inventory to find the source component, CSS partial, and proof surface.

## Define The Pass

Name one surface, one component, one visual concern, one state matrix, and one active current-state reference before you touch code.

## Edit Together

Edit the Svelte source and the owning CSS partial in the same pass. Keep CSS under `src/styles/**`, stay inside the declared cascade layers, and prefer semantic `--qa-*` tokens.

## Prove Narrowly

Run the owning unit tests first, then `pnpm run check`. If layout, theme, density, or responsive behavior can differ, browser-proof mobile, tablet, and desktop explicitly.

## Regenerate Docs

When ownership, imports, tests, references, or surface contracts change, run `pnpm run docs` and then `pnpm run docs:check`.

## Final Summary

Capture the commands run, the states and viewports inspected, the active reference used, and whether durable e2e coverage was updated or intentionally left unchanged.
