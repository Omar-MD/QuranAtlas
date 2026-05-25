# React Tech Stack Refactor 04 - Storybook And Component Test Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a React-scoped Storybook and component-test harness for future design-system and product components.

**Architecture:** Storybook is a proof/development surface for `src-react/**`, not a visual source of truth and not part of the shipped Svelte build. Component tests live under `tests/unit/**`; app-level browser journeys stay under surface folders such as `tests/e2e/read/**`.

**Tech Stack:** Storybook React/Vite, Storybook a11y/interactions/test integration, React Testing Library, Vitest, Playwright-backed browser tests, pnpm scripts.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/context/style-map.md`
- `docs/tech-stack.md`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- `DESIGN.md`
- `package.json`
- `vite.react.config.js`
- `tsconfig.react.json`
- `src-react/design-system/index.css`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-03-tokens-tailwind-design-system-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-04-storybook-component-test-harness-spec.md`

## File Structure

Create:

- `.storybook/main.ts` - React Storybook config scoped to `src-react/**/*.stories`.
- `.storybook/preview.tsx` - QuranAtlas theme, viewport, reduced-motion, and a11y decorators.
- `.storybook/vitest.setup.ts` - Storybook/Vitest test setup.
- `src-react/design-system/docs/story-requirements.md` - story coverage rules.
- `src-react/app/App.stories.tsx` - minimal harness fixture story.
- `tests/unit/react-shell/App.test.tsx` - React Testing Library proof.
- `vitest.react.config.ts` - React component/unit test config, if existing Vitest config cannot cover TSX cleanly.

Modify:

- `package.json` - Storybook and React test scripts/dependencies.
- `docs/tech-stack.md` - new tools/scripts.
- `docs/context/repo-structure.md` - Storybook/test placement note if needed.
- `eslint.config.js` - lint `.storybook/**`, stories, and TSX tests if current lint misses them.

Do not modify:

- Svelte runtime behavior
- default Svelte build/deploy scripts
- `tests/e2e/**` placement rules
- `public/dataset/**`

## Task 1: Verify Storybook Docs And Add Scripts

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Confirm Storybook Context7 entry exists**

Run:

```bash
rg -n "### Storybook|Storybook" docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-04-storybook-component-test-harness-spec.md
```

Expected: Storybook docs are recorded and not quota-blocked. If missing, run the exact Context7 commands from the child spec before implementation.

- [ ] **Step 2: Add scripts**

Patch `package.json` with stable React-scoped names:

```json
{
  "scripts": {
    "storybook:react": "storybook dev -p 6007 --config-dir .storybook",
    "build:storybook:react": "storybook build --config-dir .storybook --output-dir storybook-static-react",
    "test:react": "vitest run --config vitest.react.config.ts",
    "test:storybook:react": "vitest run --project=storybook"
  }
}
```

Expected: default `test`, `test:e2e`, `build`, and `validate` scripts remain unchanged.

- [ ] **Step 3: Install dependencies during implementation**

Run:

```bash
pnpm add -D storybook@latest @storybook/react-vite@latest @storybook/addon-a11y@latest @storybook/addon-vitest@latest @storybook/test@latest @testing-library/react@latest @testing-library/user-event@latest
```

Expected: lockfile updates only for Storybook/React test packages and transitive dependencies.

- [ ] **Step 4: Document package/script changes in tech stack**

Add Storybook and React test rows to `docs/tech-stack.md` in the same package-change task:

```markdown
| React Storybook | **Storybook React/Vite** | versions pinned in `package.json` after Storybook install | React component development/proof surface, scoped to `src-react/**` and `storybook-static-react/` |
| React component tests | **@testing-library/react** + Vitest | versions pinned in `package.json` after React test harness install | TSX unit/component tests under `tests/unit/**`, run by `pnpm run test:react` |
| `pnpm run storybook:react` | Start React Storybook on port 6007. |
| `pnpm run build:storybook:react` | Build React Storybook into `storybook-static-react/`. |
| `pnpm run test:react` | Run React TSX unit/component tests. |
| `pnpm run test:storybook:react` | Run React Storybook interaction/component tests. |
```

Expected: package/script changes are documented before this task is considered complete.

## Task 2: Storybook Config

**Files:**
- Create: `.storybook/main.ts`
- Create: `.storybook/preview.tsx`
- Create: `.storybook/vitest.setup.ts`

- [ ] **Step 1: Create Storybook main config**

Create `.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src-react/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: [],
  viteFinal: async (config) => {
    config.publicDir = false
    return config
  },
}

export default config
```

Expected: Storybook sees React stories only and does not copy root `public/`.

- [ ] **Step 2: Create preview decorators**

Create `.storybook/preview.tsx`:

```tsx
import type { Preview } from '@storybook/react'
import '../src-react/design-system/index.css'

const preview: Preview = {
  parameters: {
    a11y: {
      test: 'error',
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile 375', styles: { width: '375px', height: '812px' } },
        smallMobile: { name: 'Small Mobile 320', styles: { width: '320px', height: '568px' } },
        tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop 1280', styles: { width: '1280px', height: '900px' } },
      },
    },
  },
  globalTypes: {
    theme: {
      toolbar: {
        title: 'Theme',
        items: ['light', 'sepia', 'dark'],
      },
      defaultValue: 'light',
    },
    reducedMotion: {
      toolbar: {
        title: 'Motion',
        items: ['default', 'reduced'],
      },
      defaultValue: 'default',
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === 'light' ? '' : String(context.globals.theme)
      document.documentElement.dataset.theme = theme
      document.documentElement.dataset.motion = String(context.globals.reducedMotion)
      return <Story />
    },
  ],
}

export default preview
```

Expected: every story can render light/sepia/dark and reduced-motion states.

- [ ] **Step 3: Create test setup**

Create `.storybook/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Expected: Storybook/Vitest assertions have DOM matchers.

## Task 3: React Unit/Component Test Harness

**Files:**
- Create: `vitest.react.config.ts`
- Create: `tests/unit/react-shell/App.test.tsx`

- [ ] **Step 1: Create React Vitest config**

Create `vitest.react.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/react-*/**/*.test.tsx', 'src-react/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@react': new URL('./src-react', import.meta.url).pathname,
    },
  },
})
```

Expected: TSX component tests run separately from Svelte unit tests.

- [ ] **Step 2: Add React shell test**

Create `tests/unit/react-shell/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../../../src-react/app/App'

describe('React App shell', () => {
  it('renders the isolated preview shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'QuranAtlas' })).toBeInTheDocument()
    expect(screen.getByText(/Svelte app remains the shipped default/i)).toBeInTheDocument()
  })
})
```

Expected: `test:react` proves React Testing Library works.

## Task 4: Minimal Story And Story Rules

**Files:**
- Create: `src-react/app/App.stories.tsx`
- Create: `src-react/design-system/docs/story-requirements.md`

- [ ] **Step 1: Add App story fixture**

Create `src-react/app/App.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react'
import { App } from './App'

const meta = {
  title: 'React Shell/App',
  component: App,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof App>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

Expected: Storybook has one fixture story to prove rendering.

- [ ] **Step 2: Add story requirements docs**

Create `src-react/design-system/docs/story-requirements.md`:

```markdown
# React Story Requirements

Storybook is proof evidence, not visual source of truth. Committed
`docs/ui-references/**` images and notes remain visual intent references where
they exist.

Level 1 primitives and Level 2 behavior components need stories for:

- default
- focus-visible
- disabled where reachable
- loading or busy where reachable
- error or invalid where reachable
- mobile and desktop viewport proof
- light, sepia, and dark themes

Level 3 product components and Level 4 page recipes also need:

- offline state
- long Arabic/translation text where relevant
- empty state
- error state
- reduced-motion proof for motion-sensitive behavior
```

Expected: later component plans have coverage rules.

## Task 5: Lint And Docs Wiring

**Files:**
- Modify: `eslint.config.js`
- Modify: `docs/tech-stack.md`
- Modify: `docs/context/repo-structure.md`

- [ ] **Step 1: Extend ESLint coverage for React harness files**

Patch `eslint.config.js` by adding a TypeScript/TSX config block for React files:

```js
...tseslint.configs.recommended.map(c => ({
  ...c,
  files: ['src-react/**/*.{ts,tsx}', 'tests/unit/react-*/**/*.tsx', '.storybook/**/*.{ts,tsx}', 'vitest.react.config.ts'],
})),
```

Expected: React TSX, stories, Storybook config, and React tests are linted.

- [ ] **Step 2: Confirm tech stack**

Confirm the rows added in Task 1 still match the final script names and dependency versions:

```markdown
| React Storybook | **Storybook React/Vite** | versions pinned in `package.json` after Storybook install | React component development/proof surface, scoped to `src-react/**` and `storybook-static-react/` |
| React component tests | **@testing-library/react** + Vitest | versions pinned in `package.json` after React test harness install | TSX unit/component tests under `tests/unit/**`, run by `pnpm run test:react` |
```

Confirm the scripts table includes:

```markdown
| `pnpm run storybook:react` | Start React Storybook on port 6007. |
| `pnpm run build:storybook:react` | Build React Storybook into `storybook-static-react/`. |
| `pnpm run test:react` | Run React TSX unit/component tests. |
| `pnpm run test:storybook:react` | Run React Storybook interaction/component tests. |
```

Expected: new tools and scripts are documented in the same change as `package.json`.

- [ ] **Step 3: Update repo structure**

Add:

```markdown
- `.storybook/`: React Storybook configuration during the dual-build period. Stories are sourced from `src-react/**` only.
- `storybook-static-react/`: generated Storybook output, not committed and not deployed.
```

Expected: no claim that Storybook is the visual source of truth.

## Task 6: Verification, Commit, And Handoff

**Files:**
- Verify: all changed files

- [ ] **Step 1: Run React harness checks**

Run:

```bash
pnpm run test:react
pnpm run build:storybook:react
pnpm run test:storybook:react
```

Expected: React unit tests pass, Storybook builds, and Storybook tests pass or report only documented per-story a11y disables.

- [ ] **Step 2: Run broader impacted checks**

Run:

```bash
pnpm run check:react
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: React and Svelte static checks remain green; docs and whitespace are clean.

- [ ] **Step 3: Confirm generated Storybook output is not staged**

Run:

```bash
git status --short storybook-static-react test-output
```

Expected: no staged files. If output directories appear untracked, remove or ignore them according to existing repo policy before commit.

- [ ] **Step 4: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml .storybook vitest.react.config.ts src-react tests/unit/react-shell eslint.config.js docs/tech-stack.md docs/context/repo-structure.md
git commit -m "feat: add react storybook and component test harness"
```

Expected: commit succeeds. Do not push.

- [ ] **Step 5: Handoff notes**

Record:

```text
Storybook:
- pnpm run storybook:react
- pnpm run build:storybook:react
React tests:
- pnpm run test:react
- pnpm run test:storybook:react
Story rules:
- src-react/design-system/docs/story-requirements.md
Verification:
- pnpm run test:react
- pnpm run build:storybook:react
- pnpm run test:storybook:react
- pnpm run check:react
- pnpm run check
- pnpm run docs:check
- git diff --check
```

Expected: child spec 05 can evaluate Storybook as a screenshot source, and child spec 06 can require stories/tests for owned components.
