# React Tech Stack Refactor 05 - Visual Regression Provider Selection Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-00-stack-docs-verification-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-04-storybook-component-test-harness-spec.md`

## Purpose

Select and document the React rebuild visual regression provider before React UI
work graduates beyond local proof. The selected provider must protect
QuranAtlas visual intent, privacy, determinism, and review ergonomics while
keeping provider artifacts as regression evidence only.

## Current Docs Requirement

No visual regression provider is selected by this spec text. During execution,
use the candidate docs recorded in child spec `00` as the discovery baseline,
then fetch current Context7 docs for every shortlisted provider before scoring
or wiring it. At minimum, run the repo Context7 workflow for the selected
provider and any provider that reaches final comparison:

```bash
npx ctx7@latest library <provider-name> "<full provider evaluation question>"
npx ctx7@latest docs <library-id> "<full provider evaluation question>"
```

If Context7 fails because of quota, record the failure and stop until the user
can authenticate or provide a higher-limit key. If Context7 lacks provider
coverage after the required workflow, record the failure and use official
provider docs as an explicit fallback. Do not choose a provider from memory.

## Scope

In scope:

- Evaluate candidate providers.
- Select one provider or explicitly choose a local Playwright-screenshot
  baseline strategy.
- Define privacy and retention policy for Quran/Mushaf screenshots.
- Define deterministic asset, font, viewport, data, and theme setup.
- Define baseline update policy.
- Define branch/PR review policy.
- Define CI gate placement.
- Define failure triage and override rules.

Out of scope:

- Replacing committed visual references under `docs/ui-references/**`.
- Treating provider snapshots as design source of truth.
- Rebuilding UI components.
- Adding or changing product scope.
- Capturing Quran text from remote upstream providers at runtime.

## Required Reads

- `AGENTS.md`
- `DESIGN.md`
- `docs/context/repo-structure.md`
- `docs/context/style-map.md`
- `docs/ui-references/**` conventions from
  `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `docs/context/architecture.md`
- `docs/context/source-data-flow.md`
- `docs/tech-stack.md`
- `tests/e2e/AGENTS.md`
- Parent master spec
- Child specs `00`, `02`, and `04`

## Allowed Files And Directories

Allowed create:

- Provider comparison docs or decision appendix under `docs/superpowers/specs/`.
- React visual-regression configuration, scripts, or baselines only after a
  provider or local strategy is selected.
- Minimal visual fixture helpers under `tests/e2e/**` or Storybook config when
  they are durable proof infrastructure.

Allowed modify:

- `package.json`, CI config, Storybook config, Playwright config, and
  `docs/tech-stack.md` only when provider tooling or scripts are wired.
- UI-reference notes or context docs only to describe proof ownership, not to
  replace visual intent with provider snapshots.

Forbidden modify:

- Product UI implementation.
- Committed `docs/ui-references/**` intent solely to accept provider drift.
- Deploy artifact routing or production entry.
- Runtime upstream data fetching.

## Candidate Set

Evaluate at least:

- Chromatic.
- Percy.
- Argos.
- Playwright screenshot baselines in-repo.
- Loki.

Another provider may be added only with a documented reason and current docs
verification.

## Evaluation Criteria

Score each candidate against:

- privacy and data-retention policy for Quran text, Mushaf pages, source labels,
  offline states, and user-like seeded data;
- self-hosted or local-only viability;
- deterministic fonts and same-origin asset loading;
- support for mobile, tablet, desktop, dark, sepia, reduced-motion, and awkward
  viewport baselines;
- Storybook screenshot source support;
- Playwright route screenshot source support;
- CI cost and runtime;
- flake profile and retry behavior;
- baseline update workflow;
- PR review experience;
- branch policy for `dev`, `staging`, and `main`;
- ability to block merges without deploying artifacts;
- compatibility with the Svelte-reference baseline and later React parity gates.

## Provider Contract

The selected provider must:

- never become the visual source of truth;
- reference committed `docs/ui-references/**` where visual direction is involved;
- use deterministic QuranAtlas fonts and same-origin dataset assets;
- avoid uploading unnecessary user-like private data;
- document retention and deletion policy;
- support baseline update review;
- support local reproduction or a documented fallback;
- integrate with existing Playwright/Storybook proof without replacing
  surface-owned e2e tests.

## Deliverables

- Provider comparison table.
- Selected provider and rationale.
- Current-docs appendix for shortlisted providers.
- Privacy and retention note.
- Baseline update policy.
- CI wiring plan.
- Local reproduction plan.
- Initial screenshot scope for stories and routes.
- Explicit statement that provider snapshots are regression evidence only.

## Acceptance Criteria

- At least three candidates are compared.
- The selected provider has current documentation fetched through Context7 or an
  explicit documented fallback.
- Privacy and retention for Quran/Mushaf screenshots is addressed before any
  provider upload is enabled.
- Baseline update policy requires review, not automatic snapshot churn.
- The provider can cover Storybook component states and Playwright app routes, or
  the spec explains the split.
- The selected gate does not feed any React artifact to deploy before cutover.
- A temporary local-proof-only path may unblock early component work only if it
  has a named command, baseline update policy, and removal/promotion condition;
  it cannot satisfy cutover readiness unless promoted to the durable selected
  visual-regression strategy.
- `docs/tech-stack.md` is updated if provider tooling, scripts, or CI gates are
  added.

## Verification

Before provider wiring:

```bash
pnpm run docs:check
git diff --check
```

After provider wiring, run the exact commands introduced by the implementation,
for example:

```bash
pnpm run visual:react
pnpm run docs:check
git diff --check
```

If CI, scripts, dependencies, or build tooling changes, also run:

```bash
pnpm run check
```

Expected result:

- Provider docs are recorded.
- Local or CI visual command runs deterministically against seeded assets.
- Docs and whitespace checks are clean.

## Rollback And Failure Handling

- If hosted-provider privacy terms are unacceptable, choose local Playwright
  screenshot baselines or another self-hosted/local strategy.
- If snapshots are flaky because of fonts or dataset timing, fix deterministic
  loading before increasing thresholds.
- If visual artifacts expose data beyond the approved seeded baseline, stop
  provider rollout and revise fixture data.
- If the provider cannot cover both Storybook and Playwright, document the split
  and require both gates before React parity.

## Handoff

Child spec `06 Owned shadcn/Radix Component Layer` may graduate UI primitives
only after this spec selects the provider or explicitly approves a temporary
local-proof-only path with a promotion/removal condition. Later reader and
page-recipe specs must add provider coverage through the selected workflow, and
child spec `16` must not accept temporary local proof as the readiness visual
gate.
