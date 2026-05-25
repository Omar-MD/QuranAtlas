# React Tech Stack Refactor 03 - Tokens And Tailwind v4 Design System Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`

## Purpose

Create the React design-system token foundation and Tailwind v4 integration
without weakening QuranAtlas token discipline. Tailwind is a utility authoring
layer inside owned React design-system and product components only; QuranAtlas
semantic tokens remain the design API.

## Current Docs Used

Context7 was used for the Tailwind CSS v4 implementation-sensitive parts of this
spec.

- Command:
  `npx ctx7@latest library "Tailwind CSS" "How should Tailwind CSS v4 be configured for a React Vite app with project-owned semantic CSS variables, theme tokens, and static checks that prevent palette and arbitrary value drift?"`
- Selected library id: `/tailwindlabs/tailwindcss.com`
- Command:
  `npx ctx7@latest docs /tailwindlabs/tailwindcss.com "How should Tailwind CSS v4 be configured for a React Vite app with project-owned semantic CSS variables, theme tokens, and static checks that prevent palette and arbitrary value drift?"`
- Current-doc facts used:
  - Tailwind v4 integrates with Vite through the `@tailwindcss/vite` plugin.
  - Tailwind v4 supports CSS-first theme configuration through `@theme` custom
    properties.
  - Tailwind v4 can use a class prefix through the CSS import directive.

QuranAtlas adds stricter local rules than Tailwind itself: Tailwind tokens and
utilities must resolve to QuranAtlas semantic tokens, and static checks must
reject palette, arbitrary-value, primitive-token, and one-off literal drift.

## Scope

In scope:

- Define `src-react/design-system/tokens/**`.
- Define a React Tailwind entry stylesheet under `src-react/design-system/`.
- Add Tailwind v4 Vite integration for the React build path only.
- Map Tailwind theme variables to QuranAtlas semantic token names.
- Define reader-specific semantic token namespaces.
- Define measured reader-layout allowlists.
- Add static checks that reject forbidden design literals and Tailwind drift in
  React code.
- Document token usage rules for future React component specs.

Out of scope:

- Replacing current Svelte CSS or token files.
- Changing `src/styles/**`.
- Migrating existing Svelte components to Tailwind.
- Creating React UI primitives beyond the minimum token proof fixtures needed by
  the checks.
- Adding Storybook stories. Storybook belongs to child spec `04`.
- Adding Radix or shadcn/ui components. Those belong to child spec `06`.

## Required Reads

- `AGENTS.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/style-map.md`
- `docs/tech-stack.md`
- `DESIGN.md`
- Parent master spec
- Child specs `00` and `01`

## Allowed Files And Directories

Allowed create:

- `src-react/design-system/tokens/**`
- `src-react/design-system/docs/**`
- React-only Tailwind entry CSS under `src-react/design-system/**`
- React-only token/static-check scripts under `scripts/` only if they are
  committed durable checks, not one-off scripts
- React-only test fixtures under `tests/unit/**` when needed for check coverage

Allowed modify:

- React Vite config or React-specific build config.
- `package.json` only for Tailwind v4 dependencies and durable check scripts.
- `docs/tech-stack.md` if scripts, dev tools, pinned versions, or CI gates
  change.
- `docs/context/repo-structure.md` if new React design-system directories are
  added.
- Root `AGENTS.md` or repo-local skills only if routing future React token work
  changes.

Forbidden modify:

- `src/styles/**` except for documentation links in generated context outputs.
- Current Svelte components or shipped Svelte styling behavior.
- Current Svelte `pnpm run build -> dist/` behavior.
- `public/dataset/**`.

## Token Contract

React tokens must be layered:

1. Primitive tokens local to the React design-system token implementation.
2. Semantic QuranAtlas tokens exposed as the only component-facing API.
3. Tailwind `@theme` variables that map to semantic tokens, not raw palettes.
4. Component variants that consume semantic token utilities or typed class
   recipes.

Required semantic namespaces:

- app canvas, surfaces, borders, text, accents, focus, danger;
- reader page background, margins, body text, muted text, selection, controls;
- bookmark, tafsir, curated metadata, reader selection, reader status;
- offline warning, storage danger, install progress, active pack, cache state;
- spacing, radius, typography, motion, shadow, z-index.

Measured reader-layout values are allowed only when they are layout invariants,
for example Mushaf page aspect, virtual row measurement, safe-area offsets, or
reader margin calculations. Every allowlisted value needs a comment or check
metadata explaining why a semantic token is not appropriate.

## Static Enforcement

Add or extend durable checks so React code rejects:

- raw hex colors outside React token files;
- built-in Tailwind color palettes in `src-react/**`;
- arbitrary Tailwind values outside the measured reader-layout allowlist;
- direct primitive-token consumption outside React semantic token files;
- inline color styles;
- one-off radius, shadow, spacing, typography, and motion literals outside the
  allowlist;
- Tailwind imports in feature/page code that bypass owned components or recipes.

The checks must run through an explicit script name and must be wired into the
React verification gate no later than child spec `07 Component Registry And Agent
Rules`. If this spec adds the check before that composite gate exists, document
the interim command and the exact child spec that will make it blocking.

## Deliverables

- React token files with semantic token namespaces.
- Tailwind v4 React integration using `@tailwindcss/vite`.
- Token usage docs under `src-react/design-system/docs/`.
- Static checks for forbidden React design literals and Tailwind drift.
- Updated `docs/tech-stack.md` for any new dependencies or scripts.
- Updated repo/context docs if new directories or checks affect routing.

## Acceptance Criteria

- React Tailwind config is scoped to the React build path and does not affect the
  shipped Svelte build.
- Tailwind theme variables map to QuranAtlas semantic tokens.
- Feature/page code cannot consume raw Tailwind palette values or arbitrary
  values without an explicit allowlist entry.
- Reader-specific tokens exist before reader components are built.
- Static checks fail on at least one representative forbidden fixture and pass on
  the approved token usage fixture.
- Current Svelte token checks remain intact.

## Verification

Run the implementation-specific commands added by this spec, plus:

```bash
pnpm run docs:check
git diff --check
```

If `package.json`, Vite config, TypeScript config, lint config, or build tooling
changes, also run:

```bash
pnpm run check
pnpm run check:react
pnpm run build:react
```

Expected result:

- React token/static checks pass.
- React build still writes only `dist-react/`.
- Existing Svelte checks and build behavior remain unchanged.
- Docs checks are clean.

## Rollback And Failure Handling

- If Tailwind integration changes the shipped Svelte CSS or build output, revert
  the integration and isolate it under the React build path.
- If static checks produce broad false positives, narrow the scanner before
  adding allowlists.
- If Tailwind docs contradict this spec, patch the master spec and this child
  spec before implementation.

## Handoff

Child spec `04 Storybook And Component Test Harness` may consume the React token
entry for story rendering. Child spec `06 Owned shadcn/Radix Component Layer`
must use the semantic token API and cannot introduce raw palette or arbitrary
Tailwind usage.
