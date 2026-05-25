# React Tech Stack Refactor 04 - Storybook And Component Test Harness Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-03-tokens-tailwind-design-system-spec.md`

## Purpose

Create the React Storybook and component-test harness before React UI component
specs require stories, interaction tests, accessibility checks, or viewport and
theme proof. Storybook is a verification and development surface, not the visual
source of truth.

## Current Docs Used

Context7 was used for the Storybook implementation-sensitive parts of this spec.

- Command:
  `npx ctx7@latest library Storybook "How should Storybook be configured for a React Vite TypeScript app with interaction tests, accessibility checks, viewport/theme coverage, and CI test commands?"`
- Selected library id: `/storybookjs/storybook/v10.2.9`
- Command:
  `npx ctx7@latest docs /storybookjs/storybook/v10.2.9 "How should Storybook be configured for a React Vite TypeScript app with interaction tests, accessibility checks, viewport/theme coverage, and CI test commands?"`
- Current-doc facts used:
  - Storybook provides a Vitest integration through
    `@storybook/addon-vitest/vitest-plugin`.
  - Storybook component tests can run in browser mode with Playwright-backed
    Chromium.
  - Storybook test setup can include a project setup file such as
    `.storybook/vitest.setup.ts`.
  - Storybook accessibility testing can be integrated through the a11y addon or
    test-runner hooks that run axe checks.

## Scope

In scope:

- Add React Storybook configuration for `src-react/**`.
- Add a Storybook script that is explicitly React-scoped.
- Add a Storybook build/test command that does not affect shipped Svelte output.
- Add Storybook interaction test support.
- Add accessibility checks for stories.
- Add viewport and theme decorators or globals for QuranAtlas required states.
- Define story requirements for primitives, product components, page recipes,
  offline states, loading states, error states, long text, and reduced motion.
- Define component-test placement under `tests/unit/**`.
- Add a React unit/component test command named `test:react`, including
  `.test.tsx` coverage and React Testing Library or an equivalent
  current-docs-verified harness.

Out of scope:

- Adding product UI components beyond minimal harness fixtures.
- Choosing a visual regression provider. That belongs to child spec `05`.
- Treating Storybook snapshots or screenshots as visual source of truth.
- Moving browser journey tests out of `tests/e2e/<surface>/**`.
- Changing the shipped Svelte Storybook setup, if one later exists, without a
  separate child spec.

## Required Reads

- `AGENTS.md`
- `docs/context/repo-structure.md`
- `docs/context/style-map.md`
- `docs/tech-stack.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- `DESIGN.md`
- Parent master spec
- Child specs `00`, `01`, and `03`

## Allowed Files And Directories

Allowed create:

- `.storybook/**` or a React-scoped Storybook config directory if the
  implementation chooses to isolate it.
- `src-react/**/*.stories.@(ts|tsx|mdx)` for harness fixtures and later stories.
- Storybook setup files.
- React component test config files.
- Unit/component tests under `tests/unit/**`.

Allowed modify:

- `package.json` for React Storybook scripts and dependencies.
- Vite/Vitest config only if Storybook test integration requires it and Svelte
  tests remain stable.
- `docs/tech-stack.md` for new scripts, tools, pinned versions, or CI gates.
- Repo/context docs when the new Storybook surface changes repo structure.

Forbidden modify:

- Existing Svelte runtime behavior.
- Existing Svelte build/deploy scripts.
- `tests/e2e/**` placement rules.
- `public/dataset/**`.

## Harness Contract

Storybook must support:

- light, sepia, and dark themes;
- mobile, tablet, and desktop viewport presets matching QuranAtlas breakpoints;
- reduced-motion state;
- loading, empty, error, offline, disabled, active, and long-text states;
- RTL/Arabic text rendering fixtures where reader components need them;
- keyboard/focus interaction proof for accessible primitives;
- install/offline progress states with screen-reader status labels.

Storybook stories demonstrate state coverage. They do not replace:

- committed `docs/ui-references/**` visual-intent references;
- Playwright app-level golden routes;
- service-worker/offline e2e journeys;
- surface-owned unit tests.

## Story Requirements

Every Level 1 primitive and Level 2 behavior component must include stories for:

- default;
- focus-visible;
- disabled where applicable;
- loading or busy where applicable;
- error or invalid where applicable;
- mobile and desktop viewport proof;
- theme variants.

Every Level 3 product component and Level 4 page recipe must additionally
include relevant offline, long-text, empty, and error states.

## Deliverables

- React Storybook config.
- React Storybook scripts.
- Storybook browser/component test command.
- Accessibility integration for stories.
- Viewport/theme decorators or globals.
- Minimal harness fixture stories proving the setup.
- Updated docs and tech-stack entries for new tools/scripts.

## Acceptance Criteria

- Storybook runs against React files without requiring the Svelte app to build.
- Storybook tests run in a browser environment using Playwright-backed Chromium
  or a documented equivalent from current Storybook docs.
- Accessibility checks run for story coverage unless explicitly disabled per
  story with rationale.
- Viewport and theme states are available to all stories.
- Unit/component test placement remains under `tests/unit/**`.
- Storybook artifacts are described as proof evidence, not visual source of
  truth.
- React `.tsx` unit/component tests run through a stable command and include a
  negative/positive harness fixture so later specs can target it.

## Verification

Run the Storybook commands created by the implementation. The expected command
names should be stable and documented, for example:

```bash
pnpm run storybook:react -- --ci
pnpm run test:react
pnpm run test:storybook:react
pnpm run docs:check
git diff --check
```

If package scripts, config, or dependency graph changes, also run:

```bash
pnpm run check
```

Expected result:

- Storybook starts or builds in CI mode.
- React unit/component harness passes and includes `.test.tsx` files.
- Storybook/component tests pass.
- Accessibility story checks pass or report only documented per-story disables.
- Existing Svelte verification remains unchanged.

## Rollback And Failure Handling

- If Storybook config interferes with Svelte Vite config, isolate it under a
  React-specific config path.
- If browser component tests are flaky, reduce fixture scope before widening
  timeouts.
- If a11y checks require temporary disables, document each disable on the story
  and add a follow-up acceptance criterion to remove it.

## Handoff

Child spec `05 Visual Regression Provider Selection` may use the Storybook build
as one candidate screenshot source. Child spec `06 Owned shadcn/Radix Component
Layer` must add stories and interaction tests through this harness.
