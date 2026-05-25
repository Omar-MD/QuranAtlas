# React Tech Stack Refactor 07 - Component Registry And Agent Rules Spec

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child specs:
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-03-tokens-tailwind-design-system-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-04-storybook-component-test-harness-spec.md`
  - `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-06-owned-shadcn-radix-component-layer-spec.md`

## Purpose

Create the machine-readable component registry and agent-facing rules that make
React UI composition deterministic. Agents must be able to discover approved
components, variants, stories, tests, accessibility expectations, visual proof,
and forbidden patterns before creating new UI.

## Current Docs Requirement

This spec is primarily a QuranAtlas repo contract. It does not lock external API
syntax. If implementation introduces JSON Schema tooling, registry generation
libraries, validation CLIs, or new Storybook metadata APIs, fetch those current
docs through Context7 before writing the implementation plan.

## Scope

In scope:

- Add a versioned component registry under `src-react/design-system/registry/`.
- Add a registry JSON schema or equivalent typed validator.
- Add initial entries for components delivered by child spec `06`.
- Add a durable validation check that detects drift between registry entries,
  source exports, stories, tests, docs, accessibility expectations, and visual
  proof references.
- Add agent-facing docs that describe how to search the registry before creating
  UI.
- Add forbidden-pattern checks for direct primitive bypasses that can be checked
  reliably at this stage.
- Define how later product component and page recipe specs extend the registry.
- Establish or extend the composite non-deploy React verification command
  `validate:react`.

Out of scope:

- Adding new UI components beyond registry fixtures.
- Replacing Storybook or visual-regression provider behavior.
- Rebuilding product surfaces.
- Rewriting current Svelte docs or skills to claim React is the shipped source
  of truth before cutover.
- Adding advisory registry prose without a blocking drift check.

## Required Reads

- `AGENTS.md`
- `DESIGN.md`
- `docs/context/repo-structure.md`
- `docs/context/architecture.md`
- `docs/context/style-map.md`
- `docs/tech-stack.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `tests/unit/AGENTS.md`
- Parent master spec
- Child specs `03`, `04`, and `06`

## Allowed Files And Directories

Allowed create:

- `src-react/design-system/registry/component-registry.json`
- `src-react/design-system/registry/component-registry.schema.json`
- `src-react/design-system/registry/README.md`
- `src-react/design-system/docs/agent-component-workflow.md`
- Registry validation scripts under `scripts/`
- Unit tests under `tests/unit/**` for registry validation

Allowed modify:

- `package.json` for durable registry-check scripts.
- `docs/tech-stack.md` when scripts, tools, pinned versions, or CI gates change.
- `docs/context/repo-structure.md` when registry paths are introduced.
- Root `AGENTS.md` and repo-local skills only to route future React component
  work to the registry once the registry exists.
- React Storybook config only if story metadata is needed by the registry check.

Forbidden modify:

- Existing Svelte source behavior.
- Current Svelte build/deploy scripts.
- Existing generated context fences by hand.
- `public/dataset/**`.

## Registry Schema Contract

The registry must be versioned and stable. It must include:

- registry schema version;
- sorted component id;
- maturity level: primitive, behavior, product, page recipe;
- component name and export path;
- allowed variants and sizes;
- allowed composition children or slots;
- dependency boundaries, including Radix usage only inside owned wrappers;
- token namespaces used;
- story paths and required story states;
- test paths and covered behaviors;
- accessibility expectations;
- visual proof references or explicit not-visual rationale;
- owner surface or design-system owner;
- allowed consumers;
- deprecation or replacement metadata when relevant.

The registry must not use open-ended fields such as `"notes"` as the only place
where important behavior lives. Freeform notes may exist, but checks must enforce
the load-bearing fields.

## Validation Contract

Add a durable registry check that proves, at minimum:

- every registry entry id is unique and sorted;
- every exported component path exists;
- every registered component exports the named component;
- every component has at least one story unless it is explicitly non-visual;
- every component has a test path or documented test exemption;
- every story path exists;
- every test path exists;
- every visual proof reference exists or is deferred with a child-spec reason;
- every Radix dependency is declared and remains inside an owned wrapper;
- every variant listed in registry matches the source variant definition when
  variants are statically discoverable;
- product components and page recipes declare their owning surface.

Checks should be strict by default. Temporary exemptions need an owner, reason,
and removal condition.

## Agent Workflow Contract

Agent instructions must say:

- search the registry before creating or modifying a component;
- extend an existing component variant before creating a near-duplicate;
- create a new component only when the registry proves no suitable component
  exists;
- add or update registry, story, test, docs, and visual proof in the same change
  as the component;
- use semantic tokens and approved variants rather than raw Tailwind or inline
  style values;
- keep Radix imports inside owned behavior wrappers;
- update page recipes when a component becomes the standard composition path.

The docs should be concise and operational. They should point to canonical files
rather than duplicating long design-system prose.

## Static Enforcement

Wire the registry check into the React verification path. If the final composite
React gate does not exist yet, add an interim command such as
`pnpm run check:react-registry` and state which later child spec makes it part of
the full React validation gate.

By the end of this spec, a composite `pnpm run validate:react` must exist. The
composite gate must include, at minimum:

- `check:react`;
- token/design literal checks from child spec `03`;
- registry validation;
- `test:react`;
- `test:storybook:react`;
- `build:react`;
- `docs:check`.

Child spec `15` must add React e2e and visual regression to the same composite
gate before readiness. Any CI job added for React before cutover must be
non-deploy and must never upload `dist-react/` to the deploy workflow.

Forbidden-pattern checks should cover:

- direct Radix imports outside `src-react/components/ui/**` behavior wrappers;
- raw HTML `button`, `input`, `select`, `dialog`, or unmanaged focus-trap usage
  in feature/page code where a registered component exists;
- unregistered story files for exported components;
- unregistered components under product component directories.

## Deliverables

- Versioned component registry file.
- Registry schema or typed validator.
- Registry validation command.
- Composite React validation command, with child spec `15` responsible for the
  final e2e/visual additions.
- Initial entries for child spec `06` components.
- Agent-facing component workflow docs.
- Updated root/repo-local instructions where appropriate.
- Unit tests or fixtures proving the registry validator fails on drift.
- Updated `docs/tech-stack.md` for new scripts or tools.

## Acceptance Criteria

- Registry validation fails on a missing source export.
- Registry validation fails on a missing story or test unless an explicit
  exemption is present.
- Registry validation fails on unsorted or duplicate component ids.
- Direct Radix imports outside owned wrappers are blocked by a durable check.
- `validate:react` prevents later React code from relying on current
  Svelte-only `validate`.
- Agent docs point future UI work to the registry before component creation.
- Current Svelte app remains the shipped source of truth until cutover docs say
  otherwise.

## Verification

Run the registry commands introduced by implementation, plus:

```bash
pnpm run docs:check
git diff --check
```

If package scripts, dependencies, lint config, Storybook metadata, or check
tooling changes, also run:

```bash
pnpm run check
pnpm run check:react
pnpm run validate:react
pnpm run build:react
```

Expected result:

- Registry check passes for real entries.
- Registry negative fixtures fail when run by their unit tests.
- Composite React validation passes; child spec `15` later extends it with
  e2e/visual gates before readiness.
- Existing Svelte checks remain unchanged.
- Docs checks are clean.

## Rollback And Failure Handling

- If registry validation cannot reliably infer variants from source, require
  explicit source-side metadata instead of weakening the registry.
- If checks create false positives for legitimate low-level components, narrow
  allowlists to exact files and document why each exception exists.
- If instructions start implying React is already shipped, revise them to say
  React is the future app tree until the production flip spec lands.

## Handoff

Child spec `08 Offline Storage And Asset Pack Architecture` can use registry
rules for offline UI state components, but it must not create unregistered UI.
Every later product surface spec must extend this registry in the same change
that introduces new product components or page recipes.
