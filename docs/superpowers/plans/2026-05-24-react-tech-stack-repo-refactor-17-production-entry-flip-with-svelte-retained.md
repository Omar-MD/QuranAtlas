# React Tech Stack Refactor 17 - Production Entry Flip With Svelte Retained Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip the production app entry from Svelte to React after readiness approval while retaining Svelte source and dependencies for rollback.

**Architecture:** Repoint production build/deploy routing to the React app and validated same-origin asset-pack set, promote the React service worker to production with rollback-safe cache choreography, and update current-state docs and agent workflows. Svelte files, tests, and dependencies remain in the repo until Wave 18.

**Tech Stack:** React, TypeScript, Vite, vite-plugin-pwa/Workbox, pnpm scripts, GitHub Actions, Cloudflare Pages/Wrangler, Playwright, Lighthouse CI, QuranAtlas dataset/asset-pack builders.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/style-map.md`
- `docs/context/implemented.md`
- `docs/context/roadmap.md`
- `docs/context/open-issues.md`
- `docs/product-info.md`
- `docs/tech-stack.md`
- `package.json`
- `vite.config.js`
- `vite.react.config.js`
- `playwright.config.js`
- `playwright.react.config.js`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `tests/unit/AGENTS.md`
- `tests/e2e/AGENTS.md`
- Master spec `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Shared handoff log `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- Child specs/plans `08A`, `16`, and Wave 16 readiness evidence

## Dependency Gates

Do not begin until:

- Wave `16` readiness evidence records `pass` for required gates.
- User/stakeholder approval for production entry flip is explicit in the current conversation or a referenced approval artifact.
- Dev/staging soak prerequisites from Wave `16` are satisfied or the user explicitly scopes this implementation to the first approved branch.
- Svelte source and dependencies are present before the flip so rollback remains available.

## File Structure

Modify:

- `package.json` - production scripts so `pnpm run build` emits the React production artifact, while retaining Svelte rollback scripts such as `build:svelte` if needed.
- `pnpm-lock.yaml` - only if script/dependency changes require lockfile updates; do not remove Svelte dependencies.
- `scripts/build-react-production-artifact.mjs` - production artifact assembler that copies only approved same-origin runtime assets into `dist/` after the React app-shell build.
- `vite.config.js`, `vite.react.config.js`, or a shared production Vite config - only to route the production entry to React and keep rollback route documented.
- React service-worker/PWA config under `src-react/**` and related Workbox files - promote production scope/cache names and migration handling.
- `playwright.config.js` and `playwright.react.config.js` - update production/e2e target routing so full gates test the flipped production entry.
- `.github/workflows/ci.yml` - make the build job upload the React production artifact and validated `/dataset/**` asset-pack set.
- `.github/workflows/deploy.yml` - deploy the verified artifact path and asset-pack set if the path changes.
- `docs/tech-stack.md`, `docs/context/repo-structure.md`, `docs/context/architecture.md`, `docs/context/source-data-flow.md`, `docs/context/implemented.md`, `docs/context/style-map.md`, generated context docs, root/scoped AGENTS, and repo-local skills - update current-state source-of-truth language.

Do not modify:

- Delete Svelte source, Svelte tests, Svelte dependencies, or Svelte rollback scripts.
- Remove compatibility data paths.
- Change product scope.
- Remove Wave 16 readiness evidence or accepted-difference history.
- Delete `public/dataset/**`, `data/**`, source catalogs, or runtime dataset contracts.

## Task 1: Approval, Docs Verification, And Rollback Preflight

**Files:**
- Read: Wave 16 readiness evidence
- Read: files listed in Required Context

- [ ] **Step 1: Confirm explicit approval**

Run:

```bash
rg -n "Approval status: approved|approved production entry flip|Wave 17 approved" docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-evidence.md
```

Expected: approval is present. If not, stop and ask the user for explicit approval before editing production entry.

- [ ] **Step 2: Re-run readiness commands before changing production entry**

Run:

```bash
pnpm run validate
pnpm run validate:react
pnpm run docs:check
git diff --check
```

Expected: Svelte and React gates pass before the flip. If a gate fails, do not change production entry.

- [ ] **Step 3: Confirm Svelte rollback source is present**

Run:

```bash
test -d src
node -e "const p=require('./package.json'); const deps={...p.dependencies,...p.devDependencies}; for (const name of ['svelte','@sveltejs/vite-plugin-svelte','svelte-check']) { if (!deps[name]) { console.error('missing '+name); process.exit(1); } }"
```

Expected: exits `0`; Svelte remains available for rollback.

- [ ] **Step 4: Fetch current docs only for new API/CLI details**

If this wave changes Vite production config, vite-plugin-pwa/Workbox behavior, Wrangler/Cloudflare Pages syntax, GitHub Actions syntax, or pnpm behavior beyond already verified patterns, run the relevant Context7 commands outside Codex's default sandbox before editing. Examples:

```bash
npx ctx7@latest library Vite "How should Vite configure a React production build output path, public asset handling, and preview command while preserving same-origin dataset assets?"
npx ctx7@latest docs /vitejs/vite/v8.0.10 "How should Vite configure a React production build output path, public asset handling, and preview command while preserving same-origin dataset assets?"
```

```bash
npx ctx7@latest library "vite-plugin-pwa" "How should vite-plugin-pwa and Workbox migrate a production service worker from one app shell to another with rollback-safe cache cleanup?"
npx ctx7@latest docs /vite-pwa/vite-plugin-pwa "How should vite-plugin-pwa and Workbox migrate a production service worker from one app shell to another with rollback-safe cache cleanup?"
```

```bash
npx ctx7@latest library "Cloudflare Workers" "How should Wrangler deploy a prebuilt Cloudflare Pages artifact with branch metadata and no rebuild?"
npx ctx7@latest docs /cloudflare/cloudflare-docs "How should Wrangler deploy a prebuilt Cloudflare Pages artifact with branch metadata and no rebuild?"
```

Expected: document API-affecting facts in the commit message or implementation notes. If Context7 quota-blocks, stop API/CLI changes until login/key is available.

## Task 2: Production Build Script Flip With Svelte Rollback Script

**Files:**
- Modify: `package.json`
- Create: `scripts/build-react-production-artifact.mjs`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Preserve Svelte build command under a rollback name**

Patch `package.json` scripts so the previous production Svelte build remains callable:

```json
{
  "scripts": {
    "build:svelte": "pnpm run data -- build && vite build",
    "preview:svelte": "vite preview --strictPort"
  }
}
```

Expected: existing Svelte build behavior is retained under explicit rollback script names.

- [ ] **Step 2: Add a guarded React production artifact assembler**

Create `scripts/build-react-production-artifact.mjs` so the production deploy directory receives approved same-origin runtime assets without letting React Vite use the repository root `public/` as an unfiltered `publicDir`:

```js
import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

const approvedPublicEntries = [
  'dataset',
  'fonts',
  'icons',
  'favicon.ico',
  'manifest.webmanifest',
  '_headers',
]

async function copyEntry(relativePath) {
  const source = path.join(root, 'public', relativePath)
  const target = path.join(dist, relativePath)
  await mkdir(path.dirname(target), { recursive: true })
  await cp(source, target, { recursive: true, force: true, errorOnExist: false })
}

await rm(path.join(dist, '.DS_Store'), { force: true })

for (const entry of approvedPublicEntries) {
  await copyEntry(entry)
}
```

Expected: the deploy artifact gets same-origin `/dataset/**`, fonts, icons, favicon, manifest, and `_headers` from an explicit allowlist. Do not copy `public/` wholesale.

- [ ] **Step 3: Flip production build to React**

Patch `package.json` so production build emits the deploy artifact from React. If Wave 01 kept React output at `dist-react/`, either make the React production config emit `dist/` for `pnpm run build` or copy the verified artifact into the deploy path through a documented script. Prefer configuring production React build to emit `dist/`:

```json
{
  "scripts": {
    "build": "pnpm run data -- build && vite build --config vite.react.config.js --outDir ../dist && node scripts/build-react-production-artifact.mjs",
    "preview": "vite preview --config vite.react.config.js --outDir ../dist --host 127.0.0.1 --port 4173 --strictPort",
    "build:react": "vite build --config vite.react.config.js",
    "preview:react": "vite preview --config vite.react.config.js --host 127.0.0.1 --port 4175 --strictPort"
  }
}
```

Expected: `pnpm run build` now produces React production output in repository-root `dist/`; `build:svelte` remains available for rollback; `build:react` continues producing the proof-only `dist-react/` output from Wave `01`. Because `vite.react.config.js` has `root: 'src-react'`, use `--outDir ../dist` for the production build, not `--outDir dist`, which would write under `src-react/dist`.

- [ ] **Step 4: Update tech-stack script table**

Update `docs/tech-stack.md` with current-state rows:

```markdown
| `pnpm run build` | Build the React production app artifact into `dist/` after the baseline data build. |
| `pnpm run build:svelte` | Build the retained Svelte rollback artifact. Not the shipped production entry after Wave `17`. |
| `pnpm run preview` | Preview the production React artifact from `dist/`. |
| `pnpm run preview:svelte` | Preview the retained Svelte rollback artifact after running `pnpm run build:svelte`. |
```

Expected: docs no longer describe Svelte as production after this task, but they explicitly say Svelte is retained for rollback.

## Task 3: Vite, Public Assets, And App/Asset Artifact Routing

**Files:**
- Modify: `vite.react.config.js`
- Modify: `vite.config.js` only if needed for rollback comments or split config
- Modify: `docs/context/source-data-flow.md`
- Modify: `docs/context/repo-structure.md`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Verify React Vite output and publicDir isolation**

Verify `vite.react.config.js` still uses the Wave `01` isolated root/public strategy:

```js
export default defineConfig({
  root: 'src-react',
  publicDir: 'public',
  build: {
    outDir: '../dist-react',
    emptyOutDir: true,
  },
})
```

Expected: React app-shell build does not copy repository `public/dataset/**` wholesale. The production `pnpm run build` script overrides the output with `--outDir ../dist`, then `scripts/build-react-production-artifact.mjs` copies approved runtime assets into `dist/`.

- [ ] **Step 2: Keep same-origin dataset generated separately**

Ensure CI build still runs:

```bash
pnpm run data -- mushaf-pages import --riwayah=qaloon --pages=1-604
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
pnpm run build
```

Expected: the final deployed `dist/` contains the React app shell plus the validated same-origin `/dataset/**` outputs required by the production reader, without React bundling Mushaf SVG bodies into JS/app-shell chunks and without using root `public/` as an unfiltered React Vite public directory.

- [ ] **Step 3: Update CI build artifact routing**

Patch `.github/workflows/ci.yml` build job only as needed. Keep artifact name `build-output` unless there is a strong reason to change deploy workflow:

```yaml
      - run: pnpm run build
      - name: Upload dist artifact
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: build-output
          path: dist/
          retention-days: 7
          if-no-files-found: error
```

Expected: CI still uploads `dist/`, but `dist/` is now the React production artifact with validated dataset assets.

- [ ] **Step 4: Update deploy workflow only if artifact path/name changed**

If CI still uploads `build-output` to `dist/`, leave `.github/workflows/deploy.yml` deploy command unchanged:

```yaml
pnpm dlx wrangler@latest pages deploy dist \
  --project-name=quranatlas \
  --branch="${TARGET_BRANCH}" \
  --commit-hash="${TARGET_SHA}"
```

Expected: deploy consumes the exact CI artifact and does not rebuild. If artifact path/name changes, update both download and deploy steps in the same commit and document it in `docs/tech-stack.md`.

## Task 4: Service-Worker Migration And Rollback Choreography

**Files:**
- Modify: React service-worker files under `src-react/**`
- Modify: React PWA config
- Create or modify: `tests/e2e/infra/react-service-worker-migration.spec.ts`
- Modify: `docs/context/architecture.md`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Define cache migration policy in code**

Patch React service-worker migration code with explicit cache allow/remove sets:

```ts
const REACT_APP_SHELL_CACHES = ['qa-react-app-shell-v1']
const COMPATIBLE_DATASET_CACHE_PREFIXES = ['qa-dataset-', 'qa-pages-']
const LEGACY_APP_SHELL_CACHE_PREFIXES = ['qa-svelte-app-shell-', 'workbox-precache-']

export async function cleanupLegacyAppShellCaches() {
  const names = await caches.keys()
  await Promise.all(
    names.map((name) => {
      if (COMPATIBLE_DATASET_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
        return Promise.resolve(false)
      }
      if (REACT_APP_SHELL_CACHES.includes(name) || LEGACY_APP_SHELL_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
        return caches.delete(name)
      }
      return Promise.resolve(false)
    }),
  )
}
```

Expected: cleanup never deletes compatible `/dataset/**` or page-pack caches needed for rollback.

- [ ] **Step 2: Add service-worker migration e2e**

Create or extend `tests/e2e/infra/react-service-worker-migration.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('@offline React service worker keeps dataset caches during app-shell migration', async ({ page }) => {
  await page.goto('#/s/1')
  await page.evaluate(async () => {
    await caches.open('qa-dataset-test-v1')
    await caches.open('qa-pages-qaloon-v1')
    await caches.open('qa-svelte-app-shell-old')
  })
  await page.reload()
  await expect(page.locator('#react-root')).toBeVisible()
  const cacheNames = await page.evaluate(() => caches.keys())
  expect(cacheNames).toContain('qa-dataset-test-v1')
  expect(cacheNames).toContain('qa-pages-qaloon-v1')
  expect(cacheNames).not.toContain('qa-svelte-app-shell-old')
})
```

Expected: test passes after migration code is wired. Adjust cache names to the actual Wave 08/08A cache names before committing.

- [ ] **Step 3: Document rollback choreography**

Add to `docs/context/architecture.md`:

```markdown
### React production service-worker migration

After Wave `17`, the React service worker owns the production app shell. It may clean stale app-shell caches, but it must retain compatible same-origin dataset and page-pack caches under `/dataset/**` so rollback to the retained Svelte entry can reuse verified reader assets. A rollback reverts the production entry/config change and redeploys the Svelte artifact through `build:svelte`; it does not delete data/source assets.
```

Expected: architecture docs explain migration and rollback without claiming Svelte source is removed.

## Task 5: Full Validation And Production Target Proof

**Files:**
- Modify: `playwright.config.js`
- Modify: `playwright.react.config.js`
- Modify: `docs/tech-stack.md`

- [ ] **Step 1: Make default Playwright production gate target flipped React entry**

After `pnpm run build` produces React, ensure the existing preview/e2e production path tests React:

```bash
PLAYWRIGHT_INCLUDE_OFFLINE=1 PLAYWRIGHT_USE_PREVIEW=1 pnpm run test:e2e
```

Expected: existing full e2e command now runs against React production build when preview mode is enabled.

- [ ] **Step 2: Keep React-specific proof gate for transition confidence**

Run:

```bash
pnpm run test:e2e:react
pnpm run visual:react
```

Expected: React-specific gates still pass. Keep these commands in `validate:react` until Wave 18 consolidates scripts.

- [ ] **Step 3: Run production build validation**

Run:

```bash
pnpm run docs
pnpm run validate
pnpm run validate:react
pnpm run test:e2e
pnpm run docs:check
git diff --check
```

Expected: production build and validation pass with React as entry. Docs generated by `pnpm run docs` are clean.

## Task 6: Docs, Context, Skills, And Agent Routing

**Files:**
- Modify: `docs/tech-stack.md`
- Modify: `docs/context/repo-structure.md`
- Modify: `docs/context/architecture.md`
- Modify: `docs/context/implemented.md`
- Modify: `docs/context/style-map.md`
- Modify: `docs/context/feature-map.md` only through `pnpm run docs`
- Modify: `AGENTS.md`
- Modify: `.agents/skills/quranatlas-workflow/SKILL.md`
- Modify: `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- Modify: `tests/unit/AGENTS.md`
- Modify: `tests/e2e/AGENTS.md`

- [ ] **Step 1: Update current stack docs**

Change `docs/tech-stack.md` so:

```markdown
| UI framework | **React** | pinned in `package.json` | Production app entry after Wave `17`; Svelte remains retained for rollback until Wave `18`. |
| Svelte rollback | **Svelte** | pinned in `package.json` | Retained source/dependency rollback path; not the production entry after Wave `17`. |
```

Expected: no text says React was production before Wave `17`, and no text says Svelte has been removed.

- [ ] **Step 2: Update repo structure**

Add or update:

```markdown
- `src-react/`: production React application source after Wave `17`.
- `src/`: retained Svelte rollback source until Wave `18`; do not delete in Wave `17`.
```

Expected: repo-structure docs route new work to React while preserving Svelte rollback availability.

- [ ] **Step 3: Update implemented/current-state docs**

Update `docs/context/implemented.md` so it says the production app is React and retains the same Reader First product scope. Include:

```markdown
## Retained rollback source

Svelte source and dependencies remain present after the React production flip for rollback only. They are not the active production implementation and are removed only by Wave `18`.
```

Expected: current-state docs are accurate after the flip.

- [ ] **Step 4: Update agent instructions**

In `AGENTS.md` and repo-local skills, route ordinary app implementation to React source and React registry after Wave `17`, while preserving explicit rollback caution:

```markdown
- After Wave `17`, React under `src-react/**` is the production source of truth.
- Do not remove Svelte source or dependencies until Wave `18`.
- Rollback work may use retained Svelte scripts and source; ordinary product work should not add new Svelte UI.
```

Expected: future agents do not continue implementing production product features in Svelte after the flip.

## Task 7: Commit And Handoff

**Files:**
- All files modified in Tasks 1-6

- [ ] **Step 1: Final gate**

Run:

```bash
pnpm run docs
pnpm run validate
pnpm run validate:react
pnpm run test:e2e
pnpm run docs:check
git diff --check
```

Expected: all pass.

- [ ] **Step 2: Confirm Svelte was retained**

Run:

```bash
test -d src
node -e "const p=require('./package.json'); const deps={...p.dependencies,...p.devDependencies}; for (const name of ['svelte','@sveltejs/vite-plugin-svelte','svelte-check']) { if (!deps[name]) { console.error('missing '+name); process.exit(1); } }"
```

Expected: exits `0`.

- [ ] **Step 3: Confirm React is production build output**

Run:

```bash
pnpm run build
node -e "const fs=require('fs'); const html=fs.readFileSync('dist/index.html','utf8'); if (!html.includes('id=\"react-root\"') || !fs.existsSync('dist/assets')) { console.error('React production artifact not identifiable'); process.exit(1); }"
```

Expected: `pnpm run build` emits the React production artifact in `dist/`.

- [ ] **Step 4: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml vite.config.js vite.react.config.js playwright.config.js playwright.react.config.js .github/workflows/ci.yml .github/workflows/deploy.yml src-react tests/e2e/infra/react-service-worker-migration.spec.ts docs/tech-stack.md docs/context/repo-structure.md docs/context/architecture.md docs/context/source-data-flow.md docs/context/implemented.md docs/context/style-map.md docs/context/feature-map.md AGENTS.md .agents/skills/quranatlas-workflow/SKILL.md .agents/skills/quranatlas-ui-workflow/SKILL.md tests/unit/AGENTS.md tests/e2e/AGENTS.md
git add scripts/build-react-production-artifact.mjs
git commit -m "feat: flip production entry to react"
```

Expected: commit keeps Svelte files and dependencies. Omit unchanged paths from `git add`.

## Reviewer Checklist

- Wave 16 approval exists before production entry changes.
- `pnpm run build` produces React production output and deploy consumes the verified artifact.
- Same-origin `/dataset/**` asset-pack set is still generated and published with the app shell.
- Service-worker migration preserves compatible dataset/page caches and has rollback smoke proof.
- Svelte source, dependencies, tests, and rollback scripts remain.
- Docs and skills say React is production after Wave 17 and Svelte is retained rollback source.
- Wave 18 is not started until soak and rollback criteria pass.
