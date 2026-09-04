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

- Use mise for the project interface. Tool pins are Node `24.20.0`, pnpm
  `10.31.0`, and `npm:@playwright/cli` `0.1.19`.
- Run `mise install`, then `mise run install` for a reproducible checkout.
- Use `mise run dev`, `mise run preview`, `mise run check`, `mise run smoke`,
  `mise run offline`, `mise run data:check`, `mise run data:build`,
  `mise run build:release`, and `mise run validate` instead of creating ad hoc
  orchestration commands.
- pnpm remains the dependency resolver and owns `pnpm-lock.yaml`.

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
