# React Tech Stack Refactor 05 - Visual Regression Provider Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Select and document the React rebuild visual regression strategy with privacy, determinism, baseline update, and CI-gating rules before React UI work graduates beyond local proof.

**Architecture:** Start as a decision document using Context7/official docs for shortlisted providers. Only wire tooling after selection, and keep snapshots as regression evidence only; they do not replace Svelte baseline fixtures or committed UI references.

**Tech Stack:** Context7 CLI, Markdown decision appendix, optional Playwright screenshot baselines or selected provider CLI, Storybook build, pnpm scripts.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `DESIGN.md`
- `docs/context/repo-structure.md`
- `docs/context/style-map.md`
- `docs/context/architecture.md`
- `docs/context/source-data-flow.md`
- `docs/tech-stack.md`
- `tests/e2e/AGENTS.md`
- `docs/ui-references/README.md` and relevant `docs/ui-references/**` notes
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-04-storybook-component-test-harness-spec.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-selection-spec.md`

## File Structure

Create:

- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md` - provider comparison, docs appendix, selected strategy, privacy/retention, baseline policy, initial screenshot scope, CI/local commands.

Create only if selected strategy requires local wiring:

- `tests/e2e/react-visual/*.spec.ts` - Playwright visual route/source smoke specs.
- `playwright.visual.react.config.js` - React visual screenshot config.
- `tests/e2e/react-visual/README.md` - baseline update policy if in-repo screenshots are selected.

Modify only if provider tooling is wired:

- `package.json`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `.storybook/**`
- `playwright.react.config.js` or new visual config
- `docs/tech-stack.md`

Do not modify:

- Product UI implementation
- `docs/ui-references/**` solely to accept snapshot drift
- deploy artifact routing
- runtime upstream data fetching
- `public/dataset/**`

## Task 1: Current Docs Discovery

**Files:**
- Create/modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md`

- [ ] **Step 1: Create decision document skeleton**

Create:

```markdown
# React Tech Stack Refactor 05 - Visual Regression Provider Decision

## Status

Decision owner: React rebuild Wave 1.
Selected strategy: unresolved until Task 2 scores the candidates in this same execution.
Provider snapshots are regression evidence only. They do not replace
`docs/ui-references/**`, the Svelte reference baseline, Storybook interaction
tests, Playwright journey tests, or accessibility gates.

## Context7 / Official Docs Appendix

| Candidate | Context7 library id | Query | Retrieved | Fallback source | Notes |
| --- | --- | --- | --- | --- | --- |

## Candidate Comparison

| Candidate | Privacy / retention | Local reproduction | Storybook support | Playwright route support | Determinism controls | CI / PR review | Cost / runtime | Risks | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Selected Strategy

Task 2 replaces this line with the selected strategy, rationale, and rejected alternatives.

## Privacy And Retention Policy

Task 3 replaces this line with the selected strategy's privacy and retention policy.

## Baseline Update Policy

Task 3 replaces this line with the baseline review and update policy.

## Initial Screenshot Scope

Task 3 replaces this line with the initial story and route screenshot scope.

## CI And Local Reproduction Plan

Task 4 replaces this line when tooling is wired; otherwise the decision-only handoff records the planned command and wiring owner.
```

Expected: decision doc exists before provider scoring.

- [ ] **Step 2: Run Context7 for candidates**

Run outside the default sandbox. Do not exceed three commands per provider question:

```bash
npx ctx7@latest library Chromatic "How does Chromatic handle Storybook visual testing, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review?"
npx ctx7@latest library Percy "How does Percy handle Storybook or Playwright visual testing, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review?"
npx ctx7@latest library Argos "How does Argos visual testing handle Playwright or Storybook screenshots, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review?"
npx ctx7@latest library Loki "How does Loki handle Storybook screenshot visual regression, deterministic assets, baseline updates, CI gating, and local reproduction?"
npx ctx7@latest library Playwright "How should Playwright screenshot baselines be configured for deterministic visual regression, baseline updates, CI gating, multiple viewports, and local reproduction?"
npx ctx7@latest docs /microsoft/playwright "How should Playwright screenshot baselines be configured for deterministic visual regression, baseline updates, CI gating, multiple viewports, and local reproduction?"
```

For each provider library command that returns a viable `/org/project` id, immediately run the matching docs command with the same query and the selected id. Expected: selected library ids and facts are recorded. If Context7 quota-blocks, record the exact failure and stop provider selection. If Context7 has no coverage after the required workflow, record the failure and cite official provider docs as fallback.

## Task 2: Score Candidates

**Files:**
- Modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md`

- [ ] **Step 1: Fill candidate comparison table**

Score at least Chromatic, Percy, Argos, Playwright screenshot baselines, and Loki. Use this scoring key:

```markdown
Score key: 3 = strong fit, 2 = workable with constraints, 1 = weak fit, 0 = blocker.
```

Fill every cell with concise current-doc facts. Include:

```markdown
- privacy and retention for Quran text, Mushaf pages, source labels, offline states, and user-like seeded data;
- local-only or self-hosted viability;
- deterministic font and same-origin asset setup;
- mobile, tablet, desktop, dark, sepia, reduced-motion, awkward viewport coverage;
- Storybook and Playwright source support;
- CI cost/runtime;
- flake and retry behavior;
- baseline update workflow;
- PR review ergonomics;
- branch policy for `dev`, `staging`, and `main`;
- ability to block merges without deploying React artifacts.
```

Expected: at least three candidates are fully compared; all five named candidates have a row.

- [ ] **Step 2: Choose strategy**

Update `## Selected Strategy`:

```markdown
## Selected Strategy

Selected: local Playwright screenshot baselines.

Rationale:

- Local baselines keep Quran/Mushaf screenshots inside the repository and avoid hosted retention questions during early React parity work.
- Playwright can cover app routes, mobile and desktop viewports, deterministic fonts, and same-origin assets already used by QuranAtlas e2e.
- The strategy is reproducible through `pnpm run visual:react` and can later be replaced by a hosted provider if review ergonomics become more important than local-only privacy.

Rejected alternatives:

- Chromatic: strong Storybook review ergonomics, but hosted upload and retention require explicit approval before Quran/Mushaf screenshots leave local infrastructure.
- Percy: strong route/story support, but hosted upload and account/retention policy need a later approval gate.
- Argos: promising CI review flow, but selection depends on current docs coverage and privacy terms.
- Loki: local Storybook screenshots are useful, but Playwright route coverage is the initial QuranAtlas app-level need.
```

Expected: if candidate scoring proves a different provider is a better fit, replace this section with the selected provider and concrete rationale from the scored table.

## Task 3: Policy Sections

**Files:**
- Modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md`

- [ ] **Step 1: Add privacy policy**

Write:

```markdown
## Privacy And Retention Policy

- Visual fixtures use deterministic QuranAtlas local assets only.
- Screenshots must not include real user data, account data, notes, tags, comments, or sync state.
- Quran/Mushaf screenshots are allowed only from committed same-origin baseline assets and seeded public-domain/product-approved text packs.
- Hosted uploads are limited to approved fixture routes/stories; no broad crawls.
- Retention/deletion follows the selected provider's documented policy; for local Playwright baselines, retention is normal git history and branch cleanup policy.
- If retention terms change or hosted upload scope expands, visual upload is blocked until this decision is updated.
```

Expected: Quran/Mushaf screenshot handling is explicit before any upload.

- [ ] **Step 2: Add baseline update policy**

Write:

```markdown
## Baseline Update Policy

- Baseline updates require code review.
- Baseline updates must cite the changed component/story/route and the active visual-intent reference when one exists.
- Do not update baselines to hide broken fonts, missing dataset assets, layout overlap, inaccessible focus, or unintended product scope.
- React visual baselines are regression evidence only; `docs/ui-references/**` remains visual intent where present.
- Temporary local-proof-only baselines must name a promotion/removal condition and cannot satisfy cutover readiness.
```

Expected: no automatic snapshot churn.

- [ ] **Step 3: Add initial screenshot scope**

Write:

```markdown
## Initial Screenshot Scope

Storybook:

- `React Shell/App/Default` in mobile, tablet, desktop, light, sepia, dark.
- Future Level 1 primitives: default, focus-visible, disabled, loading/error where reachable.

Playwright routes:

- React shell root `/`.
- Svelte baseline fixture ids from the 02 appendix only as comparison references until React route parity exists.

Out of scope for initial visual gate:

- Remote upstream fetching.
- User-generated private data.
- Full Mushaf page pack sweeps.
- Removed mark/review/listen/audio branches.
```

Expected: initial scope is small and deterministic.

## Task 4: Optional Provider Wiring

**Files:**
- Modify only if selected strategy is wired now: `package.json`, config files, `docs/tech-stack.md`
- Create only if local Playwright strategy selected: `playwright.visual.react.config.js`, `tests/e2e/react-visual/*.spec.ts`

- [ ] **Step 1: If selecting local Playwright baselines, add visual config**

Create `playwright.visual.react.config.js`:

```js
import { defineConfig, devices } from '@playwright/test'

const REACT_PORT = 5174
const REACT_BASE_URL = `http://127.0.0.1:${REACT_PORT}`

export default defineConfig({
  testDir: './tests/e2e/react-visual',
  snapshotDir: './tests/e2e/react-visual/__screenshots__',
  outputDir: './test-output/react-visual',
  reporter: [['html', { outputFolder: './test-output/react-visual-report' }]],
  use: {
    baseURL: REACT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'visual-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'visual-mobile', use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: 'pnpm run dev:react',
    url: REACT_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

Expected: visual proof targets React server only.

- [ ] **Step 2: If selecting local Playwright baselines, add smoke visual spec**

Create `tests/e2e/react-visual/shell.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('react shell visual baseline', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'QuranAtlas' })).toBeVisible()
  await expect(page).toHaveScreenshot('react-shell.png', {
    fullPage: true,
    animations: 'disabled',
  })
})
```

Expected: screenshot baseline is deterministic and local.

- [ ] **Step 3: Add visual script for selected strategy**

For local Playwright, patch `package.json`:

```json
{
  "scripts": {
    "visual:react": "playwright test --config playwright.visual.react.config.js"
  }
}
```

For hosted providers, use the provider's current-doc command and keep the stable script name:

```json
{
  "scripts": {
    "visual:react": "pnpm run build:storybook:react && provider-specific-command-from-recorded-docs"
  }
}
```

Expected: `pnpm run visual:react` is the stable local/CI entry point.

- [ ] **Step 4: Update tech stack only if tooling is wired**

Add to `docs/tech-stack.md`:

```markdown
| React visual regression | selected strategy from `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md` | package version or hosted service recorded in the decision doc | Regression evidence for React stories/routes; not visual source of truth |
| `pnpm run visual:react` | Run the selected React visual regression gate. |
```

Expected: script/tool changes are documented in the same change.

## Task 5: Verification, Commit, And Handoff

**Files:**
- Verify: decision doc and optional config

- [ ] **Step 1: Run docs checks before provider wiring**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: docs are clean and whitespace passes.

- [ ] **Step 2: Run selected visual command if wired**

Run:

```bash
pnpm run visual:react
```

Expected: visual command passes deterministically. If first-run local baselines are intentionally created, review them before staging.

- [ ] **Step 3: Run broader checks if scripts/dependencies/config changed**

Run:

```bash
pnpm run check
pnpm run check:react
pnpm run docs:check
git diff --check
```

Expected: Svelte and React checks remain green.

- [ ] **Step 4: Confirm deploy is untouched**

Run:

```bash
rg -n "dist-react|visual:react|storybook-static-react" .github/workflows/deploy.yml
```

Expected: no output unless a later approved cutover spec changed deploy. This plan must not feed React or visual artifacts to deploy.

- [ ] **Step 5: Commit**

For decision-only:

```bash
git add docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md
git commit -m "docs: select react visual regression strategy"
```

For decision plus wiring:

```bash
git add docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md package.json pnpm-lock.yaml playwright.visual.react.config.js tests/e2e/react-visual docs/tech-stack.md .github/workflows/ci.yml .storybook
git commit -m "feat: wire react visual regression gate"
```

Expected: commit succeeds. Stage only files that actually changed. Do not push.

- [ ] **Step 6: Handoff notes**

Record:

```text
Selected visual strategy:
- local Playwright screenshot baselines, unless the scored decision table selected another named provider
Stable command:
- pnpm run visual:react when wired; decision-only if no command was added
Privacy/retention:
- summarize the selected provider policy from the decision doc
Baseline update policy:
- docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-05-visual-regression-provider-decision.md
Verification:
- pnpm run docs:check
- git diff --check
- pnpm run visual:react when wired
- pnpm run check and pnpm run check:react when scripts, dependencies, or config changed
Temporary status:
- none for durable selection; otherwise write the exact promotion/removal condition from the decision doc
```

Expected: child spec 06 knows whether UI primitives may graduate with selected provider coverage or only a temporary local-proof path.
