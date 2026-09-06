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

## UI Model-Role Protocol

UI work follows a four-seat loop configured in `.omp/config.yml`
(`modelRoles`). No OpenCode Go model runs in the recurring implementation
loop; Go is reserved for Kimi-K3 milestone design work.

- Kimi-K3 (`opencode-go/kimi-k3:max`) is the design director: design-brief
  authorship and final visual sign-off at milestones only, never a constant
  reviewer or bulk implementer.
- GLM-5.3-Flash (`zai/glm-5.3-flash`, thinking on) is the heavy implementer
  (default/task/ui_implementer), the continuous code and design-system
  advisor (WATCHDOG `DesignReview`), and the rendered visual QA seat using
  its verified native image input for transient in-session screenshots.
  Mechanical roles (smol/commit/tiny) run `zai/glm-5.3-flash:off` (thinking
  disabled, verified on the wire).
- GPT-5.6-Sol (`openai-codex/gpt-5.6-sol:medium`) owns technical planning
  and reviews correctness only when interaction logic, state, focus,
  persistence, routing, or TypeScript contracts changed; it never chooses
  styling.
- GPT-5.6-Luna (`openai-codex/gpt-5.6-luna:max`) is rare deep escalation for
  architecture or debugging; it never owns visual design.

No other OpenAI selector is authorized. The mandatory flow is: Kimi-K3
milestone brief → GLM-5.3-Flash implementation with continuous Flash advisor
→ GLM-5.3-Flash visual QA after each coherent screen change → Flash repairs
(advisor attached) → recheck affected states → Sol correctness review only
for behavioral changes → Kimi-K3 final sign-off. Because advisor and
implementer share a model family, bounded Sol correctness review is the
cross-family check on behavioral changes. Follow `skill://ui-design` and
`skill://ui-verify`; agents are `.omp/agents/ui-director.md`,
`ui-implementer.md`, `ui-visual-reviewer.md`, and
`ui-correctness-reviewer.md`; the advisor configuration is
`.omp/WATCHDOG.yml` with review priorities in `.omp/WATCHDOG.md`.

The OMP browser is the only manual browser driver. Transient in-session
screenshots are allowed for visual review; persisted screenshot files and
screenshot assertions remain forbidden. UI boundaries are unchanged: check
the component registry first, compose `src/components/ui/**` primitives, keep
Radix imports inside the primitive layer, use design tokens instead of
literals, and verify desktop and mobile across all themes.
