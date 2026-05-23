# Agentic UI Refactor Implementation Spec Index

This master design has been split into focused implementation specs. Use this
file as the execution index only; the child specs are the source of truth for
agent work packages, dependencies, file ownership, verification, and handoff.

## Goal

Refactor QuranAtlas UI source organization so agents can find, change, prove,
and preserve high-fidelity UI work quickly while keeping the existing
architecture: Svelte owns markup and behavior, `src/styles` owns CSS,
semantic `--qa-*` tokens own design decisions, and surface dossiers own
behavior context.

## Sequential Order

Run the specs in this order. Each spec must finish, verify, and commit before
the next spec starts.

1. [00 - Baseline Readiness](2026-05-22-agentic-ui-refactor-00-baseline-readiness-spec.md)
2. [01 - Check Infrastructure](2026-05-22-agentic-ui-refactor-01-check-infrastructure-spec.md)
3. [02 - CSS Partial Split](2026-05-22-agentic-ui-refactor-02-css-partial-split-spec.md)
4. [03 - Ownership Normalization](2026-05-22-agentic-ui-refactor-03-ownership-normalization-spec.md)
5. [04 - Stale Selector And Token Cleanup](2026-05-22-agentic-ui-refactor-04-stale-selector-token-cleanup-spec.md)
6. [05 - Visual Reference Migration](2026-05-22-agentic-ui-refactor-05-visual-reference-migration-spec.md)
7. [06 - Docs Workflow Finalization](2026-05-22-agentic-ui-refactor-06-docs-workflow-finalization-spec.md)

## Global Invariants

- Do not add Svelte `<style>` blocks, CSS Modules, CSS-in-JS, Tailwind, or
  lazy route CSS.
- Keep `src/styles/index.css` as the only CSS entry imported by HTML.
- Keep moved rules inside the existing `@layer surfaces`; do not create a new
  cascade layer for this refactor.
- Preserve current visual behavior during mechanical splits. Visual redesign is
  out of scope unless a later task explicitly asks for it.
- Use semantic `--qa-*` tokens for design decisions. Primitive tokens belong in
  `src/styles/tokens/**`.
- Do not average multiple visual references into one target. One UI pass names
  one active component reference or one accepted current UI state.
- Do not treat `test-output`, generated Arabic text, or Playwright artifacts as
  visual source of truth.
- Keep comments and docs current-state only: no progress logs, stale paths,
  dates, old redesign labels, or commit SHAs unless they are data.

## Completion Gate

The whole refactor is complete only when:

- Large CSS monoliths are replaced by discoverable component-cluster partials.
- `src/styles/index.css` imports every shipping CSS partial exactly once.
- CSS-aware scripts and `.stylelintrc.json` cover nested surface files and
  shared pattern files.
- `DESIGN.md` is the product style guide used by the UI workflow skill.
- Surface dossiers or generated docs expose style ownership.
- `docs/context/style-map.md` maps component, source, style, reference, and
  test ownership where known.
- UI references use the component-directory taxonomy or are explicitly
  grandfathered with passing image/note pairs.
- Selector-liveness, primitive-token, and hardcoded-design-value warnings are
  fixed or intentionally allowlisted with owners and removal conditions.
- `pnpm run check`, `pnpm run test`, `pnpm run build`, `pnpm run docs:check`,
  and `git diff --check` pass.
- `pnpm run validate` passes before integration.
