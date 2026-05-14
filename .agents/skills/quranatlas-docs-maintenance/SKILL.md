---
name: quranatlas-docs-maintenance
description: Maintain QuranAtlas context docs and generated inventories without drift. Use whenever a change affects dossiers, architecture, data model, tech stack, or generated doc blocks.
---

# QuranAtlas Docs Maintenance

This repo treats context docs as load-bearing.

## Workflow

1. Identify which doc owns the changed subject.
2. Update the owning manual prose in the same change.
3. Never hand-edit auto-generated fence blocks.
4. Run `pnpm docs:derive`.
5. Run `pnpm docs:check`.

## Ownership map

- Surface behavior: `docs/context/surfaces/*.md`
- Cross-cutting behavior: `docs/context/architecture.md`
- Store ownership and data invariants: `docs/context/data-model.md`
- Tooling and CI gates: `docs/tech-stack.md`
- Product scope and attribution: `docs/product-info.md`
- Product-scope and surface-ownership wording: `docs/workflow/cluster-by-surface.md`, `AGENTS.md`, and `.agents/skills/*.md`

## Current-state rule

Do not leave revision logs, dates, commit SHAs, codenames, or progress notes in repo docs. Temporary notes belong in `.scratch/`.
