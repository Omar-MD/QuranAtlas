# React Tech Stack Refactor 16 - Cutover Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove React is ready to become the production entry, define rollback and soak policy, and document CI/deploy artifact routing without flipping production or removing Svelte.

**Architecture:** Produce a planning/evidence gate that consumes Waves 00-15, validates both Svelte and React proof commands, and records the exact follow-up changes Wave 17 must execute. This wave may update docs and readiness evidence only; production entry, Cloudflare routing, deploy workflow behavior, and Svelte source stay unchanged.

**Tech Stack:** Markdown readiness evidence, pnpm validation scripts, GitHub Actions/Cloudflare Pages documentation, React and Svelte dual-build gates, QuranAtlas data/asset-pack verification commands.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/style-map.md`
- `docs/context/feature-map.md`
- `docs/context/implemented.md`
- `docs/context/roadmap.md`
- `docs/context/open-issues.md`
- `docs/product-info.md`
- `docs/tech-stack.md`
- `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `tests/e2e/AGENTS.md`
- Master spec `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Child specs and implementation plans `00` through `15`, including `08A`

## Dependency Gates

Do not begin until:

- Waves `00` through `15` are merged or present in the implementation branch.
- `pnpm run validate:react` exists and includes React static, registry/token, unit/component, Storybook, build, e2e, visual, app-shell, and docs gates.
- Wave `15` has no unresolved golden/a11y/offline/visual/Svelte-reference parity blocker.
- Temporary local-only visual proof from Wave `05` has been promoted to the durable selected strategy.

## File Structure

Create:

- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-evidence.md` - readiness checklist, command evidence, rollback plan, soak policy, and Wave 17 handoff.

Modify only if current behavior or future flip instructions need documentation:

- `docs/product-info.md` - only if search is explicitly deferred before parity and product promise text changes.
- `docs/context/implemented.md` - only for current-state wording that is already true before the production flip.
- `docs/tech-stack.md` - only to document proof commands or future flip contract language that is true during dual-build.
- `docs/context/architecture.md` and `docs/context/source-data-flow.md` - only for dual-build artifact/asset-pack documentation that is already true.
- `.agents/skills/quranatlas-workflow/SKILL.md` and `.agents/skills/quranatlas-ui-workflow/SKILL.md` - only if proof workflow routing has already changed before the flip.

Do not modify:

- `package.json`, `pnpm-lock.yaml`, source files, production Vite entry, CI deploy artifact path, or `.github/workflows/deploy.yml` unless documenting current behavior in comments is explicitly approved.
- Svelte source, Svelte dependencies, Svelte tests, or rollback files.
- `public/dataset/**`, `data/**`, or generated dataset files.

## Task 1: Preflight And Docs Requirement

**Files:**
- Read: files listed in Required Context

- [ ] **Step 1: Confirm working tree ownership**

Run:

```bash
git status --short --branch
```

Expected: note existing dirty work. Do not revert other agents' edits.

- [ ] **Step 2: Confirm this wave is planning/evidence only**

Run:

```bash
git diff --name-only -- package.json pnpm-lock.yaml src src-react public/dataset data .github/workflows
```

Expected: no output caused by Wave 16. Pre-existing output from other agents must be left untouched.

- [ ] **Step 3: Run Context7 only if implementation changes API/CLI behavior beyond existing patterns**

If the readiness work proposes new Cloudflare, Wrangler, Vite, GitHub Actions, Playwright, or package-manager syntax not already used in the repo, run the relevant pair outside Codex's default sandbox before documenting that syntax. Examples:

```bash
npx ctx7@latest library "Cloudflare Workers" "How should Wrangler deploy a prebuilt Cloudflare Pages artifact and preserve branch deployments without rebuilding?"
npx ctx7@latest docs /cloudflare/cloudflare-docs "How should Wrangler deploy a prebuilt Cloudflare Pages artifact and preserve branch deployments without rebuilding?"
```

```bash
npx ctx7@latest library "GitHub Actions" "How should a workflow_run deploy job download artifacts from the triggering CI workflow and route branch deployments safely?"
npx ctx7@latest docs /github/docs "How should a workflow_run deploy job download artifacts from the triggering CI workflow and route branch deployments safely?"
```

Expected: do not add unverified new CLI/API syntax. If Context7 quota-blocks, record the blocker and keep Wave 16 to existing repo patterns.

## Task 2: Create Readiness Evidence Document

**Files:**
- Create: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-evidence.md`

- [ ] **Step 1: Add evidence document skeleton**

Create the file:

```markdown
# React Tech Stack Refactor 16 - Cutover Readiness Evidence

## Status

React is not production-shipped by this evidence document. Svelte remains the production entry until Wave `17` explicitly flips it after approval.

## Approval Gate

Wave `17` may begin only after the user/stakeholder explicitly approves production entry flip based on this evidence.

Approval status: not approved.

## Child Spec Readiness

| Wave | Gate | Evidence command or file | Status | Notes |
| --- | --- | --- | --- | --- |
| 00 | Stack docs verified | `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md` | pending | Context7 docs appendix must not contain quota blockers for implemented APIs |
| 01 | React dual-build isolated | `pnpm run build:react` | pending | React remains non-deploy during dual-build |
| 02 | Svelte reference baseline frozen | `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md` | pending | Accepted differences must be resolved or explicit |
| 03 | Tokens/Tailwind checks | `pnpm run check:react` | pending | Token/static checks must pass |
| 04 | Storybook/component harness | React Storybook test command from `package.json` | pending | Storybook coverage must be included in `validate:react` |
| 05 | Visual regression provider durable | `pnpm run visual:react` | pending | Temporary local-only gate is not readiness proof |
| 06 | Owned component layer | `pnpm run check:react` | pending | Direct Radix/raw component checks pass |
| 07 | Registry and agent rules | registry validation command from `package.json` | pending | Registry drift checks pass |
| 08 | Offline/storage architecture | `pnpm run test:react` and `pnpm run test:e2e:react -- --grep @offline` | pending | IDB v7 compatibility and cache boundaries pass |
| 08A | Mushaf app/asset split | React artifact checker from Wave 08A | pending | No Mushaf SVG bodies or legacy paths in app artifact |
| 09 | Reader parity | `pnpm run test:e2e:react -- --grep @golden` | pending | Verse and Mushaf routes pass |
| 10 | Navigation/settings/onboarding parity | `pnpm run test:e2e:react -- --grep @golden` | pending | Source/storage and onboarding states pass |
| 11 | Search/index parity or explicit deferral | `pnpm run test:e2e:react -- --grep search` | pending | Deferral requires product and parity doc updates |
| 12 | Curated metadata parity | `pnpm run test:e2e:react -- --grep metadata` | pending | Missing metadata states do not block reader |
| 13 | Continuity/bookmarks parity | `pnpm run test:e2e:react -- --grep continuity` | pending | Launch restore, bookmarks, cross-tab proof pass |
| 14 | Daily Wird parity | `pnpm run test:e2e:react -- --grep wird` | pending | `settings.wirdPlan` ownership proof passes |
| 15 | Golden/a11y/offline/visual gates | `pnpm run validate:react` | pending | No unresolved accepted-difference blockers |

## Command Evidence

| Command | Expected outcome | Result |
| --- | --- | --- |
| `pnpm run validate` | Existing Svelte production gate passes | pending |
| `pnpm run validate:react` | React parity gate passes | pending |
| `pnpm run build:react` | React app-shell artifact builds in its non-production output path | pending |
| `pnpm run test:e2e:react` | React Playwright route, a11y, offline, and visual-owned specs pass | pending |
| `pnpm run docs:check` | Generated docs are current | pending |
| `git diff --check` | No whitespace errors | pending |

## Artifact Routing Readiness

- Current production deploy artifact: `dist/` from `pnpm run build`.
- Current CI artifact name: `build-output`.
- Current deploy workflow: `.github/workflows/deploy.yml` downloads `build-output` into `dist/` and runs `pnpm dlx wrangler@latest pages deploy dist --project-name=quranatlas --branch="${TARGET_BRANCH}" --commit-hash="${TARGET_SHA}"`.
- React dual-build artifact before Wave `17`: `dist-react/`, proof-only and not deployed.
- Wave `17` must decide whether to keep `dist/` as the deploy path by making `pnpm run build` emit React there, or update CI/deploy artifact routing in the same production flip.
- Same-origin asset-pack publish root: `/dataset/**`.
- App-shell deploy without the validated asset-pack artifact set is not a complete production flip.

## Rollback Plan

Rollback before Wave `17`: no production rollback needed; Svelte remains production.

Rollback after Wave `17`: revert the production entry/config/CI/deploy changes from Wave `17`, keep Svelte source and dependencies retained, redeploy the previous Svelte-compatible `dist/` artifact, and preserve same-origin `/dataset/**` asset packs unless the rollback evidence proves a cache conflict.

## Staging And Dev Soak Policy

- Dev soak: React production-entry candidate must run on `dev` after Wave `17` with green CI, golden routes, a11y, visual, offline, and smoke checks.
- Staging soak: React candidate must run on `staging` with the same gates and manual smoke over reader, Mushaf, settings/assets, search, bookmarks, Daily Wird, onboarding, and offline installed assets.
- Main production flip: allowed only after dev and staging soak pass and rollback remains documented.
- Soak failure: revert Wave `17` production entry changes; do not start Wave `18`.

## Wave 17 Handoff

Wave `17` must update these surfaces in one production-flip change:

- `package.json` and lockfile if script/dependency routing changes.
- production Vite/app entry and React service-worker production config.
- `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` if artifact routing changes.
- `docs/tech-stack.md`, `docs/context/architecture.md`, `docs/context/repo-structure.md`, `docs/context/implemented.md`, generated context docs, and repo-local skills.
- service-worker migration and rollback smoke tests.
```

Expected: evidence document exists and explicitly says React is not production-shipped by Wave 16.

## Task 3: Run Readiness Gates

**Files:**
- Modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-evidence.md`

- [ ] **Step 1: Run existing Svelte production validation**

Run:

```bash
pnpm run validate
```

Expected: existing Svelte validation passes. If it fails, record the command and failure summary in the evidence document and stop readiness.

- [ ] **Step 2: Run React parity validation**

Run:

```bash
pnpm run validate:react
```

Expected: React parity validation passes, including visual regression and docs checks. If any gate is missing from `validate:react`, mark readiness blocked and update the owning prior wave instead of weakening Wave 16.

- [ ] **Step 3: Run React build explicitly**

Run:

```bash
pnpm run build:react
```

Expected: React app-shell artifact builds in the proof-only path from Wave 01. It must not mutate deploy workflow behavior.

- [ ] **Step 4: Run React e2e explicitly**

Run:

```bash
pnpm run test:e2e:react
```

Expected: React e2e passes against React config, not Svelte.

- [ ] **Step 5: Run docs and whitespace gates**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: docs are current and no whitespace errors exist.

- [ ] **Step 6: Run data check only if source/data behavior changed in readiness evidence**

Run when data/source behavior changed:

```bash
pnpm run data -- check
```

Expected: data check passes. If no data/source behavior changed, record `not run - no data/source behavior changed` in the evidence document.

- [ ] **Step 7: Update evidence statuses**

Edit `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-evidence.md` so every row under `Child Spec Readiness` and `Command Evidence` is `pass`, `blocked`, or `not applicable` with a concrete command or file reference.

Expected: no `pending` remains when requesting production flip approval.

## Task 4: Search Deferral Check

**Files:**
- Modify only if search is deferred: `docs/product-info.md`
- Modify only if search is deferred: `docs/context/implemented.md`
- Modify only if search is deferred: master spec and affected child specs, in a separate explicit scope decision
- Modify: readiness evidence document

- [ ] **Step 1: Determine search status**

Run:

```bash
rg -n "search|Search" docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-11-search-index-parity-spec.md docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md docs/product-info.md docs/context/implemented.md
```

Expected: identify whether search is complete or explicitly deferred. Search is the only deferrable parity lane allowed by the master spec.

- [ ] **Step 2: If search is complete, record evidence**

Edit readiness evidence:

```markdown
Search status: complete. Evidence: `pnpm run test:e2e:react -- --grep search` and Wave `11` acceptance rows pass.
```

Expected: no product doc changes are needed.

- [ ] **Step 3: If search is deferred, update product and parity language before claiming readiness**

Use exact current-state language, for example:

```markdown
Search is deferred from the initial React cutover parity gate. The React cutover preserves reader, offline, source, continuity, bookmark, Daily Wird, and metadata behavior; full-text search remains planned V1 work and cannot be described as shipped until Wave `11` is completed.
```

Expected: `docs/product-info.md`, `docs/context/implemented.md`, the master spec, and affected child specs agree. No other v1 product lane may be deferred without amending the master spec and affected child specs.

## Task 5: Rollback, Soak, And Artifact Review

**Files:**
- Modify: readiness evidence document

- [ ] **Step 1: Verify current CI/deploy artifact routing**

Run:

```bash
rg -n "build-output|dist/|dist-react|wrangler|pages deploy|PLAYWRIGHT_USE_PREVIEW|PLAYWRIGHT_SKIP_BUILD" .github/workflows/ci.yml .github/workflows/deploy.yml docs/tech-stack.md package.json
```

Expected: evidence document records current `dist/` deploy path, current artifact name, React proof artifact path, and Wave 17 changes required.

- [ ] **Step 2: Verify React artifact excludes Mushaf page SVG bodies**

Run the checker introduced by Wave `08A`, for example:

```bash
pnpm run build:react
node scripts/check-react-app-artifact-assets.mjs
```

Expected: React app artifact contains no Mushaf page SVG bodies and no legacy Mushaf page compatibility paths. If the actual Wave `08A` checker has a different script name, use that exact script and update this evidence row.

- [ ] **Step 3: Verify asset-pack artifact set**

Run:

```bash
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
pnpm run data -- build
```

Expected: same-origin baseline Qalun (`qaloon`) asset-pack outputs are buildable and publishable under `/dataset/**`. If local generated page inputs are absent, use the CI release-artifact evidence from the build job instead of claiming local success.

- [ ] **Step 4: Record rollback smoke requirements**

Add this to the evidence document:

```markdown
## Rollback Smoke Requirements For Wave 17

- Fresh client loads React after flip.
- Already-controlled Svelte client updates to React without losing compatible `/dataset/**` caches.
- Offline installed-assets client remains readable after React service worker activates.
- Reverting the production entry to Svelte restores Svelte app shell without deleting compatible text/page/source asset caches.
```

Expected: Wave 17 has concrete smoke tests to implement.

## Task 6: Verification, Commit, And Handoff

**Files:**
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-evidence.md`
- Any docs changed in Tasks 3-5

- [ ] **Step 1: Run docs-only checks**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: docs are current and whitespace clean.

- [ ] **Step 2: Confirm production entry was not flipped**

Run:

```bash
rg -n "\"build\"|dist-react|vite.react|wrangler|pages deploy dist" package.json .github/workflows/ci.yml .github/workflows/deploy.yml docs/tech-stack.md
```

Expected: `pnpm run build` and deploy still reflect the current production path until Wave `17`; any React output remains proof-only.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-evidence.md docs/product-info.md docs/context/implemented.md docs/tech-stack.md docs/context/architecture.md docs/context/source-data-flow.md .agents/skills/quranatlas-workflow/SKILL.md .agents/skills/quranatlas-ui-workflow/SKILL.md
git commit -m "docs: record react cutover readiness evidence"
```

Expected: commit includes only readiness evidence and explicitly necessary docs updates. Omit unchanged paths from `git add`.

## Reviewer Checklist

- The evidence document does not claim React is production-shipped.
- Svelte remains production and rollback-available.
- Every Wave 00-15 gate has pass/fail evidence, not vague confidence.
- Search is complete or explicitly deferred in product/parity docs; no other v1 lane is deferred.
- Temporary visual gates are not accepted.
- CI/deploy artifact routing is documented for Wave 17 but not changed to deploy React.
- Same-origin asset-pack artifact handling is included alongside app-shell routing.
