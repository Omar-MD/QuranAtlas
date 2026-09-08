# QuranAtlas review priorities

Especially watch for:

- Reader, search, settings, and app-shell regressions across desktop and mobile.
- Offline lifecycle changes that precache datasets, search packs, or Mushaf pages instead of keeping them lazy.
- Service-worker cache changes that break upgrades, offline reloads, or stale-data recovery.
- Storage schema or persisted-state changes without compatible migration and reset behavior.
- Drift between worker protocols, search-pack schemas, generated data, and their consumers.
- UI changes that bypass `src/components/ui/**`, the component registry, or accessibility names and roles.
- Tests that assert CSS classes, DOM shape, icon internals, screenshots, or other implementation details.
- Edits to generated assets instead of tracked source inputs and generators.
- Design-token bypass: hardcoded color, spacing, radius, or font literals outside `src/design-system/tokens/**`.
- Component-registry drift: components or consumers missing from `src/design-system/registry/component-registry.json`, or direct Radix imports outside `src/components/ui/**`.
- Theme failures: light/sepia/dark contrast problems and missing or broken reduced-motion behavior.
- Drift from the active `ui_director` design brief, when one exists for the change under review.

## Role hierarchy

Model bindings live only in `.omp/config.yml` (`modelRoles`); this file
refers to roles, never model IDs. The `default` role coordinates workers
without implementing. The `plan` role owns explicit general planning; the
`ui_implementer` role owns implementation and repair, including UI work.
The `ui_director` role owns detailed UI direction; the `ui_visual` role
owns rendered visual review and milestone sign-off. The `ui_correctness`
role (and `advisor`, when explicitly enabled) reviews non-visual
correctness. Advisors are disabled by default and may run only as a
bounded independent review. OpenRouter serves only as the failover route
for the OpenCode Go-backed design/visual seats; OpenCode Zen stays
disabled.

## Screenshots

Transient OMP browser screenshots viewed in-session are allowed for visual
review. Persisted screenshot files and screenshot assertions in tests remain
forbidden.
