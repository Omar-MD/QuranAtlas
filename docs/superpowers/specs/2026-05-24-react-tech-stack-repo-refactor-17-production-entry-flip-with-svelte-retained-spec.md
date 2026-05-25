# React Tech Stack Refactor 17 - Production Entry Flip With Svelte Retained Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-08a-mushaf-install-on-demand-asset-strategy-spec.md`

## Purpose

Flip QuranAtlas production entry from Svelte to React after cutover approval
while retaining Svelte source and dependencies for rollback. This spec changes
the shipped artifact, docs, scripts, and CI/deploy routing, but does not remove
Svelte.

## Current Docs Requirement

If this spec changes Vite production config, vite-plugin-pwa config, Workbox
behavior, Wrangler/Cloudflare Pages commands, GitHub Actions syntax, or package
manager behavior beyond already verified patterns, fetch current docs through
Context7 before writing the implementation plan.

## Scope

In scope:

- Repoint production app entry to React.
- Update `pnpm run build` so the deploy artifact is React.
- Keep Svelte source and dependencies available for rollback.
- Update CI artifact upload path and deploy workflow only as needed.
- Publish the validated same-origin asset-pack artifact set under `/dataset/**`
  alongside the React app artifact.
- Update service-worker scope/cache names for production React.
- Migrate from the old Svelte service worker to the React service worker with
  rollback-safe cache handling.
- Update `docs/tech-stack.md`, architecture docs, context docs, and agent
  instructions to make React the shipped source of truth.
- Run full validation and deployment-safe checks.

Out of scope:

- Removing Svelte source or dependencies.
- Deleting Svelte tests unless they are replaced by rollback-only docs and a
  later removal spec.
- Changing product scope.
- Skipping rollback documentation.

## Required Reads

- `AGENTS.md`
- `docs/tech-stack.md`
- `docs/context/architecture.md`
- `docs/context/repo-structure.md`
- `docs/context/implemented.md`
- `docs/context/source-data-flow.md`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- Parent master spec
- Child spec `16`
- Child spec `08A`

## Allowed Files And Directories

Allowed modify:

- Production Vite/app entry and React build configuration.
- `package.json`, lockfile, CI workflow, deploy workflow, and preview/e2e server
  configuration as needed for React to become the shipped artifact.
- React service-worker production scope/cache configuration.
- Asset-pack publishing workflow and validation scripts needed to keep
  `/dataset/**` same-origin after the flip.
- `docs/tech-stack.md`, context docs, generated docs, product/current-state docs,
  and agent instructions.

Forbidden modify:

- Removing Svelte source or dependencies.
- Deleting rollback documentation.
- Changing product scope.
- Removing Svelte tests unless a rollback-only policy and replacement React proof
  are documented in the same change.

## Flip Contract

After the flip:

- `pnpm run build` produces the React production artifact expected by deploy.
- `dist/` remains the deploy artifact path unless the deploy workflow is updated
  in the same change.
- The same deploy run publishes the validated asset-pack artifact set under
  same-origin `/dataset/**`; app-shell deploy without required asset packs is not
  a complete flip.
- React service worker is the production service worker.
- Svelte remains in the repo and can be restored by reverting the production
  entry/config changes.
- Docs describe Svelte as retained rollback source, not current production.
- React source, registry, Storybook, tests, and agent instructions are canonical
  for new product work.

## Service-Worker Migration Contract

The flip must define and test:

- replacement choreography for already-controlled Svelte clients;
- when React calls `skipWaiting` and `clientsClaim`, if used;
- mapping of old Svelte cache names to retained, purged, or ignored caches;
- stale Svelte app-shell cleanup that does not delete compatible same-origin
  asset packs needed for rollback;
- rollback behavior if React service worker activates and the production entry is
  reverted to Svelte;
- smoke tests for a client loaded before the flip, a fresh client after the
  flip, and an offline/updated client.

## Deliverables

- Production entry and build/deploy routing switched to React.
- Same-origin asset-pack artifact publication wired and validated.
- Svelte retained as rollback source with documented restore steps.
- React service worker and cache names promoted to production without stale Svelte
  collisions.
- Updated tech-stack, architecture, repo-structure, implemented/current-state
  docs, generated context, and agent instructions.
- Full validation, e2e, visual, offline, and docs proof for the flipped entry.

## Acceptance Criteria

- Production build serves React.
- Deploy workflow still downloads and deploys the intended verified artifact.
- Deploy workflow also publishes the intended verified asset-pack artifact set
  under `/dataset/**`.
- React validation, golden routes, accessibility, visual, offline, and data gates
  pass.
- Service-worker migration and rollback smoke tests pass.
- Svelte source and dependencies remain present.
- Rollback instructions are documented.
- `docs/tech-stack.md` and context docs match the new current stack.

## Verification

Run:

```bash
pnpm run docs
pnpm run validate
pnpm run validate:react
pnpm run test:e2e
pnpm run docs:check
git diff --check
```

Run any React-specific gates that are not yet included in `validate`, for
example:

```bash
pnpm run test:e2e:react
pnpm run visual:react
```

Expected result:

- Production build and validation pass with React as entry.
- Deploy artifact path is correct.
- Docs checks are clean.

## Rollback And Failure Handling

- If production build fails, revert the entry/config change and keep Svelte as
  production.
- If deployed React fails smoke tests, revert to the previous Svelte production
  entry while retaining React branch work for fixes.
- If docs cannot be updated cleanly, do not merge the flip.

## Handoff

Child spec `18 Svelte Removal` may begin only after the React production flip
has soaked successfully on the approved branches and rollback requirements are
still documented.
