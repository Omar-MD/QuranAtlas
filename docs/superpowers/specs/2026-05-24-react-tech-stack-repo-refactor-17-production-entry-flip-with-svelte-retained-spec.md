# React Tech Stack Refactor 17 - Production Entry Flip With Svelte Retained Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-16-cutover-readiness-spec.md`

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
- Update service-worker scope/cache names for production React.
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
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- Parent master spec
- Child spec `16`

## Allowed Files And Directories

Allowed modify:

- Production Vite/app entry and React build configuration.
- `package.json`, lockfile, CI workflow, deploy workflow, and preview/e2e server
  configuration as needed for React to become the shipped artifact.
- React service-worker production scope/cache configuration.
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
- React service worker is the production service worker.
- Svelte remains in the repo and can be restored by reverting the production
  entry/config changes.
- Docs describe Svelte as retained rollback source, not current production.
- React source, registry, Storybook, tests, and agent instructions are canonical
  for new product work.

## Deliverables

- Production entry and build/deploy routing switched to React.
- Svelte retained as rollback source with documented restore steps.
- React service worker and cache names promoted to production without stale Svelte
  collisions.
- Updated tech-stack, architecture, repo-structure, implemented/current-state
  docs, generated context, and agent instructions.
- Full validation, e2e, visual, offline, and docs proof for the flipped entry.

## Acceptance Criteria

- Production build serves React.
- Deploy workflow still downloads and deploys the intended verified artifact.
- React validation, golden routes, accessibility, visual, offline, and data gates
  pass.
- Svelte source and dependencies remain present.
- Rollback instructions are documented.
- `docs/tech-stack.md` and context docs match the new current stack.

## Verification

Run:

```bash
pnpm run validate
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
