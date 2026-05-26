# React Tech Stack Refactor 01 - React App Shell And Dual Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated React app shell and non-deploy dual-build path while preserving the current Svelte build, preview, validation, and deploy artifact.

**Architecture:** Create `src-react/` with its own Vite config, TypeScript config, scripts, e2e config, and import-boundary check. Keep `pnpm run dev`, `pnpm run build`, `pnpm run preview`, `pnpm run validate`, `dist/`, and deploy workflow behavior owned by the current Svelte app until cutover.

**Tech Stack:** React, React DOM, TypeScript, Vite, Vitest/Playwright-ready config, Node.js ESM checks, pnpm scripts, Markdown docs.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/tech-stack.md`
- `package.json`
- `tsconfig.json`
- `eslint.config.js`
- `vite.config.js`
- `playwright.config.js`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`

## File Structure

Create:

- `src-react/index.html` - React-only HTML entry.
- `src-react/app/App.tsx` - minimal app shell.
- `src-react/app/main.tsx` - React root bootstrap.
- `src-react/app/providers/AppProviders.tsx` - provider composition shell.
- `src-react/app/router/routes.ts` - hash route constants and initial route helper.
- `src-react/styles/index.css` - minimal React shell CSS, later replaced by design-system entry.
- `src-react/public/.gitkeep` - React-scoped public directory so repo `public/` is not copied wholesale.
- `vite.react.config.js` - React-only Vite config.
- `tsconfig.react.json` - React-only TS config.
- `playwright.react.config.js` - React-only smoke e2e config.
- `tests/e2e/react-shell/smoke.spec.ts` - React smoke proof under tests, not under `src-react/test`.
- `scripts/check-react-boundaries.mjs` - durable Svelte/React import-boundary check.

Modify:

- `package.json` - add non-deploy React scripts and dependencies after docs verification.
- `eslint.config.js` - lint `src-react/**/*.ts?(x)` and enforce import boundaries if using ESLint rules.
- `docs/tech-stack.md` - document new scripts, dependencies, output path, and dual-build rule.
- `docs/context/repo-structure.md` - document `src-react/`, `dist-react/`, and test placement.
- `docs/context/architecture.md` - document dual-app boundary and shipped Svelte default.
- `AGENTS.md` - only if future React routing instructions need explicit local workflow text.

Do not modify:

- Svelte source behavior under `src/**`
- `vite.config.js` behavior for shipped Svelte build except shared lint config imports if unavoidable
- `.github/workflows/deploy.yml` artifact routing
- `public/dataset/**`

## Task 1: Package Scripts And Dependencies

**Files:**
- Modify: `package.json`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Confirm Context7 decisions exist**

Run:

```bash
rg -n "### React|### Vite" docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md
```

Expected: React and Vite appendix entries exist and are not quota-blocked.

- [ ] **Step 2: Add React scripts**

Patch `package.json` with these script names while leaving existing Svelte scripts unchanged:

```json
{
  "scripts": {
    "dev:react": "vite --config vite.react.config.js --host 127.0.0.1 --port 5174 --strictPort",
    "build:react": "vite build --config vite.react.config.js",
    "preview:react": "vite preview --config vite.react.config.js --host 127.0.0.1 --port 4175 --strictPort",
    "typecheck:react": "tsc --project tsconfig.react.json --noEmit",
    "lint:react": "eslint src-react/ tests/e2e/react-shell/ playwright.react.config.js vite.react.config.js",
    "check:react": "pnpm run typecheck:react && pnpm run lint:react && node scripts/check-react-boundaries.mjs",
    "test:e2e:react": "playwright test --config playwright.react.config.js"
  }
}
```

Expected: exact script names exist and default Svelte scripts are unchanged.

- [ ] **Step 3: Install dependencies during implementation**

Run only during implementation, after React and Vite docs are verified:

```bash
pnpm add react@latest react-dom@latest
pnpm add -D @vitejs/plugin-react@latest @types/react@latest @types/react-dom@latest
```

Expected: `package.json` and `pnpm-lock.yaml` update for React, React DOM, Vite React plugin, and React types only. If install fails from sandbox DNS/network errors, rerun outside the sandbox with approval.

- [ ] **Step 4: Document package/script changes in tech stack**

Add rows to `docs/tech-stack.md` in the same package-change task:

```markdown
| React | **React** + **React DOM** | versions pinned in `package.json` after `pnpm add react@latest react-dom@latest` | Isolated preview app under `src-react/**`; not shipped until cutover |
| React ↔ Vite | **@vitejs/plugin-react** | version pinned in `package.json` after `pnpm add -D @vitejs/plugin-react@latest` | React-only Vite integration in `vite.react.config.js` |
| `pnpm run dev:react` | Start the isolated React preview app on port 5174. Non-deploy during dual-build. |
| `pnpm run build:react` | Build the isolated React app into `dist-react/`. This artifact is proof-only until cutover and is not deployed. |
| `pnpm run preview:react` | Serve `dist-react/` on port 4175. |
| `pnpm run typecheck:react` | Run TypeScript over `src-react/**/*.ts?(x)` only. |
| `pnpm run lint:react` | Lint the React tree and React-specific config/test files. |
| `pnpm run check:react` | Run React typecheck, lint, and import-boundary checks. |
| `pnpm run test:e2e:react` | Run React-only Playwright smoke specs against the React server. |
```

Expected: package/script changes and their non-deploy status are documented before this task is considered complete.

## Task 2: React Shell Files

**Files:**
- Create: `src-react/index.html`
- Create: `src-react/app/main.tsx`
- Create: `src-react/app/App.tsx`
- Create: `src-react/app/providers/AppProviders.tsx`
- Create: `src-react/app/router/routes.ts`
- Create: `src-react/styles/index.css`
- Create: `src-react/public/.gitkeep`

- [ ] **Step 1: Create React HTML entry**

Create `src-react/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>QuranAtlas React Preview</title>
  </head>
  <body>
    <div id="react-root"></div>
    <script type="module" src="/app/main.tsx"></script>
  </body>
</html>
```

Expected: React uses `#react-root`; Svelte `index.html` and `#app` stay untouched.

- [ ] **Step 2: Create route helper**

Create `src-react/app/router/routes.ts`:

```ts
export const REACT_ROUTES = {
  home: '#/s/1',
  onboarding: '#/onboarding',
  surah: (surah: number, ayah?: number) => ayah ? `#/s/${surah}/${ayah}` : `#/s/${surah}`,
  mushaf: (page: number) => `#/m/${page}`,
  surahs: '#/surahs',
  bookmarks: '#/bookmarks',
  settings: '#/settings',
  assets: '#/assets',
  about: '#/about',
} as const

export function getInitialReactHash(hash = window.location.hash): string {
  return hash || REACT_ROUTES.home
}
```

Expected: no Svelte imports and no full router implementation yet.

- [ ] **Step 3: Create provider shell**

Create `src-react/app/providers/AppProviders.tsx`:

```tsx
import type { ReactNode } from 'react'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return children
}
```

Expected: provider composition has a stable owner without adding state libraries.

- [ ] **Step 4: Create minimal app**

Create `src-react/app/App.tsx`:

```tsx
import { useMemo } from 'react'
import { getInitialReactHash } from './router/routes'

export function App() {
  const initialRoute = useMemo(() => getInitialReactHash(), [])

  return (
    <main className="qa-react-shell" data-react-route={initialRoute}>
      <p className="qa-react-shell__eyebrow">React preview</p>
      <h1 className="qa-react-shell__title">QuranAtlas</h1>
      <p className="qa-react-shell__body">
        Isolated React shell. The Svelte app remains the shipped default until cutover.
      </p>
    </main>
  )
}
```

Expected: app renders a smoke-testable shell and states the dual-build rule.

- [ ] **Step 5: Create React bootstrap**

Create `src-react/app/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProviders } from './providers/AppProviders'
import '../styles/index.css'

const container = document.getElementById('react-root')

if (!container) {
  throw new Error('React root element #react-root was not found.')
}

const root = createRoot(container)

root.render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount()
  })
}
```

Expected: uses React docs bootstrap pattern and cleanly unmounts during HMR.

- [ ] **Step 6: Create minimal scoped CSS**

Create `src-react/styles/index.css`:

```css
:root {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: #1f1b16;
  background: #f8f2e7;
}

body {
  margin: 0;
  min-width: 320px;
}

.qa-react-shell {
  box-sizing: border-box;
  min-height: 100vh;
  display: grid;
  align-content: center;
  gap: 0.75rem;
  padding: 2rem;
}

.qa-react-shell__eyebrow,
.qa-react-shell__body {
  margin: 0;
  max-width: 34rem;
}

.qa-react-shell__title {
  margin: 0;
  font-size: 2rem;
  line-height: 1.1;
}
```

Expected: this temporary CSS is scoped to React and will be replaced/absorbed by the token plan. It does not touch `src/styles/**`.

- [ ] **Step 7: Add React public directory sentinel**

Create empty file `src-react/public/.gitkeep`.

Expected: React Vite `publicDir` can point here without copying root `public/`.

## Task 3: React Build Config

**Files:**
- Create: `vite.react.config.js`
- Create: `tsconfig.react.json`

- [ ] **Step 1: Create React Vite config**

Create `vite.react.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src-react',
  publicDir: 'public',
  plugins: [react()],
  build: {
    outDir: '../dist-react',
    emptyOutDir: true,
    target: 'es2020',
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4175,
    strictPort: true,
  },
})
```

Expected: output is `dist-react/`; root public assets come only from `src-react/public`.

- [ ] **Step 2: Create React TS config**

Create `tsconfig.react.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src-react/**/*.ts", "src-react/**/*.tsx", "vite.react.config.js"],
  "exclude": ["node_modules", "dist", "dist-react"]
}
```

Expected: React typecheck does not include Svelte files.

## Task 4: Import Boundary Check

**Files:**
- Create: `scripts/check-react-boundaries.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add durable boundary scanner**

Create `scripts/check-react-boundaries.mjs`:

```js
import { readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const repoRoot = new URL('..', import.meta.url).pathname
const checkedExtensions = new Set(['.js', '.ts', '.tsx', '.svelte'])
const importPattern = /(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(path))
    } else if (checkedExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }
  return files
}

function isForbidden(sourcePath, specifier) {
  const source = relative(repoRoot, sourcePath)
  if (source.startsWith('src-react/') && (specifier.startsWith('../src/') || specifier.startsWith('../../src/') || specifier.startsWith('/src/') || specifier.startsWith('src/'))) {
    return 'React code must not import Svelte app modules.'
  }
  if (source.startsWith('src/') && (specifier.includes('src-react/') || specifier.startsWith('../src-react/') || specifier.startsWith('../../src-react/') || specifier.startsWith('/src-react/'))) {
    return 'Svelte code must not import React app modules.'
  }
  return null
}

const files = [
  ...await walk(join(repoRoot, 'src')),
  ...await walk(join(repoRoot, 'src-react')),
]

const failures = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2]
    const reason = isForbidden(file, specifier)
    if (reason) {
      failures.push(`${relative(repoRoot, file)} imports ${specifier}: ${reason}`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('react-boundaries: ok')
```

Expected: script checks both trees and allows future framework-neutral modules outside both trees.

- [ ] **Step 2: Run boundary check**

Run:

```bash
node scripts/check-react-boundaries.mjs
```

Expected: prints `react-boundaries: ok`.

## Task 5: React E2E Smoke Config

**Files:**
- Create: `playwright.react.config.js`
- Create: `tests/e2e/react-shell/smoke.spec.ts`

- [ ] **Step 1: Create React Playwright config**

Create `playwright.react.config.js`:

```js
import { defineConfig, devices } from '@playwright/test'

const REACT_PORT = 5174
const REACT_BASE_URL = `http://127.0.0.1:${REACT_PORT}`

export default defineConfig({
  testDir: './tests/e2e/react-shell',
  outputDir: './test-output/react-traces',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { outputFolder: './test-output/react-report' }]],
  use: {
    baseURL: REACT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
  },
  projects: [
    {
      name: 'react-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm run dev:react`,
    url: REACT_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

Expected: this config cannot accidentally run against the Svelte server.

- [ ] **Step 2: Create smoke spec**

Create `tests/e2e/react-shell/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('renders the isolated React shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'QuranAtlas' })).toBeVisible()
  await expect(page.getByText('Svelte app remains the shipped default')).toBeVisible()
  await expect(page.locator('#react-root')).toBeVisible()
})
```

Expected: e2e proof is browser-only and placed under `tests/e2e/**`.

## Task 6: Docs Updates

**Files:**
- Modify: `docs/tech-stack.md`
- Modify: `docs/context/repo-structure.md`
- Modify: `docs/context/architecture.md`

- [ ] **Step 1: Confirm tech stack scripts table**

Confirm the rows added in Task 1 still match the final script names and dependency versions:

```markdown
| `pnpm run dev:react` | Start the isolated React preview app on port 5174. Non-deploy during dual-build. |
| `pnpm run build:react` | Build the isolated React app into `dist-react/`. This artifact is proof-only until cutover and is not deployed. |
| `pnpm run preview:react` | Serve `dist-react/` on port 4175. |
| `pnpm run typecheck:react` | Run TypeScript over `src-react/**/*.ts?(x)` only. |
| `pnpm run lint:react` | Lint the React tree and React-specific config/test files. |
| `pnpm run check:react` | Run React typecheck, lint, and import-boundary checks. |
| `pnpm run test:e2e:react` | Run React-only Playwright smoke specs against the React server. |
```

Expected: existing `pnpm run build -> dist/` description remains unchanged as the shipped artifact, and React dependencies/scripts are documented in the same change as `package.json`.

- [ ] **Step 2: Update repo structure**

Add `src-react/` and `dist-react/` to `docs/context/repo-structure.md`:

```markdown
- `src-react/`: isolated future React app tree. It must not import Svelte app modules under `src/**`.
- `dist-react/`: proof-only React build output during dual-build. It is not a deploy artifact until an approved cutover plan changes production routing.
```

Expected: tests remain documented under `tests/unit/**` and `tests/e2e/**`.

- [ ] **Step 3: Update architecture**

Add a short dual-build note to `docs/context/architecture.md`:

```markdown
## Dual-Build React Preview

During the React rebuild, the shipped app remains the Svelte app under `src/**`.
React lives under `src-react/**`, builds with `vite.react.config.js`, and writes
to `dist-react/` through explicit `*:react` scripts. `dist/` remains the only
deployable artifact until a cutover spec changes production entry routing.
Neither app tree may import the other; shared runtime code must live in a
framework-neutral location with typed interfaces and tests.
```

Expected: current Svelte boot flow text remains authoritative for shipped app.

## Task 7: Verification, Commit, And Handoff

**Files:**
- Verify all created/modified files

- [ ] **Step 1: Run React proof**

Run:

```bash
pnpm run build:react
pnpm run check:react
pnpm run test:e2e:react
```

Expected: `dist-react/` is created, React static checks pass, and the smoke e2e passes against the React server.

- [ ] **Step 2: Run Svelte/default proof**

Run:

```bash
pnpm run build
pnpm run check
pnpm run docs:check
git diff --check
```

Expected: Svelte build still writes `dist/`; default checks pass; docs are clean; whitespace is clean.

- [ ] **Step 3: Confirm no dataset pages were copied into React output**

Run:

```bash
test ! -e dist-react/dataset/mushaf-pages
test ! -e dist-react/dataset/riwayat
```

Expected: both tests pass. If either path exists, fix `publicDir`/copy behavior before proceeding.

- [ ] **Step 4: Confirm deploy still targets `dist/`**

Run:

```bash
rg -n "dist-react|wrangler pages deploy dist" .github/workflows/deploy.yml .github/workflows/ci.yml
```

Expected: no `dist-react` deploy usage; deploy still uses `dist`.

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml src-react vite.react.config.js tsconfig.react.json playwright.react.config.js scripts/check-react-boundaries.mjs tests/e2e/react-shell docs/tech-stack.md docs/context/repo-structure.md docs/context/architecture.md
git commit -m "feat: add isolated react dual-build shell"
```

Expected: commit succeeds. Do not push.

- [ ] **Step 6: Handoff notes**

Record:

```text
React ports:
- dev: 5174
- preview: 4175
Outputs:
- Svelte shipped: dist/
- React proof-only: dist-react/
Verification:
- pnpm run build:react
- pnpm run check:react
- pnpm run test:e2e:react
- pnpm run build
- pnpm run check
- pnpm run docs:check
- git diff --check
Known limitations:
- React shell only; no service worker, product routes, or shared runtime extraction yet.
```

Expected: child spec 02 and 03 implementers can build on the shell without changing shipped Svelte behavior.
