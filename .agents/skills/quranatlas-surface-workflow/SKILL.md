---
name: quranatlas-surface-workflow
description: Work on QuranAtlas by user-visible surface instead of by file. Use whenever a request changes behavior in reader, navigation, onboarding, configuration, infra, or removed-scope cleanup surfaces.
---

# QuranAtlas Surface Workflow

Use this skill when the task changes app behavior.

Reader First surfaces are read, navigate, configure, onboard, and infra. Mark, review, and listen are removed-scope implementation surfaces; use their dossiers for cleanup, regression containment, or source removal work, not new product expansion.

## Workflow

1. Identify the owning surface from `docs/context/surfaces/*.md`.
2. Read the owning dossier before editing code.
3. Keep the unit of work aligned to the surface or a contiguous surface cluster.
4. Update the owning dossier in the same change for behavior, reach, or invariant changes.
5. If the change is cross-cutting, update `docs/context/architecture.md` or `docs/context/data-model.md` as needed.
6. Rerun `pnpm docs:derive` after touching generated context inputs.

## Pointers

- `docs/workflow/cluster-by-surface.md`
- `docs/context/feature-map.md`
- `docs/context/data-model.md`

## Do not use this skill for

- pure dependency bumps
- type-only refactors
- docs-only edits with no behavior change
