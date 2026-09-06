---
name: ui-verify
description: QuranAtlas manual browser verification loop — hub-managed servers, OMP browser tabs at fixed viewports, themes, transient screenshots, no persisted artifacts.
---

# OMP browser verification loop

## Servers

Start long-running servers with `hub`, never foreground bash:

- Dev app: `hub start` name `qa-dev`, application `mise`, args
  `["run","dev"]`, readiness log `Local:` plus port 5173.
- Storybook: name `qa-storybook`, application `pnpm`, args
  `["run","storybook"]`, readiness port 6007.
- Production PWA: `mise run build:release`, then a hub-managed
  `mise run preview` on 4173.

Run `mise run data:build` when dataset/search-pack requests are missing.

Stop hub-managed servers with `hub stop`. Never use broad
`lsof … | xargs kill`.

## Browser

- Open named OMP browser tabs at 1280x900 (desktop) and 375x812 (mobile).
- Use `observe`/accessible roles for interaction; transient `screenshot()`
  output goes to the visual reviewer, never to disk.
- Inspect console output and failed requests after each navigation.
- Exercise light/sepia/dark, night/reduced-motion, and the affected
  interaction states.

## Boundaries

- Persist no screenshots and no browser profiles.
- Add no `toHaveScreenshot` assertions and no CSS/DOM-shape assertions.

## Durable checks

- Always: `mise run check`, `mise run build:ui`, `mise run smoke`.
- Only when service-worker/offline behavior changed: `mise run offline`.
