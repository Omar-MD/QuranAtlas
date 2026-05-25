# React Tech Stack Refactor 16 - Cutover Readiness Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
  - all implementation child specs `01` through `14`, including `08A`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-15-golden-routes-accessibility-gates-spec.md`

## Purpose

Prove React is ready to become the production entry without flipping it yet.
This is the approval, rollback, CI/deploy, docs, and soak-policy gate that keeps
production entry changes separate from Svelte cleanup.

## Current Docs Requirement

This spec uses local CI/deploy and repo behavior. If cutover changes Cloudflare,
Wrangler, Vite, GitHub Actions, or another CLI/API surface beyond existing
patterns, fetch current docs through Context7 before writing the implementation
plan.

## Scope

In scope:

- Confirm every child spec acceptance criterion is met. Search may be explicitly
  deferred only if product docs and parity gates say so. Any other v1 product
  deferral requires amending the master spec and affected child specs in the
  same change with a reduced parity target.
- Confirm React parity gates pass.
- Confirm Svelte remains available for rollback.
- Define staging/dev soak policy.
- Define rollback plan.
- Confirm CI artifact routing for current `dist/` and future React production
  artifact plus the same-origin asset-pack artifact set.
- Prepare docs and agent-instruction updates needed for the production flip.

Out of scope:

- Flipping production entry.
- Removing Svelte source or dependencies.
- Deploying React as production.
- Changing Cloudflare Pages routing before approval.

## Required Reads

- `AGENTS.md`
- `docs/tech-stack.md`
- `docs/product-info.md`
- `docs/context/implemented.md`
- `docs/context/architecture.md`
- `docs/context/repo-structure.md`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- Parent master spec
- All child specs `00` through `15`, including `08A`

## Allowed Files And Directories

Allowed create:

- Cutover readiness notes or checklists under `docs/superpowers/specs/` or
  another documented planning location.

Allowed modify:

- Readiness evidence docs under `docs/superpowers/specs/` or another
  planning-only location.
- `docs/product-info.md`, `docs/context/implemented.md`, `docs/tech-stack.md`,
  context docs, and agent instructions only when actual current behavior,
  product scope, scripts, CI, or source-of-truth language changes. Do not put
  pass/fail logs, approval records, dated progress notes, or revision notes in
  current-state context docs.
- CI/deploy documentation that describes the future flip without deploying React.

Forbidden modify:

- Production app entry.
- Deploy artifact routing.
- Svelte source, dependencies, or rollback path.
- Cloudflare Pages branch/domain behavior.

## Readiness Checklist

React is cutover-ready only when:

- v1 product scope is implemented;
- search parity is complete or product docs explicitly defer search before
  parity is claimed;
- IDB, route, storage, service-worker, and cache compatibility are proven;
- source-pack install-before-activate is proven;
- golden routes, accessibility, visual regression, and offline gates pass;
- React build output is deterministic;
- React `validate:react` passes and includes static, registry/token, unit,
  Storybook, e2e, visual, app-shell build, and docs gates.
- React app artifact contains no Mushaf page SVG bodies.
- Same-origin asset-pack artifact set is validated and publishable separately
  from the app shell.
- bundle budget is agreed;
- docs and agent workflows are ready to flip source-of-truth language;
- rollback path keeps Svelte source and dependencies available.

## CI And Deploy Contract

Current deploy workflow downloads `dist/` from CI and deploys that artifact to
Cloudflare Pages. Cutover readiness must document exactly which later spec will
change:

- `pnpm run build`;
- CI build artifact path;
- deploy artifact path;
- preview/e2e server behavior;
- Lighthouse target;
- branch domain behavior for `dev`, `staging`, and `main`.
- same-origin asset-pack publish root under `/dataset/**`;
- CI upload/download/deploy handling for both app-shell and asset-pack
  artifacts.

No workflow changes in this spec should deploy React before child spec `17`.

## Deliverables

- Pass/fail readiness checklist with evidence links for every child spec and
  gate, stored in planning docs rather than current-state context docs.
- Concrete rollback and staging/dev soak plan.
- CI/deploy artifact-routing plan for the production flip, including React app
  artifact and same-origin asset-pack artifact set.
- List of docs, skills, scripts, and branch protections that child spec `17` must
  update.
- Explicit approval record or handoff note required before the production flip.

## Acceptance Criteria

- Readiness checklist has pass/fail evidence.
- Search deferral, if used, is reflected in product docs and parity gates; no
  other v1 scope deferral is allowed without amending the master spec and
  affected child specs.
- Temporary local-only visual proof is not accepted as readiness visual proof.
- Rollback plan is concrete and keeps Svelte retained.
- Production flip implementation steps are known but not executed.
- Stakeholder/user approval is required before child spec `17`.

## Verification

Run the full proof gate agreed for readiness, at minimum:

```bash
pnpm run validate
pnpm run validate:react
pnpm run build:react
pnpm run test:e2e:react
pnpm run docs:check
git diff --check
```

If data/source behavior changed, also run the relevant data gate:

```bash
pnpm run data -- check
```

Expected result:

- Existing Svelte validation still passes.
- React parity gates pass.
- Docs checks are clean.
- No deploy workflow consumes React output yet.

## Rollback And Failure Handling

- If any readiness gate fails, do not flip production entry.
- If product scope is deferred, update product docs and parity language before
  claiming readiness.
- If rollback cannot be tested, keep Svelte as production entry.

## Handoff

Child spec `17 Production Entry Flip With Svelte Retained` starts only after
explicit approval. Its first task must re-run or re-check the readiness evidence
before changing production entry.
