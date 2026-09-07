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
- Drift from the active Kimi K3 design brief, when one exists for the change under review.

## Model hierarchy

The main session is Luna Medium (`openai-codex/gpt-5.6-luna:medium`) and
coordinates workers without implementing. Full GLM-5.3
(`zai/glm-5.3:max`) owns explicit general planning; GLM-5.3-Flash
(`zai/glm-5.3-flash`) owns implementation and repair, including UI work.
Kimi K3 (`opencode-go/kimi-k3`) owns detailed UI direction;
Kimi K2.6 (`opencode-go/kimi-k2.6`) owns rendered visual
review and milestone sign-off. Luna High reviews non-visual correctness;
Luna Max is exceptional architecture/debug escalation. Advisors are disabled
by default and may run only as a bounded independent review. OpenCode Go
serves only the Kimi design/visual seats; OpenCode Zen stays disabled.

## Screenshots

Transient OMP browser screenshots viewed in-session are allowed for visual
review. Persisted screenshot files and screenshot assertions in tests remain
forbidden.
