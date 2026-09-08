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

## Command Front Door

- Use mise for the project interface. Tool pins are Node `24.20.0` and
  pnpm `10.31.0`.
- Run `mise install`, then `mise run install` for a reproducible checkout.
- Use `mise run dev`, `mise run preview`, `mise run check`, `mise run smoke`,
  `mise run offline`, `mise run data:check`, `mise run data:build`,
  `mise run build:release`, `mise run storybook:build`, and
  `mise run validate` instead of creating ad hoc orchestration commands.
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

- Automated coverage is limited to the complete offline lifecycle and the
  desktop/mobile core UI smoke journey.
- Assert accessible roles and names, visible content, URLs, persisted state,
  network outcomes, and service-worker behavior.
- Do not assert CSS classes, DOM shape, icon internals, screenshots, visual
  snapshots, or implementation-only state.
- There are no screenshot regression tests or screenshot artifacts.
- Browser-only reload, offline, hydration, and viewport behavior belongs in
  the retained Playwright specs.

## Generated Assets

- `public/dataset/**`, `public/search-packs/**`,
  `data/normalized/mushaf-pages/**`, `dist/**`, `storybook-static/**`, and
  Playwright output are generated or local-only and must not be tracked.
- Do not precache datasets, search packs, or Mushaf pages. Keep Mushaf media
  lazy and out of ordinary smoke/offline CI.
- Never commit browser state, credentials, or screenshots.

## Git Safety

- Inspect `git status`, `git diff`, and `git diff --check` before destructive
  operations or history changes.
- Preserve unrelated user changes; never reset or overwrite them.
- Put temporary notes and scratch files under `.scratch/` and keep secrets out
  of the repository.

## Main-Session Orchestration
The main OMP session is a bounded orchestrator, not a production implementer.
Follow OMP's built-in orchestration surfaces; no bespoke orchestrator code
runs in this repository. Model bindings live only in `.omp/config.yml`
(`modelRoles`); every document in this repository refers to roles, never to
model IDs.

- **Vibe mode** (`/vibe`) is OMP's director pattern for orchestrator-only
  main sessions: the director's active tools reduce to `read`, parent-owned
  `todo`, and the `vibe_spawn`/`vibe_send`/`vibe_wait`/`vibe_kill`/
  `vibe_list` controls, while persistent keep-alive workers do the
  searching, editing, running, and building. `fast` workers resolve to
  bundled `sonic` (`@smol`), `good` workers to bundled `task` (`@task`).
  Enter `/vibe` whenever a session should stay orchestrator-only; there is
  no persistent default-on setting, and it is mutually exclusive with
  plan/goal modes.
- **The `orchestrate` magic keyword** (enabled) injects OMP's per-turn
  multi-agent contract: scope the whole task, delegate substantial
  independent work in parallel, verify each phase, and continue until the
  request is complete. Use it for one-off orchestration without entering
  vibe mode.
- **`task` + `hub`** are the ordinary delegation surfaces: batch fan-out
  with the required shared `context`, follow-ups via `hub` messaging
  instead of fresh spawns, outputs via `agent://<id>` and transcripts via
  `history://<id>`.
- The `default` role owns the main session, pinned at max effort: intent,
  decomposition, dispatch, scheduling, evidence review, and the final
  response.
- The `plan` role backs the general-planner worker for substantial general
  technical planning (max effort); the `ui_implementer` role backs the
  broad implementation and repair worker, not a UI-only seat (max effort).
  Generic workers run at the `@task` role (max effort).
- Delegation stays shallow (`task.maxRecursionDepth: 1`); workers do not
  become replacement orchestrators.
- Advisors are disabled by default. Enable one only for a bounded,
  independently useful review; never create a duplicate reasoning stream.

## UI Model-Role Protocol

UI work follows the four-seat loop configured in `.omp/config.yml`
(`modelRoles`) — the single source of model bindings. The `ui_director`
and `ui_visual` seats run on OpenRouter with automatic failover to the
OpenCode Go route (`retry.fallbackChains`); OpenCode Zen stays disabled.
The main session remains the orchestrator and never switches into a UI
specialist role.

- The `ui_director` role is the design director, pinned at max effort and
  retained for one-shot use only: a single self-contained pass per coherent
  design scope writes the complete durable brief under `docs/design/**`
  (canonical system brief: `docs/design/Design.md`; scoped companion briefs
  in `docs/design/briefs/`). It never iterates, answers follow-ups, or
  implements production UI; later turns read the written brief instead of
  re-engaging the director.
- The `ui_implementer` role is the heavy implementation and repair seat,
  pinned at max effort. It follows the written director brief exactly,
  performs no independent aesthetic invention, and may handle non-UI
  implementation when explicitly assigned.
- The `ui_visual` role owns rendered visual review and final visual
  sign-off, pinned at max effort. It judges the `ui_implementer`'s work
  against the director's written brief, which is the foundation for every
  visual judgment. It never edits production files.
- The `ui_correctness` role reviews interaction logic, state, focus,
  persistence, routing, accessibility, and TypeScript contracts only,
  pinned at high effort. It never chooses styling.
- The `vision` role backs in-session image and screenshot inspection for
  visual review, pinned at max effort so visual evidence is never
  pre-interpreted below the effort of the seat that owns sign-off.
- The `plan` role handles substantial general technical planning, pinned
  at max effort.
- The `slow` role handles difficult engineering/correctness review and
  exceptional architecture/debug escalation, pinned at max effort.

The `plan` seat decomposes tasks so that any needed director engagement is
a single self-contained one-shot dispatch carrying the full companion
context (task breakdown, token and registry state, relevant primitives,
affected screens, constraints).

The UI flow is: one-shot director brief written to `docs/design/**` →
implementer implementation/repair from the written brief → targeted
implementer runtime checks → optional independent correctness review when
behavior changed → visual review and milestone sign-off against the written
brief. Advisor
review is off by default and is enabled only for a bounded, non-duplicative
review. Follow `skill://ui-design` and `skill://ui-verify`; agents are
`.omp/agents/{general-planner,ui-director,ui-implementer,ui-visual-reviewer,ui-correctness-reviewer}.md`.
UI boundaries remain unchanged: check the component registry, compose
`src/components/ui/**` primitives, keep Radix imports inside that layer, use
design tokens instead of literals, and verify desktop/mobile across all
themes.
