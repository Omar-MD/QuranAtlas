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
