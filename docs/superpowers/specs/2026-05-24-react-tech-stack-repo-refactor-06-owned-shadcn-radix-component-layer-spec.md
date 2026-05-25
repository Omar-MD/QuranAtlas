# React Tech Stack Refactor 06 - Owned shadcn/Radix Component Layer Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-03-tokens-tailwind-design-system-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-04-storybook-component-test-harness-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-selection-spec.md`

## Purpose

Create the first owned React component layer for QuranAtlas. The layer may use
shadcn/ui as copied source and Radix UI as the behavior primitive source, but
QuranAtlas owns the resulting code, APIs, tokens, tests, stories, accessibility
expectations, and maintenance rules.

## Current Docs Used

Context7 was used for the shadcn/ui ownership and configuration-sensitive parts
of this spec.

- Command:
  `npx ctx7@latest library "shadcn/ui" "How should shadcn/ui copied-owned React components be added, customized, composed with Radix UI primitives, and maintained in a React Vite TypeScript app with Tailwind CSS v4 and a component registry?"`
- Selected library id: `/websites/ui_shadcn`
- Command:
  `npx ctx7@latest docs /websites/ui_shadcn "How should shadcn/ui copied-owned React components be added, customized, composed with Radix UI primitives, and maintained in a React Vite TypeScript app with Tailwind CSS v4 and a component registry?"`
- Current-doc facts used:
  - shadcn/ui components are copied into the app and become project-owned code.
  - `components.json` records project settings such as TypeScript/TSX, RSC
    mode, Tailwind CSS entry, CSS variables, aliases, UI path, utility path,
    and icon library.
  - The documented manual configuration supports `rsc: false`, `tsx: true`,
    CSS-variable theming, aliases for `components`, `ui`, `lib`, `utils`, and
    `hooks`, and `lucide` as an icon library.
  - shadcn/ui supports a Tailwind class prefix when a project needs to avoid
    utility collisions.

Radix UI API details are not locked by this spec. If the implementation plan
uses exact Radix package names, component parts, data attributes, or focus
behavior, fetch current Radix UI docs through Context7 before writing that plan.

QuranAtlas adds stricter local rules than shadcn/ui itself: copied code must be
rewritten to semantic QuranAtlas tokens, registered in the component registry,
covered by tests and stories, and wrapped so feature/page code does not import
Radix primitives directly.

## Scope

In scope:

- Add the owned primitive and behavior component layer under
  `src-react/components/ui/**` or the equivalent path established by child spec
  `01`.
- Add or update `components.json` for a React Vite TypeScript app with
  `rsc: false`, `tsx: true`, React-scoped aliases, CSS-variable theming, and
  QuranAtlas token paths.
- Add a local component utility for class composition and variants.
- Add initial Level 1 primitives and Level 2 behavior wrappers.
- Replace raw copied palette, radius, shadow, motion, and arbitrary Tailwind
  values with the semantic token layer from child spec `03`.
- Add tests, stories, accessibility proof, and visual-regression proof required
  by child specs `04` and `05`.
- Add static checks that forbid direct Radix imports outside the owned component
  layer.

Out of scope:

- Building product reader components beyond small fixtures needed to prove the
  primitives.
- Adding page recipes.
- Rebuilding Svelte UI.
- Changing current Svelte CSS, scripts, service worker, or deploy behavior.
- Treating shadcn/ui upstream code as a package dependency that remains
  authoritative after copy-in.

## Required Reads

- `AGENTS.md`
- `DESIGN.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/style-map.md`
- `docs/tech-stack.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `00`, `03`, `04`, and `05`

## Allowed Files And Directories

Allowed create:

- `components.json`
- `src-react/components/ui/**`
- `src-react/design-system/utils/**` or equivalent helper path
- `src-react/design-system/docs/components.md`
- `src-react/**/*.stories.@(ts|tsx|mdx)`
- Unit/component tests under `tests/unit/**`
- React static-check scripts under `scripts/` when durable and wired into a
  documented check command

Allowed modify:

- React Vite, TypeScript, Vitest, Storybook, or alias config only to support the
  owned component layer.
- `package.json` for React component dependencies, scripts, or check commands.
- `docs/tech-stack.md` if dependencies, scripts, dev tools, or CI gates change.
- `docs/context/repo-structure.md` if component paths are introduced.
- Root `AGENTS.md` or repo-local skills only if future React component routing
  changes.

Forbidden modify:

- Existing Svelte source behavior.
- Existing Svelte style source under `src/styles/**`.
- Current Svelte build/deploy scripts.
- `public/dataset/**`.
- Generated context fences by hand.

## Component Contract

Create the component layer in maturity order:

1. Level 1 primitives: `Button`, `IconButton`, `Input`, `Textarea`, `Select`,
   `SegmentedControl`, `Checkbox`, `Switch`, `Slider`, `Badge`, `Progress`,
   `Spinner`, `Tooltip`.
2. Level 2 behavior wrappers: `Dialog`, `Sheet`, `Popover`, `DropdownMenu`,
   `Tabs`, `Accordion`, `Toast`, `Command`, and focus-sensitive disclosure
   helpers.

Each component must expose a narrow typed API. Feature code should pass intent,
variant, size, disabled/busy state, selected value, event handlers, and children;
it should not pass raw Radix parts, arbitrary Tailwind class fragments, or
inline design values.

Direct Radix imports are allowed only inside owned behavior wrappers. Direct
shadcn/ui copy-in is allowed only as a starting point for owned QuranAtlas
components; copied files must be normalized before they are considered
deliverable.

## Styling Contract

Components may use Tailwind only through the React design-system token mapping
from child spec `03`.

Allowed:

- semantic token utilities;
- component variant helpers;
- measured reader-layout allowlist values when the component is explicitly a
  reader primitive;
- CSS variables owned by `src-react/design-system/tokens/**`.

Forbidden:

- built-in Tailwind palette classes;
- arbitrary values without allowlist metadata;
- raw hex colors;
- primitive-token consumption outside semantic token files;
- one-off shadows, radii, spacing, typography, and motion;
- inline styles for visual design decisions.

## Accessibility Contract

Every interactive component must prove:

- keyboard reachability and operation;
- visible focus state through semantic focus tokens;
- accessible names for icon-only controls;
- disabled and busy semantics;
- no focus trap leaks for modal and sheet behavior;
- reduced-motion behavior where motion exists;
- status or live-region semantics for progress where relevant.

Radix behavior may be wrapped, but must not be bypassed without a documented
replacement behavior and tests.

## Deliverables

- `components.json` configured for the React app tree.
- Owned UI primitives and behavior wrappers.
- Component utility functions for class composition and variants.
- Stories for required states.
- Unit/component tests for API behavior and accessibility-sensitive state.
- Static check forbidding direct Radix imports outside owned wrappers.
- Docs explaining ownership, allowed extension points, and copy-in policy.
- Updated tech-stack/context docs for new dependencies, scripts, paths, or
  checks.

## Acceptance Criteria

- Components are owned local source, not opaque upstream package usage.
- Feature/page code cannot import Radix directly.
- Copied components consume QuranAtlas semantic tokens rather than upstream
  default palette values.
- Every delivered component has a story, test, and registry handoff note.
- Storybook accessibility checks and relevant interaction tests pass.
- Visual regression proof uses the provider selected by child spec `05` or the
  approved temporary local-proof path.
- Current Svelte app behavior remains unchanged.

## Verification

Run the component-specific commands introduced by implementation, plus:

```bash
pnpm run docs:check
git diff --check
```

If package scripts, dependencies, Vite config, Storybook config, TypeScript
config, or static checks change, also run:

```bash
pnpm run check
pnpm run check:react
pnpm run build:react
pnpm run test:react
pnpm run test:storybook:react
```

Expected result:

- React component tests and Storybook tests pass.
- React static/type gates pass for delivered components.
- Direct-Radix-import and design-literal checks pass.
- React build remains isolated to `dist-react/`.
- Existing Svelte verification remains unchanged.
- Docs checks are clean.

## Rollback And Failure Handling

- If copied shadcn/ui code conflicts with QuranAtlas token rules, normalize the
  copied component before adding more components.
- If a Radix wrapper cannot preserve accessibility behavior, stop and fetch the
  current Radix docs before choosing a replacement behavior.
- If a component API starts accepting raw class fragments for normal use, split
  the missing variant into the owned API instead.
- If Storybook or visual proof is not available, keep the component local to the
  harness fixture and do not allow product usage.

## Handoff

Child spec `07 Component Registry And Agent Rules` must register every
component delivered here before feature specs can compose it. Later product
component and page recipe specs may extend this layer only by adding tests,
stories, registry entries, docs, and static-check coverage in the same change.
