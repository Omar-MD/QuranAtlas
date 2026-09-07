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
runs in this repository.

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
- Luna Medium (`openai-codex/gpt-5.6-luna:medium`, the `default` role) owns
  the main session: intent, decomposition, dispatch, scheduling, evidence
  review, and the final response.
- Full GLM-5.3 is the explicit general-planning worker (`general-planner`);
  Flash is the broad implementation and repair worker, not a UI-only seat.
  Generic workers use Luna at the configured `@task` role.
- Delegation stays shallow (`task.maxRecursionDepth: 1`); workers do not
  become replacement orchestrators.
- Advisors are disabled by default. Enable one only for a bounded,
  independently useful review; never create a duplicate reasoning stream.

## UI Model-Role Protocol

UI work follows the four-seat loop configured in `.omp/config.yml`
(`modelRoles`). The Kimi seats run on the OpenCode Go route for now, with
OpenRouter fallback chains configured for when that provider is
authenticated. OpenCode Zen stays disabled. The main session remains the
orchestrator and never switches into a UI specialist role.

- Kimi K3 (`opencode-go/kimi-k3`, `ui_director`) is the design
  director: detailed briefs and visual design decisions at milestones only.
  It never implements production UI.
- GLM-5.3-Flash (`zai/glm-5.3-flash`, `ui_implementer`) is the heavy
  implementation and repair seat. It follows the K3 brief exactly, performs
  no independent aesthetic invention, and may handle non-UI implementation
  when explicitly assigned.
- Kimi K2.6 (`opencode-go/kimi-k2.6`, `ui_visual`) owns rendered
  visual review and final visual sign-off. It never edits production files.
- GPT-5.6-Luna High (`ui_correctness`) reviews interaction logic, state,
  focus, persistence, routing, accessibility, and TypeScript contracts only.
  It never chooses styling.
- Full GLM-5.3 (`plan`) handles substantial general technical planning.
- Luna High handles difficult engineering/correctness review; Luna Max is
  exceptional architecture/debug escalation only.

The UI flow is: K3 brief → Flash implementation/repair → targeted Flash
runtime checks → optional independent correctness review when behavior
changed → Kimi K2.6 rendered visual review and milestone sign-off. Advisor
review is off by default and is enabled only for a bounded, non-duplicative
review. Follow `skill://ui-design` and `skill://ui-verify`; agents are
`.omp/agents/{general-planner,ui-director,ui-implementer,ui-visual-reviewer,ui-correctness-reviewer}.md`.
UI boundaries remain unchanged: check the component registry, compose
`src/components/ui/**` primitives, keep Radix imports inside that layer, use
design tokens instead of literals, and verify desktop/mobile across all
themes.
