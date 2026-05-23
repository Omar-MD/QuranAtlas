# Agentic UI Refactor 01 - Check Infrastructure Implementation Spec

> **For sequential agents:** Start only after Spec 00 is committed and its
> verification passed. Commit this spec before any CSS partial split starts.

## Goal

Add the static checks that make the UI refactor safe: style-entry coverage,
visual-reference pairing, selector liveness, primitive-token discipline, and
hardcoded-design-value review.

## Depends On

- Spec 00 complete and committed.
- `.scratch/agentic-ui-refactor/00-*.txt` reports available locally or
  regenerated.
- Existing nested-path support in `.stylelintrc.json`,
  `scripts/check-token-usage.mjs`, and `scripts/check-at-layer.mjs`.
- Current `docs/ui-references` tree has no orphaned image/note pairs.

## Produces

- `scripts/check-style-entry.mjs`
- `scripts/check-ui-references.mjs`
- `scripts/check-selector-liveness.mjs`
- `scripts/check-primitive-token-consumption.mjs`
- `scripts/check-design-literals.mjs`
- Unit coverage under `tests/unit/styles/`
- `package.json` scripts updated
- `docs/tech-stack.md` static-check documentation updated
- `pnpm run check` blocks on style-entry and UI-reference pairing
- advisory checks run during `pnpm run check` but exit successfully until
  Spec 04 promotes them to blocking

## Non-Goals

- Do not split CSS files.
- Do not remove dead selectors.
- Do not rename classes.
- Do not migrate visual references into component directories. Spec 05 owns
  taxonomy migration.
- Do not weaken existing token or `@layer` checks.

## Required Reads

- `scripts/check-theme-parity.mjs`
- `scripts/check-token-usage.mjs`
- `scripts/check-at-layer.mjs`
- `scripts/check-no-svelte-style.mjs`
- `tests/unit/styles/theme-parity.test.js`
- `tests/unit/styles/token-usage.test.js`
- `tests/unit/styles/at-layer.test.js`
- `docs/ui-references/**`
- `docs/tech-stack.md`
- `package.json`
- `tests/unit/AGENTS.md`

## File Map

Create:

- `scripts/check-style-entry.mjs`
- `scripts/check-ui-references.mjs`
- `scripts/check-selector-liveness.mjs`
- `scripts/check-primitive-token-consumption.mjs`
- `scripts/check-design-literals.mjs`
- `tests/unit/styles/style-entry.test.js`
- `tests/unit/styles/ui-references.test.js`
- `tests/unit/styles/selector-liveness.test.js`
- `tests/unit/styles/primitive-token-consumption.test.js`
- `tests/unit/styles/design-literals.test.js`

Modify:

- `package.json`
- `docs/tech-stack.md`
- Existing `tests/unit/styles/*.test.js` only when shared test helpers are
  already present and can be extended cleanly.

## Script Contracts

### `check-style-entry.mjs`

Responsibilities:

- Parse `src/styles/index.css`.
- Verify every `@import url(...)` resolves to an existing CSS file.
- Walk these roots:
  - `src/styles/tokens/**/*.css`
  - `src/styles/patterns/**/*.css`
  - `src/styles/surfaces/**/*.css`
  - top-level shipped CSS files imported by `src/styles/index.css`
- Verify every shipping CSS partial is imported exactly once.
- Reject duplicate imports, missing imports, and stale imports.
- Allow explicit non-entry CSS files only through an in-script allowlist shaped
  like `{ path, owner, reason }`.
- Print a stable ordered import report with import index, path, and resolved
  absolute path.
- Support `--report` to print the ordered report without changing pass/fail
  semantics.

Unit coverage must include:

- missing imported file fails;
- duplicate import fails;
- unimported shipping partial fails;
- allowlisted non-entry file passes and prints the owner/reason;
- nested `surfaces/read/*.css` and `patterns/*.css` are discovered.

### `check-ui-references.mjs`

Responsibilities:

- Walk `docs/ui-references`.
- Ignore `docs/ui-references/README.md`.
- Allow explicit metadata or matrix notes only through an in-script allowlist
  shaped like `{ path, owner, reason, category }`.
- Reject stray system files such as `.DS_Store`.
- Require every `.png` to have a same-basename `.md`.
- Require every non-allowlisted `.md` to have a same-basename `.png`.
- Require every intent note to contain these field labels:
  - `Component`
  - `State and viewport`
  - `Accepted visual traits`
  - `Forbidden traits`
  - `Token expectations`
  - `Responsive differences`
  - `Non-goals`
- Print all failures before exiting non-zero.

Unit coverage must include:

- orphan image fails;
- orphan note fails;
- missing required field fails;
- allowlisted matrix note passes;
- `.DS_Store` fails.

### `check-selector-liveness.mjs`

Responsibilities:

- Extract CSS-defined `.qa-*` classes from CSS selectors.
- Extract code-referenced `qa-*` classes from `.svelte`, `.ts`, and `.js`.
- Recognize:
  - static `class="..."`
  - Svelte `class:qa-*` directives
  - BEM-style string interpolation and template literals
  - `classList.add/remove/toggle`
  - `closest()`
  - `querySelector()` and `querySelectorAll()`
  - DOM `className` assignment
- Ignore CSS custom properties, cache names, route identifiers, element IDs,
  and storage keys that happen to begin with `qa-`.
- Support an allowlist shaped like
  `{ pattern, owner, category, reason, removeWhen }`.
- Valid categories:
  - `dynamic-class`
  - `imperative-dom`
  - `external-artifact`
  - `id-or-storage-key`
  - `legacy-quarantine`
- Report:
  - CSS-defined classes with no code reference;
  - code-referenced classes with no CSS definition when they are intended to be
    styled;
  - uncertain dynamic matches separately.
- In advisory mode, print warnings and exit zero.
- In blocking mode, unallowlisted failures exit non-zero.

Initial allowlist examples:

- generated theme modifiers such as `qa-onb-sw--light`,
  `qa-onb-sw--sepia`, `qa-onb-sw--dark`, and `qa-onb-sw--auto`;
- placement modifiers such as `qa-mushaf-controls--below-page`;
- runtime-created safety or sync classes until those DOM paths move to Svelte
  or documented CSS ownership;
- cache names and route identifiers that happen to begin with `qa-`.

### `check-primitive-token-consumption.mjs`

Responsibilities:

- Scan CSS outside `src/styles/tokens/**`.
- Flag primitive token consumption:
  - `var(--c-*)`
  - `var(--s-*)`
  - `var(--r-*)`
  - `var(--ff-*)`
  - `var(--fs-*)`
  - `var(--lh-*)`
  - `var(--dur-*)`
  - `var(--ease-*)`
- Allow semantic `--qa-*` tokens and file-local scoped `--qa-*` custom
  properties.
- Support explicit compatibility allowlist entries with owner, reason, and
  removal condition.
- In advisory mode, print warnings and exit zero.
- In blocking mode, unallowlisted failures exit non-zero.

### `check-design-literals.mjs`

Responsibilities:

- Scan surface and pattern CSS.
- Flag hardcoded hex colors, including inside `color-mix()`, gradients, SVG
  masks, and browser-control styling.
- Flag raw motion literals such as `120ms ease` outside token files.
- Flag raw radius literals when a semantic radius token should apply.
- Allow intentional theme swatches, generated preview palettes, SVG/browser
  quirks, and one-off geometry only with local comments or explicit allowlist
  entries.
- Do not flag ordinary spacing and sizing literals unless they encode color,
  motion, or radius design decisions.
- In advisory mode, print warnings and exit zero.
- In blocking mode, unallowlisted failures exit non-zero.

## Package Script Integration

Update `pnpm run check` so it runs in this order:

1. `pnpm run lint`
2. `node scripts/check-theme-parity.mjs`
3. `node scripts/check-token-usage.mjs`
4. `node scripts/check-at-layer.mjs`
5. `node scripts/check-style-entry.mjs`
6. `node scripts/check-ui-references.mjs`
7. `node scripts/check-selector-liveness.mjs --advisory`
8. `node scripts/check-primitive-token-consumption.mjs --advisory`
9. `node scripts/check-design-literals.mjs --advisory`
10. `node scripts/check-no-svelte-style.mjs`
11. `svelte-check --tsconfig ./tsconfig.json`

If separate named scripts are added for direct local use, document them in
`docs/tech-stack.md` in the same commit.

## Verification

Run targeted tests first:

```bash
pnpm vitest run tests/unit/styles/style-entry.test.js tests/unit/styles/ui-references.test.js tests/unit/styles/selector-liveness.test.js tests/unit/styles/primitive-token-consumption.test.js tests/unit/styles/design-literals.test.js
```

Then run:

```bash
pnpm run check
pnpm run docs:check
git diff --check
```

## Acceptance Criteria

- Style-entry and UI-reference checks are blocking in `pnpm run check`.
- Selector-liveness, primitive-token consumption, and design-literal checks run
  in advisory mode and print actionable reports.
- Unit tests cover pass and fail paths for all new scripts.
- `docs/tech-stack.md` documents new static checks and advisory/blocking
  status.
- No CSS files have been split.
- Verification commands pass.

## Commit

Suggested message:

```bash
git commit -m "chore(ui): add refactor safety checks"
```

## Handoff To Spec 02

Tell the next agent:

- how to run `check-style-entry --report`;
- which advisory warnings remain and why;
- that style-entry and UI-reference checks are blocking;
- that CSS partial splitting can now rely on import coverage.
