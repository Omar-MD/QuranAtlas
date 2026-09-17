# QuranAtlas

QuranAtlas is an offline-first Quran reading PWA. Reader content must work on
desktop and mobile, with lazy data and service-worker caching keeping the app
shell fast and the reader usable without a connection.

## Source Of Truth

- The current working tree and source code are authoritative; do not infer
  behavior from deleted history or external documentation.
- Application logic lives under `src/**`; this repository control file does
  not authorize changing it during tooling or repository cleanup.
- Keep `data/catalog/**`, non-generated `data/normalized/**`, and
  `data/taxonomy/**` as tracked source inputs.

## Multi-Agent Work

This project is built and iterated on by multiple agents working through
different IDEs. The user owns the master plan, divides it into assignments,
and manages most handovers between agents and IDEs.

- Work only within the exact scope of the assignment provided by the user.
  Do not expand the task, take ownership of adjacent work, or modify another
  agent's assignment unless the user explicitly asks.
- Treat each assignment as an independent unit of work. It must have the
  inputs, constraints, expected outputs, file ownership, and acceptance
  checks needed to complete it without depending on another agent's
  unfinished work.
- Do not create hidden dependencies between concurrent assignments. If a task
  requires an output from another task, the required output must already
  exist before work begins. Otherwise, stop and report the missing input.
- Preserve unrelated changes from the user and other agents. Before editing,
  inspect the working tree and the files within the assigned scope.

## IDE-Local Skills

Each IDE owns its skill discovery, skill registry, and IDE-specific
configuration.

- Use only the skills and invocation mechanisms available in the active IDE.
- Do not assume that skills, aliases, plugins, commands, or agent roles from
  one IDE exist in another IDE.
- Do not copy, synchronize, redirect, or install skills across IDEs unless the
  user explicitly assigns that work.
- Shared assignments, plans, briefs, and handoffs must describe requirements
  and capabilities in plain language. They must not require another IDE to
  understand an IDE-specific skill name or invocation.

## Shared Work Artifacts

All agent-created coordination artifacts must live under the common
`.scratch/agent-work/**` directory. This includes master plans, task plans,
assignments, briefs, progress records, handoffs, reports, and supporting work
artifacts. Production source files and explicitly requested permanent project
documentation remain in their normal repository locations.

Use this structure:

```text
.scratch/
└── agent-work/
    ├── README.md
    └── <plan-id>/
        ├── plan.md
        ├── task-index.md
        └── tasks/
            └── <task-id>--<ide>--<agent>/
                ├── assignment.md
                ├── plan.md
                ├── brief.md
                ├── progress.md
                ├── handoff.md
                └── artifacts/
```

- Use short, stable, lowercase kebab-case identifiers for `<plan-id>`,
  `<task-id>`, `<ide>`, and `<agent>`.
- The user owns `<plan-id>/plan.md` and `<plan-id>/task-index.md`. Agents may
  read them but must not modify them unless explicitly assigned to do so.
- Each agent writes only inside its assigned task directory. Do not edit
  another task's records.
- `assignment.md` is the fixed task contract and records scope, inputs,
  expected outputs, allowed files, and acceptance checks. Do not silently
  reinterpret or rewrite it.
- `plan.md` records the agent's execution plan. `brief.md` records any design
  or implementation brief when one is needed. `progress.md` records concise,
  timestamped progress, decisions, blockers, and verification attempts.
- `handoff.md` records the final outcome, changed files, checks performed and
  their results, unresolved issues, and any information needed for the user
  to integrate or reassign the work.
- Store supporting reports, logs, and other non-source deliverables in the
  task's `artifacts/` directory.
- Begin each Markdown artifact with this metadata, keeping it current:

  ```yaml
  plan_id:
  task_id:
  ide:
  agent:
  status: assigned | in-progress | blocked | completed
  created:
  updated:
  ```

- `.scratch/` is local and Git-ignored. This shared-artifact contract assumes
  all participating IDEs and agents use the same repository checkout.
- Never store credentials, browser state, secrets, or screenshots in work
  artifacts.

## Command Front Door

- Use mise for the project interface. Tool pins are Node `24.20.0` and
  pnpm `10.31.0`.
- Run `mise install`, then `mise run install` for a reproducible checkout.
- Use `mise run dev`, `mise run preview`, `mise run check`,
  `mise run data:check`, `mise run data:build`,
  `mise run data:media`, `mise run build:release`, `mise run storybook:build`,
  and `mise run validate` instead of creating ad hoc orchestration commands.
- `mise run check` includes GitHub Actions workflow-schema validation via
  task-scoped actionlint (installed on demand).
- pnpm remains the dependency resolver and owns `pnpm-lock.yaml`.
- Maintenance audits (manual, not part of validation): `mise run tooling:deps`,
  `mise run tooling:actions-security`.

## UI Boundaries

- Check `src/design-system/registry/component-registry.json` before UI work.
- Compose approved primitives from `src/components/ui/**`.
- Direct Radix imports belong only inside the owned UI primitive layer.
- Keep design tokens, component ownership, and consumer boundaries enforced by
  the repository guardrail tasks.

## Durable Tests

- There are no automated e2e, smoke, or browser tests in this repository;
  Playwright has been removed entirely.
- All e2e and smoke verification (including the offline lifecycle and the
  desktop/mobile core UI journey) is performed manually: an agent or the user
  drives the real UI through computer-use/browser control against
  `mise run dev` or `mise run preview`.
- Manual verification asserts observable behavior only: accessible roles and
  names, visible content, URLs, persisted state, network outcomes, and
  service-worker behavior — not CSS classes, DOM shape, or icon internals.
- There are no screenshot regression tests or screenshot artifacts.

## Generated Assets

- `public/dataset/**`, `public/search-packs/**`,
  `data/normalized/mushaf-pages/**`, `dist/**`, and `storybook-static/**` are
  generated or local-only and must not be tracked.
- Do not precache datasets, search packs, or Mushaf pages. Keep Mushaf media
  lazy and out of ordinary CI.
- Never commit browser state, credentials, or screenshots.

## Git Safety

- Inspect `git status`, `git diff`, and `git diff --check` before destructive
  operations or history changes.
- Preserve unrelated user changes; never reset or overwrite them.
- Put all temporary coordination notes and work artifacts under the shared
  `.scratch/agent-work/**` hierarchy and keep secrets out of the repository.
